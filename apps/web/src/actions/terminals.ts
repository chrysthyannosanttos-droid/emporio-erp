"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function getTerminals() {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Não autorizado", terminals: [] };
  }

  try {
    const terminals = await prisma.pdvTerminal.findMany({
      where: { companyId: session.companyId },
      include: {
        store: {
          select: { id: true, name: true, code: true, city: true, state: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, terminals };
  } catch (err) {
    console.error("Erro ao listar terminais:", err);
    return { error: "Erro ao buscar terminais", terminals: [] };
  }
}

export async function getCompanyStores() {
  const session = await getSession();
  if (!session || !session.companyId) {
    return [];
  }

  try {
    const stores = await prisma.store.findMany({
      where: { companyId: session.companyId, active: true },
      select: { id: true, name: true, code: true, city: true, tradeName: true },
      orderBy: { code: "asc" }
    });
    return stores;
  } catch (err) {
    console.error("Erro ao buscar lojas:", err);
    return [];
  }
}

export async function pairTerminal(data: {
  code: string;
  storeId: string;
  name: string;
  cashierNumber: number;
}) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const cleanCode = data.code.trim().toUpperCase();
  if (!cleanCode) {
    return { error: "O código de ativação é obrigatório." };
  }

  if (!data.storeId) {
    return { error: "Selecione a loja/filial do grupo." };
  }

  try {
    // 1. Verificar se a loja pertence a esta empresa
    const store = await prisma.store.findFirst({
      where: { id: data.storeId, companyId: session.companyId }
    });

    if (!store) {
      return { error: "Loja selecionada não pertence à sua empresa." };
    }

    const token = crypto.randomBytes(32).toString("hex");

    // 2. Buscar terminal pelo código
    const existing = await prisma.pdvTerminal.findUnique({
      where: { code: cleanCode }
    });

    let terminal;
    if (existing) {
      terminal = await prisma.pdvTerminal.update({
        where: { id: existing.id },
        data: {
          companyId: session.companyId,
          storeId: data.storeId,
          name: data.name.trim() || `Caixa ${data.cashierNumber || 1}`,
          cashierNumber: Number(data.cashierNumber) || 1,
          status: "ACTIVE",
          pairedAt: new Date(),
          lastHeartbeat: new Date(),
          token
        },
        include: { store: true }
      });
    } else {
      // Se o usuário digitou o código manualmente antes do PDV registrar
      terminal = await prisma.pdvTerminal.create({
        data: {
          code: cleanCode,
          companyId: session.companyId,
          storeId: data.storeId,
          name: data.name.trim() || `Caixa ${data.cashierNumber || 1}`,
          cashierNumber: Number(data.cashierNumber) || 1,
          status: "ACTIVE",
          pairedAt: new Date(),
          lastHeartbeat: new Date(),
          token
        },
        include: { store: true }
      });
    }

    revalidatePath("/settings/terminals");
    return { success: true, terminal };
  } catch (err) {
    console.error("Erro ao parear terminal:", err);
    return { error: `Erro ao vincular terminal: ${String(err)}` };
  }
}

export async function deleteTerminal(id: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Não autorizado" };
  }

  try {
    const terminal = await prisma.pdvTerminal.findFirst({
      where: { id, companyId: session.companyId }
    });

    if (!terminal) {
      return { error: "Terminal não encontrado." };
    }

    await prisma.pdvTerminal.delete({
      where: { id }
    });

    revalidatePath("/settings/terminals");
    return { success: true };
  } catch (err) {
    console.error("Erro ao deletar terminal:", err);
    return { error: `Erro ao remover terminal: ${String(err)}` };
  }
}
