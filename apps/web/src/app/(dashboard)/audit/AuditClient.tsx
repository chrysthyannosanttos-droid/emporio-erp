"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck, Search, Store, User, Terminal, Clock,
  AlertCircle, CheckCircle, Eye, Loader2, ArrowRight,
  Filter, FileText, Lock, X, Calendar, Download
} from "lucide-react";
import { listAuditLogs } from "@/actions/audit";
import { listStores } from "@/actions/stores";

export default function AuditClient() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStore, setSelectedStore] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState("ALL");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedResult, setSelectedResult] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logRes, storeRes] = await Promise.all([
        listAuditLogs({
          storeId: selectedStore === "ALL" ? undefined : selectedStore,
          userId: selectedUser === "ALL" ? undefined : selectedUser,
          module: selectedModule === "ALL" ? undefined : selectedModule,
          action: selectedAction === "ALL" ? undefined : selectedAction,
          result: selectedResult === "ALL" ? undefined : selectedResult,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: search || undefined,
          limit: 300,
        }),
        listStores(),
      ]);

      if (logRes.logs) setLogs(logRes.logs);
      if ((logRes as any).users) setUsers((logRes as any).users);
      if (storeRes.stores) setStores(storeRes.stores);
    } catch (err) {
      console.error("Erro ao carregar logs de auditoria:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStore, selectedUser, selectedModule, selectedAction, selectedResult, startDate, endDate, search]);

  const setQuickDayFilter = (daysBack: number | null) => {
    if (daysBack === null) {
      setStartDate("");
      setEndDate("");
      return;
    }
    const today = new Date();
    const from = new Date(Date.now() - daysBack * 86400000);
    setStartDate(from.toISOString().slice(0, 10));
    setEndDate(today.toISOString().slice(0, 10));
  };

  const exportAuditCsv = () => {
    const header = "Data/Hora;Usuario;Modulo;Operacao;Acao;Anterior;Novo;Motivo;Loja;Terminal;IP;Resultado\n";
    const rows = logs
      .map((l) =>
        [
          new Date(l.createdAt).toLocaleString("pt-BR"),
          l.user?.name || "Sistema",
          l.entity || "-",
          l.operation,
          l.action,
          (l.oldValue || "-").replace(/;/g, ",").replace(/\n/g, " "),
          (l.newValue || "-").replace(/;/g, ",").replace(/\n/g, " "),
          (l.reason || "-").replace(/;/g, ",").replace(/\n/g, " "),
          l.store?.code || "Matriz",
          l.terminal || "Web/PDV",
          l.ipAddress || "-",
          l.result,
        ].join(";")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
      <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3.5 space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por usuário, operação, valor alterado, motivo, IP ou terminal..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#e8f0fc] border border-[#c4d5ee] focus:border-indigo-500 text-gray-900 rounded-xl outline-none text-xs placeholder:text-slate-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickDayFilter(0)}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold cursor-pointer"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setQuickDayFilter(7)}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold cursor-pointer"
            >
              7 dias
            </button>
            <button
              type="button"
              onClick={() => setQuickDayFilter(null)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
            >
              Tudo
            </button>

            <div className="flex items-center gap-1.5 bg-[#e8f0fc] border border-[#c4d5ee] rounded-xl px-2.5 py-1 text-xs">
              <Calendar size={12} className="text-indigo-600" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent font-mono text-gray-800 outline-none text-[11px]"
              />
              <span className="text-slate-400">até</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent font-mono text-gray-800 outline-none text-[11px]"
              />
            </div>

            <button
              type="button"
              disabled={logs.length === 0}
              onClick={exportAuditCsv}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} /> Exportar CSV
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedModule}
            onChange={e => setSelectedModule(e.target.value)}
            className="bg-[#e8f0fc] border border-[#c4d5ee] text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="ALL">Todos os Módulos</option>
            <option value="SALE">PDV &amp; Vendas</option>
            <option value="PRODUCT">Produtos &amp; Preços</option>
            <option value="STOCK">Estoque, Balanço &amp; Perdas</option>
            <option value="FISCAL">Fiscal &amp; SEFAZ</option>
            <option value="FINANCE">Financeiro &amp; Caixa</option>
            <option value="CUSTOMER">Clientes &amp; CRM</option>
            <option value="USER">Usuários &amp; Permissões</option>
            <option value="APPROVAL">Aprovações</option>
          </select>

          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="bg-[#e8f0fc] border border-[#c4d5ee] text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="ALL">Todas as Operações</option>
            <option value="CREATE">Criação (CREATE)</option>
            <option value="UPDATE">Alteração (UPDATE)</option>
            <option value="DELETE">Exclusão (DELETE)</option>
            <option value="CANCEL">Cancelamento (CANCEL)</option>
            <option value="APPROVE">Aprovação (APPROVE)</option>
            <option value="REJECT">Rejeição (REJECT)</option>
          </select>

          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            className="bg-[#e8f0fc] border border-[#c4d5ee] text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="ALL">Todos os Usuários</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>

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
                      <td className="px-4 py-3 max-w-md">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          {log.entity && (
                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded uppercase">
                              {log.entity}
                            </span>
                          )}
                          <span className="text-xs font-bold text-indigo-700">{log.operation}</span>
                          <span className="text-[9px] font-bold bg-[#f3f7fe] text-slate-500 px-1.5 py-0.5 rounded border border-[#c4d5ee] uppercase">
                            {log.action}
                          </span>
                        </div>
                        {(log.oldValue || log.newValue) && (
                          <div className="text-[11px] text-slate-700 font-mono truncate">
                            {log.oldValue ? <span className="text-rose-700">{log.oldValue}</span> : null}
                            {log.oldValue && log.newValue ? <span className="mx-1 text-slate-400">→</span> : null}
                            {log.newValue ? <span className="text-emerald-700 font-semibold">{log.newValue}</span> : null}
                          </div>
                        )}
                        {log.reason && (
                          <span className="text-[11px] text-slate-500 line-clamp-1 italic">
                            &quot;{log.reason}&quot;
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

