import { listCompanies } from "@/actions/company";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Building2, Search, Plus } from "lucide-react";
import Link from "next/link";
import { AccessTenantButton } from "@/components/AccessTenantButton";

export default async function CompaniesPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

  const { companies } = await listCompanies();

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Empresas (Tenants)</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os clientes e licenças do seu ERP.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/master/companies/new" className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <Plus size={16} /> Nova Empresa
          </Link>
        </div>
      </div>

      <div className="flex-1 bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-emerald-500/[0.08] flex items-center gap-4 bg-[#f3f7fe]/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CNPJ..." 
              className="w-full pl-9 pr-4 py-2 bg-[#e8f0fc] border border-emerald-500/[0.08] rounded-lg text-sm text-gray-900 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <select className="px-3 py-2 bg-[#e8f0fc] border border-emerald-500/[0.08] rounded-lg text-sm text-slate-600 outline-none">
            <option value="">Todos os Planos</option>
            <option value="Starter">Starter</option>
            <option value="Pro">Pro</option>
          </select>
          <select className="px-3 py-2 bg-[#e8f0fc] border border-emerald-500/[0.08] rounded-lg text-sm text-slate-600 outline-none">
            <option value="">Todos os Status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="SUSPENDED">Suspenso</option>
            <option value="EXPIRED">Expirado</option>
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f3f7fe]/80 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Licença</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuários / Produtos</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {companies.map((company) => (
                <tr key={company.id} className="border-b border-emerald-500/[0.05] hover:bg-emerald-500/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{company.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase">ID: {company.id.split("-")[0]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{company.document}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      company.licenseStatus === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600" :
                      company.licenseStatus === "TRIAL" ? "bg-blue-500/10 text-blue-600" :
                      company.licenseStatus === "SUSPENDED" ? "bg-amber-500/10 text-amber-600" :
                      "bg-red-500/10 text-red-600"
                    }`}>
                      {company.licenseStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(company.licenseExpiresAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    <span className="text-gray-900">{company._count.users}</span> / <span className="text-gray-900">{company._count.products}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <AccessTenantButton
                        companyId={company.id}
                        companyName={company.name}
                        label="Acessar Loja"
                        size={13}
                        className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 flex items-center gap-1.5 cursor-pointer"
                      />
                      <Link href={`/master/companies/${company.id}`} className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200">
                        Gerenciar Licença
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {companies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma empresa cadastrada.
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
