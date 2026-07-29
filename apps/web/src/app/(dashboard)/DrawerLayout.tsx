"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Users, Package, Wallet, FileText,
  LogOut, Bell, Hammer, Percent, Tag, Truck, ClipboardList, BarChart2,
  ChevronRight, Store, Landmark, HeartHandshake, AlertTriangle,
  Scale, ShoppingBag, Palette, ArrowLeftRight, FolderTree,
  Utensils, ChefHat, BookOpen, Menu, X
} from "lucide-react";
import { logout } from "@/actions/auth";

interface DrawerLayoutProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
  userInitials: string;
  logoUrl?: string | null;
}

export function DrawerLayout({ children, userName, userRole, userInitials, logoUrl }: DrawerLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fechar gaveta ao pressionar Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans">

      {/* ── Overlay Escurecedor ─────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Drawer Gaveta ───────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 h-full w-[280px] bg-[#0a0e1a] flex flex-col border-r border-indigo-500/[0.10] z-40 transition-transform duration-300 ease-in-out shadow-2xl shadow-black/50 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Ambient glow */}
        <div className="absolute top-0 left-0 w-full h-40 bg-indigo-500/[0.05] blur-[60px] pointer-events-none" />

        {/* Header do Drawer: Logo + Botão Fechar */}
        <div className="px-5 py-4 flex items-center justify-between relative z-10 border-b border-indigo-500/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-h-9 object-contain" />
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-600/30">
                  E
                </div>
                <div>
                  <span className="text-base font-bold text-white tracking-tight block leading-none">Emporio</span>
                  <span className="text-[10px] text-indigo-400/60 font-medium uppercase tracking-widest">Sistema de Gestão</span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-indigo-500/10 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto relative z-10 custom-scrollbar">
          <SectionLabel>1. FRENTE DE LOJA & VENDAS</SectionLabel>
          <NavItem href="/" icon={<LayoutDashboard size={15} />} label="Painel (Dashboard)" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/pdv" icon={<Store size={15} />} label="Vendas (PDV)" badge="Caixa" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/ecommerce" icon={<ShoppingBag size={15} />} label="E-commerce & Delivery" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/crm" icon={<HeartHandshake size={15} />} label="CRM & Fidelidade" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/returns" icon={<ArrowLeftRight size={15} />} label="Trocas & Devoluções" onNavigate={() => setIsOpen(false)} />

          <SectionLabel>2. ESTOQUE & SUPRIMENTOS</SectionLabel>
          <NavItem href="/stock" icon={<Package size={15} />} label="Estoque Principal" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/mercadologico" icon={<FolderTree size={15} />} label="Estrutura Mercadológica" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/stock/new" icon={<Tag size={15} />} label="Cadastro de Produtos" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/suppliers" icon={<Truck size={15} />} label="Cadastro de Fornecedores" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/purchases" icon={<ShoppingCart size={15} />} label="Pedidos de Compra" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/fiscal/radar" icon={<FileText size={15} />} label="Radar XML (Entrada NF)" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/logistics/collector" icon={<ClipboardList size={15} />} label="Coletor de Dados" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/losses" icon={<AlertTriangle size={15} />} label="Perdas & Validades" onNavigate={() => setIsOpen(false)} />

          <SectionLabel>3. CONTROLADORIA & FINANCEIRO</SectionLabel>
          <NavItem href="/finance" icon={<Wallet size={15} />} label="Financeiro & Caixa" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/pricing" icon={<Percent size={15} />} label="Margens & Precificação" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/fiscal/tax-grid" icon={<FileText size={15} />} label="Grade Tributária" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/fiscal" icon={<Landmark size={15} />} label="Fechamento Fiscal" onNavigate={() => setIsOpen(false)} />

          <SectionLabel>4. OPERAÇÕES & GESTÃO</SectionLabel>
          <NavItem href="/production" icon={<Hammer size={15} />} label="Ordem de Produção" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/scales" icon={<Scale size={15} />} label="Balanças (Integração)" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/hr" icon={<Users size={15} />} label="Recursos Humanos (RH)" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/reports" icon={<BarChart2 size={15} />} label="Relatórios & BI" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/master/theme" icon={<Palette size={15} />} label="Identidade Visual (Tema)" onNavigate={() => setIsOpen(false)} />

          <SectionLabel>5. GASTRONOMIA & RESTAURANTE</SectionLabel>
          <NavItem href="/restaurant/pdv" icon={<Utensils size={15} />} label="PDV Touch & Mesas" badge="Food" newTab onNavigate={() => setIsOpen(false)} />
          <NavItem href="/restaurant/kds" icon={<ChefHat size={15} />} label="Tela da Cozinha (KDS)" onNavigate={() => setIsOpen(false)} />
          <NavItem href="/restaurant/recipes" icon={<BookOpen size={15} />} label="Ficha Técnica & Insumos" onNavigate={() => setIsOpen(false)} />
        </nav>

        {/* Footer do Drawer: usuário + logout */}
        <div className="p-3 relative z-10 border-t border-indigo-500/[0.08] shrink-0">
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
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg bg-transparent hover:bg-red-500/10 hover:text-red-400 border border-indigo-500/[0.08] transition-all text-slate-500"
            >
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main Content (ocupa tela inteira) ───────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0c0f1a] overflow-hidden">
        {/* Header com botão hambúrguer */}
        <header className="h-14 border-b border-indigo-500/[0.08] px-4 flex items-center justify-between shrink-0 bg-[#0a0e1a]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            {/* Botão Hambúrguer */}
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-indigo-500/10 rounded-xl transition-all border border-indigo-500/10"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>

            {/* Logo compacta no header */}
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-7 object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                    E
                  </div>
                  <span className="text-sm font-bold text-white tracking-tight hidden sm:block">Emporio ERP</span>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-indigo-500/[0.08]" />

            {/* Indicador Online + Seletor de Lojas */}
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span className="text-xs font-medium text-slate-500 hidden sm:block">Online</span>
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
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-white leading-none">{userName}</div>
                <div className="text-[10px] font-medium text-indigo-400/60 mt-0.5">Caixa Aberto</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">{userInitials}</span>
              </div>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full w-full overflow-auto rounded-xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-componentes internos ─────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-bold text-indigo-400/40 uppercase tracking-[0.15em] pt-5 pb-1.5 px-3 first:pt-1">
      {children}
    </div>
  );
}

function NavItem({
  href, icon, label, active, badge, newTab, onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  newTab?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      onClick={newTab ? undefined : onNavigate}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative group ${
        active
          ? "bg-indigo-500/15 text-indigo-300 font-semibold"
          : "hover:bg-indigo-500/[0.06] text-slate-400 hover:text-slate-200"
      }`}
    >
      <div className={`${active ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400/70"} transition-colors shrink-0`}>
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
