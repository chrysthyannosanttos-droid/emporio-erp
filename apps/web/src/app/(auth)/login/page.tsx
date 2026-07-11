"use client";

import { useState } from "react";
import { login } from "@/actions/auth";
import { Lock, User, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await login(formData);

    if (res?.success && res.redirectUrl) {
      router.push(res.redirectUrl);
    } else if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "#060818" }}>
      
      {/* Animated background blobs */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", width: 600, height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
          top: "-10%", left: "-10%",
          animation: "blob1 8s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          bottom: "-5%", right: "-5%",
          animation: "blob2 10s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: 400, height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          animation: "blob3 12s ease-in-out infinite",
        }} />
        {/* Grid pattern overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      </div>

      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(1.08); }
          66% { transform: translate(20px, -20px) scale(0.92); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .login-card { animation: fadeUp 0.6s ease both; }
        .login-field { transition: all 0.2s ease; }
        .login-field:focus-within { transform: translateY(-1px); }
        .input-glow:focus {
          outline: none;
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.2), 0 0 20px rgba(99,102,241,0.15);
        }
        .btn-shine {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%);
          background-size: 200% auto;
          transition: all 0.3s ease;
        }
        .btn-shine:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(99,102,241,0.5);
        }
        .btn-shine:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      <div className="login-card w-full max-w-md relative z-10 px-5">
        
        {/* Glass card */}
        <div style={{
          background: "rgba(15, 17, 35, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(99,102,241,0.15)",
          borderRadius: 24,
          padding: "40px 36px",
          boxShadow: "0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset",
        }}>
          
          {/* Logo & Header */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{
              width: 68, height: 68,
              borderRadius: 18,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 28, fontWeight: 900, color: "#fff",
              boxShadow: "0 8px 32px rgba(99,102,241,0.45), 0 0 0 1px rgba(255,255,255,0.1) inset",
            }}>
              E
            </div>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>
              Empório ERP
            </h1>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
              Entre com suas credenciais para acessar
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 20,
              color: "#f87171",
              fontSize: 13,
              textAlign: "center",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Username field */}
            <div className="login-field">
              <label style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Usuário / Email
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }}>
                  <User size={16} />
                </div>
                <input
                  type="text"
                  name="username"
                  required
                  autoComplete="username"
                  placeholder="cristiano ou email@empresa.com"
                  className="input-glow"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(10,13,28,0.8)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: 12,
                    paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                    fontSize: 14, color: "#e2e8f0",
                    transition: "all 0.2s",
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="login-field">
              <label style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }}>
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-glow"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(10,13,28,0.8)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: 12,
                    paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                    fontSize: 14, color: "#e2e8f0",
                    transition: "all 0.2s",
                  }}
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-shine"
              style={{
                width: "100%",
                padding: "13px 0",
                borderRadius: 12,
                border: "none",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 4,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Entrando...
                </>
              ) : (
                "Entrar no Sistema"
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{ textAlign: "center", color: "#334155", fontSize: 11, marginTop: 24, marginBottom: 0 }}>
            Empório ERP © {new Date().getFullYear()} — Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
