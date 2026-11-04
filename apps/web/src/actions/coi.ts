"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface CoiDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: "IN" | "OUT";
  stockMovement: "ADD" | "SUBTRACT" | "NONE";
  financialImpact: "PAYABLE" | "RECEIVABLE" | "EXPENSE" | "NONE";
  defaultCfop: string | null;
  costCenter: string | null;
  requiresApproval: boolean;
  active: boolean;
  isSystemStandard: boolean;
  movementsCount: number;
}

export interface CoiStats {
  total: number;
  inCount: number;
  outCount: number;
  stockAffectingCount: number;
  financialAffectingCount: number;
}

async function resolveTenantContext() {
  const session = await getSession();
  let companyId = session?.companyId;

  if (!companyId) {
    const agrobelem = await prisma.company.findFirst({
      where: { document: "65.522.409/0001-13" },
    });
    companyId = agrobelem?.id || (await prisma.company.findFirst())?.id;
  }

  if (!companyId) {
    throw new Error("Nenhuma empresa identificada.");
  }

  let userId = session?.userId;
  if (!userId) {
    const user = (await prisma.user.findFirst({ where: { companyId } })) || (await prisma.user.findFirst());
    userId = user?.id || "";
  }

  return { companyId, userId, userName: session?.name || "Operador de Estoque" };
}

/**
 * Consulta a lista completa de COIs da empresa
 */
export async function getCois(typeFilter?: "ALL" | "IN" | "OUT"): Promise<{ cois: CoiDTO[]; error?: string }> {
  try {
    const { companyId } = await resolveTenantContext();

    const where: any = { companyId };
    if (typeFilter && typeFilter !== "ALL") {
      where.type = typeFilter;
    }

    const cois = await (prisma as any).coi.findMany({
      where,
      include: {
        _count: {
          select: { movements: true },
        },
      },
      orderBy: { code: "asc" },
    });

    return {
      cois: cois.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description || null,
        type: c.type,
        stockMovement: c.stockMovement,
        financialImpact: c.financialImpact,
        defaultCfop: c.defaultCfop || null,
        costCenter: c.costCenter || null,
        requiresApproval: Boolean(c.requiresApproval),
        active: Boolean(c.active),
        isSystemStandard: Boolean(c.isSystemStandard),
        movementsCount: c._count?.movements || 0,
      })),
    };
  } catch (err: any) {
    return { cois: [], error: err.message || "Erro ao consultar COIs." };
  }
}

/**
 * Estatísticas gerais de COIs
 */
export async function getCoiStats(): Promise<CoiStats> {
  try {
    const { companyId } = await resolveTenantContext();

    const cois = await (prisma as any).coi.findMany({
      where: { companyId },
      select: { type: true, stockMovement: true, financialImpact: true },
    });

    let inCount = 0;
    let outCount = 0;
    let stockAffectingCount = 0;
    let financialAffectingCount = 0;

    for (const c of cois) {
      if (c.type === "IN") inCount++;
      if (c.type === "OUT") outCount++;
      if (c.stockMovement !== "NONE") stockAffectingCount++;
      if (c.financialImpact !== "NONE") financialAffectingCount++;
    }

    return {
      total: cois.length,
      inCount,
      outCount,
      stockAffectingCount,
      financialAffectingCount,
    };
  } catch {
    return {
      total: 0,
      inCount: 0,
      outCount: 0,
      stockAffectingCount: 0,
      financialAffectingCount: 0,
    };
  }
}

/**
 * Criação de um novo COI customizado
 */
export async function createCoi(data: {
  code: string;
  name: string;
  description?: string;
  type: "IN" | "OUT";
  stockMovement: "ADD" | "SUBTRACT" | "NONE";
  financialImpact: "PAYABLE" | "RECEIVABLE" | "EXPENSE" | "NONE";
  defaultCfop?: string;
  costCenter?: string;
  requiresApproval?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { companyId } = await resolveTenantContext();
    const cleanCode = data.code.trim();

    const existing = await (prisma as any).coi.findFirst({
      where: { companyId, code: cleanCode },
    });

    if (existing) {
      return { success: false, error: `Já existe um COI com o código ${cleanCode}.` };
    }

    await (prisma as any).coi.create({
      data: {
        companyId,
        code: cleanCode,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        type: data.type,
        stockMovement: data.stockMovement,
        financialImpact: data.financialImpact,
        defaultCfop: data.defaultCfop?.trim() || null,
        costCenter: data.costCenter?.trim() || null,
        requiresApproval: Boolean(data.requiresApproval),
        active: true,
        isSystemStandard: false,
      },
    });

    revalidatePath("/coi");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao criar COI." };
  }
}

/**
 * Atualização de COI existente
 */
export async function updateCoi(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    defaultCfop: string;
    costCenter: string;
    requiresApproval: boolean;
    active: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { companyId } = await resolveTenantContext();

    await (prisma as any).coi.update({
      where: { id, companyId },
      data,
    });

    revalidatePath("/coi");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao atualizar COI." };
  }
}

/**
 * Executa uma movimentação de estoque avulsa baseada em um COI
 * Ex: Lançar consumo interno (COI 104) ou quebra (COI 103) ou sobra (COI 004)
 */
export async function executeStockMovementByCoi(input: {
  coiId: string;
  productId: string;
  quantity: number;
  notes?: string;
}): Promise<{ success: boolean; newStock?: number; message?: string; error?: string }> {
  try {
    const { companyId, userId, userName } = await resolveTenantContext();

    const coi = await (prisma as any).coi.findFirst({
      where: { id: input.coiId, companyId },
    });

    if (!coi) {
      return { success: false, error: "COI não encontrado." };
    }

    const product = await prisma.product.findFirst({
      where: { id: input.productId, companyId },
    });

    if (!product) {
      return { success: false, error: "Produto não encontrado." };
    }

    const qty = Math.max(0.001, Math.round(Number(input.quantity) * 1000) / 1000);
    const unitCost = Number(product.cost || (Number(product.price || 0) * 0.6));
    const totalCost = Math.round(qty * unitCost * 100) / 100;

    let currentStock = Number(product.stock || 0);
    let newStock = currentStock;

    if (coi.stockMovement === "ADD") {
      newStock = Math.round((currentStock + qty) * 1000) / 1000;
    } else if (coi.stockMovement === "SUBTRACT") {
      newStock = Math.max(0, Math.round((currentStock - qty) * 1000) / 1000);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Atualiza estoque se aplicável
      if (coi.stockMovement !== "NONE") {
        await tx.product.update({
          where: { id: product.id },
          data: { stock: newStock },
        });
      }

      // 2. Registra log de movimento COI
      await (tx as any).coiMovement.create({
        data: {
          companyId,
          coiId: coi.id,
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitCost,
          totalCost,
          notes: input.notes?.trim() || `Movimento via COI ${coi.code} - ${coi.name}`,
          operatorName: userName,
        },
      });

      // 3. Se for despesa/perda (ex: quebra 103 ou ajuste 106), registra na tabela de Loss para o DRE
      if (coi.financialImpact === "EXPENSE" && userId) {
        await tx.loss.create({
          data: {
            companyId,
            productId: product.id,
            quantity: qty,
            reason: `[COI ${coi.code}] ${coi.name} - ${input.notes || "Lançamento operacional"}`,
            userId,
          },
        });
      }
    });

    revalidatePath("/coi");
    revalidatePath("/stock");

    return {
      success: true,
      newStock,
      message: `Movimento executado com sucesso pelo COI ${coi.code} (${coi.name})! Estoque atualizado para ${newStock} ${product.unit}.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao executar movimentação." };
  }
}

/**
 * Consulta histórico recente de movimentações por COI
 */
export async function getRecentCoiMovements(limit = 15) {
  try {
    const { companyId } = await resolveTenantContext();

    const movements = await (prisma as any).coiMovement.findMany({
      where: { companyId },
      include: {
        coi: { select: { code: true, name: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return {
      movements: movements.map((m: any) => ({
        id: m.id,
        coiCode: m.coi.code,
        coiName: m.coi.name,
        coiType: m.coi.type,
        productName: m.productName,
        quantity: m.quantity,
        totalCost: Number(m.totalCost || 0),
        notes: m.notes,
        operatorName: m.operatorName,
        createdAt: new Date(m.createdAt).toLocaleString("pt-BR"),
      })),
    };
  } catch {
    return { movements: [] };
  }
}

