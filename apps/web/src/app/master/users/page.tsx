import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Users, Shield, Plus, Key } from "lucide-react";

export default async function MasterUsersPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

  const systemUsers = await prisma.systemUser.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="h-full flex flex-col gap-6 overflow-auto">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Super Usuários (Equipe Master)</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie quem tem acesso total ao Painel Master e controle dos clientes.</p>
        </div>
      </div>

      <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#f3f7fe]/80 border-b border-emerald-500/[0.08]">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">E-mail</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nível de Acesso</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/[0.04] text-sm">
            {systemUsers.map((u) => (
              <tr key={u.id} className="hover:bg-emerald-500/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{u.name}</p>
                      <p className="text-[11px] text-slate-500">ID: {u.id.split("-")[0]}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-medium">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    <Shield size={12} /> Super Admin
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    u.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {u.active ? "Ativo" : "Bloqueado"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

