"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getDeliveryRoutes() {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado", routes: [], vehicles: [], drivers: [] };

    const [routes, vehicles, drivers] = await Promise.all([
      prisma.deliveryRoute.findMany({
        where: { companyId: session.companyId },
        include: {
          vehicle: true,
          driver: true,
          stops: {
            include: {
              order: {
                select: { id: true, orderNumber: true, total: true, customer: { select: { name: true, address: true } } },
              },
            },
            orderBy: { sequence: "asc" },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.vehicle.findMany({ where: { companyId: session.companyId } }),
      prisma.driver.findMany({ where: { companyId: session.companyId } }),
    ]);

    return { routes, vehicles, drivers };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar rotas de entrega", routes: [], vehicles: [], drivers: [] };
  }
}

export async function createDeliveryRoute(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado" };

    const name = formData.get("name") as string;
    const dateStr = formData.get("date") as string;
    const vehicleId = (formData.get("vehicleId") as string) || null;
    const driverId = (formData.get("driverId") as string) || null;
    const notes = (formData.get("notes") as string) || null;

    if (!name || !dateStr) {
      return { error: "Nome da rota e data são obrigatórios." };
    }

    const route = await prisma.deliveryRoute.create({
      data: {
        name,
        date: new Date(dateStr),
        vehicleId,
        driverId,
        notes,
        companyId: session.companyId,
      },
    });

    revalidatePath("/distribution/routes");
    return { success: true, route };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar rota de entrega" };
  }
}

export async function addStopToRoute(data: { routeId: string; orderId: string; sequence: number }) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado" };

    const stop = await prisma.routeStop.create({
      data: {
        routeId: data.routeId,
        orderId: data.orderId,
        sequence: data.sequence,
      },
    });

    // Atualizar status do pedido para IN_TRANSIT
    await prisma.order.update({
      where: { id: data.orderId },
      data: { status: "IN_TRANSIT" },
    });

    revalidatePath("/distribution/routes");
    return { success: true, stop };
  } catch (err: any) {
    return { error: err.message || "Erro ao adicionar parada na rota" };
  }
}

export async function updateStopStatus(stopId: string, status: string, notes?: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado" };

    const stop = await prisma.routeStop.update({
      where: { id: stopId },
      data: {
        status,
        notes: notes || null,
        deliveredAt: status === "DELIVERED" ? new Date() : null,
      },
    });

    if (status === "DELIVERED") {
      await prisma.order.update({
        where: { id: stop.orderId },
        data: { status: "DELIVERED" },
      });
    }

    revalidatePath("/distribution/routes");
    revalidatePath("/distribution/orders");
    return { success: true, stop };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar status da entrega" };
  }
}
