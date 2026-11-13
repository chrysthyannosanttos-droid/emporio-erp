import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  LogOut,
  ChevronRight,
  Settings,
  Headphones,
} from "lucide-react";
import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { logout } from "@/actions/auth";
import { AccessTenantButton } from "@/components/AccessTenantButton";

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  let companies: Array<{ id: string; name: string; licenseStatus: string }> = [];
  try {
    companies = await prisma.company.findMany({
      select: { id: true, name: true, licenseStatus: true },
      orderBy: { name: "asc" },
    });
  } catch {
    companies = [];
  }

  const userName = session?.name || "Suporte Master";
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "SM";
  const userRoleLabel =
    session?.role === "SUPPORT"
      ? "Suporte Técnico"
      : session?.role === "ADMIN"
        ? "Admin Master"
        : "Super Admin";

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans bg-[#f3f7fe]">
      {/* ── Sidebar ─────────────────────────── */}
      <aside className="w-[260px] shrink-0 bg-[#e8f0fc] flex flex-col border-r border-emerald-500/[0.08] relative z-20">
        <div className="absolute top-0 left-0 w-full h-40 bg-emerald-500/[0.04] blur-[60px] pointer-events-none" />

        <div className="px-5 py-5 flex items-center gap-3 relative z-10 border-b border-emerald-500/[0.08]">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-emerald-500/25">
            M
          </div>
          <div>
            <span className="text-base font-bold text-gray-900 tracking-tight block leading-none">
              Portal Master
            </span>
            <span className="text-[10px] text-emerald-700/70 font-semibold uppercase tracking-widest mt-1 block">
              Suporte & SaaS
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto relative z-10 custom-scrollbar">
          <SectionLabel>GERENCIAMENTO SaaS</SectionLabel>
          <NavItem href="/master" icon={<LayoutDashboard size={15} />} label="Visão Geral" />
          <NavItem href="/master/companies" icon={<Building2 size={15} />} label="Empresas & Implantação" />
          <NavItem href="/master/plans" icon={<CreditCard size={15} />} label="Planos e Licenças" />

          <SectionLabel>EQUIPE & SEGURANÇA</SectionLabel>
          <NavItem href="/master/users" icon={<Users size={15} />} label="Equipe Master & Suporte" />
          <NavItem href="/master/settings" icon={<Settings size={15} />} label="Configurações Globais" />
          <NavItem href="/master/logs" icon={<ShieldCheck size={15} />} label="Logs do Sistema" />
        </nav>

        <div className="p-3 relative z-10 border-t border-emerald-500/[0.08]">
          <div className="flex items-center gap-3 bg-emerald-500/[0.06] rounded-xl p-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate leading-none">{userName}</p>
              <p className="text-[10px] text-emerald-700/70 mt-0.5 font-medium">{userRoleLabel}</p>
            </div>
            <ChevronRight size={13} className="text-emerald-600/30 shrink-0" />
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg bg-transparent hover:bg-red-500/10 hover:text-red-600 border border-emerald-500/[0.08] transition-all text-slate-500 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sair do Portal</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f3f7fe] overflow-hidden">
        <header className="h-14 border-b border-emerald-500/[0.08] px-6 flex items-center justify-between gap-4 shrink-0 bg-[#e8f0fc]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
              <Headphones size={15} />
            </div>
            <h1 className="text-sm font-bold text-slate-800 truncate">
              Portal Master &amp; Suporte Técnico
            </h1>
            <span className="hidden sm:inline-flex text-[11px] bg-emerald-500/10 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
              Cybertech SaaS Core
            </span>
          </div>

          <AccessTenantButton
            companies={companies}
            label="Acessar Cliente"
            size={14}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
          />
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
    <div className="text-[9px] font-bold text-emerald-600/40 uppercase tracking-[0.15em] pt-5 pb-1.5 px-3 first:pt-1">
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
          ? "bg-emerald-500/15 text-emerald-700 font-semibold"
          : "hover:bg-emerald-500/[0.06] text-slate-500 hover:text-slate-700"
      }`}
    >
      <div
        className={`shrink-0 ${
          active ? "text-emerald-600" : "text-slate-500 group-hover:text-emerald-600 transition-colors"
        }`}
      >
        {icon}
      </div>
      <span className="truncate">{label}</span>
    </Link>
  );
}
