import { listPlans } from "@/actions/plans";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { CreditCard, Plus } from "lucide-react";
import Link from "next/link";

export default async function PlansPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/login");

  const { plans } = await listPlans();

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Planos SaaS</h1>
          <p className="text-sm text-slate-400 mt-1">Configure os planos e limites para seus clientes.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/master/plans/new" className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <Plus size={16} /> Novo Plano
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-[#111626] border border-emerald-500/[0.08] rounded-xl p-6 relative group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CreditCard size={24} />
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${plan.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                {plan.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
            <p className="text-sm text-slate-400 mb-6 flex-1">{plan.description}</p>
            
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-2xl font-black text-white">R$ {Number(plan.price).toFixed(2)}</span>
              <span className="text-xs text-slate-500 font-medium">/mês</span>
            </div>
            
            <ul className="space-y-3 mb-6 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {plan.maxUsers === 0 ? 'Usuários Ilimitados' : `Até ${plan.maxUsers} Usuários`}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {plan.maxProducts === 0 ? 'Produtos Ilimitados' : `Até ${plan.maxProducts} Produtos`}
              </li>
            </ul>

            <Link href={`/master/plans/${plan.id}`} className="w-full text-center py-2.5 rounded-lg border border-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/10 transition-colors">
              Editar Plano
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
