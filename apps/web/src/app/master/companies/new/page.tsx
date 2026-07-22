"use client";

import { createCompany } from "@/actions/company";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, User, Lock, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await createCompany(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/master/companies");
    }
  }

  return (
    <div className="h-full flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 shrink-0">
        <Link href="/master/companies" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Nova Empresa</h1>
          <p className="text-sm text-slate-400 mt-0.5">Cadastre um novo cliente no sistema SaaS.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Dados da Empresa */}
        <div className="bg-[#111626] border border-emerald-500/[0.08] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-emerald-500/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Building2 size={16} />
            </div>
            <h2 className="text-base font-semibold text-white">Dados da Empresa</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Razão Social *</label>
              <input
                name="name"
                required
                placeholder="Ex: Empório do João LTDA"
                className="w-full px-4 py-2.5 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">CNPJ / CPF *</label>
              <input
                name="document"
                required
                placeholder="00.000.000/0001-00"
                className="w-full px-4 py-2.5 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Dados do Administrador */}
        <div className="bg-[#111626] border border-emerald-500/[0.08] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-emerald-500/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <User size={16} />
            </div>
            <h2 className="text-base font-semibold text-white">Usuário Administrador da Empresa</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome do Admin *</label>
              <input
                name="adminName"
                required
                placeholder="Ex: João Silva"
                className="w-full px-4 py-2.5 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">E-mail do Admin *</label>
              <input
                name="adminEmail"
                type="email"
                required
                placeholder="joao@empresa.com"
                className="w-full px-4 py-2.5 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Senha Inicial *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                <input
                  name="adminPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Licença */}
        <div className="bg-[#111626] border border-emerald-500/[0.08] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-emerald-500/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Calendar size={16} />
            </div>
            <h2 className="text-base font-semibold text-white">Licença</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Validade da Licença (dias)</label>
            <select
              name="licenseDays"
              className="w-full px-4 py-2.5 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="7">7 dias (Trial)</option>
              <option value="30" selected>30 dias</option>
              <option value="90">90 dias</option>
              <option value="180">180 dias (6 meses)</option>
              <option value="365">365 dias (1 ano)</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/master/companies" className="flex-1 py-3 text-center rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-700/50 font-medium transition-colors">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Criar Empresa
          </button>
        </div>
      </form>
    </div>
  );
}
