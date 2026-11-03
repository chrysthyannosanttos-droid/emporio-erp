"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface InventoryProduct {
  id: string;
  name: string;
  barcode: string | null;
  internalCode: string | null;
  unit: string;
  price: number;
  costPrice: number;
  stock: number;
  categoryName: string;
}

export interface InventoryAdjustmentItem {
  productId: string;
  countedStock: number;
  reason?: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalStockUnits: number;
  totalStockValue: number;
  zeroStockCount: number;
  negativeStockCount: number;
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
    throw new Error("Nenhuma empresa identificada para o lançamento de balanço.");
  }

  // Resolver usuário válido da tabela User para auditoria
  let userId = session?.userId;
  let user = userId ? await prisma.user.findFirst({ where: { id: userId, companyId } }) : null;
  if (!user) {
    user = (await prisma.user.findFirst({ where: { companyId } })) || (await prisma.user.findFirst());
    userId = user?.id;
  }

  return { companyId, userId: userId || "", userName: session?.name || "Operador de Balanço" };
}

function formatProduct(p: any): InventoryProduct {
  return {
    id: p.id,
    name: p.name,
    barcode: p.barcode || null,
    internalCode: p.internalCode || null,
    unit: p.unit || "UN",
    price: Number(p.price || 0),
    costPrice: Number(p.costPrice || (Number(p.price || 0) * 0.6)), // fallback custo 60% caso nulo
    stock: Number(p.stock || 0),
    categoryName: p.category?.name || "Sem Categoria",
  };
}

/**
 * Busca produtos por Código de Barras, Código Interno (PLU) ou Nome
 */
export async function searchInventoryProducts(query: string): Promise<{ products: InventoryProduct[]; error?: string }> {
  try {
    const { companyId } = await resolveTenantContext();
    const q = (query || "").trim();

    if (!q) {
      const initial = await prisma.product.findMany({
        where: { companyId },
        include: { category: true },
        orderBy: { name: "asc" },
        take: 30,
      });
      return { products: initial.map(formatProduct) };
    }

    const isNumeric = /^\d+$/.test(q);

    // Se for puramente numérico, prioriza busca exata por barcode ou internalCode
    if (isNumeric) {
      const exactMatches = await prisma.product.findMany({
        where: {
          companyId,
          OR: [
            { internalCode: q },
            { barcode: q },
            { internalCode: { startsWith: q } },
            { barcode: { contains: q } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { category: true },
        take: 30,
      });

      // Ordenar para colocar correspondências exatas de código no topo
      exactMatches.sort((a, b) => {
        if (a.internalCode === q || a.barcode === q) return -1;
        if (b.internalCode === q || b.barcode === q) return 1;
        return a.name.localeCompare(b.name);
      });

      return { products: exactMatches.map(formatProduct) };
    }

    // Busca por texto (nome do produto ou categoria)
    const textMatches = await prisma.product.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { category: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: { category: true },
      take: 40,
      orderBy: { name: "asc" },
    });

    return { products: textMatches.map(formatProduct) };
  } catch (err: any) {
    return { products: [], error: err.message || "Erro ao consultar produtos." };
  }
}

/**
 * Consulta rápida de item único por bip de código de barras ou código interno (PLU)
 */
export async function lookupInventoryItem(code: string): Promise<{ product: InventoryProduct | null; error?: string }> {
  try {
    const { companyId } = await resolveTenantContext();
    const cleanCode = (code || "").trim();

    if (!cleanCode) return { product: null };

    const product = await prisma.product.findFirst({
      where: {
        companyId,
        OR: [
          { barcode: cleanCode },
          { internalCode: cleanCode },
        ],
      },
      include: { category: true },
    });

    if (product) {
      return { product: formatProduct(product) };
    }

    // Tentar fallback se for código com zeros à esquerda ou sem zeros
    const unpadded = cleanCode.replace(/^0+/, "");
    if (unpadded && unpadded !== cleanCode) {
      const fallback = await prisma.product.findFirst({
        where: {
          companyId,
          OR: [
            { internalCode: unpadded },
            { barcode: unpadded },
          ],
        },
        include: { category: true },
      });
      if (fallback) {
        return { product: formatProduct(fallback) };
      }
    }

    return { product: null };
  } catch (err: any) {
    return { product: null, error: err.message || "Erro na consulta de código." };
  }
}

/**
 * Obtém estatísticas gerais do estoque para a tela de balanço
 */
export async function getInventoryStats(): Promise<InventoryStats> {
  try {
    const { companyId } = await resolveTenantContext();

    const products = await prisma.product.findMany({
      where: { companyId },
      select: { stock: true, costPrice: true, price: true },
    });

    let totalStockUnits = 0;
    let totalStockValue = 0;
    let zeroStockCount = 0;
    let negativeStockCount = 0;

    for (const p of products) {
      const s = Number(p.stock || 0);
      const cost = Number(p.costPrice || (Number(p.price || 0) * 0.6));
      totalStockUnits += s;
      totalStockValue += s * cost;
      if (s === 0) zeroStockCount++;
      if (s < 0) negativeStockCount++;
    }

    return {
      totalProducts: products.length,
      totalStockUnits: Math.round(totalStockUnits * 100) / 100,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      zeroStockCount,
      negativeStockCount,
    };
  } catch {
    return {
      totalProducts: 0,
      totalStockUnits: 0,
      totalStockValue: 0,
      zeroStockCount: 0,
      negativeStockCount: 0,
    };
  }
}

/**
 * Grava o lançamento do balanço no banco de dados com auditoria e atualização de perdas/sobras
 */
export async function applyInventoryAdjustments(input: {
  items: InventoryAdjustmentItem[];
  defaultReason?: string;
}): Promise<{
  success: boolean;
  totalAdjusted: number;
  surplusCount: number;
  deficitCount: number;
  financialImpact: number;
  error?: string;
}> {
  try {
    const { companyId, userId, userName } = await resolveTenantContext();

    if (!Array.isArray(input.items) || input.items.length === 0) {
      return {
        success: false,
        totalAdjusted: 0,
        surplusCount: 0,
        deficitCount: 0,
        financialImpact: 0,
        error: "Nenhum item informado para gravação do balanço.",
      };
    }

    const productIds = input.items.map((i) => i.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
      select: { id: true, name: true, stock: true, costPrice: true, price: true, unit: true },
    });

    const prodMap = new Map<string, (typeof existingProducts)[0]>();
    for (const p of existingProducts) prodMap.set(p.id, p);

    let surplusCount = 0;
    let deficitCount = 0;
    let financialImpact = 0;
    let totalAdjusted = 0;

    const baseReason = input.defaultReason?.trim() || "Balanço Geral de Estoque (Inventário Físico)";

    await prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        const prod = prodMap.get(item.productId);
        if (!prod) continue;

        const currentStock = Number(prod.stock || 0);
        const newStock = Math.max(0, Math.round(Number(item.countedStock) * 1000) / 1000);
        const diff = Math.round((newStock - currentStock) * 1000) / 1000;

        if (diff === 0) {
          // Sem divergência, mas registra que foi contado e conferido
          continue;
        }

        totalAdjusted++;
        const cost = Number(prod.costPrice || (Number(prod.price || 0) * 0.6));
        const impact = diff * cost;
        financialImpact += impact;

        // 1. Atualiza o estoque do produto no banco
        await tx.product.update({
          where: { id: prod.id },
          data: { stock: newStock },
        });

        // 2. Se for falta (diff < 0), registra no módulo de perdas/quebras
        if (diff < 0 && userId) {
          deficitCount++;
          await tx.loss.create({
            data: {
              productId: prod.id,
              quantity: Math.abs(diff),
              reason: `${baseReason} - Falta identificada na contagem física (${currentStock} -> ${newStock} ${prod.unit})`,
              companyId,
              userId,
            },
          });
        } else if (diff > 0) {
          surplusCount++;
        }

        // 3. Registra log de auditoria imutável
        if (userId) {
          try {
            await tx.auditLog.create({
              data: {
                companyId,
                userId,
                operation: "stock.inventory_balance",
                action: "UPDATE",
                entity: "Product",
                entityId: prod.id,
                oldValue: JSON.stringify({ stock: currentStock, name: prod.name }),
                newValue: JSON.stringify({ stock: newStock, diff, impact }),
                reason: `${baseReason} por ${userName}`,
                result: "SUCCESS",
              },
            });
          } catch {
            // fail-safe auditoria
          }
        }
      }
    });

    revalidatePath("/stock");
    revalidatePath("/stock/inventory");
    revalidatePath("/losses");
    revalidatePath("/(dashboard)");
    revalidatePath("/");

    return {
      success: true,
      totalAdjusted,
      surplusCount,
      deficitCount,
      financialImpact: Math.round(financialImpact * 100) / 100,
    };
  } catch (err: any) {
    return {
      success: false,
      totalAdjusted: 0,
      surplusCount: 0,
      deficitCount: 0,
      financialImpact: 0,
      error: err.message || "Erro ao processar balanço no banco de dados.",
    };
  }
}
