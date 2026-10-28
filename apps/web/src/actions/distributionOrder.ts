"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getB2BOrders() {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado", orders: [] };

    const orders = await prisma.order.findMany({
      where: { companyId: session.companyId },
      include: {
        customer: { select: { id: true, name: true, document: true, phone: true } },
        seller: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { orders };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar pedidos B2B", orders: [] };
  }
}

export async function createB2BOrder(data: {
  customerId?: string;
  sellerId?: string;
  orderNumber?: string;
  paymentTerm?: string;
  freightType?: string;
  notes?: string;
  items: { productId: string; quantity: number; unitPrice: number; discount?: number }[];
}) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Sessão expirada ou inválida" };

    if (!data.items || data.items.length === 0) {
      return { error: "O pedido deve ter pelo menos 1 item." };
    }

    let subtotal = 0;
    let totalDiscount = 0;

    const orderItemsData = data.items.map((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = item.discount || 0;
      const itemTotal = itemSubtotal - itemDiscount;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: itemDiscount,
        total: itemTotal,
      };
    });

    const total = subtotal - totalDiscount;

    const order = await prisma.order.create({
      data: {
        companyId: session.companyId,
        customerId: data.customerId || null,
        sellerId: data.sellerId || null,
        orderNumber: data.orderNumber || null,
        paymentTerm: data.paymentTerm || "À vista",
        freightType: data.freightType || "CIF",
        notes: data.notes || null,
        subtotal,
        discount: totalDiscount,
        total,
        status: "CONFIRMED",
        items: {
          create: orderItemsData,
        },
      },
      include: { items: true },
    });

    // Se o pedido for confirmado, criar automaticamente a PickingList para a expedição
    await prisma.pickingList.create({
      data: {
        orderId: order.id,
        companyId: session.companyId,
        status: "PENDING",
        items: {
          create: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            pickedQty: 0,
            status: "PENDING",
          })),
        },
      },
    });

    revalidatePath("/distribution/orders");
    return { success: true, order };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar pedido B2B" };
  }
}

export async function updateB2BOrderStatus(orderId: string, status: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado" };

    const order = await prisma.order.update({
      where: { id: orderId, companyId: session.companyId },
      data: { status },
    });

    revalidatePath("/distribution/orders");
    return { success: true, order };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar status do pedido" };
  }
}
