"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Printer,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Calendar,
  Download,
  CheckCircle2,
  BarChart3,
  Package,
  Eye,
  Store,
  Handshake,
  ClipboardCheck,
  Plus,
  X,
  Save,
  Search,
  AlertTriangle,
  Users,
  CalendarClock,
  Receipt,
  Camera,
  ShoppingBag,
} from "lucide-react";
import {
  getAllReportsDashboardData,
  createComodatoLoan,
  updateComodatoStatus,
  applyDailyStockBalance,
  getLossesReport,
  getLossPhotoById,
  getProductionByUserReport,
  getExpirationsReport,
} from "@/actions/reports";

type ReportTabId =
  | "dre-comparativo"
  | "vendas-revenda"
  | "comodatos"
  | "estoque-movimentacao"
  | "conferencia-balanco-diario"
  | "avarias-perdas"
  | "producao-usuario"
  | "controle-vencimentos"
  | "pagar-receber-curto-prazo";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTabId>("dre-comparativo");
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  // Dados carregados do banco
  const [customers, setCustomers] = useState<any[]>([]);
  const [resaleSales, setResaleSales] = useState<any[]>([]);
  const [stockReport, setStockReport] = useState<any[]>([]);
  const [comodatos, setComodatos] = useState<any[]>([]);
  const [comodatoAssets, setComodatoAssets] = useState<any[]>([]);
  const [dreComparison, setDreComparison] = useState<any>(null);

  // Dados das 3 novas abas reais
  const [lossesRows, setLossesRows] = useState<any[]>([]);
  const [lossesUsers, setLossesUsers] = useState<any[]>([]);
  const [lossesSummary, setLossesSummary] = useState({
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
  });
  const [lossStartDate, setLossStartDate] = useState("");
  const [lossEndDate, setLossEndDate] = useState("");
  const [lossTypeFilter, setLossTypeFilter] = useState("ALL");
  const [lossUserFilter, setLossUserFilter] = useState("ALL");
  const [loadingLosses, setLoadingLosses] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{
    photoData: string | null;
    receiptCode: string;
    productName: string;
  } | null>(null);

  const [prodByUser, setProdByUser] = useState<any[]>([]);
  const [prodLogs, setProdLogs] = useState<any[]>([]);
  const [prodUsers, setProdUsers] = useState<any[]>([]);
  const [prodStartDate, setProdStartDate] = useState("");
  const [prodEndDate, setProdEndDate] = useState("");
  const [prodUserFilter, setProdUserFilter] = useState("ALL");
  const [loadingProdReport, setLoadingProdReport] = useState(false);

  const [expItems, setExpItems] = useState<any[]>([]);
  const [expSummary, setExpSummary] = useState({
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
  });
  const [expBucketFilter, setExpBucketFilter] = useState("ALL");

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResellerFilter, setSelectedResellerFilter] = useState("ALL");
  const [auditTypeFilter, setAuditTypeFilter] = useState<"ALL" | "INSUMO" | "PORCAO" | "REVENDA">(
    "ALL"
  );

  // Estado do Balanço Diário (Contagem Física digitada)
  const [countedMap, setCountedMap] = useState<Record<string, string>>({});
  const [savingBalance, setSavingBalance] = useState(false);

  // Modal de Novo Comodato
  const [isComodatoModalOpen, setIsComodatoModalOpen] = useState(false);
  const [submittingComodato, setSubmittingComodato] = useState(false);

  useEffect(() => {
    // Verifica se veio redirecionado com ?tab=...
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "resale-sales") setActiveTab("vendas-revenda");
      else if (tabParam === "comodatos") setActiveTab("comodatos");
      else if (tabParam === "avarias-perdas") setActiveTab("avarias-perdas");
      else if (tabParam === "producao-usuario") setActiveTab("producao-usuario");
      else if (tabParam === "controle-vencimentos") setActiveTab("controle-vencimentos");
    }
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [res, lossRes, prodRes, expRes] = await Promise.all([
        getAllReportsDashboardData(),
        getLossesReport(),
        getProductionByUserReport(),
        getExpirationsReport(),
      ]);
      if (res.success) {
        setCustomers(res.customers || []);
        setResaleSales(res.resaleSales || []);
        setStockReport(res.stockReport || []);
        setComodatos(res.comodatos || []);
        setComodatoAssets(res.comodatoAssets || []);
        setDreComparison(res.dreComparison || null);

        const initialCounted: Record<string, string> = {};
        (res.stockReport || []).forEach((item: any) => {
          initialCounted[item.id] = String(item.currentStock);
        });
        setCountedMap(initialCounted);
      }
      if (lossRes.success) {
        setLossesRows(lossRes.rows || []);
        setLossesUsers(lossRes.users || []);
        if (lossRes.summary) setLossesSummary(lossRes.summary);
      }
      if (prodRes.success) {
        setProdByUser(prodRes.byUser || []);
        setProdLogs(prodRes.logs || []);
        setProdUsers(prodRes.users || []);
      }
      if (expRes.success) {
        setExpItems(expRes.items || []);
        if (expRes.summary) setExpSummary(expRes.summary);
      }
    } finally {
      setLoading(false);
    }
  }

  async function reloadLossesReport(
    overrides?: Partial<{
      startDate: string;
      endDate: string;
      lossType: string;
      userId: string;
    }>
  ) {
    setLoadingLosses(true);
    try {
      const res = await getLossesReport({
        startDate: overrides?.startDate ?? lossStartDate,
        endDate: overrides?.endDate ?? lossEndDate,
        lossType: overrides?.lossType ?? lossTypeFilter,
        userId: overrides?.userId ?? lossUserFilter,
      });
      if (res.success) {
        setLossesRows(res.rows || []);
        if (res.summary) setLossesSummary(res.summary);
      }
    } finally {
      setLoadingLosses(false);
    }
  }

  async function reloadProductionReport(
    overrides?: Partial<{
      startDate: string;
      endDate: string;
      userId: string;
    }>
  ) {
    setLoadingProdReport(true);
    try {
      const res = await getProductionByUserReport({
        startDate: overrides?.startDate ?? prodStartDate,
        endDate: overrides?.endDate ?? prodEndDate,
        userId: overrides?.userId ?? prodUserFilter,
      });
      if (res.success) {
        setProdByUser(res.byUser || []);
        setProdLogs(res.logs || []);
      }
    } finally {
      setLoadingProdReport(false);
    }
  }

  async function handleOpenLossPhoto(lossId: string) {
    const res = await getLossPhotoById(lossId);
    if (res.success) {
      setPhotoPreview({
        photoData: res.photoData || null,
        receiptCode: res.receiptCode || "",
        productName: res.productName || "Produto",
      });
    } else {
      alert(res.error || "Não foi possível carregar a foto.");
    }
  }

  function downloadCsv(filename: string, header: string, lines: string[]) {
    const blob = new Blob(["\uFEFF" + header + "\n" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function showToast(msg: string) {
    setBanner(msg);
    setTimeout(() => setBanner(null), 4500);
  }

  function fmt(v: number) {
    return Number(v || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Impressão de Folha de Conferência Diária (Estoque / Insumos / Porção) para Prancheta
  function handlePrintDailyCountWorksheet() {
    const filteredItems = stockReport.filter((item) =>
      auditTypeFilter === "ALL" ? true : item.itemType === auditTypeFilter
    );
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    const nowBr = new Date().toLocaleString("pt-BR");
    const rowsHtml = filteredItems
      .map(
        (item) => `
        <tr>
          <td style="padding:7px;border:1px solid #bbb;font-family:monospace;font-weight:bold;">${item.code}</td>
          <td style="padding:7px;border:1px solid #bbb;font-weight:bold;">${item.name}</td>
          <td style="padding:7px;border:1px solid #bbb;text-align:center;font-size:11px;">${
            item.itemType === "INSUMO"
              ? "Insumo / Matéria-Prima"
              : item.itemType === "PORCAO"
              ? "Porção / Produção Própria"
              : "Revenda"
          }</td>
          <td style="padding:7px;border:1px solid #bbb;text-align:center;font-weight:bold;">${item.unit}</td>
          <td style="padding:7px;border:1px solid #bbb;text-align:right;font-family:monospace;font-weight:bold;">${item.currentStock}</td>
          <td style="padding:7px;border:1px solid #bbb;text-align:center;color:#666;">__________________</td>
          <td style="padding:7px;border:1px solid #bbb;text-align:center;color:#666;">__________________</td>
        </tr>`
      )
      .join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Folha de Conferência Diária de Estoque, Insumos e Porções</title>
          <style>
            @page { margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #111; margin: 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
            th { background: #0d3b8e; color: #fff; padding: 8px; border: 1px solid #0d3b8e; text-transform: uppercase; font-size: 11px; }
          </style>
        </head>
        <body>
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0d3b8e;padding-bottom:10px;">
            <div>
              <h2 style="margin:0;color:#0d3b8e;">RELATÓRIO DE CONFERÊNCIA FÍSICA DIÁRIA (BALANÇO)</h2>
              <p style="margin:4px 0 0;font-size:12px;color:#444;">Filtro: <b>${
                auditTypeFilter === "ALL"
                  ? "Todos (Estoque, Insumos e Porções)"
                  : auditTypeFilter === "INSUMO"
                  ? "Apenas Insumos"
                  : auditTypeFilter === "PORCAO"
                  ? "Apenas Porções / Produção Própria"
                  : "Apenas Mercadoria de Revenda"
              }</b></p>
            </div>
            <div style="text-align:right;font-size:12px;">
              <div><b>CYBERTECH RP</b></div>
              <div>Emissão: ${nowBr}</div>
              <div style="margin-top:4px;">Conferente: ___________________________</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto / Insumo / Porção</th>
                <th>Classificação</th>
                <th>Unid.</th>
                <th>Qtd. Sistema</th>
                <th>Contagem Física (Anote)</th>
                <th>Diferença / Obs</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>window.onload = () => { window.print(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  }

  // Impressão genérica da aba ativa
  function handlePrintCurrentReport() {
    if (activeTab === "conferencia-balanco-diario") {
      handlePrintDailyCountWorksheet();
      return;
    }
    window.print();
  }

  // Salvar Balanço Diário no Sistema
  async function handleSaveDailyBalance() {
    setSavingBalance(true);
    const adjustments = Object.entries(countedMap).map(([productId, val]) => ({
      productId,
      countedStock: Number(val),
    }));
    const res = await applyDailyStockBalance(adjustments);
    setSavingBalance(false);
    if (res.success) {
      await loadAll();
      showToast(
        `Balanço Diário confirmado! ${res.updatedCount} produto(s)/insumo(s) tiveram a posição de estoque atualizada no sistema.`
      );
    } else {
      alert(res.error || "Erro ao aplicar balanço diário.");
    }
  }

  // Criar novo Comodato
  async function handleCreateComodato(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmittingComodato(true);
    const f = new FormData(e.currentTarget);
    const custId = f.get("customerId") as string;
    const foundCust = customers.find((c) => c.id === custId);

    const res = await createComodatoLoan({
      customerId: custId || undefined,
      customerName:
        foundCust?.name || (f.get("customCustomerName") as string) || "Cliente Parceiro",
      customerDocument: foundCust?.document || (f.get("customerDocument") as string) || "",
      itemDescription: f.get("itemDescription") as string,
      assetCode: f.get("assetCode") as string,
      quantity: Number(f.get("quantity") || 1),
      unitValue: Number(f.get("unitValue") || 0),
      loanDate: f.get("loanDate") as string,
      returnForecastDate: f.get("returnForecastDate") as string,
      notes: f.get("notes") as string,
    });
    setSubmittingComodato(false);

    if (res.success) {
      setIsComodatoModalOpen(false);
      await loadAll();
      showToast("Comodato registrado e vinculado ao cliente com sucesso!");
    } else {
      alert(res.error || "Erro ao registrar comodato.");
    }
  }

  // Filtragem das listas
  const filteredResaleSales = resaleSales.filter((row) => {
    const matchCust =
      selectedResellerFilter === "ALL" || row.customerName === selectedResellerFilter;
    const matchSearch =
      row.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.itemsSummary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCust && matchSearch;
  });

  const filteredStockReport = stockReport.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAuditRows = stockReport.filter((p) => {
    const matchType = auditTypeFilter === "ALL" || p.itemType === auditTypeFilter;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const activeComodatosValue = comodatos
    .filter((c) => c.status === "EM_POSSE")
    .reduce((acc, c) => acc + Number(c.totalValue || 0), 0);

  return (
    <div className="w-full flex flex-col gap-5 select-none pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Central de Relatórios, DRE Mês a Mês, Comodatos & Balanço Diário
            </h1>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Todos os relatórios operacionais e gerenciais integrados ao banco de dados em tempo real.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <Link
            href="/reports/purchases-by-supplier"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <ShoppingBag size={15} />
            <span>Compras por Fornecedor</span>
          </Link>
          <a
            href="/RELATORIO_LANCAMENTO_BALANCO_EMPORIO_AGROBELEM.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download size={14} /> Balanço Geral (PDF)
          </a>
          <a
            href="/RELATORIO_PRODUTOS_RETIRADOS_ESTOQUE_EMPORIO_AGROBELEM.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download size={14} /> Itens Retirados (PDF)
          </a>
          <button
            type="button"
            onClick={handlePrintCurrentReport}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Printer size={15} /> Imprimir Relatório Atual
          </button>
        </div>
      </div>

      {banner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          {banner}
        </div>
      )}

      {/* ── NAVEGAÇÃO DOS 8 RELATÓRIOS PRINCIPAIS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        {[
          {
            id: "dre-comparativo" as const,
            title: "1. DRE Mês a Mês",
            subtitle: "Comparativo de evolução mensal",
            icon: <BarChart3 size={18} />,
            color: "emerald",
          },
          {
            id: "vendas-revenda" as const,
            title: "2. Vendas Clientes Revenda",
            subtitle: `${resaleSales.length} venda(s) atacado/parceiros`,
            icon: <Store size={18} />,
            color: "indigo",
          },
          {
            id: "comodatos" as const,
            title: "3. Controle de Comodatos",
            subtitle: `${comodatoAssets.length} recebido(s) • ${comodatos.filter((c) => c.status === "EM_POSSE").length} cedido(s)`,
            icon: <Handshake size={18} />,
            color: "amber",
          },
          {
            id: "estoque-movimentacao" as const,
            title: "4. Relatório de Estoque",
            subtitle: "Cód • Produto • Atual • Comprado • Vendas",
            icon: <Package size={18} />,
            color: "blue",
          },
          {
            id: "conferencia-balanco-diario" as const,
            title: "5. Conferência & Balanço Diário",
            subtitle: "Estoque, Insumos e Porções (Imprimir/Lançar)",
            icon: <ClipboardCheck size={18} />,
            color: "rose",
          },
          {
            id: "avarias-perdas" as const,
            title: "6. Avarias & Descarte/Troca",
            subtitle: `${lossesSummary.totalRecords} ocorrências • R$ ${fmt(lossesSummary.totalLossValue)}`,
            icon: <AlertTriangle size={18} />,
            color: "red",
          },
          {
            id: "producao-usuario" as const,
            title: "7. Produção por Usuário",
            subtitle: `${prodLogs.length} lote(s) • ${prodByUser.length} produtor(es)`,
            icon: <Users size={18} />,
            color: "purple",
          },
          {
            id: "controle-vencimentos" as const,
            title: "8. Controle de Vencimentos",
            subtitle: `${expSummary.expiredCount + expSummary.criticalCount} críticos • R$ ${fmt(expSummary.totalRiskCost)} risco`,
            icon: <CalendarClock size={18} />,
            color: "orange",
          },
        ].map((card) => {
          const active = activeTab === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveTab(card.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                active
                  ? "bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20"
                  : "bg-white text-gray-800 border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    active ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {card.icon}
                </div>
                {active && (
                  <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                )}
              </div>
              <div>
                <div className="text-xs font-black leading-snug">{card.title}</div>
                <div
                  className={`text-[11px] mt-0.5 font-medium ${
                    active ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {card.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          ABA 1: DRE COMPARANDO MÊS A MÊS
      ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "dre-comparativo" && dreComparison && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-[#0d3b8e] to-[#1554c0] text-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">
                Demonstrativo Gerencial Comparativo
              </span>
              <h2 className="text-base font-black">
                DRE Comparando Mês a Mês ({dreComparison.month1.label} • {dreComparison.month2.label} •{" "}
                {dreComparison.month3.label})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-white text-[#0d3b8e] hover:bg-blue-50 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer"
            >
              <Printer size={14} /> Imprimir DRE Comparativo
            </button>
          </div>

          <div className="p-6 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase text-[10px] font-black">
                <tr>
                  <th className="p-3.5">Estrutura do DRE</th>
                  <th className="p-3.5 text-right">{dreComparison.month1.label}</th>
                  <th className="p-3.5 text-right">{dreComparison.month2.label}</th>
                  <th className="p-3.5 text-right bg-blue-50/60 text-blue-900">
                    {dreComparison.month3.label}
                  </th>
                  <th className="p-3.5 text-right">Diferença (R$)</th>
                  <th className="p-3.5 text-right">Evolução Mês a Mês (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {[
                  {
                    label: "1. RECEITA OPERACIONAL BRUTA (Vendas Balcão + Revenda)",
                    key: "grossRevenue",
                    bold: true,
                    highlight: "emerald",
                  },
                  {
                    label: "(-) Impostos sobre Vendas (Simples Nacional / ICMS)",
                    key: "taxes",
                    isNegative: true,
                  },
                  {
                    label: "(-) Taxas de Cartões / Maquinetas POS (MDR)",
                    key: "cardFees",
                    isNegative: true,
                  },
                  {
                    label: "2. RECEITA OPERACIONAL LÍQUIDA",
                    key: "netRevenue",
                    bold: true,
                  },
                  {
                    label: "(-) CMV (Custo das Mercadorias Vendidas e Insumos Produção)",
                    key: "cmv",
                    isNegative: true,
                  },
                  {
                    label: "3. LUCRO BRUTO (MARGEM DE CONTRIBUIÇÃO)",
                    key: "grossProfit",
                    bold: true,
                    highlight: "blue",
                  },
                  {
                    label: "(-) Despesas Operacionais (Aluguel, Energia Freezers, Folha, Água)",
                    key: "operatingExpenses",
                    isNegative: true,
                  },
                  {
                    label: "4. RESULTADO LÍQUIDO DO MÊS (LUCRO LÍQUIDO)",
                    key: "netProfit",
                    bold: true,
                    highlight: "result",
                  },
                ].map((line) => {
                  const v1 = Number(dreComparison.month1[line.key] || 0);
                  const v2 = Number(dreComparison.month2[line.key] || 0);
                  const v3 = Number(dreComparison.month3[line.key] || 0);
                  const diff = v3 - v2;
                  const pct = v2 > 0 ? ((v3 - v2) / v2) * 100 : 0;

                  return (
                    <tr
                      key={line.key}
                      className={
                        line.highlight === "result"
                          ? "bg-emerald-50 font-black text-sm text-emerald-950"
                          : line.bold
                          ? "bg-gray-50/80 font-black text-gray-900"
                          : "text-gray-700"
                      }
                    >
                      <td className={`p-3.5 ${!line.bold ? "pl-7" : ""}`}>{line.label}</td>
                      <td className="p-3.5 text-right font-mono">
                        {line.isNegative ? "- " : ""}R$ {fmt(v1)}
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        {line.isNegative ? "- " : ""}R$ {fmt(v2)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black bg-blue-50/40 text-gray-900">
                        {line.isNegative ? "- " : ""}R$ {fmt(v3)}
                      </td>
                      <td
                        className={`p-3.5 text-right font-mono font-bold ${
                          diff >= 0 ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {diff >= 0 ? "+ " : "- "}R$ {fmt(Math.abs(diff))}
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            pct >= 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {pct >= 0 ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          ABA 2: RELATÓRIO DE VENDAS A CLIENTES REVENDA
      ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "vendas-revenda" && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-800 to-indigo-600 text-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
                Atacado & Parceiros Revendedores
              </span>
              <h2 className="text-base font-black">
                Relatório de Vendas para Clientes Revenda
              </h2>
            </div>
            <div className="flex gap-2">
              <a
                href="/customers"
                className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Store size={14} /> Gerenciar Clientes Revenda
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-white text-indigo-800 hover:bg-indigo-50 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer"
              >
                <Printer size={14} /> Imprimir Relatório
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente ou produto..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>
              <select
                value={selectedResellerFilter}
                onChange={(e) => setSelectedResellerFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
              >
                <option value="ALL">Todos os Clientes Revenda</option>
                {customers
                  .filter((c) => c.customerType === "REVENDA")
                  .map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="text-xs font-bold text-gray-600">
              Total Faturado p/ Revenda:{" "}
              <strong className="text-indigo-700 font-mono text-sm">
                R$ {fmt(filteredResaleSales.reduce((a, b) => a + Number(b.totalAmount || 0), 0))}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase text-[10px] font-black">
                <tr>
                  <th className="p-3.5">Data</th>
                  <th className="p-3.5">Cliente Revenda</th>
                  <th className="p-3.5">CNPJ / CPF</th>
                  <th className="p-3.5">Produtos Vendidos (Doces, Carnes, Bebidas)</th>
                  <th className="p-3.5 text-center">Qtd. Itens</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResaleSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 font-semibold">
                      Nenhuma venda real para clientes de revenda registrada até o momento.
                    </td>
                  </tr>
                ) : (
                  filteredResaleSales.map((row) => (
                    <tr key={row.id} className="hover:bg-indigo-50/30">
                      <td className="p-3.5 font-mono text-gray-600">{row.date}</td>
                      <td className="p-3.5 font-bold text-gray-900">{row.customerName}</td>
                      <td className="p-3.5 font-mono text-gray-500">{row.document}</td>
                      <td className="p-3.5 text-gray-700 font-medium">{row.itemsSummary}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{row.totalQty}</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                          {row.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-indigo-700 text-sm">
                        R$ {fmt(row.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          ABA 3: LANÇAMENTOS DE COMODATOS, ACOMPANHAMENTO E RELATÓRIO
      ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "comodatos" && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-amber-700 to-amber-600 text-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 block">
                Controle Patrimonial em Clientes (Freezers, Expositores, Caixas Térmicas e Vasilhames)
              </span>
              <h2 className="text-base font-black">
                Lançamentos e Acompanhamento de Comodatos
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsComodatoModalOpen(true)}
                className="px-4 py-2 bg-white text-amber-900 hover:bg-amber-50 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={15} /> + Lançar Novo Comodato
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-900/40 hover:bg-amber-900/60 text-white border border-amber-300/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} /> Imprimir Relatório
              </button>
            </div>
          </div>

          <div className="p-4 bg-amber-50/40 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex gap-6">
              <span>
                Itens Ativos em Posse de Clientes:{" "}
                <strong className="text-amber-800 font-black">
                  {comodatos.filter((c) => c.status === "EM_POSSE").length} registro(s)
                </strong>
              </span>
              <span>
                Valor Patrimonial em Comodato na Rua:{" "}
                <strong className="text-amber-900 font-mono font-black">
                  R$ {fmt(activeComodatosValue)}
                </strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase text-[10px] font-black">
                <tr>
                  <th className="p-3.5">Patrimônio / Série</th>
                  <th className="p-3.5">Equipamento / Item em Comodato</th>
                  <th className="p-3.5">Cliente Responsável</th>
                  <th className="p-3.5 text-center">Qtd.</th>
                  <th className="p-3.5 text-center">Data Envio</th>
                  <th className="p-3.5 text-center">Previsão Retorno</th>
                  <th className="p-3.5 text-right">Valor Estimado</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right print:hidden">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comodatos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400 font-semibold">
                      Nenhum comodato cedido a clientes registrado no sistema até o momento. Clique em &quot;+ Lançar Novo Comodato&quot; caso empreste algum equipamento a terceiros.
                    </td>
                  </tr>
                ) : (
                  comodatos.map((c) => (
                    <tr key={c.id} className="hover:bg-amber-50/20">
                      <td className="p-3.5 font-mono font-bold text-gray-700">{c.assetCode}</td>
                      <td className="p-3.5 font-bold text-gray-900">
                        {c.itemDescription}
                        {c.notes && (
                          <span className="block text-[10px] text-gray-500 font-normal mt-0.5">
                            Obs: {c.notes}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-gray-800 block">{c.customerName}</span>
                        <span className="font-mono text-[10px] text-gray-500">
                          {c.customerDocument}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold">{c.quantity}</td>
                      <td className="p-3.5 text-center font-mono text-gray-600">{c.loanDate}</td>
                      <td className="p-3.5 text-center font-mono text-gray-600">
                        {c.returnForecastDate || "Indeterminado"}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-gray-900">
                        R$ {fmt(c.totalValue)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                            c.status === "EM_POSSE"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : c.status === "DEVOLVIDO"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-red-100 text-red-700 border-red-200"
                          }`}
                        >
                          {c.status === "EM_POSSE"
                            ? "EM POSSE DO CLIENTE"
                            : c.status === "DEVOLVIDO"
                            ? "DEVOLVIDO"
                            : "MANUTENÇÃO"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right print:hidden">
                        {c.status === "EM_POSSE" ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await updateComodatoStatus(c.id, "DEVOLVIDO");
                              await loadAll();
                              showToast("Comodato marcado como DEVOLVIDO!");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] cursor-pointer"
                          >
                            Dar Baixa (Devolvido)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              await updateComodatoStatus(c.id, "EM_POSSE");
                              await loadAll();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-[11px] cursor-pointer"
                          >
                            Reativar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Seção Real de Equipamentos em Comodato Recebidos na Loja (Tabela Asset) */}
          <div className="border-t-2 border-amber-100 bg-gray-50/40 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-gray-900">
                Equipamentos Recebidos em Comodato na Loja (Patrimônio Real / COI 007)
              </h3>
              <p className="text-[11px] text-gray-500">
                Equipamentos reais cadastrados no módulo de Patrimônio / Comodatos ({" "}
                <strong>{comodatoAssets.length} item(ns)</strong> • Total:{" "}
                <strong className="font-mono text-gray-800">
                  R$ {fmt(comodatoAssets.reduce((a, b) => a + Number(b.value || 0), 0))}
                </strong>
                )
              </p>
            </div>
            <a
              href="/assets"
              className="px-3 py-1.5 bg-white border border-gray-200 hover:border-amber-300 rounded-xl text-xs font-bold text-gray-700"
            >
              Ver Patrimônio Completo
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100/70 text-gray-500 border-y border-gray-200 uppercase text-[10px] font-black">
                <tr>
                  <th className="p-3.5">Código</th>
                  <th className="p-3.5">Equipamento Real</th>
                  <th className="p-3.5">Marca / Modelo</th>
                  <th className="p-3.5">Localização</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Valor Contábil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {comodatoAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-400">
                      Nenhum bem na categoria COMODATO cadastrado em Patrimônio.
                    </td>
                  </tr>
                ) : (
                  comodatoAssets.map((a) => (
                    <tr key={a.id} className="hover:bg-amber-50/20">
                      <td className="p-3.5 font-mono font-bold text-amber-800">{a.code}</td>
                      <td className="p-3.5 font-bold text-gray-900">
                        {a.name}
                        {a.notes && (
                          <span className="block text-[10px] text-gray-500 font-normal mt-0.5">
                            {a.notes}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-gray-600">
                        {[a.brand, a.model].filter(Boolean).join(" • ") || "---"}
                      </td>
                      <td className="p-3.5 text-gray-600">{a.location}</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                          {a.status === "ACTIVE" ? "EM USO NA LOJA" : a.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-gray-900">
                        R$ {fmt(a.value)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          ABA 4: RELATÓRIO DE ESTOQUE (CÓDIGO | PRODUTO | QTD ESTOQUE ATUAL | QTD COMPRADA | VENDAS)
      ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "estoque-movimentacao" && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-[#0d3b8e] to-[#1e64d8] text-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">
                Movimentação Consolidada de Mercadorias
              </span>
              <h2 className="text-base font-black">
                Relatório de Estoque (Código • Produto • Qtd. Estoque Atual • Qtd. Comprada • Vendas)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-white text-[#0d3b8e] hover:bg-blue-50 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer"
            >
              <Printer size={14} /> Imprimir Relatório
            </button>
          </div>

          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50 print:hidden">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por código ou nome do produto..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-xs font-bold text-gray-600">
              Total de Produtos Listados: <strong>{filteredStockReport.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0d3b8e] text-white uppercase text-[11px] font-black">
                <tr>
                  <th className="p-3.5">Código</th>
                  <th className="p-3.5">Produto</th>
                  <th className="p-3.5 text-center">Quantidade Estoque Atual</th>
                  <th className="p-3.5 text-center">Quantidade Comprada</th>
                  <th className="p-3.5 text-center">Vendas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStockReport.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={idx % 2 === 0 ? "bg-white hover:bg-blue-50/40" : "bg-blue-50/20 hover:bg-blue-50/40"}
                  >
                    <td className="p-3.5 font-mono font-bold text-[#0d3b8e]">{p.code}</td>
                    <td className="p-3.5 font-bold text-gray-900">
                      {p.name}{" "}
                      <span className="text-[10px] font-semibold text-gray-400">({p.unit})</span>
                    </td>
                    <td className="p-3.5 text-center font-mono font-black text-gray-900 text-sm">
                      {p.currentStock} {p.unit}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-blue-700">
                      {p.purchasedQty} {p.unit}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-emerald-700">
                      {p.soldQty} {p.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          ABA 5: RELATÓRIO DE CONFERÊNCIA DE POSIÇÃO DE ESTOQUE / INSUMOS / PORÇÃO + BALANÇO DIÁRIO
      ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "conferencia-balanco-diario" && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-rose-700 to-rose-600 text-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-100 block">
                Folha de Contagem Diária (Imprimir p/ Contar) + Lançamento Rápido de Balanço em Sistema
              </span>
              <h2 className="text-base font-black">
                Conferência de Posição de Estoque, Insumos e Porções (Balanço Diário)
              </h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={handlePrintDailyCountWorksheet}
                className="px-4 py-2 bg-white text-rose-900 hover:bg-rose-50 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer size={15} /> 1. Imprimir Folha para Contagem Física
              </button>
              <button
                type="button"
                onClick={handleSaveDailyBalance}
                disabled={savingBalance}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Save size={15} />{" "}
                {savingBalance ? "Gravando Balanço..." : "2. Confirmar e Lançar Balanço no Sistema"}
              </button>
            </div>
          </div>

          {/* Filtros de Classificação: Todos | Insumos | Porções (Doces & Carnes) | Revenda */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 flex-wrap">
              {[
                { key: "ALL" as const, label: "Todos os Itens" },
                { key: "INSUMO" as const, label: "Apenas Insumos / Matéria-Prima" },
                { key: "PORCAO" as const, label: "Porções / Produção Própria (Doces & Carnes)" },
                { key: "REVENDA" as const, label: "Mercadorias de Revenda" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setAuditTypeFilter(btn.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    auditTypeFilter === btn.key
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar insumo, porção ou produto..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase text-[10px] font-black">
                <tr>
                  <th className="p-3.5">Código</th>
                  <th className="p-3.5">Produto / Insumo / Porção</th>
                  <th className="p-3.5 text-center">Tipo</th>
                  <th className="p-3.5 text-center">Unidade</th>
                  <th className="p-3.5 text-right">Qtd. no Sistema</th>
                  <th className="p-3.5 text-center w-44">Qtd. Contada (Balanço)</th>
                  <th className="p-3.5 text-right">Diferença Apurada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAuditRows.map((item) => {
                  const countedVal = Number(countedMap[item.id] ?? item.currentStock);
                  const diff = Number((countedVal - item.currentStock).toFixed(2));
                  return (
                    <tr key={item.id} className="hover:bg-rose-50/20">
                      <td className="p-3.5 font-mono font-bold text-gray-700">{item.code}</td>
                      <td className="p-3.5 font-bold text-gray-900">{item.name}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.itemType === "INSUMO"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : item.itemType === "PORCAO"
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {item.itemType === "INSUMO"
                            ? "INSUMO"
                            : item.itemType === "PORCAO"
                            ? "PORÇÃO / PRODUÇÃO"
                            : "REVENDA"}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-gray-600">{item.unit}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-gray-800">
                        {item.currentStock}
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={countedMap[item.id] ?? item.currentStock}
                          onChange={(e) =>
                            setCountedMap((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="w-28 px-3 py-1.5 bg-white border-2 border-blue-300 focus:border-blue-600 rounded-xl text-center font-mono font-black text-sm text-gray-900 outline-none"
                        />
                      </td>
                      <td className="p-3.5 text-right font-mono font-black">
                        {Math.abs(diff) < 0.001 ? (
                          <span className="text-gray-400">0 (Conferido)</span>
                        ) : diff > 0 ? (
                          <span className="text-emerald-600">
                            +{diff} {item.unit} (Sobra)
                          </span>
                        ) : (
                          <span className="text-red-600">
                            {diff} {item.unit} (Falta)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          ABA 6: AVARIAS & DESCARTE / TROCA
      ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "avarias-perdas" && (() => {
        const filteredLosses = lossesRows.filter((row) => {
          const q = searchQuery.trim().toLowerCase();
          if (!q) return true;
          return (
            row.productName.toLowerCase().includes(q) ||
            row.receiptCode.toLowerCase().includes(q) ||
            row.reason.toLowerCase().includes(q) ||
            (row.supplierName && row.supplierName.toLowerCase().includes(q))
          );
        });

        const totalQtyFiltered = filteredLosses.reduce((a, b) => a + Number(b.quantity || 0), 0);
        const totalLossFiltered = filteredLosses.reduce((a, b) => a + Number(b.totalLoss || 0), 0);

        const lossTypeLabel = (t: string) => {
          if (t === "SUPPLIER_EXCHANGE") return "Troca Fornecedor";
          if (t === "EXPIRED") return "Vencido";
          if (t === "OTHER") return "Outro";
          return "Descarte";
        };
        const lossTypeBadge = (t: string) => {
          if (t === "SUPPLIER_EXCHANGE") return "bg-indigo-50 text-indigo-700 border-indigo-200";
          if (t === "EXPIRED") return "bg-rose-50 text-rose-700 border-rose-200";
          if (t === "OTHER") return "bg-gray-100 text-gray-700 border-gray-200";
          return "bg-amber-50 text-amber-800 border-amber-200";
        };

        return (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden space-y-0">
            <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-rose-600 text-white flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-100 block">
                  Controle Real de Perdas, Vencimentos e Trocas com Fornecedores
                </span>
                <h2 className="text-base font-black">
                  Relatório de Avarias &amp; Descarte / Troca
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      `avarias_perdas_${new Date().toISOString().slice(0, 10)}.csv`,
                      "Recibo;Data;Produto;Tipo;Quantidade;Unidade;Custo_Unitario;Prejuizo_Total;Usuario;Motivo;Fornecedor",
                      filteredLosses.map(
                        (r) =>
                          `"${r.receiptCode}";"${r.dateFormatted}";"${r.productName}";"${lossTypeLabel(
                            r.lossType
                          )}";${r.quantity};"${r.productUnit}";${r.unitCost.toFixed(
                            2
                          )};${r.totalLoss.toFixed(2)};"${r.userName}";"${r.reason}";"${
                            r.supplierName || ""
                          }"`
                      )
                    )
                  }
                  className="px-3.5 py-2 bg-white text-rose-800 hover:bg-rose-50 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} /> Exportar CSV
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="p-4 bg-rose-50/40 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                  Ocorrências Filtradas
                </span>
                <span className="text-xl font-black font-mono text-gray-900">
                  {filteredLosses.length}
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                  Quantidade Baixada
                </span>
                <span className="text-xl font-black font-mono text-rose-700">
                  {totalQtyFiltered.toFixed(2)}
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                  Prejuízo Total (Custo)
                </span>
                <span className="text-xl font-black font-mono text-red-700">
                  R$ {fmt(totalLossFiltered)}
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                  Vencidos vs Trocas
                </span>
                <span className="text-xs font-bold text-gray-700 block mt-1">
                  Vencidos: {lossesSummary.expiredCount} • Trocas: {lossesSummary.exchangeCount} • Descarte:{" "}
                  {lossesSummary.discardCount}
                </span>
              </div>
            </div>

            {/* Filtros */}
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-end gap-3 bg-gray-50/50 print:hidden">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={lossStartDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLossStartDate(val);
                    reloadLossesReport({ startDate: val });
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={lossEndDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLossEndDate(val);
                    reloadLossesReport({ endDate: val });
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                  Tipo de Avaria
                </label>
                <select
                  value={lossTypeFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLossTypeFilter(val);
                    reloadLossesReport({ lossType: val });
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                >
                  <option value="ALL">Todos os Tipos</option>
                  <option value="DISCARD">Descarte (DISCARD)</option>
                  <option value="SUPPLIER_EXCHANGE">Troca Fornecedor (SUPPLIER_EXCHANGE)</option>
                  <option value="EXPIRED">Vencido (EXPIRED)</option>
                  <option value="OTHER">Outro (OTHER)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                  Responsável
                </label>
                <select
                  value={lossUserFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLossUserFilter(val);
                    reloadLossesReport({ userId: val });
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                >
                  <option value="ALL">Todos os Usuários</option>
                  {lossesUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar produto, recibo ou motivo..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase text-[10px] font-black">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Recibo</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-right">Qtd.</th>
                    <th className="p-3 text-right">Custo Unit.</th>
                    <th className="p-3 text-right">Prejuízo Total</th>
                    <th className="p-3">Usuário</th>
                    <th className="p-3">Motivo / Fornecedor</th>
                    <th className="p-3 text-right print:hidden">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingLosses ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-400 font-bold">
                        Filtrando registros de avarias...
                      </td>
                    </tr>
                  ) : filteredLosses.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-400">
                        Nenhuma avaria ou perda registrada para os filtros informados.
                      </td>
                    </tr>
                  ) : (
                    filteredLosses.map((row) => (
                      <tr key={row.id} className="hover:bg-rose-50/20">
                        <td className="p-3 font-mono text-gray-500">{row.dateFormatted}</td>
                        <td className="p-3 font-mono font-black text-rose-700">{row.receiptCode}</td>
                        <td className="p-3 font-bold text-gray-900">{row.productName}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${lossTypeBadge(
                              row.lossType
                            )}`}
                          >
                            {lossTypeLabel(row.lossType)}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-red-600">
                          -{row.quantity} {row.productUnit}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          R$ {fmt(row.unitCost)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-red-700">
                          R$ {fmt(row.totalLoss)}
                        </td>
                        <td className="p-3 font-semibold text-gray-700">{row.userName}</td>
                        <td className="p-3 text-gray-600">
                          <div>{row.reason}</div>
                          {row.supplierName && (
                            <span className="text-[10px] font-bold text-indigo-700 block">
                              Fornecedor: {row.supplierName}
                            </span>
                          )}
                          {row.notes && (
                            <span className="text-[10px] text-gray-400 block">{row.notes}</span>
                          )}
                        </td>
                        <td className="p-3 text-right print:hidden">
                          <div className="flex items-center justify-end gap-1.5">
                            {row.hasPhoto && (
                              <button
                                type="button"
                                onClick={() => handleOpenLossPhoto(row.id)}
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px] inline-flex items-center gap-1"
                              >
                                <Camera size={12} /> Foto
                              </button>
                            )}
                            <Link
                              href={`/losses/recibo/${row.id}`}
                              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200 font-bold text-[11px] inline-flex items-center gap-1"
                            >
                              <Receipt size={12} /> Recibo
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────────────────
          ABA 7: PRODUÇÃO POR USUÁRIO
      ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "producao-usuario" && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-purple-700 to-indigo-600 text-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-100 block">
                Produtividade por Colaborador, Consumo de Insumos e Rastreabilidade de Lotes
              </span>
              <h2 className="text-base font-black">
                Relatório de Produção por Usuário
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `producao_por_usuario_${new Date().toISOString().slice(0, 10)}.csv`,
                  "Data;Produto;Quantidade;Unidade;Custo_Insumos;Lote;Validade;Produtor;Observacoes",
                  prodLogs.map(
                    (l) =>
                      `"${l.dateFormatted}";"${l.productName}";${l.quantityProduced};"${
                        l.productUnit
                      }";${Number(l.totalCost || 0).toFixed(2)};"${l.batchNumber}";"${
                        l.expirationDateFormatted
                      }";"${l.userName}";"${l.notes || ""}"`
                  )
                )
              }
              className="px-3.5 py-2 bg-white text-indigo-800 hover:bg-indigo-50 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} /> Exportar CSV
            </button>
          </div>

          {/* Filtros */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-end gap-3 bg-gray-50/50 print:hidden">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={prodStartDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setProdStartDate(val);
                  reloadProductionReport({ startDate: val });
                }}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={prodEndDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setProdEndDate(val);
                  reloadProductionReport({ endDate: val });
                }}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                Usuário Produtor
              </label>
              <select
                value={prodUserFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setProdUserFilter(val);
                  reloadProductionReport({ userId: val });
                }}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
              >
                <option value="ALL">Todos os Usuários</option>
                {prodUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resumo Agrupado por Usuário */}
          <div className="p-4 border-b border-gray-200 bg-indigo-50/30">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-900 mb-3">
              Resumo Agrupado por Usuário
            </h3>
            <div className="overflow-x-auto bg-white border border-indigo-100 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-indigo-50/70 text-indigo-900 uppercase text-[10px] font-black border-b border-indigo-100">
                  <tr>
                    <th className="p-3">Usuário Produtor</th>
                    <th className="p-3">Perfil</th>
                    <th className="p-3 text-center">Total de Lotes</th>
                    <th className="p-3 text-right">Total Produzido</th>
                    <th className="p-3 text-center">Receitas Distintas</th>
                    <th className="p-3 text-right">Custo dos Insumos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prodByUser.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-400">
                        Nenhuma produção registrada no período.
                      </td>
                    </tr>
                  ) : (
                    prodByUser.map((u) => (
                      <tr
                        key={u.userId}
                        onClick={() => {
                          const next = prodUserFilter === u.userId ? "ALL" : u.userId;
                          setProdUserFilter(next);
                          reloadProductionReport({ userId: next });
                        }}
                        className={`cursor-pointer transition-colors ${
                          prodUserFilter === u.userId ? "bg-indigo-50" : "hover:bg-indigo-50/40"
                        }`}
                      >
                        <td className="p-3 font-black text-gray-900">{u.userName}</td>
                        <td className="p-3 text-gray-500 font-mono text-[11px]">{u.userRole}</td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-700">
                          {u.totalLotes}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-gray-900">
                          {u.totalProduzido}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-gray-700">
                          {u.receitasDistintas}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700">
                          R$ {fmt(u.custoInsumos)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabela Detalhada dos ProductionLog */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase text-[10px] font-black">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Produto Fabricado</th>
                  <th className="p-3">Lote</th>
                  <th className="p-3 text-right">Quantidade</th>
                  <th className="p-3 text-right">Custo Insumos</th>
                  <th className="p-3 text-center">Validade</th>
                  <th className="p-3">Usuário Produtor</th>
                  <th className="p-3">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingProdReport ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                      Carregando lotes produzidos...
                    </td>
                  </tr>
                ) : prodLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      Nenhum lote produzido encontrado.
                    </td>
                  </tr>
                ) : (
                  prodLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-indigo-50/20">
                      <td className="p-3 font-mono text-gray-500">{l.dateFormatted}</td>
                      <td className="p-3 font-bold text-gray-900">{l.productName}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{l.batchNumber}</td>
                      <td className="p-3 text-right font-mono font-black text-gray-900">
                        +{l.quantityProduced} {l.productUnit}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        R$ {fmt(l.totalCost)}
                      </td>
                      <td className="p-3 text-center font-mono text-gray-600">
                        {l.expirationDateFormatted}
                      </td>
                      <td className="p-3 font-bold text-gray-800">{l.userName}</td>
                      <td className="p-3 text-gray-500">{l.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          ABA 8: CONTROLE DE VENCIMENTOS
      ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "controle-vencimentos" && (() => {
        const filteredExp = expItems.filter((item) => {
          const matchBucket = expBucketFilter === "ALL" || item.bucket === expBucketFilter;
          const q = searchQuery.trim().toLowerCase();
          const matchSearch =
            !q ||
            item.productName.toLowerCase().includes(q) ||
            item.batchNumber.toLowerCase().includes(q);
          return matchBucket && matchSearch;
        });

        const bucketBadge = (bucket: string, daysLeft: number) => {
          if (bucket === "EXPIRED") {
            return (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                Vencido ({Math.abs(daysLeft)}d)
              </span>
            );
          }
          if (bucket === "CRITICAL_0_5") {
            return (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200">
                Crítico ({daysLeft}d)
              </span>
            );
          }
          if (bucket === "ATTENTION_6_15") {
            return (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                Atenção ({daysLeft}d)
              </span>
            );
          }
          if (bucket === "PREVENTIVE_16_30") {
            return (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                Preventivo ({daysLeft}d)
              </span>
            );
          }
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              Seguro ({daysLeft}d)
            </span>
          );
        };

        return (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-100 block">
                  Monitoramento de Lotes Perecíveis &amp; Capital em Risco de Perda
                </span>
                <h2 className="text-base font-black">
                  Relatório de Controle de Vencimentos
                </h2>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/expirations"
                  className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  Abrir Painel de Ações
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      `controle_vencimentos_${new Date().toISOString().slice(0, 10)}.csv`,
                      "Produto;Lote;Origem;Quantidade;Unidade;Validade;Dias_Restantes;Custo_Unitario;Custo_Em_Risco",
                      filteredExp.map(
                        (i) =>
                          `"${i.productName}";"${i.batchNumber}";"${i.source}";${i.quantity};"${
                            i.unit
                          }";"${i.expirationDateFormatted}";${i.daysLeft};${i.unitCost.toFixed(
                            2
                          )};${i.costAtRisk.toFixed(2)}`
                      )
                    )
                  }
                  className="px-3.5 py-2 bg-white text-orange-900 hover:bg-orange-50 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} /> Exportar CSV
                </button>
              </div>
            </div>

            <div className="p-4 bg-orange-50/40 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { key: "EXPIRED", label: "Já Vencidos", count: expSummary.expiredCount, cost: expSummary.expiredCost, tone: "text-rose-700" },
                { key: "CRITICAL_0_5", label: "Crítico 0-5d", count: expSummary.criticalCount, cost: expSummary.criticalCost, tone: "text-red-600" },
                { key: "ATTENTION_6_15", label: "Atenção 6-15d", count: expSummary.attentionCount, cost: expSummary.attentionCost, tone: "text-amber-700" },
                { key: "PREVENTIVE_16_30", label: "Preventivo 16-30d", count: expSummary.preventiveCount, cost: expSummary.preventiveCost, tone: "text-blue-700" },
                { key: "ALL", label: "Total em Risco (<=30d)", count: expSummary.expiredCount + expSummary.criticalCount + expSummary.attentionCount + expSummary.preventiveCount, cost: expSummary.totalRiskCost, tone: "text-gray-900" },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setExpBucketFilter(expBucketFilter === c.key ? "ALL" : c.key)}
                  className={`text-left bg-white border rounded-xl p-3 transition-all cursor-pointer ${
                    expBucketFilter === c.key ? "border-orange-500 ring-2 ring-orange-500/20" : "border-gray-200"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-gray-500 block">{c.label}</span>
                  <span className={`text-lg font-black font-mono block ${c.tone}`}>
                    R$ {fmt(c.cost)}
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold">{c.count} lote(s)</span>
                </button>
              ))}
            </div>

            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 print:hidden">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar produto ou lote..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none"
                />
              </div>
              <select
                value={expBucketFilter}
                onChange={(e) => setExpBucketFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
              >
                <option value="ALL">Todas as Faixas</option>
                <option value="EXPIRED">Já Vencidos</option>
                <option value="CRITICAL_0_5">Crítico 0-5d</option>
                <option value="ATTENTION_6_15">Atenção 6-15d</option>
                <option value="PREVENTIVE_16_30">Preventivo 16-30d</option>
                <option value="SAFE_30_PLUS">&gt;30 dias</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase text-[10px] font-black">
                  <tr>
                    <th className="p-3">Produto</th>
                    <th className="p-3">Lote / Origem</th>
                    <th className="p-3 text-right">Qtd. em Lote</th>
                    <th className="p-3 text-center">Validade</th>
                    <th className="p-3 text-center">Situação</th>
                    <th className="p-3 text-right">Custo Unit.</th>
                    <th className="p-3 text-right">Custo em Risco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExp.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        Nenhum lote encontrado para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredExp.map((item) => (
                      <tr key={item.id} className="hover:bg-orange-50/20">
                        <td className="p-3 font-bold text-gray-900">{item.productName}</td>
                        <td className="p-3 font-mono text-gray-600">
                          {item.batchNumber}{" "}
                          <span className="text-[10px] text-gray-400">({item.source})</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-gray-800">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-gray-700">
                          {item.expirationDateFormatted}
                        </td>
                        <td className="p-3 text-center">
                          {bucketBadge(item.bucket, item.daysLeft)}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          R$ {fmt(item.unitCost)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-rose-700">
                          R$ {fmt(item.costAtRisk)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ─── MODAL: VISUALIZAR FOTO DA AVARIA ─── */}
      {photoPreview && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-sm font-black text-gray-900">
                  Foto da Avaria — {photoPreview.receiptCode}
                </h3>
                <p className="text-xs text-gray-500">{photoPreview.productName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoPreview(null)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-100 min-h-[240px]">
              {photoPreview.photoData ? (
                <img
                  src={photoPreview.photoData}
                  alt={photoPreview.productName}
                  className="max-h-[70vh] rounded-xl object-contain shadow-sm"
                />
              ) : (
                <p className="text-xs text-gray-500">Nenhuma imagem disponível para este registro.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: NOVO LANÇAMENTO DE COMODATO ─── */}
      {isComodatoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <h3 className="text-base font-black text-amber-950 flex items-center gap-2">
                <Handshake size={18} className="text-amber-700" /> Lançar Equipamento / Item em
                Comodato
              </h3>
              <button
                onClick={() => setIsComodatoModalOpen(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateComodato} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Selecionar Cliente (Revenda ou Consumidor)
                </label>
                <select
                  name="customerId"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerType === "REVENDA" ? "REVENDA" : "CONSUMIDOR FINAL"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Equipamento / Vasilhame / Freezer *
                  </label>
                  <input
                    name="itemDescription"
                    required
                    placeholder="Ex: Freezer Horizontal 400L ou Expositor Doces"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Nº Patrimônio
                  </label>
                  <input
                    name="assetCode"
                    defaultValue={`PAT-${new Date().getTime().toString().slice(-4)}`}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Qtd.
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Valor Unit. (R$)
                  </label>
                  <input
                    name="unitValue"
                    type="number"
                    step="0.01"
                    defaultValue="1500.00"
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Data Envio
                  </label>
                  <input
                    name="loanDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Prev. Retorno
                  </label>
                  <input
                    name="returnForecastDate"
                    type="date"
                    defaultValue={new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Observações / Condições do Comodato
                </label>
                <input
                  name="notes"
                  placeholder="Ex: Empréstimo vinculado ao fornecimento semanal de doces e congelados"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsComodatoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingComodato}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs"
                >
                  {submittingComodato ? "Salvando..." : "Salvar Comodato"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
