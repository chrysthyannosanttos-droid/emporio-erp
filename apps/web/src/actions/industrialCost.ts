"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";

export async function calculateIndustrialCost(data: {
  recipeId: string;
  laborCostPerBatch?: number;
  overheadRate?: number; // e.g. 0.10 for 10%
  expectedLossRate?: number; // e.g. 0.05 for 5%
  desiredMargin?: number; // e.g. 0.30 for 30%
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado" };

    const recipe = await prisma.recipe.findUnique({
      where: { id: data.recipeId },
      include: {
        product: true,
        items: { include: { product: true } },
      },
    });

    if (!recipe) return { error: "Ficha técnica não encontrada" };

    const yieldQty = recipe.yield || 1;
    let materialTotal = 0;

    const itemsDetail = recipe.items.map((item) => {
      const unitCost = Number(item.product.cost || 0);
      const itemTotal = item.quantity * unitCost;
      materialTotal += itemTotal;

      return {
        productName: item.product.name,
        quantity: item.quantity,
        unit: item.unit,
        unitCost,
        itemTotal,
      };
    });

    const laborCost = data.laborCostPerBatch || Number((recipe as any).laborCostPerUnit || 0) * yieldQty;
    const overheadCost = materialTotal * (data.overheadRate || 0.10);
    const lossCost = (materialTotal + laborCost + overheadCost) * (data.expectedLossRate || 0.03);

    const batchTotalCost = materialTotal + laborCost + overheadCost + lossCost;
    const unitCostTotal = batchTotalCost / yieldQty;

    const margin = data.desiredMargin || 0.35;
    const suggestedPrice = unitCostTotal / (1 - margin);
    const markupFactor = unitCostTotal > 0 ? suggestedPrice / unitCostTotal : 1;

    return {
      success: true,
      productName: recipe.product.name,
      yieldQty,
      itemsDetail,
      materialTotal,
      laborCost,
      overheadCost,
      lossCost,
      batchTotalCost,
      unitCostTotal,
      suggestedPrice,
      markupFactor,
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao calcular custo industrial" };
  }
}
