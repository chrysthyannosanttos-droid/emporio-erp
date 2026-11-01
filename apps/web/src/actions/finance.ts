"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";

function addDays(offset: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toBrDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}/${m}/${y}`;
}

async function ensureCompany() {
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Empório e Conveniência LTDA",
        document: "12.345.678/0001-99",
      },
    });
  }
  return company;
}

export async function getFinanceData() {
  try {
    const company = await ensureCompany();

    const count = await prisma.transaction.count({
      where: { companyId: company.id },
    });

    if (count === 0) {
      await prisma.transaction.createMany({
        data: [
          // Contas a Pagar
          {
            companyId: company.id,
            type: "PAYABLE",
            description: "Boleto Fornecedor Bebidas & Insumos — Lote #104",
            provider: "Ambev S/A",
            category: "Fornecedores",
            amount: 4120.0,
            dueDate: addDays(0),
            status: "PENDING",
          },
          {
            companyId: company.id,
            type: "PAYABLE",
            description: "Insumos Produção Doces & Embalagens Freezer",
            provider: "Distribuidora Doces & Cia",
            category: "Fornecedores",
            amount: 1850.0,
            dueDate: addDays(2),
            status: "PENDING",
          },
          {
            companyId: company.id,
            type: "PAYABLE",
            description: "Fornecedor Carnes & Cortes Nobres Resfriados",
            provider: "Frigorífico Boi Dourado",
            category: "Fornecedores",
            amount: 6400.0,
            dueDate: addDays(3),
            status: "PENDING",
          },
          {
            companyId: company.id,
            type: "PAYABLE",
            description: "Conta de Energia Elétrica (Freezers / Câmaras)",
            provider: "Concessionária Energia",
            category: "Utilidades",
            amount: 980.0,
            dueDate: addDays(0),
            status: "PENDING",
          },
          {
            companyId: company.id,
            type: "PAYABLE",
            description: "Aluguel do Ponto Comercial",
            provider: "Imobiliária Central",
            category: "Aluguel",
            amount: 3200.0,
            dueDate: addDays(10),
            status: "PENDING",
          },
          // Contas a Receber
          {
            companyId: company.id,
            type: "RECEIVABLE",
            description: "Repasse Cartão POS (Débito / Crédito) — D+1",
            provider: " Stone / Rede Adquirente",
            category: "Cartões",
            amount: 4685.36,
            dueDate: addDays(0),
            status: "PENDING",
          },
          {
            companyId: company.id,
            type: "RECEIVABLE",
            description: "Encomenda de Doces e Congelados — Cliente Corporativo",
            provider: "Restaurante & Eventos Sol",
            category: "Vendas",
            amount: 940.0,
            dueDate: addDays(0),
            status: "PENDING",
          },
          {
            companyId: company.id,
            type: "RECEIVABLE",
            description: "Repasse Cartão Crédito Elo / Hipercard",
            provider: "PagBank / Cielo",
            category: "Cartões",
            amount: 2168.1,
            dueDate: addDays(2),
            status: "PENDING",
          },
          {
            companyId: company.id,
            type: "RECEIVABLE",
            description: "Crediário / Fiado Cliente — Pedro Alves",
            provider: "Pedro Alves",
            category: "Crediário",
            amount: 450.0,
            dueDate: addDays(3),
            status: "PENDING",
          },
          // Movimentações de Fluxo de Caixa já realizadas
          {
            companyId: company.id,
            type: "INFLOW",
            description: "Vendas Balcão & Conveniência — Turno Manhã",
            provider: "PDV Caixa 01",
            category: "Vendas",
            amount: 4820.5,
            dueDate: addDays(0),
            paymentDate: addDays(0),
            status: "PAID",
            paymentMethod: "Múltiplos",
          },
          {
            companyId: company.id,
            type: "OUTFLOW",
            description: "Compra de Embalagens a Vácuo e Potes para Doces",
            provider: "Embalagens Express",
            category: "Fornecedores",
            amount: 640.0,
            dueDate: addDays(-1),
            paymentDate: addDays(-1),
            status: "PAID",
            paymentMethod: "PIX",
          },
        ],
      });
    }

    const [allTx, recentSales, cashRegisters] = await Promise.all([
      prisma.transaction.findMany({
        where: { companyId: company.id },
        orderBy: { dueDate: "asc" },
      }),
      prisma.sale.findMany({
        where: { companyId: company.id, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.cashRegister.findMany({
        where: { companyId: company.id },
        include: { openedBy: true, movements: true },
        orderBy: { openedAt: "desc" },
        take: 20,
      }),
    ]);

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const payables = allTx
      .filter((t) => t.type === "PAYABLE")
      .map((t) => {
        const d = new Date(t.dueDate);
        const daysLeft = Math.ceil((d.getTime() - todayMidnight.getTime()) / 86400000);
        return {
          id: t.id,
          desc: t.description,
          supplier: t.provider || "Fornecedor",
          due: toBrDate(d),
          dueDate: toIsoDate(d),
          amount: Math.abs(Number(t.amount)),
          status: (t.status as "PENDING" | "PAID" | "OVERDUE") || "PENDING",
          category: t.category || "Fornecedores",
          daysLeft,
        };
      });

    const receivables = allTx
      .filter((t) => t.type === "RECEIVABLE")
      .map((t) => {
        const d = new Date(t.dueDate);
        const daysLeft = Math.ceil((d.getTime() - todayMidnight.getTime()) / 86400000);
        return {
          id: t.id,
          desc: t.description,
          customer: t.provider || "Cliente / Adquirente",
          due: toBrDate(d),
          dueDate: toIsoDate(d),
          amount: Math.abs(Number(t.amount)),
          status: (t.status as "PENDING" | "RECEIVED" | "OVERDUE") || "PENDING",
          daysLeft,
        };
      });

    // Fluxo de caixa: une transações realizadas/lançadas + vendas reais do PDV
    const cashflowFromTx = allTx
      .filter(
        (t) =>
          t.type === "INFLOW" ||
          t.type === "OUTFLOW" ||
          (t.type === "PAYABLE" && t.status === "PAID") ||
          (t.type === "RECEIVABLE" && t.status === "RECEIVED")
      )
      .map((t) => {
        const d = new Date(t.paymentDate || t.dueDate);
        const isOut = t.type === "OUTFLOW" || t.type === "PAYABLE";
        const val = Math.abs(Number(t.amount)) * (isOut ? -1 : 1);
        return {
          id: t.id,
          date: toBrDate(d),
          isoDate: toIsoDate(d),
          desc: t.description,
          cat: t.category || (isOut ? "Despesas" : "Vendas"),
          status: (t.status === "RECEIVED" ? "PAID" : t.status) as "PAID" | "PENDING" | "OVERDUE",
          amount: val,
          method: t.paymentMethod || "Banco / Caixa",
        };
      });

    const cashflowFromSales = recentSales.map((s) => {
      const d = new Date(s.createdAt);
      return {
        id: `sale-${s.id}`,
        date: toBrDate(d),
        isoDate: toIsoDate(d),
        desc: `Venda PDV #${s.id.slice(0, 6).toUpperCase()} (${s.paymentMethod})`,
        cat: "Vendas PDV",
        status: "PAID" as const,
        amount: Math.abs(Number(s.finalAmount)),
        method: s.paymentMethod,
      };
    });

    const transactions = [...cashflowFromSales, ...cashflowFromTx].sort((a, b) =>
      b.isoDate.localeCompare(a.isoDate)
    );

    const closings = cashRegisters.map((cr, idx) => {
      const d = new Date(cr.closedAt || cr.openedAt);
      const expected = Number(cr.systemBalance || cr.initialBalance || 0);
      const counted = Number(cr.closingBalance ?? expected);
      return {
        id: cr.id,
        date: d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        cashier: idx + 1,
        operator: cr.openedBy?.name || "Operador PDV",
        totalSales: expected,
        money: expected * 0.3,
        pix: expected * 0.35,
        credit: expected * 0.2,
        debit: expected * 0.15,
        withdrawals: 0,
        expected,
        counted,
        status: Math.abs(counted - expected) < 0.05 ? ("OK" as const) : ("DIFF" as const),
      };
    });

    return {
      success: true,
      transactions,
      payables,
      receivables,
      closings,
    };
  } catch (err: any) {
    console.error("Erro em getFinanceData:", err);
    return {
      success: false,
      error: err.message,
      transactions: [],
      payables: [],
      receivables: [],
      closings: [],
    };
  }
}

export async function createFinanceTransaction(input: {
  type: "INFLOW" | "OUTFLOW" | "PAYABLE" | "RECEIVABLE";
  description: string;
  category: string;
  amount: number;
  dueDate?: string;
  provider?: string;
}) {
  try {
    const company = await ensureCompany();
    const due = input.dueDate ? new Date(`${input.dueDate}T12:00:00`) : new Date();
    const isImmediate = input.type === "INFLOW" || input.type === "OUTFLOW";

    await prisma.transaction.create({
      data: {
        companyId: company.id,
        type: input.type,
        description: input.description,
        category: input.category,
        amount: Math.abs(Number(input.amount)),
        provider: input.provider || (input.type === "PAYABLE" ? "Fornecedor" : "Cliente"),
        dueDate: due,
        paymentDate: isImmediate ? due : null,
        status: isImmediate ? "PAID" : "PENDING",
      },
    });

    revalidatePath("/finance");
    return { success: true };
  } catch (err: any) {
    console.error("Erro em createFinanceTransaction:", err);
    return { success: false, error: err.message };
  }
}

export async function updateFinanceTransactionStatus(input: {
  id: string;
  status: "PAID" | "RECEIVED";
}) {
  try {
    await prisma.transaction.update({
      where: { id: input.id },
      data: {
        status: input.status,
        paymentDate: new Date(),
      },
    });
    revalidatePath("/finance");
    return { success: true };
  } catch (err: any) {
    console.error("Erro em updateFinanceTransactionStatus:", err);
    return { success: false, error: err.message };
  }
}

