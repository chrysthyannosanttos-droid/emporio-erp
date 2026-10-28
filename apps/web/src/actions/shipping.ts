"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getPickingLists() {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado", lists: [] };

    const lists = await prisma.pickingList.findMany({
      where: { companyId: session.companyId },
      include: {
        items: {
          include: {
            product: { select: { name: true, barcode: true, internalCode: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { lists };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar listas de separação", lists: [] };
  }
}

export async function updatePickingItemStatus(itemId: string, pickedQty: number) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado" };

    const item = await prisma.pickingListItem.findUnique({ where: { id: itemId } });
    if (!item) return { error: "Item não encontrado" };

    const status = pickedQty >= item.quantity ? "PICKED" : pickedQty > 0 ? "DIVERGENT" : "PENDING";

    await prisma.pickingListItem.update({
      where: { id: itemId },
      data: {
        pickedQty,
        status,
      },
    });

    revalidatePath("/distribution/shipping");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar item de expedição" };
  }
}

export async function updatePickingListStatus(listId: string, status: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { error: "Não autorizado" };

    const list = await prisma.pickingList.update({
      where: { id: listId, companyId: session.companyId },
      data: { status },
    });

    // Se a separação for finalizada (CHECKED ou PACKED), atualizar o status do pedido para PICKED
    if (status === "CHECKED" || status === "PACKED") {
      await prisma.order.update({
        where: { id: list.orderId },
        data: { status: "PICKED" },
      });
    }

    revalidatePath("/distribution/shipping");
    revalidatePath("/distribution/orders");
    return { success: true, list };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar status da expedição" };
  }
}
