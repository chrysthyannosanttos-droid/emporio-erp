"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { toPlain } from "@/lib/serialize";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

interface RoomProductWithRecipe {
  id: string;
  isSelfProduced: boolean;
  recipe: {
    yield: number;
    items: {
      productId: string;
      quantity: number;
      itemRole: string;
    }[];
  } | null;
}

async function adjustStockForRoomProduct(
  tx: TxClient,
  product: RoomProductWithRecipe,
  quantity: number,
  direction: "decrement" | "increment"
) {
  const qty = Number(quantity || 0);
  if (qty <= 0) return;

  await tx.product.update({
    where: { id: product.id },
    data: {
      stock: direction === "decrement" ? { decrement: qty } : { increment: qty },
    },
  });

  if (product.recipe && product.recipe.items && product.recipe.items.length > 0) {
    const yieldVal = Number(product.recipe.yield) > 0 ? Number(product.recipe.yield) : 1;
    for (const ri of product.recipe.items) {
      if (product.isSelfProduced || ri.itemRole === "PACKAGING") {
        const recipeQty = Number(((Number(ri.quantity) / yieldVal) * qty).toFixed(4));
        if (recipeQty > 0) {
          await tx.product.update({
            where: { id: ri.productId },
            data: {
              stock:
                direction === "decrement"
                  ? { decrement: recipeQty }
                  : { increment: recipeQty },
            },
          });
        }
      }
    }
  }
}

async function requireHotelTabsCompany() {
  const session = await getSession();
  if (!session?.companyId) {
    return { enabled: false as const, session: null, company: null };
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: {
      id: true,
      name: true,
      hasHotelTabs: true,
    },
  });

  if (!company || company.hasHotelTabs !== true) {
    return { enabled: false as const, session, company: null };
  }

  return { enabled: true as const, session, company };
}

export async function getHotelTabsWorkspace() {
  try {
    const ctx = await requireHotelTabsCompany();
    if (!ctx.enabled || !ctx.company) {
      return {
        enabled: false,
        companyName: null,
        customers: [],
        rooms: [],
        products: [],
        recentClosedOrders: [],
      };
    }

    const companyId = ctx.company.id;

    const [customersWithRooms, products, recentClosedOrders] = await Promise.all([
      prisma.customer.findMany({
        where: {
          companyId,
          rooms: { some: { active: true } },
        },
        select: {
          id: true,
          name: true,
          document: true,
          phone: true,
          rooms: {
            where: { active: true },
            orderBy: { code: "asc" },
            include: {
              orders: {
                where: {
                  companyId,
                  channel: "ROOM_TAB",
                  status: "OPEN_TAB",
                },
                include: {
                  items: {
                    include: {
                      product: {
                        select: {
                          id: true,
                          name: true,
                          unit: true,
                          price: true,
                          barcode: true,
                          isSelfProduced: true,
                        },
                      },
                    },
                    orderBy: { id: "asc" },
                  },
                },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: {
          companyId,
          isRawMaterial: false,
          isPackaging: false,
        },
        select: {
          id: true,
          name: true,
          barcode: true,
          internalCode: true,
          price: true,
          stock: true,
          unit: true,
          isSelfProduced: true,
          categoryId: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.order.findMany({
        where: {
          companyId,
          channel: "ROOM_TAB",
          status: "DELIVERED",
        },
        include: {
          room: { select: { id: true, code: true, name: true } },
          customer: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, unit: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 15,
      }),
    ]);

    const flatRooms: any[] = [];
    const normalizedCustomers = customersWithRooms.map((cust) => {
      let consolidatedTotal = 0;
      const rooms = cust.rooms.map((room) => {
        const openOrder = room.orders[0] || null;
        const tabTotal = openOrder ? Number(openOrder.total || 0) : 0;
        const itemsCount = openOrder
          ? openOrder.items.reduce((acc, it) => acc + Number(it.quantity || 0), 0)
          : 0;
        consolidatedTotal += tabTotal;

        const formattedRoom = {
          id: room.id,
          code: room.code,
          name: room.name,
          guestName: room.guestName,
          notes: room.notes,
          active: room.active,
          customerId: cust.id,
          customerName: cust.name,
          customerPhone: cust.phone,
          openOrder,
          tabTotal: Number(tabTotal.toFixed(2)),
          itemsCount,
        };
        flatRooms.push(formattedRoom);
        return formattedRoom;
      });

      return {
        id: cust.id,
        name: cust.name,
        document: cust.document,
        phone: cust.phone,
        consolidatedTotal: Number(consolidatedTotal.toFixed(2)),
        openRoomsCount: rooms.filter((r) => Boolean(r.openOrder)).length,
        rooms,
      };
    });

    return {
      enabled: true,
      companyName: ctx.company.name,
      customers: toPlain(normalizedCustomers),
      rooms: toPlain(flatRooms),
      products: toPlain(products),
      recentClosedOrders: toPlain(recentClosedOrders),
    };
  } catch (err: any) {
    return {
      enabled: false,
      error: err.message || "Erro ao carregar comandas de quartos",
      companyName: null,
      customers: [],
      rooms: [],
      products: [],
      recentClosedOrders: [],
    };
  }
}

export async function addItemsToRoomTab(input: {
  roomId: string;
  items: { productId: string; quantity: number; notes?: string }[];
}) {
  try {
    const ctx = await requireHotelTabsCompany();
    if (!ctx.enabled || !ctx.company) {
      return { error: "Comandas de quartos não habilitadas para esta empresa." };
    }

    if (!input.roomId) {
      return { error: "Selecione um quarto." };
    }

    const validItems = (input.items || []).filter(
      (i) => i.productId && Number(i.quantity) > 0
    );
    if (validItems.length === 0) {
      return { error: "Adicione pelo menos 1 produto com quantidade válida." };
    }

    const room = await prisma.customerRoom.findFirst({
      where: {
        id: input.roomId,
        companyId: ctx.company.id,
        active: true,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!room) {
      return { error: "Quarto não encontrado ou inativo." };
    }

    const productIds = Array.from(new Set(validItems.map((i) => i.productId)));
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId: ctx.company.id,
      },
      select: {
        id: true,
        name: true,
        price: true,
        cost: true,
        isSelfProduced: true,
        recipe: {
          select: {
            yield: true,
            items: {
              select: {
                productId: true,
                quantity: true,
                itemRole: true,
              },
            },
          },
        },
      },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    for (const item of validItems) {
      if (!productMap.has(item.productId)) {
        return { error: "Um ou mais produtos selecionados não foram encontrados." };
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let order = await tx.order.findFirst({
        where: {
          companyId: ctx.company.id,
          roomId: room.id,
          channel: "ROOM_TAB",
          status: "OPEN_TAB",
        },
      });

      if (!order) {
        order = await tx.order.create({
          data: {
            companyId: ctx.company.id,
            customerId: room.customerId,
            roomId: room.id,
            channel: "ROOM_TAB",
            status: "OPEN_TAB",
            deliveryType: "QUARTO",
            deliveryLocation: `${room.customer.name} - ${room.name}`,
            customerName: room.guestName || room.customer.name,
            customerPhone: room.customer.phone || null,
            orderNumber: `CMD-${room.code}-${Date.now().toString().slice(-4)}`,
            subtotal: 0,
            discount: 0,
            total: 0,
          },
        });
      }

      for (const item of validItems) {
        const prod = productMap.get(item.productId)!;
        const qty = Number(item.quantity);
        const unitPrice = Number(prod.price || 0);
        const cost = Number(prod.cost || 0);
        const itemTotal = Number((unitPrice * qty).toFixed(2));

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: prod.id,
            quantity: qty,
            unitPrice,
            discount: 0,
            total: itemTotal,
            cost,
            stockDeducted: true,
            notes: item.notes?.trim() || null,
          },
        });

        await adjustStockForRoomProduct(tx, prod, qty, "decrement");
      }

      const allItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
        select: { total: true },
      });

      const subtotal = Number(
        allItems.reduce((acc, it) => acc + Number(it.total || 0), 0).toFixed(2)
      );
      const total = Math.max(0, Number((subtotal - Number(order.discount || 0)).toFixed(2)));

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { subtotal, total },
      });

      return updatedOrder;
    });

    revalidatePath("/comandas");
    revalidatePath("/pdv");
    revalidatePath("/stock");
    return { success: true, orderId: result.id, roomName: room.name };
  } catch (err: any) {
    return { error: err.message || "Erro ao lançar consumo na comanda do quarto." };
  }
}

export async function removeItemFromRoomTab(orderItemId: string) {
  try {
    const ctx = await requireHotelTabsCompany();
    if (!ctx.enabled || !ctx.company) {
      return { error: "Comandas de quartos não habilitadas." };
    }

    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          companyId: ctx.company.id,
          channel: "ROOM_TAB",
          status: "OPEN_TAB",
        },
      },
      include: {
        order: true,
        product: {
          select: {
            id: true,
            isSelfProduced: true,
            recipe: {
              select: {
                yield: true,
                items: {
                  select: {
                    productId: true,
                    quantity: true,
                    itemRole: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!orderItem) {
      return { error: "Item não encontrado em comanda aberta." };
    }

    await prisma.$transaction(async (tx) => {
      if (orderItem.stockDeducted) {
        await adjustStockForRoomProduct(
          tx,
          orderItem.product,
          Number(orderItem.quantity),
          "increment"
        );
      }

      await tx.orderItem.delete({ where: { id: orderItem.id } });

      const remainingItems = await tx.orderItem.findMany({
        where: { orderId: orderItem.orderId },
        select: { total: true },
      });

      if (remainingItems.length === 0) {
        await tx.order.delete({ where: { id: orderItem.orderId } });
      } else {
        const subtotal = Number(
          remainingItems.reduce((acc, it) => acc + Number(it.total || 0), 0).toFixed(2)
        );
        const total = Math.max(
          0,
          Number((subtotal - Number(orderItem.order.discount || 0)).toFixed(2))
        );
        await tx.order.update({
          where: { id: orderItem.orderId },
          data: { subtotal, total },
        });
      }
    });

    revalidatePath("/comandas");
    revalidatePath("/pdv");
    revalidatePath("/stock");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao remover item da comanda." };
  }
}

export async function updateRoomInfo(input: {
  roomId: string;
  guestName?: string;
  notes?: string;
}) {
  try {
    const ctx = await requireHotelTabsCompany();
    if (!ctx.enabled || !ctx.company) {
      return { error: "Comandas de quartos não habilitadas." };
    }

    const room = await prisma.customerRoom.findFirst({
      where: { id: input.roomId, companyId: ctx.company.id },
      include: { customer: { select: { name: true } } },
    });

    if (!room) {
      return { error: "Quarto não encontrado." };
    }

    const guestName = input.guestName?.trim() || null;
    const notes = input.notes?.trim() || null;

    await prisma.$transaction(async (tx) => {
      await tx.customerRoom.update({
        where: { id: room.id },
        data: { guestName, notes },
      });

      await tx.order.updateMany({
        where: {
          companyId: ctx.company.id,
          roomId: room.id,
          channel: "ROOM_TAB",
          status: "OPEN_TAB",
        },
        data: {
          customerName: guestName || room.customer.name,
        },
      });
    });

    revalidatePath("/comandas");
    revalidatePath("/pdv");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar dados do quarto." };
  }
}

export async function closeRoomTabFutureSale(input: {
  roomIds: string[];
  paymentMethod: string;
  discount?: number;
}) {
  try {
    const ctx = await requireHotelTabsCompany();
    if (!ctx.enabled || !ctx.company) {
      return { error: "Comandas de quartos não habilitadas para esta empresa." };
    }

    const roomIds = Array.from(new Set((input.roomIds || []).filter(Boolean)));
    if (roomIds.length === 0) {
      return { error: "Selecione pelo menos um quarto para fechamento." };
    }

    const paymentMethod = (input.paymentMethod || "").trim().toUpperCase();
    if (!paymentMethod) {
      return { error: "Selecione a forma de pagamento para fechamento." };
    }

    const rooms = await prisma.customerRoom.findMany({
      where: {
        id: { in: roomIds },
        companyId: ctx.company.id,
      },
      include: {
        customer: { select: { id: true, name: true } },
        orders: {
          where: {
            companyId: ctx.company.id,
            channel: "ROOM_TAB",
            status: "OPEN_TAB",
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                    isSelfProduced: true,
                    recipe: {
                      select: {
                        yield: true,
                        items: {
                          select: {
                            productId: true,
                            quantity: true,
                            itemRole: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    const roomsWithOpenTabs = rooms.filter((r) => r.orders.length > 0);
    if (roomsWithOpenTabs.length === 0) {
      return { error: "Nenhuma comanda em aberto nos quartos selecionados." };
    }

    const openOrders = roomsWithOpenTabs.flatMap((r) => r.orders);
    const allItems = openOrders.flatMap((o) => o.items);
    if (allItems.length === 0) {
      return { error: "As comandas selecionadas não possuem itens lançados." };
    }

    // Resolve usuário responsável pela venda
    let user = ctx.session?.userId
      ? await prisma.user.findFirst({
          where: { id: ctx.session.userId, companyId: ctx.company.id },
          select: { id: true, name: true },
        })
      : null;
    if (!user) {
      user = await prisma.user.findFirst({
        where: { companyId: ctx.company.id },
        select: { id: true, name: true },
      });
    }
    if (!user) {
      return { error: "Nenhum usuário encontrado na empresa para registrar a venda." };
    }

    const subtotal = Number(
      allItems.reduce((acc, it) => acc + Number(it.total || 0), 0).toFixed(2)
    );
    const discountValue = Math.max(0, Number(input.discount || 0));
    const total = Math.max(0, Number((subtotal - discountValue).toFixed(2)));

    const customerId = roomsWithOpenTabs[0].customerId;
    const customerName = roomsWithOpenTabs[0].customer?.name || "Cliente";
    const roomNames = roomsWithOpenTabs.map((r) => r.name);

    const isDeferred = paymentMethod === "FATURADO" || paymentMethod === "A_PRAZO";
    const txStatus = isDeferred ? "PENDING" : "PAID";
    const now = new Date();
    const dueDate = isDeferred
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : now;

    const saleResult = await prisma.$transaction(async (tx) => {
      // 1. Cria a venda financeira consolidada (1 ou vários quartos juntos)
      const sale = await tx.sale.create({
        data: {
          companyId: ctx.company.id,
          userId: user.id,
          customerId,
          orderId: openOrders.length === 1 ? openOrders[0].id : null,
          subtotal,
          discount: discountValue,
          total,
          status: "COMPLETED",
          items: {
            create: allItems.map((it) => ({
              productId: it.productId,
              quantity: Number(it.quantity),
              unitPrice: Number(it.unitPrice),
              total: Number(it.total),
            })),
          },
          payments: {
            create: {
              amount: total,
              paymentMethod,
            },
          },
        },
      });

      // 2. Evita dupla baixa de estoque: baixa apenas se algum item ainda não tivesse stockDeducted=true
      for (const it of allItems) {
        if (!it.stockDeducted) {
          await adjustStockForRoomProduct(tx, it.product, Number(it.quantity), "decrement");
          await tx.orderItem.update({
            where: { id: it.id },
            data: { stockDeducted: true },
          });
        }
      }

      // 3. Fecha todas as comandas selecionadas como DELIVERED
      for (const ord of openOrders) {
        await tx.order.update({
          where: { id: ord.id },
          data: {
            status: "DELIVERED",
            notes: [
              ord.notes,
              `Fechada na venda #${sale.id.slice(0, 8).toUpperCase()} (${paymentMethod})`,
            ]
              .filter(Boolean)
              .join(" | "),
          },
        });
      }

      // 4. Lançamento financeiro real em Transaction
      await tx.transaction.create({
        data: {
          companyId: ctx.company.id,
          type: "INCOME",
          description: `Fechamento Comanda (${roomNames.join(", ")}) - ${customerName} · Venda #${sale.id.slice(0, 8).toUpperCase()}`,
          category: "Comandas / Quartos",
          amount: total,
          paymentMethod,
          provider: customerName,
          orderId: openOrders[0].id,
          dueDate,
          paymentDate: isDeferred ? null : now,
          status: txStatus,
        },
      });

      return sale;
    });

    revalidatePath("/comandas");
    revalidatePath("/pdv");
    revalidatePath("/finance");
    revalidatePath("/reports");
    revalidatePath("/");

    return {
      success: true,
      summary: toPlain({
        saleId: saleResult.id,
        companyName: ctx.company.name,
        customerName,
        roomsClosed: roomNames,
        paymentMethod,
        transactionStatus: txStatus,
        subtotal,
        discount: discountValue,
        total,
        itemsCount: allItems.length,
        closedAt: now.toISOString(),
        items: allItems.map((it) => ({
          name: it.product?.name || "Produto",
          unit: it.product?.unit || "UN",
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          total: Number(it.total),
        })),
      }),
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao fechar comanda(s) de quarto." };
  }
}
