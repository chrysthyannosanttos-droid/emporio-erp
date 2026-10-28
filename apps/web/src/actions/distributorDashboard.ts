"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";

export async function getDistributorDashboardStats() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return {
        error: "Não autorizado",
        stats: { faturamentoB2B: 0, pedidosAbertos: 0, entregasPendentes: 0, ticketMedio: 0 },
      };
    }

    const companyId = session.companyId;

    const [orders, pendingRoutes] = await Promise.all([
      prisma.order.findMany({
        where: { companyId },
        select: { total: true, status: true, createdAt: true },
      }),
      prisma.deliveryRoute.count({
        where: { companyId, status: { in: ["PENDING", "IN_ROUTE"] } },
      }),
    ]);

    const faturamentoB2B = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const pedidosAbertos = orders.filter((o) => o.status === "CONFIRMED" || o.status === "PICKING" || o.status === "PICKED").length;
    const ticketMedio = orders.length > 0 ? faturamentoB2B / orders.length : 0;

    return {
      stats: {
        faturamentoB2B,
        pedidosAbertos,
        entregasPendentes: pendingRoutes,
        ticketMedio,
        totalPedidos: orders.length,
      },
    };
  } catch (err: any) {
    return {
      error: err.message,
      stats: { faturamentoB2B: 0, pedidosAbertos: 0, entregasPendentes: 0, ticketMedio: 0 },
    };
  }
}
