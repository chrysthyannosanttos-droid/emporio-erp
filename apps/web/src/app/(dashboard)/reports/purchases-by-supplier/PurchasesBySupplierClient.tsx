"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Download,
  Printer,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ShoppingBag,
  Receipt,
  Truck,
  Package,
  Layers,
  ChevronDown,
  ChevronRight,
  Eye,
  X,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Sparkles,
  BarChart3,
  PieChart,
  Copy,
  Check,
  Store,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  getPurchasesBySupplierReport,
  type PurchasesReportResult,
  type PurchasesReportFilter,
  type SupplierPurchaseSummary,
  type PurchaseInvoiceDetail,
  type PurchasedProductItem,
} from "@/actions/purchasesReport";

interface Props {
  initialData: PurchasesReportResult;
}

type ActiveViewTab = "suppliers" | "invoices" | "products" | "analytics";
type SortField = "netTotal" | "totalQuantity" | "invoicesCount" | "supplierName";

export function PurchasesBySupplierClient({ initialData }: Props) {
  const [data, setData] = useState<PurchasesReportResult>(initialData);
  const [isPending, startTransition] = useTransition();

  // Visualização ativa
  const [activeTab, setActiveTab] = useState<ActiveViewTab>("suppliers");

  // Filtros
  const [startDate, setStartDate] = useState(initialData.filterApplied.startDate || "");
  const [endDate, setEndDate] = useState(initialData.filterApplied.endDate || "");
  const [supplierId, setSupplierId] = useState(initialData.filterApplied.supplierId || "ALL");
  const [storeId, setStoreId] = useState(initialData.filterApplied.storeId || "ALL");
  const [invoiceNum, setInvoiceNum] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "RETURNED" | "CANCELED">("ALL");

  // Comparativo de Períodos
  const [enableComparison, setEnableComparison] = useState(false);
  const [compStartDate, setCompStartDate] = useState("");
  const [compEndDate, setCompEndDate] = useState("");

  // Ordenação da tabela de fornecedores
  const [sortField, setSortField] = useState<SortField>("netTotal");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fornecedor expandido no modo resumido
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);

  // Modal de Detalhe da Nota Fiscal
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoiceDetail | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Modal de Detalhe do Fornecedor
  const [selectedSupplierForModal, setSelectedSupplierForModal] = useState<SupplierPurchaseSummary | null>(null);

  // Busca rápida na tabela atual
  const [tableSearch, setTableSearch] = useState("");

  // Aplicar filtros via Server Action
  function handleApplyFilters() {
    startTransition(async () => {
      try {
        const filters: PurchasesReportFilter = {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          supplierId: supplierId !== "ALL" ? supplierId : undefined,
          storeId: storeId !== "ALL" ? storeId : undefined,
          invoiceNum: invoiceNum.trim() || undefined,
          productId: productSearch.trim() || undefined,
          categoryId: categoryId !== "ALL" ? categoryId : undefined,
          status: statusFilter,
          comparisonStartDate: enableComparison && compStartDate ? compStartDate : undefined,
          comparisonEndDate: enableComparison && compEndDate ? compEndDate : undefined,
        };
        const result = await getPurchasesBySupplierReport(filters);
        setData(result);
      } catch (err: any) {
        alert("Erro ao aplicar filtros: " + (err.message || "Erro inesperado"));
      }
    });
  }

  // Atalhos de datas
  function setDatePreset(preset: "this-month" | "last-month" | "last-90" | "this-year") {
    const now = new Date();
    let s = "";
    let e = "";

    if (preset === "this-month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      s = first.toISOString().split("T")[0];
      e = last.toISOString().split("T")[0];
    } else if (preset === "last-month") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      s = first.toISOString().split("T")[0];
      e = last.toISOString().split("T")[0];
    } else if (preset === "last-90") {
      const past = new Date();
      past.setDate(past.getDate() - 90);
      s = past.toISOString().split("T")[0];
      e = now.toISOString().split("T")[0];
    } else if (preset === "this-year") {
      const first = new Date(now.getFullYear(), 0, 1);
      s = first.toISOString().split("T")[0];
      e = now.toISOString().split("T")[0];
    }

    setStartDate(s);
    setEndDate(e);

    // Se comparação estiver ligada, calcula o mês anterior equivalente
    if (enableComparison && s && e) {
      const d1 = new Date(s);
      const d2 = new Date(e);
      const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      const c2 = new Date(d1);
      c2.setDate(c2.getDate() - 1);
      const c1 = new Date(c2);
      c1.setDate(c1.getDate() - diffDays);
      setCompStartDate(c1.toISOString().split("T")[0]);
      setCompEndDate(c2.toISOString().split("T")[0]);
    }
  }

  // Ordenação dos fornecedores
  const sortedSuppliers = useMemo(() => {
    let list = [...data.suppliers];

    if (tableSearch.trim()) {
      const t = tableSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.supplierName.toLowerCase().includes(t) ||
          s.document.includes(t) ||
          s.category.toLowerCase().includes(t)
      );
    }

    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [data.suppliers, sortField, sortDirection, tableSearch]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  // Exportar para CSV
  function exportToCsv() {
    const headers = [
      "Código",
      "Fornecedor / Razão Social",
      "CNPJ / CPF",
      "Categoria",
      "Qtd Itens Comprados",
      "Qtd Notas",
      "Valor Bruto (R$)",
      "Descontos (R$)",
      "Devoluções (R$)",
      "Valor Líquido (R$)",
      "Participação (%)",
    ];

    const rows = sortedSuppliers.map((s) => [
      `"${s.supplierCode}"`,
      `"${s.supplierName.replace(/"/g, '""')}"`,
      `"${s.document}"`,
      `"${s.category}"`,
      s.totalQuantity.toFixed(2).replace(".", ","),
      s.invoicesCount,
      s.grossTotal.toFixed(2).replace(".", ","),
      s.discounts.toFixed(2).replace(".", ","),
      s.returns.toFixed(2).replace(".", ","),
      s.netTotal.toFixed(2).replace(".", ","),
      s.marketShare.toFixed(2).replace(".", ",") + "%",
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_compras_fornecedor_${data.filterApplied.startDate}_a_${data.filterApplied.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Exportar Excel
  function exportToExcel() {
    exportToCsv(); // O CSV com UTF-8 BOM e delimitador ponto-e-vírgula abre nativamente formatado no Excel
  }

  // Imprimir / Salvar PDF
  function handlePrint() {
    window.print();
  }

  function copyAccessKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  // Formatação em Real
  const fmtMoney = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtQty = (val: number) =>
    val.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 pb-16">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CABEÇALHO DO RELATÓRIO & AÇÕES */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4 print:border-none">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
            <ShoppingBag size={14} />
            <span>Módulo de Suprimentos & Auditoria Horus</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            Relatório Gerencial de Compras por Fornecedor
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Empresa: <strong className="text-gray-800">{data.company.name}</strong> • CNPJ:{" "}
            {data.company.document || "Não informado"} • Período:{" "}
            <span className="font-semibold text-gray-800">
              {new Date(data.filterApplied.startDate + "T12:00:00").toLocaleDateString("pt-BR")} até{" "}
              {new Date(data.filterApplied.endDate + "T12:00:00").toLocaleDateString("pt-BR")}
            </span>
          </p>
        </div>

        {/* Botões de Ação e Exportação */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            title="Exportar para planilha Excel"
          >
            <FileSpreadsheet size={15} />
            <span>Excel</span>
          </button>

          <button
            onClick={exportToCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            title="Exportar formato CSV"
          >
            <Download size={15} />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            title="Imprimir relatório gerencial ou salvar em PDF"
          >
            <Printer size={15} />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PAINEL DE FILTROS AVANÇADOS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
            <Filter size={15} className="text-emerald-600" />
            <span>Filtros do Relatório</span>
          </div>

          {/* Atalhos Rápidos de Datas */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 mr-1 font-medium">Atalhos:</span>
            <button
              type="button"
              onClick={() => setDatePreset("this-month")}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium text-[11px] transition"
            >
              Este Mês
            </button>
            <button
              type="button"
              onClick={() => setDatePreset("last-month")}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium text-[11px] transition"
            >
              Mês Anterior
            </button>
            <button
              type="button"
              onClick={() => setDatePreset("last-90")}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium text-[11px] transition"
            >
              Últimos 90 dias
            </button>
            <button
              type="button"
              onClick={() => setDatePreset("this-year")}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium text-[11px] transition"
            >
              Ano Atual
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Data Inicial */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Data Final */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Fornecedor */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Fornecedor</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-gray-800"
            >
              <option value="ALL">Todos os Fornecedores ({data.availableSuppliers.length})</option>
              {data.availableSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.document ? `(${s.document})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Loja / Unidade */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Loja / Unidade</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-gray-800"
            >
              <option value="ALL">Todas as Lojas / Matriz</option>
              {data.availableStores.map((st) => (
                <option key={st.id} value={st.id}>
                  [{st.code}] {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Número da Nota Fiscal */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Número da NF ou Chave</label>
            <input
              type="text"
              placeholder="Ex: 1250 ou Chave 44 dígitos"
              value={invoiceNum}
              onChange={(e) => setInvoiceNum(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Situação da Nota */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Situação da Nota</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-gray-800"
            >
              <option value="ALL">Válidas (Confirmadas e Devoluções)</option>
              <option value="CONFIRMED">Apenas Confirmadas</option>
              <option value="RETURNED">Apenas Devoluções</option>
              <option value="CANCELED">Notas Canceladas</option>
            </select>
          </div>
        </div>

        {/* Linha 2 de Filtros: Produto / Grupo e Comparativo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100 text-xs items-center">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Filtrar por Produto / Código</label>
            <input
              type="text"
              placeholder="Nome do produto, código de barras ou NCM"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Grupo / Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800"
            >
              <option value="ALL">Todas as Categorias</option>
              {data.availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Botão de Filtrar */}
          <div className="flex items-end justify-end gap-2 pt-4">
            <button
              onClick={() => {
                setSupplierId("ALL");
                setStoreId("ALL");
                setInvoiceNum("");
                setProductSearch("");
                setCategoryId("ALL");
                setStatusFilter("ALL");
                setDatePreset("this-month");
              }}
              type="button"
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
            >
              Limpar
            </button>

            <button
              onClick={handleApplyFilters}
              disabled={isPending}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Carregando...</span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>Filtrar Relatório</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Toggle de Comparativo entre dois períodos */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
              <input
                type="checkbox"
                checked={enableComparison}
                onChange={(e) => setEnableComparison(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Ativar Comparativo de Compras entre dois Períodos</span>
            </label>
            <span className="text-[11px] text-gray-500">
              (Calcula a variação em R$ e % de evolução por fornecedor)
            </span>
          </div>

          {enableComparison && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
              <div>
                <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                  Período Anterior - Início
                </label>
                <input
                  type="date"
                  value={compStartDate}
                  onChange={(e) => setCompStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg bg-white text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                  Período Anterior - Fim
                </label>
                <input
                  type="date"
                  value={compEndDate}
                  onChange={(e) => setCompEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg bg-white text-xs font-medium"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  disabled={!compStartDate || !compEndDate || isPending}
                  className="w-full px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  Comparar Períodos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. RESUMO GERENCIAL (KPIS NO TOPO) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Valor Líquido Comprado */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Compras Líquidas</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <div className="text-lg md:text-xl font-black text-gray-900">
            {fmtMoney(data.summary.totalPurchasesValue)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
            <span>Bruto: {fmtMoney(data.summary.totalGrossValue)}</span>
          </div>
          {data.summary.periodGrowthPercent !== undefined && (
            <div
              className={`text-[10px] font-bold mt-1 flex items-center gap-0.5 ${
                data.summary.periodGrowthPercent >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {data.summary.periodGrowthPercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(data.summary.periodGrowthPercent).toFixed(1)}% vs anterior</span>
            </div>
          )}
        </div>

        {/* KPI 2: Quantidade de Mercadorias */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Qtd Mercadorias</span>
            <Package size={16} className="text-blue-600" />
          </div>
          <div className="text-lg md:text-xl font-black text-gray-900">
            {fmtQty(data.summary.totalItemsQuantity)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Unidades / Caixas / Peças</div>
        </div>

        {/* KPI 3: Notas Fiscais de Entrada */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Notas Fiscais</span>
            <Receipt size={16} className="text-purple-600" />
          </div>
          <div className="text-lg md:text-xl font-black text-gray-900">
            {data.summary.totalInvoicesCount}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">NFs de entrada válidas</div>
        </div>

        {/* KPI 4: Fornecedores Utilizados */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fornecedores</span>
            <Truck size={16} className="text-amber-600" />
          </div>
          <div className="text-lg md:text-xl font-black text-gray-900">
            {data.summary.totalSuppliersCount}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Parceiros ativos</div>
        </div>

        {/* KPI 5: Ticket Médio por NF */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ticket Médio / NF</span>
            <BarChart3 size={16} className="text-indigo-600" />
          </div>
          <div className="text-lg md:text-xl font-black text-gray-900">
            {fmtMoney(data.summary.averageTicket)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Valor médio por compra</div>
        </div>

        {/* KPI 6: Devoluções */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Devoluções</span>
            <RotateCcw size={16} className="text-red-500" />
          </div>
          <div className="text-lg md:text-xl font-black text-red-600">
            {fmtMoney(data.summary.totalReturnsValue)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Descontos: {fmtMoney(data.summary.totalDiscounts)}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. ABAS DE VISUALIZAÇÃO DO RELATÓRIO */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 print:hidden">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "suppliers"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Truck size={15} />
            <span>1. Resumo por Fornecedor ({data.suppliers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "invoices"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Receipt size={15} />
            <span>2. Detalhamento das Notas ({data.invoicesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "products"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Package size={15} />
            <span>3. Detalhamento de Produtos ({data.topProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "analytics"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <PieChart size={15} />
            <span>4. Análises & Gráficos</span>
          </button>
        </div>

        {/* Campo de Busca Rápida na Aba */}
        <div className="relative w-64 hidden sm:block">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar na lista..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ABA 1: RESUMO POR FORNECEDOR (TABELA PRINCIPAL) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "suppliers" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="text-sm font-black text-gray-900">
                Consolidado de Compras por Fornecedor
              </h3>
              <p className="text-[11px] text-gray-500">
                Clique na linha do fornecedor para expandir suas notas fiscais de entrada
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Total: {fmtMoney(data.summary.totalPurchasesValue)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-gray-200/60"
                    onClick={() => handleSort("supplierName")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Fornecedor / Razão Social</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-3 px-3">CNPJ / CPF</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-gray-200/60"
                    onClick={() => handleSort("totalQuantity")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Qtd Comprada</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:bg-gray-200/60"
                    onClick={() => handleSort("invoicesCount")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Notas</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">Valor Bruto</th>
                  <th className="py-3 px-3 text-right text-gray-500">Descontos</th>
                  <th className="py-3 px-3 text-right text-red-600">Devoluções</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-gray-200/60 text-gray-900"
                    onClick={() => handleSort("netTotal")}
                  >
                    <div className="flex items-center justify-end gap-1 font-black text-emerald-800">
                      <span>Valor Líquido</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right w-24">Part. (%)</th>
                  {data.filterApplied.hasComparison && (
                    <th className="py-3 px-3 text-right text-indigo-700">Evolução (%)</th>
                  )}
                  <th className="py-3 px-3 text-center w-20 print:hidden">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {sortedSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-gray-500 text-xs">
                      Nenhum registro de compras encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  sortedSuppliers.map((sup, idx) => {
                    const isExpanded = expandedSupplierId === sup.supplierId;
                    return (
                      <React.Fragment key={sup.supplierId}>
                        <tr
                          onClick={() =>
                            setExpandedSupplierId(isExpanded ? null : sup.supplierId)
                          }
                          className={`hover:bg-emerald-50/40 cursor-pointer transition-colors ${
                            isExpanded ? "bg-emerald-50/60" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                          }`}
                        >
                          <td className="py-3 px-3 text-center text-gray-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown size={14} className="text-emerald-600" />
                              ) : (
                                <ChevronRight size={14} className="text-gray-400" />
                              )}
                              <div>
                                <span className="font-bold text-gray-900 block">{sup.supplierName}</span>
                                {sup.tradeName && sup.tradeName !== sup.supplierName && (
                                  <span className="text-[10px] text-gray-400 block">
                                    Fantasia: {sup.tradeName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-gray-600 font-mono text-[11px]">
                            {sup.document || "—"}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                              {sup.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-gray-800">
                            {fmtQty(sup.totalQuantity)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {sup.invoicesCount} NF
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-gray-700">
                            {fmtMoney(sup.grossTotal)}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-400">
                            {sup.discounts > 0 ? fmtMoney(sup.discounts) : "—"}
                          </td>
                          <td className="py-3 px-3 text-right text-red-600 font-semibold">
                            {sup.returns > 0 ? fmtMoney(sup.returns) : "—"}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-gray-900 text-xs">
                            {fmtMoney(sup.netTotal)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-12 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full"
                                  style={{ width: `${Math.min(100, sup.marketShare)}%` }}
                                />
                              </div>
                              <span className="font-bold text-[11px] text-gray-700">
                                {sup.marketShare.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {data.filterApplied.hasComparison && (
                            <td className="py-3 px-3 text-right font-bold">
                              {sup.growthPercentage !== undefined ? (
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[11px] ${
                                    sup.growthPercentage >= 0 ? "text-emerald-700" : "text-red-600"
                                  }`}
                                >
                                  {sup.growthPercentage >= 0 ? (
                                    <TrendingUp size={12} />
                                  ) : (
                                    <TrendingDown size={12} />
                                  )}
                                  {sup.growthPercentage.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-gray-400 text-[11px]">Novo</span>
                              )}
                            </td>
                          )}

                          <td className="py-3 px-3 text-center print:hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSupplierForModal(sup);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition"
                            >
                              Ver Ficha
                            </button>
                          </td>
                        </tr>

                        {/* Detalhamento expandido das Notas do Fornecedor */}
                        {isExpanded && (
                          <tr className="bg-emerald-50/20">
                            <td colSpan={13} className="py-3 px-6 border-b border-emerald-100">
                              <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                  <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                    <Receipt size={14} className="text-emerald-600" />
                                    <span>Notas Fiscais de Entrada de {sup.supplierName}</span>
                                  </h4>
                                  <span className="text-[11px] text-gray-500 font-medium">
                                    {sup.invoices.length} nota(s) encontrada(s) no período
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-[11px]">
                                    <thead>
                                      <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[9px]">
                                        <th className="py-1.5 px-2">Data</th>
                                        <th className="py-1.5 px-2">Número NF</th>
                                        <th className="py-1.5 px-2">Série</th>
                                        <th className="py-1.5 px-2">Chave de Acesso</th>
                                        <th className="py-1.5 px-2 text-center">Itens</th>
                                        <th className="py-1.5 px-2 text-right">Valor Produtos</th>
                                        <th className="py-1.5 px-2 text-right">Descontos</th>
                                        <th className="py-1.5 px-2 text-right">Total da Nota</th>
                                        <th className="py-1.5 px-2 text-center">Situação</th>
                                        <th className="py-1.5 px-2 text-center">Ações</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {sup.invoices.map((inv) => (
                                        <tr
                                          key={inv.id}
                                          className="hover:bg-gray-50 transition-colors"
                                        >
                                          <td className="py-2 px-2 font-medium text-gray-700">
                                            {inv.issueDateFormatted}
                                          </td>
                                          <td className="py-2 px-2 font-bold text-gray-900">
                                            NF #{inv.invoiceNum}
                                          </td>
                                          <td className="py-2 px-2 text-gray-500">{inv.series}</td>
                                          <td className="py-2 px-2 font-mono text-[10px] text-gray-600 max-w-[200px] truncate">
                                            {inv.accessKey}
                                          </td>
                                          <td className="py-2 px-2 text-center font-bold text-purple-700">
                                            {inv.itemsCount} itens
                                          </td>
                                          <td className="py-2 px-2 text-right text-gray-600">
                                            {fmtMoney(inv.productsTotal)}
                                          </td>
                                          <td className="py-2 px-2 text-right text-gray-400">
                                            {inv.discount > 0 ? fmtMoney(inv.discount) : "—"}
                                          </td>
                                          <td className="py-2 px-2 text-right font-black text-gray-900">
                                            {fmtMoney(inv.totalAmount)}
                                          </td>
                                          <td className="py-2 px-2 text-center">
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                inv.status === "CONFIRMED"
                                                  ? "bg-emerald-100 text-emerald-800"
                                                  : inv.status === "RETURNED"
                                                  ? "bg-amber-100 text-amber-800"
                                                  : "bg-red-100 text-red-800"
                                              }`}
                                            >
                                              {inv.status === "CONFIRMED"
                                                ? "CONFIRMADA"
                                                : inv.status === "RETURNED"
                                                ? "DEVOLVIDA"
                                                : "CANCELADA"}
                                            </span>
                                          </td>
                                          <td className="py-2 px-2 text-center">
                                            <button
                                              onClick={() => setSelectedInvoice(inv)}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[10px] transition cursor-pointer"
                                            >
                                              <Eye size={11} />
                                              <span>Ver Produtos</span>
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {/* Rodapé da Tabela com Totais */}
              <tfoot>
                <tr className="bg-gray-100/90 border-t-2 border-gray-300 font-black text-gray-900 text-xs">
                  <td colSpan={4} className="py-3 px-3 text-right uppercase">
                    Total Geral das Compras:
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-gray-800">
                    {fmtQty(data.summary.totalItemsQuantity)}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-purple-800">
                    {data.summary.totalInvoicesCount} NF
                  </td>
                  <td className="py-3 px-3 text-right">
                    {fmtMoney(data.summary.totalGrossValue)}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-500">
                    {fmtMoney(data.summary.totalDiscounts)}
                  </td>
                  <td className="py-3 px-3 text-right text-red-600">
                    {fmtMoney(data.summary.totalReturnsValue)}
                  </td>
                  <td className="py-3 px-3 text-right text-sm text-emerald-800">
                    {fmtMoney(data.summary.totalPurchasesValue)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold">100,0%</td>
                  {data.filterApplied.hasComparison && <td className="py-3 px-3"></td>}
                  <td className="py-3 px-3 print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ABA 2: DETALHAMENTO DE NOTAS FISCAIS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="text-sm font-black text-gray-900">
                Detalhamento Completo de Notas Fiscais de Entrada
              </h3>
              <p className="text-[11px] text-gray-500">
                Lista de todas as NFs registradas no período com valores de produtos, despesas e situação
              </p>
            </div>
            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
              {data.invoicesList.length} notas no período
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Data Emissão</th>
                  <th className="py-3 px-3">Número NF</th>
                  <th className="py-3 px-3">Fornecedor</th>
                  <th className="py-3 px-3">CNPJ</th>
                  <th className="py-3 px-3">Chave de Acesso</th>
                  <th className="py-3 px-3 text-center">Itens</th>
                  <th className="py-3 px-3 text-right">Valor Produtos</th>
                  <th className="py-3 px-3 text-right">Descontos</th>
                  <th className="py-3 px-3 text-right font-black">Valor Total</th>
                  <th className="py-3 px-3 text-center">Situação</th>
                  <th className="py-3 px-3 text-center w-24 print:hidden">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {data.invoicesList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-500 text-xs">
                      Nenhuma nota fiscal encontrada para o filtro atual.
                    </td>
                  </tr>
                ) : (
                  data.invoicesList.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3 text-gray-700">{inv.issueDateFormatted}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">NF #{inv.invoiceNum}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-800">{inv.supplierName}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-500">
                        {inv.supplierDocument || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-gray-400 max-w-[180px] truncate">
                        {inv.accessKey}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-purple-700">
                        {inv.itemsCount}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-600">{fmtMoney(inv.productsTotal)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-400">
                        {inv.discount > 0 ? fmtMoney(inv.discount) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-gray-900">
                        {fmtMoney(inv.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800"
                              : inv.status === "RETURNED"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {inv.status === "CONFIRMED"
                            ? "CONFIRMADA"
                            : inv.status === "RETURNED"
                            ? "DEVOLVIDA"
                            : "CANCELADA"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center print:hidden">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="flex items-center gap-1 mx-auto px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold transition cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Ver Itens</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ABA 3: DETALHAMENTO DE PRODUTOS COMPRADOS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "products" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="text-sm font-black text-gray-900">
                Ranking de Mercadorias Mais Compradas no Período
              </h3>
              <p className="text-[11px] text-gray-500">
                Volume total de compras por produto, custo unitário médio e fornecedores
              </p>
            </div>
            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
              Top {data.topProducts.length} Produtos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">Código / EAN</th>
                  <th className="py-3 px-3">Descrição da Mercadoria</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3 text-right">Qtd Comprada</th>
                  <th className="py-3 px-3 text-center">Unidade</th>
                  <th className="py-3 px-3 text-right">Custo Médio</th>
                  <th className="py-3 px-3 text-right font-black">Valor Total Comprado</th>
                  <th className="py-3 px-3 text-center">Fornecedores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {data.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500 text-xs">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  data.topProducts.map((p, idx) => (
                    <tr key={p.productId || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600">{p.code}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{p.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-700">
                          {p.categoryName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-800">
                        {fmtQty(p.totalQuantity)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-500 font-semibold">{p.unit}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmtMoney(p.avgUnitCost)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-gray-900">
                        {fmtMoney(p.totalCost)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {p.suppliersCount} fornecedor(es)
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ABA 4: ANÁLISES & GRÁFICOS GERENCIAIS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Top 10 Fornecedores por Volume Financeiro */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-600" />
                  <span>Ranking: Top Fornecedores por Valor Comprado</span>
                </h3>
                <span className="text-xs font-bold text-gray-500">Participação</span>
              </div>

              <div className="space-y-3">
                {data.suppliers.slice(0, 8).map((sup, idx) => (
                  <div key={sup.supplierId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800 truncate max-w-[280px]">
                        {idx + 1}. {sup.supplierName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900">{fmtMoney(sup.netTotal)}</span>
                        <span className="text-[11px] font-semibold text-emerald-700">
                          ({sup.marketShare.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, sup.marketShare)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico 2: Evolução Mensal do Volume de Compras */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-600" />
                  <span>Evolução Mensal de Compras de Mercadorias</span>
                </h3>
                <span className="text-xs font-bold text-gray-500">Histórico</span>
              </div>

              <div className="space-y-3">
                {data.monthlyEvolution.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">Sem dados de evolução histórica.</p>
                ) : (
                  (() => {
                    const maxVal = Math.max(...data.monthlyEvolution.map((m) => m.totalAmount), 1);
                    return data.monthlyEvolution.map((m) => {
                      const pct = (m.totalAmount / maxVal) * 100;
                      return (
                        <div key={m.monthKey} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-800">{m.monthLabel}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-gray-400 font-semibold">
                                {m.invoicesCount} NFs
                              </span>
                              <span className="font-black text-gray-900">
                                {fmtMoney(m.totalAmount)}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL DE DETALHAMENTO DA NOTA FISCAL (ITENS DA NF) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    Detalhes da Nota Fiscal #{selectedInvoice.invoiceNum} (Série {selectedInvoice.series})
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Fornecedor: <strong className="text-gray-800">{selectedInvoice.supplierName}</strong> • Emissão:{" "}
                    {selectedInvoice.issueDateFormatted}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Informações da Nota */}
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Chave de Acesso</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-mono text-[11px] text-gray-700 truncate max-w-[170px]" title={selectedInvoice.accessKey}>
                    {selectedInvoice.accessKey}
                  </span>
                  <button
                    onClick={() => copyAccessKey(selectedInvoice.accessKey)}
                    className="text-gray-400 hover:text-emerald-600 transition"
                    title="Copiar chave"
                  >
                    {copiedKey ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">CNPJ Fornecedor</span>
                <span className="font-mono text-[11px] text-gray-700 block mt-0.5">
                  {selectedInvoice.supplierDocument || "—"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Situação</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-block mt-0.5">
                  {selectedInvoice.status}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Valor Total</span>
                <span className="text-sm font-black text-emerald-700 block mt-0.5">
                  {fmtMoney(selectedInvoice.totalAmount)}
                </span>
              </div>
            </div>

            {/* Tabela de Produtos Comprados na Nota */}
            <div className="p-4 flex-1 overflow-y-auto">
              <h4 className="text-xs font-black text-gray-900 mb-2">
                Produtos Comprados nesta Nota ({selectedInvoice.items.length} itens)
              </h4>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                    <th className="py-2 px-2.5">Código / EAN</th>
                    <th className="py-2 px-2.5">Descrição</th>
                    <th className="py-2 px-2.5">NCM</th>
                    <th className="py-2 px-2.5 text-right">Quantidade</th>
                    <th className="py-2 px-2.5 text-center">Un.</th>
                    <th className="py-2 px-2.5 text-right">Custo Unitário</th>
                    <th className="py-2 px-2.5 text-right font-black">Total Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gray-50">
                      <td className="py-2 px-2.5 font-mono text-[11px] text-gray-600">
                        {item.barcode || item.code}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-gray-900">{item.description}</td>
                      <td className="py-2 px-2.5 font-mono text-gray-500 text-[10px]">{item.ncm || "—"}</td>
                      <td className="py-2 px-2.5 text-right font-bold text-gray-800">
                        {fmtQty(item.quantity)}
                      </td>
                      <td className="py-2 px-2.5 text-center text-gray-500">{item.unit}</td>
                      <td className="py-2 px-2.5 text-right text-gray-700">{fmtMoney(item.unitCost)}</td>
                      <td className="py-2 px-2.5 text-right font-black text-gray-900">
                        {fmtMoney(item.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-black text-gray-900 text-xs border-t border-gray-300">
                    <td colSpan={3} className="py-2 px-2.5 text-right uppercase">
                      Total dos Produtos:
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold">
                      {fmtQty(selectedInvoice.items.reduce((acc, it) => acc + it.quantity, 0))}
                    </td>
                    <td></td>
                    <td></td>
                    <td className="py-2 px-2.5 text-right text-emerald-800">
                      {fmtMoney(selectedInvoice.productsTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer Modal */}
            <div className="p-3 border-t border-gray-100 flex items-center justify-end bg-gray-50">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODAL FICHA RESUMO DO FORNECEDOR */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedSupplierForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-emerald-700" />
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    Ficha Cadastral e Financeira de Compras
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {selectedSupplierForModal.supplierName} • {selectedSupplierForModal.document}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupplierForModal(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Líquido</span>
                  <span className="text-sm font-black text-emerald-800">
                    {fmtMoney(selectedSupplierForModal.netTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Qtd Comprada</span>
                  <span className="text-sm font-black text-gray-900">
                    {fmtQty(selectedSupplierForModal.totalQuantity)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Notas Fiscais</span>
                  <span className="text-sm font-black text-purple-700">
                    {selectedSupplierForModal.invoicesCount} NFs
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Participação</span>
                  <span className="text-sm font-black text-gray-900">
                    {selectedSupplierForModal.marketShare.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-gray-900 mb-2">Histórico de Notas Fiscais</h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {selectedSupplierForModal.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition"
                    >
                      <div>
                        <span className="font-bold text-gray-900 block">NF #{inv.invoiceNum}</span>
                        <span className="text-[10px] text-gray-400">Emissão: {inv.issueDateFormatted}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-emerald-700">{fmtMoney(inv.totalAmount)}</span>
                        <button
                          onClick={() => {
                            setSelectedSupplierForModal(null);
                            setSelectedInvoice(inv);
                          }}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold transition"
                        >
                          Ver Produtos
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 flex items-center justify-end bg-gray-50">
              <button
                onClick={() => setSelectedSupplierForModal(null)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

