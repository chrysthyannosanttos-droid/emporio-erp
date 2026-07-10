import { Users, Search, Plus } from "lucide-react";
import Link from "next/link";
import { getCustomers } from "@/actions/customer";

export default async function CustomersPage() {
  const { customers, error } = await getCustomers();

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Clientes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie os clientes fidelizados e acompanhe seus saldos.</p>
        </div>
        <Link href="/customers/new" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 text-sm">
          <Plus size={16} /> Novo Cliente
        </Link>
      </div>

      <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-indigo-500/[0.08] shrink-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input type="text" placeholder="Buscar por nome, CPF ou email..."
              className="w-full pl-9 pr-4 py-2 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium placeholder:text-slate-600" />
          </div>
        </div>

        {error ? (
          <div className="flex-1 flex items-center justify-center text-red-400 text-sm">{error}</div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Nome</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Documento</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Contato</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {customers?.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-600">Nenhum cliente cadastrado.</td></tr>
                ) : (
                  customers?.map(c => (
                    <tr key={c.id} className="hover:bg-indigo-500/[0.04] transition-colors">
                      <td className="px-5 py-3 font-semibold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/15 shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        {c.name}
                      </td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{c.document || "---"}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{c.email || c.phone || "---"}</td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/15 px-2.5 py-1 rounded-lg transition-colors">Editar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
