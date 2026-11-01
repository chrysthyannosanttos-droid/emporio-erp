"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck, Search, Store, User, Terminal, Clock,
  AlertCircle, CheckCircle, Eye, Loader2, ArrowRight,
  Filter, FileText, Lock, X
} from "lucide-react";
import { listAuditLogs } from "@/actions/audit";
import { listStores } from "@/actions/stores";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStore, setSelectedStore] = useState("ALL");
  const [selectedResult, setSelectedResult] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logRes, storeRes] = await Promise.all([
        listAuditLogs({
          storeId: selectedStore === "ALL" ? undefined : selectedStore,
          result: selectedResult === "ALL" ? undefined : selectedResult,
          search: search || undefined,
          limit: 150,
        }),
        listStores(),
      ]);

      if (logRes.logs) setLogs(logRes.logs);
      if (storeRes.stores) setStores(storeRes.stores);
    } catch (err) {
      console.error("Erro ao carregar logs de auditoria:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStore, selectedResult, search]);

  return (
    <div className="h-full flex flex-col gap-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Log de Auditoria & Segurança</h1>
              <p className="text-slate-500 text-xs mt-0.5">Trilha de auditoria imutável com registro de todas as operações, alçadas, autorizações e alterações do sistema.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-200 px-3.5 py-1.5 rounded-xl text-indigo-700 text-xs font-semibold">
          <Lock size={13} />
          <span>Registros Imutáveis & Criptografados</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por usuário, operação, motivo ou terminal..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#e8f0fc] border border-[#c4d5ee] focus:border-indigo-500 text-gray-900 rounded-xl outline-none text-xs placeholder:text-slate-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            className="bg-[#e8f0fc] border border-[#c4d5ee] text-slate-600 text-xs px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="ALL">Todas as Lojas</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
            ))}
          </select>

          <select
            value={selectedResult}
            onChange={e => setSelectedResult(e.target.value)}
            className="bg-[#e8f0fc] border border-[#c4d5ee] text-slate-600 text-xs px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="ALL">Todos os Resultados</option>
            <option value="SUCCESS">Sucesso / Aprovado</option>
            <option value="DENIED">Negado / Recusado</option>
          </select>
        </div>
      </div>

      {/* Tabela de Auditoria */}
      <div className="bg-[#fbfdff] rounded-2xl border border-[#c4d5ee] flex-1 flex flex-col min-h-0 overflow-hidden shadow-xl">
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 gap-3">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-xs">Carregando logs de auditoria...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 gap-3">
              <ShieldCheck size={40} className="text-slate-700" />
              <p className="text-xs">Nenhum registro de auditoria encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f3f7fe]/80 border-b border-[#c4d5ee] text-slate-500 sticky top-0 backdrop-blur-sm z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data / Hora</th>
                  <th className="px-4 py-3 font-semibold">Usuário & Cargo</th>
                  <th className="px-4 py-3 font-semibold">Operação & Ação</th>
                  <th className="px-4 py-3 font-semibold">Loja / Terminal</th>
                  <th className="px-4 py-3 font-semibold">Autorizador</th>
                  <th className="px-4 py-3 font-semibold">Resultado</th>
                  <th className="px-4 py-3 font-semibold text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {logs.map(log => {
                  const isSuccess = log.result === "SUCCESS";

                  return (
                    <tr key={log.id} className="hover:bg-indigo-500/[0.03] transition-colors group">
                      {/* Data / Hora */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>

                      {/* Usuário */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                          {log.user?.name || "Sistema"}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {log.user?.role || "SYSTEM"} • {log.user?.email || ""}
                        </span>
                      </td>

                      {/* Operação */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-indigo-700">{log.operation}</span>
                          <span className="text-[9px] font-bold bg-[#f3f7fe] text-slate-500 px-1.5 py-0.5 rounded border border-[#c4d5ee] uppercase">
                            {log.action}
                          </span>
                        </div>
                        {log.reason && (
                          <span className="text-[11px] text-slate-500 line-clamp-1 italic">
                            "{log.reason}"
                          </span>
                        )}
                      </td>

                      {/* Loja / Terminal */}
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Store size={11} className="text-indigo-600" />
                          <span>{log.store?.code || "Matriz"}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">{log.terminal || "Web/PDV"}</span>
                      </td>

                      {/* Autorizador */}
                      <td className="px-4 py-3">
                        {log.authorizer ? (
                          <div>
                            <span className="text-xs font-semibold text-amber-700">{log.authorizer.name}</span>
                            <span className="text-[10px] text-amber-600/70 block">({log.authorizer.role})</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Resultado */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSuccess
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"
                            : "bg-red-500/15 text-red-600 border border-red-500/20"
                        }`}>
                          {isSuccess ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                          <span>{isSuccess ? "Sucesso" : "Negado"}</span>
                        </span>
                      </td>

                      {/* Detalhes */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-slate-500 hover:text-gray-900 hover:bg-[#e8f0fc] rounded-lg transition-all cursor-pointer"
                          title="Ver detalhes completos"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Log */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-indigo-200 rounded-3xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#c4d5ee] pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-indigo-600" />
                Registro de Auditoria #{selectedLog.id.slice(0, 8)}
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-500 hover:text-gray-900">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#f3f7fe] rounded-xl">
                  <span className="text-slate-500 block text-[10px]">Data e Hora</span>
                  <strong className="text-gray-900">{new Date(selectedLog.createdAt).toLocaleString("pt-BR")}</strong>
                </div>
                <div className="p-2.5 bg-[#f3f7fe] rounded-xl">
                  <span className="text-slate-500 block text-[10px]">Resultado</span>
                  <strong className={selectedLog.result === "SUCCESS" ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                    {selectedLog.result}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#f3f7fe] rounded-xl">
                  <span className="text-slate-500 block text-[10px]">Usuário</span>
                  <strong className="text-indigo-700">{selectedLog.user?.name}</strong>
                  <span className="text-slate-500 block text-[10px]">({selectedLog.user?.role})</span>
                </div>
                <div className="p-2.5 bg-[#f3f7fe] rounded-xl">
                  <span className="text-slate-500 block text-[10px]">Autorizador</span>
                  <strong className="text-amber-700">{selectedLog.authorizer ? selectedLog.authorizer.name : "Nenhum / Direto"}</strong>
                  {selectedLog.authorizer && (
                    <span className="text-amber-600/70 block text-[10px]">({selectedLog.authorizer.role})</span>
                  )}
                </div>
              </div>

              <div className="p-2.5 bg-[#f3f7fe] rounded-xl">
                <span className="text-slate-500 block text-[10px]">Operação & Ação</span>
                <span className="text-gray-900 font-bold">{selectedLog.operation}</span> • <span className="text-indigo-600">{selectedLog.action}</span>
              </div>

              {selectedLog.oldValue && (
                <div className="p-2.5 bg-red-500/5 border border-red-500/15 rounded-xl">
                  <span className="text-red-600 block font-semibold text-[10px]">Estado Anterior</span>
                  <p className="text-slate-600 font-mono text-[11px] break-all">{selectedLog.oldValue}</p>
                </div>
              )}

              {selectedLog.newValue && (
                <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                  <span className="text-emerald-600 block font-semibold text-[10px]">Novo Estado</span>
                  <p className="text-slate-600 font-mono text-[11px] break-all">{selectedLog.newValue}</p>
                </div>
              )}

              {selectedLog.reason && (
                <div className="p-2.5 bg-[#f3f7fe] rounded-xl">
                  <span className="text-slate-500 block text-[10px]">Justificativa / Motivo</span>
                  <p className="text-gray-900 italic">"{selectedLog.reason}"</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1">
                <span>Terminal: {selectedLog.terminal || "Web/PDV"}</span>
                <span className="text-right">IP: {selectedLog.ipAddress || "127.0.0.1"}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="w-full py-2.5 bg-[#fbfdff] text-slate-600 text-xs rounded-xl font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
