"use client";

import { useState } from "react";
import { login } from "@/actions/auth";
import { Lock, User, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        backgroundImage: "url('/bg-login.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
        boxSizing: "border-box",
        padding: "30px 8% 30px 5%",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      className="login-root-container"
    >
      <style>{`
        @keyframes fadeInCard {
          from {
            opacity: 0;
            transform: translateX(30px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .login-card-anim {
          animation: fadeInCard 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .login-input {
          width: 100%;
          height: 52px;
          box-sizing: border-box;
          background: rgba(4, 15, 34, 0.72);
          border: 1px solid rgba(0, 130, 240, 0.38);
          border-radius: 12px;
          padding: 0 46px 0 46px;
          font-size: 14px;
          color: #f1f5f9;
          outline: none;
          transition: all 0.2s ease;
        }
        .login-input::placeholder {
          color: #557293;
          font-weight: 400;
        }
        .login-input:hover {
          border-color: rgba(0, 160, 255, 0.55);
          background: rgba(6, 18, 40, 0.82);
        }
        .login-input:focus {
          border-color: #0099ff;
          box-shadow: 0 0 0 3px rgba(0, 140, 255, 0.2), 0 0 16px rgba(0, 140, 255, 0.25);
          background: rgba(6, 20, 46, 0.92);
        }
        .btn-cyber-submit {
          width: 100%;
          height: 50px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(90deg, #0062f5 0%, #0084ff 100%);
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justifyContent: center;
          gap: 10px;
          transition: all 0.25s ease;
          box-shadow: 0 6px 20px rgba(0, 100, 245, 0.42);
        }
        .btn-cyber-submit:hover:not(:disabled) {
          background: linear-gradient(90deg, #0070ff 0%, #0095ff 100%);
          box-shadow: 0 8px 28px rgba(0, 120, 255, 0.6);
          transform: translateY(-1px);
        }
        .btn-cyber-submit:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 3px 12px rgba(0, 100, 245, 0.4);
        }
        .btn-cyber-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .cyber-eye-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #557293;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }
        .cyber-eye-btn:hover {
          color: #00b4ff;
        }
        @media (max-width: 1080px) {
          .login-root-container {
            justify-content: center !important;
            padding: 24px !important;
          }
        }
      `}</style>

      {/* Card de Login alinhado exatamente ao design da referência */}
      <div
        className="login-card-anim"
        style={{
          width: "100%",
          maxWidth: 460,
          background: "rgba(5, 14, 32, 0.72)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1.2px solid rgba(0, 145, 255, 0.32)",
          borderRadius: 22,
          padding: "42px 38px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.65), 0 0 32px rgba(0, 110, 255, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
          boxSizing: "border-box",
        }}
      >
        {/* Cabeçalho do Card */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p
            style={{
              color: "#94a8be",
              fontSize: 15,
              fontWeight: 400,
              margin: "0 0 6px 0",
              letterSpacing: "0.2px",
            }}
          >
            Bem-vindo(a) ao
          </p>

          {/* Logo CYBERTECH */}
          <div style={{ margin: "4px 0 10px 0" }}>
            <span
              style={{
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: "1.5px",
                fontStyle: "italic",
                display: "inline-block",
                textShadow: "0 0 24px rgba(0, 140, 255, 0.35)",
              }}
            >
              <span
                style={{
                  background: "linear-gradient(135deg, #0088ff 0%, #00c8ff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                CYBER
              </span>
              <span
                style={{
                  background: "linear-gradient(135deg, #d2dde8 0%, #ffffff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                TECH
              </span>
            </span>
          </div>

          {/* Subtítulo com linhas laterais */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 28,
                height: 1.5,
                background: "linear-gradient(90deg, transparent, #0088ff)",
                borderRadius: 2,
              }}
            />
            <span
              style={{
                color: "#7e97b2",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "2.8px",
                textTransform: "uppercase",
              }}
            >
              System and App Develop
            </span>
            <div
              style={{
                width: 28,
                height: 1.5,
                background: "linear-gradient(90deg, #0088ff, transparent)",
                borderRadius: 2,
              }}
            />
          </div>

          <p
            style={{
              color: "#6b829c",
              fontSize: 13,
              fontWeight: 400,
              margin: 0,
            }}
          >
            Faça login para continuar
          </p>
        </div>

        {/* Mensagem de Erro se houver */}
        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 20,
              color: "#fca5a5",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          {/* Campo Usuário */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 15,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#557293",
                display: "flex",
                alignItems: "center",
                pointerEvents: "none",
              }}
            >
              <User size={19} />
            </div>
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="Usuário"
              className="login-input"
            />
          </div>

          {/* Campo Senha */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 15,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#557293",
                display: "flex",
                alignItems: "center",
                pointerEvents: "none",
              }}
            >
              <Lock size={19} />
            </div>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Senha"
              className="login-input"
            />
            <button
              type="button"
              className="cyber-eye-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label="Alternar visibilidade da senha"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={loading}
            className="btn-cyber-submit"
            style={{ marginTop: 6 }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <ArrowRight size={18} />
                <span>Entrar</span>
              </>
            )}
          </button>
        </form>

        {/* Rodapé com linha decorativa */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginTop: 34,
          }}
        >
          <div
            style={{
              width: 32,
              height: 1,
              background: "linear-gradient(90deg, transparent, #284462)",
            }}
          />
          <span
            style={{
              color: "#4e6a88",
              fontSize: 11.5,
              fontWeight: 400,
              letterSpacing: "0.2px",
            }}
          >
            Tecnologia que impulsiona o seu negócio
          </span>
          <div
            style={{
              width: 32,
              height: 1,
              background: "linear-gradient(90deg, #284462, transparent)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
