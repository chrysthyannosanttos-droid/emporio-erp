"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { getUserEffectivePermissions } from "@/lib/permissions";
import { getReceiptBySaleId } from "@/lib/receiptData";
import { ReceiptData } from "@/lib/receiptFormat";
import { validateActiveSession } from "@/actions/auth";
import { searchProducts, getProductByBarcode } from "./product";
import { createSale } from "./sale";
import { verifySupervisorPin } from "./users";

const ALLOWED_PAYMENTS = ["MONEY", "PIX", "CREDIT_CARD", "DEBIT_CARD", "VOUCHER", "CREDIARIO"];
const LIMITED_DISCOUNT_PERCENT = 5; // mesmo limite descrito na permissão "pdv.discount.limited"

export interface MobileProduct {
  id: string;
  name: string;
  barcode: string | null;
  internalCode: string | null;
  unit: string;
  stock: number;
  price: number;
  originalPrice?: number;
}

interface MobileAccess {
  allowed: boolean;
  unauthenticated?: boolean;
  reason?: string;
  userName?: string;
  companyName?: string;
  canDiscountLimited?: boolean;
  canDiscountUnlimited?: boolean;
}

/** Garante que a permissão pdv.mobile exista no banco e seja vinculada por padrão somente ao perfil ADMIN. */
async function ensureMobilePermissionSeeded() {
  try {
    const perm = await prisma.permission.upsert({
      where: { code: "pdv.mobile" },
      update: {},
      create: {
        code: "pdv.mobile",
        name: "PDV Mobile (Celular/Tablet)",
        module: "Frente de Caixa (PDV)",
        description: "Permite usar o PDV Mobile pelo celular/tablet e enviar cupom digital por WhatsApp/SMS/Email",
      },
    });

    const adminRoles = await prisma.role.findMany({
      where: { key: "ADMIN" },
      select: { id: true },
    });
    if (adminRoles.length > 0) {
      await prisma.rolePermission.createMany({
        data: adminRoles.map((r) => ({ roleId: r.id, permissionId: perm.id })),
        skipDuplicates: true,
      });
    }
  } catch {
    // silencioso para não bloquear o fluxo do PDV
  }
}

/** Verifica sessão + permissões do usuário para usar o PDV Mobile. */
async function checkMobileAccess(): Promise<MobileAccess & { userId?: string; companyId?: string }> {
  const session = await getSession();
  if (!session?.userId) {
    return { allowed: false, unauthenticated: true, reason: "Sessão expirada. Faça login novamente." };
  }

  // Resolver empresa caso não esteja expressa na sessão (ex.: SuperAdmin)
  let companyId = session.companyId;
  let companyName = session.companyName;
  if (!companyId) {
    const defaultComp =
      (await prisma.company.findFirst({ where: { document: "65.522.409/0001-13" } })) ||
      (await prisma.company.findFirst());
    if (defaultComp) {
      companyId = defaultComp.id;
      companyName = defaultComp.name;
    }
  }

  if (!companyId) {
    return { allowed: false, reason: "Nenhuma empresa associada a esta conta." };
  }

  // SuperAdmin e Administradores possuem acesso total irrestrito ao PDV Mobile
  const isAdmin = session.role === "ADMIN" || Boolean(session.isSuperAdmin);
  if (isAdmin) {
    return {
      allowed: true,
      userId: session.userId,
      companyId,
      userName: session.name,
      companyName: companyName || "Empório Agrobelém",
      canDiscountLimited: true,
      canDiscountUnlimited: true,
    };
  }

  await ensureMobilePermissionSeeded();

  const perms = await getUserEffectivePermissions(session.userId);
  const has = (code: string) => perms.includes(code);

  if (!has("pdv.mobile")) {
    return {
      allowed: false,
      reason:
        'Seu usuário não tem permissão para usar o PDV Mobile. Peça ao administrador para habilitar "PDV Mobile (Celular/Tablet)" no perfil ou no usuário.',
      userName: session.name,
    };
  }

  return {
    allowed: true,
    userId: session.userId,
    companyId,
    userName: session.name,
    companyName: companyName || "Empório Agrobelém",
    canDiscountLimited: has("pdv.discount.limited"),
    canDiscountUnlimited: has("pdv.discount.unlimited"),
  };
}

export async function getMobilePdvAccess(): Promise<MobileAccess> {
  const { userId: _u, companyId: _c, ...access } = await checkMobileAccess();
  return access;
}

function toMobileProduct(p: any): MobileProduct {
  return {
    id: p.id,
    name: p.name,
    barcode: p.barcode ?? null,
    internalCode: p.internalCode ?? null,
    unit: p.unit || "UN",
    stock: Number(p.stock ?? 0),
    price: Number(p.price),
    originalPrice: p.originalPrice !== undefined ? Number(p.originalPrice) : undefined,
  };
}

export async function searchMobileProducts(query: string): Promise<{ products: MobileProduct[]; error?: string }> {
  const access = await checkMobileAccess();
  if (!access.allowed) return { products: [], error: access.reason };

  const q = (query || "").trim();
  if (q.length === 0) {
    try {
      const initial = await prisma.product.findMany({
        where: { companyId: access.companyId },
        orderBy: { name: "asc" },
        take: 30,
      });
      return { products: initial.map(toMobileProduct) };
    } catch {
      return { products: [] };
    }
  }
  if (q.length < 2) return { products: [] };

  const res = await searchProducts(q, access.companyId);
  if ("error" in res && res.error) return { products: [], error: res.error };
  return { products: (res.products || []).map(toMobileProduct) };
}

export async function lookupMobileBarcode(barcode: string): Promise<{ product: MobileProduct | null; error?: string }> {
  const access = await checkMobileAccess();
  if (!access.allowed) return { product: null, error: access.reason };

  const code = (barcode || "").replace(/\s/g, "");
  if (!code) return { product: null };

  const res = await getProductByBarcode(code, access.companyId);
  if ("error" in res && res.error) return { product: null, error: res.error };
  return { product: res.product ? toMobileProduct(res.product) : null };
}

/** Preço vigente por produto, calculado no servidor (preço de cadastro + promoções ativas da empresa). */
async function resolveServerPrices(companyId: string, productIds: string[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId },
    select: { id: true, price: true },
  });

  const now = new Date();
  const promos = await prisma.campaign.findMany({
    where: {
      companyId,
      type: "PROMO",
      active: true,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
  });

  const promoPrices: Record<string, number> = {};
  for (const promo of promos) {
    try {
      const rules = promo.rules ? JSON.parse(promo.rules) : null;
      if (rules?.productPrices) Object.assign(promoPrices, rules.productPrices);
    } catch {}
  }

  const prices = new Map<string, number>();
  for (const p of products) {
    prices.set(p.id, promoPrices[p.id] !== undefined ? Number(promoPrices[p.id]) : Number(p.price));
  }
  return prices;
}

export async function getMobileCustomers(): Promise<{
  customers: {
    id: string;
    name: string;
    document: string | null;
    phone: string | null;
    customerType: "FUNCIONARIO" | "REVENDA" | "CONSUMIDOR_FINAL";
    creditLimit: number;
    creditUsed: number;
  }[];
  error?: string;
}> {
  const access = await checkMobileAccess();
  if (!access.allowed || !access.companyId) {
    return { customers: [], error: access.reason };
  }

  const list = await prisma.customer.findMany({
    where: { companyId: access.companyId },
    orderBy: [{ name: "asc" }],
  });

  return {
    customers: list.map((c) => ({
      id: c.id,
      name: c.name,
      document: c.document,
      phone: c.phone,
      customerType:
        c.taxRegime === "FUNCIONARIO"
          ? "FUNCIONARIO"
          : c.taxRegime === "REVENDA"
          ? "REVENDA"
          : "CONSUMIDOR_FINAL",
      creditLimit: Number(c.creditLimit || 0),
      creditUsed: Number(c.creditUsed || 0),
    })),
  };
}

export async function createMobileSale(input: {
  items: { productId: string; quantity: number }[];
  paymentMethod: string;
  discount?: number;
  customerCpf?: string;
  customerId?: string;
  supervisorPin?: string;
}): Promise<{ success: true; saleId: string; receipt: ReceiptData | null; cashbackEarned: number } | { error: string }> {
  const access = await checkMobileAccess();
  if (!access.allowed || !access.companyId) {
    return { error: access.reason || "Sem permissão." };
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { error: "Adicione pelo menos um item à venda." };
  }
  if (!ALLOWED_PAYMENTS.includes(input.paymentMethod)) {
    return { error: "Forma de pagamento inválida." };
  }
  for (const item of input.items) {
    if (!item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      return { error: "Há item com quantidade inválida." };
    }
  }

  const prices = await resolveServerPrices(access.companyId, input.items.map((i) => i.productId));
  const missing = input.items.find((i) => !prices.has(i.productId));
  if (missing) {
    return { error: "Um dos produtos não foi encontrado no cadastro desta empresa." };
  }

  const items = input.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    unitPrice: prices.get(i.productId)!,
  }));
  const subtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);

  // Regra de alçada de desconto
  const discount = Math.max(0, Number(input.discount) || 0);
  if (discount > 0) {
    if (discount > subtotal) return { error: "O desconto não pode ser maior que o total da venda." };
    if (!access.canDiscountUnlimited) {
      if (!access.canDiscountLimited) {
        return { error: "Seu usuário não tem permissão para aplicar desconto." };
      }
      const maxAllowed = (subtotal * LIMITED_DISCOUNT_PERCENT) / 100;
      if (discount > maxAllowed + 0.001) {
        return {
          error: `Desconto máximo permitido para o seu perfil: ${LIMITED_DISCOUNT_PERCENT}% (R$ ${maxAllowed.toFixed(2).replace(".", ",")}).`,
        };
      }
    }
  }

  let creditAuthorizedBy: string | undefined = undefined;
  if (input.paymentMethod === "CREDIARIO") {
    if (!input.customerId) {
      return { error: "Selecione um funcionário para pagar com Crediário." };
    }
    const pinCheck = await verifySupervisorPin(input.supervisorPin || "");
    if (!pinCheck.success) {
      return { error: pinCheck.error || "PIN de autorização obrigatório para Crediário." };
    }
    creditAuthorizedBy = pinCheck.userName;
  }

  const res = await createSale({
    items,
    paymentMethod: input.paymentMethod,
    discount,
    customerCpf: input.customerCpf || undefined,
    customerId: input.customerId || undefined,
    creditAuthorizedBy,
  });

  if ("error" in res && res.error) return { error: res.error };
  if (!("saleId" in res) || !res.saleId) return { error: "Não foi possível registrar a venda." };

  const receipt = await getReceiptBySaleId(res.saleId);
  return { success: true, saleId: res.saleId, receipt, cashbackEarned: res.cashbackEarned || 0 };
}

