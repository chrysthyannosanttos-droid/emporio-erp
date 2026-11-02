"use client";

import { updatePlan } from "@/actions/plans";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreditCard, Loader2, Save } from "lucide-react";

export function EditPlanForm({ plan }: { plan: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const result = await updatePlan(plan.id, formData);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess("Plano atualizado com sucesso!");
      router.refresh();
      setTimeout(() => {
        router.push("/master/plans");
      }, 800);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-emerald-500/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <CreditCard size={16} />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Detalhes do Plano</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nome do Plano *</label>
            <input
              name="name"
              required
              defaultValue={plan.name}
              placeholder="Ex: Starter, Pro, Premium, Enterprise"
              className="w-full px-4 py-2.5 bg-[#e8f0fc] border border-emerald-500/[0.15] rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500 transition-colors font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descrição</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={plan.description || ""}
              placeholder="Descreva brevemente o que está incluso..."
              className="w-full px-4 py-2.5 bg-[#e8f0fc] border border-emerald-500/[0.15] rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Preço Mensal (R$) *</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={Number(plan.price)}
              placeholder="0.00"
              className="w-full px-4 py-2.5 bg-[#e8f0fc] border border-emerald-500/[0.15] rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500 transition-colors font-medium"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              name="active"
              id="active"
              defaultChecked={plan.active}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="active" className="text-xs font-semibold text-gray-800 cursor-pointer">
              Plano Ativo (disponível para contratação por novas empresas)
            </label>
          </div>
        </div>
      </div>

      <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5 pb-4 border-b border-emerald-500/[0.06]">
          Limites do Plano
          <span className="text-xs font-normal text-slate-500 ml-2">(0 = ilimitado)</span>
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Máx. Usuários</label>
            <input
              name="maxUsers"
              type="number"
              min="0"
              defaultValue={plan.maxUsers}
              className="w-full px-4 py-2.5 bg-[#e8f0fc] border border-emerald-500/[0.15] rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Máx. Produtos</label>
            <input
              name="maxProducts"
              type="number"
              min="0"
              defaultValue={plan.maxProducts}
              className="w-full px-4 py-2.5 bg-[#e8f0fc] border border-emerald-500/[0.15] rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/master/plans")}
          className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <Save size={16} /> Salvar Alterações
            </>
          )}
        </button>
      </div>
    </form>
  );
}

