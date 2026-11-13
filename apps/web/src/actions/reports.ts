"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { resolveActiveCompany } from "@/lib/tenant";
import { getSession } from "@/lib/session";

let comodatoTableEnsured = false;

async function ensureComodatoTable() {
  if (comodatoTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "comodato_loans" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "companyId" TEXT,
        "customerId" TEXT,
        "customerName" TEXT NOT NULL,
        "customerDocument" TEXT,
        "itemDescription" TEXT NOT NULL,
        "assetCode" TEXT,
        "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
        "unitValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "loanDate" TEXT NOT NULL,
        "returnForecastDate" TEXT,
        "status" TEXT NOT NULL DEFAULT 'EM_POSSE',
        "notes" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "comodato_loans" ADD COLUMN IF NOT EXISTS "companyId" TEXT`);
    comodatoTableEnsured = true;
  } catch (err) {
    console.error("Erro em ensureComodatoTable:", err);
  }
}

function classifyProductType(p: any): "INSUMO" | "PORCAO" | "REVENDA" {
  if (p.isRawMaterial || p.isPackaging) return "INSUMO";
  const text = `${p.name || ""} ${p.category?.name || ""}`.toLowerCase();
  if (
    p.isSelfProduced ||
    text.includes("doce") ||
    text.includes("porç") ||
    text.includes("porcao") ||
    text.includes("congelad") ||
    text.includes("caseir") ||
    text.includes("picanha") ||
    text.includes("carne") ||
    text.includes("espetinho") ||
    text.includes("lingui")
  ) {
    return "PORCAO";
  }
  if (
    text.includes("insumo") ||
    text.includes("embalagem") ||
    text.includes("pote") ||
    text.includes("açúcar") ||
    text.includes("farinha") ||
    text.includes("leite condensado")
  ) {
    return "INSUMO";
  }
  return "REVENDA";
}

function monthKeyBr(date: Date): string {
  const sp = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${sp.getFullYear()}-${String(sp.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelPt(year: number, monthIndexZero: number): string {
  const names = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${names[monthIndexZero]} / ${year}`;
}

export async function getAllReportsDashboardData() {
  try {
    await ensureComodatoTable();

    const company = await resolveActiveCompany();
    if (!company) {
      throw new Error("Empresa ativa não encontrada.");
    }

    // 1. Clientes e Vendas Reais a Clientes Revenda
    const customers = await prisma.customer.findMany({
      where: { companyId: company.id },
      include: {
        sales: {
          include: {
            items: { include: { product: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        orders: {
          include: {
            items: { include: { product: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const resaleCustomers = customers.filter((c) => c.taxRegime === "REVENDA");

    const resaleSalesRows: Array<{
      id: string;
      date: string;
      customerId: string;
      customerName: string;
      document: string;
      itemsSummary: string;
      totalQty: number;
      totalAmount: number;
      status: string;
    }> = [];

    for (const rc of resaleCustomers) {
      for (const s of rc.sales || []) {
        const qty = (s.items || []).reduce((acc, it) => acc + Number(it.quantity || 0), 0);
        const summary =
          (s.items || [])
            .map((it) => `${it.quantity}x ${it.product?.name || "Item"}`)
            .join(", ") || "Mercadorias para Revenda";
        resaleSalesRows.push({
          id: s.id,
          date: new Date(s.createdAt).toLocaleDateString("pt-BR"),
          customerId: rc.id,
          customerName: rc.name,
          document: rc.document || "Sem Documento",
          itemsSummary: summary,
          totalQty: qty || 1,
          totalAmount: Number(s.total || 0),
          status: s.status === "COMPLETED" ? "Faturado / Pago" : s.status,
        });
      }
      for (const o of rc.orders || []) {
        const qty = (o.items || []).reduce((acc, it) => acc + Number(it.quantity || 0), 0);
        const summary =
          (o.items || [])
            .map((it) => `${it.quantity}x ${it.product?.name || "Item"}`)
            .join(", ") || "Pedido Atacado / Revenda";
        resaleSalesRows.push({
          id: o.id,
          date: new Date(o.createdAt).toLocaleDateString("pt-BR"),
          customerId: rc.id,
          customerName: rc.name,
          document: rc.document || "Sem Documento",
          itemsSummary: summary,
          totalQty: qty || 1,
          totalAmount: Number(o.total || 0),
          status: o.status,
        });
      }
    }

    // 2. Relatório de Estoque Real da Empresa
    const products = await prisma.product.findMany({
      where: { companyId: company.id },
      include: {
        category: true,
        stockEntryItems: true,
        purchaseItems: true,
        saleItems: true,
      },
      orderBy: { name: "asc" },
    });

    const stockReportRows = products.map((p) => {
      const code = p.internalCode || p.sku || p.barcode || p.id.slice(0, 6).toUpperCase();
      const currentStock = Number(p.stock || 0);
      const entryPurchased = (p.stockEntryItems || []).reduce(
        (acc, it) => acc + Number(it.quantity || 0),
        0
      );
      const orderPurchased = (p.purchaseItems || []).reduce(
        (acc, it) => acc + Number(it.quantity || 0),
        0
      );
      const soldQty = (p.saleItems || []).reduce(
        (acc, it) => acc + Number(it.quantity || 0),
        0
      );
      const purchasedQty = entryPurchased + orderPurchased;
      const itemType = classifyProductType(p);

      return {
        id: p.id,
        code,
        barcode: p.barcode || "---",
        name: p.name,
        section: p.category?.name || "Geral",
        unit: p.unitSale || p.unit || "UN",
        currentStock,
        purchasedQty,
        soldQty,
        cost: Number(p.cost || 0),
        price: Number(p.price || 0),
        itemType,
      };
    });

    // 3. Comodatos Reais (Emprestados em comodato_loans + Patrimônio Comodato em Asset)
    const comodatoRows: Array<{
      id: string;
      customerId: string | null;
      customerName: string;
      customerDocument: string | null;
      itemDescription: string;
      assetCode: string | null;
      quantity: number;
      unitValue: number;
      loanDate: string;
      returnForecastDate: string | null;
      status: string;
      notes: string | null;
    }> = await prisma.$queryRawUnsafe(
      `SELECT * FROM "comodato_loans" WHERE "companyId" = $1 OR "companyId" IS NULL ORDER BY "createdAt" DESC`,
      company.id
    );

    const realComodatoAssets = await prisma.asset.findMany({
      where: { companyId: company.id, category: "COMODATO" },
      orderBy: { code: "asc" },
    });

    // 4. DRE Comparativo Real dos Últimos 3 Meses (100% baseado no banco de dados)
    const nowSp = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const m3Date = new Date(nowSp.getFullYear(), nowSp.getMonth(), 1);
    const m2Date = new Date(nowSp.getFullYear(), nowSp.getMonth() - 1, 1);
    const m1Date = new Date(nowSp.getFullYear(), nowSp.getMonth() - 2, 1);

    const k1 = monthKeyBr(m1Date);
    const k2 = monthKeyBr(m2Date);
    const k3 = monthKeyBr(m3Date);

    const [allSales, allTransactions] = await Promise.all([
      prisma.sale.findMany({
        where: { companyId: company.id, status: "COMPLETED" },
        include: {
          items: { include: { product: true } },
          payments: true,
        },
      }),
      prisma.transaction.findMany({
        where: { companyId: company.id },
      }),
    ]);

    const buildRealDreMonth = (mKey: string, label: string) => {
      const monthSales = allSales.filter((s) => monthKeyBr(new Date(s.createdAt)) === mKey);
      const grossRevenue = Number(
        monthSales.reduce((acc, s) => acc + Number(s.total || 0), 0).toFixed(2)
      );

      let cmv = 0;
      let cardFees = 0;

      for (const s of monthSales) {
        for (const it of s.items || []) {
          cmv += Number(it.quantity || 0) * Number(it.product?.cost || 0);
        }
        for (const p of s.payments || []) {
          const amt = Number(p.amount || 0);
          if (p.paymentMethod === "CREDIT") cardFees += amt * 0.0299;
          else if (p.paymentMethod === "DEBIT") cardFees += amt * 0.0149;
        }
      }

      cmv = Number(cmv.toFixed(2));
      cardFees = Number(cardFees.toFixed(2));
      const taxes = Number((grossRevenue * 0.04).toFixed(2));
      const netRevenue = Number((grossRevenue - taxes - cardFees).toFixed(2));
      const grossProfit = Number((netRevenue - cmv).toFixed(2));

      const monthTxs = allTransactions.filter((t) => {
        const refDate = t.paymentDate ? new Date(t.paymentDate) : new Date(t.dueDate);
        return monthKeyBr(refDate) === mKey;
      });
      const operatingExpenses = Number(
        monthTxs
          .filter((t) => t.type === "OUTFLOW" || t.type === "PAYABLE")
          .reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0)
          .toFixed(2)
      );

      const netProfit = Number((grossProfit - operatingExpenses).toFixed(2));
      const marginPct = grossRevenue > 0 ? Number(((netProfit / grossRevenue) * 100).toFixed(1)) : 0;

      return {
        label,
        grossRevenue,
        taxes,
        cardFees,
        netRevenue,
        cmv,
        grossProfit,
        operatingExpenses,
        netProfit,
        marginPct,
      };
    };

    const dreComparison = {
      month1: buildRealDreMonth(k1, monthLabelPt(m1Date.getFullYear(), m1Date.getMonth())),
      month2: buildRealDreMonth(k2, monthLabelPt(m2Date.getFullYear(), m2Date.getMonth())),
      month3: buildRealDreMonth(k3, `${monthLabelPt(m3Date.getFullYear(), m3Date.getMonth())} (Atual)`),
    };

    return {
      success: true,
      companyName: company.name,
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        document: c.document || "",
        customerType: c.taxRegime === "REVENDA" ? "REVENDA" : "CONSUMIDOR_FINAL",
      })),
      resaleSales: resaleSalesRows,
      stockReport: stockReportRows,
      comodatos: comodatoRows.map((c) => ({
        ...c,
        quantity: Number(c.quantity || 1),
        unitValue: Number(c.unitValue || 0),
        totalValue: Number(c.quantity || 1) * Number(c.unitValue || 0),
      })),
      comodatoAssets: realComodatoAssets.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        brand: a.brand || "",
        model: a.model || "",
        location: a.location || "LOJA",
        status: a.status,
        value: Number(a.currentValue || a.acquisitionValue || 0),
        notes: a.notes || "",
        acquisitionDate: a.acquisitionDate ? new Date(a.acquisitionDate).toLocaleDateString("pt-BR") : "",
      })),
      dreComparison,
    };
  } catch (err: any) {
    console.error("Erro em getAllReportsDashboardData:", err);
    return {
      success: false,
      error: err.message,
      customers: [],
      resaleSales: [],
      stockReport: [],
      comodatos: [],
      comodatoAssets: [],
      dreComparison: null,
    };
  }
}

export async function createComodatoLoan(input: {
  customerId?: string;
  customerName: string;
  customerDocument?: string;
  itemDescription: string;
  assetCode?: string;
  quantity: number;
  unitValue: number;
  loanDate: string;
  returnForecastDate?: string;
  notes?: string;
}) {
  try {
    await ensureComodatoTable();
    const company = await resolveActiveCompany();
    if (!company) return { success: false, error: "Empresa não identificada." };

    const id = `cmd_${Date.now()}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "comodato_loans" ("id", "companyId", "customerId", "customerName", "customerDocument", "itemDescription", "assetCode", "quantity", "unitValue", "loanDate", "returnForecastDate", "status", "notes")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'EM_POSSE', $12)`,
      id,
      company.id,
      input.customerId || null,
      input.customerName,
      input.customerDocument || null,
      input.itemDescription,
      input.assetCode || `PAT-${Date.now().toString().slice(-4)}`,
      Number(input.quantity || 1),
      Number(input.unitValue || 0),
      input.loanDate || new Date().toISOString().slice(0, 10),
      input.returnForecastDate || null,
      input.notes || null
    );
    revalidatePath("/reports");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateComodatoStatus(
  id: string,
  status: "EM_POSSE" | "DEVOLVIDO" | "MANUTENCAO"
) {
  try {
    await ensureComodatoTable();
    await prisma.$executeRawUnsafe(
      `UPDATE "comodato_loans" SET "status" = $1 WHERE "id" = $2`,
      status,
      id
    );
    revalidatePath("/reports");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Aplica o Balanço Diário de Estoque / Insumos / Porções diretamente no banco de dados.
 */
export async function applyDailyStockBalance(
  items: Array<{ productId: string; countedStock: number }>
) {
  try {
    const company = await resolveActiveCompany();
    if (!company) return { success: false, error: "Empresa não encontrada." };

    const session = await getSession();
    let user = session?.userId
      ? await prisma.user.findUnique({ where: { id: session.userId } })
      : null;
    if (!user) {
      user = await prisma.user.findFirst({ where: { companyId: company.id } });
    }

    let updatedCount = 0;
    for (const item of items) {
      const prod = await prisma.product.findFirst({
        where: { id: item.productId, companyId: company.id },
      });
      if (!prod) continue;

      const current = Number(prod.stock || 0);
      const counted = Number(item.countedStock);
      if (!Number.isFinite(counted) || Math.abs(counted - current) < 0.001) continue;

      await prisma.product.update({
        where: { id: prod.id },
        data: { stock: counted },
      });

      if (counted < current && user) {
        await prisma.loss.create({
          data: {
            productId: prod.id,
            quantity: Number((current - counted).toFixed(3)),
            reason: "Diferença apurada no Balanço Diário de Conferência",
            companyId: company.id,
            userId: user.id,
          },
        });
      }

      updatedCount++;
    }

    revalidatePath("/reports");
    revalidatePath("/stock");
    revalidatePath("/losses");
    return { success: true, updatedCount };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function toSpDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function calcReportDaysLeft(expirationDate: Date): number {
  const todayKey = toSpDateKey(new Date());
  const expKey =
    expirationDate.getUTCHours() === 0 && expirationDate.getUTCMinutes() === 0
      ? expirationDate.toISOString().slice(0, 10)
      : toSpDateKey(expirationDate);

  const [ty, tm, td] = todayKey.split("-").map(Number);
  const [ey, em, ed] = expKey.split("-").map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(ty, tm - 1, td)) / 86400000);
}

export async function getLossesReport(filters?: {
  startDate?: string;
  endDate?: string;
  lossType?: string;
  userId?: string;
}) {
  try {
    const company = await resolveActiveCompany();
    if (!company) {
      return {
        success: false,
        error: "Empresa não identificada.",
        rows: [],
        users: [],
        summary: {
          totalRecords: 0,
          totalQuantity: 0,
          totalLossValue: 0,
          discardCount: 0,
          exchangeCount: 0,
          expiredCount: 0,
          otherCount: 0,
          discardValue: 0,
          exchangeValue: 0,
          expiredValue: 0,
          otherValue: 0,
        },
      };
    }

    const where: any = { companyId: company.id };
    if (filters?.lossType && filters.lossType !== "ALL") {
      where.lossType = filters.lossType;
    }
    if (filters?.userId && filters.userId !== "ALL") {
      where.userId = filters.userId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(`${filters.startDate.slice(0, 10)}T00:00:00`);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(`${filters.endDate.slice(0, 10)}T23:59:59.999`);
      }
    }

    const [losses, users] = await Promise.all([
      prisma.loss.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, unit: true, unitSale: true, cost: true, price: true },
          },
          user: { select: { id: true, name: true, role: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { companyId: company.id, active: true },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      }),
    ]);

    let totalQuantity = 0;
    let totalLossValue = 0;
    let discardCount = 0;
    let exchangeCount = 0;
    let expiredCount = 0;
    let otherCount = 0;
    let discardValue = 0;
    let exchangeValue = 0;
    let expiredValue = 0;
    let otherValue = 0;

    const rows = losses.map((l) => {
      const qty = Number(l.quantity || 0);
      const unitCost =
        l.unitCost !== null && l.unitCost !== undefined
          ? Number(l.unitCost)
          : Number(l.product?.cost ?? 0);
      const totalLoss = Number((qty * unitCost).toFixed(2));
      const lossType = l.lossType || "DISCARD";

      totalQuantity += qty;
      totalLossValue += totalLoss;

      if (lossType === "SUPPLIER_EXCHANGE") {
        exchangeCount++;
        exchangeValue += totalLoss;
      } else if (lossType === "EXPIRED") {
        expiredCount++;
        expiredValue += totalLoss;
      } else if (lossType === "OTHER") {
        otherCount++;
        otherValue += totalLoss;
      } else {
        discardCount++;
        discardValue += totalLoss;
      }

      return {
        id: l.id,
        receiptCode: l.receiptCode || `AV-${l.id.slice(0, 6).toUpperCase()}`,
        createdAt: l.createdAt.toISOString(),
        dateFormatted: new Date(l.createdAt).toLocaleString("pt-BR"),
        productId: l.productId,
        productName: l.product?.name || "Produto",
        productUnit: l.product?.unitSale || l.product?.unit || "UN",
        quantity: qty,
        unitCost,
        totalLoss,
        lossType,
        reason: l.reason || "Avaria",
        notes: l.notes || null,
        userId: l.userId,
        userName: l.user?.name || "Operador",
        supplierName: l.supplier?.name || null,
        hasPhoto: Boolean(l.photoData && l.photoData.length > 0),
      };
    });

    return {
      success: true,
      rows,
      users,
      summary: {
        totalRecords: rows.length,
        totalQuantity: Number(totalQuantity.toFixed(3)),
        totalLossValue: Number(totalLossValue.toFixed(2)),
        discardCount,
        exchangeCount,
        expiredCount,
        otherCount,
        discardValue: Number(discardValue.toFixed(2)),
        exchangeValue: Number(exchangeValue.toFixed(2)),
        expiredValue: Number(expiredValue.toFixed(2)),
        otherValue: Number(otherValue.toFixed(2)),
      },
    };
  } catch (err: any) {
    console.error("Erro em getLossesReport:", err);
    return {
      success: false,
      error: err.message || "Erro ao carregar relatório de avarias.",
      rows: [],
      users: [],
      summary: {
        totalRecords: 0,
        totalQuantity: 0,
        totalLossValue: 0,
        discardCount: 0,
        exchangeCount: 0,
        expiredCount: 0,
        otherCount: 0,
        discardValue: 0,
        exchangeValue: 0,
        expiredValue: 0,
        otherValue: 0,
      },
    };
  }
}

export async function getLossPhotoById(lossId: string) {
  try {
    const company = await resolveActiveCompany();
    if (!company) return { success: false, error: "Empresa não identificada." };

    const loss = await prisma.loss.findFirst({
      where: { id: lossId, companyId: company.id },
      select: {
        id: true,
        photoData: true,
        receiptCode: true,
        product: { select: { name: true } },
      },
    });

    if (!loss) return { success: false, error: "Registro de avaria não encontrado." };
    return {
      success: true,
      photoData: loss.photoData || null,
      receiptCode: loss.receiptCode || `AV-${loss.id.slice(0, 6).toUpperCase()}`,
      productName: loss.product?.name || "Produto",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao carregar foto da avaria." };
  }
}

export async function getProductionByUserReport(filters?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
}) {
  try {
    const company = await resolveActiveCompany();
    if (!company) {
      return { success: false, error: "Empresa não identificada.", byUser: [], logs: [], users: [] };
    }

    const where: any = { companyId: company.id };
    if (filters?.userId && filters.userId !== "ALL") {
      where.userId = filters.userId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(`${filters.startDate.slice(0, 10)}T00:00:00`);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(`${filters.endDate.slice(0, 10)}T23:59:59.999`);
      }
    }

    const [logs, users] = await Promise.all([
      prisma.productionLog.findMany({
        where,
        include: {
          recipe: {
            include: {
              product: { select: { id: true, name: true, unit: true, unitSale: true } },
              items: { include: { product: { select: { cost: true } } } },
            },
          },
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { companyId: company.id, active: true },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const groupMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        userRole: string;
        totalLotes: number;
        totalProduzido: number;
        custoInsumos: number;
        recipeIds: Set<string>;
      }
    >();

    const serializedLogs = logs.map((l) => {
      const qty = Number(l.quantityProduced || 0);
      let costVal = 0;
      if (l.totalCost !== null && l.totalCost !== undefined) {
        costVal = Number(l.totalCost);
      } else {
        const y = Number(l.recipe?.yield || 1) || 1;
        const factor = qty / y;
        costVal = (l.recipe?.items || []).reduce(
          (acc, it) => acc + Number(it.quantity || 0) * factor * Number(it.product?.cost ?? 0),
          0
        );
      }
      costVal = Number(costVal.toFixed(2));

      const existing = groupMap.get(l.userId);
      if (existing) {
        existing.totalLotes += 1;
        existing.totalProduzido += qty;
        existing.custoInsumos += costVal;
        existing.recipeIds.add(l.recipeId);
      } else {
        groupMap.set(l.userId, {
          userId: l.userId,
          userName: l.user?.name || "Operador",
          userRole: l.user?.role || "OPERATOR",
          totalLotes: 1,
          totalProduzido: qty,
          custoInsumos: costVal,
          recipeIds: new Set([l.recipeId]),
        });
      }

      return {
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        dateFormatted: new Date(l.createdAt).toLocaleString("pt-BR"),
        productName: l.recipe?.product?.name || "Produto",
        productUnit: l.recipe?.product?.unitSale || l.recipe?.product?.unit || "UN",
        quantityProduced: qty,
        batchNumber: l.batchNumber || "—",
        expirationDateFormatted: l.expirationDate
          ? new Date(l.expirationDate).toLocaleDateString("pt-BR")
          : "—",
        totalCost: costVal,
        notes: l.notes || null,
        userId: l.userId,
        userName: l.user?.name || "Operador",
        userRole: l.user?.role || "OPERATOR",
      };
    });

    const byUser = Array.from(groupMap.values())
      .map((g) => ({
        userId: g.userId,
        userName: g.userName,
        userRole: g.userRole,
        totalLotes: g.totalLotes,
        totalProduzido: Number(g.totalProduzido.toFixed(3)),
        custoInsumos: Number(g.custoInsumos.toFixed(2)),
        receitasDistintas: g.recipeIds.size,
      }))
      .sort((a, b) => b.totalLotes - a.totalLotes);

    return {
      success: true,
      byUser,
      logs: serializedLogs,
      users,
    };
  } catch (err: any) {
    console.error("Erro em getProductionByUserReport:", err);
    return {
      success: false,
      error: err.message || "Erro ao carregar relatório de produção por usuário.",
      byUser: [],
      logs: [],
      users: [],
    };
  }
}

export async function getExpirationsReport() {
  try {
    const company = await resolveActiveCompany();
    if (!company) {
      return {
        success: false,
        error: "Empresa não identificada.",
        items: [],
        summary: {
          expiredCount: 0,
          expiredCost: 0,
          criticalCount: 0,
          criticalCost: 0,
          attentionCount: 0,
          attentionCost: 0,
          preventiveCount: 0,
          preventiveCost: 0,
          safeCount: 0,
          totalRiskCost: 0,
        },
      };
    }

    const [allBatches, prodLogs] = await Promise.all([
      prisma.productBatch.findMany({
        where: { product: { companyId: company.id } },
        include: { product: true },
        orderBy: { expirationDate: "asc" },
      }),
      prisma.productionLog.findMany({
        where: { companyId: company.id, expirationDate: { not: null } },
        include: { recipe: { include: { product: true } } },
        orderBy: { expirationDate: "asc" },
      }),
    ]);

    const existingKeys = new Set<string>();
    for (const b of allBatches) {
      if (b.batchNumber?.trim()) {
        existingKeys.add(`${b.productId}::${b.batchNumber.trim()}`);
      }
    }

    const activeBatches = allBatches.filter((b) => Number(b.currentStock || 0) > 0);
    const batchRows = activeBatches.map((b) => {
      const daysLeft = calcReportDaysLeft(new Date(b.expirationDate));
      const qty = Number(b.currentStock || 0);
      const unitCost = Number(b.product?.cost ?? 0);
      const unitPrice = Number(b.product?.price ?? 0);
      return {
        id: b.id,
        productName: b.product?.name || "Produto",
        unit: b.product?.unitSale || b.product?.unit || "UN",
        batchNumber: b.batchNumber || `L-${b.id.slice(0, 6).toUpperCase()}`,
        source: "ESTOQUE",
        quantity: qty,
        unitCost,
        costAtRisk: Number((qty * unitCost).toFixed(2)),
        saleAtRisk: Number((qty * unitPrice).toFixed(2)),
        expirationDateFormatted: new Date(b.expirationDate).toLocaleDateString("pt-BR"),
        daysLeft,
        bucket:
          daysLeft < 0
            ? "EXPIRED"
            : daysLeft <= 5
            ? "CRITICAL_0_5"
            : daysLeft <= 15
            ? "ATTENTION_6_15"
            : daysLeft <= 30
            ? "PREVENTIVE_16_30"
            : "SAFE_30_PLUS",
      };
    });

    const prodRows = prodLogs
      .filter((pl) => {
        if (!pl.expirationDate || !pl.recipe?.product) return false;
        const bNum = pl.batchNumber?.trim();
        if (bNum && existingKeys.has(`${pl.recipe.productId}::${bNum}`)) return false;
        return true;
      })
      .map((pl) => {
        const exp = pl.expirationDate!;
        const daysLeft = calcReportDaysLeft(new Date(exp));
        const prod = pl.recipe!.product;
        const qty = Number(pl.quantityProduced || 0);
        const unitCost = Number(prod.cost ?? 0);
        const unitPrice = Number(prod.price ?? 0);
        return {
          id: `prod-${pl.id}`,
          productName: prod.name,
          unit: prod.unitSale || prod.unit || "UN",
          batchNumber: pl.batchNumber || `PROD-${pl.id.slice(0, 6).toUpperCase()}`,
          source: "PRODUCAO",
          quantity: qty,
          unitCost,
          costAtRisk: Number((qty * unitCost).toFixed(2)),
          saleAtRisk: Number((qty * unitPrice).toFixed(2)),
          expirationDateFormatted: new Date(exp).toLocaleDateString("pt-BR"),
          daysLeft,
          bucket:
            daysLeft < 0
              ? "EXPIRED"
              : daysLeft <= 5
              ? "CRITICAL_0_5"
              : daysLeft <= 15
              ? "ATTENTION_6_15"
              : daysLeft <= 30
              ? "PREVENTIVE_16_30"
              : "SAFE_30_PLUS",
        };
      });

    const items = [...batchRows, ...prodRows].sort((a, b) => a.daysLeft - b.daysLeft);

    const sumBucket = (bucket: string) => {
      const list = items.filter((i) => i.bucket === bucket);
      return {
        count: list.length,
        cost: Number(list.reduce((acc, i) => acc + i.costAtRisk, 0).toFixed(2)),
      };
    };

    const expired = sumBucket("EXPIRED");
    const critical = sumBucket("CRITICAL_0_5");
    const attention = sumBucket("ATTENTION_6_15");
    const preventive = sumBucket("PREVENTIVE_16_30");
    const safe = sumBucket("SAFE_30_PLUS");

    return {
      success: true,
      items,
      summary: {
        expiredCount: expired.count,
        expiredCost: expired.cost,
        criticalCount: critical.count,
        criticalCost: critical.cost,
        attentionCount: attention.count,
        attentionCost: attention.cost,
        preventiveCount: preventive.count,
        preventiveCost: preventive.cost,
        safeCount: safe.count,
        totalRiskCost: Number(
          (expired.cost + critical.cost + attention.cost + preventive.cost).toFixed(2)
        ),
      },
    };
  } catch (err: any) {
    console.error("Erro em getExpirationsReport:", err);
    return {
      success: false,
      error: err.message || "Erro ao carregar relatório de vencimentos.",
      items: [],
      summary: {
        expiredCount: 0,
        expiredCost: 0,
        criticalCount: 0,
        criticalCost: 0,
        attentionCount: 0,
        attentionCost: 0,
        preventiveCount: 0,
        preventiveCost: 0,
        safeCount: 0,
        totalRiskCost: 0,
      },
    };
  }
}
