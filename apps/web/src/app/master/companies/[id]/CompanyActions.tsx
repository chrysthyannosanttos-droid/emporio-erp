"use client";

import { useState } from "react";
import { updateCompanyStatus, renewCompanyLicense } from "@/actions/masterCompany";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, RefreshCw, Lock, Loader2 } from "lucide-react";

export function CompanyActions({
  companyId,
  currentStatus,
}: {
  companyId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [days, setDays] = useState("30");

  async function handleStatus(status: string) {
    setLoading(status);
    setError("");
    setSuccess("");
    const result = await updateCompanyStatus(companyId, status);
    setLoading(null);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(`Status atualizado para: ${status}`);
      router.refresh();
    }
  }

  async function handleRenew() {
    setLoading("renew");
    setError("");
    setSuccess("");
    const result = await renewCompanyLicense(companyId, Number(days));
    setLoading(null);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(`Licença renovada por +${days} dias!`);
      router.refresh();
    }
  }

  const isActive = currentStatus === "ACTIVE";
  const isSuspended = currentStatus === "SUSPENDED";

  return (
    <div className="bg-[#111626] border border-emerald-500/[0.08] rounded-xl p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-white">Ações da Licença</h2>

      {/* Renovar */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-400">Renovar por (dias)</label>
        <div className="flex gap-2">
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white outline-none"
          >
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
            <option value="180">180 dias</option>
            <option value="365">1 ano</option>
          </select>
          <button
            onClick={handleRenew}
            disabled={loading === "renew"}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            {loading === "renew" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Renovar
          </button>
        </div>
      </div>

      <div className="h-px bg-emerald-500/[0.06]" />

      {/* Status Buttons */}
      <div className="flex flex-col gap-2">
        {!isActive && (
          <button
            onClick={() => handleStatus("ACTIVE")}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-sm font-medium rounded-lg border border-emerald-500/20 transition-colors disabled:opacity-60"
          >
            {loading === "ACTIVE" ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Ativar Empresa
          </button>
        )}
        {!isSuspended && (
          <button
            onClick={() => handleStatus("SUSPENDED")}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm font-medium rounded-lg border border-amber-500/20 transition-colors disabled:opacity-60"
          >
            {loading === "SUSPENDED" ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
            Suspender
          </button>
        )}
        <button
          onClick={() => handleStatus("READ_ONLY")}
          disabled={!!loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 text-sm font-medium rounded-lg border border-slate-500/20 transition-colors disabled:opacity-60"
        >
          {loading === "READ_ONLY" ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          Modo Somente Leitura
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      {success && <p className="text-xs text-emerald-400 mt-1">{success}</p>}
    </div>
  );
}
