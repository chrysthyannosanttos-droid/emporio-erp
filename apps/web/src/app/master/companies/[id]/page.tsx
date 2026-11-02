import { getCompanyDetails } from "@/actions/masterCompany";
import { listPlans } from "@/actions/plans";
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
  Store,
} from "lucide-react";
import Link from "next/link";
import { CompanyActions } from "./CompanyActions";
import { EditCompanyModal } from "./EditCompanyModal";
import { AccessTenantButton } from "@/components/AccessTenantButton";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

  const resolvedParams = await Promise.resolve(params);
  const companyId = resolvedParams?.id;

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-slate-500">ID da empresa não informado.</p>
          <Link href="/master/companies" className="text-emerald-600 hover:underline text-sm mt-2 block">
            Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  const [{ company }, { plans }] = await Promise.all([
    getCompanyDetails(companyId),
    listPlans(),
  ]);

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-slate-500">Empresa não encontrada.</p>
          <Link href="/master/companies" className="text-emerald-600 hover:underline text-sm mt-2 block">
            Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = new Date(company.licenseExpiresAt) < new Date();

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600",
    TRIAL: "bg-blue-500/10 text-blue-600",
    SUSPENDED: "bg-amber-500/10 text-amber-600",
    EXPIRED: "bg-red-500/10 text-red-600",
    READ_ONLY: "bg-slate-500/10 text-slate-500",
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
        <Link href="/master/companies" className="p-2 text-slate-500 hover:text-gray-900 hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight truncate">{company.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[company.licenseStatus] || statusColors.EXPIRED}`}>
              {company.licenseStatus}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">CNPJ/CPF: {company.document}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <EditCompanyModal company={company} plans={plans} />
          <AccessTenantButton companyId={company.id} companyName={company.name} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Info + Ações */}
        <div className="flex flex-col gap-5">
          {/* Info Card */}
          <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Informações da Licença</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Plano Atual</span>
                <span className="text-gray-900 font-medium">{company.plan?.name ?? "Sem Plano"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vencimento</span>
                <span className={`font-medium ${isExpired ? "text-red-600" : "text-gray-900"}`}>
                  {new Date(company.licenseExpiresAt).toLocaleDateString("pt-BR")}
                  {isExpired && " (Expirado)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente desde</span>
                <span className="text-gray-900">{new Date(company.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          </div>

          {/* Módulos Contratados Card */}
          <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Módulos Ativos</h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {(() => {
                  try {
                    const list = typeof company.activeModules === "string" ? JSON.parse(company.activeModules || "[]") : company.activeModules;
                    return Array.isArray(list) ? list.length : 0;
                  } catch {
                    return 0;
                  }
                })()} ativos
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(() => {
                try {
                  const list = typeof company.activeModules === "string" ? JSON.parse(company.activeModules || "[]") : company.activeModules;
                  if (!Array.isArray(list) || list.length === 0) {
                    return <span className="text-xs text-slate-400">Todos os módulos básicos liberados</span>;
                  }
                  return list.map((m: string) => (
                    <span key={m} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {m}
                    </span>
                  ));
                } catch {
                  return <span className="text-xs text-slate-400">Padrão do segmento</span>;
                }
              })()}
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
              <div key={item.label} className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-4">
                <div className="text-emerald-600 mb-2">{item.icon}</div>
                <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Usuários da Empresa */}
          <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl flex flex-col flex-1">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-500/[0.06]">
              <UserCheck size={16} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-gray-900">Usuários da Empresa</h2>
            </div>
            <div className="divide-y divide-emerald-500/[0.04]">
              {company.users.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-600">{user.role}</span>
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
