"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { toPlain } from "@/lib/serialize";
import { getSession } from "@/lib/session";

const ALLOWED_DIGITAL_DELIVERY_TYPES = new Set(["RETIRADA", "MESA", "ENTREGA"]);
const ALLOWED_NEXT_DIGITAL_STATUSES = new Set([
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELED",
]);

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

interface StockAdjustItem {
  id: string;
  productId: string;
  quantity: number;
  stockDeducted: boolean;
  product: {
    isSelfProduced: boolean;
    recipe: {
      yield: number;
      items: {
        productId: string;
        quantity: number;
        itemRole: string;
      }[];
    } | null;
  };
}

/**
 * Baixa o estoque do item de pedido e dos insumos/embalagens da ficha técnica
 * quando aplicável, garantindo idempotência via flag `stockDeducted`.
 */
async function deductOrderItemStock(tx: TxClient, item: StockAdjustItem) {
  if (item.stockDeducted) return;
  const qty = Number(item.quantity || 0);
  if (qty <= 0) return;

  await tx.product.update({
    where: { id: item.productId },
    data: { stock: { decrement: qty } },
  });

  const recipe = item.product?.recipe;
  if (recipe && recipe.items && recipe.items.length > 0) {
    const yieldVal = Number(recipe.yield) > 0 ? Number(recipe.yield) : 1;
    for (const ri of recipe.items) {
      if (item.product.isSelfProduced || ri.itemRole === "PACKAGING") {
        const deductQty = Number(((Number(ri.quantity) / yieldVal) * qty).toFixed(4));
        if (deductQty > 0) {
          await tx.product.update({
            where: { id: ri.productId },
            data: { stock: { decrement: deductQty } },
          });
        }
      }
    }
  }

  await tx.orderItem.update({
    where: { id: item.id },
    data: { stockDeducted: true },
  });
}

/**
 * Estorna o estoque do item de pedido e dos insumos/embalagens quando um pedido
 * previamente baixado é recusado ou cancelado.
 */
async function restockOrderItemStock(tx: TxClient, item: StockAdjustItem) {
  if (!item.stockDeducted) return;
  const qty = Number(item.quantity || 0);
  if (qty <= 0) return;

  await tx.product.update({
    where: { id: item.productId },
    data: { stock: { increment: qty } },
  });

  const recipe = item.product?.recipe;
  if (recipe && recipe.items && recipe.items.length > 0) {
    const yieldVal = Number(recipe.yield) > 0 ? Number(recipe.yield) : 1;
    for (const ri of recipe.items) {
      if (item.product.isSelfProduced || ri.itemRole === "PACKAGING") {
        const restockQty = Number(((Number(ri.quantity) / yieldVal) * qty).toFixed(4));
        if (restockQty > 0) {
          await tx.product.update({
            where: { id: ri.productId },
            data: { stock: { increment: restockQty } },
          });
        }
      }
    }
  }

  await tx.orderItem.update({
    where: { id: item.id },
    data: { stockDeducted: false },
  });
}

async function revalidateStorePaths(companyId: string) {
  revalidatePath("/ecommerce");
  revalidatePath(`/loja/${companyId}`);
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { slug: true },
  });
  if (company?.slug) {
    revalidatePath(`/loja/${company.slug}`);
  }
}

export async function getOrders(status?: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", orders: [] };
    }

    const orders = await prisma.order.findMany({
      where: {
        companyId: session.companyId,
        ...(status ? { status } : {}),
      },
      include: {
        customer: true,
        seller: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { orders: toPlain(orders) };
  } catch (err: any) {
    return { error: err.message, orders: [] };
  }
}

export async function createOrder(data: {
  customerId?: string;
  sellerId?: string;
  notes?: string;
  items: { productId: string; quantity: number; unitPrice: number; discount: number; cost: number }[];
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão expirada ou empresa não identificada." };
    }

    const subtotal = data.items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const discountTotal = data.items.reduce((acc, i) => acc + i.discount, 0);
    const total = subtotal - discountTotal;

    const order = await prisma.order.create({
      data: {
        subtotal,
        discount: discountTotal,
        total,
        notes: data.notes,
        customerId: data.customerId || null,
        sellerId: data.sellerId || null,
        companyId: session.companyId,
        channel: "ERP",
        status: "DRAFT",
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
            total: i.quantity * i.unitPrice - i.discount,
            cost: i.cost,
          })),
        },
      },
      include: { items: { include: { product: true } }, customer: true, seller: true },
    });

    revalidatePath("/telesales");
    return { success: true, order: toPlain(order) };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar pedido" };
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    const existing = await prisma.order.findFirst({
      where: { id: orderId, companyId: session.companyId },
      select: { id: true },
    });
    if (!existing) {
      return { error: "Pedido não encontrado." };
    }

    await prisma.order.update({ where: { id: existing.id }, data: { status } });
    revalidatePath("/telesales");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getOrderById(id: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    const order = await prisma.order.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        customer: true,
        seller: true,
        items: { include: { product: true } },
      },
    });
    if (!order) {
      return { error: "Pedido não encontrado." };
    }
    return { order: toPlain(order) };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CARDÁPIO DIGITAL MULTI-TENANT (PÚBLICO + PAINEL DA LOJA)
// ─────────────────────────────────────────────────────────────────────────────

export async function submitDigitalMenuOrder(input: {
  companyIdOrSlug: string;
  customerName: string;
  customerPhone: string;
  deliveryType: "RETIRADA" | "MESA" | "ENTREGA";
  deliveryLocation?: string;
  notes?: string;
  items: { productId: string; quantity: number; notes?: string }[];
}) {
  try {
    const storeKey = (input.companyIdOrSlug || "").trim();
    if (!storeKey) {
      return { error: "Identificador da loja inválido." };
    }

    const company = await prisma.company.findFirst({
      where: {
        OR: [{ id: storeKey }, { slug: storeKey }],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        licenseStatus: true,
        licenseExpiresAt: true,
        digitalMenuEnabled: true,
      },
    });

    if (!company) {
      return { error: "Loja não encontrada." };
    }

    if (
      company.licenseStatus === "SUSPENDED" ||
      new Date(company.licenseExpiresAt) < new Date()
    ) {
      return { error: "Esta loja está temporariamente indisponível para pedidos." };
    }

    if (company.digitalMenuEnabled === false) {
      return { error: "O cardápio digital desta loja está fechado no momento." };
    }

    const customerName = (input.customerName || "").trim();
    const customerPhone = (input.customerPhone || "").trim();
    if (customerName.length < 2) {
      return { error: "Informe seu nome completo." };
    }
    if (customerPhone.replace(/\D/g, "").length < 8) {
      return { error: "Informe um número de WhatsApp ou telefone válido." };
    }

    const deliveryType = input.deliveryType;
    if (!ALLOWED_DIGITAL_DELIVERY_TYPES.has(deliveryType)) {
      return { error: "Selecione uma forma de recebimento válida." };
    }

    const rawLocation = (input.deliveryLocation || "").trim();
    if ((deliveryType === "MESA" || deliveryType === "ENTREGA") && rawLocation.length < 2) {
      return {
        error:
          deliveryType === "MESA"
            ? "Informe o número da mesa ou local na loja."
            : "Informe o endereço completo para entrega.",
      };
    }

    const resolvedLocation =
      deliveryType === "RETIRADA"
        ? rawLocation || "Retirar no Balcão"
        : rawLocation;

    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { error: "Adicione pelo menos 1 item ao carrinho." };
    }

    const validInputItems = input.items.filter((i) => i.productId && Number(i.quantity) > 0);
    if (validInputItems.length === 0) {
      return { error: "Quantidades inválidas no carrinho." };
    }

    const productIds = Array.from(new Set(validInputItems.map((i) => i.productId)));
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId: company.id,
        showInDigitalMenu: true,
        isRawMaterial: false,
        isPackaging: false,
      },
      select: {
        id: true,
        name: true,
        price: true,
        cost: true,
      },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    let subtotal = 0;

    const orderItemsData = validInputItems.map((item) => {
      const prod = productMap.get(item.productId);
      if (!prod) {
        throw new Error("Um ou mais produtos selecionados não estão disponíveis no cardápio digital.");
      }
      const qty = Number(item.quantity);
      const unitPrice = Number(prod.price || 0);
      const cost = Number(prod.cost || 0);
      const itemTotal = Number((unitPrice * qty).toFixed(2));
      subtotal += itemTotal;

      return {
        productId: prod.id,
        quantity: qty,
        unitPrice,
        discount: 0,
        total: itemTotal,
        cost,
        stockDeducted: false,
        notes: item.notes?.trim() || null,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    const orderNumber = `DM-${Date.now().toString().slice(-6)}`;

    const order = await prisma.order.create({
      data: {
        companyId: company.id,
        channel: "DIGITAL_MENU",
        status: "PENDING_APPROVAL",
        deliveryType,
        deliveryLocation: resolvedLocation,
        customerName,
        customerPhone,
        notes: input.notes?.trim() || null,
        orderNumber,
        subtotal,
        discount: 0,
        total: subtotal,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });

    revalidatePath("/ecommerce");
    return { success: true, order: toPlain(order) };
  } catch (err: any) {
    return { error: err.message || "Erro ao enviar pedido pelo cardápio digital." };
  }
}

export async function getPublicOrderStatus(orderId: string) {
  try {
    const cleanId = (orderId || "").trim();
    if (!cleanId) return { error: "Pedido não informado." };

    const order = await prisma.order.findFirst({
      where: {
        id: cleanId,
        channel: "DIGITAL_MENU",
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        rejectionReason: true,
        deliveryType: true,
        deliveryLocation: true,
        customerName: true,
        customerPhone: true,
        notes: true,
        subtotal: true,
        deliveryFee: true,
        paymentMethod: true,
        paymentGateway: true,
        paymentStatus: true,
        pixQrCodeUrl: true,
        pixQrCodeText: true,
        pixExpiresAt: true,
        pixPaidAt: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            total: true,
            notes: true,
            product: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
    });

    if (!order) {
      return { error: "Pedido não encontrado." };
    }

    return { success: true, order: toPlain(order) };
  } catch (err: any) {
    return { error: err.message || "Erro ao consultar status do pedido." };
  }
}

export async function getDigitalMenuAdminData() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", orders: [], products: [], categories: [], company: null };
    }

    const [company, orders, products, categories] = await Promise.all([
      prisma.company.findUnique({
        where: { id: session.companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
          whatsapp: true,
          address: true,
          digitalMenuEnabled: true,
          digitalMenuNotes: true,
          fiscalConfig: {
            select: { tradeName: true },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          companyId: session.companyId,
          channel: "DIGITAL_MENU",
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, unit: true, price: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 150,
      }),
      prisma.product.findMany({
        where: {
          companyId: session.companyId,
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
          showInDigitalMenu: true,
          categoryId: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        where: { companyId: session.companyId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    if (!company) {
      return { error: "Empresa não encontrada", orders: [], products: [], categories: [], company: null };
    }

    // Ordenar destacando PENDING_APPROVAL primeiro, depois por data mais recente
    const sortedOrders = [...orders].sort((a, b) => {
      const aPending = a.status === "PENDING_APPROVAL" ? 0 : 1;
      const bPending = b.status === "PENDING_APPROVAL" ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const menuPath = `/loja/${company.slug || company.id}`;

    return {
      success: true,
      company: toPlain(company),
      menuPath,
      orders: toPlain(sortedOrders),
      products: toPlain(products),
      categories: toPlain(categories),
    };
  } catch (err: any) {
    return {
      error: err.message || "Erro ao carregar dados do cardápio digital",
      orders: [],
      products: [],
      categories: [],
      company: null,
    };
  }
}

export async function toggleProductDigitalMenu(productId: string, show: boolean) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    const updated = await prisma.product.updateMany({
      where: {
        id: productId,
        companyId: session.companyId,
        isRawMaterial: false,
        isPackaging: false,
      },
      data: { showInDigitalMenu: Boolean(show) },
    });

    if (updated.count === 0) {
      return { error: "Produto não encontrado ou não elegível para cardápio." };
    }

    await revalidateStorePaths(session.companyId);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar produto no cardápio digital." };
  }
}

export async function bulkToggleDigitalMenu(productIds: string[], show: boolean) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return { error: "Nenhum produto selecionado." };
    }

    await prisma.product.updateMany({
      where: {
        id: { in: productIds },
        companyId: session.companyId,
        isRawMaterial: false,
        isPackaging: false,
      },
      data: { showInDigitalMenu: Boolean(show) },
    });

    await revalidateStorePaths(session.companyId);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar produtos em lote." };
  }
}

export async function updateDigitalMenuSettings(data: {
  digitalMenuEnabled?: boolean;
  digitalMenuNotes?: string;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    await prisma.company.update({
      where: { id: session.companyId },
      data: {
        ...(typeof data.digitalMenuEnabled === "boolean"
          ? { digitalMenuEnabled: data.digitalMenuEnabled }
          : {}),
        ...(typeof data.digitalMenuNotes === "string"
          ? { digitalMenuNotes: data.digitalMenuNotes.trim() || null }
          : {}),
      },
    });

    await revalidateStorePaths(session.companyId);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar configurações do cardápio." };
  }
}

export async function approveDigitalMenuOrder(orderId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        companyId: session.companyId,
        channel: "DIGITAL_MENU",
      },
      include: {
        items: {
          include: {
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
        },
      },
    });

    if (!order) {
      return { error: "Pedido do cardápio digital não encontrado." };
    }

    if (order.status !== "PENDING_APPROVAL") {
      return { error: "Este pedido já foi processado anteriormente." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CONFIRMED",
          approvedByUserId: session.userId || null,
          approvedAt: new Date(),
        },
      });

      for (const item of order.items) {
        if (!item.stockDeducted) {
          await deductOrderItemStock(tx, item);
        }
      }
    });

    revalidatePath("/ecommerce");
    revalidatePath("/stock");
    revalidatePath("/pdv");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao aprovar pedido do cardápio digital." };
  }
}

export async function rejectDigitalMenuOrder(orderId: string, reason: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        companyId: session.companyId,
        channel: "DIGITAL_MENU",
      },
      include: {
        items: {
          include: {
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
        },
      },
    });

    if (!order) {
      return { error: "Pedido não encontrado." };
    }

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.stockDeducted) {
          await restockOrderItemStock(tx, item);
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "REJECTED",
          rejectionReason: reason?.trim() || "Recusado pela loja",
        },
      });
    });

    revalidatePath("/ecommerce");
    revalidatePath("/stock");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao recusar pedido." };
  }
}

export async function advanceDigitalMenuOrderStatus(orderId: string, nextStatus: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    if (!ALLOWED_NEXT_DIGITAL_STATUSES.has(nextStatus)) {
      return { error: "Status inválido para atualização." };
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        companyId: session.companyId,
        channel: "DIGITAL_MENU",
      },
      include: {
        items: {
          include: {
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
        },
      },
    });

    if (!order) {
      return { error: "Pedido não encontrado." };
    }

    await prisma.$transaction(async (tx) => {
      if (nextStatus === "CANCELED") {
        for (const item of order.items) {
          if (item.stockDeducted) {
            await restockOrderItemStock(tx, item);
          }
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: nextStatus },
      });
    });

    revalidatePath("/ecommerce");
    revalidatePath("/stock");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar status do pedido." };
  }
}
