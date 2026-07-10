"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, User } from "lucide-react";
import Link from "next/link";
import { createSeller } from "@/actions/seller";

export default function NewSellerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await createSeller(formData);
    if (result.error) { setError(result.error); setLoading(false); }
    else router.push("/telesales/sellers");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <Link href="/telesales/sellers" className="p-2 bg-[#161b33] border border-indigo-500/15 rounded-xl hover:bg-[#161b33] transition-colors">
          <ArrowLeft size={20} className="text-slate-300" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Novo Vendedor</h1>
      </div>

      <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] p-8">
        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <User size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dados do Vendedor</h2>
              <p className="text-sm text-slate-400">Comissão e meta de vendas.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1.5">Nome Completo *</label>
            <input name="name" required type="text"
              className="w-full px-4 py-3 bg-[#161b33] border border-indigo-500/15 text-white rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-500"
              placeholder="Ex: João da Silva" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">Email</label>
              <input name="email" type="email"
                className="w-full px-4 py-3 bg-[#161b33] border border-indigo-500/15 text-white rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-500"
                placeholder="joao@email.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">Telefone</label>
              <input name="phone" type="text"
                className="w-full px-4 py-3 bg-[#161b33] border border-indigo-500/15 text-white rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-500"
                placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">Comissão (%)</label>
              <input name="commission" type="number" min={0} max={100} step={0.1} defaultValue={0}
                className="w-full px-4 py-3 bg-[#161b33] border border-indigo-500/15 text-white rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">Meta Mensal (R$)</label>
              <input name="goal" type="number" min={0} step={0.01}
                className="w-full px-4 py-3 bg-[#161b33] border border-indigo-500/15 text-white rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-500"
                placeholder="0.00" />
            </div>
          </div>

          <div className="pt-6 border-t border-indigo-500/[0.08] flex justify-end gap-3">
            <Link href="/telesales/sellers" className="px-6 py-3 rounded-xl font-bold text-slate-300 bg-[#161b33] border border-indigo-500/15 hover:bg-[#161b33] transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={loading}
              className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50">
              <Save size={18} />
              {loading ? "Salvando..." : "Salvar Vendedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
