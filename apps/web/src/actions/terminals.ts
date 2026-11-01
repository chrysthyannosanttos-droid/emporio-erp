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
          select: { id: true, name: true, code: true, city: true, state: true },
        },
      },
      orderBy: { cashierNumber: "asc" },
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
      orderBy: { code: "asc" },
    });
    return stores;
  } catch (err) {
    console.error("Erro ao buscar lojas:", err);
    return [];
  }
}

/**
 * 1. Gera automaticamente um Código de Ativação na Nuvem para o Novo Caixa
 */
export async function createTerminalActivation(data: {
  cashierNumber: number;
  name?: string;
  storeId?: string;
}) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  try {
    const num = Number(data.cashierNumber) || 1;

    // Se não forneceu storeId, vincula à primeira loja ativa da empresa
    let targetStoreId = data.storeId;
    if (!targetStoreId) {
      const firstStore = await prisma.store.findFirst({
        where: { companyId: session.companyId, active: true },
      });
      targetStoreId = firstStore?.id;
    }

    // Gera um código de ativação amigável e único ex: CYBER-7419 (com verificação anti-colisão)
    let code = "";
    for (let i = 0; i < 10; i++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const candidate = `CYBER-${randomSuffix}`;
      const exists = await prisma.pdvTerminal.findUnique({ where: { code: candidate } });
      if (!exists) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      code = `CYBER-${Date.now().toString().slice(-4)}`;
    }
    const token = crypto.randomBytes(24).toString("hex");

    const terminal = await prisma.pdvTerminal.create({
      data: {
        code,
        name: data.name?.trim() || `Caixa ${String(num).padStart(2, "0")}`,
        cashierNumber: num,
        status: "PENDING",
        companyId: session.companyId,
        storeId: targetStoreId,
        token,
      },
      include: {
        store: true,
        company: {
          select: {
            id: true,
            name: true,
            tradeName: true,
            document: true,
          },
        },
      },
    });

    revalidatePath("/settings/terminals");
    return { success: true, terminal };
  } catch (err) {
    console.error("Erro gerando código de ativação de terminal:", err);
    return { error: `Erro ao criar terminal: ${String(err)}` };
  }
}

/**
 * 2. Ativação Online: Executada no PDV ao instalar ou abrir pela primeira vez
 * Valida o código pela internet e puxa automaticamente o número do caixa e a empresa
 */
export async function activateTerminalOnline(code: string) {
  const cleanCode = code?.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, error: "Digite o código de ativação do caixa." };
  }

  try {
    const terminal = await prisma.pdvTerminal.findFirst({
      where: {
        code: cleanCode,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            document: true,
            licenseStatus: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!terminal) {
      return {
        success: false,
        error: "Código de ativação não encontrado. Verifique se digitou corretamente ou gere um novo código na sua retaguarda.",
      };
    }

    if (terminal.company?.licenseStatus === "SUSPENDED" || terminal.company?.licenseStatus === "EXPIRED") {
      return {
        success: false,
        error: "A licença deste cliente está suspensa ou expirada. Contate o suporte para reativação.",
      };
    }

    // Marca como ativo com data e hora de pareamento
    const updated = await prisma.pdvTerminal.update({
      where: { id: terminal.id },
      data: {
        status: "ACTIVE",
        pairedAt: new Date(),
        lastHeartbeat: new Date(),
      },
    });

    return {
      success: true,
      terminal: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        cashierNumber: updated.cashierNumber,
        companyId: terminal.company?.id,
        companyName: terminal.company?.name || "Empresa Cliente",
        companyDocument: terminal.company?.document || "",
        storeId: terminal.store?.id,
        storeName: terminal.store?.name || "Loja Principal",
        token: updated.token,
      },
    };
  } catch (err: any) {
    console.error("Erro na ativação online do terminal:", err);
    return { success: false, error: err.message || "Erro de conexão ao ativar terminal." };
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

  try {
    const store = await prisma.store.findFirst({
      where: { id: data.storeId, companyId: session.companyId },
    });

    const token = crypto.randomBytes(32).toString("hex");

    const existing = await prisma.pdvTerminal.findUnique({
      where: { code: cleanCode },
    });

    let terminal;
    if (existing) {
      terminal = await prisma.pdvTerminal.update({
        where: { id: existing.id },
        data: {
          companyId: session.companyId,
          storeId: store ? data.storeId : existing.storeId,
          name: data.name.trim() || `Caixa ${data.cashierNumber || 1}`,
          cashierNumber: Number(data.cashierNumber) || 1,
          status: "ACTIVE",
          pairedAt: new Date(),
          lastHeartbeat: new Date(),
          token,
        },
        include: { store: true },
      });
    } else {
      terminal = await prisma.pdvTerminal.create({
        data: {
          code: cleanCode,
          companyId: session.companyId,
          storeId: store ? data.storeId : null,
          name: data.name.trim() || `Caixa ${data.cashierNumber || 1}`,
          cashierNumber: Number(data.cashierNumber) || 1,
          status: "ACTIVE",
          pairedAt: new Date(),
          lastHeartbeat: new Date(),
          token,
        },
        include: { store: true },
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
      where: { id, companyId: session.companyId },
    });

    if (!terminal) {
      return { error: "Terminal não encontrado." };
    }

    await prisma.pdvTerminal.delete({
      where: { id },
    });

    revalidatePath("/settings/terminals");
    return { success: true };
  } catch (err) {
    console.error("Erro ao deletar terminal:", err);
    return { error: `Erro ao remover terminal: ${String(err)}` };
  }
}
