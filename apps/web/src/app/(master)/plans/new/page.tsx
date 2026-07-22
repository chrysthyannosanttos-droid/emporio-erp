"use client";

import { createPlan } from "@/actions/plans";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreditCard, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await createPlan(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/master/plans");
    }
  }

  return (
    <div className="h-full flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 shrink-0">
        <Link href="/master/plans" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Novo Plano</h1>
          <p className="text-sm text-slate-400 mt-0.5">Configure um novo plano para oferecer aos seus clientes.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="bg-[#111626] border border-emerald-500/[0.08] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-emerald-500/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CreditCard size={16} />
            </div>
            <h2 className="text-base font-semibold text-white">Detalhes do Plano</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome do Plano *</label>
              <input
                name="name"
                required
                placeholder="Ex: Starter, Pro, Premium, Enterprise"
                className="w-full px-4 py-2.5 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Descrição</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Descreva brevemente o que está incluso..."
                className="w-full px-4 py-2.5 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Preço Mensal (R$) *</label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#111626] border border-emerald-500/[0.08] rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-5 pb-4 border-b border-emerald-500/[0.06]">
            Limites do Plano
            <span className="text-xs font-normal text-slate-500 ml-2">(0 = ilimitado)</span>
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Máx. Usuários</label>
              <input
                name="maxUsers"
                type="number"
                min="0"
                defaultValue={0}
                className="w-full px-4 py-2.5 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Máx. Produtos</label>
              <input
                name="maxProducts"
                type="number"
                min="0"
                defaultValue={0}
                className="w-full px-4 py-2.5 bg-[#06080e] border border-emerald-500/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/master/plans" className="flex-1 py-3 text-center rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-700/50 font-medium transition-colors">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Criar Plano
          </button>
        </div>
      </form>
    </div>
  );
}
