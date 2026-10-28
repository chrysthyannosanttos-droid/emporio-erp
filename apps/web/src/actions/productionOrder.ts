"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getProductionOrders() {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado", orders: [], recipes: [] };

    const [orders, recipes] = await Promise.all([
      prisma.productionOrder.findMany({
        where: { companyId: session.companyId },
        include: {
          recipe: {
            include: { product: { select: { name: true, unit: true } } },
          },
          user: { select: { name: true } },
          consumptions: {
            include: { product: { select: { name: true, unit: true } } },
          },
          qualityChecks: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.recipe.findMany({
        where: { companyId: session.companyId },
        include: {
          product: { select: { id: true, name: true, unit: true } },
          items: { include: { product: { select: { id: true, name: true, cost: true, unit: true } } } },
        },
      }),
    ]);

    return { orders, recipes };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar ordens de produção", orders: [], recipes: [] };
  }
}

export async function createProductionOrder(data: {
  recipeId: string;
  plannedQty: number;
  plannedStart?: string;
  plannedEnd?: string;
  batchNumber?: string;
  expirationDate?: string;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId || !session?.userId) {
      return { error: "Sessão inválida" };
    }

    // Gerar código único para a OP (ex: OP-2026-0001)
    const count = await prisma.productionOrder.count({ where: { companyId: session.companyId } });
    const year = new Date().getFullYear();
    const opNumber = `OP-${year}-${String(count + 1).padStart(4, "0")}`;

    const order = await prisma.productionOrder.create({
      data: {
        number: opNumber,
        recipeId: data.recipeId,
        plannedQty: data.plannedQty,
        plannedStart: data.plannedStart ? new Date(data.plannedStart) : null,
        plannedEnd: data.plannedEnd ? new Date(data.plannedEnd) : null,
        batchNumber: data.batchNumber || `LOTE-${opNumber}`,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        status: "PLANNED",
        companyId: session.companyId,
        userId: session.userId,
      },
    });

    revalidatePath("/factory/production-orders");
    revalidatePath("/production");
    return { success: true, order };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar Ordem de Produção" };
  }
}

export async function finishProductionOrder(data: {
  orderId: string;
  producedQty: number;
  rejectedQty?: number;
  lossQty?: number;
  actualLaborCost?: number;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado" };

    const op = await prisma.productionOrder.findUnique({
      where: { id: data.orderId, companyId: session.companyId },
      include: {
        recipe: {
          include: {
            items: { include: { product: true } },
          },
        },
      },
    });

    if (!op || !op.recipe) return { error: "Ordem de produção não encontrada" };

    const producedQty = data.producedQty;
    const recipeYield = op.recipe.yield || 1;
    const factor = producedQty / recipeYield;

    let totalMaterialCost = 0;
    const consumptionData = [];

    // 1. Baixar insumos/matérias-primas proporcionalmente à produção real
    for (const item of op.recipe.items) {
      const actualQtyUsed = item.quantity * factor;
      const itemCost = Number(item.product.cost || 0);
      totalMaterialCost += actualQtyUsed * itemCost;

      consumptionData.push({
        productionOrderId: op.id,
        productId: item.productId,
        plannedQty: item.quantity * (op.plannedQty / recipeYield),
        actualQty: actualQtyUsed,
        unitCost: itemCost,
        batchNumber: op.batchNumber || null,
      });

      // Baixar estoque do insumo
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: actualQtyUsed },
        },
      });
    }

    // 2. Registrar consumos reais na OP
    await prisma.productionConsumption.createMany({
      data: consumptionData,
    });

    // 3. Aumentar estoque do produto acabado produzido e atualizar seu custo
    const unitCostTotal = producedQty > 0 ? (totalMaterialCost + (data.actualLaborCost || 0)) / producedQty : 0;

    await prisma.product.update({
      where: { id: op.recipe.productId },
      data: {
        stock: { increment: producedQty },
        cost: unitCostTotal,
      },
    });

    // 4. Se a validade for informada, registrar no ProductBatch
    if (op.expirationDate && op.batchNumber) {
      await prisma.productBatch.create({
        data: {
          productId: op.recipe.productId,
          batchNumber: op.batchNumber,
          expirationDate: op.expirationDate,
          initialStock: producedQty,
          currentStock: producedQty,
        },
      });
    }

    // 5. Atualizar status da OP para FINISHED
    await prisma.productionOrder.update({
      where: { id: op.id },
      data: {
        status: "FINISHED",
        producedQty,
        rejectedQty: data.rejectedQty || 0,
        lossQty: data.lossQty || 0,
        actualEnd: new Date(),
        unitCostMaterial: producedQty > 0 ? totalMaterialCost / producedQty : 0,
        unitCostLabor: data.actualLaborCost ? data.actualLaborCost / producedQty : 0,
        unitCostTotal,
      },
    });

    revalidatePath("/factory/production-orders");
    revalidatePath("/production");
    revalidatePath("/stock");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao finalizar Ordem de Produção" };
  }
}
