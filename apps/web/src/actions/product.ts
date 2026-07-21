"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";

async function getOrCreateCompany() {
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: { name: "Emporio Default", document: "00.000.000/0001-00" }
    });
  }
  return company;
}

export async function createProduct(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const barcode = formData.get("barcode") as string;
    const price = parseFloat(formData.get("price") as string);
    const stock = parseFloat(formData.get("stock") as string) || 0;
    const ncm = formData.get("ncm") as string;
    const cest = formData.get("cest") as string;
    const cfop = formData.get("cfop") as string;
    const cst = formData.get("cst") as string;
    const origin = (formData.get("origin") as string) || "0";
    const icmsRate = parseFloat(formData.get("icmsRate") as string) || 0;
    const icmsRedBaseRate = parseFloat(formData.get("icmsRedBaseRate") as string) || 0;
    const cstPis = (formData.get("cstPis") as string) || null;
    const pisRate = parseFloat(formData.get("pisRate") as string) || 0;
    const cstCofins = (formData.get("cstCofins") as string) || null;
    const cofinsRate = parseFloat(formData.get("cofinsRate") as string) || 0;
    const cstIpi = (formData.get("cstIpi") as string) || null;
    const ipiRate = parseFloat(formData.get("ipiRate") as string) || 0;
    const fecoepRate = parseFloat(formData.get("fecoepRate") as string) || 0;
    const ibsRate = parseFloat(formData.get("ibsRate") as string) || 0;
    const cbsRate = parseFloat(formData.get("cbsRate") as string) || 0;
    const isRate = parseFloat(formData.get("isRate") as string) || 0;
    // Entrada (compra)
    const cfopIn = (formData.get("cfopIn") as string) || null;
    const cstIn = (formData.get("cstIn") as string) || null;
    const icmsRateIn = parseFloat(formData.get("icmsRateIn") as string) || 0;
    const icmsRedBaseRateIn = parseFloat(formData.get("icmsRedBaseRateIn") as string) || 0;
    const fecoepRateIn = parseFloat(formData.get("fecoepRateIn") as string) || 0;
    const cstPisIn = (formData.get("cstPisIn") as string) || null;
    const pisRateIn = parseFloat(formData.get("pisRateIn") as string) || 0;
    const cstCofinsIn = (formData.get("cstCofinsIn") as string) || null;
    const cofinsRateIn = parseFloat(formData.get("cofinsRateIn") as string) || 0;
    const cstIpiIn = (formData.get("cstIpiIn") as string) || null;
    const ipiRateIn = parseFloat(formData.get("ipiRateIn") as string) || 0;
    const isSelfProduced = formData.get("isSelfProduced") === "true";
    let internalCode = formData.get("internalCode") as string;
    const parentProductId = formData.get("parentProductId") as string || undefined;

    if (!name || isNaN(price)) return { error: "Nome e Preço são obrigatórios e válidos" };

    const company = await getOrCreateCompany();
    const companyId = company.id;

    // Geração automática de código interno de 5 dígitos para produtos de fabricação própria
    if (isSelfProduced && !internalCode) {
      const lastProduct = await prisma.product.findFirst({
        where: { companyId, isSelfProduced: true, internalCode: { not: null } },
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

    await prisma.product.create({
      data: {
        name,
        barcode: barcode || undefined,
        price,
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
        isSelfProduced,
        internalCode: internalCode || null,
        parentProductId,
        companyId,
      }
    });

    revalidatePath("/stock");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar produto" };
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

export async function getProductInfoByAiBarcode(barcode: string) {
  const cleanBarcode = barcode.trim();
  let resultTemplate: any = null;

  // 1. Tenta Cosmos Bluesoft primeiro porque ele costuma retornar NCM (importante para os impostos)
  try {
    const res = await fetch(
      `https://api.cosmos.bluesoft.com.br/gtins/${cleanBarcode}`,
      {
        headers: { "X-Cosmos-Token": "" },
        next: { revalidate: 3600 },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.description) {
        resultTemplate = {
          success: true,
          source: "Cosmos Bluesoft",
          name: data.description,
          price: 0,
          cost: 0,
          ncm: data.ncm?.code || "",
          cest: "",
          cfop: "5102",
          cst: "102",
          ibsRate: 0,
          cbsRate: 0,
          isRate: 0,
          unit: data.unit_of_measurement || "UN",
          description: `Marca: ${data.brand?.name || "—"} | Mercado: ${data.gtins?.[0]?.commercial_unit?.type_packaging || "—"}`,
        };
      }
    }
  } catch (_) {}

  // 2. Tenta Open Food Facts caso não tenha encontrado no Cosmos
  if (!resultTemplate) {
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}?fields=product_name,product_name_pt,brands,quantity,categories_tags,nutriments`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const p = data.product;
          const name = (p.product_name_pt || p.product_name || "").trim();
          const brand = (p.brands || "").split(",")[0].trim();
          const qty = (p.quantity || "").trim();
          const fullName = [brand, name, qty].filter(Boolean).join(" ").trim();
          if (fullName) {
            resultTemplate = {
              success: true,
              source: "Open Food Facts",
              name: fullName,
              price: 0,
              cost: 0,
              ncm: "",
              cest: "",
              cfop: "5102",
              cst: "102",
              ibsRate: 0,
              cbsRate: 0,
              isRate: 0,
              unit: "UN",
              description: `Produto identificado via Open Food Facts. Código EAN: ${cleanBarcode}`,
            };
          }
        }
      }
    } catch (_) {}
  }

  // Se encontrou produto e NCM, aplica regras de impostos automáticas
  if (resultTemplate) {
    if (resultTemplate.ncm) {
      try {
        const company = await getOrCreateCompany();
        const activeGrid = await prisma.taxGrid.findFirst({
          where: { companyId: company.id, active: true },
          include: { rules: true }
        });

        if (activeGrid && activeGrid.rules.length > 0) {
          // Prioriza regra exata, depois regra por prefixo (*), por fim fallback geral (*)
          const rule = activeGrid.rules.find(r => r.ncmPattern === resultTemplate.ncm) ||
                       activeGrid.rules.find(r => r.ncmPattern.includes("*") && resultTemplate.ncm.startsWith(r.ncmPattern.replace("*", ""))) ||
                       activeGrid.rules.find(r => r.ncmPattern === "*");

          if (rule) {
            if (rule.cfopOrigin) resultTemplate.cfop = rule.cfopOrigin;
            // Usa CST de ICMS ou CSOSN dependendo do que estiver configurado
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
    return resultTemplate;
  }

  // 3. Fallback — retorna sem nome para o usuário preencher manualmente
  return {
    success: false,
    error: `Produto não encontrado nas bases públicas para o EAN ${cleanBarcode}. Preencha o nome manualmente.`,
  };
}

/**
 * Consulta real de código de barras na internet — usado pelo PDV.
 * Busca primeiro no banco local, depois nas APIs públicas.
 */
export async function lookupBarcodeOnline(barcode: string): Promise<{
  found: boolean;
  name?: string;
  source?: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
}> {
  const ean = barcode.trim();

  // 1. Open Food Facts
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=product_name,product_name_pt,brands,quantity,image_url`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = (p.product_name_pt || p.product_name || "").trim();
        const brand = (p.brands || "").split(",")[0].trim();
        const quantity = (p.quantity || "").trim();
        if (name || brand) {
          const fullName = [brand, name, quantity].filter(Boolean).join(" ").trim();
          return { found: true, name: fullName, source: "Open Food Facts", brand, quantity, imageUrl: p.image_url };
        }
      }
    }
  } catch (_) {}

  // 2. Cosmos Bluesoft
  try {
    const res = await fetch(
      `https://api.cosmos.bluesoft.com.br/gtins/${ean}`,
      { headers: { "X-Cosmos-Token": "" }, next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.description) {
        return {
          found: true,
          name: data.description,
          source: "Cosmos",
          brand: data.brand?.name,
          quantity: data.gtins?.[0]?.commercial_unit?.type_packaging,
        };
      }
    }
  } catch (_) {}

  return { found: false };
}

function serializeProduct(p: any) {
  if (!p) return p;
  return {
    ...p,
    price: Number(p.price),
    cost: p.cost ? Number(p.cost) : null,
    // Saída
    icmsRate: p.icmsRate ? Number(p.icmsRate) : null,
    icmsRedBaseRate: p.icmsRedBaseRate ? Number(p.icmsRedBaseRate) : null,
    pisRate: p.pisRate ? Number(p.pisRate) : null,
    cofinsRate: p.cofinsRate ? Number(p.cofinsRate) : null,
    ipiRate: p.ipiRate ? Number(p.ipiRate) : null,
    fecoepRate: p.fecoepRate ? Number(p.fecoepRate) : null,
    ibsRate: p.ibsRate ? Number(p.ibsRate) : null,
    cbsRate: p.cbsRate ? Number(p.cbsRate) : null,
    isRate: p.isRate ? Number(p.isRate) : null,
    // Entrada
    icmsRateIn: p.icmsRateIn ? Number(p.icmsRateIn) : null,
    icmsRedBaseRateIn: p.icmsRedBaseRateIn ? Number(p.icmsRedBaseRateIn) : null,
    fecoepRateIn: p.fecoepRateIn ? Number(p.fecoepRateIn) : null,
    pisRateIn: p.pisRateIn ? Number(p.pisRateIn) : null,
    cofinsRateIn: p.cofinsRateIn ? Number(p.cofinsRateIn) : null,
    ipiRateIn: p.ipiRateIn ? Number(p.ipiRateIn) : null,
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

export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const serialized = products.map(serializeProduct);
    const withPromo = await applyPromoPrices(serialized);
    return { products: withPromo };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar produtos", products: [] };
  }
}

export async function searchProducts(query: string) {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { barcode: { contains: query } }
        ]
      },
      take: 10
    });
    const serialized = products.map(serializeProduct);
    const withPromo = await applyPromoPrices(serialized);
    return { products: withPromo };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar produtos", products: [] };
  }
}

export async function getProductByBarcode(barcode: string) {
  try {
    const product = await prisma.product.findFirst({
      where: { barcode }
    });
    if (!product) return { product: null };
    const serialized = serializeProduct(product);
    const [withPromo] = await applyPromoPrices([serialized]);
    return { product: withPromo };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar produto" };
  }
}

