"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";

// Search products for label printing
export async function searchProductsForLabels(query: string) {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { barcode: { contains: query } },
          { id: { contains: query } },
        ],
      },
      take: 20,
      orderBy: { name: "asc" },
    });
    return { products: products.map(p => ({ ...p, price: Number(p.price), cost: Number(p.cost) })) };
  } catch (err: any) {
    return { error: err.message, products: [] };
  }
}

// Get products with pending labels (price changed after last label print)
export async function getProductsPendingLabels() {
  try {
    const products = await prisma.product.findMany({
      where: {
        priceChangedAt: { not: null },
        OR: [
          { labelPrintedAt: null },
          // SQLite doesn't support direct column comparison in where,
          // so we fetch all price-changed products and filter in JS
        ],
      },
      orderBy: { priceChangedAt: "desc" },
    });

    // Filter: priceChangedAt > labelPrintedAt (or labelPrintedAt is null)
    const pending = products.filter(p => {
      if (!p.priceChangedAt) return false;
      if (!p.labelPrintedAt) return true;
      return p.priceChangedAt > p.labelPrintedAt;
    });

    return {
      products: pending.map(p => ({
        ...p,
        price: Number(p.price),
        cost: Number(p.cost),
      })),
    };
  } catch (err: any) {
    return { error: err.message, products: [] };
  }
}

// Mark products as label-printed
export async function markLabelsAsPrinted(productIds: string[]) {
  try {
    await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { labelPrintedAt: new Date() },
    });
    revalidatePath("/labels");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// Update product price (and track the change)
export async function updateProductPrice(productId: string, newPrice: number) {
  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        price: newPrice,
        priceChangedAt: new Date(),
      },
    });
    revalidatePath("/labels");
    revalidatePath("/stock");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// Get all products (for general listing)
export async function getAllProducts() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });
    return {
      products: products.map(p => ({
        ...p,
        price: Number(p.price),
        cost: Number(p.cost),
      })),
    };
  } catch (err: any) {
    return { error: err.message, products: [] };
  }
}
