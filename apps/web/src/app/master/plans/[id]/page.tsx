import { getPlan } from "@/actions/plans";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EditPlanForm } from "./EditPlanForm";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

  const resolvedParams = await Promise.resolve(params);
  const planId = resolvedParams?.id;

  if (!planId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-slate-500">ID do plano não informado.</p>
          <Link href="/master/plans" className="text-emerald-600 hover:underline text-sm mt-2 block">
            Voltar aos Planos
          </Link>
        </div>
      </div>
    );
  }

  const { plan } = await getPlan(planId);

  if (!plan) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-slate-500">Plano não encontrado.</p>
          <Link href="/master/plans" className="text-emerald-600 hover:underline text-sm mt-2 block">
            Voltar aos Planos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 max-w-2xl mx-auto overflow-auto">
      <div className="flex items-center gap-4 shrink-0">
        <Link href="/master/plans" className="p-2 text-slate-500 hover:text-gray-900 hover:bg-slate-200 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Editar Plano</h1>
          <p className="text-sm text-slate-500 mt-0.5">Modifique os parâmetros e limites do plano {plan.name}.</p>
        </div>
      </div>

      <EditPlanForm plan={plan} />
    </div>
  );
}

