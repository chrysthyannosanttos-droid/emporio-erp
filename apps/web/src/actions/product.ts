"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

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
    const costRaw = parseFloat(formData.get("cost") as string);
    const cost = Number.isFinite(costRaw) ? costRaw : null;
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
    const sendToScale = formData.get("sendToScale") === "true";
    const scaleDaysRaw = parseInt(formData.get("scaleDays") as string, 10);
    const scaleDays = isNaN(scaleDaysRaw) ? 0 : scaleDaysRaw;
    const scaleDeptRaw = parseInt(formData.get("scaleDept") as string, 10);
    const scaleDept = isNaN(scaleDeptRaw) ? 1 : scaleDeptRaw;
    let internalCode = (formData.get("internalCode") as string)?.trim() || null;
    const unit = (formData.get("unit") as string) || (sendToScale ? "KG" : "UN");
    const parentProductId = formData.get("parentProductId") as string || undefined;

    const categoryId = (formData.get("categoryId") as string) || null;

    if (!name || isNaN(price)) return { error: "Nome e Preço são obrigatórios e válidos" };

    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou empresa não identificada." };
    }
    const companyId = session.companyId;

    // Se informou código de balança / interno, verifica duplicidade na mesma empresa
    if (internalCode) {
      const existingWithCode = await prisma.product.findFirst({
        where: { internalCode, companyId }
      });
      if (existingWithCode) {
        return { error: `O código de balança ${internalCode} já está cadastrado para o produto "${existingWithCode.name}".` };
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

    // Campos Multissetoriais (Distribuição / Indústria / Logística)
    const sku = (formData.get("sku") as string) || null;
    const brand = (formData.get("brand") as string) || null;
    const manufacturer = (formData.get("manufacturer") as string) || null;
    const unitPurchase = (formData.get("unitPurchase") as string) || null;
    const unitSale = (formData.get("unitSale") as string) || null;
    const unitConvFactor = parseFloat(formData.get("unitConvFactor") as string) || 1;
    const packagingType = (formData.get("packagingType") as string) || null;
    const unitsPerPack = parseFloat(formData.get("unitsPerPack") as string) || 1;
    const minOrderQty = parseFloat(formData.get("minOrderQty") as string) || 1;
    const grossWeight = formData.get("grossWeight") ? parseFloat(formData.get("grossWeight") as string) : null;
    const netWeight = formData.get("netWeight") ? parseFloat(formData.get("netWeight") as string) : null;
    const width = formData.get("width") ? parseFloat(formData.get("width") as string) : null;
    const height = formData.get("height") ? parseFloat(formData.get("height") as string) : null;
    const depth = formData.get("depth") ? parseFloat(formData.get("depth") as string) : null;
    const isRawMaterial = formData.get("isRawMaterial") === "true";
    const isFinishedGood = formData.get("isFinishedGood") === "true";
    const isPackaging = formData.get("isPackaging") === "true";
    const minStock = parseFloat(formData.get("minStock") as string) || 0;
    const maxStock = formData.get("maxStock") ? parseFloat(formData.get("maxStock") as string) : null;
    const leadTimeDays = parseInt(formData.get("leadTimeDays") as string, 10) || 0;

    await prisma.product.create({
      data: {
        name,
        barcode: barcode || undefined,
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
        // Novos campos multissetoriais
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
        minStock,
        maxStock,
        leadTimeDays,
      }
    });

    revalidatePath("/stock");
    revalidatePath("/scales");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar produto" };
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou empresa não identificada." };
    }
    const companyId = session.companyId;

    const name = formData.get("name") as string;
    const barcode = (formData.get("barcode") as string)?.trim() || null;
    const price = parseFloat(formData.get("price") as string);
    const costRaw = parseFloat(formData.get("cost") as string);
    const cost = Number.isFinite(costRaw) ? costRaw : null;
    const stock = parseFloat(formData.get("stock") as string) || 0;
    const unit = (formData.get("unit") as string) || "UN";
    const categoryId = (formData.get("categoryId") as string) || null;

    const sendToScale = formData.get("sendToScale") === "true";
    const scaleDaysRaw = parseInt(formData.get("scaleDays") as string, 10);
    const scaleDays = isNaN(scaleDaysRaw) ? 0 : scaleDaysRaw;
    const scaleDeptRaw = parseInt(formData.get("scaleDept") as string, 10);
    const scaleDept = isNaN(scaleDeptRaw) ? 1 : scaleDeptRaw;
    const internalCode = (formData.get("internalCode") as string)?.trim() || null;
    const isSelfProduced = formData.get("isSelfProduced") === "true";

    if (!name || isNaN(price)) {
      return { error: "Nome e Preço são obrigatórios e válidos" };
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
        return { error: `O código de balança ${internalCode} já pertence ao produto "${existing.name}".` };
      }
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        barcode,
        price,
        cost,
        stock,
        unit,
        categoryId: categoryId || undefined,
        sendToScale,
        scaleDays,
        scaleDept,
        internalCode,
        isSelfProduced,
      }
    });

    revalidatePath("/stock");
    revalidatePath("/scales");
    return { success: true };
  } catch (err: any) {
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
const POPULAR_BR_PRODUCTS: Record<string, { name: string; brand: string; ncm: string; unit: string; category: string; price?: number; cost?: number }> = {
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
};

function inferNcmAndCategory(name: string, brand?: string): { ncm: string; category: string } {
  const text = `${name} ${brand || ""}`.toLowerCase();

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
      cest: "",
      cfop: "5102",
      cst: "102",
      ibsRate: 0,
      cbsRate: 0,
      isRate: 0,
      unit: popular.unit || "UN",
      categorySuggested: popular.category,
      description: `Produto identificado no catálogo brasileiro. Código EAN: ${cleanBarcode}`,
    };
  }

  // 2. Se houver token do Cosmos Bluesoft configurado, consulta a API do Cosmos
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
          resultTemplate = {
            success: true,
            source: "Bluesoft Cosmos",
            name: data.description,
            brand: data.brand?.name || "",
            price: data.avg_price ? Number(data.avg_price) : 0,
            cost: data.avg_price ? Number((data.avg_price * 0.7).toFixed(2)) : 0,
            ncm: data.ncm?.code || "",
            cest: data.cest?.code || "",
            cfop: "5102",
            cst: "102",
            ibsRate: 0,
            cbsRate: 0,
            isRate: 0,
            unit: data.unit_of_measurement || "UN",
            imageUrl: data.thumbnail || data.picture_url || null,
            description: `Marca: ${data.brand?.name || "—"} | NCM: ${data.ncm?.code || "—"}`,
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

  // Se encontrou produto, ajusta NCM se estiver vazio e aplica a grade tributária
  if (resultTemplate) {
    if (!resultTemplate.ncm) {
      const inferred = inferNcmAndCategory(resultTemplate.name, resultTemplate.brand);
      resultTemplate.ncm = inferred.ncm;
      if (!resultTemplate.categorySuggested) {
        resultTemplate.categorySuggested = inferred.category;
      }
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
    return resultTemplate;
  }

  // 5. Fallback — não localizado
  return {
    success: false,
    error: `Produto não encontrado nas bases para o código ${cleanBarcode}. Preencha os dados manualmente.`,
  };
}

/**
 * Consulta real de código de barras na internet — usado pelo PDV e Estoque.
 * Busca primeiro no banco local, depois nas APIs públicas.
 */
export async function lookupBarcodeOnline(barcode: string): Promise<{
  found: boolean;
  name?: string;
  source?: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
  ncm?: string;
  price?: number;
  cost?: number;
  unit?: string;
  categorySuggested?: string;
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
      price: info.price,
      cost: info.cost,
      unit: info.unit,
      categorySuggested: info.categorySuggested,
    };
  }

  return { found: false };
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
  brand?: string;
  unit?: string;
  categoryName?: string;
}) {
  try {
    const { barcode, name, price, cost = 0, stock = 1, ncm = "", brand = "", unit = "UN", categoryName } = data;
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

    // 3. Regras Fiscais automáticas da empresa
    let cfop = "5102";
    let cst = "102";
    let icmsRate = 0;
    let pisRate = 0;
    let cofinsRate = 0;
    let ibsRate = 0;
    let cbsRate = 0;
    let isRate = 0;

    if (ncm) {
      try {
        const activeGrid = await prisma.taxGrid.findFirst({
          where: { companyId, active: true },
          include: { rules: true },
        });
        if (activeGrid && activeGrid.rules.length > 0) {
          const rule =
            activeGrid.rules.find((r) => r.ncmPattern === ncm) ||
            activeGrid.rules.find((r) => r.ncmPattern.includes("*") && ncm.startsWith(r.ncmPattern.replace("*", ""))) ||
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
        ncm: ncm || null,
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

function serializeProduct(p: any) {
  if (!p) return p;
  return {
    ...p,
    price: Number(p.price),
    cost: p.cost ? Number(p.cost) : null,
    // Balança
    sendToScale: p.sendToScale ?? false,
    scaleDays: p.scaleDays ?? 0,
    scaleDept: p.scaleDept ?? 1,
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

export async function searchProducts(query: string, companyIdParam?: string) {
  try {
    const session = await getSession();
    const companyId = companyIdParam || session?.companyId;

    const products = await prisma.product.findMany({
      where: {
        AND: [
          companyId ? { companyId } : {},
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { barcode: { contains: query } },
              { internalCode: { contains: query } }
            ]
          }
        ]
      },
      take: 20
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
        barcode,
        ...(companyId ? { companyId } : {})
      }
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

    if (categoryName === "Todos") {
      const products = await prisma.product.findMany({
        where: companyId ? { companyId } : undefined,
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
        take: 20
      });
      return { products: products.map(serializeProduct) };
    }

    const products = await prisma.product.findMany({
      where: {
        categoryId: category.id,
        ...(companyId ? { companyId } : {})
      },
      orderBy: { name: 'asc' }
    });

    return { products: products.map(serializeProduct) };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar produtos por categoria", products: [] };
  }
}

export async function seedSampleCategoryProducts() {
  try {
    const session = await getSession();
    let companyId = session?.companyId;
    if (!companyId) {
      let company = await prisma.company.findFirst();
      if (!company) {
        company = await prisma.company.create({
          data: { name: "Emporio Modelo", document: "12.345.678/0001-99" }
        });
      }
      companyId = company.id;
    }

    const SAMPLE_CATEGORIES = [
      {
        name: "Bebidas",
        products: [
          { name: "Refrigerante Coca-Cola Lata 350ml", price: 5.50, cost: 3.20, barcode: "7894900010015", stock: 120, ncm: "2202.10.00", unit: "UN" },
          { name: "Refrigerante Guaraná Antarctica 2L", price: 8.90, cost: 5.40, barcode: "7891991000821", stock: 80, ncm: "2202.10.00", unit: "UN" },
          { name: "Cerveja Heineken Long Neck 330ml", price: 7.99, cost: 5.10, barcode: "7891055312783", stock: 150, ncm: "2203.00.00", unit: "UN" },
          { name: "Água Mineral Crystal Sem Gás 500ml", price: 2.50, cost: 1.10, barcode: "7894900530018", stock: 200, ncm: "2201.10.00", unit: "UN" },
          { name: "Suco de Laranja Integral Prats 900ml", price: 12.90, cost: 8.50, barcode: "7898944520023", stock: 45, ncm: "2009.89.90", unit: "UN" }
        ]
      },
      {
        name: "Alimentos",
        products: [
          { name: "Arroz Branco Tipo 1 Tio João 5kg", price: 29.90, cost: 22.50, barcode: "7896001000011", stock: 90, ncm: "1006.30.21", unit: "UN" },
          { name: "Feijão Carioca Tipo 1 Camil 1kg", price: 8.90, cost: 5.80, barcode: "7896001000028", stock: 110, ncm: "0713.33.99", unit: "UN" },
          { name: "Café Torrado e Moído Tradicional Pilão 500g", price: 17.50, cost: 12.00, barcode: "7896004000308", stock: 65, ncm: "0901.21.00", unit: "UN" },
          { name: "Óleo de Soja Refinado Soya 900ml", price: 6.89, cost: 4.90, barcode: "7896005800114", stock: 140, ncm: "1507.90.11", unit: "UN" },
          { name: "Biscoito Recheado Oreo Chocolate 90g", price: 3.80, cost: 2.20, barcode: "7622300742186", stock: 95, ncm: "1905.31.00", unit: "UN" }
        ]
      },
      {
        name: "Higiene",
        products: [
          { name: "Creme Dental Colgate Total 12 90g", price: 6.90, cost: 4.20, barcode: "7891035800071", stock: 85, ncm: "3306.10.00", unit: "UN" },
          { name: "Sabonete em Barra Dove Original 90g", price: 4.50, cost: 2.60, barcode: "7891150006785", stock: 130, ncm: "3401.11.90", unit: "UN" },
          { name: "Desodorante Rexona Aerosol Masculino 150ml", price: 15.90, cost: 9.90, barcode: "7791293022567", stock: 60, ncm: "3307.20.10", unit: "UN" },
          { name: "Shampoo Pantene Restauração 400ml", price: 21.90, cost: 14.20, barcode: "7500435118934", stock: 40, ncm: "3305.10.00", unit: "UN" },
          { name: "Papel Higiênico Neve Folha Dupla 12 Rolos", price: 24.90, cost: 16.80, barcode: "7896007543210", stock: 75, ncm: "4818.10.00", unit: "UN" }
        ]
      },
      {
        name: "Limpeza",
        products: [
          { name: "Detergente Líquido Ypê Neutro 500ml", price: 2.89, cost: 1.65, barcode: "7891022100139", stock: 180, ncm: "3402.20.00", unit: "UN" },
          { name: "Sabão em Pó Omo Lavagem Perfeita 800g", price: 14.90, cost: 9.80, barcode: "7896000701018", stock: 70, ncm: "3401.19.00", unit: "UN" },
          { name: "Água Sanitária Q-Boa 1L", price: 4.20, cost: 2.50, barcode: "7896003000019", stock: 95, ncm: "2828.90.11", unit: "UN" },
          { name: "Desinfetante Pinho Sol Original 1L", price: 11.50, cost: 7.30, barcode: "7891035000129", stock: 55, ncm: "3808.94.19", unit: "UN" },
          { name: "Amaciante de Roupas Comfort Concentrado 1L", price: 18.90, cost: 12.40, barcode: "7891150043216", stock: 50, ncm: "3809.91.90", unit: "UN" }
        ]
      },
      {
        name: "Utilidades",
        products: [
          { name: "Papel Alumínio Wyda 30cm x 7,5m", price: 5.90, cost: 3.60, barcode: "7896223300108", stock: 40, ncm: "7607.11.90", unit: "UN" },
          { name: "Esponja Multiuso Scotch-Brite", price: 2.50, cost: 1.30, barcode: "7891040001012", stock: 160, ncm: "3924.90.00", unit: "UN" },
          { name: "Copo Descartável 200ml Caixa c/ 100un", price: 6.50, cost: 3.80, barcode: "7898234123456", stock: 80, ncm: "3924.10.00", unit: "CX" },
          { name: "Guardanapo de Papel Snob 50un", price: 3.90, cost: 2.10, barcode: "7896007541117", stock: 90, ncm: "4818.30.00", unit: "UN" },
          { name: "Saco para Lixo Reforçado 50L c/ 10un", price: 8.90, cost: 5.20, barcode: "7898901234567", stock: 65, ncm: "3923.21.90", unit: "PCT" }
        ]
      }
    ];

    let insertedCount = 0;

    for (const catData of SAMPLE_CATEGORIES) {
      // Find or create category
      let category = await prisma.category.findFirst({
        where: {
          name: { equals: catData.name, mode: 'insensitive' },
          companyId
        }
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            name: catData.name,
            companyId
          }
        });
      }

      for (const prod of catData.products) {
        // Upsert product by barcode or name
        const existing = await prisma.product.findFirst({
          where: {
            OR: [
              { barcode: prod.barcode },
              { name: prod.name }
            ],
            companyId
          }
        });

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: prod.name,
              price: prod.price,
              cost: prod.cost,
              stock: prod.stock,
              barcode: prod.barcode,
              unit: prod.unit,
              ncm: prod.ncm,
              categoryId: category.id
            }
          });
        } else {
          await prisma.product.create({
            data: {
              name: prod.name,
              price: prod.price,
              cost: prod.cost,
              stock: prod.stock,
              barcode: prod.barcode,
              unit: prod.unit,
              ncm: prod.ncm,
              categoryId: category.id,
              companyId
            }
          });
        }
        insertedCount++;
      }
    }

    revalidatePath("/stock");
    revalidatePath("/pdv");
    return { success: true, count: insertedCount };
  } catch (err: any) {
    return { error: err.message || "Erro ao gerar produtos de teste" };
  }
}


