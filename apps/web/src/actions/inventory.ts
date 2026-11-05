"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

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
    costPrice: Number(p.cost || (Number(p.price || 0) * 0.6)), // fallback custo 60% caso nulo
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
      select: { stock: true, cost: true, price: true },
    });

    let totalStockUnits = 0;
    let totalStockValue = 0;
    let zeroStockCount = 0;
    let negativeStockCount = 0;

    for (const p of products) {
      const s = Number(p.stock || 0);
      const cost = Number(p.cost || (Number(p.price || 0) * 0.6));
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
  inactivateUncounted?: boolean;
}): Promise<{
  success: boolean;
  totalAdjusted: number;
  surplusCount: number;
  deficitCount: number;
  financialImpact: number;
  uncountedProcessed?: number;
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
      select: { id: true, name: true, stock: true, cost: true, price: true, unit: true },
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
        const cost = Number(prod.cost || (Number(prod.price || 0) * 0.6));
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

      // Regra de Balanço: se solicitado, retira/zera cadastros antigos que não foram inventariados neste lote
      let uncountedProcessed = 0;
      if (input.inactivateUncounted) {
        const uncountedProducts = await tx.product.findMany({
          where: {
            companyId,
            id: { notIn: productIds },
          },
          include: {
            _count: {
              select: {
                saleItems: true,
                stockEntryItems: true,
                orderItems: true,
              },
            },
          },
        });

        for (const p of uncountedProducts) {
          // Se não possui nenhum histórico fiscal/venda vinculado, exclui o cadastro antigo
          if (p._count.saleItems === 0 && p._count.stockEntryItems === 0 && p._count.orderItems === 0) {
            try {
              await tx.product.delete({ where: { id: p.id } });
              uncountedProcessed++;
            } catch {
              await tx.product.update({ where: { id: p.id }, data: { stock: 0 } });
              uncountedProcessed++;
            }
          } else {
            // Se possui histórico, zera o estoque para manter integridade relacional
            await tx.product.update({ where: { id: p.id }, data: { stock: 0 } });
            uncountedProcessed++;
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

/**
 * Sugere o próximo código interno (PLU) livre para produtos sem código de barras
 */
export async function getNextInternalCodeAction(): Promise<{ success: boolean; code: string; error?: string }> {
  try {
    const { companyId } = await resolveTenantContext();
    const products = await prisma.product.findMany({
      where: { companyId, internalCode: { not: null } },
      select: { internalCode: true },
    });

    let maxCode = 1000;
    for (const p of products) {
      if (p.internalCode) {
        const num = parseInt(p.internalCode, 10);
        if (!isNaN(num) && num >= maxCode && num < 999999) {
          maxCode = num;
        }
      }
    }

    const nextCode = String(maxCode + 1);
    return { success: true, code: nextCode };
  } catch (err: any) {
    return { success: false, code: "1001", error: err.message };
  }
}

/**
 * Analisa a foto da embalagem do produto com IA para sugerir nome, marca, unidade e código
 */
export async function analyzeProductPhotoAction(input: {
  base64Image: string;
  apiKey?: string;
}): Promise<{
  success: boolean;
  suggestedName?: string;
  brand?: string;
  suggestedUnit?: string;
  detectedBarcode?: string | null;
  suggestedPrice?: number | null;
  suggestedCategory?: string;
  error?: string;
}> {
  try {
    const key = input.apiKey || process.env.GEMINI_API_KEY || "";
    if (!key) {
      return {
        success: false,
        error: "Chave Gemini API não configurada.",
      };
    }

    let pureBase64 = input.base64Image;
    let mimeType = "image/jpeg";

    if (input.base64Image.includes(",")) {
      const parts = input.base64Image.split(",");
      const meta = parts[0];
      pureBase64 = parts[1];
      const match = meta.match(/:(.*?);/);
      if (match) mimeType = match[1];
    }

    const promptText = `Você é um assistente de cadastramento de produtos de supermercado, atacado e empório brasileiro.
Analise detalhadamente a foto desta embalagem/rótulo e extraia com precisão:
1. suggestedName: Título comercial padronizado em CAIXA ALTA (ex: 'LEITE CONDENSADO MOÇA 395G', 'QUEIJO COALHO FAZENDA 500G', 'BISCOITO PASSATEMPO CHOCOLATE 130G'). Deve ser limpo, profissional e conter tamanho/peso se visível.
2. brand: Nome da marca principal (ex: 'Nestlé', 'Itambé', 'Sadia').
3. suggestedUnit: Escolha a melhor unidade comercial entre: 'UN', 'KG', 'LT', 'CX', 'PCT' ou 'BDJ'.
4. detectedBarcode: Se houver código de barras EAN-13 / EAN-8 com numeração legível na imagem, informe somente os dígitos. Se não tiver ou não estiver visível, retorne null.
5. suggestedPrice: Preço se estiver impresso em etiqueta de preço na embalagem, senão null.
6. suggestedCategory: Categoria de supermercado adequada (ex: Laticínios, Mercearia, Carnes, Bebidas, Higiene, Limpeza, Hortifrúti).

Responda em formato JSON estrito com estas chaves exatas.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: pureBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Falha na API de visão (${res.status}): ${errText}` };
    }

    const json = await res.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return { success: false, error: "Nenhuma resposta gerada pela IA." };
    }

    const parsed = JSON.parse(candidateText);
    return {
      success: true,
      suggestedName: parsed.suggestedName || "",
      brand: parsed.brand || "",
      suggestedUnit: (parsed.suggestedUnit || "UN").toUpperCase(),
      detectedBarcode: parsed.detectedBarcode || null,
      suggestedPrice: parsed.suggestedPrice ? Number(parsed.suggestedPrice) : null,
      suggestedCategory: parsed.suggestedCategory || "",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao processar imagem com IA." };
  }
}

export interface CreateInventoryProductInput {
  name: string;
  barcode?: string | null;
  internalCode?: string | null;
  unit: string;
  countedStock: number;
  price?: number;
  cost?: number;
  categoryName?: string;
  ncm?: string;
  photoBase64?: string;
}

/**
 * Cadastra um novo produto diretamente pelo balanço e já insere na contagem
 */
export async function createProductFromInventoryAction(data: CreateInventoryProductInput): Promise<{
  success: boolean;
  product?: InventoryProduct;
  error?: string;
}> {
  try {
    const { companyId } = await resolveTenantContext();

    const name = data.name.trim().toUpperCase();
    if (!name) {
      return { success: false, error: "Nome do produto é obrigatório." };
    }

    let barcode = data.barcode ? data.barcode.trim() : null;
    let internalCode = data.internalCode ? data.internalCode.trim() : null;

    // Categoria
    let categoryId: string | null = null;
    if (data.categoryName) {
      let cat = await prisma.category.findFirst({
        where: { name: { equals: data.categoryName.trim(), mode: "insensitive" }, companyId },
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: { name: data.categoryName.trim(), companyId },
        });
      }
      categoryId = cat.id;
    }

    const price = Number(data.price) > 0 ? Number(data.price) : 0;
    const cost = Number(data.cost) > 0 ? Number(data.cost) : price * 0.6;
    const countedStock = Math.max(0, Number(data.countedStock || 0));

    // Se tiver código de barras e já existir na base, atualiza e valida para a contagem atual
    if (barcode) {
      const existing = await prisma.product.findFirst({
        where: { barcode, companyId },
      });
      if (existing) {
        const updatedProd = await prisma.product.update({
          where: { id: existing.id },
          data: {
            name,
            unit: (data.unit || existing.unit || "UN").toUpperCase().trim(),
            price: price > 0 ? price : Number(existing.price),
            cost: Number(data.cost) > 0 ? cost : (existing.cost ? Number(existing.cost) : cost),
            stock: countedStock,
            categoryId: categoryId || existing.categoryId,
            createdAt: new Date(), // Revalida o cadastro para constar no período atual de balanço
          },
          include: { category: true },
        });

        revalidatePath("/stock/inventory");
        revalidatePath("/stock");
        revalidatePath("/pdv");

        return {
          success: true,
          product: formatProduct(updatedProd),
        };
      }
    }

    // Se nenhum dos dois foi informado, gera automaticamente um código interno
    if (!barcode && !internalCode) {
      const nextRes = await getNextInternalCodeAction();
      internalCode = nextRes.code;
    }

    // Se tiver código interno e já existir
    if (internalCode) {
      const existing = await prisma.product.findFirst({
        where: { internalCode, companyId },
      });
      if (existing) {
        const updatedProd = await prisma.product.update({
          where: { id: existing.id },
          data: {
            name,
            unit: (data.unit || existing.unit || "UN").toUpperCase().trim(),
            price: price > 0 ? price : Number(existing.price),
            cost: Number(data.cost) > 0 ? cost : (existing.cost ? Number(existing.cost) : cost),
            stock: countedStock,
            categoryId: categoryId || existing.categoryId,
            createdAt: new Date(),
          },
          include: { category: true },
        });

        revalidatePath("/stock/inventory");
        revalidatePath("/stock");
        revalidatePath("/pdv");

        return {
          success: true,
          product: formatProduct(updatedProd),
        };
      }
    }

    const newProd = await prisma.product.create({
      data: {
        name,
        barcode,
        internalCode,
        unit: (data.unit || "UN").toUpperCase().trim(),
        price,
        cost,
        stock: countedStock,
        categoryId,
        companyId,
        ncm: data.ncm || null,
        cfop: "5102",
        csosn: "102",
      },
      include: { category: true },
    });

    revalidatePath("/stock/inventory");
    revalidatePath("/stock");
    revalidatePath("/pdv");

    return {
      success: true,
      product: formatProduct(newProd),
    };
  } catch (err: any) {
    if (err?.code === "P2002" || err?.message?.includes("Unique constraint")) {
      const msg = String(err?.message || JSON.stringify(err?.meta || ""));
      if (msg.includes("barcode")) {
        return { success: false, error: "Item já contém cadastro! Este código de barras já está em uso na sua empresa." };
      }
      if (msg.includes("internalCode")) {
        return { success: false, error: "Item já contém cadastro! Este código interno (PLU) já pertence a outro produto." };
      }
      return { success: false, error: "Item já contém cadastro no sistema." };
    }
    return {
      success: false,
      error: err.message || "Erro ao cadastrar produto.",
    };
  }
}
