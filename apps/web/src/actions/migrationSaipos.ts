"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

async function resolveCompanyId() {
  const session = await getSession();
  if (session?.companyId) return session.companyId;
  const firstCompany = await prisma.company.findFirst();
  return firstCompany?.id || null;
}

export interface SaiposProductItem {
  name: string;
  price: number;
  cost?: number;
  barcode?: string;
  categoryName?: string;
  stock?: number;
  unit?: string;
  ncm?: string;
}

export interface SaiposCustomerItem {
  name: string;
  phone?: string;
  document?: string;
  email?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  notes?: string;
}

export interface SaiposSupplierItem {
  name: string;
  tradeName?: string;
  document?: string;
  phone?: string;
  email?: string;
  stateReg?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  category?: string;
  notes?: string;
}

function formatBrDoc(digits: string): string {
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return digits;
}

/**
 * 1. Importa Produtos do Saipos (CSV ou Planilha)
 */
export async function importSaiposProducts(items: SaiposProductItem[]) {
  try {
    const companyId = await resolveCompanyId();
    if (!companyId) {
      return { success: false, error: "Empresa não autenticada." };
    }

    if (!items || items.length === 0) {
      return { success: false, error: "Nenhum produto enviado para importação." };
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Cache local de categorias da empresa
    const existingCategories = await prisma.category.findMany({
      where: { companyId },
    });
    const categoryMap = new Map<string, string>();
    existingCategories.forEach((cat) => {
      categoryMap.set(cat.name.trim().toLowerCase(), cat.id);
    });

    for (const item of items) {
      const cleanName = item.name?.trim();
      const cleanPrice = Number(item.price);

      if (!cleanName || isNaN(cleanPrice) || cleanPrice < 0) {
        skippedCount++;
        continue;
      }

      // 1. Categoria: localiza ou cria
      let categoryId: string | null = null;
      if (item.categoryName?.trim()) {
        const catKey = item.categoryName.trim().toLowerCase();
        if (categoryMap.has(catKey)) {
          categoryId = categoryMap.get(catKey)!;
        } else {
          const newCat = await prisma.category.create({
            data: {
              name: item.categoryName.trim(),
              companyId,
            },
          });
          categoryMap.set(catKey, newCat.id);
          categoryId = newCat.id;
        }
      }

      // 2. Busca por código de barras ou nome idêntico para evitar duplicados
      const cleanBarcode = item.barcode?.trim() || null;
      let existingProduct = null;

      if (cleanBarcode) {
        existingProduct = await prisma.product.findFirst({
          where: {
            companyId,
            barcode: cleanBarcode,
          },
        });
      }

      if (!existingProduct) {
        existingProduct = await prisma.product.findFirst({
          where: {
            companyId,
            name: { equals: cleanName, mode: "insensitive" },
          },
        });
      }

      if (existingProduct) {
        // Atualiza preço, custo e estoque
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            price: cleanPrice,
            cost: item.cost && !isNaN(Number(item.cost)) ? Number(item.cost) : existingProduct.cost,
            stock: item.stock && !isNaN(Number(item.stock)) ? Number(item.stock) : existingProduct.stock,
            ncm: item.ncm?.trim() || existingProduct.ncm,
            categoryId: categoryId || existingProduct.categoryId,
            barcode: cleanBarcode || existingProduct.barcode,
          },
        });
        updatedCount++;
      } else {
        // Cria novo produto
        await prisma.product.create({
          data: {
            name: cleanName,
            price: cleanPrice,
            cost: item.cost && !isNaN(Number(item.cost)) ? Number(item.cost) : null,
            stock: item.stock && !isNaN(Number(item.stock)) ? Number(item.stock) : 0,
            barcode: cleanBarcode,
            ncm: item.ncm?.trim() || "00000000",
            categoryId,
            companyId,
          },
        });
        createdCount++;
      }
    }

    revalidatePath("/stock");
    revalidatePath("/pdv");
    revalidatePath("/pricing");

    return {
      success: true,
      createdCount,
      updatedCount,
      skippedCount,
      totalProcessed: items.length,
    };
  } catch (err: any) {
    console.error("Erro importando produtos Saipos:", err);
    return { success: false, error: err.message || "Erro durante a importação." };
  }
}

/**
 * 2. Importa Clientes do Saipos (CSV ou Planilha)
 */
export async function importSaiposCustomers(items: SaiposCustomerItem[]) {
  try {
    const companyId = await resolveCompanyId();
    if (!companyId) {
      return { success: false, error: "Empresa não autenticada." };
    }

    if (!items || items.length === 0) {
      return { success: false, error: "Nenhum cliente enviado para importação." };
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      const cleanName = item.name?.trim();
      if (!cleanName) {
        skippedCount++;
        continue;
      }

      const cleanDoc = item.document?.replace(/\D/g, "") || null;
      const cleanPhone = item.phone?.trim() || null;

      // Monta endereço completo se fornecido bairro/cidade
      let fullAddress = item.address?.trim() || null;
      if (item.neighborhood || item.city) {
        fullAddress = [fullAddress, item.neighborhood, item.city].filter(Boolean).join(" - ");
      }

      let existingCustomer = null;
      if (cleanDoc) {
        existingCustomer = await prisma.customer.findFirst({
          where: { companyId, document: cleanDoc },
        });
      }
      if (!existingCustomer && cleanPhone) {
        existingCustomer = await prisma.customer.findFirst({
          where: { companyId, phone: cleanPhone },
        });
      }

      if (existingCustomer) {
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name: cleanName,
            address: fullAddress || existingCustomer.address,
            phone: cleanPhone || existingCustomer.phone,
            email: item.email?.trim() || existingCustomer.email,
          },
        });
        updatedCount++;
      } else {
        await prisma.customer.create({
          data: {
            name: cleanName,
            document: cleanDoc || "",
            phone: cleanPhone,
            email: item.email?.trim() || null,
            address: fullAddress,
            companyId,
          },
        });
        createdCount++;
      }
    }

    revalidatePath("/customers");

    return {
      success: true,
      createdCount,
      updatedCount,
      skippedCount,
      totalProcessed: items.length,
    };
  } catch (err: any) {
    console.error("Erro importando clientes Saipos:", err);
    return { success: false, error: err.message || "Erro durante a importação." };
  }
}

/**
 * 3. Importa Fornecedores Antigos do Saipos (CSV, Planilha ou XML)
 */
export async function importSaiposSuppliers(suppliers: SaiposSupplierItem[]) {
  try {
    const companyId = await resolveCompanyId();
    if (!companyId) {
      return { success: false, error: "Empresa não autenticada." };
    }

    if (!suppliers || suppliers.length === 0) {
      return { success: false, error: "Nenhum fornecedor enviado para importação." };
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of suppliers) {
      const cleanName = item.name?.trim();
      if (!cleanName) {
        skippedCount++;
        continue;
      }

      const rawDoc = item.document?.trim() || "";
      const docDigits = rawDoc.replace(/\D/g, "");
      const formattedDoc = docDigits ? formatBrDoc(docDigits) : "";

      let existingSupplier = null;
      if (docDigits) {
        existingSupplier = await prisma.supplier.findFirst({
          where: {
            companyId,
            OR: [
              { document: docDigits },
              { document: formattedDoc },
              ...(rawDoc ? [{ document: rawDoc }] : []),
            ],
          },
        });
      }

      if (!existingSupplier) {
        existingSupplier = await prisma.supplier.findFirst({
          where: {
            companyId,
            name: { equals: cleanName, mode: "insensitive" },
          },
        });
      }

      if (existingSupplier) {
        await prisma.supplier.update({
          where: { id: existingSupplier.id },
          data: {
            tradeName: item.tradeName?.trim() || existingSupplier.tradeName,
            document: existingSupplier.document || formattedDoc || rawDoc || null,
            phone: item.phone?.trim() || existingSupplier.phone,
            email: item.email?.trim() || existingSupplier.email,
            stateReg: item.stateReg?.trim() || existingSupplier.stateReg,
            zipCode: item.zipCode?.trim() || existingSupplier.zipCode,
            street: item.street?.trim() || existingSupplier.street,
            number: item.number?.trim() || existingSupplier.number,
            neighborhood: item.neighborhood?.trim() || existingSupplier.neighborhood,
            city: item.city?.trim() || existingSupplier.city,
            state: item.state?.trim() || existingSupplier.state,
            category: item.category?.trim() || existingSupplier.category || "Outros",
            notes: item.notes?.trim() || existingSupplier.notes,
            isLegacySaipos: true,
            legacySystem: "SAIPOS",
          },
        });
        updatedCount++;
      } else {
        await prisma.supplier.create({
          data: {
            companyId,
            name: cleanName,
            tradeName: item.tradeName?.trim() || null,
            document: formattedDoc || rawDoc || null,
            phone: item.phone?.trim() || null,
            email: item.email?.trim() || null,
            stateReg: item.stateReg?.trim() || null,
            zipCode: item.zipCode?.trim() || null,
            street: item.street?.trim() || null,
            number: item.number?.trim() || null,
            neighborhood: item.neighborhood?.trim() || null,
            city: item.city?.trim() || null,
            state: item.state?.trim() || null,
            category: item.category?.trim() || "Outros",
            notes: item.notes?.trim() || "Importado do sistema antigo Saipos",
            isLegacySaipos: true,
            legacySystem: "SAIPOS",
            status: "ACTIVE",
          },
        });
        createdCount++;
      }
    }

    revalidatePath("/suppliers");
    revalidatePath("/migration");

    return {
      success: true,
      createdCount,
      updatedCount,
      skippedCount,
      totalProcessed: suppliers.length,
    };
  } catch (err: any) {
    console.error("Erro importando fornecedores Saipos:", err);
    return { success: false, error: err.message || "Erro durante a importação de fornecedores." };
  }
}

/**
 * 4. Importa Produtos (e Fornecedores de entrada, quando presentes) a partir de XMLs do Saipos (NFC-e / NF-e)
 */
export async function importSaiposXmls(xmlContents: string[]) {
  try {
    const companyId = await resolveCompanyId();
    if (!companyId) {
      return { success: false, error: "Empresa não autenticada." };
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { document: true },
    });
    const companyDocDigits = (company?.document || "").replace(/\D/g, "");

    const itemsMap = new Map<string, SaiposProductItem>();
    const suppliersMap = new Map<string, SaiposSupplierItem>();

    const extractTag = (block: string, tag: string) => {
      const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
      return m ? m[1].trim() : "";
    };

    for (const xml of xmlContents) {
      // Extrair emitente quando for XML antigo de compra/fornecedor (CNPJ diferente da empresa atual)
      const emitMatch = /<emit>([\s\S]*?)<\/emit>/i.exec(xml);
      if (emitMatch) {
        const emitBlock = emitMatch[1];
        const emitDoc = (extractTag(emitBlock, "CNPJ") || extractTag(emitBlock, "CPF")).replace(/\D/g, "");
        const emitName = extractTag(emitBlock, "xNome");

        if (emitName && (!companyDocDigits || (emitDoc && emitDoc !== companyDocDigits))) {
          const enderBlock = /<enderEmit>([\s\S]*?)<\/enderEmit>/i.exec(emitBlock)?.[1] || emitBlock;
          const supplierKey = emitDoc || emitName.toLowerCase();
          if (!suppliersMap.has(supplierKey)) {
            suppliersMap.set(supplierKey, {
              name: emitName,
              tradeName: extractTag(emitBlock, "xFant") || undefined,
              document: emitDoc || undefined,
              stateReg: extractTag(emitBlock, "IE") || undefined,
              phone: extractTag(enderBlock, "fone") || undefined,
              email: extractTag(emitBlock, "email") || undefined,
              street: extractTag(enderBlock, "xLgr") || undefined,
              number: extractTag(enderBlock, "nro") || undefined,
              neighborhood: extractTag(enderBlock, "xBairro") || undefined,
              city: extractTag(enderBlock, "xMun") || undefined,
              state: extractTag(enderBlock, "UF") || undefined,
              zipCode: extractTag(enderBlock, "CEP") || undefined,
              notes: "Importado via XML antigo Saipos",
            });
          }
        }
      }

      // Extração regex de tags <det> e <prod> padrão SEFAZ Brasil
      const prodRegex = /<prod>([\s\S]*?)<\/prod>/gi;
      let match;

      while ((match = prodRegex.exec(xml)) !== null) {
        const prodBlock = match[1];

        const name = extractTag(prodBlock, "xProd");
        const price = parseFloat(extractTag(prodBlock, "vUnCom"));
        const rawEan = extractTag(prodBlock, "cEAN");
        const barcode = rawEan && rawEan !== "SEM GTIN" ? rawEan : "";
        const ncm = extractTag(prodBlock, "NCM");
        const unit = extractTag(prodBlock, "uCom");

        if (name && !isNaN(price) && price > 0) {
          const key = barcode || name.toLowerCase();
          if (!itemsMap.has(key)) {
            itemsMap.set(key, {
              name,
              price,
              barcode: barcode || undefined,
              ncm: ncm || undefined,
              unit: unit || "UN",
              stock: 0,
            });
          }
        }
      }
    }

    let suppliersCreated = 0;
    let suppliersUpdated = 0;
    if (suppliersMap.size > 0) {
      const supRes = await importSaiposSuppliers(Array.from(suppliersMap.values()));
      if (supRes.success) {
        suppliersCreated = supRes.createdCount || 0;
        suppliersUpdated = supRes.updatedCount || 0;
      }
    }

    const items = Array.from(itemsMap.values());
    if (items.length === 0 && suppliersMap.size === 0) {
      return { success: false, error: "Nenhum produto ou fornecedor válido encontrado nos XMLs fornecidos." };
    }

    if (items.length === 0) {
      return {
        success: true,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        totalProcessed: 0,
        suppliersCreated,
        suppliersUpdated,
      };
    }

    const prodRes = await importSaiposProducts(items);
    return {
      ...prodRes,
      suppliersCreated,
      suppliersUpdated,
    };
  } catch (err: any) {
    console.error("Erro importando XMLs Saipos:", err);
    return { success: false, error: err.message || "Erro ao processar XMLs." };
  }
}

