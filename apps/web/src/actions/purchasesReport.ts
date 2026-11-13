"use server";

import fs from "fs";
import path from "path";
import { prisma } from "@emporio/database";
import { resolveActiveCompany } from "@/lib/tenant";

export interface PurchasesReportFilter {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  storeId?: string;
  invoiceNum?: string;
  productId?: string;
  categoryId?: string;
  status?: "ALL" | "CONFIRMED" | "RETURNED" | "CANCELED";
  comparisonStartDate?: string;
  comparisonEndDate?: string;
}

export interface PurchasedProductItem {
  id: string;
  code: string;
  description: string;
  barcode: string | null;
  ncm: string | null;
  cfop: string | null;
  categoryName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseInvoiceDetail {
  id: string;
  invoiceNum: string;
  series: string;
  accessKey: string;
  date: string;
  issueDateFormatted: string;
  supplierId: string;
  supplierName: string;
  supplierDocument: string;
  storeId?: string;
  storeName?: string;
  itemsCount: number;
  productsTotal: number;
  discount: number;
  freightAndExpenses: number;
  totalAmount: number;
  returnsAmount: number;
  netAmount: number;
  status: "CONFIRMED" | "RETURNED" | "CANCELED";
  items: PurchasedProductItem[];
}

export interface SupplierPurchaseSummary {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  tradeName?: string;
  document: string;
  stateReg?: string;
  category: string;
  city?: string;
  state?: string;
  totalQuantity: number;
  invoicesCount: number;
  grossTotal: number;
  discounts: number;
  returns: number;
  netTotal: number;
  marketShare: number; // Percentual sobre o total de compras líquidas
  invoices: PurchaseInvoiceDetail[];
  // Comparativo de evolução
  previousNetTotal?: number;
  growthAmount?: number;
  growthPercentage?: number;
}

export interface MonthlyPurchasesEvolution {
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // "Jan/2026"
  totalAmount: number;
  invoicesCount: number;
  quantity: number;
}

export interface PurchasesReportResult {
  company: {
    id: string;
    name: string;
    document: string;
  };
  filterApplied: {
    startDate: string;
    endDate: string;
    supplierId?: string;
    storeId?: string;
    invoiceNum?: string;
    productId?: string;
    categoryId?: string;
    status: string;
    hasComparison: boolean;
    comparisonStartDate?: string;
    comparisonEndDate?: string;
  };
  summary: {
    totalPurchasesValue: number; // Valor líquido total
    totalGrossValue: number; // Valor bruto
    totalItemsQuantity: number; // Quantidade de mercadorias
    totalInvoicesCount: number; // Número de notas fiscais de entrada
    totalSuppliersCount: number; // Fornecedores distintos
    averageTicket: number; // Ticket médio por nota
    totalReturnsValue: number; // Devoluções
    totalDiscounts: number; // Descontos obtidos
    // Comparativo período anterior
    previousPeriodTotal?: number;
    periodGrowthAmount?: number;
    periodGrowthPercent?: number;
  };
  suppliers: SupplierPurchaseSummary[];
  invoicesList: PurchaseInvoiceDetail[];
  topProducts: Array<{
    productId: string;
    code: string;
    name: string;
    categoryName: string;
    totalQuantity: number;
    unit: string;
    avgUnitCost: number;
    totalCost: number;
    suppliersCount: number;
  }>;
  monthlyEvolution: MonthlyPurchasesEvolution[];
  availableSuppliers: Array<{ id: string; name: string; document: string }>;
  availableStores: Array<{ id: string; name: string; code: string }>;
  availableCategories: Array<{ id: string; name: string }>;
}

function parseDateSafe(raw?: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateBr(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getCandidateCachePaths() {
  return [
    path.join(process.cwd(), "apps", "web", "src", "data", "real_radar_invoices.json"),
    path.join(process.cwd(), "src", "data", "real_radar_invoices.json"),
    path.resolve(process.cwd(), "apps/web/src/data/real_radar_invoices.json"),
    path.resolve(process.cwd(), "src/data/real_radar_invoices.json"),
  ];
}

export async function getPurchasesBySupplierReport(
  filters: PurchasesReportFilter = {}
): Promise<PurchasesReportResult> {
  const company = await resolveActiveCompany();
  if (!company) {
    throw new Error("Empresa ativa não identificada na sessão.");
  }
  const companyId = company.id;

  // 1. Definir intervalos de datas padrão (mês corrente se não informado)
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const filterStart = filters.startDate ? new Date(filters.startDate + "T00:00:00") : defaultStart;
  const filterEnd = filters.endDate ? new Date(filters.endDate + "T23:59:59") : defaultEnd;

  // 2. Buscar fornecedores cadastrados na empresa
  const dbSuppliers = await prisma.supplier.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      tradeName: true,
      document: true,
      stateReg: true,
      category: true,
      city: true,
      state: true,
    },
    orderBy: { name: "asc" },
  });

  const supplierMap = new Map<string, (typeof dbSuppliers)[0]>();
  const supplierDocMap = new Map<string, (typeof dbSuppliers)[0]>();
  for (const s of dbSuppliers) {
    supplierMap.set(s.id, s);
    if (s.document) {
      const clean = s.document.replace(/\D/g, "");
      if (clean) supplierDocMap.set(clean, s);
    }
  }

  // 3. Buscar Lojas da empresa
  const dbStores = await prisma.store.findMany({
    where: { companyId, active: true },
    select: { id: true, name: true, code: true },
    orderBy: { code: "asc" },
  });
  const defaultStore = dbStores[0] || { id: "matriz", name: "Loja Principal / Matriz", code: "MATRIZ" };

  // 4. Buscar Categorias de Produtos
  const dbCategories = await prisma.category.findMany({
    where: { companyId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const categoryMap = new Map<string, string>();
  for (const c of dbCategories) {
    categoryMap.set(c.id, c.name);
  }

  // 5. Carregar entradas físicas confirmadas no banco (`stock_entries`)
  const stockEntries = await prisma.stockEntry.findMany({
    where: { companyId },
    include: {
      supplier: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              barcode: true,
              ncm: true,
              unit: true,
              categoryId: true,
            },
          },
        },
      },
    },
    orderBy: { entryDate: "desc" },
  });

  // 6. Carregar notas fiscais do Radar XML (real_radar_invoices.json)
  let radarInvoices: any[] = [];
  for (const cp of getCandidateCachePaths()) {
    if (fs.existsSync(cp)) {
      try {
        const fileContent = fs.readFileSync(cp, "utf-8");
        radarInvoices = JSON.parse(fileContent);
        if (Array.isArray(radarInvoices) && radarInvoices.length > 0) break;
      } catch {}
    }
  }

  // 7. Unificar todas as notas de compras sem duplicidade
  const unifiedInvoicesMap = new Map<string, PurchaseInvoiceDetail>();

  // A) Processar stockEntries do banco
  for (const entry of stockEntries) {
    const issueDate = entry.entryDate || new Date();
    const invNum = entry.invoiceNum || `ENT-${entry.id.slice(0, 6)}`;
    const accessKey = `ENTRADA-${entry.id}`;

    let supplierName = entry.supplier?.name || "Fornecedor Geral";
    let supplierDoc = entry.supplier?.document || "";
    let supplierId = entry.supplierId || "fornecedor-geral";

    const items: PurchasedProductItem[] = entry.items.map((item, idx) => {
      const prod = item.product;
      const catName = prod?.categoryId ? categoryMap.get(prod.categoryId) || "Geral" : "Geral";
      return {
        id: item.id || `item-${idx}`,
        code: prod?.id ? prod.id.slice(0, 8).toUpperCase() : `PRD-${idx + 1}`,
        description: prod?.name || "Mercadoria Sem Descrição",
        barcode: prod?.barcode || null,
        ncm: prod?.ncm || null,
        cfop: "1102",
        categoryName: catName,
        quantity: Number(item.quantity || 0),
        unit: prod?.unit || "UN",
        unitCost: Number(item.unitCost || 0),
        totalCost: Number(item.quantity || 0) * Number(item.unitCost || 0),
      };
    });

    const productsTotal = items.reduce((acc, it) => acc + it.totalCost, 0);
    const totalAmount = Number(entry.totalAmount || productsTotal);
    const discount = Math.max(0, productsTotal - totalAmount);

    unifiedInvoicesMap.set(invNum, {
      id: entry.id,
      invoiceNum: invNum,
      series: "1",
      accessKey,
      date: issueDate.toISOString(),
      issueDateFormatted: formatDateBr(issueDate),
      supplierId,
      supplierName,
      supplierDocument: supplierDoc,
      storeId: defaultStore.id,
      storeName: defaultStore.name,
      itemsCount: items.length,
      productsTotal,
      discount,
      freightAndExpenses: 0,
      totalAmount,
      returnsAmount: 0,
      netAmount: totalAmount,
      status: "CONFIRMED",
      items,
    });
  }

  // B) Processar notas do Radar XML (91 notas fiscais reais da empresa)
  for (const radar of radarInvoices) {
    const rawNum = String(radar.invoiceNum || "").trim();
    const key = radar.accessKey || rawNum;
    if (!rawNum) continue;

    // Se já foi processada pelo banco com o mesmo número, enriquecemos ou pulamos duplicata
    const existing = unifiedInvoicesMap.get(rawNum);
    if (existing) {
      if (radar.accessKey) existing.accessKey = radar.accessKey;
      if (radar.series) existing.series = radar.series;
      continue;
    }

    const cleanCnpj = (radar.supplierCnpj || "").replace(/\D/g, "");
    let matchedSup = cleanCnpj ? supplierDocMap.get(cleanCnpj) : null;
    if (!matchedSup && radar.supplierName) {
      const lower = radar.supplierName.toLowerCase();
      matchedSup = dbSuppliers.find((s) => s.name.toLowerCase().includes(lower.slice(0, 15))) || null;
    }

    const supplierId = matchedSup ? matchedSup.id : cleanCnpj ? `cnpj-${cleanCnpj}` : `sup-${rawNum}`;
    const supplierName = matchedSup ? matchedSup.name : radar.supplierName || "Fornecedor Parceiro";
    const supplierDocument = matchedSup?.document || radar.supplierCnpj || "";

    const issueDate = parseDateSafe(radar.issueDate) || now;

    // Identificar devolução através da natureza da operação ou status da manifestação
    const natOpLower = (radar.naturezaOp || "").toLowerCase();
    const isReturned =
      natOpLower.includes("devolu") ||
      natOpLower.includes("retorno") ||
      radar.statusManifest === "RECUSADA";
    const isCanceled = radar.statusManifest === "DESCONHECIDA";

    const items: PurchasedProductItem[] = Array.isArray(radar.itemsPreview)
      ? radar.itemsPreview.map((it: any, idx: number) => ({
          id: `item-radar-${rawNum}-${idx}`,
          code: it.barcode || `ITM-${idx + 1}`,
          description: it.name || "Mercadoria",
          barcode: it.barcode || null,
          ncm: it.ncm || null,
          cfop: it.cfop || "1102",
          categoryName: "Mercadorias",
          quantity: Number(it.quantity || 1),
          unit: it.unit || "UN",
          unitCost: Number(it.unitCost || 0),
          totalCost: Number(it.totalCost || Number(it.quantity || 1) * Number(it.unitCost || 0)),
        }))
      : [];

    const productsTotal = items.reduce((acc, it) => acc + it.totalCost, 0);
    const totalAmount = Number(radar.totalAmount || productsTotal);
    const returnsAmount = isReturned ? totalAmount : 0;
    const netAmount = isReturned ? 0 : totalAmount;
    const status: "CONFIRMED" | "RETURNED" | "CANCELED" = isCanceled
      ? "CANCELED"
      : isReturned
      ? "RETURNED"
      : "CONFIRMED";

    unifiedInvoicesMap.set(rawNum, {
      id: key,
      invoiceNum: rawNum,
      series: radar.series || "1",
      accessKey: radar.accessKey || key,
      date: issueDate.toISOString(),
      issueDateFormatted: formatDateBr(issueDate),
      supplierId,
      supplierName,
      supplierDocument,
      storeId: defaultStore.id,
      storeName: defaultStore.name,
      itemsCount: items.length,
      productsTotal: productsTotal > 0 ? productsTotal : totalAmount,
      discount: 0,
      freightAndExpenses: 0,
      totalAmount,
      returnsAmount,
      netAmount,
      status,
      items,
    });
  }

  const allInvoices = Array.from(unifiedInvoicesMap.values());

  // 8. Filtrar as notas conforme os parâmetros recebidos
  const filteredInvoices = allInvoices.filter((inv) => {
    const invDate = new Date(inv.date);
    if (invDate < filterStart || invDate > filterEnd) return false;

    if (filters.supplierId && filters.supplierId !== "ALL") {
      const matchId = inv.supplierId === filters.supplierId;
      const matchDoc = inv.supplierDocument && filters.supplierId.includes(inv.supplierDocument.replace(/\D/g, ""));
      if (!matchId && !matchDoc) return false;
    }

    if (filters.invoiceNum && filters.invoiceNum.trim()) {
      const term = filters.invoiceNum.trim().toLowerCase();
      const numMatch = inv.invoiceNum.toLowerCase().includes(term);
      const keyMatch = inv.accessKey.toLowerCase().includes(term);
      if (!numMatch && !keyMatch) return false;
    }

    if (filters.status && filters.status !== "ALL") {
      if (inv.status !== filters.status) return false;
    } else {
      // Por padrão em relatórios de compras válidas, ignoramos notas canceladas
      if (inv.status === "CANCELED") return false;
    }

    if (filters.productId && filters.productId.trim()) {
      const pTerm = filters.productId.trim().toLowerCase();
      const hasProd = inv.items.some(
        (it) =>
          it.description.toLowerCase().includes(pTerm) ||
          (it.barcode && it.barcode.includes(pTerm)) ||
          it.code.toLowerCase().includes(pTerm)
      );
      if (!hasProd) return false;
    }

    if (filters.categoryId && filters.categoryId !== "ALL") {
      const catTarget = categoryMap.get(filters.categoryId) || "";
      const hasCat = inv.items.some(
        (it) => it.categoryName.toLowerCase() === catTarget.toLowerCase()
      );
      if (!hasCat) return false;
    }

    return true;
  });

  // 9. Agrupamento por Fornecedor
  const supplierGroups = new Map<string, SupplierPurchaseSummary>();

  for (const inv of filteredInvoices) {
    const sKey = inv.supplierId;
    let group = supplierGroups.get(sKey);
    if (!group) {
      const meta = supplierMap.get(sKey);
      group = {
        supplierId: sKey,
        supplierCode: sKey.slice(0, 8).toUpperCase(),
        supplierName: inv.supplierName,
        tradeName: meta?.tradeName || undefined,
        document: inv.supplierDocument,
        stateReg: meta?.stateReg || undefined,
        category: meta?.category || "Geral",
        city: meta?.city || undefined,
        state: meta?.state || undefined,
        totalQuantity: 0,
        invoicesCount: 0,
        grossTotal: 0,
        discounts: 0,
        returns: 0,
        netTotal: 0,
        marketShare: 0,
        invoices: [],
      };
      supplierGroups.set(sKey, group);
    }

    const itemsQty = inv.items.reduce((acc, it) => acc + it.quantity, 0);
    group.totalQuantity += itemsQty;
    group.invoicesCount += 1;
    group.grossTotal += inv.totalAmount;
    group.discounts += inv.discount;
    group.returns += inv.returnsAmount;
    group.netTotal += inv.netAmount;
    group.invoices.push(inv);
  }

  // 10. Resumo Gerencial (KPIs)
  const totalGrossValue = filteredInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalReturnsValue = filteredInvoices.reduce((acc, inv) => acc + inv.returnsAmount, 0);
  const totalDiscounts = filteredInvoices.reduce((acc, inv) => acc + inv.discount, 0);
  const totalPurchasesValue = Math.max(0, totalGrossValue - totalDiscounts - totalReturnsValue);
  const totalInvoicesCount = filteredInvoices.length;
  const totalSuppliersCount = supplierGroups.size;
  const totalItemsQuantity = filteredInvoices.reduce(
    (acc, inv) => acc + inv.items.reduce((s, it) => s + it.quantity, 0),
    0
  );
  const averageTicket = totalInvoicesCount > 0 ? totalPurchasesValue / totalInvoicesCount : 0;

  // Calcular percentual de participação (Market Share) para cada fornecedor
  const suppliersList = Array.from(supplierGroups.values()).map((sup) => {
    sup.marketShare = totalPurchasesValue > 0 ? (sup.netTotal / totalPurchasesValue) * 100 : 0;
    // Ordenar notas do fornecedor pela data mais recente
    sup.invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sup;
  });

  // Ordenação padrão: Maior valor líquido comprado
  suppliersList.sort((a, b) => b.netTotal - a.netTotal);

  // 11. Comparativo com período anterior (se solicitado ou comparativo inteligente do mês anterior)
  let previousPeriodTotal: number | undefined = undefined;
  let periodGrowthAmount: number | undefined = undefined;
  let periodGrowthPercent: number | undefined = undefined;

  const compStart = filters.comparisonStartDate
    ? new Date(filters.comparisonStartDate + "T00:00:00")
    : null;
  const compEnd = filters.comparisonEndDate
    ? new Date(filters.comparisonEndDate + "T23:59:59")
    : null;

  if (compStart && compEnd) {
    const compInvoices = allInvoices.filter((inv) => {
      const d = new Date(inv.date);
      return d >= compStart && d <= compEnd && inv.status !== "CANCELED";
    });

    const compGross = compInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const compReturns = compInvoices.reduce((acc, inv) => acc + inv.returnsAmount, 0);
    previousPeriodTotal = Math.max(0, compGross - compReturns);
    periodGrowthAmount = totalPurchasesValue - previousPeriodTotal;
    periodGrowthPercent =
      previousPeriodTotal > 0 ? (periodGrowthAmount / previousPeriodTotal) * 100 : 0;

    // Comparar por fornecedor
    const compSupplierMap = new Map<string, number>();
    for (const cinv of compInvoices) {
      const cur = compSupplierMap.get(cinv.supplierId) || 0;
      compSupplierMap.set(cinv.supplierId, cur + cinv.netAmount);
    }

    for (const sup of suppliersList) {
      const prev = compSupplierMap.get(sup.supplierId) || 0;
      sup.previousNetTotal = prev;
      sup.growthAmount = sup.netTotal - prev;
      sup.growthPercentage = prev > 0 ? ((sup.netTotal - prev) / prev) * 100 : 0;
    }
  }

  // 12. Ranking de Produtos Mais Comprados
  const productAggMap = new Map<
    string,
    {
      productId: string;
      code: string;
      name: string;
      categoryName: string;
      totalQuantity: number;
      unit: string;
      totalCost: number;
      suppliers: Set<string>;
    }
  >();

  for (const inv of filteredInvoices) {
    for (const it of inv.items) {
      const pKey = it.code || it.description;
      let pEntry = productAggMap.get(pKey);
      if (!pEntry) {
        pEntry = {
          productId: it.id,
          code: it.code,
          name: it.description,
          categoryName: it.categoryName,
          totalQuantity: 0,
          unit: it.unit,
          totalCost: 0,
          suppliers: new Set<string>(),
        };
        productAggMap.set(pKey, pEntry);
      }
      pEntry.totalQuantity += it.quantity;
      pEntry.totalCost += it.totalCost;
      pEntry.suppliers.add(inv.supplierName);
    }
  }

  const topProducts = Array.from(productAggMap.values())
    .map((p) => ({
      productId: p.productId,
      code: p.code,
      name: p.name,
      categoryName: p.categoryName,
      totalQuantity: p.totalQuantity,
      unit: p.unit,
      avgUnitCost: p.totalQuantity > 0 ? p.totalCost / p.totalQuantity : 0,
      totalCost: p.totalCost,
      suppliersCount: p.suppliers.size,
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 30);

  // 13. Evolução Mensal de Compras (Últimos meses ou meses do período)
  const monthlyMap = new Map<string, { totalAmount: number; invoicesCount: number; quantity: number }>();
  for (const inv of allInvoices) {
    if (inv.status === "CANCELED") continue;
    const d = new Date(inv.date);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = monthlyMap.get(mKey) || { totalAmount: 0, invoicesCount: 0, quantity: 0 };
    cur.totalAmount += inv.netAmount;
    cur.invoicesCount += 1;
    cur.quantity += inv.items.reduce((acc, it) => acc + it.quantity, 0);
    monthlyMap.set(mKey, cur);
  }

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const monthlyEvolution: MonthlyPurchasesEvolution[] = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mKey, data]) => {
      const [year, month] = mKey.split("-");
      const mIdx = parseInt(month, 10) - 1;
      return {
        monthKey: mKey,
        monthLabel: `${monthNames[mIdx]}/${year}`,
        totalAmount: data.totalAmount,
        invoicesCount: data.invoicesCount,
        quantity: data.quantity,
      };
    });

  // Lista simples para os filtros
  const availableSuppliers = Array.from(
    new Map(allInvoices.map((i) => [i.supplierId, { id: i.supplierId, name: i.supplierName, document: i.supplierDocument }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const availableStores = dbStores.map((s) => ({ id: s.id, name: s.name, code: s.code }));
  const availableCategories = dbCategories.map((c) => ({ id: c.id, name: c.name }));

  return {
    company: {
      id: company.id,
      name: company.name,
      document: company.document || "",
    },
    filterApplied: {
      startDate: filterStart.toISOString().split("T")[0],
      endDate: filterEnd.toISOString().split("T")[0],
      supplierId: filters.supplierId,
      storeId: filters.storeId,
      invoiceNum: filters.invoiceNum,
      productId: filters.productId,
      categoryId: filters.categoryId,
      status: filters.status || "ALL",
      hasComparison: Boolean(compStart && compEnd),
      comparisonStartDate: filters.comparisonStartDate,
      comparisonEndDate: filters.comparisonEndDate,
    },
    summary: {
      totalPurchasesValue,
      totalGrossValue,
      totalItemsQuantity,
      totalInvoicesCount,
      totalSuppliersCount,
      averageTicket,
      totalReturnsValue,
      totalDiscounts,
      previousPeriodTotal,
      periodGrowthAmount,
      periodGrowthPercent,
    },
    suppliers: suppliersList,
    invoicesList: filteredInvoices.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    topProducts,
    monthlyEvolution,
    availableSuppliers,
    availableStores,
    availableCategories,
  };
}

