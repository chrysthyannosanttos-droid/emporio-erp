"use client";

import { useState, useEffect } from "react";
import {
  Receipt, CheckCircle2, AlertTriangle, Clock, Search, Filter,
  ArrowUpRight, ArrowDownRight, User, DollarSign, Calendar, Eye,
  Building2, Check, X, ShieldAlert, Sparkles, RefreshCw
} from "lucide-react";
import { getCashClosings, auditCashClosing, CashClosingData } from "@/actions/cashClosing";

export default function CashClosingsTreasuryPage() {
  const [closings, setClosings] = useState<CashClosingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClosing, setSelectedClosing] = useState<CashClosingData | null>(null);
  const [auditNotes, setAuditNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "DIVERGENT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const res = await getCashClosings();
    setClosings(res.closings || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const fmt = (v: number) =>
    (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (d: string | Date) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return String(d);
    }
  };

  // KPIs
  const totalClosings = closings.length;
  const pendingCount = closings.filter(c => c.status === "PENDING").length;
  const approvedCount = closings.filter(c => c.status === "APPROVED").length;
  const divergentCount = closings.filter(c => c.status === "DIVERGENT" || (c.totalDiff && Math.abs(c.totalDiff) > 0.05)).length;

  const totalExpectedSum = closings.reduce((a, b) => a + (b.totalExpected || 0), 0);
  const totalCountedSum = closings.reduce((a, b) => a + (b.totalCounted || 0), 0);
  const totalDiffSum = closings.reduce((a, b) => a + (b.totalDiff || 0), 0);

  // Filtered list
  const filtered = closings.filter(c => {
    if (filterStatus === "PENDING" && c.status !== "PENDING") return false;
    if (filterStatus === "APPROVED" && c.status !== "APPROVED") return false;
    if (filterStatus === "DIVERGENT" && c.status !== "DIVERGENT" && Math.abs(c.totalDiff || 0) <= 0.05) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOp = c.operator.toLowerCase().includes(q);
      const matchCx = `caixa ${c.cashierNumber}`.includes(q);
      return matchOp || matchCx;
    }
    return true;
  });

  const handleAudit = async (status: "APPROVED" | "DIVERGENT") => {
    if (!selectedClosing?.id) return;
    setIsSubmitting(true);
    await auditCashClosing(selectedClosing.id, {
      status,
      auditorNotes: auditNotes
    });
    setIsSubmitting(false);
    setSelectedClosing(null);
    setAuditNotes("");
    await loadData();
  };

  return (
    <div className="w-full pb-16 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Módulo de Tesouraria
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Conferência & Auditoria de Fechamentos de Caixa
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Validação de valores declarados pelos operadores e fiscais de caixa versus total apurado no sistema.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 hover:text-blue-600 hover:border-blue-400 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer w-fit"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
          Atualizar Dados
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Aguardando Auditoria</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600">{pendingCount} caixas</div>
          <div className="text-[11px] text-gray-500 mt-1">Requerem homologação da tesouraria</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Homologados / OK</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700">{approvedCount} caixas</div>
          <div className="text-[11px] text-gray-500 mt-1">Conferidos e aprovados</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Total Declarado (Contado)</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <DollarSign size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-gray-900 font-mono">R$ {fmt(totalCountedSum)}</div>
          <div className="text-[11px] text-gray-500 mt-1">Esperado: R$ {fmt(totalExpectedSum)}</div>
        </div>

        <div className={`bg-white border rounded-2xl p-4 shadow-2xs ${
          totalDiffSum < 0 ? "border-rose-300 bg-rose-50/20" : totalDiffSum > 0 ? "border-blue-300 bg-blue-50/20" : "border-gray-200"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Quebra / Diferença Geral</span>
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              totalDiffSum < 0 ? "bg-rose-100 text-rose-700" : totalDiffSum > 0 ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
            }`}>
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className={`text-2xl font-black font-mono ${
            totalDiffSum < 0 ? "text-rose-600" : totalDiffSum > 0 ? "text-blue-700" : "text-emerald-600"
          }`}>
            {totalDiffSum > 0 ? "+" : ""}R$ {fmt(totalDiffSum)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            {totalDiffSum < 0 ? "Falta registrada no total" : totalDiffSum > 0 ? "Sobra registrada no total" : "Sem quebra de caixa"}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { key: "ALL", label: `Todos (${totalClosings})` },
            { key: "PENDING", label: `Pendentes (${pendingCount})` },
            { key: "APPROVED", label: `Homologados (${approvedCount})` },
            { key: "DIVERGENT", label: `Com Quebra (${divergentCount})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === tab.key
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por operador ou caixa..."
            className="w-full bg-gray-50 border border-gray-300 focus:bg-white focus:border-blue-600 text-gray-900 text-xs font-semibold pl-9 pr-3 py-2 rounded-xl outline-none transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-extrabold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Terminal / Caixa</th>
                <th className="px-5 py-3.5">Operador</th>
                <th className="px-5 py-3.5">Encerramento</th>
                <th className="px-5 py-3.5 text-right font-mono">Esperado (Sistema)</th>
                <th className="px-5 py-3.5 text-right font-mono">Declarado (Contado)</th>
                <th className="px-5 py-3.5 text-right font-mono">Diferença / Quebra</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                    <Receipt size={36} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-gray-600 text-sm">Nenhum fechamento de caixa encontrado</p>
                    <p className="text-xs text-gray-400 mt-0.5">Fechamentos realizados no PDV aparecerão aqui para conferência.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const diff = c.totalDiff || 0;
                  const hasDiff = Math.abs(diff) > 0.05;
                  return (
                    <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                            {String(c.cashierNumber).padStart(2, "0")}
                          </span>
                          <span className="font-bold text-gray-900">Caixa {String(c.cashierNumber).padStart(2, "0")}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-gray-800">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-gray-400" />
                          <span>{c.operator}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 font-medium">
                        {fmtDate(c.closedAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-700">
                        R$ {fmt(c.totalExpected)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900">
                        R$ {fmt(c.totalCounted)}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-mono font-black ${
                        !hasDiff ? "text-emerald-600" : diff < 0 ? "text-rose-600" : "text-blue-600"
                      }`}>
                        {diff > 0 ? "+" : ""}R$ {fmt(diff)}
                        {hasDiff && (
                          <span className="text-[10px] block font-semibold opacity-75">
                            {diff < 0 ? "FALTA" : "SOBRA"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {c.status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} /> Homologado
                          </span>
                        ) : c.status === "DIVERGENT" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle size={12} /> Divergência
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={12} /> Aguardando
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => {
                            setSelectedClosing(c);
                            setAuditNotes(c.auditorNotes || "");
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-bold border border-blue-200 transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye size={13} /> Conferir
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conference & Audit Modal */}
      {selectedClosing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col text-gray-800 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-2xs">
                  {String(selectedClosing.cashierNumber).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    Auditoria de Fechamento - Caixa {String(selectedClosing.cashierNumber).padStart(2, "0")}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Operador: <strong className="text-gray-800">{selectedClosing.operator}</strong> | Fechado em: {fmtDate(selectedClosing.closedAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClosing(null)}
                className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Esperado</span>
                  <span className="text-lg font-black text-gray-900 font-mono">R$ {fmt(selectedClosing.totalExpected)}</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Declarado</span>
                  <span className="text-lg font-black text-gray-900 font-mono">R$ {fmt(selectedClosing.totalCounted)}</span>
                </div>
                <div className={`rounded-xl p-3 border ${
                  (selectedClosing.totalDiff || 0) < 0
                    ? "bg-rose-50 border-rose-300 text-rose-700"
                    : (selectedClosing.totalDiff || 0) > 0
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-emerald-50 border-emerald-300 text-emerald-700"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Diferença Final</span>
                  <span className="text-lg font-black font-mono">
                    {(selectedClosing.totalDiff || 0) > 0 ? "+" : ""}R$ {fmt(selectedClosing.totalDiff || 0)}
                  </span>
                </div>
              </div>

              {/* Breakdown Table by Payment Method */}
              <div>
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">
                  Detalhamento por Meio de Pagamento
                </h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5">Forma</th>
                        <th className="px-4 py-2.5 text-right font-mono">Sistema</th>
                        <th className="px-4 py-2.5 text-right font-mono">Declarado</th>
                        <th className="px-4 py-2.5 text-right font-mono">Diferença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { label: "Dinheiro (Espécie)", exp: selectedClosing.expectedMoney, cnt: selectedClosing.countedMoney, diff: selectedClosing.diffMoney },
                        { label: "Cartão (Crédito/Débito)", exp: selectedClosing.expectedCard, cnt: selectedClosing.countedCard, diff: selectedClosing.diffCard },
                        { label: "PIX", exp: selectedClosing.expectedPix, cnt: selectedClosing.countedPix, diff: selectedClosing.diffPix },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-bold text-gray-900">{row.label}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-600">R$ {fmt(row.exp)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-900 font-semibold">R$ {fmt(row.cnt)}</td>
                          <td className={`px-4 py-2.5 text-right font-mono font-black ${
                            Math.abs(row.diff || 0) < 0.05 ? "text-emerald-600" : (row.diff || 0) < 0 ? "text-rose-600" : "text-blue-600"
                          }`}>
                            {(row.diff || 0) > 0 ? "+" : ""}R$ {fmt(row.diff || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fiscal Notes */}
              {selectedClosing.closingNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs">
                  <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider block mb-1">
                    Observação informada pelo Fiscal/Operador:
                  </span>
                  <p className="text-amber-800 leading-relaxed">{selectedClosing.closingNote}</p>
                </div>
              )}

              {/* Auditor Notes Input */}
              <div>
                <label className="block text-xs font-black text-gray-800 uppercase tracking-wider mb-1.5">
                  Parecer / Anotação da Tesouraria
                </label>
                <textarea
                  value={auditNotes}
                  onChange={e => setAuditNotes(e.target.value)}
                  placeholder="Escreva a validação da tesouraria, número do envelope ou detalhes da conferência física..."
                  rows={3}
                  className="w-full bg-white border border-gray-300 focus:border-blue-600 text-gray-900 text-xs p-3 rounded-xl outline-none shadow-2xs placeholder:text-gray-400 resize-none transition-all"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedClosing(null)}
                className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleAudit("DIVERGENT")}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <AlertTriangle size={15} /> Registrar c/ Ressalva
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleAudit("APPROVED")}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={16} /> Homologar & Aprovar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

