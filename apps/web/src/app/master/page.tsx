import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Building2, Users, Activity, ShieldOff, Clock, Plus } from "lucide-react";
import Link from "next/link";

export default async function MasterDashboardPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

  // Dados reais do banco
  const [
    totalCompanies,
    activeCompanies,
    suspendedCompanies,
    expiredCompanies,
    totalUsers,
    recentCompanies,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { licenseStatus: "ACTIVE" } }),
    prisma.company.count({ where: { licenseStatus: "SUSPENDED" } }),
    prisma.company.count({
      where: {
        OR: [
          { licenseStatus: "EXPIRED" },
          { licenseExpiresAt: { lt: new Date() } },
        ],
      },
    }),
    prisma.user.count(),
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        _count: { select: { users: true } },
      },
    }),
  ]);

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600",
    TRIAL: "bg-blue-500/10 text-blue-600",
    SUSPENDED: "bg-amber-500/10 text-amber-600",
    EXPIRED: "bg-red-500/10 text-red-600",
    READ_ONLY: "bg-slate-500/10 text-slate-500",
  };

  const metrics = [
    {
      label: "Empresas Ativas",
      value: activeCompanies,
      icon: <Building2 size={20} />,
      iconBg: "bg-emerald-500/10 text-emerald-600",
      badge: `${totalCompanies} total`,
      badgeBg: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Usuários Totais",
      value: totalUsers,
      icon: <Users size={20} />,
      iconBg: "bg-blue-500/10 text-blue-600",
      badge: "em todos os tenants",
      badgeBg: "bg-blue-500/10 text-blue-600",
    },
    {
      label: "Suspensos",
      value: suspendedCompanies,
      icon: <ShieldOff size={20} />,
      iconBg: "bg-amber-500/10 text-amber-600",
      badge: suspendedCompanies > 0 ? "atenção" : "ok",
      badgeBg: suspendedCompanies > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Licenças Expiradas",
      value: expiredCompanies,
      icon: <Clock size={20} />,
      iconBg: "bg-red-500/10 text-red-600",
      badge: expiredCompanies > 0 ? "renovar!" : "nenhuma",
      badgeBg: expiredCompanies > 0 ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600",
    },
  ];

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Visão Geral SaaS</h1>
          <p className="text-sm text-slate-500 mt-1">
            Olá, <span className="text-emerald-600 font-medium">{session.name}</span>! Gerencie toda a plataforma abaixo.
          </p>
        </div>
        <Link
          href="/master/companies/new"
          className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={15} /> Nova Empresa
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent pointer-events-none" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">{m.label}</p>
                <h3 className="text-3xl font-bold text-gray-900">{m.value}</h3>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.iconBg}`}>
                {m.icon}
              </div>
            </div>
            <div className="mt-4 relative z-10">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${m.badgeBg}`}>{m.badge}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Últimas Empresas Cadastradas */}
      <div className="flex-1 bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-500/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-900">Últimas Empresas Cadastradas</h2>
          </div>
          <Link href="/master/companies" className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors font-medium">
            Ver todas →
          </Link>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f3f7fe]/80 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuários</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentCompanies.map((company) => {
                const expired = new Date(company.licenseExpiresAt) < new Date();
                return (
                  <tr key={company.id} className="border-b border-emerald-500/[0.04] hover:bg-emerald-500/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 text-xs font-bold">
                          {company.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{company.document}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor[company.licenseStatus] ?? statusColor.EXPIRED}`}>
                        {company.licenseStatus}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${expired ? "text-red-600" : "text-slate-500"}`}>
                      {new Date(company.licenseExpiresAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{company._count.users}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/master/companies/${company.id}`} className="text-emerald-600 hover:text-emerald-700 font-medium text-xs transition-colors">
                        Gerenciar
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {recentCompanies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma empresa cadastrada ainda.{" "}
                    <Link href="/master/companies/new" className="text-emerald-600 hover:underline">
                      Criar primeira empresa
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
