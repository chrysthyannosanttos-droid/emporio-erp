"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";

export function ConcurrentSessionWatcher() {
  const router = useRouter();
  const [hasConflict, setHasConflict] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session-check", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.valid === false && data.reason === "CONCURRENT_LOGIN") {
          setHasConflict(true);
          if (data.userName) setUserName(data.userName);
        }
      } catch {
        // Silencioso em caso de falha de conexão temporária
      }
    };

    // Checagem periódica a cada 15 segundos
    const interval = setInterval(checkSession, 15000);

    // Checagem imediata quando o usuário volta à aba do navegador
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", checkSession);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", checkSession);
    };
  }, []);

  const handleAcknowledge = () => {
    router.replace("/login?reason=concurrent_session");
  };

  if (!hasConflict) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-7 max-w-md w-full text-center space-y-5 shadow-2xl shadow-red-950/50 animate-in zoom-in-95 duration-150">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border-2 border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert size={36} className="animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
            Acesso Simultâneo Bloqueado
          </span>
          <h2 className="text-xl font-black text-white tracking-tight">
            Sua conta foi conectada em outro dispositivo
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {userName ? (
              <>O usuário <strong className="text-white">{userName}</strong> iniciou uma nova sessão em outro navegador ou computador.</>
            ) : (
              <>Esta conta iniciou uma nova sessão em outro navegador ou computador.</>
            )}
            {" "}Para sua segurança e conformidade operacional, <strong className="text-red-300">o sistema encerrou a sessão anterior</strong> nesta máquina.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAcknowledge}
          className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-red-600/30 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <LogOut size={16} />
          <span>Ir para a Tela de Login</span>
        </button>
      </div>
    </div>
  );
}
