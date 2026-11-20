"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Download,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
} from "lucide-react";
import {
  listCompaniesAndBackupsAction,
  runCompanyBackupAction,
  runAllCompaniesEndOfDayBackupAction,
  restoreDeletedFromBackupAction,
  downloadBackupJsonAction,
  type BackupSummaryDTO,
} from "@/actions/masterBackup";

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function BackupsClient() {
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; document: string; licenseStatus: string }>>([]);
  const [backups, setBackups] = useState<BackupSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await listCompaniesAndBackupsAction();
    if (res.success) {
      setCompanies(res.companies || []);
      setBackups(res.backups || []);
    } else if (res.error) {
      setMsg({ ok: false, text: res.error });
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleRunAll = async () => {
    setBusyKey("ALL");
    setMsg(null);
    const res = await runAllCompaniesEndOfDayBackupAction();
    setBusyKey(null);
    if (res.success) {
      setMsg({
        ok: true,
        text: `Backup de fim de dia concluído para ${res.count} cliente(s)! (Completo onde não havia base; Incremental apenas das alterações onde já havia backup.)`,
      });
      await loadData();
    } else {
      setMsg({ ok: false, text: res.error || "Erro ao rodar backup em lote." });
    }
  };

  const handleRunCompany = async (companyId: string, mode: "AUTO" | "FULL" | "INCREMENTAL") => {
    setBusyKey(`${companyId}:${mode}`);
    setMsg(null);
    const res = await runCompanyBackupAction(companyId, mode);
    setBusyKey(null);
    if (res.success) {
      setMsg({
        ok: true,
        text: `Backup ${res.backupType} gerado com ${res.recordCount} registro(s) (${fmtBytes(res.sizeBytes || 0)}).`,
      });
      await loadData();
    } else {
      setMsg({ ok: false, text: res.error || "Erro ao gerar backup." });
    }
  };

  const handleRestore = async (bkp: BackupSummaryDTO) => {
    if (
      !confirm(
        `Restaurar registros apagados de "${bkp.companyName}" a partir do backup ${bkp.backupType} de ${new Date(
          bkp.createdAt
        ).toLocaleString("pt-BR")}?\n\nApenas registros que não existem mais no banco serão restaurados (dados atuais não são sobrescritos).`
      )
    ) {
      return;
    }
    setBusyKey(`restore:${bkp.id}`);
    setMsg(null);
    const res = await restoreDeletedFromBackupAction(bkp.id);
    setBusyKey(null);
    if (res.success) {
      setMsg({ ok: true, text: res.message || "Restauração concluída!" });
    } else {
      setMsg({ ok: false, text: res.error || "Erro ao restaurar backup." });
    }
  };

  const handleDownload = async (backupId: string) => {
    setBusyKey(`dl:${backupId}`);
    const res = await downloadBackupJsonAction(backupId);
    setBusyKey(null);
    if (res.success && res.json) {
      const blob = new Blob([res.json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename || "backup.json";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      setMsg({ ok: false, text: res.error || "Erro ao baixar arquivo." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full mb-2">
            <ShieldCheck size={12} /> Exclusivo Cristiano • Cofre Multi-Tenant
          </div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <Database className="text-emerald-600" size={26} />
            Backup Completo &amp; Incremental por Cliente
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            1º backup é <strong>COMPLETO</strong>. Os seguintes (fim de dia) são <strong>INCREMENTAIS</strong> — salvam apenas o que foi alterado ou apagado desde o último backup, separados por empresa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>

          <button
            type="button"
            disabled={busyKey === "ALL" || loading}
            onClick={handleRunAll}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer"
          >
            {busyKey === "ALL" ? <Loader2 size={15} className="animate-spin" /> : <Clock size={15} />}
            Executar Backup Fim de Dia (Todos)
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            msg.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {msg.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-xs font-bold text-gray-500">
          Carregando backups por cliente...
        </div>
      ) : (
        <div className="space-y-4">
          {companies.map((comp) => {
            const compBackups = backups.filter((b) => b.companyId === comp.id);
            const hasFull = compBackups.some((b) => b.backupType === "FULL");

            return (
              <div key={comp.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-gray-900">{comp.name}</h2>
                      <div className="text-xs font-mono text-gray-500">
                        {comp.document} • {compBackups.length} backup(s) salvo(s)
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!!busyKey}
                      onClick={() => handleRunCompany(comp.id, "FULL")}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Database size={13} />
                      {busyKey === `${comp.id}:FULL` ? "Gerando..." : "Backup Completo"}
                    </button>

                    <button
                      type="button"
                      disabled={!!busyKey || !hasFull}
                      onClick={() => handleRunCompany(comp.id, "INCREMENTAL")}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                      title={hasFull ? "Salva apenas alterações desde o último backup" : "Gere um Backup Completo primeiro"}
                    >
                      <Layers size={13} />
                      {busyKey === `${comp.id}:INCREMENTAL` ? "Gerando..." : "Incremental (Só Alterações)"}
                    </button>
                  </div>
                </div>

                {compBackups.length === 0 ? (
                  <div className="text-xs text-gray-400 italic py-2">
                    Nenhum backup gerado ainda para este cliente. Clique em <strong>Backup Completo</strong> para criar a base inicial.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase">
                          <th className="py-2.5 px-3">Data / Hora</th>
                          <th className="py-2.5 px-3">Tipo</th>
                          <th className="py-2.5 px-3">Registros Alterados / Salvos</th>
                          <th className="py-2.5 px-3">Tamanho</th>
                          <th className="py-2.5 px-3">Gerado por</th>
                          <th className="py-2.5 px-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {compBackups.map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50/70">
                            <td className="py-2.5 px-3 font-mono text-gray-700 whitespace-nowrap">
                              {new Date(b.createdAt).toLocaleString("pt-BR")}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                  b.backupType === "FULL"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {b.backupType === "FULL" ? "COMPLETO" : "INCREMENTAL"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-700">
                              <strong>{b.recordCount}</strong> itens{" "}
                              <span className="text-[11px] text-gray-400">
                                ({b.tablesSummary.products || 0} prod · {b.tablesSummary.sales || 0} vendas ·{" "}
                                {b.tablesSummary.customers || 0} cli · {b.tablesSummary.invoices || 0} NF)
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-gray-600">{fmtBytes(b.sizeBytes)}</td>
                            <td className="py-2.5 px-3 font-semibold text-gray-700">{b.createdBy}</td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                disabled={!!busyKey}
                                onClick={() => handleRestore(b)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="Recuperar registros apagados deste backup"
                              >
                                <RotateCcw size={12} /> Restaurar Apagados
                              </button>
                              <button
                                type="button"
                                disabled={!!busyKey}
                                onClick={() => handleDownload(b.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="Baixar JSON do backup"
                              >
                                <Download size={12} /> JSON
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
