"use client";

import { useState, useEffect } from "react";
import {
  Bell, Check, X, ShieldAlert, ShieldCheck, Search,
  Clock, Store, User, Terminal, AlertCircle, Loader2,
  ChevronRight, Key, MessageSquare, Eye
} from "lucide-react";
import { listApprovalRequests, approveRequest, rejectRequest } from "@/actions/approvals";
import { listStores } from "@/actions/stores";

export default function CentralApprovalsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusTab, setStatusTab] = useState("PENDING");
  const [selectedStore, setSelectedStore] = useState("ALL");
  const [search, setSearch] = useState("");

  // Action Modals
  const [approveModalReq, setApproveModalReq] = useState<any | null>(null);
  const [rejectModalReq, setRejectModalReq] = useState<any | null>(null);
  const [detailsModalReq, setDetailsModalReq] = useState<any | null>(null);

  const [authorizerIden, setAuthorizerIden] = useState("");
  const [secretPin, setSecretPin] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, storeRes] = await Promise.all([
        listApprovalRequests({
          status: statusTab,
          storeId: selectedStore === "ALL" ? undefined : selectedStore,
          search: search || undefined,
        }),
        listStores(),
      ]);

      if (reqRes.requests) {
        setRequests(reqRes.requests);
        if (reqRes.counts) setCounts(reqRes.counts);
      }
      if (storeRes.stores) {
        setStores(storeRes.stores);
      }
    } catch (err) {
      console.error("Erro ao carregar liberações:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh pendências a cada 15 segundos
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [statusTab, selectedStore, search]);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveModalReq) return;

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await approveRequest(approveModalReq.id, authorizerIden.trim(), secretPin.trim());
      if (res.success) {
        setApproveModalReq(null);
        setAuthorizerIden("");
        setSecretPin("");
        await loadData();
      } else {
        setActionError(res.error || "Falha ao aprovar liberação.");
      }
    } catch (err: any) {
      setActionError(err.message || "Erro de comunicação.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalReq) return;

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await rejectRequest(
        rejectModalReq.id,
        authorizerIden.trim(),
        secretPin.trim(),
        rejectionReason.trim()
      );
      if (res.success) {
        setRejectModalReq(null);
        setAuthorizerIden("");
        setSecretPin("");
        setRejectionReason("");
        await loadData();
      } else {
        setActionError(res.error || "Falha ao rejeitar liberação.");
      }
    } catch (err: any) {
      setActionError(err.message || "Erro de comunicação.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Central de Liberações</h1>
              <p className="text-slate-400 text-xs mt-0.5">Autorize ou recuse cancelamentos, descontos e operações críticas em tempo real.</p>
            </div>
          </div>
        </div>

        {counts.pending > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-2xl animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-bold text-amber-300">
              {counts.pending} solicitação{counts.pending > 1 ? "ões" : ""} aguardando autorização
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div
          onClick={() => setStatusTab("PENDING")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusTab === "PENDING" ? "bg-amber-500/15 border-amber-500/40 shadow-lg shadow-amber-500/10" : "bg-[#101426] border-indigo-500/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-400 font-semibold">Pendentes</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{counts.pending}</p>
        </div>

        <div
          onClick={() => setStatusTab("APPROVED")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusTab === "APPROVED" ? "bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-500/10" : "bg-[#101426] border-indigo-500/10"
          }`}
        >
          <span className="text-[11px] text-emerald-400 font-semibold">Aprovadas</span>
          <p className="text-2xl font-bold text-white mt-1">{counts.approved}</p>
        </div>

        <div
          onClick={() => setStatusTab("REJECTED")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusTab === "REJECTED" ? "bg-red-500/15 border-red-500/40 shadow-lg shadow-red-500/10" : "bg-[#101426] border-indigo-500/10"
          }`}
        >
          <span className="text-[11px] text-red-400 font-semibold">Negadas</span>
          <p className="text-2xl font-bold text-white mt-1">{counts.rejected}</p>
        </div>

        <div
          onClick={() => setStatusTab("ALL")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusTab === "ALL" ? "bg-indigo-600/15 border-indigo-500/40 shadow-lg shadow-indigo-600/10" : "bg-[#101426] border-indigo-500/10"
          }`}
        >
          <span className="text-[11px] text-indigo-400 font-semibold">Total Geral</span>
          <p className="text-2xl font-bold text-white mt-1">{counts.total}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#101426] border border-indigo-500/10 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por solicitante, motivo ou terminal..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d18] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-xl outline-none text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            className="bg-[#0a0d18] border border-indigo-500/15 text-slate-300 text-xs px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="ALL">Todas as Lojas</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Solicitações */}
      <div className="bg-[#101426] rounded-2xl border border-indigo-500/10 flex-1 flex flex-col min-h-0 overflow-hidden shadow-xl p-4">
        <div className="flex-1 overflow-auto min-h-0 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 gap-3">
              <Loader2 className="animate-spin text-amber-400" size={32} />
              <p className="text-xs">Carregando solicitações de liberação...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 gap-3">
              <ShieldCheck size={40} className="text-slate-700" />
              <p className="text-xs">Nenhuma solicitação encontrada para o filtro atual.</p>
            </div>
          ) : (
            requests.map(req => {
              const isPending = req.status === "PENDING";
              const isApproved = req.status === "APPROVED";
              const isRejected = req.status === "REJECTED";

              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isPending
                      ? "bg-[#14192d] border-amber-500/30 shadow-md shadow-amber-500/5"
                      : "bg-[#0c0f1a] border-indigo-500/10 opacity-80"
                  }`}
                >
                  {/* Informações da Operação */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isPending ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" :
                      isApproved ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" :
                      "bg-red-500/15 text-red-400 border border-red-500/25"
                    }`}>
                      {isPending ? <Clock size={18} /> : isApproved ? <Check size={18} /> : <X size={18} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-white">{req.operation}</span>
                        {req.value > 0 && (
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 font-mono">
                            {req.operation.includes("discount") ? `${req.value}%` : `R$ ${Number(req.value).toFixed(2)}`}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPending ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                          isApproved ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                          "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-medium mb-2">
                        Motivo: <span className="text-white italic">"{req.reason}"</span>
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-indigo-400" />
                          Solicitante: <strong>{req.requester?.name || "Desconhecido"}</strong> ({req.requester?.role})
                        </span>
                        <span className="flex items-center gap-1">
                          <Terminal size={12} className="text-slate-500" />
                          {req.terminal || "PDV"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Store size={12} className="text-slate-500" />
                          {req.store?.code || "Matriz"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-500" />
                          {new Date(req.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Se Aprovado ou Negado */}
                      {isApproved && req.approver && (
                        <div className="mt-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                          <ShieldCheck size={11} />
                          Aprovado por: <strong>{req.approver.name}</strong> ({req.approver.role}) em {new Date(req.authorizedAt).toLocaleTimeString("pt-BR")}
                        </div>
                      )}

                      {isRejected && (
                        <div className="mt-2 text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                          <AlertCircle size={11} />
                          Negado por: <strong>{req.approver?.name || "Gerência"}</strong> • Justificativa: "{req.rejectionReason}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setDetailsModalReq(req)}
                      className="p-2 bg-[#0a0d18] hover:bg-white/5 text-slate-400 hover:text-white rounded-xl border border-indigo-500/10 transition-all text-xs"
                      title="Ver detalhes"
                    >
                      <Eye size={15} />
                    </button>

                    {isPending && (
                      <>
                        <button
                          onClick={() => {
                            setRejectModalReq(req);
                            setActionError(null);
                            setAuthorizerIden("");
                            setSecretPin("");
                            setRejectionReason("");
                          }}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-semibold rounded-xl border border-red-500/20 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <X size={14} />
                          <span>Negar</span>
                        </button>
                        <button
                          onClick={() => {
                            setApproveModalReq(req);
                            setActionError(null);
                            setAuthorizerIden("");
                            setSecretPin("");
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Aprovar</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Aprovação */}
      {approveModalReq && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101426] border border-indigo-500/20 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-indigo-500/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Check size={16} className="text-emerald-400" />
                Autorizar Liberação de Operação
              </h3>
              <button onClick={() => setApproveModalReq(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="bg-[#0c0f1a] p-3 rounded-2xl border border-indigo-500/10 text-xs space-y-1">
              <div><span className="text-slate-500">Operação:</span> <strong className="text-white">{approveModalReq.operation}</strong></div>
              <div><span className="text-slate-500">Solicitante:</span> <strong className="text-indigo-300">{approveModalReq.requester?.name}</strong></div>
              <div><span className="text-slate-500">Motivo:</span> <span className="text-slate-300 italic">"{approveModalReq.reason}"</span></div>
            </div>

            {actionError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleApprove} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Identificador do Autorizador (Supervisor / Gerente)</label>
                <input
                  type="text"
                  required
                  value={authorizerIden}
                  onChange={e => setAuthorizerIden(e.target.value)}
                  placeholder="Nome ou e-mail"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">PIN ou Senha de Autorização</label>
                <input
                  type="password"
                  required
                  value={secretPin}
                  onChange={e => setSecretPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApproveModalReq(null)}
                  className="flex-1 py-2.5 bg-[#14192d] text-slate-300 text-xs rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Confirmar Aprovação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Negação com Motivo Obrigatório */}
      {rejectModalReq && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101426] border border-indigo-500/20 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-indigo-500/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <X size={16} className="text-red-400" />
                Negar Solicitação de Liberação
              </h3>
              <button onClick={() => setRejectModalReq(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleReject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo da Recusa <span className="text-red-400">* (Obrigatório)</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Informe a justificativa da negação..."
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Autorizador (Supervisor / Gerente)</label>
                <input
                  type="text"
                  required
                  value={authorizerIden}
                  onChange={e => setAuthorizerIden(e.target.value)}
                  placeholder="Nome ou e-mail"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">PIN ou Senha</label>
                <input
                  type="password"
                  required
                  value={secretPin}
                  onChange={e => setSecretPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="flex-1 py-2.5 bg-[#14192d] text-slate-300 text-xs rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  <span>Confirmar Negação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {detailsModalReq && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101426] border border-indigo-500/20 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-indigo-500/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye size={16} className="text-indigo-400" />
                Detalhes da Solicitação
              </h3>
              <button onClick={() => setDetailsModalReq(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-2.5 bg-[#0c0f1a] rounded-xl">
                <span className="text-slate-400">Status:</span>
                <strong className="text-white font-bold">{detailsModalReq.status}</strong>
              </div>
              <div className="flex justify-between p-2.5 bg-[#0c0f1a] rounded-xl">
                <span className="text-slate-400">Operação:</span>
                <strong className="text-white">{detailsModalReq.operation}</strong>
              </div>
              <div className="flex justify-between p-2.5 bg-[#0c0f1a] rounded-xl">
                <span className="text-slate-400">Valor / Percentual:</span>
                <strong className="text-amber-400 font-mono">
                  {detailsModalReq.value ? `R$ ${Number(detailsModalReq.value).toFixed(2)}` : "Sem valor"}
                </strong>
              </div>
              <div className="flex justify-between p-2.5 bg-[#0c0f1a] rounded-xl">
                <span className="text-slate-400">Solicitante:</span>
                <strong className="text-indigo-300">{detailsModalReq.requester?.name} ({detailsModalReq.requester?.email})</strong>
              </div>
              <div className="flex justify-between p-2.5 bg-[#0c0f1a] rounded-xl">
                <span className="text-slate-400">Terminal:</span>
                <strong className="text-slate-200">{detailsModalReq.terminal || "PDV"}</strong>
              </div>
              <div className="flex justify-between p-2.5 bg-[#0c0f1a] rounded-xl">
                <span className="text-slate-400">Data / Hora:</span>
                <strong className="text-slate-200">{new Date(detailsModalReq.createdAt).toLocaleString("pt-BR")}</strong>
              </div>
              <div className="p-2.5 bg-[#0c0f1a] rounded-xl space-y-1">
                <span className="text-slate-400 block">Motivo Informado:</span>
                <p className="text-white italic">"{detailsModalReq.reason}"</p>
              </div>

              {detailsModalReq.rejectionReason && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1 text-red-300">
                  <span className="text-red-400 font-semibold block">Motivo da Recusa:</span>
                  <p>"{detailsModalReq.rejectionReason}"</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDetailsModalReq(null)}
              className="w-full py-2.5 bg-[#14192d] text-slate-300 text-xs rounded-xl font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
