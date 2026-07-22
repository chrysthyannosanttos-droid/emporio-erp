import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  LogOut,
  ChevronRight,
  Settings
} from "lucide-react";
import { logout } from "@/actions/auth";

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans bg-[#0a0e1a]">
      {/* ── Sidebar ─────────────────────────── */}
      <aside className="w-[260px] shrink-0 bg-[#06080e] flex flex-col border-r border-emerald-500/[0.08] relative z-20">
        <div className="absolute top-0 left-0 w-full h-40 bg-emerald-500/[0.04] blur-[60px] pointer-events-none" />

        <div className="px-5 py-5 flex items-center gap-3 relative z-10 border-b border-emerald-500/[0.08]">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-emerald-500/25">
            M
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight block leading-none">
              Master
            </span>
            <span className="text-[10px] text-emerald-400/60 font-medium uppercase tracking-widest">
              Super Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto relative z-10 custom-scrollbar">
          <SectionLabel>GERENCIAMENTO SaaS</SectionLabel>
          <NavItem href="/master" icon={<LayoutDashboard size={15} />} label="Visão Geral" />
          <NavItem href="/master/companies" icon={<Building2 size={15} />} label="Empresas (Tenants)" />
          <NavItem href="/master/plans" icon={<CreditCard size={15} />} label="Planos e Licenças" />
          
          <SectionLabel>SISTEMA E SEGURANÇA</SectionLabel>
          <NavItem href="/master/users" icon={<Users size={15} />} label="Super Usuários" />
          <NavItem href="/master/settings" icon={<Settings size={15} />} label="Configurações Globais" />
          <NavItem href="/master/logs" icon={<ShieldCheck size={15} />} label="Logs do Sistema" />
        </nav>

        <div className="p-3 relative z-10 border-t border-emerald-500/[0.08]">
          <div className="flex items-center gap-3 bg-emerald-500/[0.06] rounded-xl p-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-none">Admin</p>
              <p className="text-[10px] text-emerald-400/50 mt-0.5">SaaS Master</p>
            </div>
            <ChevronRight size={13} className="text-emerald-400/30 shrink-0" />
          </div>
          <form action={logout}>
            <button type="submit" className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg bg-transparent hover:bg-red-500/10 hover:text-red-400 border border-emerald-500/[0.08] transition-all text-slate-500">
              <LogOut size={14} />
              <span>Sair do Master</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0c0f1a] overflow-hidden">
        <header className="h-14 border-b border-emerald-500/[0.08] px-6 flex items-center justify-between shrink-0 bg-[#06080e]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-slate-300">Painel Master ERP SaaS</h1>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full w-full overflow-auto rounded-xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-bold text-emerald-400/40 uppercase tracking-[0.15em] pt-5 pb-1.5 px-3 first:pt-1">
      {children}
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative group ${
        active
          ? "bg-emerald-500/15 text-emerald-300 font-semibold"
          : "hover:bg-emerald-500/[0.06] text-slate-400 hover:text-slate-200"
      }`}
    >
      <div className={`shrink-0 ${active ? "text-emerald-400" : "text-slate-500 group-hover:text-emerald-400 transition-colors"}`}>
        {icon}
      </div>
      <span className="truncate">{label}</span>
    </Link>
  );
}
