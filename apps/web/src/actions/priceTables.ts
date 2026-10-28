"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getPriceTables() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", tables: [] };
    }

    const tables = await prisma.priceTable.findMany({
      where: { companyId: session.companyId },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { tables };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar tabelas de preço", tables: [] };
  }
}

export async function createPriceTable(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou expirada" };
    }

    const name = formData.get("name") as string;
    const type = (formData.get("type") as string) || "FIXED";
    const description = (formData.get("description") as string) || null;

    if (!name) return { error: "Nome da tabela de preço é obrigatório" };

    const table = await prisma.priceTable.create({
      data: {
        name,
        type,
        description,
        companyId: session.companyId,
      },
    });

    revalidatePath("/distribution/price-tables");
    return { success: true, table };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar tabela de preço" };
  }
}

export async function getPriceTableItems(priceTableId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado", items: [] };

    const items = await prisma.priceTableItem.findMany({
      where: { priceTableId },
      include: {
        product: {
          select: { id: true, name: true, barcode: true, price: true, cost: true, unit: true },
        },
      },
      orderBy: { product: { name: "asc" } },
    });

    return { items };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar itens da tabela", items: [] };
  }
}

export async function savePriceTableItem(data: {
  priceTableId: string;
  productId: string;
  price: number;
  minQty?: number;
  maxDiscount?: number;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado" };

    await prisma.priceTableItem.upsert({
      where: {
        priceTableId_productId_minQty: {
          priceTableId: data.priceTableId,
          productId: data.productId,
          minQty: data.minQty || 0,
        },
      },
      update: {
        price: data.price,
        maxDiscount: data.maxDiscount || 0,
      },
      create: {
        priceTableId: data.priceTableId,
        productId: data.productId,
        price: data.price,
        minQty: data.minQty || 0,
        maxDiscount: data.maxDiscount || 0,
      },
    });

    revalidatePath("/distribution/price-tables");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao salvar item na tabela" };
  }
}

export async function deletePriceTable(id: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado" };

    await prisma.priceTable.delete({
      where: { id, companyId: session.companyId },
    });

    revalidatePath("/distribution/price-tables");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao excluir tabela de preço" };
  }
}
