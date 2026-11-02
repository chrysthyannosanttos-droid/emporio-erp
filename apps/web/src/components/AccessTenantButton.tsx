"use client";

import { useState } from "react";
import { switchToTenant } from "@/actions/auth";
import { Store, Loader2 } from "lucide-react";

export function AccessTenantButton({
  companyId,
  companyName,
  className = "flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer",
  label = "Acessar Sistema do Cliente",
  size = 16,
}: {
  companyId?: string;
  companyName?: string;
  className?: string;
  label?: string;
  size?: number;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    try {
      const res = await switchToTenant(companyId);
      if (res?.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else if (res?.error) {
        alert(res.error);
        setLoading(false);
      }
    } catch (err: any) {
      alert("Erro ao entrar na loja: " + err.message);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
      title={companyName ? `Entrar no sistema de ${companyName}` : "Entrar na loja do cliente"}
    >
      {loading ? (
        <>
          <Loader2 size={size} className="animate-spin" />
          <span>Entrando...</span>
        </>
      ) : (
        <>
          <Store size={size} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

