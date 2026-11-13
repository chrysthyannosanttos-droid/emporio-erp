"use server";

import { prisma } from "@emporio/database";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { toPlain } from "@/lib/serialize";
import { getSession } from "@/lib/session";
import {
  createStoreCustomerSession,
  deleteStoreCustomerSession,
  getStoreCustomerSession,
} from "@/lib/storeSession";

async function resolvePublicCompanyRecord(companyIdOrSlug: string) {
  const key = (companyIdOrSlug || "").trim();
  if (!key) return null;
  return prisma.company.findFirst({
    where: { OR: [{ id: key }, { slug: key }] },
    select: {
      id: true,
      slug: true,
      name: true,
      licenseStatus: true,
      licenseExpiresAt: true,
      digitalMenuEnabled: true,
      digitalMenuDeliveryFee: true,
      digitalMenuMinOrder: true,
    },
  });
}

async function revalidateStorefront(companyId: string) {
  const comp = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, slug: true },
  });
  revalidatePath("/ecommerce");
  revalidatePath("/stock");
  revalidatePath("/promotions");
  revalidatePath("/customers");
  if (comp?.id) revalidatePath(`/loja/${comp.id}`);
  if (comp?.slug) revalidatePath(`/loja/${comp.slug}`);
}

function parseFavorites(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTE 1: CONTA DO CLIENTE, FAVORITOS, ENDEREÇOS E CHECKOUT DA LOJA
// ─────────────────────────────────────────────────────────────────────────────

export async function registerStoreCustomer(input: {
  companyIdOrSlug: string;
  name: string;
  phone: string;
  email: string;
  password: string;
}) {
  try {
    const company = await resolvePublicCompanyRecord(input.companyIdOrSlug);
    if (!company) return { error: "Loja não encontrada." };

    const name = (input.name || "").trim();
    const phone = (input.phone || "").trim();
    const email = (input.email || "").trim().toLowerCase();
    const password = String(input.password || "");

    if (name.length < 2) return { error: "Informe seu nome completo." };
    if (phone.replace(/\D/g, "").length < 8) return { error: "Informe um WhatsApp/telefone válido." };
    if (!email || !email.includes("@")) return { error: "Informe um e-mail válido." };
    if (password.length < 4) return { error: "A senha deve ter pelo menos 4 caracteres." };

    const existing = await prisma.customer.findFirst({
      where: {
        companyId: company.id,
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (existing && existing.passwordHash) {
      return { error: "Já existe uma conta cadastrada com este e-mail." };
    }

    const hash = await bcrypt.hash(password, 10);

    const customer = existing
      ? await prisma.customer.update({
          where: { id: existing.id },
          data: {
            name,
            phone,
            email,
            passwordHash: hash,
          },
        })
      : await prisma.customer.create({
          data: {
            companyId: company.id,
            name,
            phone,
            email,
            passwordHash: hash,
            personType: "PF",
            taxRegime: "CONSUMIDOR_FINAL",
          },
        });

    await createStoreCustomerSession({
      customerId: customer.id,
      companyId: company.id,
      name: customer.name,
      email: customer.email || undefined,
    });

    revalidatePath("/ecommerce");
    revalidatePath("/customers");
    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
        favoriteProductIds: parseFavorites(customer.favoriteProductIds),
      },
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar conta." };
  }
}

export async function loginStoreCustomer(input: {
  companyIdOrSlug: string;
  emailOrPhone: string;
  password: string;
}) {
  try {
    const company = await resolvePublicCompanyRecord(input.companyIdOrSlug);
    if (!company) return { error: "Loja não encontrada." };

    const login = (input.emailOrPhone || "").trim().toLowerCase();
    const digits = login.replace(/\D/g, "");
    const password = String(input.password || "");

    if (!login || !password) return { error: "Informe e-mail/telefone e senha." };

    const customer = await prisma.customer.findFirst({
      where: {
        companyId: company.id,
        passwordHash: { not: null },
        OR: [
          { email: { equals: login, mode: "insensitive" } },
          ...(digits.length >= 8 ? [{ phone: { contains: digits.slice(-8) } }] : []),
        ],
      },
    });

    if (!customer || !customer.passwordHash) {
      return { error: "Conta não encontrada nesta loja." };
    }

    const ok = await bcrypt.compare(password, customer.passwordHash);
    if (!ok) {
      return { error: "Senha incorreta." };
    }

    await createStoreCustomerSession({
      customerId: customer.id,
      companyId: company.id,
      name: customer.name,
      email: customer.email || undefined,
    });

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao entrar na conta." };
  }
}

export async function logoutStoreCustomer() {
  await deleteStoreCustomerSession();
  return { success: true };
}

export async function getStoreCustomerAccount(companyIdOrSlug: string) {
  try {
    const company = await resolvePublicCompanyRecord(companyIdOrSlug);
    if (!company) return { customer: null, addresses: [], orders: [], favorites: [] };

    const sess = await getStoreCustomerSession();
    if (!sess || sess.companyId !== company.id) {
      return { customer: null, addresses: [], orders: [], favorites: [] };
    }

    const customer = await prisma.customer.findFirst({
      where: { id: sess.customerId, companyId: company.id },
      include: {
        deliveryAddresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        },
        orders: {
          where: { channel: "DIGITAL_MENU" },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, unit: true, imageUrl: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!customer) {
      return { customer: null, addresses: [], orders: [], favorites: [] };
    }

    return {
      customer: toPlain({
        id: customer.id,
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
        document: customer.document || "",
      }),
      addresses: toPlain(customer.deliveryAddresses || []),
      orders: toPlain(
        (customer.orders || []).map((o) => ({
          ...o,
          subtotal: Number(o.subtotal || 0),
          deliveryFee: Number(o.deliveryFee || 0),
          discount: Number(o.discount || 0),
          total: Number(o.total || 0),
          items: (o.items || []).map((it) => ({
            ...it,
            unitPrice: Number(it.unitPrice || 0),
            total: Number(it.total || 0),
          })),
        }))
      ),
      favorites: parseFavorites(customer.favoriteProductIds),
    };
  } catch {
    return { customer: null, addresses: [], orders: [], favorites: [] };
  }
}

export async function updateStoreCustomerProfile(input: {
  companyIdOrSlug: string;
  name: string;
  phone: string;
  email: string;
}) {
  try {
    const company = await resolvePublicCompanyRecord(input.companyIdOrSlug);
    const sess = await getStoreCustomerSession();
    if (!company || !sess || sess.companyId !== company.id) {
      return { error: "Faça login para atualizar seus dados." };
    }

    const name = (input.name || "").trim();
    const phone = (input.phone || "").trim();
    const email = (input.email || "").trim().toLowerCase();
    if (name.length < 2) return { error: "Nome inválido." };
    if (phone.replace(/\D/g, "").length < 8) return { error: "Telefone inválido." };

    await prisma.customer.update({
      where: { id: sess.customerId },
      data: { name, phone, ...(email ? { email } : {}) },
    });

    await createStoreCustomerSession({
      customerId: sess.customerId,
      companyId: company.id,
      name,
      email: email || sess.email,
    });

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar perfil." };
  }
}

export async function saveStoreDeliveryAddress(input: {
  companyIdOrSlug: string;
  id?: string;
  label?: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  reference?: string;
  isDefault?: boolean;
}) {
  try {
    const company = await resolvePublicCompanyRecord(input.companyIdOrSlug);
    const sess = await getStoreCustomerSession();
    if (!company || !sess || sess.companyId !== company.id) {
      return { error: "Entre na sua conta para salvar o endereço." };
    }

    const street = (input.street || "").trim();
    const number = (input.number || "").trim();
    const neighborhood = (input.neighborhood || "").trim();
    const city = (input.city || "").trim();
    const state = (input.state || "").trim().toUpperCase().slice(0, 2);
    const zipCode = (input.zipCode || "").trim();

    if (!street || !city || !state) {
      return { error: "Informe Rua, Cidade e UF." };
    }

    if (input.isDefault) {
      await prisma.deliveryAddress.updateMany({
        where: { customerId: sess.customerId },
        data: { isDefault: false },
      });
    }

    const existingCount = await prisma.deliveryAddress.count({
      where: { customerId: sess.customerId },
    });

    const dataPayload = {
      label: (input.label || "Casa").trim() || "Endereço",
      zipCode: zipCode || "00000-000",
      street,
      number: number || "S/N",
      complement: input.complement?.trim() || null,
      neighborhood: neighborhood || null,
      city,
      state,
      reference: input.reference?.trim() || null,
      isDefault: Boolean(input.isDefault) || existingCount === 0,
    };

    const saved = input.id
      ? await prisma.deliveryAddress.update({
          where: { id: input.id },
          data: dataPayload,
        })
      : await prisma.deliveryAddress.create({
          data: {
            customerId: sess.customerId,
            ...dataPayload,
          },
        });

    return { success: true, address: toPlain(saved) };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar endereço." };
  }
}

export async function deleteStoreDeliveryAddress(companyIdOrSlug: string, addressId: string) {
  try {
    const company = await resolvePublicCompanyRecord(companyIdOrSlug);
    const sess = await getStoreCustomerSession();
    if (!company || !sess || sess.companyId !== company.id) {
      return { error: "Não autorizado." };
    }

    await prisma.deliveryAddress.deleteMany({
      where: { id: addressId, customerId: sess.customerId },
    });
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao excluir endereço." };
  }
}

export async function setDefaultStoreDeliveryAddress(companyIdOrSlug: string, addressId: string) {
  try {
    const company = await resolvePublicCompanyRecord(companyIdOrSlug);
    const sess = await getStoreCustomerSession();
    if (!company || !sess || sess.companyId !== company.id) {
      return { error: "Não autorizado." };
    }

    await prisma.$transaction([
      prisma.deliveryAddress.updateMany({
        where: { customerId: sess.customerId },
        data: { isDefault: false },
      }),
      prisma.deliveryAddress.updateMany({
        where: { id: addressId, customerId: sess.customerId },
        data: { isDefault: true },
      }),
    ]);

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao definir endereço padrão." };
  }
}

export async function toggleStoreFavorite(companyIdOrSlug: string, productId: string) {
  try {
    const company = await resolvePublicCompanyRecord(companyIdOrSlug);
    const sess = await getStoreCustomerSession();
    if (!company || !sess || sess.companyId !== company.id) {
      return { error: "UNAUTHENTICATED" };
    }

    const cust = await prisma.customer.findUnique({
      where: { id: sess.customerId },
      select: { favoriteProductIds: true },
    });
    const current = parseFavorites(cust?.favoriteProductIds);
    const exists = current.includes(productId);
    const next = exists ? current.filter((id) => id !== productId) : [...current, productId];

    await prisma.customer.update({
      where: { id: sess.customerId },
      data: { favoriteProductIds: JSON.stringify(next) },
    });

    return { success: true, favorites: next };
  } catch (err: any) {
    return { error: err.message || "Erro ao favoritar produto." };
  }
}

export async function submitStoreOrder(input: {
  companyIdOrSlug: string;
  customerName: string;
  customerPhone: string;
  deliveryType: "RETIRADA" | "MESA" | "ENTREGA";
  deliveryLocation?: string;
  deliveryAddressId?: string;
  addressData?: {
    zipCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    reference?: string;
    label?: string;
  };
  saveAddress?: boolean;
  paymentMethod?: string;
  notes?: string;
  items: { productId: string; quantity: number; notes?: string }[];
}) {
  try {
    const company = await resolvePublicCompanyRecord(input.companyIdOrSlug);
    if (!company) return { error: "Loja não encontrada." };

    if (company.licenseStatus === "SUSPENDED" || new Date(company.licenseExpiresAt) < new Date()) {
      return { error: "Esta loja está temporariamente indisponível." };
    }
    if (company.digitalMenuEnabled === false) {
      return { error: "A loja está fechada para pedidos no momento." };
    }

    const customerName = (input.customerName || "").trim();
    const customerPhone = (input.customerPhone || "").trim();
    if (customerName.length < 2) return { error: "Informe seu nome completo." };
    if (customerPhone.replace(/\D/g, "").length < 8) {
      return { error: "Informe um WhatsApp ou telefone válido." };
    }

    if (!["RETIRADA", "MESA", "ENTREGA"].includes(input.deliveryType)) {
      return { error: "Forma de entrega inválida." };
    }

    const validItems = (input.items || []).filter((i) => i.productId && Number(i.quantity) > 0);
    if (validItems.length === 0) return { error: "Adicione ao menos 1 produto ao carrinho." };

    const sess = await getStoreCustomerSession();
    let customerId: string | null = sess && sess.companyId === company.id ? sess.customerId : null;

    if (!customerId) {
      const cleanPhoneDigits = customerPhone.replace(/\D/g, "");
      const existingByPhone = cleanPhoneDigits.length >= 8
        ? await prisma.customer.findFirst({
            where: {
              companyId: company.id,
              phone: { contains: cleanPhoneDigits.slice(-8) },
            },
            select: { id: true },
          })
        : null;

      if (existingByPhone) {
        customerId = existingByPhone.id;
      } else {
        const createdGuest = await prisma.customer.create({
          data: {
            companyId: company.id,
            name: customerName,
            phone: customerPhone,
            personType: "PF",
            taxRegime: "CONSUMIDOR_FINAL",
          },
          select: { id: true },
        });
        customerId = createdGuest.id;
      }
    }

    let resolvedLocation = (input.deliveryLocation || "").trim();
    let deliveryAddressId = input.deliveryAddressId || null;

    if (input.deliveryType === "ENTREGA") {
      if (input.addressData && input.addressData.street.trim()) {
        const a = input.addressData;
        resolvedLocation = `${a.street.trim()}, ${a.number.trim() || "S/N"}${
          a.complement?.trim() ? ` (${a.complement.trim()})` : ""
        } - ${a.neighborhood.trim()}, ${a.city.trim()}/${a.state.trim().toUpperCase()}${
          a.zipCode ? ` • CEP ${a.zipCode}` : ""
        }${a.reference?.trim() ? ` • Ref: ${a.reference.trim()}` : ""}`;

        if (input.saveAddress && customerId) {
          const savedAddr = await prisma.deliveryAddress.create({
            data: {
              customerId,
              label: (a.label || "Entrega").trim(),
              zipCode: a.zipCode || "00000-000",
              street: a.street.trim(),
              number: a.number.trim() || "S/N",
              complement: a.complement?.trim() || null,
              neighborhood: a.neighborhood.trim() || null,
              city: a.city.trim(),
              state: a.state.trim().toUpperCase().slice(0, 2),
              reference: a.reference?.trim() || null,
              isDefault: false,
            },
          });
          deliveryAddressId = savedAddr.id;
        }
      } else if (deliveryAddressId && customerId) {
        const addr = await prisma.deliveryAddress.findFirst({
          where: { id: deliveryAddressId, customerId },
        });
        if (addr) {
          resolvedLocation = `${addr.street}, ${addr.number || "S/N"}${
            addr.complement ? ` (${addr.complement})` : ""
          } - ${addr.neighborhood || ""}, ${addr.city}/${addr.state} • CEP ${addr.zipCode}${
            addr.reference ? ` • Ref: ${addr.reference}` : ""
          }`;
        }
      }

      if (resolvedLocation.length < 4) {
        return { error: "Informe o endereço completo para entrega em domicílio." };
      }
    } else if (input.deliveryType === "MESA") {
      if (resolvedLocation.length < 1) {
        return { error: "Informe o número da mesa ou local." };
      }
    } else {
      resolvedLocation = resolvedLocation || "Retirar no Local";
    }

    const productIds = Array.from(new Set(validItems.map((i) => i.productId)));
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
        promoPrice: true,
        promoStartDate: true,
        promoEndDate: true,
        cost: true,
      },
    });

    const prodMap = new Map(dbProducts.map((p) => [p.id, p]));
    const now = new Date();
    let subtotal = 0;

    const orderItemsData = validItems.map((it) => {
      const prod = prodMap.get(it.productId);
      if (!prod) {
        throw new Error("Um dos produtos do carrinho não está disponível no catálogo.");
      }
      const reg = Number(prod.price || 0);
      const promo = prod.promoPrice !== null && prod.promoPrice !== undefined ? Number(prod.promoPrice) : null;
      const promoActive =
        promo !== null &&
        promo > 0 &&
        promo < reg &&
        (!prod.promoStartDate || new Date(prod.promoStartDate) <= now) &&
        (!prod.promoEndDate || new Date(prod.promoEndDate) >= now);

      const unitPrice = promoActive && promo !== null ? promo : reg;
      const qty = Math.round(Number(it.quantity) * 1000) / 1000;
      const itemTotal = Number((unitPrice * qty).toFixed(2));
      subtotal += itemTotal;

      return {
        productId: prod.id,
        quantity: qty,
        unitPrice,
        discount: 0,
        total: itemTotal,
        cost: Number(prod.cost || 0),
        stockDeducted: false,
        notes: it.notes?.trim() || null,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    const minOrder = Number(company.digitalMenuMinOrder || 0);
    if (minOrder > 0 && subtotal < minOrder) {
      return {
        error: `O pedido mínimo para compras online é de R$ ${minOrder.toFixed(2).replace(".", ",")}.`,
      };
    }

    const deliveryFee =
      input.deliveryType === "ENTREGA" ? Number(company.digitalMenuDeliveryFee || 0) : 0;
    const total = Number((subtotal + deliveryFee).toFixed(2));
    const orderNumber = `AG-${Date.now().toString().slice(-6)}`;

    const order = await prisma.order.create({
      data: {
        companyId: company.id,
        customerId,
        channel: "DIGITAL_MENU",
        status: "PENDING_APPROVAL",
        deliveryType: input.deliveryType,
        deliveryLocation: resolvedLocation,
        deliveryAddressId,
        deliveryFee,
        paymentMethod: input.paymentMethod || "PIX",
        customerName,
        customerPhone,
        notes: input.notes?.trim() || null,
        orderNumber,
        subtotal,
        discount: 0,
        total,
        items: { create: orderItemsData },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, unit: true, imageUrl: true } },
          },
        },
      },
    });

    revalidatePath("/ecommerce");
    revalidatePath("/customers");
    return { success: true, order: toPlain(order) };
  } catch (err: any) {
    return { error: err.message || "Erro ao finalizar pedido." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTE 2: PAINEL ADMINISTRATIVO DA LOJA ONLINE
// ─────────────────────────────────────────────────────────────────────────────

export async function getStoreAdminDashboardData() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }
    const companyId = session.companyId;

    const [company, products, categories, storeOrders, customers, salesForStats] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        include: {
          theme: true,
          fiscalConfig: true,
        },
      }),
      prisma.product.findMany({
        where: { companyId, isRawMaterial: false, isPackaging: false },
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        where: { companyId },
        include: { _count: { select: { products: true } } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.order.findMany({
        where: { companyId, channel: "DIGITAL_MENU" },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          items: {
            include: { product: { select: { id: true, name: true, unit: true, imageUrl: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
      prisma.customer.findMany({
        where: { companyId },
        include: {
          deliveryAddresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
          orders: {
            where: { channel: "DIGITAL_MENU" },
            include: {
              items: {
                include: { product: { select: { id: true, name: true, unit: true } } },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.findMany({
        where: {
          companyId,
          channel: "DIGITAL_MENU",
          status: { notIn: ["REJECTED", "CANCELED"] },
        },
        select: { id: true, total: true, createdAt: true, status: true },
      }),
    ]);

    if (!company) return { error: "Empresa não encontrada." };

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const salesDay = salesForStats
      .filter((o) => new Date(o.createdAt) >= startOfToday)
      .reduce((a, b) => a + Number(b.total || 0), 0);
    const salesWeek = salesForStats
      .filter((o) => new Date(o.createdAt) >= startOfWeek)
      .reduce((a, b) => a + Number(b.total || 0), 0);
    const salesMonth = salesForStats
      .filter((o) => new Date(o.createdAt) >= startOfMonth)
      .reduce((a, b) => a + Number(b.total || 0), 0);

    const newOrdersCount = storeOrders.filter((o) => o.status === "PENDING_APPROVAL").length;
    const inProgressOrdersCount = storeOrders.filter((o) =>
      ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status)
    ).length;

    const activeMenuProducts = products.filter((p) => p.showInDigitalMenu).length;
    const promoProductsCount = products.filter(
      (p) => p.promoPrice !== null && Number(p.promoPrice) > 0 && Number(p.promoPrice) < Number(p.price)
    ).length;
    const lowStockProductsCount = products.filter(
      (p) => p.showInDigitalMenu && Number(p.stock || 0) <= Math.max(5, Number(p.minStock || 0))
    ).length;

    // Série 7 dias para gráficos simples
    const chart7Days: { label: string; iso: string; revenue: number; ordersCount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const dayOrders = storeOrders.filter((o) => {
        const dt = new Date(o.createdAt);
        return dt >= d && dt < next && !["REJECTED", "CANCELED"].includes(o.status);
      });

      chart7Days.push({
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        iso: d.toISOString().slice(0, 10),
        revenue: Number(dayOrders.reduce((a, o) => a + Number(o.total || 0), 0).toFixed(2)),
        ordersCount: dayOrders.length,
      });
    }

    let parsedPayments: string[] = ["PIX", "DINHEIRO", "CARTAO"];
    try {
      if (company.digitalMenuPaymentMethods) {
        const arr = JSON.parse(company.digitalMenuPaymentMethods);
        if (Array.isArray(arr) && arr.length > 0) parsedPayments = arr;
      }
    } catch {}

    return {
      success: true,
      menuPath: `/loja/${company.slug || company.id}`,
      kpis: {
        salesDay,
        salesWeek,
        salesMonth,
        newOrdersCount,
        inProgressOrdersCount,
        totalProductsCount: products.length,
        activeMenuProducts,
        promoProductsCount,
        lowStockProductsCount,
      },
      chart7Days,
      company: toPlain({
        ...company,
        digitalMenuDeliveryFee: Number(company.digitalMenuDeliveryFee || 0),
        digitalMenuMinOrder: Number(company.digitalMenuMinOrder || 0),
        digitalMenuPaymentMethods: parsedPayments,
      }),
      products: toPlain(
        products.map((p) => ({
          ...p,
          price: Number(p.price || 0),
          cost: p.cost !== null ? Number(p.cost) : null,
          promoPrice: p.promoPrice !== null ? Number(p.promoPrice) : null,
          stock: Number(p.stock || 0),
          minStock: Number(p.minStock || 0),
        }))
      ),
      categories: toPlain(categories),
      orders: toPlain(storeOrders),
      customers: toPlain(
        customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          email: c.email || "",
          document: c.document || "",
          customerType: c.taxRegime || "CONSUMIDOR_FINAL",
          hasAccount: Boolean(c.passwordHash),
          addresses: c.deliveryAddresses || [],
          ordersCount: (c.orders || []).length,
          totalBought: (c.orders || [])
            .filter((o) => !["REJECTED", "CANCELED"].includes(o.status))
            .reduce((a, o) => a + Number(o.total || 0), 0),
          orders: c.orders || [],
        }))
      ),
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao carregar painel da loja." };
  }
}

export async function upsertStoreProduct(input: {
  id?: string;
  name: string;
  description?: string;
  categoryId?: string | null;
  price: number;
  promoPrice?: number | null;
  stock: number;
  unit: string;
  imageUrl?: string | null;
  showInDigitalMenu: boolean;
  featured?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado." };

    const name = (input.name || "").trim();
    const price = Number(input.price);
    if (!name || !Number.isFinite(price) || price < 0) {
      return { error: "Nome e preço válido são obrigatórios." };
    }

    const promo =
      input.promoPrice !== undefined && input.promoPrice !== null && Number(input.promoPrice) > 0
        ? Number(input.promoPrice)
        : null;

    const dataPayload = {
      name,
      description: input.description?.trim() || null,
      categoryId: input.categoryId || null,
      price,
      promoPrice: promo,
      stock: Number(input.stock) || 0,
      unit: (input.unit || "UN").trim().toUpperCase(),
      imageUrl: input.imageUrl?.trim() || null,
      showInDigitalMenu: Boolean(input.showInDigitalMenu),
      featured: Boolean(input.featured),
    };

    if (input.id) {
      await prisma.product.updateMany({
        where: { id: input.id, companyId: session.companyId },
        data: dataPayload,
      });
    } else {
      await prisma.product.create({
        data: {
          ...dataPayload,
          companyId: session.companyId,
        },
      });
    }

    await revalidateStorefront(session.companyId);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar produto." };
  }
}

export async function deleteStoreProduct(productId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado." };

    const prod = await prisma.product.findFirst({
      where: { id: productId, companyId: session.companyId },
      include: { _count: { select: { saleItems: true, orderItems: true } } },
    });
    if (!prod) return { error: "Produto não encontrado." };

    if (prod._count.saleItems > 0 || prod._count.orderItems > 0) {
      await prisma.product.update({
        where: { id: prod.id },
        data: { showInDigitalMenu: false },
      });
      await revalidateStorefront(session.companyId);
      return {
        success: true,
        deactivatedOnly: true,
        message: "Produto possui histórico de vendas/pedidos e foi ocultado da loja online.",
      };
    }

    await prisma.product.delete({ where: { id: prod.id } });
    await revalidateStorefront(session.companyId);
    return { success: true, deactivatedOnly: false };
  } catch (err: any) {
    return { error: err.message || "Erro ao remover produto." };
  }
}

export async function upsertStoreCategory(input: {
  id?: string;
  name: string;
  imageUrl?: string | null;
  active?: boolean;
  sortOrder?: number;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado." };

    const name = (input.name || "").trim();
    if (!name) return { error: "Informe o nome da categoria." };

    const dataPayload = {
      name,
      imageUrl: input.imageUrl?.trim() || null,
      active: input.active !== undefined ? Boolean(input.active) : true,
      sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
    };

    if (input.id) {
      await prisma.category.updateMany({
        where: { id: input.id, companyId: session.companyId },
        data: dataPayload,
      });
    } else {
      const maxSort = await prisma.category.aggregate({
        where: { companyId: session.companyId },
        _max: { sortOrder: true },
      });
      await prisma.category.create({
        data: {
          ...dataPayload,
          sortOrder: input.sortOrder ?? ((maxSort._max.sortOrder ?? 0) + 1),
          companyId: session.companyId,
        },
      });
    }

    await revalidateStorefront(session.companyId);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar categoria." };
  }
}

export async function reorderStoreCategory(categoryId: string, direction: "UP" | "DOWN") {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado." };

    const cats = await prisma.category.findMany({
      where: { companyId: session.companyId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    const idx = cats.findIndex((c) => c.id === categoryId);
    if (idx < 0) return { error: "Categoria não encontrada." };
    const swapIdx = direction === "UP" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= cats.length) return { success: true };

    const reordered = [...cats];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(swapIdx, 0, moved);

    await prisma.$transaction(
      reordered.map((c, index) =>
        prisma.category.update({
          where: { id: c.id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    await revalidateStorefront(session.companyId);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao reordenar categoria." };
  }
}

export async function deleteStoreCategory(categoryId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado." };

    await prisma.$transaction([
      prisma.product.updateMany({
        where: { categoryId, companyId: session.companyId },
        data: { categoryId: null },
      }),
      prisma.category.deleteMany({
        where: { id: categoryId, companyId: session.companyId },
      }),
    ]);

    await revalidateStorefront(session.companyId);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao excluir categoria." };
  }
}

export async function upsertStorePromotion(input: {
  productId: string;
  oldPrice?: number;
  promoPrice: number;
  startDate?: string | null;
  endDate?: string | null;
  active: boolean;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado." };

    const prod = await prisma.product.findFirst({
      where: { id: input.productId, companyId: session.companyId },
    });
    if (!prod) return { error: "Produto não encontrado." };

    const basePrice =
      input.oldPrice && Number(input.oldPrice) > 0 ? Number(input.oldPrice) : Number(prod.price);
    const promo = Number(input.promoPrice);
    if (!Number.isFinite(promo) || promo <= 0 || promo >= basePrice) {
      return { error: "O preço promocional deve ser maior que zero e menor que o preço original." };
    }

    await prisma.product.update({
      where: { id: prod.id },
      data: {
        price: basePrice,
        promoPrice: input.active ? promo : null,
        promoStartDate: input.active && input.startDate ? new Date(`${input.startDate}T00:00:00`) : null,
        promoEndDate: input.active && input.endDate ? new Date(`${input.endDate}T23:59:59`) : null,
        showInDigitalMenu: true,
      },
    });

    await revalidateStorefront(session.companyId);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar promoção." };
  }
}

export async function clearStorePromotion(productId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado." };

    await prisma.product.updateMany({
      where: { id: productId, companyId: session.companyId },
      data: {
        promoPrice: null,
        promoStartDate: null,
        promoEndDate: null,
      },
    });

    await revalidateStorefront(session.companyId);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao remover promoção." };
  }
}

export async function updateStoreSettings(input: {
  storeName?: string;
  logoUrl?: string;
  bannerUrl?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
  hours?: string;
  deliveryFee?: number;
  minOrder?: number;
  deliveryEta?: string;
  paymentMethods?: string[];
  storeInfo?: string;
  notes?: string;
  instagram?: string;
  facebook?: string;
  digitalMenuEnabled?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado." };
    const companyId = session.companyId;

    await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(typeof input.digitalMenuEnabled === "boolean"
          ? { digitalMenuEnabled: input.digitalMenuEnabled }
          : {}),
        ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp.trim() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
        ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
        ...(input.bannerUrl !== undefined
          ? { digitalMenuBannerUrl: input.bannerUrl.trim() || null }
          : {}),
        ...(input.notes !== undefined ? { digitalMenuNotes: input.notes.trim() || null } : {}),
        ...(input.hours !== undefined ? { digitalMenuHours: input.hours.trim() || null } : {}),
        ...(input.deliveryFee !== undefined
          ? { digitalMenuDeliveryFee: Math.max(0, Number(input.deliveryFee) || 0) }
          : {}),
        ...(input.minOrder !== undefined
          ? { digitalMenuMinOrder: Math.max(0, Number(input.minOrder) || 0) }
          : {}),
        ...(input.deliveryEta !== undefined
          ? { digitalMenuDeliveryEta: input.deliveryEta.trim() || null }
          : {}),
        ...(Array.isArray(input.paymentMethods)
          ? { digitalMenuPaymentMethods: JSON.stringify(input.paymentMethods) }
          : {}),
        ...(input.storeInfo !== undefined
          ? { digitalMenuStoreInfo: input.storeInfo.trim() || null }
          : {}),
        ...(input.instagram !== undefined
          ? { digitalMenuInstagram: input.instagram.trim() || null }
          : {}),
        ...(input.facebook !== undefined
          ? { digitalMenuFacebook: input.facebook.trim() || null }
          : {}),
      },
    });

    if (input.storeName?.trim()) {
      const comp = await prisma.company.findUnique({ where: { id: companyId } });
      if (comp) {
        await prisma.fiscalConfig.upsert({
          where: { companyId },
          update: { tradeName: input.storeName.trim() },
          create: {
            companyId,
            tradeName: input.storeName.trim(),
            companyName: comp.name,
            cnpj: comp.document,
          },
        });
      }
    }

    if (input.logoUrl !== undefined) {
      await prisma.tenantTheme.upsert({
        where: { companyId },
        update: { logoPrincipal: input.logoUrl.trim() || null },
        create: {
          companyId,
          logoPrincipal: input.logoUrl.trim() || null,
        },
      });
    }

    await revalidateStorefront(companyId);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar configurações da loja." };
  }
}

export async function updateStoreBannersDirect(input: {
  companyIdOrSlug: string;
  bannerSlidesJson: string;
}) {
  try {
    const session = await getSession();
    const company = await resolvePublicCompanyRecord(input.companyIdOrSlug);
    if (!company) return { error: "Loja não encontrada." };

    if (!session || (session.companyId !== company.id && session.role !== "MASTER")) {
      return {
        error:
          "Para salvar alterações nos banners, entre com sua conta administrativa no sistema.",
      };
    }

    await prisma.company.update({
      where: { id: company.id },
      data: {
        digitalMenuBannerUrl: input.bannerSlidesJson.trim() || null,
      },
    });

    await revalidateStorefront(company.id);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar fotos dos banners." };
  }
}

