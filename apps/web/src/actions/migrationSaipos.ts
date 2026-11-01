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
 * 3. Importa Produtos a partir de XMLs de Notas Emitidas no Saipos (NFC-e / NF-e)
 */
export async function importSaiposXmls(xmlContents: string[]) {
  try {
    const companyId = await resolveCompanyId();
    if (!companyId) {
      return { success: false, error: "Empresa não autenticada." };
    }

    const itemsMap = new Map<string, SaiposProductItem>();

    for (const xml of xmlContents) {
      // Extração regex de tags <det> e <prod> padrão SEFAZ Brasil
      const prodRegex = /<prod>([\s\S]*?)<\/prod>/gi;
      let match;

      while ((match = prodRegex.exec(xml)) !== null) {
        const prodBlock = match[1];

        const getTag = (tag: string) => {
          const m = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "i").exec(prodBlock);
          return m ? m[1].trim() : "";
        };

        const name = getTag("xProd");
        const price = parseFloat(getTag("vUnCom"));
        const barcode = getTag("cEAN") !== "SEM GTIN" ? getTag("cEAN") : "";
        const ncm = getTag("NCM");
        const unit = getTag("uCom");
        const qty = parseFloat(getTag("qCom")) || 1;

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

    const items = Array.from(itemsMap.values());
    if (items.length === 0) {
      return { success: false, error: "Nenhum produto válido encontrado nos XMLs fornecidos." };
    }

    return await importSaiposProducts(items);
  } catch (err: any) {
    console.error("Erro importando XMLs Saipos:", err);
    return { success: false, error: err.message || "Erro ao processar XMLs." };
  }
}

