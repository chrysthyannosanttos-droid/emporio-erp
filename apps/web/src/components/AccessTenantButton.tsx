"use client";

import { useState } from "react";
import { switchSupportToTenant } from "@/actions/masterSupport";
import { Store, Loader2, Building2 } from "lucide-react";

export interface TenantSwitcherOption {
  id: string;
  name: string;
  licenseStatus?: string;
}

export function AccessTenantButton({
  companyId,
  companyName,
  companies,
  className = "flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer",
  label,
  size = 16,
}: {
  companyId?: string;
  companyName?: string;
  companies?: TenantSwitcherOption[];
  className?: string;
  label?: string;
  size?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (companyId) return companyId;
    if (companies && companies.length > 0) return companies[0].id;
    return "";
  });

  const isSelectorMode = !companyId && Array.isArray(companies);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetId = companyId || selectedId;
    if (!targetId) {
      alert("Selecione uma empresa cliente para acessar.");
      return;
    }

    setLoading(true);
    try {
      const res = await switchSupportToTenant(targetId);
      if (res?.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      } else if (res?.error) {
        alert(res.error);
        setLoading(false);
        return;
      }
      // Se não retornou redirectUrl nem erro, usa rota direta
      window.location.assign(`/api/auth/switch-tenant?companyId=${encodeURIComponent(targetId)}`);
    } catch {
      // Fallback infalível via Route Handler GET caso a Server Action falhe por proteção CSRF / cross-domain
      window.location.assign(`/api/auth/switch-tenant?companyId=${encodeURIComponent(targetId)}`);
    }
  };

  if (isSelectorMode) {
    const selectedCompany = companies!.find((c) => c.id === selectedId);
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <Building2 size={13} className="absolute left-2.5 text-slate-500 pointer-events-none" />
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loading || companies!.length === 0}
            aria-label="Selecionar empresa cliente para acesso de suporte"
            className="pl-7 pr-3 py-1.5 bg-white border border-emerald-500/20 rounded-lg text-xs font-medium text-gray-800 max-w-[230px] focus:outline-none focus:border-emerald-500"
          >
            {companies!.length === 0 ? (
              <option value="">Nenhuma empresa</option>
            ) : (
              companies!.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.licenseStatus && c.licenseStatus !== "ACTIVE" ? ` (${c.licenseStatus})` : ""}
                </option>
              ))
            )}
          </select>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={loading || !selectedId}
          className={className}
          title={
            selectedCompany
              ? `Entrar como suporte em ${selectedCompany.name}`
              : "Selecione um cliente para acessar"
          }
        >
          {loading ? (
            <>
              <Loader2 size={size} className="animate-spin" />
              <span>Entrando...</span>
            </>
          ) : (
            <>
              <Store size={size} />
              <span>{label || "Acessar Cliente"}</span>
            </>
          )}
        </button>
      </div>
    );
  }

  const resolvedLabel = label || (companyName ? `Acessar ${companyName}` : "Acessar Sistema do Cliente");

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || !companyId}
      className={className}
      title={companyName ? `Entrar no sistema de ${companyName}` : "Selecionar empresa cliente"}
    >
      {loading ? (
        <>
          <Loader2 size={size} className="animate-spin" />
          <span>Entrando...</span>
        </>
      ) : (
        <>
          <Store size={size} />
          <span className="truncate max-w-[220px]">{resolvedLabel}</span>
        </>
      )}
    </button>
  );
}
