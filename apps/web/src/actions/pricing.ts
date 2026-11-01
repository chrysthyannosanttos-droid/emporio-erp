"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { recordPriceChange } from "./labels";

export async function calculateSuggestedPrice(data: {
  productId: string;
  taxRate: number; // e.g. 0.18 for 18%
  overheadRate: number; // e.g. 0.15 for 15%
  desiredMargin: number; // e.g. 0.25 for 25% profit
}) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: data.productId }
    });

    if (!product) return { error: "Produto não encontrado" };

    const cost = Number(product.cost) || Number(product.price) * 0.6; // fallback cost

    // Formula: Price = Cost / (1 - (Taxes + Overhead + Profit))
    const totalDeductions = data.taxRate + data.overheadRate + data.desiredMargin;
    
    if (totalDeductions >= 1) {
      return { error: "A soma dos impostos, custos operacionais e margem desejada não pode ser igual ou maior que 100%." };
    }

    const suggestedPrice = cost / (1 - totalDeductions);
    const markupFactor = suggestedPrice / cost;

    return { 
      success: true, 
      cost,
      suggestedPrice: Number(suggestedPrice.toFixed(2)),
      markupFactor: Number(markupFactor.toFixed(2))
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao calcular preço" };
  }
}

export async function getAIPricingSuggestion(productName: string, cost: number) {
  try {
    // Simulating AI analysis of product name to find retail categories and recommended margins
    const nameLower = productName.toLowerCase();
    
    let category = "Geral";
    let taxRate = 0.12; // default
    let overheadRate = 0.15; // default operational cost
    let recommendedMargin = 0.20; // default profit margin
    let explanation = "Baseado em margens médias do varejo de conveniência.";

    if (nameLower.includes("pão") || nameLower.includes("bolo") || nameLower.includes("rosca") || nameLower.includes("pau")) {
      category = "Panificação / Fabricação Própria";
      taxRate = 0.08;
      overheadRate = 0.22; // higher due to labor/production
      recommendedMargin = 0.40; // higher margins in bakery
      explanation = "Panificações têm margem bruta alta (40-50%) para compensar as perdas e custos de mão de obra de fabricação.";
    } else if (nameLower.includes("cerveja") || nameLower.includes("coca") || nameLower.includes("suco") || nameLower.includes("refrigerante") || nameLower.includes("vinho")) {
      category = "Bebidas";
      taxRate = 0.25; // Higher tax due to ST (Substituição Tributária)
      overheadRate = 0.10;
      recommendedMargin = 0.15; // lower margin, high volume
      explanation = "Bebidas têm alto giro e impostos de substituição tributária elevados, operando com margem menor (15-20%).";
    } else if (nameLower.includes("queijo") || nameLower.includes("presunto") || nameLower.includes("manteiga") || nameLower.includes("leite")) {
      category = "Laticínios / Frios";
      taxRate = 0.18;
      overheadRate = 0.12;
      recommendedMargin = 0.22;
      explanation = "Frios requerem cadeia de frio, gerando custos de energia, mantendo margem média de 20-25%.";
    } else if (nameLower.includes("maça") || nameLower.includes("banana") || nameLower.includes("tomate") || nameLower.includes("batata")) {
      category = "Hortifruti";
      taxRate = 0.04; // low/exempt tax in some regions
      overheadRate = 0.18;
      recommendedMargin = 0.30;
      explanation = "Hortifruti possui alta quebra/perda por perecibilidade, demandando margem de segurança de ~30%.";
    }

    const totalDeductions = taxRate + overheadRate + recommendedMargin;
    const suggestedPrice = cost / (1 - totalDeductions);
    const markupFactor = suggestedPrice / cost;

    return {
      success: true,
      category,
      taxRate,
      overheadRate,
      recommendedMargin,
      suggestedPrice: Number(suggestedPrice.toFixed(2)),
      markupFactor: Number(markupFactor.toFixed(2)),
      explanation
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao obter sugestão de IA" };
  }
}

export async function applyNewPrice(productId: string, price: number) {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });
    if (!existing) return { error: "Produto não encontrado" };

    const oldPrice = Number(existing.price || 0);
    await prisma.product.update({
      where: { id: productId },
      data: { price, priceChangedAt: new Date() }
    });
    await recordPriceChange({
      productId,
      oldPrice,
      newPrice: Number(price),
      sectionName: existing.category?.name || "Sem Seção",
      companyId: existing.companyId,
    });
    revalidatePath("/stock");
    revalidatePath("/labels");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao aplicar novo preço" };
  }
}

export async function getPricingData() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        stockEntryItems: {
          orderBy: { stockEntry: { entryDate: 'desc' } },
          take: 1,
          include: { stockEntry: true }
        },
        variations: {
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const data = products.map(p => {
      let cost = Number(p.cost || 0);
      let lastInvoice: string | null = null;
      let lastInvoiceId: string | null = null;
      let lastEntryDate: string | null = null;
      let supplierId: string | null = null;
      let supplierName: string | null = null;

      if (p.stockEntryItems && p.stockEntryItems.length > 0) {
        const lastEntry = p.stockEntryItems[0];
        if (Number(lastEntry.unitCost) > 0) cost = Number(lastEntry.unitCost);
        lastInvoice = lastEntry.stockEntry?.invoiceNum || null;
        lastInvoiceId = lastEntry.stockEntry?.id || null;
        lastEntryDate = lastEntry.stockEntry?.entryDate?.toISOString() || null;
        supplierId = (lastEntry.stockEntry as any)?.supplierId || null;
        supplierName = (lastEntry.stockEntry as any)?.supplierName || null;
      }

      const price = Number(p.price || 0);
      let markup = cost > 0 ? ((price - cost) / cost) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        barcode: p.barcode || null,
        brand: (p as any).brand || null,
        category: p.category?.name || "Sem Seção",
        categoryId: p.categoryId,
        parentProductId: p.parentProductId || null,
        variationsCount: p.variations?.length || 0,
        price,
        cost,
        lastInvoice,
        lastInvoiceId,
        lastEntryDate,
        supplierId,
        supplierName,
        markup,
        priceChangedAt: p.priceChangedAt?.toISOString() || null,
      };
    });

    // Build unique invoice list for filter
    const invoiceMap = new Map<string, { id: string; num: string; date: string | null }>();
    data.forEach(p => {
      if (p.lastInvoiceId && p.lastInvoice) {
        invoiceMap.set(p.lastInvoiceId, {
          id: p.lastInvoiceId,
          num: p.lastInvoice,
          date: p.lastEntryDate
        });
      }
    });

    return {
      success: true,
      products: data,
      invoices: Array.from(invoiceMap.values()).sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
      )
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar dados de precificação", products: [], invoices: [] };
  }
}

export async function updatePricing(productId: string, newPrice: number) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true }
    });

    if (!product) return { error: "Produto não encontrado" };

    // Propagação em cadeia para produtos da mesma família (familiarização por sabor/fragrância)
    const familyId = product.parentProductId || product.id;
    const familyProducts = await prisma.product.findMany({
      where: {
        OR: [
          { id: familyId },
          { parentProductId: familyId }
        ]
      },
      include: { category: true }
    });

    await prisma.product.updateMany({
      where: {
        OR: [
          { id: familyId },
          { parentProductId: familyId }
        ]
      },
      data: { price: newPrice, priceChangedAt: new Date() }
    });

    for (const fp of familyProducts) {
      await recordPriceChange({
        productId: fp.id,
        oldPrice: Number(fp.price || 0),
        newPrice: Number(newPrice),
        sectionName: fp.category?.name || "Sem Seção",
        companyId: fp.companyId,
      });
    }

    revalidatePath("/pricing");
    revalidatePath("/labels");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar preço" };
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    return { categories };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar seções", categories: [] };
  }
}

export async function applyMarginToCategory(categoryId: string, marginPercent: number) {
  try {
    const products = await prisma.product.findMany({
      where: { categoryId },
      include: {
        stockEntryItems: {
          orderBy: { stockEntry: { entryDate: 'desc' } },
          take: 1
        }
      }
    });

    const updates = products.map(p => {
      let cost = Number(p.cost || 0);
      if (p.stockEntryItems && p.stockEntryItems.length > 0) {
        cost = Number(p.stockEntryItems[0].unitCost);
      }
      if (cost <= 0) cost = 1; // Fallback to avoid pricing at 0 if no cost available

      const newPrice = cost * (1 + (marginPercent / 100));

      return prisma.product.update({
        where: { id: p.id },
        data: { price: newPrice }
      });
    });

    await prisma.$transaction(updates);
    revalidatePath("/pricing");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao precificar em lote" };
  }
}

// Precifica todos os produtos de uma nota fiscal com a margem informada
export async function applyMarginToInvoice(stockEntryId: string, marginPercent: number) {
  try {
    const items = await prisma.stockEntryItem.findMany({
      where: { stockEntryId },
      include: { product: true }
    });

    const updates = items.map(item => {
      let cost = Number(item.unitCost);
      if (cost <= 0) cost = Number(item.product?.cost || 1);
      const newPrice = cost * (1 + marginPercent / 100);
      return prisma.product.update({
        where: { id: item.productId },
        data: { price: newPrice, priceChangedAt: new Date() }
      });
    });

    await prisma.$transaction(updates);
    revalidatePath("/pricing");
    return { success: true, count: updates.length };
  } catch (err: any) {
    return { error: err.message || "Erro ao precificar por nota" };
  }
}

// Precifica todos os produtos de uma família (produto pai + variações) com a mesma margem
export async function applyMarginToFamily(parentProductId: string, marginPercent: number) {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { id: parentProductId },
          { parentProductId }
        ]
      }
    });

    const updates = products.map(p => {
      const cost = Number(p.cost || 1);
      const newPrice = cost * (1 + marginPercent / 100);
      return prisma.product.update({
        where: { id: p.id },
        data: { price: newPrice, priceChangedAt: new Date() }
      });
    });

    await prisma.$transaction(updates);
    revalidatePath("/pricing");
    return { success: true, count: updates.length };
  } catch (err: any) {
    return { error: err.message || "Erro ao precificar família" };
  }
}
