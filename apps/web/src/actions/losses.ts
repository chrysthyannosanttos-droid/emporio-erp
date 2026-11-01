"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";

async function ensureCompanyAndUser() {
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Empório e Conveniência LTDA",
        document: "12.345.678/0001-99",
      },
    });
  }

  let user = await prisma.user.findFirst({ where: { companyId: company.id } });
  if (!user) {
    user = await prisma.user.findFirst();
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

  return { company, user };
}

export async function getLossesAndExpirationsData() {
  try {
    const { company } = await ensureCompanyAndUser();

    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });

    // Se ainda não houver nenhum lote cadastrado e existirem produtos, cria lotes iniciais reais no banco
    const existingBatchCount = await prisma.productBatch.count();
    if (existingBatchCount === 0 && products.length > 0) {
      const sampleProducts = products.slice(0, Math.min(4, products.length));
      const offsets = [4, 9, 14, 45];
      for (let idx = 0; idx < sampleProducts.length; idx++) {
        const p = sampleProducts[idx];
        const exp = new Date();
        exp.setDate(exp.getDate() + offsets[idx % offsets.length]);
        await prisma.productBatch.create({
          data: {
            productId: p.id,
            batchNumber: `L-${1020 + idx}`,
            expirationDate: exp,
            initialStock: Math.max(Number(p.stock) || 15, 10),
            currentStock: Math.max(Number(p.stock) || 15, 10),
          },
        });
      }
    }

    const [batches, prodLogs, losses] = await Promise.all([
      prisma.productBatch.findMany({
        include: { product: true },
        orderBy: { expirationDate: "asc" },
      }),
      prisma.productionLog.findMany({
        where: { expirationDate: { not: null } },
        include: {
          recipe: {
            include: { targetProduct: true },
          },
        },
        orderBy: { expirationDate: "asc" },
      }),
      prisma.loss.findMany({
        where: { companyId: company.id },
        include: { product: true, user: true },
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
        const prod = pl.recipe?.targetProduct;
        return {
          id: `prod-${pl.id}`,
          productId: prod?.id || "",
          product: prod?.name || pl.recipe?.name || "Produção Própria",
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

    const formattedLosses = losses.map((l) => ({
      id: l.id,
      productId: l.productId,
      product: l.product?.name || "Produto",
      unit: l.product?.unit || "UN",
      qty: Number(l.quantity || 0),
      unitCost: Number(l.product?.cost || 0),
      totalLossValue: Number(l.quantity || 0) * Number(l.product?.cost || l.product?.price || 0),
      reason: l.reason || "Avaria / Vencimento",
      userName: l.user?.name || "Operador",
      createdAt: l.createdAt.toISOString(),
      dateFormatted: new Date(l.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    return {
      success: true,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        stock: Number(p.stock || 0),
        unit: p.unit || "UN",
        price: Number(p.price || 0),
        cost: Number(p.cost || 0),
      })),
      expirations: allExpirations,
      losses: formattedLosses,
    };
  } catch (err: any) {
    console.error("Erro em getLossesAndExpirationsData:", err);
    return {
      success: false,
      error: err.message,
      products: [],
      expirations: [],
      losses: [],
    };
  }
}

export async function registerLossRecord(input: {
  productId: string;
  quantity: number;
  reason: string;
  nfe?: string;
}) {
  try {
    const { company, user } = await ensureCompanyAndUser();
    const qty = Number(input.quantity);
    if (!input.productId || qty <= 0) {
      return { success: false, error: "Selecione um produto e informe uma quantidade válida." };
    }

    const fullReason = input.nfe?.trim()
      ? `${input.reason} (NF/Origem: ${input.nfe.trim()})`
      : input.reason || "Avaria / Vencimento";

    await prisma.$transaction([
      prisma.loss.create({
        data: {
          productId: input.productId,
          quantity: qty,
          reason: fullReason,
          companyId: company.id,
          userId: user.id,
        },
      }),
      prisma.product.update({
        where: { id: input.productId },
        data: {
          stock: { decrement: qty },
        },
      }),
    ]);

    revalidatePath("/losses");
    revalidatePath("/expirations");
    revalidatePath("/stock");
    return { success: true };
  } catch (err: any) {
    console.error("Erro em registerLossRecord:", err);
    return { success: false, error: err.message };
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

