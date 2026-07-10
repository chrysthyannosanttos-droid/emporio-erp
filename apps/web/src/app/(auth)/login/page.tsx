"use client";

import { useState } from "react";
import { login } from "@/actions/auth";
import { Lock, User } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--bg-base)]">
      {/* O Background é injetado pelo layout.tsx via classe global ou style caso configurado */}
      
      {/* Overlay escuro opcional para destacar o formulário da imagem de fundo */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0"></div>

      <div className="w-full max-w-md relative z-10 px-6">
        <div className="bg-[#111528]/90 backdrop-blur-md rounded-2xl border border-indigo-500/10 shadow-2xl p-8">
          
          {/* Logo */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-[var(--accent)]/30 mb-4">
              E
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Bem-vindo(a)</h1>
            <p className="text-sm text-slate-400 mt-1 text-center">Entre com suas credenciais para acessar o sistema.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Usuário / Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  name="username"
                  required
                  placeholder="admin ou cristiano"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[var(--accent)] hover:opacity-90 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-[var(--accent)]/20 mt-2 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar no Sistema"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
