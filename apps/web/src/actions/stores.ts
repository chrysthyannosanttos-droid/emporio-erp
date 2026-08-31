"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logAudit } from "./audit";

function toPlain<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, val) => {
      if (val !== null && typeof val === "object" && typeof (val as any).toNumber === "function") {
        return (val as any).toNumber();
      }
      if (typeof val === "bigint") return Number(val);
      return val;
    })
  );
}

export async function listStores() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { stores: [], error: "Sessão inválida" };
    }

    const stores = await prisma.store.findMany({
      where: { companyId: session.companyId },
      orderBy: { code: "asc" },
      include: {
        _count: {
          select: { userStores: true, approvalRequests: true }
        }
      }
    });

    return { stores: toPlain(stores) };
  } catch (err: any) {
    return { stores: [], error: err.message };
  }
}


export async function createStore(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.companyId || session.role !== "ADMIN") {
      return { error: "Apenas administradores podem cadastrar lojas." };
    }

    const code = (formData.get("code") as string)?.trim().toUpperCase();
    const name = (formData.get("name") as string)?.trim();
    const tradeName = (formData.get("tradeName") as string)?.trim() || null;
    const document = (formData.get("document") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const state = (formData.get("state") as string)?.trim() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;

    if (!code || !name) {
      return { error: "Código e Nome da Loja são obrigatórios." };
    }

    const existing = await prisma.store.findUnique({
      where: { companyId_code: { companyId: session.companyId, code } }
    });

    if (existing) {
      return { error: `Já existe uma loja com o código ${code}.` };
    }

    const store = await prisma.store.create({
      data: {
        companyId: session.companyId,
        code,
        name,
        tradeName,
        document,
        city,
        state,
        phone,
        active: true,
      }
    });

    await logAudit({
      operation: "stores.manage",
      action: "CREATE",
      entity: "Store",
      entityId: store.id,
      newValue: JSON.stringify({ code, name }),
      reason: "Cadastro de nova filial",
    });

    revalidatePath("/settings");
    revalidatePath("/settings/users");
    return { success: true, store };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar loja." };
  }
}

export async function updateStore(storeId: string, data: {
  name: string;
  tradeName?: string;
  document?: string;
  city?: string;
  state?: string;
  phone?: string;
  active?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session?.companyId || session.role !== "ADMIN") {
      return { error: "Apenas administradores podem editar lojas." };
    }

    const oldStore = await prisma.store.findFirst({
      where: { id: storeId, companyId: session.companyId }
    });

    if (!oldStore) {
      return { error: "Loja não encontrada." };
    }

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: {
        name: data.name,
        tradeName: data.tradeName || null,
        document: data.document || null,
        city: data.city || null,
        state: data.state || null,
        phone: data.phone || null,
        active: data.active !== undefined ? data.active : oldStore.active,
      }
    });

    await logAudit({
      operation: "stores.manage",
      action: "UPDATE",
      entity: "Store",
      entityId: storeId,
      oldValue: JSON.stringify({ name: oldStore.name, active: oldStore.active }),
      newValue: JSON.stringify({ name: updated.name, active: updated.active }),
      reason: "Atualização de dados da filial",
    });

    revalidatePath("/settings");
    return { success: true, store: updated };
  } catch (err: any) {
    return { error: err.message || "Erro ao atualizar loja." };
  }
}

export async function toggleStoreActive(storeId: string, active: boolean) {
  try {
    const session = await getSession();
    if (!session?.companyId || session.role !== "ADMIN") {
      return { error: "Não autorizado." };
    }

    await prisma.store.updateMany({
      where: { id: storeId, companyId: session.companyId },
      data: { active }
    });

    await logAudit({
      operation: "stores.manage",
      action: "UPDATE",
      entity: "Store",
      entityId: storeId,
      newValue: `Status: ${active ? "Ativo" : "Bloqueado"}`,
      reason: active ? "Reativação de loja" : "Bloqueio de loja",
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
