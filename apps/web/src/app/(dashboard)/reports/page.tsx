"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  getAllReportsDashboardData,
  createComodatoLoan,
  updateComodatoStatus,
  applyDailyStockBalance,
} from "@/actions/reports";

type ReportTabId =
  | "dre-comparativo"
  | "vendas-revenda"
  | "comodatos"
  | "estoque-movimentacao"
  | "conferencia-balanco-diario"
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
  const [dreComparison, setDreComparison] = useState<any>(null);

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
    // Verifica se veio redirecionado de /customers com ?tab=...
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "resale-sales") setActiveTab("vendas-revenda");
      else if (tabParam === "comodatos") setActiveTab("comodatos");
    }
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const res = await getAllReportsDashboardData();
      if (res.success) {
        setCustomers(res.customers || []);
        setResaleSales(res.resaleSales || []);
        setStockReport(res.stockReport || []);
        setComodatos(res.comodatos || []);
        setDreComparison(res.dreComparison || null);

        const initialCounted: Record<string, string> = {};
        (res.stockReport || []).forEach((item: any) => {
          initialCounted[item.id] = String(item.currentStock);
        });
        setCountedMap(initialCounted);
      }
    } finally {
      setLoading(false);
    }
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

        <div className="flex gap-2 flex-wrap">
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

      {/* ── NAVEGAÇÃO DOS 6 RELATÓRIOS PRINCIPAIS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
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
            subtitle: `R$ ${fmt(activeComodatosValue)} em clientes`,
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
                {filteredResaleSales.map((row) => (
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
                ))}
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
                {comodatos.map((c) => (
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
                ))}
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
