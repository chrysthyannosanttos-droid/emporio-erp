import { getCompanyDetails } from "@/actions/masterCompany";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Users,
  Package,
  ShoppingCart,
  FileText,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { CompanyActions } from "./CompanyActions";

export default async function CompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/login");

  const { company } = await getCompanyDetails(params.id);

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-slate-400">Empresa não encontrada.</p>
          <Link href="/master/companies" className="text-emerald-400 hover:underline text-sm mt-2 block">
            Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = new Date(company.licenseExpiresAt) < new Date();

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-400",
    TRIAL: "bg-blue-500/10 text-blue-400",
    SUSPENDED: "bg-amber-500/10 text-amber-400",
    EXPIRED: "bg-red-500/10 text-red-400",
    READ_ONLY: "bg-slate-500/10 text-slate-400",
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
        <Link href="/master/companies" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight truncate">{company.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[company.licenseStatus] || statusColors.EXPIRED}`}>
              {company.licenseStatus}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">CNPJ/CPF: {company.document}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Info + Ações */}
        <div className="flex flex-col gap-5">
          {/* Info Card */}
          <div className="bg-[#111626] border border-emerald-500/[0.08] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Informações da Licença</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Plano Atual</span>
                <span className="text-white font-medium">{company.plan?.name ?? "Sem Plano"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vencimento</span>
                <span className={`font-medium ${isExpired ? "text-red-400" : "text-white"}`}>
                  {new Date(company.licenseExpiresAt).toLocaleDateString("pt-BR")}
                  {isExpired && " (Expirado)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente desde</span>
                <span className="text-white">{new Date(company.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <CompanyActions companyId={company.id} currentStatus={company.licenseStatus} />
        </div>

        {/* Coluna Direita: Métricas + Usuários */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Users size={16} />, label: "Usuários", value: company._count.users },
              { icon: <Package size={16} />, label: "Produtos", value: company._count.products },
              { icon: <ShoppingCart size={16} />, label: "Vendas", value: company._count.sales },
              { icon: <FileText size={16} />, label: "NF-e", value: company._count.invoices },
            ].map((item) => (
              <div key={item.label} className="bg-[#111626] border border-emerald-500/[0.08] rounded-xl p-4">
                <div className="text-emerald-400 mb-2">{item.icon}</div>
                <div className="text-2xl font-bold text-white">{item.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Usuários da Empresa */}
          <div className="bg-[#111626] border border-emerald-500/[0.08] rounded-xl flex flex-col flex-1">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-500/[0.06]">
              <UserCheck size={16} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Usuários da Empresa</h2>
            </div>
            <div className="divide-y divide-emerald-500/[0.04]">
              {company.users.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">{user.role}</span>
                    <span className={`w-2 h-2 rounded-full ${user.active ? "bg-emerald-500" : "bg-red-500"}`} />
                  </div>
                </div>
              ))}
              {company.users.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">Nenhum usuário cadastrado.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
