"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { resolveActiveCompany } from "@/lib/tenant";
import { getSession } from "@/lib/session";

export type LossTypeValue = "DISCARD" | "SUPPLIER_EXCHANGE" | "EXPIRED" | "OTHER";

const ALLOWED_LOSS_TYPES: LossTypeValue[] = ["DISCARD", "SUPPLIER_EXCHANGE", "EXPIRED", "OTHER"];

async function resolveLossSessionContext() {
  const session = await getSession();

  let company = session?.companyId
    ? await prisma.company.findUnique({ where: { id: session.companyId } })
    : await resolveActiveCompany();

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "EMPORIO AGROBELEM LTDA",
        document: "65.522.409/0001-13",
      },
    });
  }

  let user = session?.userId
    ? await prisma.user.findFirst({ where: { id: session.userId, companyId: company.id } })
    : null;
  if (!user && session?.userId) {
    user = await prisma.user.findUnique({ where: { id: session.userId } });
  }
  if (!user) {
    user = await prisma.user.findFirst({ where: { companyId: company.id, active: true } });
  }
  if (!user) {
    user = await prisma.user.findFirst({ where: { companyId: company.id } });
  }
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Operador Responsável",
        email: `operador_${Date.now()}@cybertech.local`,
        password: "hashed_password",
        role: "ADMIN",
        companyId: company.id,
      },
    });
  }

  return { session, company, user };
}

function formatYmdSaoPaulo(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value || "2026";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  return `${year}${month}${day}`;
}

async function generateUniqueReceiptCode(companyId: string): Promise<string> {
  const now = new Date();
  const ymd = formatYmdSaoPaulo(now);
  const prefix = `AV-${ymd}-`;

  const existingToday = await prisma.loss.count({
    where: {
      companyId,
      receiptCode: { startsWith: prefix },
    },
  });

  for (let attempt = 0; attempt < 8; attempt++) {
    const seq =
      attempt === 0
        ? String(existingToday + 1).padStart(4, "0")
        : String(existingToday + 1 + attempt).padStart(4, "0");
    const candidate =
      attempt < 4
        ? `${prefix}${seq}`
        : `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;

    const collision = await prisma.loss.findFirst({
      where: { companyId, receiptCode: candidate },
      select: { id: true },
    });
    if (!collision) return candidate;
  }

  return `${prefix}${Date.now().toString().slice(-4)}`;
}

export async function getLossesAndExpirationsData() {
  try {
    const { company, user } = await resolveLossSessionContext();

    const [products, suppliers, users, batches, prodLogs, losses] = await Promise.all([
      prisma.product.findMany({
        where: { companyId: company.id },
        orderBy: { name: "asc" },
      }),
      prisma.supplier.findMany({
        where: { companyId: company.id, status: "ACTIVE" },
        select: { id: true, name: true, tradeName: true, document: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { companyId: company.id, active: true },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      }),
      prisma.productBatch.findMany({
        where: { product: { companyId: company.id } },
        include: { product: true },
        orderBy: { expirationDate: "asc" },
      }),
      prisma.productionLog.findMany({
        where: { companyId: company.id, expirationDate: { not: null } },
        include: {
          recipe: {
            include: { product: true },
          },
        },
        orderBy: { expirationDate: "asc" },
      }),
      prisma.loss.findMany({
        where: { companyId: company.id },
        include: { product: true, user: true, supplier: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const nowMs = Date.now();

    const formattedBatches = batches.map((b) => {
      const expMs = new Date(b.expirationDate).getTime();
      const daysLeft = Math.ceil((expMs - nowMs) / 86400000);
      return {
        id: b.id,
        productId: b.productId,
        product: b.product?.name || "Produto",
        unit: b.product?.unit || "UN",
        batch: b.batchNumber || `L-${b.id.slice(0, 5).toUpperCase()}`,
        qty: Number(b.currentStock || 0),
        expirationDate: b.expirationDate.toISOString(),
        dateFormatted: new Date(b.expirationDate).toLocaleDateString("pt-BR"),
        daysLeft,
        currentPrice: Number(b.product?.price || 0),
        source: "ESTOQUE" as const,
      };
    });

    const formattedProdBatches = prodLogs
      .filter((pl) => pl.expirationDate)
      .map((pl) => {
        const expDate = pl.expirationDate!;
        const expMs = new Date(expDate).getTime();
        const daysLeft = Math.ceil((expMs - nowMs) / 86400000);
        const prod = pl.recipe?.product;
        return {
          id: `prod-${pl.id}`,
          productId: prod?.id || "",
          product: prod?.name || "Produção Própria",
          unit: prod?.unit || "UN",
          batch: pl.batchNumber || `PROD-${pl.id.slice(0, 5).toUpperCase()}`,
          qty: Number(pl.quantityProduced || 0),
          expirationDate: expDate.toISOString(),
          dateFormatted: new Date(expDate).toLocaleDateString("pt-BR"),
          daysLeft,
          currentPrice: Number(prod?.price || 0),
          source: "PRODUCAO" as const,
        };
      });

    const allExpirations = [...formattedBatches, ...formattedProdBatches].sort(
      (a, b) => a.daysLeft - b.daysLeft
    );

    const formattedLosses = losses.map((l) => {
      const unitCostNum = Number(l.unitCost ?? l.product?.cost ?? 0);
      const effectiveCost = unitCostNum > 0 ? unitCostNum : Number(l.product?.price ?? 0);
      return {
        id: l.id,
        productId: l.productId,
        product: l.product?.name || "Produto",
        barcode: l.product?.barcode || null,
        unit: l.product?.unit || "UN",
        qty: Number(l.quantity || 0),
        unitCost: unitCostNum,
        totalLossValue: Number(l.quantity || 0) * effectiveCost,
        lossType: (l.lossType || "DISCARD") as LossTypeValue,
        reason: l.reason || "Avaria / Vencimento",
        notes: l.notes || null,
        photoData: l.photoData || null,
        receiptCode: l.receiptCode || null,
        supplierId: l.supplierId || null,
        supplierName: l.supplier?.tradeName || l.supplier?.name || null,
        userId: l.userId,
        userName: l.user?.name || "Operador",
        createdAt: l.createdAt.toISOString(),
        dateFormatted: new Date(l.createdAt).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });

    return {
      success: true,
      currentUserId: user.id,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode || null,
        stock: Number(p.stock || 0),
        unit: p.unit || "UN",
        price: Number(p.price || 0),
        cost: Number(p.cost || 0),
      })),
      suppliers,
      users,
      expirations: allExpirations,
      losses: formattedLosses,
    };
  } catch (err: any) {
    console.error("Erro em getLossesAndExpirationsData:", err);
    return {
      success: false,
      error: err.message,
      currentUserId: null,
      products: [],
      suppliers: [],
      users: [],
      expirations: [],
      losses: [],
    };
  }
}

export async function registerLossRecord(input: {
  productId: string;
  quantity: number;
  lossType?: LossTypeValue;
  reason: string;
  supplierId?: string;
  photoData?: string;
  nfe?: string;
  notes?: string;
  responsibleUserId?: string;
}) {
  try {
    const { company, user } = await resolveLossSessionContext();
    const qty = Number(input.quantity);
    if (!input.productId || !Number.isFinite(qty) || qty <= 0) {
      return { success: false, error: "Selecione um produto e informe uma quantidade válida." };
    }

    const lossType: LossTypeValue = ALLOWED_LOSS_TYPES.includes(input.lossType as LossTypeValue)
      ? (input.lossType as LossTypeValue)
      : "DISCARD";

    const product = await prisma.product.findFirst({
      where: { id: input.productId, companyId: company.id },
      select: { id: true, cost: true },
    });
    if (!product) {
      return { success: false, error: "Produto não encontrado nesta empresa." };
    }

    let validSupplierId: string | null = null;
    if (lossType === "SUPPLIER_EXCHANGE") {
      if (!input.supplierId) {
        return { success: false, error: "Selecione o fornecedor para troca com fornecedor." };
      }
      const sup = await prisma.supplier.findFirst({
        where: { id: input.supplierId, companyId: company.id },
        select: { id: true },
      });
      if (!sup) {
        return { success: false, error: "Fornecedor selecionado não pertence a esta empresa." };
      }
      validSupplierId = sup.id;
    } else if (input.supplierId) {
      const sup = await prisma.supplier.findFirst({
        where: { id: input.supplierId, companyId: company.id },
        select: { id: true },
      });
      if (sup) validSupplierId = sup.id;
    }

    let responsibleUserId = user.id;
    if (input.responsibleUserId) {
      const respUser = await prisma.user.findFirst({
        where: { id: input.responsibleUserId, companyId: company.id },
        select: { id: true },
      });
      if (respUser) responsibleUserId = respUser.id;
    }

    let cleanPhotoData: string | null = null;
    if (input.photoData && typeof input.photoData === "string") {
      const trimmed = input.photoData.trim();
      if (trimmed.startsWith("data:image/")) {
        if (trimmed.length > 2_000_000) {
          return { success: false, error: "A foto excede o limite máximo permitido após compressão." };
        }
        cleanPhotoData = trimmed;
      }
    }

    const receiptCode = await generateUniqueReceiptCode(company.id);

    const fullReason = input.nfe?.trim()
      ? `${input.reason || "Avaria / Vencimento"} (NF/Lote: ${input.nfe.trim()})`
      : input.reason?.trim() || "Avaria / Vencimento";

    const createdLoss = await prisma.$transaction(async (tx) => {
      const loss = await tx.loss.create({
        data: {
          productId: product.id,
          quantity: qty,
          lossType,
          reason: fullReason,
          supplierId: validSupplierId,
          photoData: cleanPhotoData,
          receiptCode,
          unitCost: product.cost ?? 0,
          notes: input.notes?.trim() || null,
          companyId: company.id,
          userId: responsibleUserId,
        },
        select: {
          id: true,
          receiptCode: true,
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: { decrement: qty },
        },
      });

      return loss;
    });

    revalidatePath("/losses");
    revalidatePath("/expirations");
    revalidatePath("/stock");
    return {
      success: true,
      loss: {
        id: createdLoss.id,
        receiptCode: createdLoss.receiptCode,
      },
    };
  } catch (err: any) {
    console.error("Erro em registerLossRecord:", err);
    return { success: false, error: err.message };
  }
}

export async function getLossReceipt(id: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Sessão expirada ou não autenticada.", receipt: null };
    }

    const loss = await prisma.loss.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            document: true,
            phone: true,
            address: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            barcode: true,
            internalCode: true,
            unit: true,
            price: true,
            cost: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            tradeName: true,
            document: true,
            phone: true,
            contactName: true,
          },
        },
      },
    });

    if (!loss) {
      return { success: false, error: "Recibo de avaria não encontrado.", receipt: null };
    }

    const unitCost = Number(loss.unitCost ?? loss.product?.cost ?? 0);
    const quantity = Number(loss.quantity || 0);
    const totalCost = quantity * unitCost;

    return {
      success: true,
      receipt: {
        id: loss.id,
        receiptCode: loss.receiptCode || `AV-${loss.id.slice(0, 8).toUpperCase()}`,
        lossType: (loss.lossType || "DISCARD") as LossTypeValue,
        reason: loss.reason || "Avaria / Vencimento",
        notes: loss.notes || null,
        photoData: loss.photoData || null,
        quantity,
        unitCost,
        totalCost,
        createdAt: loss.createdAt.toISOString(),
        company: loss.company,
        product: {
          ...loss.product,
          price: Number(loss.product?.price || 0),
          cost: Number(loss.product?.cost || 0),
        },
        user: loss.user,
        supplier: loss.supplier,
      },
    };
  } catch (err: any) {
    console.error("Erro em getLossReceipt:", err);
    return { success: false, error: err.message || "Erro ao carregar recibo.", receipt: null };
  }
}

export async function registerProductBatch(input: {
  productId: string;
  batchNumber: string;
  expirationDate: string;
  quantity: number;
}) {
  try {
    const qty = Number(input.quantity);
    if (!input.productId || !input.expirationDate || qty <= 0) {
      return { success: false, error: "Preencha produto, validade e quantidade do lote." };
    }

    await prisma.productBatch.create({
      data: {
        productId: input.productId,
        batchNumber: input.batchNumber?.trim() || `L-${Date.now().toString().slice(-5)}`,
        expirationDate: new Date(`${input.expirationDate}T12:00:00`),
        initialStock: qty,
        currentStock: qty,
      },
    });

    revalidatePath("/losses");
    revalidatePath("/expirations");
    return { success: true };
  } catch (err: any) {
    console.error("Erro em registerProductBatch:", err);
    return { success: false, error: err.message };
  }
}

export async function applyBatchMarkdownPrice(input: {
  productId: string;
  newPrice: number;
}) {
  try {
    if (!input.productId || Number(input.newPrice) <= 0) {
      return { success: false, error: "Informe um novo preço válido." };
    }

    await prisma.product.update({
      where: { id: input.productId },
      data: {
        price: Number(input.newPrice),
        priceChangedAt: new Date(),
      },
    });

    revalidatePath("/losses");
    revalidatePath("/expirations");
    revalidatePath("/labels");
    revalidatePath("/stock");
    revalidatePath("/pdv");
    return { success: true };
  } catch (err: any) {
    console.error("Erro em applyBatchMarkdownPrice:", err);
    return { success: false, error: err.message };
  }
}

