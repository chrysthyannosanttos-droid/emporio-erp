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

export async function getSellers() {
  try {
    const sellers = await prisma.seller.findMany({
      include: { user: true, _count: { select: { sales: true, orders: true } } },
      orderBy: { createdAt: "desc" }
    });
    return { sellers };
  } catch (err: any) {
    return { error: err.message, sellers: [] };
  }
}

export async function createSeller(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const email = formData.get("email") as string;
    const commission = parseFloat(formData.get("commission") as string) || 0;
    const goal = formData.get("goal") ? parseFloat(formData.get("goal") as string) : null;

    if (!name) return { error: "Nome é obrigatório" };

    const company = await getOrCreateCompany();

    // Create a user account for the seller
    const user = await prisma.user.create({
      data: {
        name,
        email: email || `${name.toLowerCase().replace(/\s+/g, ".")}@emporio.local`,
        password: "changeme123",
        role: "SELLER",
        companyId: company.id,
      }
    });

    await prisma.seller.create({
      data: {
        name,
        phone,
        email,
        commission,
        goal,
        companyId: company.id,
        userId: user.id,
      }
    });

    revalidatePath("/telesales");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar vendedor" };
  }
}

export async function getSellerPerformance() {
  try {
    const sellers = await prisma.seller.findMany({
      include: {
        sales: {
          include: { items: { include: { product: true } } },
        },
        orders: { include: { items: { include: { product: true } } } },
      }
    });

    const performance = sellers.map(seller => {
      const totalSold = seller.sales.reduce((acc, sale) => acc + Number(sale.total), 0);
      const totalCost = seller.sales.reduce((acc, sale) =>
        acc + sale.items.reduce((a, item) => a + (Number(item.product.cost || 0) * item.quantity), 0), 0
      );
      const margin = totalSold > 0 ? ((totalSold - totalCost) / totalSold) * 100 : 0;

      // Top products
      const productMap = new Map<string, { name: string; qty: number; revenue: number; cost: number }>();
      seller.sales.forEach(sale => {
        sale.items.forEach(item => {
          const existing = productMap.get(item.productId) || { name: item.product.name, qty: 0, revenue: 0, cost: 0 };
          productMap.set(item.productId, {
            name: item.product.name,
            qty: existing.qty + item.quantity,
            revenue: existing.revenue + Number(item.total),
            cost: existing.cost + (Number(item.product.cost || 0) * item.quantity),
          });
        });
      });

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(p => ({
          ...p,
          margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
        }));

      return {
        id: seller.id,
        name: seller.name,
        totalSold,
        margin,
        salesCount: seller.sales.length,
        goal: seller.goal ? Number(seller.goal) : null,
        topProducts,
      };
    });

    return { performance };
  } catch (err: any) {
    return { error: err.message, performance: [] };
  }
}
