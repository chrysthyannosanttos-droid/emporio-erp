"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { standardizeProductName } from "@/lib/product-name-standardizer";
import { resolveActiveCompany } from "@/lib/tenant";
import { computeEffectiveStock } from "@/lib/stockDeduction";

async function getOrCreateCompany() {
  let company = await resolveActiveCompany();
  if (!company) {
    company = await prisma.company.create({
      data: { name: "EMPORIO AGROBELEM LTDA", document: "65.522.409/0001-13" }
    });
  }
  return company;
}

export type ProductRecipeItemInput = {
  productId: string;
  quantity: number;
  unit: string;
  itemRole: "INGREDIENT" | "PACKAGING";
};

export type ProductRecipeExtraOptions = {
  recipeItems?: ProductRecipeItemInput[];
  recipeYield?: number;
  recipeInstructions?: string | null;
};

type InputReader = {
  has: (key: string) => boolean;
  str: (key: string) => string;
  optStr: (key: string) => string | null;
  num: (key: string, fallback?: number) => number;
  optNum: (key: string) => number | null;
  int: (key: string, fallback?: number) => number;
  bool: (key: string) => boolean;
  recipeItems: () => ProductRecipeItemInput[] | undefined;
  recipeYield: () => number | undefined;
  recipeInstructions: () => string | null | undefined;
};

function createInputReader(
  input: FormData | Record<string, any>,
  extra?: ProductRecipeExtraOptions
): InputReader {
  const isFd = typeof FormData !== "undefined" && input instanceof FormData;

  const has = (key: string) => {
    if (isFd) return (input as FormData).has(key);
    return (input as Record<string, any>)[key] !== undefined;
  };

  const raw = (key: string) => {
    if (isFd) return (input as FormData).get(key);
    return (input as Record<string, any>)[key];
  };

  const str = (key: string) => {
    const v = raw(key);
    return v === null || v === undefined ? "" : String(v);
  };

  const optStr = (key: string) => {
    const s = str(key).trim();
    return s.length > 0 ? s : null;
  };

  const num = (key: string, fallback = 0) => {
    const n = parseFloat(str(key));
    return Number.isFinite(n) ? n : fallback;
  };

  const optNum = (key: string) => {
    const s = str(key).trim();
    if (!s) return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  const int = (key: string, fallback = 0) => {
    const n = parseInt(str(key), 10);
    return Number.isFinite(n) ? n : fallback;
  };

  const bool = (key: string) => {
    const v = raw(key);
    if (typeof v === "boolean") return v;
    return String(v) === "true";
  };

  const recipeItems = (): ProductRecipeItemInput[] | undefined => {
    if (extra?.recipeItems !== undefined) return extra.recipeItems;
    const r = raw("recipeItems");
    if (r === null || r === undefined) return undefined;
    if (Array.isArray(r)) return r;
    if (typeof r === "string" && r.trim()) {
      try {
        const parsed = JSON.parse(r);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const recipeYield = (): number | undefined => {
    if (extra?.recipeYield !== undefined) return Number(extra.recipeYield);
    if (!has("recipeYield")) return undefined;
    const n = parseFloat(str("recipeYield"));
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const recipeInstructions = (): string | null | undefined => {
    if (extra?.recipeInstructions !== undefined) return extra.recipeInstructions;
    if (!has("recipeInstructions")) return undefined;
    return optStr("recipeInstructions");
  };

  return { has, str, optStr, num, optNum, int, bool, recipeItems, recipeYield, recipeInstructions };
}

async function syncProductRecipe(
  tx: any,
  params: {
    productId: string;
    companyId: string;
    isSelfProduced: boolean;
    recipeItems?: ProductRecipeItemInput[];
    recipeYield?: number;
    recipeInstructions?: string | null;
  }
) {
  if (!params.isSelfProduced || params.recipeItems === undefined) return;

  const validItems = params.recipeItems
    .filter(
      (it) =>
        it &&
        typeof it.productId === "string" &&
        it.productId.trim() !== "" &&
        it.productId !== params.productId &&
        Number(it.quantity) > 0
    )
    .map((it) => ({
      productId: it.productId.trim(),
      quantity: Number(it.quantity),
      unit: (it.unit || "UN").trim() || "UN",
      itemRole: (it.itemRole === "PACKAGING" ? "PACKAGING" : "INGREDIENT") as
        | "INGREDIENT"
        | "PACKAGING",
    }));

  let computedUnitCost: number | null = null;
  if (validItems.length > 0) {
    const itemIds = Array.from(new Set(validItems.map((i) => i.productId)));
    const validProducts = await tx.product.findMany({
      where: { id: { in: itemIds }, companyId: params.companyId },
      select: { id: true, cost: true },
    });
    const costById = new Map<string, number>();
    for (const p of validProducts) {
      costById.set(p.id, Number(p.cost || 0));
    }
    for (const it of validItems) {
      if (!costById.has(it.productId)) {
        throw new Error("Um ou mais insumos/embalagens selecionados não pertencem à empresa.");
      }
    }
    const totalRecipeCost = validItems.reduce(
      (acc, it) => acc + it.quantity * (costById.get(it.productId) || 0),
      0
    );
    const yieldForCost =
      params.recipeYield && Number.isFinite(params.recipeYield) && params.recipeYield > 0
        ? Number(params.recipeYield)
        : 1;
    const unitCost = Number((totalRecipeCost / yieldForCost).toFixed(4));
    if (unitCost > 0) {
      computedUnitCost = unitCost;
    }
  }

  const existingRecipe = await tx.recipe.findUnique({
    where: { productId: params.productId },
  });

  const yieldVal =
    params.recipeYield && Number.isFinite(params.recipeYield) && params.recipeYield > 0
      ? Number(params.recipeYield)
      : existingRecipe?.yield || 1;

  const instructionsVal =
    params.recipeInstructions !== undefined
      ? params.recipeInstructions?.trim() || null
      : existingRecipe?.instructions || null;

  if (existingRecipe) {
    await tx.recipe.update({
      where: { id: existingRecipe.id },
      data: {
        yield: yieldVal,
        instructions: instructionsVal,
      },
    });
    await tx.recipeItem.deleteMany({
      where: { recipeId: existingRecipe.id },
    });
    if (validItems.length > 0) {
      await tx.recipeItem.createMany({
        data: validItems.map((it) => ({
          recipeId: existingRecipe.id,
          productId: it.productId,
          quantity: it.quantity,
          unit: it.unit,
          itemRole: it.itemRole,
        })),
      });
    }
  } else if (validItems.length > 0) {
    await tx.recipe.create({
      data: {
        productId: params.productId,
        companyId: params.companyId,
        yield: yieldVal,
        instructions: instructionsVal,
        items: {
          create: validItems,
        },
      },
    });
  }

  if (computedUnitCost !== null && computedUnitCost > 0) {
    await tx.product.update({
      where: { id: params.productId },
      data: { cost: computedUnitCost },
    });
  }
}

export async function createProduct(
  formDataOrInput: FormData | Record<string, any>,
  extraOptions?: ProductRecipeExtraOptions
) {
  try {
    const r = createInputReader(formDataOrInput, extraOptions);
    const name = r.str("name").trim();
    const barcode = r.str("barcode");
    const price = r.num("price", NaN);
    const cost = r.optNum("cost");
    const stock = r.num("stock", 0);
    const ncm = r.str("ncm");
    const cest = r.str("cest");
    const cfop = r.str("cfop");
    const cst = r.str("cst");
    const origin = r.str("origin") || "0";
    const icmsRate = r.num("icmsRate", 0);
    const icmsRedBaseRate = r.num("icmsRedBaseRate", 0);
    const cstPis = r.optStr("cstPis");
    const pisRate = r.num("pisRate", 0);
    const cstCofins = r.optStr("cstCofins");
    const cofinsRate = r.num("cofinsRate", 0);
    const cstIpi = r.optStr("cstIpi");
    const ipiRate = r.num("ipiRate", 0);
    const fecoepRate = r.num("fecoepRate", 0);
    const ibsRate = r.num("ibsRate", 0);
    const cbsRate = r.num("cbsRate", 0);
    const isRate = r.num("isRate", 0);
    // Entrada (compra)
    const cfopIn = r.optStr("cfopIn");
    const cstIn = r.optStr("cstIn");
    const icmsRateIn = r.num("icmsRateIn", 0);
    const icmsRedBaseRateIn = r.num("icmsRedBaseRateIn", 0);
    const fecoepRateIn = r.num("fecoepRateIn", 0);
    const cstPisIn = r.optStr("cstPisIn");
    const pisRateIn = r.num("pisRateIn", 0);
    const cstCofinsIn = r.optStr("cstCofinsIn");
    const cofinsRateIn = r.num("cofinsRateIn", 0);
    const cstIpiIn = r.optStr("cstIpiIn");
    const ipiRateIn = r.num("ipiRateIn", 0);

    const isSelfProduced = r.bool("isSelfProduced");
    const sendToScale = r.bool("sendToScale");
    const scaleDays = r.int("scaleDays", 0);
    const scaleDept = r.int("scaleDept", 1);
    let internalCode = r.optStr("internalCode");
    const unit = r.str("unit") || (sendToScale ? "KG" : "UN");
    const parentProductId = r.str("parentProductId") || undefined;
    const categoryId = r.optStr("categoryId");

    if (!name || isNaN(price)) return { error: "Nome e Preço são obrigatórios e válidos" };

    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou empresa não identificada." };
    }
    const companyId = session.companyId;

    // Se informou código de barras ou interno, verifica se já existe na empresa para atualizar (permitindo recadastro)
    let existingProductId: string | null = null;
    const cleanBarcode = barcode?.trim() || null;
    if (cleanBarcode) {
      const existingWithBarcode = await prisma.product.findFirst({
        where: { barcode: cleanBarcode, companyId },
        select: { id: true, name: true, internalCode: true }
      });
      if (existingWithBarcode) {
        existingProductId = existingWithBarcode.id;
      }
    }

    if (!existingProductId && internalCode) {
      const existingWithCode = await prisma.product.findFirst({
        where: { internalCode, companyId },
        select: { id: true, name: true, barcode: true }
      });
      if (existingWithCode) {
        existingProductId = existingWithCode.id;
      }
    }

    // Geração automática de código interno de 5 dígitos para produtos de fabricação própria caso não tenha código
    if ((isSelfProduced || sendToScale) && !internalCode) {
      const lastProduct = await prisma.product.findFirst({
        where: { companyId, internalCode: { not: null } },
        orderBy: { createdAt: 'desc' }
      });
      let nextNum = 1;
      if (lastProduct && lastProduct.internalCode) {
        const lastNum = parseInt(lastProduct.internalCode, 10);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      internalCode = String(nextNum).padStart(5, '0');
    }

    // Campos Multissetoriais (Distribuição / Indústria / Logística / Cardápio)
    const sku = r.optStr("sku");
    const brand = r.optStr("brand");
    const manufacturer = r.optStr("manufacturer");
    const unitPurchase = r.optStr("unitPurchase");
    const unitSale = r.optStr("unitSale");
    const unitConvFactor = r.num("unitConvFactor", 1);
    const packagingType = r.optStr("packagingType");
    const unitsPerPack = r.num("unitsPerPack", 1);
    const minOrderQty = r.num("minOrderQty", 1);
    const grossWeight = r.optNum("grossWeight");
    const netWeight = r.optNum("netWeight");
    const width = r.optNum("width");
    const height = r.optNum("height");
    const depth = r.optNum("depth");
    const isRawMaterial = r.bool("isRawMaterial");
    const isFinishedGood = r.bool("isFinishedGood");
    const isPackaging = r.bool("isPackaging");
    const showInDigitalMenu = r.bool("showInDigitalMenu");
    const minStock = r.num("minStock", 0);
    const maxStock = r.optNum("maxStock");
    const leadTimeDays = r.int("leadTimeDays", 0);

    const recipeItems = r.recipeItems();
    const recipeYield = r.recipeYield();
    const recipeInstructions = r.recipeInstructions();

    const productData = {
      name,
      barcode: cleanBarcode || undefined,
      price,
      cost,
      stock,
      ncm: ncm || null,
      cest: cest || null,
      cfop: cfop || null,
      cst: cst || null,
      origin: origin || "0",
      icmsRate,
      icmsRedBaseRate,
      cstPis,
      pisRate,
      cstCofins,
      cofinsRate,
      cstIpi,
      ipiRate,
      fecoepRate,
      ibsRate,
      cbsRate,
      isRate,
      cfopIn: cfopIn || null,
      cstIn: cstIn || null,
      icmsRateIn,
      icmsRedBaseRateIn,
      fecoepRateIn,
      cstPisIn,
      pisRateIn,
      cstCofinsIn,
      cofinsRateIn,
      cstIpiIn,
      ipiRateIn,
      unit,
      isSelfProduced,
      sendToScale,
      scaleDays,
      scaleDept,
      internalCode: internalCode || null,
      parentProductId,
      categoryId: categoryId || undefined,
      companyId,
      sku,
      brand,
      manufacturer,
      unitPurchase,
      unitSale,
      unitConvFactor,
      packagingType,
      unitsPerPack,
      minOrderQty,
      grossWeight,
      netWeight,
      width,
      height,
      depth,
      isRawMaterial,
      isFinishedGood,
      isPackaging,
      showInDigitalMenu,
      minStock,
      maxStock,
      leadTimeDays,
      createdAt: new Date(), // Considera cadastro feito de ontem pra hoje conforme regra do balanço
    };

    const savedProduct = await prisma.$transaction(async (tx) => {
      const prod = existingProductId
        ? await tx.product.update({
            where: { id: existingProductId },
            data: productData,
          })
        : await tx.product.create({
            data: productData,
          });

      await syncProductRecipe(tx, {
        productId: prod.id,
        companyId,
        isSelfProduced,
        recipeItems,
        recipeYield,
        recipeInstructions,
      });

      return prod;
    });

    revalidatePath("/stock");
    revalidatePath("/scales");
    revalidatePath("/production");
    revalidatePath("/restaurant/recipes");
    return { success: true, updated: Boolean(existingProductId), productId: savedProduct.id };
  } catch (err: any) {
    // Fail-safe: se der erro de unique constraint, localiza o existente e atualiza
    if (err?.code === "P2002" || err?.message?.includes("Unique constraint")) {
      try {
        const session = await getSession();
        const compId = session?.companyId;
        const r = createInputReader(formDataOrInput, extraOptions);
        const cleanBar = r.optStr("barcode");
        if (compId && cleanBar) {
          const dup = await prisma.product.findFirst({
            where: { barcode: cleanBar, companyId: compId },
          });
          if (dup) {
            await prisma.product.update({
              where: { id: dup.id },
              data: {
                name: r.str("name"),
                price: r.num("price", 0),
                stock: r.num("stock", 0),
                unit: r.str("unit") || "UN",
                createdAt: new Date(),
              },
            });
            revalidatePath("/stock");
            return { success: true, updated: true };
          }
        }
      } catch {}
    }
    return { error: err.message || "Erro ao criar produto" };
  }
}

export async function updateProduct(
  productId: string,
  formDataOrInput: FormData | Record<string, any>,
  extraOptions?: ProductRecipeExtraOptions
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou empresa não identificada." };
    }
    const companyId = session.companyId;

    const existingProduct = await prisma.product.findFirst({
      where: { id: productId, companyId },
    });
    if (!existingProduct) {
      return { error: "Produto não encontrado ou não pertence à sua empresa." };
    }

    const r = createInputReader(formDataOrInput, extraOptions);
    const name = r.str("name").trim();
    const barcode = r.optStr("barcode");
    const price = r.num("price", NaN);
    const cost = r.has("cost") ? r.optNum("cost") : existingProduct.cost ? Number(existingProduct.cost) : null;
    const stock = r.has("stock") ? r.num("stock", 0) : existingProduct.stock;
    const unit = r.has("unit") ? r.str("unit") || "UN" : existingProduct.unit;
    const categoryId = r.has("categoryId") ? r.optStr("categoryId") : existingProduct.categoryId;

    const sendToScale = r.has("sendToScale") ? r.bool("sendToScale") : existingProduct.sendToScale;
    const scaleDays = r.has("scaleDays") ? r.int("scaleDays", 0) : (existingProduct.scaleDays ?? 0);
    const scaleDept = r.has("scaleDept") ? r.int("scaleDept", 1) : (existingProduct.scaleDept ?? 1);
    const internalCode = r.has("internalCode") ? r.optStr("internalCode") : existingProduct.internalCode;
    const isSelfProduced = r.has("isSelfProduced") ? r.bool("isSelfProduced") : existingProduct.isSelfProduced;

    if (!name || isNaN(price)) {
      return { error: "Nome e Preço são obrigatórios e válidos" };
    }

    if (barcode) {
      const existingBarcode = await prisma.product.findFirst({
        where: {
          barcode,
          companyId,
          id: { not: productId }
        }
      });
      if (existingBarcode) {
        return { error: `Item já contém cadastro! O código "${barcode}" já pertence ao produto "${existingBarcode.name}".` };
      }
    }

    if (internalCode) {
      const existing = await prisma.product.findFirst({
        where: {
          internalCode,
          companyId,
          id: { not: productId }
        }
      });
      if (existing) {
        return { error: `Item já contém cadastro! O código de balança ${internalCode} já pertence ao produto "${existing.name}".` };
      }
    }

    const updateData: Record<string, any> = {
      name,
      barcode,
      price,
      cost,
      stock,
      unit,
      categoryId: categoryId || null,
      sendToScale,
      scaleDays,
      scaleDept,
      internalCode,
      isSelfProduced,
      ...(Number(existingProduct.price) !== price ? { priceChangedAt: new Date() } : {}),
    };

    // Persistir flags e campos multissetoriais sempre que enviados
    if (r.has("isRawMaterial")) updateData.isRawMaterial = r.bool("isRawMaterial");
    if (r.has("isFinishedGood")) updateData.isFinishedGood = r.bool("isFinishedGood");
    if (r.has("isPackaging")) updateData.isPackaging = r.bool("isPackaging");
    if (r.has("showInDigitalMenu")) updateData.showInDigitalMenu = r.bool("showInDigitalMenu");
    if (r.has("active")) updateData.active = r.bool("active");

    if (r.has("sku")) updateData.sku = r.optStr("sku");
    if (r.has("brand")) updateData.brand = r.optStr("brand");
    if (r.has("manufacturer")) updateData.manufacturer = r.optStr("manufacturer");
    if (r.has("unitPurchase")) updateData.unitPurchase = r.optStr("unitPurchase");
    if (r.has("unitSale")) updateData.unitSale = r.optStr("unitSale");
    if (r.has("unitConvFactor")) updateData.unitConvFactor = r.num("unitConvFactor", 1);
    if (r.has("packagingType")) updateData.packagingType = r.optStr("packagingType");
    if (r.has("unitsPerPack")) updateData.unitsPerPack = r.num("unitsPerPack", 1);
    if (r.has("minOrderQty")) updateData.minOrderQty = r.num("minOrderQty", 1);
    if (r.has("grossWeight")) updateData.grossWeight = r.optNum("grossWeight");
    if (r.has("netWeight")) updateData.netWeight = r.optNum("netWeight");
    if (r.has("width")) updateData.width = r.optNum("width");
    if (r.has("height")) updateData.height = r.optNum("height");
    if (r.has("depth")) updateData.depth = r.optNum("depth");
    if (r.has("minStock")) updateData.minStock = r.num("minStock", 0);
    if (r.has("maxStock")) updateData.maxStock = r.optNum("maxStock");
    if (r.has("leadTimeDays")) updateData.leadTimeDays = r.int("leadTimeDays", 0);

    // Campos fiscais (caso enviados na edição)
    if (r.has("ncm")) updateData.ncm = r.optStr("ncm");
    if (r.has("cest")) updateData.cest = r.optStr("cest");
    if (r.has("cfop")) updateData.cfop = r.optStr("cfop");
    if (r.has("cst")) updateData.cst = r.optStr("cst");
    if (r.has("origin")) updateData.origin = r.str("origin") || "0";
    if (r.has("icmsRate")) updateData.icmsRate = r.num("icmsRate", 0);
    if (r.has("icmsRedBaseRate")) updateData.icmsRedBaseRate = r.num("icmsRedBaseRate", 0);
    if (r.has("fecoepRate")) updateData.fecoepRate = r.num("fecoepRate", 0);
    if (r.has("cstPis")) updateData.cstPis = r.optStr("cstPis");
    if (r.has("pisRate")) updateData.pisRate = r.num("pisRate", 0);
    if (r.has("cstCofins")) updateData.cstCofins = r.optStr("cstCofins");
    if (r.has("cofinsRate")) updateData.cofinsRate = r.num("cofinsRate", 0);
    if (r.has("cstIpi")) updateData.cstIpi = r.optStr("cstIpi");
    if (r.has("ipiRate")) updateData.ipiRate = r.num("ipiRate", 0);
    if (r.has("ibsRate")) updateData.ibsRate = r.num("ibsRate", 0);
    if (r.has("cbsRate")) updateData.cbsRate = r.num("cbsRate", 0);
    if (r.has("isRate")) updateData.isRate = r.num("isRate", 0);

    const recipeItems = r.recipeItems();
    const recipeYield = r.recipeYield();
    const recipeInstructions = r.recipeInstructions();

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: updateData,
      });

      await syncProductRecipe(tx, {
        productId,
        companyId,
        isSelfProduced,
        recipeItems,
        recipeYield,
        recipeInstructions,
      });

      // Se o custo deste item (insumo/embalagem) foi alterado, recalcula o custo dos produtos que o usam
      if (cost !== null && Math.abs(cost - Number(existingProduct.cost || 0)) >= 0.001) {
        const dependentRecipes = await tx.recipe.findMany({
          where: {
            companyId,
            items: { some: { productId } },
          },
          include: {
            items: { include: { product: { select: { id: true, cost: true } } } },
          },
        });
        for (const rec of dependentRecipes) {
          const total = rec.items.reduce(
            (acc, it) => acc + Number(it.quantity || 0) * Number(it.product?.cost || 0),
            0
          );
          const unitCost = Number((total / Math.max(Number(rec.yield || 1), 0.0001)).toFixed(4));
          if (unitCost > 0) {
            await tx.product.update({
              where: { id: rec.productId },
              data: { cost: unitCost },
            });
          }
        }
      }
    });

    revalidatePath("/stock");
    revalidatePath("/scales");
    revalidatePath("/production");
    revalidatePath("/restaurant/recipes");

    const oldPriceVal = Number(existingProduct.price || 0);
    if (Math.abs(price - oldPriceVal) >= 0.005) {
      try {
        const { recordPriceChange } = await import("./labels");
        await recordPriceChange({
          productId,
          oldPrice: oldPriceVal,
          newPrice: price,
          companyId,
          userId: session.userId,
          userName: session.name,
        });
      } catch {}
    }

    return { success: true };
  } catch (err: any) {
    if (err?.code === "P2002" || err?.message?.includes("Unique constraint")) {
      const msg = String(err?.message || JSON.stringify(err?.meta || ""));
      if (msg.includes("barcode")) {
        return { error: "Item já contém cadastro! Este código de barras já está em uso na sua empresa." };
      }
      if (msg.includes("internalCode")) {
        return { error: "Item já contém cadastro! Este código de balança/PLU já pertence a outro produto." };
      }
      return { error: "Item já contém cadastro no sistema." };
    }
    return { error: err.message || "Erro ao atualizar produto" };
  }
}

export async function createProductsFromInvoice(productsList: any[]) {
  try {
    const company = await getOrCreateCompany();
    const companyId = company.id;

    let createdCount = 0;

    for (const item of productsList) {
      // Check if product already exists in company by barcode
      if (item.barcode) {
        const existing = await prisma.product.findFirst({
          where: { barcode: item.barcode, companyId }
        });
        if (existing) {
          // Update stock of existing product
          await prisma.product.update({
            where: { id: existing.id },
            data: { stock: { increment: item.stock } }
          });
          createdCount++;
          continue;
        }
      }

      await prisma.product.create({
        data: {
          name: item.name,
          barcode: item.barcode || null,
          price: item.price,
          stock: item.stock,
          ncm: item.ncm || null,
          cest: item.cest || null,
          cfop: item.cfop || null,
          cst: item.cst || null,
          ibsRate: item.ibsRate || 0,
          cbsRate: item.cbsRate || 0,
          isRate: item.isRate || 0,
          companyId,
        }
      });
      createdCount++;
    }

    revalidatePath("/stock");
    return { success: true, count: createdCount };
  } catch (err: any) {
    return { error: err.message || "Erro ao importar nota fiscal" };
  }
}

// Catálogo de referência rápida de produtos populares no Brasil (offline/fallback)
const POPULAR_BR_PRODUCTS: Record<
  string,
  {
    name: string;
    brand: string;
    ncm: string;
    cest?: string;
    cfop?: string;
    cst?: string;
    unit: string;
    category: string;
    price?: number;
    cost?: number;
  }
> = {
  "7891022100139": { name: "Detergente Líquido Ypê Neutro 500ml", brand: "Ypê", ncm: "3402.20.00", unit: "UN", category: "Limpeza", price: 2.89, cost: 1.65 },
  "7891022100115": { name: "Detergente Líquido Ypê Maçã 500ml", brand: "Ypê", ncm: "3402.20.00", unit: "UN", category: "Limpeza", price: 2.89, cost: 1.65 },
  "7891022100122": { name: "Detergente Líquido Ypê Coco 500ml", brand: "Ypê", ncm: "3402.20.00", unit: "UN", category: "Limpeza", price: 2.89, cost: 1.65 },
  "7891022100146": { name: "Detergente Líquido Ypê Limão 500ml", brand: "Ypê", ncm: "3402.20.00", unit: "UN", category: "Limpeza", price: 2.89, cost: 1.65 },
  "7891991000821": { name: "Refrigerante Guaraná Antarctica 2L", brand: "Antarctica", ncm: "2202.10.00", unit: "UN", category: "Bebidas", price: 8.50, cost: 5.20 },
  "7894900010015": { name: "Refrigerante Coca-Cola Lata 350ml", brand: "Coca-Cola", ncm: "2202.10.00", unit: "UN", category: "Bebidas", price: 4.50, cost: 2.70 },
  "7894900027013": { name: "Refrigerante Coca-Cola Pet 2L", brand: "Coca-Cola", ncm: "2202.10.00", unit: "UN", category: "Bebidas", price: 9.90, cost: 6.80 },
  "7891000120202": { name: "Batata Palha Tradicional Elma Chips 140g", brand: "Elma Chips", ncm: "2005.20.00", unit: "UN", category: "Mercearia", price: 9.90, cost: 6.40 },
  "7622300742186": { name: "Biscoito Recheado Oreo Chocolate 90g", brand: "Oreo", ncm: "1905.31.00", unit: "UN", category: "Mercearia", price: 3.80, cost: 2.20 },
  "7891000100105": { name: "Leite em Pó Integral Ninho Nestlé Lata 400g", brand: "Nestlé", ncm: "0402.21.10", unit: "UN", category: "Mercearia", price: 18.90, cost: 13.50 },
  "7896000701018": { name: "Sabão em Pó Omo Lavagem Perfeita 800g", brand: "Omo", ncm: "3401.19.00", unit: "UN", category: "Limpeza", price: 14.90, cost: 9.80 },
  "7891055312783": { name: "Cerveja Heineken Long Neck 330ml", brand: "Heineken", ncm: "2203.00.00", unit: "UN", category: "Bebidas", price: 7.99, cost: 5.10 },
  "7891991010837": { name: "Cerveja Brahma Chopp Lata 350ml", brand: "Brahma", ncm: "2203.00.00", unit: "UN", category: "Bebidas", price: 3.99, cost: 2.60 },
  "7896004000308": { name: "Café Torrado e Moído Tradicional Pilão 500g", brand: "Pilão", ncm: "0901.21.00", unit: "UN", category: "Mercearia", price: 17.50, cost: 12.00 },
  "7891000053500": { name: "Chocolate Nestlé Classic ao Leite 80g", brand: "Nestlé", ncm: "1806.90.00", unit: "UN", category: "Mercearia", price: 6.50, cost: 4.10 },
  "7891035800071": { name: "Creme Dental Colgate Total 12 90g", brand: "Colgate", ncm: "3306.10.00", unit: "UN", category: "Higiene Pessoal", price: 6.90, cost: 4.20 },
  "7791293022567": { name: "Desodorante Antitranspirante Rexona Aerosol 150ml", brand: "Rexona", ncm: "3307.20.10", unit: "UN", category: "Higiene Pessoal", price: 15.90, cost: 9.90 },
  "7896005800114": { name: "Óleo de Soja Refinado Soya Pet 900ml", brand: "Soya", ncm: "1507.90.11", unit: "UN", category: "Mercearia", price: 6.89, cost: 4.90 },
  "7896005800107": { name: "Óleo de Soja Refinado Liza Pet 900ml", brand: "Liza", ncm: "1507.90.11", unit: "UN", category: "Mercearia", price: 6.99, cost: 5.10 },
  "7896006700017": { name: "Açúcar Refinado União Pacote 1kg", brand: "União", ncm: "1701.99.00", unit: "UN", category: "Mercearia", price: 4.50, cost: 3.10 },
  "7896001000011": { name: "Arroz Branco Tipo 1 Tio João 5kg", brand: "Tio João", ncm: "1006.30.21", unit: "UN", category: "Mercearia", price: 29.90, cost: 22.00 },
  "7896001000028": { name: "Feijão Carioca Tipo 1 Camil 1kg", brand: "Camil", ncm: "0713.33.99", unit: "UN", category: "Mercearia", price: 8.90, cost: 5.80 },
  "7896003000019": { name: "Água Sanitária Q-Boa 1L", brand: "Q-Boa", ncm: "2828.90.11", unit: "UN", category: "Limpeza", price: 4.20, cost: 2.50 },
  "7891000123456": { name: "Café Gourmet Torrado 500g", brand: "Café Brasil", ncm: "0901.21.00", unit: "UN", category: "Mercearia", price: 24.90, cost: 14.50 },
  "7891000654321": { name: "Azeite de Oliva Extra Virgem 500ml", brand: "Gallo", ncm: "1509.10.00", unit: "UN", category: "Mercearia", price: 39.90, cost: 26.00 },
  "7892000112233": { name: "Vinho Tinto Reserva Cabernet 750ml", brand: "Concha y Toro", ncm: "2204.21.00", unit: "UN", category: "Bebidas", price: 89.90, cost: 48.00 },
  "7893789210929": { name: "Cigarro Marlboro Red Box (Maço 20 un)", brand: "Marlboro", ncm: "2402.20.00", cest: "04.001.00", cfop: "5405", cst: "500", unit: "UN", category: "Tabacaria & Conveniência", price: 14.00, cost: 11.20 },
  "7893789211469": { name: "Cigarro Chesterfield Blue Box (Maço 20 un)", brand: "Chesterfield", ncm: "2402.20.00", cest: "04.001.00", cfop: "5405", cst: "500", unit: "UN", category: "Tabacaria & Conveniência", price: 10.50, cost: 8.40 },
};

function inferNcmAndCategory(
  name: string,
  brand?: string
): { ncm: string; category: string; cest?: string; cfop?: string; cst?: string } {
  const text = `${name} ${brand || ""}`.toLowerCase();

  if (/cigarro|marlboro|malboro|dunhill|carlton|hollywood|derby|kent|lucky\s*strike|luckies|rothmans|chesterfield|camel|winston|l&m|minister|palheiro|paiero|paiol|tabaco|fumo|seda|piteira/.test(text)) {
    return { ncm: "2402.20.00", category: "Tabacaria & Conveniência", cest: "04.001.00", cfop: "5405", cst: "500" };
  }
  if (/isqueiro|bic\s*(maxi|mini)|clipper|zippo/.test(text)) {
    return { ncm: "9613.10.00", category: "Tabacaria & Conveniência" };
  }
  if (/carv[aã]o|narguil[eé]|ess[eê]ncia/.test(text)) {
    return { ncm: "4402.90.00", category: "Tabacaria & Conveniência" };
  }
  if (/energ[eé]tico|red\s*bull|monster|bally|fusion|tnt\s*energy|vibe/.test(text)) {
    return { ncm: "2202.99.00", category: "Bebidas", cest: "03.007.00", cfop: "5405", cst: "500" };
  }
  if (/whisky|whiskey|vodka|\bgin\b|cacha[cç]a|pinga|\brum\b|tequila|conhaque|campari|licor|red\s*label|black\s*label|white\s*horse|ballantines|chivas|jack\s*daniel|absolut|smirnoff|tanqueray|beefeater|gordons|corote|velho\s*barreiro|ypioca|dreher|catuaba/.test(text)) {
    return { ncm: "2208.30.20", category: "Bebidas Destiladas" };
  }
  if (/preservativo|camisinha|jontex|olla|prudence|blowtex/.test(text)) {
    return { ncm: "4014.10.00", category: "Conveniência" };
  }
  if (/\bgelo\b|saco de gelo/.test(text)) {
    return { ncm: "2201.90.00", category: "Bebidas" };
  }

  if (/refrigerante|coca|guaran[aá]|fanta|pepsi|sprite|sukita|schweppes/.test(text)) {
    return { ncm: "2202.10.00", category: "Bebidas" };
  }
  if (/cerveja|chopp|chope|heineken|brahma|skol|budweiser|amstel|corona|stella/.test(text)) {
    return { ncm: "2203.00.00", category: "Bebidas" };
  }
  if (/vinho|espumante|champagne|prosecco/.test(text)) {
    return { ncm: "2204.21.00", category: "Bebidas" };
  }
  if (/suco|n[eé]ctar|del valle|maguary/.test(text)) {
    return { ncm: "2009.89.90", category: "Bebidas" };
  }
  if (/detergente|lava[- ]lou[cç]as/.test(text)) {
    return { ncm: "3402.20.00", category: "Limpeza" };
  }
  if (/sab[aã]o|amaciante|omo|yp[eê]|comfort|downy|brilhante/.test(text)) {
    return { ncm: "3401.19.00", category: "Limpeza" };
  }
  if (/[aá]gua sanit[aá]ria|cloro|desinfetante|pinho|veja|lysoform/.test(text)) {
    return { ncm: "2828.90.11", category: "Limpeza" };
  }
  if (/desodorante|antitranspirante|rexona|axe|dove|nivea/.test(text)) {
    return { ncm: "3307.20.10", category: "Higiene Pessoal" };
  }
  if (/creme dental|pasta de dente|colgate|oral-b|sorriso|sensodyne/.test(text)) {
    return { ncm: "3306.10.00", category: "Higiene Pessoal" };
  }
  if (/shampoo|xampu|condicionador|pantene|seda|dove|head & shoulders/.test(text)) {
    return { ncm: "3305.10.00", category: "Higiene Pessoal" };
  }
  if (/sabonete|palmolive|protex|lux/.test(text)) {
    return { ncm: "3401.11.90", category: "Higiene Pessoal" };
  }
  if (/papel higi[eê]nico|neve|personal|fofinho/.test(text)) {
    return { ncm: "4818.10.00", category: "Higiene Pessoal" };
  }
  if (/leite|uht|piracanjuba|itamb[eé]|ninho|parmalat/.test(text)) {
    return { ncm: "0401.20.10", category: "Frios & Laticínios" };
  }
  if (/queijo|mussarela|muçarela|parmes[aã]o|prato|requeij[aã]o/.test(text)) {
    return { ncm: "0406.90.20", category: "Frios & Laticínios" };
  }
  if (/presunto|apresuntado|mortadela|salame|lingui[cç]a|bacon/.test(text)) {
    return { ncm: "1602.41.00", category: "Frios & Laticínios" };
  }
  if (/caf[eé]|melitta|pil[aã]o|3 cora[cç][oõ]es|lor|nespresso/.test(text)) {
    return { ncm: "0901.21.00", category: "Mercearia" };
  }
  if (/arroz/.test(text)) {
    return { ncm: "1006.30.21", category: "Mercearia" };
  }
  if (/feij[aã]o|lentilha|gr[aã]o-de-bico/.test(text)) {
    return { ncm: "0713.33.99", category: "Mercearia" };
  }
  if (/[oó]leo|soja|girassol|azeite|canola/.test(text)) {
    return { ncm: "1507.90.11", category: "Mercearia" };
  }
  if (/a[cç][uú]car/.test(text)) {
    return { ncm: "1701.99.00", category: "Mercearia" };
  }
  if (/sal |salzinho|cisne/.test(text)) {
    return { ncm: "2501.00.20", category: "Mercearia" };
  }
  if (/macarr[aã]o|espaguete|massa|miojo|nissin|barilla/.test(text)) {
    return { ncm: "1902.19.00", category: "Mercearia" };
  }
  if (/biscoito|bolacha|oreo|trakinas|passatempo|club social|bauducco/.test(text)) {
    return { ncm: "1905.31.00", category: "Mercearia" };
  }
  if (/chocolate|bombom|lacta|nestl[eé]|garoto|kitkat/.test(text)) {
    return { ncm: "1806.90.00", category: "Mercearia" };
  }
  if (/[aá]gua mineral|minalba|crystal|bonafont|indaia|indai[aá]/.test(text)) {
    return { ncm: "2201.10.00", category: "Bebidas" };
  }
  if (/p[aã]o|torrada|bolo/.test(text)) {
    return { ncm: "1905.90.90", category: "Padaria" };
  }

  return { ncm: "2106.90.90", category: "Geral" };
}

export async function getProductInfoByAiBarcode(barcode: string) {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode || cleanBarcode.length < 5) {
    return { success: false, error: "Código de barras inválido." };
  }

  // 0. Se o item já existe na base da empresa, carrega os dados existentes para permitir recadastrar/atualizar
  try {
    const session = await getSession();
    if (session?.companyId) {
      const existing = await prisma.product.findFirst({
        where: { barcode: cleanBarcode, companyId: session.companyId },
        select: {
          id: true,
          name: true,
          price: true,
          cost: true,
          stock: true,
          internalCode: true,
          unit: true,
          ncm: true,
          cest: true,
          cfop: true,
          cst: true,
          brand: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      });
      if (existing) {
        return {
          success: true,
          alreadyExists: true,
          source: "Cadastro Existente (Recadastrar)",
          name: existing.name,
          price: Number(existing.price),
          cost: existing.cost ? Number(existing.cost) : 0,
          stock: existing.stock,
          unit: existing.unit || "UN",
          ncm: existing.ncm || "",
          cest: existing.cest || "",
          cfop: existing.cfop || "5102",
          cst: existing.cst || "102",
          brand: existing.brand || "",
          categorySuggested: existing.category?.name || "",
          existingProduct: {
            id: existing.id,
            name: existing.name,
            internalCode: existing.internalCode,
          },
        };
      }
    }
  } catch {}

  let resultTemplate: any = null;

  // 1. Tenta catálogo popular brasileiro embutido (resposta instantânea)
  const popular = POPULAR_BR_PRODUCTS[cleanBarcode];
  if (popular) {
    resultTemplate = {
      success: true,
      source: "Catálogo Brasil",
      name: popular.name,
      brand: popular.brand,
      price: popular.price || 0,
      cost: popular.cost || 0,
      stock: 1,
      ncm: popular.ncm,
      cest: popular.cest || "",
      cfop: popular.cfop || "5102",
      cst: popular.cst || "102",
      ibsRate: 0,
      cbsRate: 0,
      isRate: 0,
      unit: popular.unit || "UN",
      categorySuggested: popular.category,
      description: `Produto identificado no catálogo brasileiro. Código EAN: ${cleanBarcode}`,
    };
  }

  // 1B. Busca na Base Nacional Compartilhada Empório (somente metadados públicos cadastrais/fiscais, sem preço/custo/estoque de terceiros)
  if (!resultTemplate) {
    try {
      const session = await getSession();
      const sharedCatalog = await prisma.product.findFirst({
        where: {
          barcode: cleanBarcode,
          ...(session?.companyId ? { companyId: { not: session.companyId } } : {}),
        },
        select: {
          name: true,
          brand: true,
          unit: true,
          ncm: true,
          cest: true,
          cfop: true,
          cst: true,
          category: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (sharedCatalog && sharedCatalog.name) {
        const inferred = inferNcmAndCategory(sharedCatalog.name, sharedCatalog.brand || undefined);
        resultTemplate = {
          success: true,
          source: "Base Nacional Compartilhada Empório",
          name: sharedCatalog.name,
          brand: sharedCatalog.brand || "",
          price: 0,
          cost: 0,
          stock: 1,
          ncm: sharedCatalog.ncm || inferred.ncm,
          cest: sharedCatalog.cest || inferred.cest || "",
          cfop: sharedCatalog.cfop || inferred.cfop || "5102",
          cst: sharedCatalog.cst || inferred.cst || "102",
          ibsRate: 0,
          cbsRate: 0,
          isRate: 0,
          unit: sharedCatalog.unit || "UN",
          categorySuggested: sharedCatalog.category?.name || inferred.category,
          description: `Produto identificado via Base Compartilhada Empório (EAN ${cleanBarcode}).`,
        };
      }
    } catch (_) {}
  }

  // 2. Se houver token do Cosmos Bluesoft configurado, consulta a API do Cosmos (melhor cobertura BR incl. tabacaria)
  const cosmosToken = process.env.COSMOS_TOKEN;
  if (!resultTemplate && cosmosToken) {
    try {
      const res = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${cleanBarcode}`, {
        headers: { "X-Cosmos-Token": cosmosToken },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.description) {
          const inferred = inferNcmAndCategory(data.description, data.brand?.name);
          resultTemplate = {
            success: true,
            source: "Bluesoft Cosmos",
            name: data.description,
            brand: data.brand?.name || "",
            price: data.avg_price ? Number(data.avg_price) : 0,
            cost: data.avg_price ? Number((data.avg_price * 0.7).toFixed(2)) : 0,
            ncm: data.ncm?.code || inferred.ncm,
            cest: data.cest?.code || inferred.cest || "",
            cfop: inferred.cfop || "5102",
            cst: inferred.cst || "102",
            ibsRate: 0,
            cbsRate: 0,
            isRate: 0,
            unit: data.unit_of_measurement || "UN",
            imageUrl: data.thumbnail || data.picture_url || null,
            categorySuggested: inferred.category,
            description: `Marca: ${data.brand?.name || "—"} | NCM: ${data.ncm?.code || inferred.ncm || "—"}`,
          };
        }
      }
    } catch (_) {}
  }

  // 2B. Se houver token SI5 Global configurado, consulta base brasileira de conveniência/varejo
  const si5Token = process.env.SI5_TOKEN;
  if (!resultTemplate && si5Token) {
    try {
      const res = await fetch(`https://global.si5.com.br/api/produtos/${cleanBarcode}`, {
        headers: {
          Authorization: `Bearer ${si5Token}`,
          Accept: "application/json",
        },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const rawData = await res.json();
        const item = rawData?.produto || rawData?.data || rawData;
        const name = (item?.descricao || item?.nome || item?.description || "").trim();
        if (name) {
          const brand = (item?.marca || item?.brand || "").trim();
          const inferred = inferNcmAndCategory(name, brand);
          resultTemplate = {
            success: true,
            source: "SI5 Base Nacional",
            name,
            brand,
            price: Number(item?.preco || item?.avg_price || 0) || 0,
            cost: 0,
            stock: 1,
            ncm: item?.ncm || inferred.ncm,
            cest: item?.cest || inferred.cest || "",
            cfop: inferred.cfop || "5102",
            cst: inferred.cst || "102",
            ibsRate: 0,
            cbsRate: 0,
            isRate: 0,
            unit: item?.unidade || item?.unit || "UN",
            imageUrl: item?.imagem || item?.thumbnail || null,
            categorySuggested: item?.categoria || inferred.category,
            description: `Identificado via SI5 Global (EAN ${cleanBarcode}).`,
          };
        }
      }
    } catch (_) {}
  }

  // 3. Consulta ao Open Food Facts (gratuita, sem chave, com dados em português e fotos)
  if (!resultTemplate) {
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}?fields=product_name,product_name_pt,brands,quantity,categories,categories_tags,image_url`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const p = data.product;
          const rawName = (p.product_name_pt || p.product_name || "").trim();
          const brand = (p.brands || "").split(",")[0].trim();
          const qty = (p.quantity || "").trim();
          const fullName = [brand, rawName, qty].filter(Boolean).join(" ").trim() || rawName;

          if (fullName) {
            const inferred = inferNcmAndCategory(fullName, brand);
            resultTemplate = {
              success: true,
              source: "Open Food Facts",
              name: fullName,
              brand: brand || "",
              price: 0,
              cost: 0,
              stock: 1,
              ncm: inferred.ncm,
              cest: "",
              cfop: "5102",
              cst: "102",
              ibsRate: 0,
              cbsRate: 0,
              isRate: 0,
              unit: "UN",
              imageUrl: p.image_url || null,
              categorySuggested: inferred.category,
              description: `Produto identificado via Open Food Facts. Código EAN: ${cleanBarcode}`,
            };
          }
        }
      }
    } catch (_) {}
  }

  // 4. Consulta ao Open Beauty Facts (para cosméticos, higiene, sabonetes, xampus)
  if (!resultTemplate) {
    try {
      const res = await fetch(
        `https://world.openbeautyfacts.org/api/v2/product/${cleanBarcode}?fields=product_name,product_name_pt,brands,quantity,categories,image_url`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const p = data.product;
          const rawName = (p.product_name_pt || p.product_name || "").trim();
          const brand = (p.brands || "").split(",")[0].trim();
          const qty = (p.quantity || "").trim();
          const fullName = [brand, rawName, qty].filter(Boolean).join(" ").trim() || rawName;

          if (fullName) {
            const inferred = inferNcmAndCategory(fullName, brand);
            resultTemplate = {
              success: true,
              source: "Open Beauty Facts",
              name: fullName,
              brand: brand || "",
              price: 0,
              cost: 0,
              stock: 1,
              ncm: inferred.ncm,
              cest: "",
              cfop: "5102",
              cst: "102",
              ibsRate: 0,
              cbsRate: 0,
              isRate: 0,
              unit: "UN",
              imageUrl: p.image_url || null,
              categorySuggested: inferred.category || "Higiene Pessoal",
              description: `Produto identificado via Open Beauty Facts. Código EAN: ${cleanBarcode}`,
            };
          }
        }
      }
    } catch (_) {}
  }

  // 4B. Consulta ao Open Products Facts (produtos gerais, tabaco, descartáveis, utilidades)
  if (!resultTemplate) {
    try {
      const res = await fetch(
        `https://world.openproductsfacts.org/api/v2/product/${cleanBarcode}?fields=product_name,product_name_pt,brands,quantity,categories,image_url`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const p = data.product;
          const rawName = (p.product_name_pt || p.product_name || "").trim();
          const brand = (p.brands || "").split(",")[0].trim();
          const qty = (p.quantity || "").trim();
          const fullName = [brand, rawName, qty].filter(Boolean).join(" ").trim() || rawName;

          if (fullName) {
            const inferred = inferNcmAndCategory(fullName, brand);
            resultTemplate = {
              success: true,
              source: "Open Products Facts",
              name: fullName,
              brand: brand || "",
              price: 0,
              cost: 0,
              stock: 1,
              ncm: inferred.ncm,
              cest: inferred.cest || "",
              cfop: inferred.cfop || "5102",
              cst: inferred.cst || "102",
              ibsRate: 0,
              cbsRate: 0,
              isRate: 0,
              unit: "UN",
              imageUrl: p.image_url || null,
              categorySuggested: inferred.category,
              description: `Produto identificado via Open Products Facts. Código EAN: ${cleanBarcode}`,
            };
          }
        }
      }
    } catch (_) {}
  }

  // Se encontrou produto, ajusta NCM/CEST/CFOP/CST se estiverem faltando e aplica a grade tributária
  if (resultTemplate) {
    const inferred = inferNcmAndCategory(resultTemplate.name, resultTemplate.brand);
    if (!resultTemplate.ncm) {
      resultTemplate.ncm = inferred.ncm;
    }
    if (!resultTemplate.categorySuggested) {
      resultTemplate.categorySuggested = inferred.category;
    }
    if (!resultTemplate.cest && inferred.cest) {
      resultTemplate.cest = inferred.cest;
    }
    if ((!resultTemplate.cfop || resultTemplate.cfop === "5102") && inferred.cfop) {
      resultTemplate.cfop = inferred.cfop;
    }
    if ((!resultTemplate.cst || resultTemplate.cst === "102") && inferred.cst) {
      resultTemplate.cst = inferred.cst;
    }

    if (resultTemplate.ncm) {
      try {
        const company = await getOrCreateCompany();
        const activeGrid = await prisma.taxGrid.findFirst({
          where: { companyId: company.id, active: true },
          include: { rules: true },
        });

        if (activeGrid && activeGrid.rules.length > 0) {
          const rule =
            activeGrid.rules.find((r) => r.ncmPattern === resultTemplate.ncm) ||
            activeGrid.rules.find((r) => r.ncmPattern.includes("*") && resultTemplate.ncm.startsWith(r.ncmPattern.replace("*", ""))) ||
            activeGrid.rules.find((r) => r.ncmPattern === "*");

          if (rule) {
            if (rule.cfopOrigin) resultTemplate.cfop = rule.cfopOrigin;
            if (rule.cstIcms || rule.csosn) resultTemplate.cst = rule.csosn || rule.cstIcms;
            resultTemplate.icmsRate = Number(rule.icmsRate) || 0;
            resultTemplate.pisRate = Number(rule.pisRate) || 0;
            resultTemplate.cofinsRate = Number(rule.cofinsRate) || 0;
            resultTemplate.ibsRate = Number(rule.ibsRate) || 0;
            resultTemplate.cbsRate = Number(rule.cbsRate) || 0;
            resultTemplate.isRate = Number(rule.isRate) || 0;
          }
        }
      } catch (err) {
        console.error("Erro ao calcular impostos: ", err);
      }
    }
    if (!resultTemplate.alreadyExists && resultTemplate.name) {
      resultTemplate.rawName = resultTemplate.name;
      resultTemplate.name = standardizeProductName(resultTemplate.name, resultTemplate.brand);
    }
    return resultTemplate;
  }

  // 5. Fallback — não localizado
  const hasPaidBRCatalog = Boolean(process.env.COSMOS_TOKEN || process.env.SI5_TOKEN);
  return {
    success: false,
    error: hasPaidBRCatalog
      ? `Produto não encontrado nas bases nacionais para o código ${cleanBarcode}. Preencha manualmente.`
      : `Código ${cleanBarcode} não consta nas bases gratuitas (cigarros/tabacaria exigem token Cosmos/SI5 ou importação XML NF-e). Preencha manualmente — ao salvar, passa a integrar a base compartilhada.`,
  };
}

/**
 * Consulta real de código de barras na internet — usado pelo PDV e Estoque.
 * Busca primeiro no banco local, depois na base compartilhada e APIs externas.
 */
export async function lookupBarcodeOnline(barcode: string): Promise<{
  found: boolean;
  name?: string;
  source?: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  cst?: string;
  price?: number;
  cost?: number;
  unit?: string;
  categorySuggested?: string;
  hint?: string;
}> {
  const ean = barcode.trim();
  if (!ean) return { found: false };

  // Consulta rica via getProductInfoByAiBarcode
  const info = await getProductInfoByAiBarcode(ean);
  if (info.success && info.name) {
    return {
      found: true,
      name: info.name,
      source: info.source,
      brand: info.brand,
      imageUrl: info.imageUrl,
      ncm: info.ncm,
      cest: info.cest,
      cfop: info.cfop,
      cst: info.cst,
      price: info.price,
      cost: info.cost,
      unit: info.unit,
      categorySuggested: info.categorySuggested,
    };
  }

  return { found: false, hint: info.error };
}

/**
 * Criação Rápida de Produto a partir de Código de Barras (Bipagem Direta no Estoque)
 */
export async function quickCreateProductByBarcode(data: {
  barcode: string;
  name: string;
  price: number;
  cost?: number;
  stock?: number;
  ncm?: string;
  cest?: string;
  cfop?: string;
  cst?: string;
  brand?: string;
  unit?: string;
  categoryName?: string;
}) {
  try {
    const {
      barcode,
      name,
      price,
      cost = 0,
      stock = 1,
      ncm = "",
      cest = "",
      cfop: cfopInput = "",
      cst: cstInput = "",
      brand = "",
      unit = "UN",
      categoryName,
    } = data;
    if (!barcode || !name || isNaN(price)) {
      return { error: "Código de barras, Nome e Preço de venda são obrigatórios." };
    }

    const session = await getSession();
    let companyId = session?.companyId;
    if (!companyId) {
      const company = await getOrCreateCompany();
      companyId = company.id;
    }

    // 1. Checa se o produto já existe nesta empresa
    const cleanBarcode = barcode.trim();
    const existing = await prisma.product.findFirst({
      where: { barcode: cleanBarcode, companyId },
    });

    if (existing) {
      // Atualiza o estoque adicionando a quantidade e opcionalmente o preço
      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: {
          stock: { increment: stock || 1 },
          price: price > 0 ? price : existing.price,
          cost: cost > 0 ? cost : existing.cost,
        },
      });
      revalidatePath("/stock");
      revalidatePath("/pdv");
      return { success: true, updated: true, product: serializeProduct(updated), message: `Estoque do produto "${existing.name}" atualizado (+${stock} ${existing.unit}).` };
    }

    // 2. Se informou categoria, busca ou cria
    let categoryId: string | null = null;
    if (categoryName) {
      let cat = await prisma.category.findFirst({
        where: { name: { equals: categoryName, mode: "insensitive" }, companyId },
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: { name: categoryName, companyId },
        });
      }
      categoryId = cat.id;
    }

    // 3. Regras Fiscais automáticas da empresa + inferência por NCM/nome
    const inferredFiscal = inferNcmAndCategory(name, brand);
    const resolvedNcm = ncm || inferredFiscal.ncm || "";
    const resolvedCest = cest || inferredFiscal.cest || null;
    let cfop = cfopInput || inferredFiscal.cfop || "5102";
    let cst = cstInput || inferredFiscal.cst || "102";
    let icmsRate = 0;
    let pisRate = 0;
    let cofinsRate = 0;
    let ibsRate = 0;
    let cbsRate = 0;
    let isRate = 0;

    if (resolvedNcm) {
      try {
        const activeGrid = await prisma.taxGrid.findFirst({
          where: { companyId, active: true },
          include: { rules: true },
        });
        if (activeGrid && activeGrid.rules.length > 0) {
          const rule =
            activeGrid.rules.find((r) => r.ncmPattern === resolvedNcm) ||
            activeGrid.rules.find((r) => r.ncmPattern.includes("*") && resolvedNcm.startsWith(r.ncmPattern.replace("*", ""))) ||
            activeGrid.rules.find((r) => r.ncmPattern === "*");
          if (rule) {
            if (rule.cfopOrigin) cfop = rule.cfopOrigin;
            if (rule.cstIcms || rule.csosn) cst = rule.csosn || rule.cstIcms || "102";
            icmsRate = Number(rule.icmsRate) || 0;
            pisRate = Number(rule.pisRate) || 0;
            cofinsRate = Number(rule.cofinsRate) || 0;
            ibsRate = Number(rule.ibsRate) || 0;
            cbsRate = Number(rule.cbsRate) || 0;
            isRate = Number(rule.isRate) || 0;
          }
        }
      } catch (_) {}
    }

    // 4. Criação do Produto
    const newProduct = await prisma.product.create({
      data: {
        name,
        barcode: cleanBarcode,
        price,
        cost: cost || null,
        stock: stock || 0,
        unit: unit || "UN",
        brand: brand || null,
        ncm: resolvedNcm || null,
        cest: resolvedCest,
        cfop,
        cst,
        origin: "0",
        icmsRate,
        pisRate,
        cofinsRate,
        ibsRate,
        cbsRate,
        isRate,
        categoryId: categoryId || undefined,
        companyId,
      },
    });

    revalidatePath("/stock");
    revalidatePath("/pdv");
    return { success: true, created: true, product: serializeProduct(newProduct), message: `Produto "${name}" cadastrado com sucesso!` };
  } catch (err: any) {
    return { error: err.message || "Erro ao cadastrar produto por código de barras." };
  }
}

function serializeProduct(p: any): any {
  if (!p) return p;
  const factor = Number(p.unitConvFactor || 1);
  const isFractionalChild = Boolean(p.parentProductId && p.parentProduct && factor > 0);
  const effectiveStock = computeEffectiveStock(p);
  return {
    ...p,
    stock: effectiveStock,
    rawStock: Number(p.stock || 0),
    parentProductName: p.parentProduct?.name || null,
    parentProductUnit: p.parentProduct?.unit || null,
    parentProductStock: p.parentProduct ? Number(p.parentProduct.stock || 0) : null,
    isFractionalChild,
    yieldPerParent:
      p.parentProductId && factor > 0 ? Math.round((1 / factor) * 100) / 100 : null,
    price: Number(p.price),
    cost: p.cost !== null && p.cost !== undefined ? Number(p.cost) : null,
    // Flags & Balança
    showInDigitalMenu: p.showInDigitalMenu ?? false,
    sendToScale: p.sendToScale ?? false,
    scaleDays: p.scaleDays ?? 0,
    scaleDept: p.scaleDept ?? 1,
    // Pesos & Dimensões (Decimal -> number)
    grossWeight: p.grossWeight !== null && p.grossWeight !== undefined ? Number(p.grossWeight) : null,
    netWeight: p.netWeight !== null && p.netWeight !== undefined ? Number(p.netWeight) : null,
    width: p.width !== null && p.width !== undefined ? Number(p.width) : null,
    height: p.height !== null && p.height !== undefined ? Number(p.height) : null,
    depth: p.depth !== null && p.depth !== undefined ? Number(p.depth) : null,
    // Saída
    icmsRate: p.icmsRate !== null && p.icmsRate !== undefined ? Number(p.icmsRate) : null,
    icmsRedBaseRate: p.icmsRedBaseRate !== null && p.icmsRedBaseRate !== undefined ? Number(p.icmsRedBaseRate) : null,
    pisRate: p.pisRate !== null && p.pisRate !== undefined ? Number(p.pisRate) : null,
    cofinsRate: p.cofinsRate !== null && p.cofinsRate !== undefined ? Number(p.cofinsRate) : null,
    ipiRate: p.ipiRate !== null && p.ipiRate !== undefined ? Number(p.ipiRate) : null,
    fecoepRate: p.fecoepRate !== null && p.fecoepRate !== undefined ? Number(p.fecoepRate) : null,
    ibsRate: p.ibsRate !== null && p.ibsRate !== undefined ? Number(p.ibsRate) : null,
    cbsRate: p.cbsRate !== null && p.cbsRate !== undefined ? Number(p.cbsRate) : null,
    isRate: p.isRate !== null && p.isRate !== undefined ? Number(p.isRate) : null,
    // Entrada
    icmsRateIn: p.icmsRateIn !== null && p.icmsRateIn !== undefined ? Number(p.icmsRateIn) : null,
    icmsRedBaseRateIn: p.icmsRedBaseRateIn !== null && p.icmsRedBaseRateIn !== undefined ? Number(p.icmsRedBaseRateIn) : null,
    fecoepRateIn: p.fecoepRateIn !== null && p.fecoepRateIn !== undefined ? Number(p.fecoepRateIn) : null,
    pisRateIn: p.pisRateIn !== null && p.pisRateIn !== undefined ? Number(p.pisRateIn) : null,
    cofinsRateIn: p.cofinsRateIn !== null && p.cofinsRateIn !== undefined ? Number(p.cofinsRateIn) : null,
    ipiRateIn: p.ipiRateIn !== null && p.ipiRateIn !== undefined ? Number(p.ipiRateIn) : null,
    // Ficha Técnica (quando incluída)
    ...(p.recipe !== undefined
      ? {
          recipe: p.recipe
            ? {
                ...p.recipe,
                items: (p.recipe.items || []).map((item: any) => ({
                  ...item,
                  itemRole: item.itemRole || "INGREDIENT",
                  product: item.product ? serializeProduct(item.product) : undefined,
                })),
              }
            : null,
        }
      : {}),
  };
}

async function applyPromoPrices(products: any[]) {
  try {
    const now = new Date();
    const activePromos = await prisma.campaign.findMany({
      where: {
        type: "PROMO",
        active: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      }
    });

    if (activePromos.length === 0) return products;

    const promoPrices: Record<string, number> = {};
    for (const promo of activePromos) {
      try {
        const rules = promo.rules ? JSON.parse(promo.rules) : null;
        if (rules && rules.productPrices) {
          Object.assign(promoPrices, rules.productPrices);
        }
      } catch (_) {}
    }

    return products.map(p => {
      if (promoPrices[p.id] !== undefined) {
        return {
          ...p,
          originalPrice: p.price,
          price: promoPrices[p.id]
        };
      }
      return p;
    });
  } catch (_) {
    return products;
  }
}

export async function getProducts(options?: { includeInactive?: boolean }) {
  try {
    const session = await getSession();
    const companyId = session?.companyId;
    const products = await prisma.product.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(options?.includeInactive ? {} : { active: true }),
      },
      include: {
        category: true,
        parentProduct: {
          select: { id: true, name: true, stock: true, unit: true },
        },
        recipe: {
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' }
    });
    const serialized = products.map(serializeProduct);
    const withPromo = await applyPromoPrices(serialized);
    return { products: withPromo };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar produtos", products: [] };
  }
}

export async function getProductById(productId: string) {
  try {
    const session = await getSession();
    let companyId = session?.companyId;
    if (!companyId) {
      const company = await getOrCreateCompany();
      companyId = company.id;
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, companyId },
      include: {
        category: true,
        parentProduct: {
          select: { id: true, name: true, stock: true, unit: true },
        },
        recipe: {
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!product) {
      return { product: null, error: "Produto não encontrado." };
    }

    const serialized = serializeProduct(product);
    const [withPromo] = await applyPromoPrices([serialized]);
    return { product: withPromo };
  } catch (err: any) {
    return { product: null, error: err.message || "Erro ao buscar produto" };
  }
}

export async function getIngredientAndPackagingCatalog() {
  try {
    const session = await getSession();
    let companyId = session?.companyId;
    if (!companyId) {
      const company = await getOrCreateCompany();
      companyId = company.id;
    }

    const products = await prisma.product.findMany({
      where: { companyId },
      include: { category: true },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      products: products.map((p) => {
        const catName = (p.category?.name || "").toLowerCase();
        const nameLower = (p.name || "").toLowerCase();
        const suggestedRole: "INGREDIENT" | "PACKAGING" =
          p.isPackaging ||
          catName.includes("embalag") ||
          catName.includes("descart") ||
          /copo|tampa|sacola|saco|pote|caixa|embalag|canudo|guardanapo|colher|garfo|mexedor|pazinha/.test(
            nameLower
          )
            ? "PACKAGING"
            : "INGREDIENT";

        return {
          id: p.id,
          name: p.name,
          barcode: p.barcode || null,
          internalCode: p.internalCode || null,
          unit: p.unitSale || p.unit || "UN",
          cost: p.cost !== null && p.cost !== undefined ? Number(p.cost) : 0,
          price: Number(p.price || 0),
          stock: Number(p.stock || 0),
          isRawMaterial: Boolean(p.isRawMaterial),
          isPackaging: Boolean(p.isPackaging),
          isFinishedGood: Boolean(p.isFinishedGood),
          isSelfProduced: Boolean(p.isSelfProduced),
          categoryName: p.category?.name || "Geral",
          suggestedRole,
        };
      }),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro ao carregar catálogo de insumos e embalagens",
      products: [],
    };
  }
}

export async function searchProducts(query: string, companyIdParam?: string) {
  try {
    const session = await getSession();
    const companyId = companyIdParam || session?.companyId;

    const products = await prisma.product.findMany({
      where: {
        AND: [
          companyId ? { companyId } : {},
          { active: true },
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { barcode: { contains: query } },
              { internalCode: { contains: query } },
              { sku: { contains: query, mode: "insensitive" } },
            ]
          }
        ]
      },
      include: {
        parentProduct: {
          select: { id: true, name: true, stock: true, unit: true },
        },
      },
      take: 30
    });
    const serialized = products.map(serializeProduct);
    const withPromo = await applyPromoPrices(serialized);
    return { products: withPromo };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar produtos", products: [] };
  }
}

export async function getProductByBarcode(barcode: string, companyIdParam?: string) {
  try {
    const session = await getSession();
    const companyId = companyIdParam || session?.companyId;

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode },
          { internalCode: barcode },
        ],
        ...(companyId ? { companyId } : {})
      },
      include: {
        parentProduct: {
          select: { id: true, name: true, stock: true, unit: true },
        },
      },
    });
    if (!product) return { product: null };
    const serialized = serializeProduct(product);
    const [withPromo] = await applyPromoPrices([serialized]);
    return { product: withPromo };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar produto" };
  }
}

export async function getFullCatalogForOfflineSync(companyIdParam?: string) {
  try {
    const session = await getSession();
    let companyId = companyIdParam || session?.companyId;
    if (!companyId) {
      const firstComp = await prisma.company.findFirst();
      companyId = firstComp?.id;
    }

    const products = await prisma.product.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        parentProduct: {
          select: { id: true, name: true, stock: true, unit: true },
        },
      },
      orderBy: { name: "asc" }
    });
    const serialized = products.map(serializeProduct);
    const withPromo = await applyPromoPrices(serialized);
    return { success: true, count: withPromo.length, products: withPromo };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao sincronizar catálogo", products: [] };
  }
}

export async function getProductsByCategory(categoryName: string) {
  try {
    const session = await getSession();
    let companyId = session?.companyId;
    if (!companyId) {
      const comp = await prisma.company.findFirst();
      companyId = comp?.id;
    }

    const parentInclude = {
      parentProduct: {
        select: { id: true, name: true, stock: true, unit: true },
      },
    };

    if (categoryName === "Todos") {
      const products = await prisma.product.findMany({
        where: companyId ? { companyId } : undefined,
        include: parentInclude,
        orderBy: { name: 'asc' },
        take: 30
      });
      return { products: products.map(serializeProduct) };
    }

    const category = await prisma.category.findFirst({
      where: {
        name: { equals: categoryName, mode: 'insensitive' },
        ...(companyId ? { companyId } : {})
      }
    });

    if (!category) {
      // Busca por aproximação no nome ou produtos que contenham a categoria
      const products = await prisma.product.findMany({
        where: {
          OR: [
            { category: { name: { contains: categoryName, mode: 'insensitive' } } },
            { name: { contains: categoryName, mode: 'insensitive' } }
          ],
          ...(companyId ? { companyId } : {})
        },
        include: parentInclude,
        take: 20
      });
      return { products: products.map(serializeProduct) };
    }

    const products = await prisma.product.findMany({
      where: {
        categoryId: category.id,
        ...(companyId ? { companyId } : {})
      },
      include: parentInclude,
      orderBy: { name: 'asc' }
    });

    return { products: products.map(serializeProduct) };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar produtos por categoria", products: [] };
  }
}

/**
 * Cria um produto fracionado ("Cigarro Avulso", "Dose de Whisky 50ml", etc.) vinculado a um produto pai (maço, garrafa).
 * Quando vendido no PDV ou Venda Direta, o estoque deduzido é `quantidade * unitConvFactor` no produto pai.
 */
export async function createFractionalVariantAction(input: {
  parentProductId: string;
  name: string;
  unit?: string;
  yieldPerParent: number;
  price: number;
  barcode?: string;
  internalCode?: string;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Sessão inválida ou empresa não identificada." };
    }
    const companyId = session.companyId;

    const parent = await prisma.product.findFirst({
      where: { id: input.parentProductId, companyId },
    });
    if (!parent) {
      return { success: false, error: "Produto pai não encontrado nesta empresa." };
    }

    const name = (input.name || "").trim();
    const yieldQty = Number(input.yieldPerParent);
    const price = Number(input.price);
    if (!name) return { success: false, error: "Informe o nome da fração / dose / unidade." };
    if (!Number.isFinite(yieldQty) || yieldQty <= 0) {
      return { success: false, error: "Informe o rendimento por embalagem pai maior que zero." };
    }
    if (!Number.isFinite(price) || price <= 0) {
      return { success: false, error: "Informe o preço de venda maior que zero." };
    }

    const cleanBarcode = input.barcode?.trim() || null;
    if (cleanBarcode) {
      const conflictBarcode = await prisma.product.findFirst({
        where: { barcode: cleanBarcode, companyId },
        select: { id: true, name: true },
      });
      if (conflictBarcode) {
        return {
          success: false,
          error: `Já existe um produto nesta empresa com o código de barras ${cleanBarcode} (${conflictBarcode.name}).`,
        };
      }
    }

    let internalCode = input.internalCode?.trim() || null;
    if (!internalCode) {
      // Gera próximo código curto numérico (PLU / atalho PDV) único
      const allCodes = await prisma.product.findMany({
        where: { companyId, internalCode: { not: null } },
        select: { internalCode: true },
      });
      let maxNum = 900;
      for (const item of allCodes) {
        const parsed = parseInt(String(item.internalCode || ""), 10);
        if (Number.isFinite(parsed) && parsed > maxNum && parsed < 90000) {
          maxNum = parsed;
        }
      }
      internalCode = String(maxNum + 1).padStart(4, "0");
    } else {
      const conflictCode = await prisma.product.findFirst({
        where: { internalCode, companyId },
        select: { id: true, name: true },
      });
      if (conflictCode) {
        return {
          success: false,
          error: `Já existe um produto com o código interno ${internalCode} (${conflictCode.name}).`,
        };
      }
    }

    const unitConvFactor = Number((1 / yieldQty).toFixed(6));
    const unitCost =
      parent.cost !== null && parent.cost !== undefined
        ? Number((Number(parent.cost) / yieldQty).toFixed(4))
        : null;
    const unit = (input.unit || "UN").trim().toUpperCase() || "UN";

    const created = await prisma.product.create({
      data: {
        companyId,
        name,
        barcode: cleanBarcode,
        internalCode,
        price,
        cost: unitCost,
        stock: 0, // Estoque calculado dinamicamente pelo produto pai
        unit,
        unitPurchase: parent.unitSale || parent.unit || "UN",
        unitSale: unit,
        unitConvFactor,
        unitsPerPack: yieldQty,
        parentProductId: parent.id,
        categoryId: parent.categoryId,
        brand: parent.brand,
        manufacturer: parent.manufacturer,
        ncm: parent.ncm,
        cest: parent.cest,
        cfop: parent.cfop,
        cst: parent.cst,
        origin: parent.origin || "0",
        icmsRate: parent.icmsRate,
        icmsRedBaseRate: parent.icmsRedBaseRate,
        pisRate: parent.pisRate,
        cstPis: parent.cstPis,
        cofinsRate: parent.cofinsRate,
        cstCofins: parent.cstCofins,
        ibsRate: parent.ibsRate,
        cbsRate: parent.cbsRate,
        isRate: parent.isRate,
      },
      include: {
        parentProduct: {
          select: { id: true, name: true, stock: true, unit: true },
        },
        category: true,
      },
    });

    revalidatePath("/stock");
    revalidatePath("/pdv");
    revalidatePath("/pricing");
    revalidatePath("/labels");
    revalidatePath("/reports");

    return {
      success: true,
      product: serializeProduct(created),
      message: `"${created.name}" criado (Cód. PDV: ${internalCode}) vinculado a "${parent.name}". Cada venda baixa ${(unitConvFactor * 100).toFixed(2)}% de 1 ${parent.unit || "UN"} do pai.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro ao criar produto fracionado.",
    };
  }
}

export async function seedSampleCategoryProducts() {
  // Desativado: o sistema utiliza exclusivamente os dados reais importados da empresa
  return { success: true, count: 0 };
}

export async function deleteProductSafe(productId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { success: false, error: "Sessão inválida ou empresa não identificada." };
    }

    const existing = await prisma.product.findFirst({
      where: { id: productId, companyId: session.companyId },
      include: {
        _count: {
          select: {
            saleItems: true,
            orderItems: true,
            stockEntryItems: true,
            purchaseItems: true,
            losses: true,
          },
        },
      },
    });
    if (!existing) {
      return { success: false, error: "Produto não encontrado nesta empresa." };
    }

    const refs =
      existing._count.saleItems +
      existing._count.orderItems +
      existing._count.stockEntryItems +
      existing._count.purchaseItems +
      existing._count.losses;

    if (refs > 0) {
      return {
        success: false,
        error: `Este produto possui histórico vinculado (${existing._count.saleItems} venda(s), ${existing._count.stockEntryItems} entrada(s), ${existing._count.losses} avaria(s)). Exclua os lançamentos antes ou edite o cadastro.`,
      };
    }

    await prisma.product.delete({ where: { id: existing.id } });
    revalidatePath("/stock");
    revalidatePath("/pricing");
    revalidatePath("/labels");
    revalidatePath("/pdv");
    revalidatePath("/scales");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao excluir produto." };
  }
}

export async function batchStandardizeProductNamesAction(
  updates: { id: string; name: string }[]
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { ok: false, error: "Não autorizado." };
    }
    const companyId = session.companyId;
    const validUpdates = (updates || []).filter(
      (u) => u && u.id && typeof u.name === "string" && u.name.trim().length > 0
    );
    if (validUpdates.length === 0) {
      return { ok: true, updatedCount: 0 };
    }

    for (let i = 0; i < validUpdates.length; i += 50) {
      const chunk = validUpdates.slice(i, i + 50);
      await prisma.$transaction(
        chunk.map((u) =>
          prisma.product.updateMany({
            where: { id: u.id, companyId },
            data: { name: u.name.trim() },
          })
        )
      );
    }

    revalidatePath("/stock");
    revalidatePath("/pdv");
    revalidatePath("/scales");
    return { ok: true, updatedCount: validUpdates.length };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao padronizar descrições." };
  }
}

async function lookupManufacturerNameByEan(ean: string): Promise<{
  manufacturerName: string;
  brand: string;
  source: string;
} | null> {
  const popular = POPULAR_BR_PRODUCTS[ean];
  if (popular?.name) {
    return { manufacturerName: popular.name, brand: popular.brand || "", source: "Catálogo Brasil" };
  }

  const cosmosToken = process.env.COSMOS_TOKEN;
  if (cosmosToken) {
    try {
      const res = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${ean}`, {
        headers: { "X-Cosmos-Token": cosmosToken },
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.description) {
          return {
            manufacturerName: String(data.description).trim(),
            brand: String(data.brand?.name || "").trim(),
            source: "Bluesoft Cosmos",
          };
        }
      }
    } catch {}
  }

  const si5Token = process.env.SI5_TOKEN;
  if (si5Token) {
    try {
      const res = await fetch(`https://global.si5.com.br/api/produtos/${ean}`, {
        headers: { Authorization: `Bearer ${si5Token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const rawData = await res.json();
        const item = rawData?.produto || rawData?.data || rawData;
        const nm = String(item?.descricao || item?.nome || item?.description || "").trim();
        if (nm) {
          return {
            manufacturerName: nm,
            brand: String(item?.marca || item?.brand || "").trim(),
            source: "SI5 Base Nacional",
          };
        }
      }
    } catch {}
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=product_name,product_name_pt,brands,quantity`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.status === 1 && data.product) {
        const p = data.product;
        const rawName = String(p.product_name_pt || p.product_name || "").trim();
        const brand = String(p.brands || "").split(",")[0].trim();
        const qty = String(p.quantity || "").trim();
        const fullName = [rawName, qty].filter(Boolean).join(" ").trim();
        if (fullName) {
          return { manufacturerName: fullName, brand, source: "Open Food Facts" };
        }
      }
    }
  } catch {}

  try {
    const res = await fetch(
      `https://world.openbeautyfacts.org/api/v2/product/${ean}?fields=product_name,product_name_pt,brands,quantity`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.status === 1 && data.product) {
        const p = data.product;
        const rawName = String(p.product_name_pt || p.product_name || "").trim();
        const brand = String(p.brands || "").split(",")[0].trim();
        const qty = String(p.quantity || "").trim();
        const fullName = [rawName, qty].filter(Boolean).join(" ").trim();
        if (fullName) {
          return { manufacturerName: fullName, brand, source: "Open Beauty Facts" };
        }
      }
    }
  } catch {}

  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${ean}`, {
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      const first = data?.items?.[0];
      if (first?.title) {
        return {
          manufacturerName: String(first.title).trim(),
          brand: String(first.brand || "").trim(),
          source: "UPCitemdb Mundial",
        };
      }
    }
  } catch {}

  return null;
}

export async function enrichProductDescriptionsByEanAction(
  items: { id: string; name: string; barcode?: string | null; brand?: string | null }[]
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { ok: false, error: "Não autorizado.", results: [] };
    }
    const batch = (items || []).slice(0, 20);
    const results = await Promise.all(
      batch.map(async (item) => {
        const ean = (item.barcode || "").replace(/\D/g, "");
        if (ean.length >= 8) {
          const found = await lookupManufacturerNameByEan(ean);
          if (found) {
            return {
              id: item.id,
              newName: standardizeProductName(found.manufacturerName, found.brand || item.brand),
              source: found.source,
              manufacturerName: found.manufacturerName,
            };
          }
        }
        return {
          id: item.id,
          newName: standardizeProductName(item.name, item.brand),
          source: "Padrão Local",
          manufacturerName: null as string | null,
        };
      })
    );
    return { ok: true, results };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao consultar bases.", results: [] };
  }
}

export async function toggleProductActiveAction(productId: string, active: boolean) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { ok: false, error: "Não autorizado." };
    }
    const companyId = session.companyId;
    const updated = await prisma.product.updateMany({
      where: { id: productId, companyId },
      data: { active },
    });
    if (updated.count === 0) {
      return { ok: false, error: "Produto não encontrado nesta empresa." };
    }
    revalidatePath("/stock");
    revalidatePath("/pdv");
    revalidatePath("/scales");
    revalidatePath("/production");
    revalidatePath("/restaurant/recipes");
    return { ok: true, active };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao alterar status do produto." };
  }
}

export async function batchToggleProductActiveAction(productIds: string[], active: boolean) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { ok: false, error: "Não autorizado." };
    }
    const companyId = session.companyId;
    const uniqueIds = Array.from(new Set(productIds)).filter(Boolean);
    if (uniqueIds.length === 0) {
      return { ok: true, updatedCount: 0 };
    }

    const res = await prisma.product.updateMany({
      where: { companyId, id: { in: uniqueIds } },
      data: { active },
    });

    revalidatePath("/stock");
    revalidatePath("/pdv");
    revalidatePath("/scales");
    revalidatePath("/production");
    revalidatePath("/restaurant/recipes");
    return { ok: true, updatedCount: res.count, active };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao atualizar status em lote." };
  }
}


