"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export type ExpirationBucket =
  | "EXPIRED"
  | "CRITICAL_0_5"
  | "ATTENTION_6_15"
  | "PREVENTIVE_16_30"
  | "SAFE_30_PLUS";

function toSpDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function calcDaysLeft(expirationDate: Date): number {
  const todayKey = toSpDateKey(new Date());
  const expKey =
    expirationDate.getUTCHours() === 0 && expirationDate.getUTCMinutes() === 0
      ? expirationDate.toISOString().slice(0, 10)
      : toSpDateKey(expirationDate);

  const [ty, tm, td] = todayKey.split("-").map(Number);
  const [ey, em, ed] = expKey.split("-").map(Number);

  const todayMs = Date.UTC(ty, tm - 1, td);
  const expMs = Date.UTC(ey, em - 1, ed);
  return Math.round((expMs - todayMs) / 86400000);
}

function classifyBucket(daysLeft: number): ExpirationBucket {
  if (daysLeft < 0) return "EXPIRED";
  if (daysLeft <= 5) return "CRITICAL_0_5";
  if (daysLeft <= 15) return "ATTENTION_6_15";
  if (daysLeft <= 30) return "PREVENTIVE_16_30";
  return "SAFE_30_PLUS";
}

function formatBrDate(date: Date): string {
  const expKey =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0
      ? date.toISOString().slice(0, 10)
      : toSpDateKey(date);
  const [y, m, d] = expKey.split("-");
  return `${d}/${m}/${y}`;
}

export async function getExpirationsWorkspace(options?: { includeZeroStock?: boolean }) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return {
        success: false,
        error: "Sessão inválida ou empresa não identificada.",
        batches: [],
        products: [],
        recentDisposals: [],
        summary: {
          expiredCount: 0,
          criticalCount: 0,
          attentionCount: 0,
          preventiveCount: 0,
          safeCount: 0,
          totalActiveCount: 0,
          totalCostAtRisk: 0,
          totalSaleAtRisk: 0,
        },
      };
    }

    const companyId = session.companyId;
    const includeZero = Boolean(options?.includeZeroStock);

    const [allBatches, prodLogs, products, recentDisposals] = await Promise.all([
      prisma.productBatch.findMany({
        where: {
          product: { companyId },
        },
        include: {
          product: {
            include: { category: true },
          },
        },
        orderBy: { expirationDate: "asc" },
      }),
      prisma.productionLog.findMany({
        where: {
          companyId,
          expirationDate: { not: null },
        },
        include: {
          recipe: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { expirationDate: "asc" },
      }),
      prisma.product.findMany({
        where: { companyId },
        include: { category: true },
        orderBy: { name: "asc" },
      }),
      prisma.loss.findMany({
        where: {
          companyId,
          lossType: "EXPIRED",
        },
        include: {
          product: { select: { id: true, name: true, unit: true, unitSale: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ]);

    const prodLogByKey = new Map<string, (typeof prodLogs)[number]>();
    for (const pl of prodLogs) {
      const pId = pl.recipe?.productId;
      const bNum = pl.batchNumber?.trim();
      if (pId && bNum) {
        prodLogByKey.set(`${pId}::${bNum}`, pl);
      }
    }

    const existingBatchKeys = new Set<string>();
    for (const b of allBatches) {
      if (b.batchNumber?.trim()) {
        existingBatchKeys.add(`${b.productId}::${b.batchNumber.trim()}`);
      }
    }

    const filteredBatches = includeZero
      ? allBatches
      : allBatches.filter((b) => Number(b.currentStock || 0) > 0);

    const batchItems = filteredBatches.map((b) => {
      const daysLeft = calcDaysLeft(new Date(b.expirationDate));
      const bucket = classifyBucket(daysLeft);
      const currentStock = Number(b.currentStock || 0);
      const unitCost = Number(b.product?.cost ?? 0);
      const unitPrice = Number(b.product?.price ?? 0);
      const key = b.batchNumber?.trim() ? `${b.productId}::${b.batchNumber.trim()}` : "";
      const linkedProdLog = key ? prodLogByKey.get(key) : undefined;

      return {
        id: b.id,
        batchId: b.id as string | null,
        source: (linkedProdLog ? "PRODUCAO" : "ESTOQUE") as "ESTOQUE" | "PRODUCAO",
        productId: b.productId,
        productName: b.product?.name || "Produto",
        barcode: b.product?.barcode || null,
        internalCode: b.product?.internalCode || null,
        categoryName: b.product?.category?.name || "Geral",
        unit: b.product?.unitSale || b.product?.unit || "UN",
        batchNumber: b.batchNumber || `L-${b.id.slice(0, 6).toUpperCase()}`,
        initialStock: Number(b.initialStock || 0),
        currentStock,
        productStock: Number(b.product?.stock || 0),
        productCost: unitCost,
        productPrice: unitPrice,
        costAtRisk: Number((currentStock * unitCost).toFixed(2)),
        saleAtRisk: Number((currentStock * unitPrice).toFixed(2)),
        expirationDate: b.expirationDate.toISOString(),
        dateFormatted: formatBrDate(new Date(b.expirationDate)),
        daysLeft,
        bucket,
        producerName: linkedProdLog?.user?.name || null,
      };
    });

    // Inclui logs de produção com validade que ainda não possuam ProductBatch vinculado
    const legacyProdItems = prodLogs
      .filter((pl) => {
        if (!pl.expirationDate || !pl.recipe?.product) return false;
        const bNum = pl.batchNumber?.trim();
        if (bNum && existingBatchKeys.has(`${pl.recipe.productId}::${bNum}`)) {
          return false;
        }
        return true;
      })
      .map((pl) => {
        const expDate = pl.expirationDate!;
        const daysLeft = calcDaysLeft(new Date(expDate));
        const bucket = classifyBucket(daysLeft);
        const prod = pl.recipe!.product;
        const qty = Number(pl.quantityProduced || 0);
        const unitCost = Number(prod.cost ?? 0);
        const unitPrice = Number(prod.price ?? 0);

        return {
          id: `prod-${pl.id}`,
          batchId: null as string | null,
          source: "PRODUCAO" as const,
          productId: prod.id,
          productName: prod.name,
          barcode: prod.barcode || null,
          internalCode: prod.internalCode || null,
          categoryName: prod.category?.name || "Produção Própria",
          unit: prod.unitSale || prod.unit || "UN",
          batchNumber: pl.batchNumber || `PROD-${pl.id.slice(0, 6).toUpperCase()}`,
          initialStock: qty,
          currentStock: qty,
          productStock: Number(prod.stock || 0),
          productCost: unitCost,
          productPrice: unitPrice,
          costAtRisk: Number((qty * unitCost).toFixed(2)),
          saleAtRisk: Number((qty * unitPrice).toFixed(2)),
          expirationDate: expDate.toISOString(),
          dateFormatted: formatBrDate(new Date(expDate)),
          daysLeft,
          bucket,
          producerName: pl.user?.name || null,
        };
      });

    const combined = [...batchItems, ...legacyProdItems].sort((a, b) => a.daysLeft - b.daysLeft);

    const activeForKpi = combined.filter((item) => item.currentStock > 0);
    const summary = {
      expiredCount: activeForKpi.filter((i) => i.bucket === "EXPIRED").length,
      criticalCount: activeForKpi.filter((i) => i.bucket === "CRITICAL_0_5").length,
      attentionCount: activeForKpi.filter((i) => i.bucket === "ATTENTION_6_15").length,
      preventiveCount: activeForKpi.filter((i) => i.bucket === "PREVENTIVE_16_30").length,
      safeCount: activeForKpi.filter((i) => i.bucket === "SAFE_30_PLUS").length,
      totalActiveCount: activeForKpi.length,
      totalCostAtRisk: Number(
        activeForKpi
          .filter((i) => i.daysLeft <= 30)
          .reduce((acc, i) => acc + i.costAtRisk, 0)
          .toFixed(2)
      ),
      totalSaleAtRisk: Number(
        activeForKpi
          .filter((i) => i.daysLeft <= 30)
          .reduce((acc, i) => acc + i.saleAtRisk, 0)
          .toFixed(2)
      ),
    };

    return {
      success: true,
      batches: combined,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode || null,
        internalCode: p.internalCode || null,
        unit: p.unitSale || p.unit || "UN",
        stock: Number(p.stock || 0),
        price: Number(p.price || 0),
        cost: Number(p.cost ?? 0),
        categoryName: p.category?.name || "Geral",
      })),
      recentDisposals: recentDisposals.map((l) => ({
        id: l.id,
        receiptCode: l.receiptCode || `AV-${l.id.slice(0, 6).toUpperCase()}`,
        productId: l.productId,
        productName: l.product?.name || "Produto",
        unit: l.product?.unitSale || l.product?.unit || "UN",
        quantity: Number(l.quantity || 0),
        unitCost: Number(l.unitCost ?? 0),
        totalLoss: Number((Number(l.quantity || 0) * Number(l.unitCost ?? 0)).toFixed(2)),
        reason: l.reason || "Vencimento de Produto",
        notes: l.notes || null,
        userName: l.user?.name || "Operador",
        createdAt: l.createdAt.toISOString(),
        dateFormatted: new Date(l.createdAt).toLocaleString("pt-BR"),
      })),
      summary,
    };
  } catch (err: any) {
    console.error("Erro em getExpirationsWorkspace:", err);
    return {
      success: false,
      error: err.message || "Erro ao carregar acompanhamento de validades.",
      batches: [],
      products: [],
      recentDisposals: [],
      summary: {
        expiredCount: 0,
        criticalCount: 0,
        attentionCount: 0,
        preventiveCount: 0,
        safeCount: 0,
        totalActiveCount: 0,
        totalCostAtRisk: 0,
        totalSaleAtRisk: 0,
      },
    };
  }
}

export async function registerExpirationBatch(input: {
  productId: string;
  batchNumber: string;
  expirationDate: string;
  quantity: number;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Sessão inválida ou empresa não identificada." };
    }

    const qty = Number(input.quantity);
    if (!input.productId || !input.expirationDate || !Number.isFinite(qty) || qty <= 0) {
      return { success: false, error: "Informe produto, data de validade e quantidade válida (> 0)." };
    }

    const product = await prisma.product.findFirst({
      where: { id: input.productId, companyId: session.companyId },
      select: { id: true, name: true },
    });

    if (!product) {
      return { success: false, error: "Produto não encontrado ou não pertence à sua empresa." };
    }

    const parsedDate = new Date(`${input.expirationDate.slice(0, 10)}T12:00:00`);
    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: "Data de validade inválida." };
    }

    const batch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber:
          input.batchNumber?.trim() || `L-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`,
        expirationDate: parsedDate,
        initialStock: qty,
        currentStock: qty,
      },
    });

    revalidatePath("/expirations");
    revalidatePath("/losses");
    revalidatePath("/reports");

    return { success: true, batchId: batch.id };
  } catch (err: any) {
    console.error("Erro em registerExpirationBatch:", err);
    return { success: false, error: err.message || "Erro ao cadastrar lote." };
  }
}

export async function applyExpirationDiscount(input: {
  productId: string;
  newPrice: number;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Sessão inválida ou empresa não identificada." };
    }

    const newPrice = Number(input.newPrice);
    if (!input.productId || !Number.isFinite(newPrice) || newPrice <= 0) {
      return { success: false, error: "Informe um preço promocional válido maior que zero." };
    }

    const product = await prisma.product.findFirst({
      where: { id: input.productId, companyId: session.companyId },
      select: { id: true, name: true },
    });

    if (!product) {
      return { success: false, error: "Produto não encontrado ou não pertence à sua empresa." };
    }

    await prisma.product.update({
      where: { id: product.id },
      data: {
        price: Number(newPrice.toFixed(2)),
        priceChangedAt: new Date(),
      },
    });

    revalidatePath("/expirations");
    revalidatePath("/losses");
    revalidatePath("/labels");
    revalidatePath("/stock");
    revalidatePath("/pdv");
    revalidatePath("/reports");

    return { success: true };
  } catch (err: any) {
    console.error("Erro em applyExpirationDiscount:", err);
    return { success: false, error: err.message || "Erro ao aplicar preço promocional." };
  }
}

export async function disposeExpiredBatch(input: {
  batchId?: string | null;
  productId: string;
  quantity: number;
  notes?: string;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Sessão inválida ou empresa não identificada." };
    }

    const companyId = session.companyId;
    const qty = Number(input.quantity);
    if (!input.productId || !Number.isFinite(qty) || qty <= 0) {
      return { success: false, error: "Informe o produto e uma quantidade válida (> 0) para baixa." };
    }

    const product = await prisma.product.findFirst({
      where: { id: input.productId, companyId },
      select: { id: true, name: true, cost: true, stock: true },
    });

    if (!product) {
      return { success: false, error: "Produto não encontrado ou não pertence à sua empresa." };
    }

    let validBatch: { id: string; batchNumber: string | null; currentStock: number } | null = null;
    if (input.batchId && !input.batchId.startsWith("prod-")) {
      const foundBatch = await prisma.productBatch.findFirst({
        where: {
          id: input.batchId,
          productId: product.id,
          product: { companyId },
        },
        select: { id: true, batchNumber: true, currentStock: true },
      });
      if (!foundBatch) {
        return { success: false, error: "Lote não encontrado ou não pertence à sua empresa." };
      }
      validBatch = foundBatch;
    }

    let validUserId = session.userId;
    if (validUserId) {
      const userExists = await prisma.user.findFirst({
        where: { id: validUserId, companyId },
        select: { id: true },
      });
      if (!userExists) {
        const fallbackUser = await prisma.user.findFirst({
          where: { companyId, active: true },
          select: { id: true },
        });
        validUserId = fallbackUser?.id || "";
      }
    } else {
      const fallbackUser = await prisma.user.findFirst({
        where: { companyId, active: true },
        select: { id: true },
      });
      validUserId = fallbackUser?.id || "";
    }

    if (!validUserId) {
      return { success: false, error: "Usuário responsável não identificado na empresa." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const dateStr = toSpDateKey(now).replace(/-/g, "");
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const countToday = await tx.loss.count({
        where: {
          companyId,
          createdAt: { gte: startOfDay },
        },
      });
      const receiptCode = `AV-${dateStr}-${String(countToday + 1).padStart(4, "0")}`;

      const unitCost = Number(product.cost ?? 0);
      const batchNote = validBatch?.batchNumber ? `Lote ${validBatch.batchNumber}` : "";
      const combinedNotes = [batchNote, input.notes?.trim()].filter(Boolean).join(" — ") || null;

      const createdLoss = await tx.loss.create({
        data: {
          productId: product.id,
          quantity: qty,
          lossType: "EXPIRED",
          reason: "Vencimento de Produto",
          receiptCode,
          unitCost,
          notes: combinedNotes,
          companyId,
          userId: validUserId,
        },
      });

      if (validBatch) {
        const nextBatchStock = Math.max(0, Number((Number(validBatch.currentStock) - qty).toFixed(4)));
        await tx.productBatch.update({
          where: { id: validBatch.id },
          data: { currentStock: nextBatchStock },
        });
      }

      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: { decrement: qty },
        },
      });

      return createdLoss;
    });

    revalidatePath("/expirations");
    revalidatePath("/losses");
    revalidatePath("/stock");
    revalidatePath("/reports");

    return {
      success: true,
      lossId: result.id,
      receiptCode: result.receiptCode,
    };
  } catch (err: any) {
    console.error("Erro em disposeExpiredBatch:", err);
    return { success: false, error: err.message || "Erro ao baixar lote vencido como avaria." };
  }
}
