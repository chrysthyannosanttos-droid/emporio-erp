import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ShieldCheck, Clock, User } from "lucide-react";

export default async function MasterLogsPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

  const auditLogs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true } },
    },
  });

  return (
    <div className="h-full flex flex-col gap-6 overflow-auto">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Logs de Atividade do Sistema</h1>
          <p className="text-sm text-slate-500 mt-1">Histórico de ações, acessos e auditoria em todos os clientes.</p>
        </div>
      </div>

      <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl overflow-hidden">
        {auditLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShieldCheck size={36} className="mx-auto text-emerald-600 mb-2 opacity-60" />
            <p className="text-sm font-medium">Nenhum evento crítico registrado recentemente.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f3f7fe]/80 border-b border-emerald-500/[0.08]">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data / Hora</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ação</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/[0.04] text-sm">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-emerald-500/[0.02] transition-colors">
                  <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{log.action}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {log.company?.name ?? "Sistema Master"}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                    {log.details ? String(log.details).slice(0, 80) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

