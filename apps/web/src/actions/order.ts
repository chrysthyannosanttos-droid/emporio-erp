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

export async function getOrders(status?: string) {
  try {
    const orders = await prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        customer: true,
        seller: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" }
    });
    return { orders };
  } catch (err: any) {
    return { error: err.message, orders: [] };
  }
}

export async function createOrder(data: {
  customerId?: string;
  sellerId?: string;
  notes?: string;
  items: { productId: string; quantity: number; unitPrice: number; discount: number; cost: number }[];
}) {
  try {
    const company = await getOrCreateCompany();

    const subtotal = data.items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const discountTotal = data.items.reduce((acc, i) => acc + i.discount, 0);
    const total = subtotal - discountTotal;

    const order = await prisma.order.create({
      data: {
        subtotal,
        discount: discountTotal,
        total,
        notes: data.notes,
        customerId: data.customerId || null,
        sellerId: data.sellerId || null,
        companyId: company.id,
        status: "DRAFT",
        items: {
          create: data.items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
            total: (i.quantity * i.unitPrice) - i.discount,
            cost: i.cost,
          }))
        }
      },
      include: { items: { include: { product: true } }, customer: true, seller: true }
    });

    revalidatePath("/telesales");
    return { success: true, order };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar pedido" };
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    await prisma.order.update({ where: { id: orderId }, data: { status } });
    revalidatePath("/telesales");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getOrderById(id: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        seller: true,
        items: { include: { product: true } },
      }
    });
    return { order };
  } catch (err: any) {
    return { error: err.message };
  }
}
