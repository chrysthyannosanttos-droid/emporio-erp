import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Settings, Shield, Server, Bell, Save, CheckCircle } from "lucide-react";

export default async function MasterSettingsPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin && session?.role !== "ADMIN") redirect("/login");

  return (
    <div className="h-full flex flex-col gap-6 overflow-auto">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configurações Globais SaaS</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os parâmetros centrais do sistema Cybertech RP.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identificação do Sistema */}
        <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Server size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Identificação da Plataforma</h2>
              <p className="text-xs text-slate-500">Dados públicos do seu software SaaS</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Nome da Plataforma</label>
              <input
                type="text"
                defaultValue="Cybertech RP — PDV & Gestão"
                className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-gray-900 font-medium"
                readOnly
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Versão do Core</label>
              <input
                type="text"
                defaultValue="v2.2.0 (Turbopack + Multi-Tenant Active)"
                className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-gray-900 font-medium"
                readOnly
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Domínio Principal</label>
              <input
                type="text"
                defaultValue="cybertechapp.com.br"
                className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-gray-900 font-medium"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Políticas de Licenciamento */}
        <div className="bg-[#fbfdff] border border-emerald-500/[0.08] rounded-xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Políticas de Licença & Clientes</h2>
              <p className="text-xs text-slate-500">Padrões aplicados ao cadastrar novas empresas</p>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <div>
                <p className="font-semibold text-gray-900 text-xs">Período de Demonstração Padrão</p>
                <p className="text-[11px] text-slate-500">Tempo de teste concedido para novos clientes</p>
              </div>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded text-xs border border-emerald-200">
                30 Dias
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <div>
                <p className="font-semibold text-gray-900 text-xs">Isolamento Multi-Tenant</p>
                <p className="text-[11px] text-slate-500">Cada empresa possui segregação total de banco de dados</p>
              </div>
              <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded text-xs border border-blue-200 flex items-center gap-1">
                <CheckCircle size={13} /> Ativo
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <div>
                <p className="font-semibold text-gray-900 text-xs">Aviso de Expiração</p>
                <p className="text-[11px] text-slate-500">Alertar o cliente na tela sobre a renovação</p>
              </div>
              <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded text-xs border border-amber-200">
                7 dias antes
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

