import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Wallet,
  FileText,
  Settings,
  LogOut,
  Bell,
  Hammer,
  Percent,
  Receipt,
  Gift,
  Tag,
  Truck,
  ClipboardList,
  BarChart2,
  ChevronRight,
  Store,
  Landmark,
  HeartHandshake,
  AlertTriangle,
  ShieldCheck,
  Scale,
  ShoppingBag,
  Palette,
  ArrowLeftRight,
  FolderTree
} from "lucide-react";
import { AiChatbot } from "@/components/AiChatbot";
import { getTenantTheme } from "@/actions/theme";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.isSuperAdmin) {
    redirect("/login");
  }

  const { theme } = await getTenantTheme();

  const userInitials = session.name.substring(0, 2).toUpperCase();
  const userName = session.name;
  const userRole = session.role;

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans">
      {/* ── Sidebar ─────────────────────────── */}
      <aside className="w-[260px] shrink-0 bg-[#0a0e1a] flex flex-col border-r border-indigo-500/[0.08] relative z-20">
        {/* Ambient glow */}
        <div className="absolute top-0 left-0 w-full h-40 bg-indigo-500/[0.04] blur-[60px] pointer-events-none" />

        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3 relative z-10 border-b border-indigo-500/[0.08]">
          {theme?.logoPrincipal ? (
            <img src={theme.logoPrincipal} alt="Logo" className="max-h-10 object-contain w-full" />
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-black text-base shadow-lg shadow-[var(--accent)]/25">
                E
              </div>
              <div>
                <span className="text-base font-bold text-white tracking-tight block leading-none">
                  Emporio
                </span>
                <span className="text-[10px] text-indigo-400/60 font-medium uppercase tracking-widest">
                  Sistema de Gestão
                </span>
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto relative z-10 custom-scrollbar">
          
          <SectionLabel>1. FRENTE DE LOJA & VENDAS</SectionLabel>
          <NavItem href="/" icon={<LayoutDashboard size={15} />} label="Painel (Dashboard)" />
          <NavItem href="/pdv" icon={<Store size={15} />} label="Vendas (PDV)" badge="Caixa" />
          <NavItem href="/ecommerce" icon={<ShoppingBag size={15} />} label="E-commerce & Delivery" />
          <NavItem href="/crm" icon={<HeartHandshake size={15} />} label="CRM & Fidelidade" />
          <NavItem href="/returns" icon={<ArrowLeftRight size={15} />} label="Trocas & Devoluções" />

          <SectionLabel>2. ESTOQUE & SUPRIMENTOS</SectionLabel>
          <NavItem href="/stock" icon={<Package size={15} />} label="Estoque Principal" />
          <NavItem href="/mercadologico" icon={<FolderTree size={15} />} label="Estrutura Mercadológica" />
          <NavItem href="/stock/new" icon={<Tag size={15} />} label="Cadastro de Produtos" />
          <NavItem href="/suppliers" icon={<Truck size={15} />} label="Cadastro de Fornecedores" />
          <NavItem href="/purchases" icon={<ShoppingCart size={15} />} label="Pedidos de Compra" />
          <NavItem href="/fiscal/radar" icon={<FileText size={15} />} label="Radar XML (Entrada NF)" />
          <NavItem href="/logistics/collector" icon={<ClipboardList size={15} />} label="Coletor de Dados" />
          <NavItem href="/losses" icon={<AlertTriangle size={15} />} label="Perdas & Validades" />

          <SectionLabel>3. CONTROLADORIA & FINANCEIRO</SectionLabel>
          <NavItem href="/finance" icon={<Wallet size={15} />} label="Financeiro & Caixa" />
          <NavItem href="/pricing" icon={<Percent size={15} />} label="Margens & Precificação" />
          <NavItem href="/fiscal/tax-grid" icon={<FileText size={15} />} label="Grade Tributária" />
          <NavItem href="/fiscal" icon={<Landmark size={15} />} label="Fechamento Fiscal" />

          <SectionLabel>4. OPERAÇÕES & GESTÃO</SectionLabel>
          <NavItem href="/production" icon={<Hammer size={15} />} label="Ordem de Produção" />
          <NavItem href="/scales" icon={<Scale size={15} />} label="Balanças (Integração)" />
          <NavItem href="/hr" icon={<Users size={15} />} label="Recursos Humanos (RH)" />
          <NavItem href="/reports" icon={<BarChart2 size={15} />} label="Relatórios & BI" />
          <NavItem href="/master/theme" icon={<Palette size={15} />} label="Identidade Visual (Tema)" />

        </nav>

        {/* Footer */}
        <div className="p-3 relative z-10 border-t border-indigo-500/[0.08]">
          <div className="flex items-center gap-3 bg-indigo-500/[0.06] rounded-xl p-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-none">{userName}</p>
              <p className="text-[10px] text-indigo-400/50 mt-0.5">{userRole}</p>
            </div>
            <ChevronRight size={13} className="text-indigo-400/30 shrink-0" />
          </div>
          <form action={logout}>
            <button type="submit" className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg bg-transparent hover:bg-red-500/10 hover:text-red-400 border border-indigo-500/[0.08] transition-all text-slate-500">
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0c0f1a] overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-indigo-500/[0.08] px-6 flex items-center justify-between shrink-0 bg-[#0a0e1a]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span className="text-xs font-medium text-slate-500">Online</span>
            </div>
            <div className="h-4 w-px bg-indigo-500/[0.08]" />
            <select className="bg-transparent border-none text-sm font-bold text-white outline-none cursor-pointer hover:text-indigo-300 transition-colors">
              <option className="bg-[#0c0f1a]">Todas as Lojas (Rede)</option>
              <option className="bg-[#0c0f1a]">Loja 1 - Matriz Centro</option>
              <option className="bg-[#0c0f1a]">Loja 2 - Filial Zona Sul</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="h-5 w-px bg-indigo-500/[0.08]" />
            <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="text-right">
                <div className="text-xs font-semibold text-white leading-none">{userName}</div>
                <div className="text-[10px] font-medium text-indigo-400/60 mt-0.5">Caixa Aberto</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">{userInitials}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content — fills remaining space, no scroll on body */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full w-full overflow-auto rounded-xl">
            {children}
          </div>
        </div>

        {/* AI Chatbot */}
        <AiChatbot />
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-bold text-indigo-400/40 uppercase tracking-[0.15em] pt-5 pb-1.5 px-3 first:pt-1">
      {children}
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative group ${
        active
          ? "bg-indigo-500/15 text-indigo-300 font-semibold"
          : "hover:bg-indigo-500/[0.06] text-slate-400 hover:text-slate-200"
      }`}
    >
      <div
        className={`${
          active ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400/70"
        } transition-colors shrink-0`}
      >
        {icon}
      </div>
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-md leading-none">
          {badge}
        </span>
      )}
    </Link>
  );
}
