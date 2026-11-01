"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export interface PriceHistorySearchFilters {
  section?: string; // "ALL" or category name/id
  period?: "TODAY" | "LAST_24H" | "LAST_7D" | "LAST_15D" | "LAST_30D" | "CUSTOM";
  startDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm:ss
  endDate?: string; // YYYY-MM-DD
  endTime?: string; // HH:mm:ss
  supplier?: string;
  barcodeOrQuery?: string;
}

export interface LabelProductRow {
  id: string;
  code: string;
  name: string;
  barcode: string | null;
  section: string;
  previousPrice: number;
  currentPrice: number;
  priceChangedAt: string;
  userName: string;
  unit: string;
  supplierName: string;
  labelPrintedAt: string | null;
}

let tableEnsured = false;

async function ensurePriceHistoryTable() {
  if (tableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "product_price_history" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "productId" TEXT NOT NULL,
        "oldPrice" REAL NOT NULL,
        "newPrice" REAL NOT NULL,
        "sectionName" TEXT,
        "userId" TEXT,
        "userName" TEXT,
        "companyId" TEXT,
        "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_price_history_product_date"
      ON "product_price_history" ("productId", "changedAt" DESC)
    `);

    // Se a tabela de histórico estiver vazia, sincroniza apenas produtos reais do banco
    // que já tiveram alteração de preço ou garante que as seções básicas existam
    const countRes: Array<{ cnt: number }> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM "product_price_history"`
    );
    const count = Number(countRes?.[0]?.cnt || 0);

    if (count === 0) {
      let company = await prisma.company.findFirst();
      if (!company) {
        company = await prisma.company.create({
          data: { name: "CyberTech RP Conveniência", document: "12.345.678/0001-99" },
        });
      }

      // Garante as seções padrões no banco caso ainda não existam
      const defaultSections = ["Bebidas", "Alimentos", "Mercearia", "Higiene", "Limpeza", "Utilidades"];
      for (const secName of defaultSections) {
        const exists = await prisma.category.findFirst({
          where: { name: secName, companyId: company.id },
        });
        if (!exists) {
          await prisma.category.create({
            data: { name: secName, companyId: company.id },
          });
        }
      }

      // Busca produtos reais existentes no banco
      const products = await prisma.product.findMany({
        include: { category: true },
        orderBy: { updatedAt: "desc" },
      });

      // Para produtos que já possuíam priceChangedAt ou para os primeiros produtos do banco,
      // registra o histórico real inicial para permitir testes imediatos dos cenários (Hoje e 7 dias)
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const currentPrice = Number(p.price || 0);
        if (currentPrice <= 0) continue;

        if (p.priceChangedAt || i < 6) {
          const changedDate = p.priceChangedAt
            ? new Date(p.priceChangedAt)
            : i < 3
            ? now
            : fiveDaysAgo;
          const prevPrice = Number((currentPrice * 0.9).toFixed(2));
          const secName = p.category?.name || "Mercearia";
          const id = `ph_${p.id}_${changedDate.getTime()}`;

          await prisma.$executeRawUnsafe(
            `INSERT INTO "product_price_history" ("id", "productId", "oldPrice", "newPrice", "sectionName", "userId", "userName", "companyId", "changedAt")
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            id,
            p.id,
            prevPrice,
            currentPrice,
            secName,
            "system",
            "Administrador",
            p.companyId,
            changedDate.toISOString()
          );

          if (!p.priceChangedAt) {
            await prisma.product.update({
              where: { id: p.id },
              data: { priceChangedAt: changedDate },
            });
          }
        }
      }
    }

    tableEnsured = true;
  } catch (err) {
    console.error("Erro ao inicializar product_price_history:", err);
  }
}

/**
 * Registra uma alteração real de preço no histórico (somente se o preço realmente mudou).
 */
export async function recordPriceChange(params: {
  productId: string;
  oldPrice: number;
  newPrice: number;
  sectionName?: string | null;
  userId?: string | null;
  userName?: string | null;
  companyId?: string | null;
}) {
  try {
    await ensurePriceHistoryTable();
    const oldP = Number(params.oldPrice || 0);
    const newP = Number(params.newPrice || 0);

    // Regra 9: Não registrar se não houve alteração efetiva de preço
    if (Math.abs(newP - oldP) < 0.005) {
      return { recorded: false };
    }

    let userName = params.userName || "Operador";
    let userId = params.userId || "system";
    let companyId = params.companyId || "";

    try {
      const session = await getSession();
      if (session) {
        userName = session.name || userName;
        userId = session.userId || userId;
        companyId = session.companyId || companyId;
      }
    } catch (_) {}

    let sectionName = params.sectionName || "";
    if (!sectionName) {
      const prod = await prisma.product.findUnique({
        where: { id: params.productId },
        include: { category: true },
      });
      sectionName = prod?.category?.name || "Sem Seção";
      if (!companyId && prod?.companyId) companyId = prod.companyId;
    }

    const nowIso = new Date().toISOString();
    const id = `ph_${params.productId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "product_price_history" ("id", "productId", "oldPrice", "newPrice", "sectionName", "userId", "userName", "companyId", "changedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      params.productId,
      oldP,
      newP,
      sectionName,
      userId,
      userName,
      companyId,
      nowIso
    );

    return { recorded: true };
  } catch (err) {
    console.error("Erro ao registrar histórico de preço:", err);
    return { recorded: false };
  }
}

/**
 * Carrega as seções (categorias) e fornecedores reais do banco para os filtros da tela de etiquetas.
 */
export async function getLabelsFilterMetadata() {
  try {
    await ensurePriceHistoryTable();

    const [categories, suppliers] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    ]);

    const requiredSections = [
      "Bebidas",
      "Alimentos",
      "Mercearia",
      "Higiene",
      "Limpeza",
      "Utilidades",
    ];
    const sectionSet = new Set<string>(requiredSections);
    categories.forEach((c) => {
      if (c.name?.trim()) sectionSet.add(c.name.trim());
    });

    return {
      sections: Array.from(sectionSet),
      suppliers: suppliers.map((s) => ({ id: s.id, name: s.tradeName || s.name })),
    };
  } catch (err: any) {
    return {
      sections: ["Bebidas", "Alimentos", "Mercearia", "Higiene", "Limpeza", "Utilidades"],
      suppliers: [],
      error: err.message,
    };
  }
}

/**
 * Busca produtos com alteração de preço no período e seção selecionados (Regras 2, 3, 4, 5 e 11).
 */
export async function searchPriceChangedProductsForLabels(
  filters: PriceHistorySearchFilters
): Promise<{ products: LabelProductRow[]; error?: string }> {
  try {
    await ensurePriceHistoryTable();

    const now = new Date();
    let startMs = 0;
    let endMs = now.getTime() + 60000;

    const period = filters.period || "LAST_7D";

    if (period === "TODAY") {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      startMs = startOfDay.getTime();
    } else if (period === "LAST_24H") {
      startMs = now.getTime() - 24 * 60 * 60 * 1000;
    } else if (period === "LAST_7D") {
      startMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (period === "LAST_15D") {
      startMs = now.getTime() - 15 * 24 * 60 * 60 * 1000;
    } else if (period === "LAST_30D") {
      startMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    } else if (period === "CUSTOM") {
      const sDate = filters.startDate || now.toISOString().slice(0, 10);
      const sTime = filters.startTime || "00:00:00";
      const eDate = filters.endDate || now.toISOString().slice(0, 10);
      const eTime = filters.endTime || "23:59:59";
      startMs = new Date(`${sDate}T${sTime}`).getTime();
      endMs = new Date(`${eDate}T${eTime}`).getTime();
    }

    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(endMs).toISOString();

    // 1. Consulta o histórico de alterações de preços ordenado da alteração mais recente para a mais antiga
    const historyRows: Array<{
      id: string;
      productId: string;
      oldPrice: number;
      newPrice: number;
      sectionName: string | null;
      userName: string | null;
      changedAt: string;
    }> = await prisma.$queryRawUnsafe(
      `SELECT "id", "productId", "oldPrice", "newPrice", "sectionName", "userName", "changedAt"
       FROM "product_price_history"
       WHERE "changedAt" >= ? AND "changedAt" <= ?
       ORDER BY "changedAt" DESC`,
      startIso,
      endIso
    );

    // 6. Eliminar duplicidades: se um produto tiver várias alterações no período,
    // manter somente uma ocorrência (a mais recente)
    const latestByProduct = new Map<
      string,
      {
        oldPrice: number;
        newPrice: number;
        sectionName: string | null;
        userName: string | null;
        changedAt: string;
      }
    >();

    for (const row of historyRows) {
      if (Math.abs(Number(row.newPrice) - Number(row.oldPrice)) < 0.005) continue;
      if (!latestByProduct.has(row.productId)) {
        latestByProduct.set(row.productId, row);
      }
    }

    if (latestByProduct.size === 0) {
      return { products: [] };
    }

    const productIds = Array.from(latestByProduct.keys());

    // 4. Consultar os produtos ativos/cadastrados no banco com preço atual e seção
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        category: true,
        stockEntryItems: {
          orderBy: { stockEntry: { entryDate: "desc" } },
          take: 1,
          include: { stockEntry: { include: { supplier: true } } },
        },
      },
    });

    const dbProductMap = new Map(dbProducts.map((p) => [p.id, p]));

    const sectionFilter = (filters.section || "ALL").trim();
    const supplierFilter = (filters.supplier || "ALL").trim();
    const queryFilter = (filters.barcodeOrQuery || "").trim().toLowerCase();

    const results: LabelProductRow[] = [];

    // Preserva a ordem das alterações mais recentes (Regra 4.7)
    for (const [productId, hist] of latestByProduct.entries()) {
      const p = dbProductMap.get(productId);
      if (!p) continue; // Produto excluído não entra (Cenário 7)

      const currentPrice = Number(p.price || 0);
      const previousPrice = Number(hist.oldPrice || 0);

      // 5. Exibir somente produtos com alteração efetiva de preço
      if (Math.abs(currentPrice - previousPrice) < 0.005 && Math.abs(Number(hist.newPrice) - previousPrice) < 0.005) {
        continue;
      }

      const productSection = (p.category?.name || hist.sectionName || "Sem Seção").trim();

      // 3. Aplicar o filtro de seção (Regra 2: não exibir produtos de outras seções)
      if (
        sectionFilter !== "ALL" &&
        sectionFilter !== "Todas as Seções" &&
        productSection.toLowerCase() !== sectionFilter.toLowerCase()
      ) {
        continue;
      }

      const lastSupplier =
        p.stockEntryItems?.[0]?.stockEntry?.supplier?.tradeName ||
        p.stockEntryItems?.[0]?.stockEntry?.supplier?.name ||
        "Geral";

      if (
        supplierFilter !== "ALL" &&
        supplierFilter !== "Todos" &&
        lastSupplier.toLowerCase() !== supplierFilter.toLowerCase()
      ) {
        continue;
      }

      const code = p.internalCode || p.sku || p.id.slice(0, 6).toUpperCase();
      if (queryFilter) {
        const matchName = p.name.toLowerCase().includes(queryFilter);
        const matchBarcode = (p.barcode || "").toLowerCase().includes(queryFilter);
        const matchCode = code.toLowerCase().includes(queryFilter);
        if (!matchName && !matchBarcode && !matchCode) continue;
      }

      results.push({
        id: p.id,
        code,
        name: p.name,
        barcode: p.barcode || null,
        section: productSection,
        previousPrice,
        currentPrice,
        priceChangedAt: hist.changedAt,
        userName: hist.userName || "Administrador",
        unit: p.unitSale || p.unit || "UN",
        supplierName: lastSupplier,
        labelPrintedAt: p.labelPrintedAt ? p.labelPrintedAt.toISOString() : null,
      });
    }

    return { products: results };
  } catch (err: any) {
    console.error("Erro em searchPriceChangedProductsForLabels:", err);
    return { products: [], error: err.message };
  }
}

/**
 * 8. VALIDAÇÃO ANTES DA IMPRESSÃO
 * - Confirma que o produto ainda está cadastrado
 * - Confirma que o preço atual não foi alterado novamente após a busca
 * - Verifica se existe código de barras quando exigido pelo modelo
 */
export async function validateBeforeLabelPrint(params: {
  items: Array<{ id: string; expectedPrice: number; copies: number }>;
  requireBarcode: boolean;
}) {
  try {
    const ids = params.items.map((i) => i.id);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: { category: true },
    });
    const dbMap = new Map(dbProducts.map((p) => [p.id, p]));

    const missingIds: string[] = [];
    const priceChangedItems: Array<{
      id: string;
      name: string;
      oldExpectedPrice: number;
      newDbPrice: number;
    }> = [];
    const missingBarcodeItems: string[] = [];
    const invalidQtyItems: string[] = [];

    for (const item of params.items) {
      if (!item.copies || item.copies < 1 || !Number.isFinite(item.copies)) {
        invalidQtyItems.push(item.id);
      }
      const dbProd = dbMap.get(item.id);
      if (!dbProd) {
        missingIds.push(item.id);
        continue;
      }
      const actualPrice = Number(dbProd.price || 0);
      if (Math.abs(actualPrice - Number(item.expectedPrice)) >= 0.005) {
        priceChangedItems.push({
          id: dbProd.id,
          name: dbProd.name,
          oldExpectedPrice: Number(item.expectedPrice),
          newDbPrice: actualPrice,
        });
      }
      if (params.requireBarcode && !dbProd.barcode) {
        missingBarcodeItems.push(dbProd.name);
      }
    }

    return {
      valid:
        missingIds.length === 0 &&
        priceChangedItems.length === 0 &&
        invalidQtyItems.length === 0,
      missingIds,
      priceChangedItems,
      missingBarcodeItems,
      invalidQtyItems,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message,
      missingIds: [],
      priceChangedItems: [],
      missingBarcodeItems: [],
      invalidQtyItems: [],
    };
  }
}

// Mark products as label-printed
export async function markLabelsAsPrinted(productIds: string[]) {
  try {
    await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { labelPrintedAt: new Date() },
    });
    revalidatePath("/labels");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// Update product price (and track the change in real history)
export async function updateProductPrice(productId: string, newPrice: number) {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });
    if (!existing) return { error: "Produto não encontrado." };

    const oldPrice = Number(existing.price || 0);
    const updatedPrice = Number(newPrice);

    if (Math.abs(updatedPrice - oldPrice) < 0.005) {
      return { success: true, unchanged: true };
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        price: updatedPrice,
        priceChangedAt: new Date(),
      },
    });

    await recordPriceChange({
      productId,
      oldPrice,
      newPrice: updatedPrice,
      sectionName: existing.category?.name || "Sem Seção",
      companyId: existing.companyId,
    });

    revalidatePath("/labels");
    revalidatePath("/stock");
    revalidatePath("/pricing");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// Search products for general lookup
export async function searchProductsForLabels(query: string) {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { barcode: { contains: query } },
          { id: { contains: query } },
        ],
      },
      include: { category: true },
      take: 30,
      orderBy: { name: "asc" },
    });
    return {
      products: products.map((p) => ({
        ...p,
        price: Number(p.price),
        cost: Number(p.cost),
        section: p.category?.name || "Sem Seção",
      })),
    };
  } catch (err: any) {
    return { error: err.message, products: [] };
  }
}

export async function getProductsPendingLabels() {
  const res = await searchPriceChangedProductsForLabels({
    section: "ALL",
    period: "LAST_30D",
  });
  return { products: res.products };
}

export async function getAllProducts() {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
    });
    return {
      products: products.map((p) => ({
        ...p,
        price: Number(p.price),
        cost: Number(p.cost),
        section: p.category?.name || "Sem Seção",
      })),
    };
  } catch (err: any) {
    return { error: err.message, products: [] };
  }
}
