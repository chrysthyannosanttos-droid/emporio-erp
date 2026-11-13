import { getCompanySupportBundle } from "@/actions/masterCompany";
import { listPlans } from "@/actions/plans";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Package,
  ShoppingCart,
  Truck,
  UserCheck,
  Monitor,
  ClipboardList,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { EditCompanyModal } from "./EditCompanyModal";
import { SupportHubClient } from "./SupportHubClient";
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

  const [{ bundle, error }, { plans }] = await Promise.all([
    getCompanySupportBundle(companyId),
    listPlans(),
  ]);

  if (!bundle) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-slate-500">{error || "Empresa não encontrada."}</p>
          <Link href="/master/companies" className="text-emerald-600 hover:underline text-sm mt-2 block">
            Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  const { company, counts } = bundle;
  const serializedPlans = (plans || []).map((p) => ({
    id: String(p.id),
    name: String(p.name),
    price: Number(p.price || 0),
  }));
  const isExpired = new Date(company.licenseExpiresAt) < new Date();

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
    TRIAL: "bg-blue-500/10 text-blue-700 border border-blue-500/20",
    SUSPENDED: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
    EXPIRED: "bg-red-500/10 text-red-700 border border-red-500/20",
    READ_ONLY: "bg-slate-500/10 text-slate-600 border border-slate-500/20",
  };

  return (
    <div className="h-full flex flex-col gap-5 overflow-auto pr-1">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/master/companies"
            className="p-2 text-slate-500 hover:text-gray-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight truncate">
                {company.name}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  statusColors[company.licenseStatus] || statusColors.EXPIRED
                }`}
              >
                {company.licenseStatus}
              </span>
              {isExpired && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                  Vencida
                </span>
              )}
              {company.slug && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Globe size={11} /> /loja/{company.slug}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              CNPJ/CPF: <span className="font-mono font-semibold text-slate-700">{company.document}</span>
              {" • "}Plano: <span className="font-semibold text-slate-700">{company.plan?.name || "Sem plano"}</span>
              {" • "}Vencimento:{" "}
              <span className={`font-semibold ${isExpired ? "text-red-600" : "text-slate-700"}`}>
                {new Date(company.licenseExpiresAt).toLocaleDateString("pt-BR")}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <EditCompanyModal company={company} plans={serializedPlans} />
          <AccessTenantButton
            companyId={company.id}
            companyName={company.name}
            label={`Acessar ${company.name}`}
          />
        </div>
      </div>

      {/* Métricas Reais do Tenant */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 shrink-0">
        {[
          { icon: <Users size={15} />, label: "Usuários", value: counts.users, sub: "colaboradores" },
          { icon: <Package size={15} />, label: "Produtos", value: counts.products, sub: `${counts.digitalMenuProducts} no cardápio` },
          { icon: <UserCheck size={15} />, label: "Clientes", value: counts.customers, sub: "cadastrados" },
          {
            icon: <Truck size={15} />,
            label: "Fornecedores",
            value: counts.suppliers,
            sub: counts.legacySaiposSuppliers > 0 ? `${counts.legacySaiposSuppliers} Saipos` : "ativos",
          },
          { icon: <ClipboardList size={15} />, label: "Entradas / Balanço", value: counts.stockEntries, sub: "StockEntry" },
          { icon: <ShoppingCart size={15} />, label: "Vendas", value: counts.sales, sub: `${counts.invoices} NF` },
          { icon: <Monitor size={15} />, label: "Terminais PDV", value: counts.pdvTerminals, sub: "pareados" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-3.5"
          >
            <div className="flex items-center justify-between text-emerald-600 mb-1.5">
              {item.icon}
              <span className="text-[10px] font-medium text-slate-400">{item.sub}</span>
            </div>
            <div className="text-xl font-bold text-gray-900 leading-tight">{item.value}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Central Autônoma de Suporte & Implantação (Checklist + 4 Abas) */}
      <SupportHubClient bundle={bundle} plans={serializedPlans} />
    </div>
  );
}
