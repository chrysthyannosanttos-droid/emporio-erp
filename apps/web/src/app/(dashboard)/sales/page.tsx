"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  Pencil,
  Trash2,
  Ban,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Archive,
  Download,
} from "lucide-react";
import {
  listSalesAdmin,
  listDeletedSalesAuditAdmin,
  SaleAdminRecord,
  DeletedSaleAuditRecord,
} from "@/actions/salesAdmin";
import {
  SaleEditModal,
  SaleDeleteCancelModal,
  BulkSalesEditModal,
  BulkSalesActionModal,
} from "@/components/SaleAdminModals";

function fmtMoney(v: number) {
  return Number((v || 0).toFixed(2)).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtQty(q: number, unit?: string) {
  const clean = Number((q || 0).toFixed(3)).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return `${clean} ${unit || "UN"}`;
}

export default function SalesManagementPage() {
  const [sales, setSales] = useState<SaleAdminRecord[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editingSale, setEditingSale] = useState<SaleAdminRecord | null>(null);
  const [deletingSale, setDeletingSale] = useState<{
    sale: SaleAdminRecord;
    mode: "CANCEL" | "DELETE";
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkActionMode, setBulkActionMode] = useState<"CANCEL" | "DELETE" | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "deleted">("active");
  const [deletedLogs, setDeletedLogs] = useState<DeletedSaleAuditRecord[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  const loadDeletedLogs = async () => {
    setLoadingDeleted(true);
    const res = await listDeletedSalesAuditAdmin({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      take: 500,
    });
    if (res.success) {
      setDeletedLogs(res.logs || []);
    }
    setLoadingDeleted(false);
  };

  const loadSales = async () => {
    setLoading(true);
    const res = await listSalesAdmin({
      status: statusFilter,
      paymentMethod: paymentFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      take: 200,
    });
    if (res.success) {
      const nextSales = res.sales || [];
      setSales(nextSales);
      setCustomers(res.customers || []);
      setProducts(res.products || []);
      const validSet = new Set(nextSales.map((s) => s.id));
      setSelectedIds((prev) => prev.filter((id) => validSet.has(id)));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSales();
    loadDeletedLogs();
  }, [statusFilter, paymentFilter, startDate, endDate]);

  useEffect(() => {
    const onUpdated = () => {
      loadSales();
      loadDeletedLogs();
    };
    window.addEventListener("erp-data-updated", onUpdated);
    return () => window.removeEventListener("erp-data-updated", onUpdated);
  }, [statusFilter, paymentFilter, startDate, endDate]);

  const duplicateAnalysis = useMemo(() => {
    const active = sales
      .filter((s) => s.status !== "CANCELED" && s.total > 0)
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const allDuplicateIds = new Set<string>();
    const copyIdsToDelete = new Set<string>();

    const bySignature = new Map<string, SaleAdminRecord[]>();
    for (const s of active) {
      const sig = `${(s.customerId || s.customerName).toLowerCase()}|${s.total.toFixed(2)}|${s.items.length}`;
      const list = bySignature.get(sig) || [];
      list.push(s);
      bySignature.set(sig, list);
    }

    for (const group of bySignature.values()) {
      if (group.length < 2) continue;
      for (let i = 1; i < group.length; i++) {
        const prevTime = new Date(group[i - 1].createdAt).getTime();
        const currTime = new Date(group[i].createdAt).getTime();
        if (Math.abs(currTime - prevTime) <= 15 * 60 * 1000) {
          allDuplicateIds.add(group[i - 1].id);
          allDuplicateIds.add(group[i].id);
          copyIdsToDelete.add(group[i].id);
        }
      }
    }

    return {
      allDuplicateIds,
      copyIds: Array.from(copyIdsToDelete),
    };
  }, [sales]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (onlyDuplicates && !duplicateAnalysis.allDuplicateIds.has(s.id)) {
        return false;
      }
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.customerDocument || "").toLowerCase().includes(q) ||
        s.operatorName.toLowerCase().includes(q) ||
        s.items.some((it) => it.productName.toLowerCase().includes(q)) ||
        (s.invoice?.number && s.invoice.number.includes(q))
      );
    });
  }, [sales, search, onlyDuplicates, duplicateAnalysis]);

  const summary = useMemo(() => {
    const active = filtered.filter((s) => s.status !== "CANCELED");
    const canceled = filtered.filter((s) => s.status === "CANCELED");
    return {
      totalCount: filtered.length,
      activeAmount: active.reduce((acc, s) => acc + s.total, 0),
      canceledCount: canceled.length,
    };
  }, [filtered]);

  const filteredDeletedLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deletedLogs;
    return deletedLogs.filter((l) =>
      l.code.toLowerCase().includes(q) ||
      l.customerName.toLowerCase().includes(q) ||
      l.reason.toLowerCase().includes(q) ||
      l.deletedBy.toLowerCase().includes(q) ||
      (l.invoiceInfo || "").toLowerCase().includes(q)
    );
  }, [deletedLogs, search]);

  const deletedTotalAmount = useMemo(
    () => filteredDeletedLogs.reduce((acc, l) => acc + (l.total || 0), 0),
    [filteredDeletedLogs]
  );

  const exportDeletedCsv = () => {
    const header = "Data/Hora;Codigo;Operacao;Cliente;Nota Fiscal;Valor (R$);Motivo;Responsavel\n";
    const rows = filteredDeletedLogs
      .map((l) =>
        [
          new Date(l.createdAt).toLocaleString("pt-BR"),
          `#${l.code}`,
          l.operation,
          l.customerName,
          l.invoiceInfo || "-",
          l.total.toFixed(2).replace(".", ","),
          l.reason.replace(/;/g, ","),
          l.deletedBy,
        ].join(";")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-vendas-notas-apagadas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="text-blue-600" size={24} />
            Gestão de Vendas (Editar, Cancelar & Excluir)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Visualize vendas do PDV e Venda Direta, ajuste itens/pagamentos/cliente ou faça estorno e exclusão com reposição automática de estoque.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 border cursor-pointer transition-all ${
              activeTab === "active"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <ShoppingBag size={14} />
            Vendas Ativas ({sales.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("deleted")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 border cursor-pointer transition-all ${
              activeTab === "deleted"
                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Archive size={14} />
            Notas / Vendas Apagadas ({deletedLogs.length})
          </button>

          <button
            type="button"
            onClick={() => {
              loadSales();
              loadDeletedLogs();
            }}
            disabled={loading || loadingDeleted}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-blue-400 text-xs font-bold text-gray-700 flex items-center gap-2 cursor-pointer w-fit"
          >
            <RefreshCw size={14} className={loading || loadingDeleted ? "animate-spin text-blue-600" : ""} />
            Atualizar
          </button>
        </div>
      </div>

      {activeTab === "deleted" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-2xs">
              <div className="text-[11px] font-black text-rose-700 uppercase">Vendas / Notas Apagadas</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{filteredDeletedLogs.length}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
              <div className="text-[11px] font-black text-gray-400 uppercase">Valor Total Apagado</div>
              <div className="text-2xl font-black font-mono text-gray-900 mt-1">
                R$ {fmtMoney(deletedTotalAmount)}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-black text-gray-400 uppercase">Relatório</div>
                <div className="text-xs text-gray-500 mt-1">Exportar histórico completo</div>
              </div>
              <button
                type="button"
                disabled={filteredDeletedLogs.length === 0}
                onClick={exportDeletedCsv}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Exportar CSV
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-2xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, cliente, NF, motivo ou responsável..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl text-xs font-medium outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-[10px] font-bold text-gray-400">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent font-mono font-bold text-gray-800 outline-none"
              />
              <span className="text-[10px] font-bold text-gray-400">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent font-mono font-bold text-gray-800 outline-none"
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Data / Hora Exclusão</th>
                    <th className="py-3 px-3">Código</th>
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Nota Fiscal</th>
                    <th className="py-3 px-3">Ação</th>
                    <th className="py-3 px-3">Motivo</th>
                    <th className="py-3 px-3">Apagado por</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {loadingDeleted ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400 font-bold">
                        Carregando relatório de notas/vendas apagadas...
                      </td>
                    </tr>
                  ) : filteredDeletedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400 font-bold">
                        Nenhum registro de venda ou nota apagada encontrado neste filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredDeletedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-gray-700 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-gray-900">#{log.code}</td>
                        <td className="py-3 px-3 font-semibold text-gray-800">{log.customerName}</td>
                        <td className="py-3 px-3 font-mono text-xs text-blue-700">
                          {log.invoiceInfo || "—"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              log.operation === "CANCELADA"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {log.operation}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600 max-w-xs">{log.reason}</td>
                        <td className="py-3 px-3 font-semibold text-gray-700">{log.deletedBy}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-700 whitespace-nowrap">
                          R$ {fmtMoney(log.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "active" && (
        <>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-black text-gray-400 uppercase">Vendas Listadas</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{summary.totalCount}</div>
        </div>
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-black text-emerald-700 uppercase">Total Ativo (Filtro)</div>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
            R$ {fmtMoney(summary.activeAmount)}
          </div>
        </div>
        <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-black text-red-700 uppercase">Canceladas no Filtro</div>
          <div className="text-2xl font-black text-red-600 mt-1">{summary.canceledCount}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-2xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, cliente, produto, NF ou operador..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl text-xs font-medium outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none"
        >
          <option value="ALL">Todos os Status</option>
          <option value="COMPLETED">Concluídas</option>
          <option value="ADJUSTED">Editadas / Ajustadas</option>
          <option value="CANCELED">Canceladas</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none"
        >
          <option value="ALL">Todos Pagamentos</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="PIX">PIX</option>
          <option value="CREDIT">Crédito</option>
          <option value="DEBIT">Débito</option>
          <option value="BOLETO">Boleto</option>
          <option value="CREDIARIO">Crediário</option>
        </select>

        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs">
          <span className="text-[10px] font-bold text-gray-400">De:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent font-mono font-bold text-gray-800 outline-none"
          />
          <span className="text-[10px] font-bold text-gray-400">Até:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent font-mono font-bold text-gray-800 outline-none"
          />
        </div>

        {duplicateAnalysis.copyIds.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOnlyDuplicates((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                onlyDuplicates
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
              }`}
              title="Filtrar possíveis vendas duplicadas (mesmo cliente, valor e horário próximo)"
            >
              Duplicadas ({duplicateAnalysis.allDuplicateIds.size})
            </button>
            <button
              type="button"
              onClick={() => {
                setOnlyDuplicates(true);
                setSelectedIds(duplicateAnalysis.copyIds);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 cursor-pointer"
              title="Marca automaticamente as cópias extras mantendo 1 original desmarcada"
            >
              Marcar Cópias Extras ({duplicateAnalysis.copyIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Barra de Ação em Lote quando há vendas marcadas */}
      {selectedIds.length > 0 && (() => {
        const selectedSales = sales.filter((s) => selectedIds.includes(s.id));
        const selectedTotal = selectedSales.reduce((acc, s) => acc + s.total, 0);
        return (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="text-xs font-black text-blue-900">
              {selectedIds.length} venda(s) marcada(s) • Total:{" "}
              <span className="font-mono">R$ {fmtMoney(selectedTotal)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedSales.length === 1) {
                    setEditingSale(selectedSales[0]);
                  } else {
                    setShowBulkEditModal(true);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil size={13} /> Editar Marcadas ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={() => setBulkActionMode("CANCEL")}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Ban size={13} /> Cancelar Marcadas
              </button>
              <button
                type="button"
                onClick={() => setBulkActionMode("DELETE")}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} /> Excluir Marcadas
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs font-bold cursor-pointer hover:bg-gray-100"
              >
                Limpar Seleção
              </button>
            </div>
          </div>
        );
      })()}

      {/* Tabela de Vendas */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-black">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((s) => selectedIds.includes(s.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filtered.map((s) => s.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    title="Marcar / Desmarcar todas"
                    className="rounded text-blue-600 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">Data / Código</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3">Nota Fiscal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400 font-bold">
                    Carregando vendas...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                    Nenhuma venda encontrada com esses filtros.
                  </td>
                </tr>
              ) : (
                filtered.map((sale) => {
                  const isExpanded = expandedId === sale.id;
                  const isCanceled = sale.status === "CANCELED";
                  const isSelected = selectedIds.includes(sale.id);
                  return (
                    <Fragment key={sale.id}>
                      <tr
                        className={`hover:bg-blue-50/30 transition-colors ${
                          isSelected ? "bg-blue-50/70" : isCanceled ? "opacity-65 bg-red-50/20" : ""
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedIds((prev) =>
                                e.target.checked
                                  ? [...prev, sale.id]
                                  : prev.filter((id) => id !== sale.id)
                              );
                            }}
                            className="rounded text-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-gray-900">
                            {new Date(sale.createdAt).toLocaleString("pt-BR")}
                          </div>
                          <div className="text-[10px] font-mono text-gray-500">
                            #{sale.id.slice(0, 8).toUpperCase()} • {sale.operatorName}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          <div>{sale.customerName}</div>
                          {sale.customerDocument && (
                            <div className="text-[10px] font-mono text-gray-400">
                              {sale.customerDocument}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                          >
                            {sale.items.length} item(ns)
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {sale.invoice ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                                  sale.invoice.status === "AUTHORIZED"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : sale.invoice.status === "CANCELED"
                                    ? "bg-gray-100 text-gray-600 border-gray-300"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {sale.invoice.type} #{sale.invoice.number || "S/N"}
                              </span>
                              {sale.invoice.accessKey && (
                                <Link
                                  href={`/invoices/danfe/${sale.invoice.accessKey}`}
                                  target="_blank"
                                  className="text-blue-600 hover:underline font-bold flex items-center gap-0.5"
                                >
                                  <FileText size={12} /> DANFE
                                </Link>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">Sem NF</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {sale.status === "CANCELED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                              <AlertCircle size={11} /> Cancelada
                            </span>
                          ) : sale.status === "ADJUSTED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              Editada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                              <CheckCircle2 size={11} /> Concluída
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-sm text-gray-900 whitespace-nowrap">
                          R$ {fmtMoney(sale.total)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingSale(sale)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold inline-flex items-center gap-1 cursor-pointer"
                              title="Editar venda"
                            >
                              <Pencil size={12} /> Editar
                            </button>
                            {!isCanceled && (
                              <button
                                type="button"
                                onClick={() => setDeletingSale({ sale, mode: "CANCEL" })}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="Cancelar venda"
                              >
                                <Ban size={12} /> Cancelar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeletingSale({ sale, mode: "DELETE" })}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold inline-flex items-center gap-1 cursor-pointer"
                              title="Excluir venda definitivamente"
                            >
                              <Trash2 size={12} /> Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${sale.id}-details`} className="bg-gray-50/70">
                          <td colSpan={9} className="px-6 py-3">
                            <div className="text-[11px] font-bold text-gray-600 mb-1.5">
                              Itens da Venda #{sale.id.slice(0, 8).toUpperCase()}:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {sale.items.map((it, i) => (
                                <div
                                  key={i}
                                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex justify-between gap-2"
                                >
                                  <span className="font-bold text-gray-800 truncate">
                                    {fmtQty(it.quantity, it.unit)} × {it.productName}
                                  </span>
                                  <span className="font-mono font-bold text-gray-700 shrink-0">
                                    R$ {fmtMoney(it.total)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {sale.adjustmentReason && (
                              <div className="text-[11px] text-amber-800 mt-2 font-semibold">
                                Motivo / Obs.: {sale.adjustmentReason}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {editingSale && (
        <SaleEditModal
          sale={editingSale}
          customers={customers}
          products={products}
          onClose={() => setEditingSale(null)}
          onSaved={loadSales}
        />
      )}

      {deletingSale && (
        <SaleDeleteCancelModal
          sale={deletingSale.sale}
          initialMode={deletingSale.mode}
          onClose={() => setDeletingSale(null)}
          onDone={() => {
            const targetId = deletingSale.sale.id;
            const targetMode = deletingSale.mode;
            setSales((prev) =>
              targetMode === "DELETE"
                ? prev.filter((s) => s.id !== targetId)
                : prev.map((s) => (s.id === targetId ? { ...s, status: "CANCELED" } : s))
            );
            setSelectedIds((prev) => prev.filter((id) => id !== targetId));
            void loadSales();
            void loadDeletedLogs();
          }}
        />
      )}

      {showBulkEditModal && (
        <BulkSalesEditModal
          selectedSales={sales.filter((s) => selectedIds.includes(s.id))}
          customers={customers}
          onClose={() => setShowBulkEditModal(false)}
          onSaved={async () => {
            setSelectedIds([]);
            await loadSales();
          }}
        />
      )}

      {bulkActionMode && (
        <BulkSalesActionModal
          selectedSales={sales.filter((s) => selectedIds.includes(s.id))}
          initialMode={bulkActionMode}
          onClose={() => setBulkActionMode(null)}
          onDone={() => {
            const targetSet = new Set(selectedIds);
            const targetMode = bulkActionMode;
            setSales((prev) =>
              targetMode === "DELETE"
                ? prev.filter((s) => !targetSet.has(s.id))
                : prev.map((s) => (targetSet.has(s.id) ? { ...s, status: "CANCELED" } : s))
            );
            setSelectedIds([]);
            void loadSales();
            void loadDeletedLogs();
          }}
        />
      )}
    </div>
  );
}
