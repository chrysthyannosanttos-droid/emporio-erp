"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { resolveActiveCompany } from "@/lib/tenant";

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
  let company = await resolveActiveCompany();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "EMPORIO AGROBELEM LTDA",
        document: "65.522.409/0001-13",
      },
    });
  }
  return company;
}

export async function getFinanceData() {
  try {
    const company = await ensureCompany();

    const [allTx, recentSales, cashRegisters] = await Promise.all([
      prisma.transaction.findMany({
        where: { companyId: company.id },
        orderBy: { dueDate: "asc" },
      }),
      prisma.sale.findMany({
        where: { companyId: company.id, status: "COMPLETED" },
        include: { payments: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.cashRegister.findMany({
        where: { companyId: company.id },
        include: { operator: true, movements: true },
        orderBy: { openingTime: "desc" },
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

    const cashflowFromSales = recentSales
      .filter((s: any) => {
        const pays = s.payments || [];
        return !(pays.length > 0 && pays.every((p: any) => p.paymentMethod === "CREDIARIO"));
      })
      .map((s) => {
      const d = new Date(s.createdAt);
      const sAny = s as any;
      const method = sAny.payments?.[0]?.paymentMethod || sAny.paymentMethod || "PDV";
      const amountVal = Math.abs(Number(sAny.finalAmount ?? sAny.total ?? 0));
      return {
        id: `sale-${s.id}`,
        date: toBrDate(d),
        isoDate: toIsoDate(d),
        desc: `Venda PDV #${s.id.slice(0, 6).toUpperCase()} (${method})`,
        cat: "Vendas PDV",
        status: "PAID" as const,
        amount: amountVal,
        method,
      };
    });

    const transactions = [...cashflowFromSales, ...cashflowFromTx].sort((a, b) =>
      b.isoDate.localeCompare(a.isoDate)
    );

    const closings = cashRegisters.map((cr, idx) => {
      const crAny = cr as any;
      const d = new Date(crAny.closingTime || crAny.closedAt || crAny.openingTime || crAny.openedAt || new Date());
      const expected = Number(crAny.expectedValue || crAny.systemBalance || crAny.initialValue || 0);
      const counted = Number(crAny.finalValue ?? crAny.closingBalance ?? expected);
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
        operator: crAny.operator?.name || crAny.openedBy?.name || "Operador PDV",
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

export async function getChartOfAccountsData() {
  try {
    const company = await ensureCompany();

    const [products, assets, sales, transactions, losses, cashRegisters] = await Promise.all([
      prisma.product.findMany({
        where: { companyId: company.id, stock: { gt: 0 } },
        include: { category: true },
      }),
      prisma.asset.findMany({
        where: { companyId: company.id, status: "ACTIVE" },
      }),
      prisma.sale.findMany({
        where: { companyId: company.id, status: "COMPLETED" },
        include: {
          items: { include: { product: true } },
          payments: true,
          customer: true,
        },
      }),
      prisma.transaction.findMany({
        where: { companyId: company.id },
      }),
      prisma.loss.findMany({
        where: { companyId: company.id },
        include: { product: true },
      }),
      prisma.cashRegister.findMany({
        where: { companyId: company.id },
        orderBy: { openingTime: "desc" },
        take: 10,
      }),
    ]);

    // 1.1.1 Disponibilidades (Caixas PDV + Entradas menos Saídas realizadas)
    const openCashBalance = cashRegisters
      .filter((cr) => cr.status === "OPEN")
      .reduce((acc, cr) => acc + Number(cr.initialValue || 0), 0);

    const salesCash = sales.reduce((acc, s) => {
      const cashAmt = (s.payments || [])
        .filter((p) => p.paymentMethod === "CASH" || p.paymentMethod === "MONEY")
        .reduce((a, p) => a + Number(p.amount || 0), 0);
      return acc + cashAmt;
    }, 0);

    const salesPix = sales.reduce((acc, s) => {
      const pixAmt = (s.payments || [])
        .filter((p) => p.paymentMethod === "PIX")
        .reduce((a, p) => a + Number(p.amount || 0), 0);
      return acc + pixAmt;
    }, 0);

    const salesDebit = sales.reduce((acc, s) => {
      const amt = (s.payments || [])
        .filter((p) => p.paymentMethod === "DEBIT")
        .reduce((a, p) => a + Number(p.amount || 0), 0);
      return acc + amt;
    }, 0);

    const salesCredit = sales.reduce((acc, s) => {
      const amt = (s.payments || [])
        .filter((p) => p.paymentMethod === "CREDIT")
        .reduce((a, p) => a + Number(p.amount || 0), 0);
      return acc + amt;
    }, 0);

    // 1.1.2 Contas a Receber
    const openReceivables = transactions
      .filter((t) => t.type === "RECEIVABLE" && t.status !== "RECEIVED")
      .reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0);

    // 1.1.3 Estoques Reais (calculados a preço de custo de reposição)
    let stockRevenda = 0;
    let stockInsumos = 0;
    let stockBebidas = 0;
    let stockEmbalagens = 0;

    for (const p of products) {
      const val = Number(p.stock || 0) * Number(p.cost || 0);
      const cat = (p.category?.name || "").toLowerCase();
      if (p.isPackaging || cat.includes("embalag")) {
        stockEmbalagens += val;
      } else if (p.isRawMaterial || cat.includes("insumo") || cat.includes("matéria")) {
        stockInsumos += val;
      } else if (cat.includes("bebida") || cat.includes("adega")) {
        stockBebidas += val;
      } else {
        stockRevenda += val;
      }
    }

    // 1.2 Imobilizado Próprio (exclui equipamentos de terceiros em COMODATO)
    let imobMaquinas = 0;
    let imobInstalacoes = 0;
    let comodatosRecebidos = 0;
    for (const a of assets) {
      const val = Number(a.currentValue || a.acquisitionValue || 0);
      if (a.category === "COMODATO") {
        comodatosRecebidos += val;
      } else if (a.category === "FURNITURE" || a.category === "FACILITY") {
        imobInstalacoes += val;
      } else {
        imobMaquinas += val;
      }
    }

    // 2.1 Passivo (Fornecedores / A Pagar em aberto)
    const openPayables = transactions
      .filter((t) => t.type === "PAYABLE" && t.status !== "PAID")
      .reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0);

    // 3. Receitas Operacionais (Vendas Reais)
    const revRevenda = sales
      .filter((s) => s.customer?.taxRegime === "REVENDA")
      .reduce((acc, s) => acc + Number(s.total || 0), 0);
    const revPdv = sales
      .filter((s) => s.customer?.taxRegime !== "REVENDA")
      .reduce((acc, s) => acc + Number(s.total || 0), 0);

    // 4. Custos Reais (CMV de vendas + Perdas)
    let cmvVendas = 0;
    for (const s of sales) {
      for (const it of s.items || []) {
        cmvVendas += Number(it.quantity || 0) * Number(it.product?.cost || 0);
      }
    }
    const perdasTotal = losses.reduce(
      (acc, l) => acc + Number(l.quantity || 0) * Number(l.product?.cost || 0),
      0
    );

    // 5. Despesas Operacionais (Transações OUTFLOW / PAYABLE)
    const despOutflows = transactions
      .filter((t) => t.type === "OUTFLOW" || t.type === "PAYABLE")
      .reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0);

    return {
      success: true,
      companyName: company.name,
      balances: {
        openCashBalance,
        salesCash,
        salesPix,
        salesDebit,
        salesCredit,
        openReceivables,
        stockRevenda,
        stockInsumos,
        stockBebidas,
        stockEmbalagens,
        imobMaquinas,
        imobInstalacoes,
        comodatosRecebidos,
        openPayables,
        revPdv,
        revRevenda,
        cmvVendas,
        perdasTotal,
        despOutflows,
      },
    };
  } catch (err: any) {
    console.error("Erro em getChartOfAccountsData:", err);
    return { success: false, error: err.message, balances: null };
  }
}

export async function getEmployeeCrediarioData() {
  try {
    const company = await ensureCompany();

    const [employees, txList, crediarioSales] = await Promise.all([
      prisma.customer.findMany({
        where: { companyId: company.id, taxRegime: "FUNCIONARIO" },
        orderBy: { name: "asc" },
      }),
      prisma.transaction.findMany({
        where: {
          companyId: company.id,
          type: "RECEIVABLE",
          category: "Crediário Funcionários",
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sale.findMany({
        where: {
          companyId: company.id,
          payments: { some: { paymentMethod: "CREDIARIO" } },
        },
        include: {
          items: { include: { product: { select: { name: true, unit: true } } } },
          customer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const saleById = new Map(crediarioSales.map((s) => [s.id, s]));

    const employeeCards = employees.map((emp) => {
      const empSales = crediarioSales.filter((s) => s.customerId === emp.id);
      const empSaleIds = new Set(empSales.map((s) => s.id));
      const empTxs = txList.filter(
        (t) =>
          (t.orderId && empSaleIds.has(t.orderId)) ||
          (t.provider || "").trim().toLowerCase() === emp.name.trim().toLowerCase()
      );

      const entries = empTxs.map((t) => {
        const linkedSale = t.orderId ? saleById.get(t.orderId) : undefined;
        return {
          transactionId: t.id,
          saleId: t.orderId || linkedSale?.id || null,
          description: t.description,
          amount: Math.abs(Number(t.amount || 0)),
          status: t.status as "PENDING" | "RECEIVED" | "OVERDUE",
          paymentMethod: t.paymentMethod || "CREDIARIO",
          createdAt: t.createdAt.toISOString(),
          dueDate: t.dueDate.toISOString(),
          paymentDate: t.paymentDate ? t.paymentDate.toISOString() : null,
          items: (linkedSale?.items || []).map((it) => ({
            name: it.product?.name || "Item",
            unit: it.product?.unit || "UN",
            quantity: Number(it.quantity || 0),
            unitPrice: Number(it.unitPrice || 0),
            total: Number(it.total || 0),
          })),
        };
      });

      const openEntries = entries.filter((e) => e.status !== "RECEIVED");
      const openTotal = openEntries.reduce((a, b) => a + b.amount, 0);
      const settledTotal = entries
        .filter((e) => e.status === "RECEIVED")
        .reduce((a, b) => a + b.amount, 0);

      return {
        id: emp.id,
        name: emp.name,
        document: emp.document || "",
        phone: emp.phone || "",
        creditLimit: Number(emp.creditLimit || 0),
        creditUsed: Number(emp.creditUsed || openTotal || 0),
        openTotal,
        openCount: openEntries.length,
        settledTotal,
        entries,
      };
    });

    return {
      success: true,
      employees: employeeCards,
      summary: {
        totalOpen: employeeCards.reduce((a, e) => a + e.openTotal, 0),
        totalSettled: employeeCards.reduce((a, e) => a + e.settledTotal, 0),
        employeesWithDebt: employeeCards.filter((e) => e.openTotal > 0).length,
      },
    };
  } catch (err: any) {
    console.error("Erro em getEmployeeCrediarioData:", err);
    return {
      success: false,
      error: err.message || "Erro ao carregar crediário de funcionários",
      employees: [],
      summary: { totalOpen: 0, totalSettled: 0, employeesWithDebt: 0 },
    };
  }
}

export async function settleEmployeeCrediario(input: {
  customerId: string;
  transactionIds: string[];
  settlementMethod: "DINHEIRO" | "PIX" | "CARTAO" | "FOLHA";
}) {
  try {
    const company = await ensureCompany();
    if (!input.transactionIds || input.transactionIds.length === 0) {
      return { success: false, error: "Selecione ao menos uma compra para quitar." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const pendingTxs = await tx.transaction.findMany({
        where: {
          id: { in: input.transactionIds },
          companyId: company.id,
          type: "RECEIVABLE",
          status: { not: "RECEIVED" },
        },
      });

      if (pendingTxs.length === 0) {
        return { settledCount: 0, settledAmount: 0 };
      }

      const settledAmount = pendingTxs.reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0);
      const now = new Date();
      const methodLabel =
        input.settlementMethod === "FOLHA"
          ? "Desconto em Folha"
          : input.settlementMethod === "PIX"
          ? "PIX"
          : input.settlementMethod === "CARTAO"
          ? "Cartão"
          : "Dinheiro";

      for (const t of pendingTxs) {
        await tx.transaction.update({
          where: { id: t.id },
          data: {
            status: "RECEIVED",
            paymentDate: now,
            paymentMethod: input.settlementMethod,
            description: `${t.description} [Quitado: ${methodLabel}]`,
          },
        });
      }

      if (input.customerId) {
        const cust = await tx.customer.findUnique({ where: { id: input.customerId } });
        if (cust) {
          const remaining = Math.max(0, Number(cust.creditUsed || 0) - settledAmount);
          await tx.customer.update({
            where: { id: cust.id },
            data: { creditUsed: remaining },
          });
        }
      }

      return { settledCount: pendingTxs.length, settledAmount };
    });

    revalidatePath("/finance");
    revalidatePath("/customers");
    revalidatePath("/pdv");

    return { success: true, ...result };
  } catch (err: any) {
    console.error("Erro em settleEmployeeCrediario:", err);
    return { success: false, error: err.message || "Erro ao quitar crediário." };
  }
}


