"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Users, Package, Wallet, FileText,
  LogOut, Bell, Hammer, Percent, Tag, Truck, ClipboardList, BarChart2,
  ChevronRight, Store, Landmark, HeartHandshake, AlertTriangle,
  Scale, ShoppingBag, Palette, ArrowLeftRight, FolderTree,
  Utensils, ChefHat, BookOpen, Menu, X, ShieldAlert, ShieldCheck,
  Sliders, Settings, Search, Calendar, HelpCircle, Hexagon,
  CreditCard, TrendingDown, TrendingUp, Building2, Monitor,
  Plus, Pin, PinOff, Sparkles
} from "lucide-react";
import { logout } from "@/actions/auth";
import { WhatsNewModal } from "@/components/WhatsNewModal";

interface DrawerLayoutProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
  userInitials: string;
  logoUrl?: string | null;
  activeModules?: string[];
  operationTypes?: string[];
}

interface WorkspaceTab {
  id: string;
  href: string;
  title: string;
  iconName: string;
}

const ROUTE_DEFINITIONS: Record<string, { title: string; iconName: string }> = {
  "/": { title: "Dashboard", iconName: "LayoutDashboard" },
  "/pdv": { title: "PDV Caixa", iconName: "Store" },
  "/distribution/orders": { title: "Pedidos", iconName: "ClipboardList" },
  "/customers": { title: "Clientes", iconName: "Users" },
  "/stock": { title: "Estoque", iconName: "Landmark" },
  "/stock/new": { title: "Cadastrar Produto", iconName: "Package" },
  "/suppliers": { title: "Fornecedores", iconName: "Truck" },
  "/mercadologico": { title: "Categorias", iconName: "Tag" },
  "/restaurant/pdv": { title: "PDV Mesas", iconName: "Utensils" },
  "/restaurant/kds": { title: "Cozinha (KDS)", iconName: "ChefHat" },
  "/restaurant/recipes": { title: "Fichas Técnicas", iconName: "BookOpen" },
  "/finance": { title: "Financeiro", iconName: "Wallet" },
  "/reports": { title: "Relatórios & BI", iconName: "FileText" },
  "/settings/terminals": { title: "Terminais PDV", iconName: "Monitor" },
  "/settings/modules": { title: "Lojas & Módulos", iconName: "Building2" },
  "/settings/users": { title: "Usuários", iconName: "Users" },
  "/settings": { title: "Configurações", iconName: "Settings" },
  "/pricing": { title: "Tabela de Preços", iconName: "Percent" },
  "/promotions": { title: "Promoções", iconName: "Tag" },
  "/audit": { title: "Log Auditoria", iconName: "ShieldAlert" },
  "/returns": { title: "Devoluções", iconName: "ArrowLeftRight" },
  "/factory": { title: "Produção Industrial", iconName: "Hammer" },
};

function getRouteMeta(path: string): { title: string; iconName: string } {
  if (ROUTE_DEFINITIONS[path]) return ROUTE_DEFINITIONS[path];

  // Tratar subrotas
  for (const [key, val] of Object.entries(ROUTE_DEFINITIONS)) {
    if (key !== "/" && path.startsWith(key)) {
      return val;
    }
  }

  // Título amigável padrão baseado no path
  const segments = path.split("/").filter(Boolean);
  const rawTitle = segments[segments.length - 1] || "Página";
  const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).replace(/-/g, " ");
  return { title: formattedTitle, iconName: "FileText" };
}

function renderTabIcon(iconName: string, size = 14) {
  switch (iconName) {
    case "LayoutDashboard": return <LayoutDashboard size={size} />;
    case "Store": return <Store size={size} />;
    case "ClipboardList": return <ClipboardList size={size} />;
    case "Users": return <Users size={size} />;
    case "Landmark": return <Landmark size={size} />;
    case "Package": return <Package size={size} />;
    case "Truck": return <Truck size={size} />;
    case "Tag": return <Tag size={size} />;
    case "Utensils": return <Utensils size={size} />;
    case "ChefHat": return <ChefHat size={size} />;
    case "BookOpen": return <BookOpen size={size} />;
    case "Wallet": return <Wallet size={size} />;
    case "FileText": return <FileText size={size} />;
    case "Monitor": return <Monitor size={size} />;
    case "Building2": return <Building2 size={size} />;
    case "Settings": return <Settings size={size} />;
    case "Percent": return <Percent size={size} />;
    case "ShieldAlert": return <ShieldAlert size={size} />;
    case "ArrowLeftRight": return <ArrowLeftRight size={size} />;
    case "Hammer": return <Hammer size={size} />;
    default: return <FileText size={size} />;
  }
}

export function DrawerLayout({
  children,
  userName,
  userRole,
  userInitials,
  logoUrl,
  activeModules = [],
  operationTypes = ["RETAIL"],
}: DrawerLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Gerenciamento das abas
  const [tabs, setTabs] = useState<WorkspaceTab[]>([
    { id: "/", href: "/", title: "Dashboard", iconName: "LayoutDashboard" }
  ]);

  const hasModule = (key: string) => activeModules.length === 0 || activeModules.includes(key);

  const currentDateFormatted = new Intl.DateTimeFormat('pt-BR', { 
    day: '2-digit', month: 'long', year: 'numeric' 
  }).format(new Date());

  // Carregar preferências e abas salvas
  useEffect(() => {
    try {
      const savedPin = localStorage.getItem("erp_drawer_pinned");
      if (savedPin === "true") setIsPinned(true);

      const savedTabs = localStorage.getItem("erp_workspace_tabs");
      if (savedTabs) {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(parsed);
        }
      }
    } catch {}
  }, []);

  // Adicionar aba ativa se ela ainda não existir
  useEffect(() => {
    if (!pathname) return;

    setTabs((prev) => {
      const exists = prev.some((t) => t.href === pathname);
      if (exists) return prev;

      const meta = getRouteMeta(pathname);
      const newTabs = [...prev, { id: pathname, href: pathname, title: meta.title, iconName: meta.iconName }];
      try {
        localStorage.setItem("erp_workspace_tabs", JSON.stringify(newTabs));
      } catch {}
      return newTabs;
    });
  }, [pathname]);

  // Tecla Escape para fechar gaveta
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPinned) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, isPinned]);

  const handleCloseTab = (hrefToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;

    const newTabs = tabs.filter((t) => t.href !== hrefToClose);
    setTabs(newTabs);
    try {
      localStorage.setItem("erp_workspace_tabs", JSON.stringify(newTabs));
    } catch {}

    if (pathname === hrefToClose) {
      const lastTab = newTabs[newTabs.length - 1];
      router.push(lastTab.href);
    }
  };

  const handleCloseOthers = () => {
    const currentMeta = getRouteMeta(pathname);
    const kept = [{ id: pathname, href: pathname, title: currentMeta.title, iconName: currentMeta.iconName }];
    setTabs(kept);
    try {
      localStorage.setItem("erp_workspace_tabs", JSON.stringify(kept));
    } catch {}
  };

  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    if (!next) setIsOpen(false);
    try {
      localStorage.setItem("erp_drawer_pinned", String(next));
    } catch {}
  };

  const handleNavigate = () => {
    if (!isPinned) {
      setIsOpen(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0a0d18] border-r border-indigo-500/10 text-slate-300 w-[270px] select-none">
      {/* Brand Header & Fechar Gaveta */}
      <div className="p-4 flex items-center justify-between border-b border-indigo-500/10 shrink-0">
        <Link href="/" onClick={handleNavigate} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <Hexagon className="w-5 h-5 fill-indigo-400/20 text-indigo-200" />
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight block leading-tight">Cybertech RP</span>
            <span className="text-[10px] text-indigo-400/70 font-medium">Menu Principal</span>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={togglePin}
            title={isPinned ? "Desafixar menu (usar como gaveta)" : "Fixar menu lateral"}
            className={`hidden md:flex p-1.5 rounded-lg transition-colors text-xs ${
              isPinned ? "text-indigo-400 bg-indigo-500/15" : "text-slate-400 hover:text-white hover:bg-indigo-500/10"
            }`}
          >
            {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            title="Fechar menu gaveta (Esc)"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-indigo-500/10 transition-colors"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto custom-scrollbar">
        {/* Main Dashboard item */}
        <div>
          <NavItem 
            href="/" 
            icon={<LayoutDashboard size={16} />} 
            label="Dashboard" 
            active={pathname === "/"} 
            onNavigate={handleNavigate} 
          />
        </div>

        {/* VENDAS */}
        <div className="space-y-0.5">
          <SectionLabel>VENDAS</SectionLabel>
          {hasModule("PDV") && <NavItem href="/pdv" icon={<Store size={16} />} label="PDV Caixa" active={pathname === "/pdv"} onNavigate={handleNavigate} />}
          <NavItem href="/distribution/orders" icon={<ClipboardList size={16} />} label="Pedidos" active={pathname?.startsWith("/distribution/orders")} onNavigate={handleNavigate} />
          <NavItem href="/customers" icon={<Users size={16} />} label="Clientes" active={pathname === "/customers"} onNavigate={handleNavigate} />
        </div>

        {/* PRODUTOS */}
        <div className="space-y-0.5">
          <SectionLabel>PRODUTOS</SectionLabel>
          {hasModule("STOCK") && <NavItem href="/stock" icon={<Landmark size={16} />} label="Estoque & Produtos" active={pathname === "/stock"} onNavigate={handleNavigate} />}
          <NavItem href="/stock/new" icon={<Package size={16} />} label="Cadastrar Produto" active={pathname === "/stock/new"} onNavigate={handleNavigate} />
          <NavItem href="/suppliers" icon={<Truck size={16} />} label="Fornecedores" active={pathname === "/suppliers"} onNavigate={handleNavigate} />
          {hasModule("MERCADOLOGICO") && <NavItem href="/mercadologico" icon={<Tag size={16} />} label="Categorias" active={pathname === "/mercadologico"} onNavigate={handleNavigate} />}
        </div>

        {/* GASTRONOMIA (se habilitado) */}
        {(hasModule("RESTAURANT") || hasModule("RECIPES")) && (
          <div className="space-y-0.5">
            <SectionLabel>RESTAURANTE</SectionLabel>
            {hasModule("RESTAURANT") && <NavItem href="/restaurant/pdv" icon={<Utensils size={16} />} label="PDV Touch & Mesas" active={pathname?.startsWith("/restaurant/pdv")} onNavigate={handleNavigate} />}
            {hasModule("RESTAURANT") && <NavItem href="/restaurant/kds" icon={<ChefHat size={16} />} label="Cozinha (KDS)" active={pathname?.startsWith("/restaurant/kds")} onNavigate={handleNavigate} />}
            {hasModule("RECIPES") && <NavItem href="/restaurant/recipes" icon={<BookOpen size={16} />} label="Fichas Técnicas" active={pathname?.startsWith("/restaurant/recipes")} onNavigate={handleNavigate} />}
          </div>
        )}

        {/* FINANCEIRO */}
        <div className="space-y-0.5">
          <SectionLabel>FINANCEIRO</SectionLabel>
          {hasModule("FINANCE") && <NavItem href="/finance" icon={<Wallet size={16} />} label="Financeiro Completo" active={pathname === "/finance"} onNavigate={handleNavigate} />}
          {hasModule("REPORTS") && <NavItem href="/reports" icon={<FileText size={16} />} label="Relatórios & BI" active={pathname === "/reports"} onNavigate={handleNavigate} />}
        </div>

        {/* CONFIGURAÇÕES */}
        <div className="space-y-0.5">
          <SectionLabel>CONFIGURAÇÕES</SectionLabel>
          <NavItem href="/settings/terminals" icon={<Monitor size={16} />} label="Terminais PDV" active={pathname === "/settings/terminals"} onNavigate={handleNavigate} />
          <NavItem href="/settings/modules" icon={<Building2 size={16} />} label="Lojas & Módulos" active={pathname === "/settings/modules"} onNavigate={handleNavigate} />
          <NavItem href="/settings/users" icon={<Users size={16} />} label="Usuários" active={pathname === "/settings/users"} onNavigate={handleNavigate} />
          <NavItem href="/settings" icon={<Settings size={16} />} label="Configurações Gerais" active={pathname === "/settings"} onNavigate={handleNavigate} />
        </div>
      </nav>

      {/* Support Card & Logout at bottom */}
      <div className="p-3 border-t border-indigo-500/10 shrink-0 space-y-2">
        <button
          onClick={() => {
            setIsOpen(false);
            setShowWhatsNew(true);
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-all"
        >
          <Sparkles size={14} className="text-amber-400" />
          <span>O que mudou? (Novidades)</span>
        </button>

        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 hover:text-rose-400 bg-[#111628] hover:bg-rose-500/10 border border-indigo-500/10 hover:border-rose-500/20 rounded-xl transition-all"
          >
            <LogOut size={14} />
            <span>Sair / Trocar Usuário</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080b14] text-slate-100 font-sans">
      {/* Backdrop da Gaveta (quando aberta e não fixada) */}
      {isOpen && !isPinned && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Gaveta (Deslizante da esquerda) */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen || isPinned ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Área Principal de Conteúdo */}
      <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#080b14] transition-all duration-300 ${isPinned ? "md:pl-[270px]" : ""}`}>
        {/* Top Header Bar */}
        <header className="h-14 border-b border-indigo-500/10 px-4 md:px-6 flex items-center justify-between shrink-0 bg-[#0a0d18]/90 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            {/* Botão Hambúrguer para Abrir o Menu Gaveta */}
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-indigo-500/15 border border-indigo-500/20 transition-all flex items-center gap-2 group"
              title="Abrir Menu Gaveta"
            >
              <Menu size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-slate-300 hidden sm:inline">Menu</span>
            </button>

            {/* Logo compacta / Identidade */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-indigo-600/30">
                <Hexagon size={16} className="fill-indigo-400/30 text-indigo-200" />
              </div>
              <span className="text-sm font-bold text-white tracking-tight hidden lg:block">Cybertech RP</span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Busca Rápida */}
            <div className="hidden lg:flex items-center gap-2 bg-[#101526] border border-indigo-500/10 text-slate-400 px-3 py-1.5 rounded-xl text-xs w-60 focus-within:border-indigo-500/40 transition-all">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar no sistema..."
                className="bg-transparent text-white outline-none w-full text-xs placeholder:text-slate-500"
              />
            </div>

            {/* Seletor de Loja */}
            <div className="hidden sm:flex items-center gap-1.5 bg-[#101526] border border-indigo-500/10 px-2.5 py-1.5 rounded-xl text-xs text-white">
              <Store size={13} className="text-indigo-400" />
              <select className="bg-transparent border-none text-white text-xs font-semibold outline-none cursor-pointer">
                <option className="bg-[#101526]">Todas as Lojas</option>
                <option className="bg-[#101526]">Matriz Centro</option>
              </select>
            </div>

            {/* Data Atual */}
            <div className="hidden xl:flex items-center gap-1.5 bg-[#101526] border border-indigo-500/10 px-2.5 py-1.5 rounded-xl text-xs text-slate-300">
              <Calendar size={13} className="text-indigo-400" />
              <span className="text-[11px]">{currentDateFormatted}</span>
            </div>

            {/* Botão de Novidades / O que mudou */}
            <button
              onClick={() => setShowWhatsNew(true)}
              title="Ver novidades e o que mudou nesta versão do sistema"
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/15 to-purple-500/10 hover:from-amber-500/20 hover:to-indigo-500/25 text-amber-300 hover:text-white border border-amber-500/25 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm group"
            >
              <Sparkles size={13} className="text-amber-400 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">Novidades</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded font-mono">v2.2</span>
            </button>

            {/* Perfil & Logout */}
            <div className="flex items-center gap-2.5 bg-[#101526] border border-indigo-500/10 px-2.5 py-1 rounded-xl">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white leading-none">{userName}</p>
                <p className="text-[9px] text-emerald-400 font-medium flex items-center justify-end gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                </p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                {userInitials}
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  title="Sair do Sistema"
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <LogOut size={14} />
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* ─── BARRA DE ABAS DE TAREFAS (MULTI-TAB WORKSPACE) ────────────── */}
        <div className="bg-[#0b0f1d] border-b border-indigo-500/10 px-3 py-1.5 shrink-0 flex items-center justify-between gap-2 overflow-x-auto select-none custom-scrollbar">
          {/* Lista de Abas Abertas */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-1 min-w-0">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <div
                  key={tab.href}
                  onClick={() => router.push(tab.href)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-indigo-600/25 border-indigo-500/50 text-white shadow-sm shadow-indigo-600/20"
                      : "bg-[#11162a] border-indigo-500/10 text-slate-400 hover:text-slate-200 hover:border-indigo-500/25 hover:bg-[#151b33]"
                  }`}
                >
                  <span className={isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"}>
                    {renderTabIcon(tab.iconName, 13)}
                  </span>
                  <span className="truncate max-w-[150px]">{tab.title}</span>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(tab.href, e)}
                      title="Fechar aba"
                      className="p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 transition-colors opacity-60 group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Botão + para abrir o menu e iniciar nova tarefa */}
            <button
              onClick={() => setIsOpen(true)}
              title="Abrir nova tarefa no Menu Gaveta"
              className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/15 border border-indigo-500/15 hover:border-indigo-500/35 rounded-lg transition-all flex items-center gap-1 shrink-0"
            >
              <Plus size={14} />
              <span className="text-[11px] font-medium hidden sm:inline">Nova Tarefa</span>
            </button>
          </div>

          {/* Opção Fechar Outras Abas */}
          {tabs.length > 1 && (
            <div className="shrink-0 flex items-center pl-2 border-l border-indigo-500/10">
              <button
                onClick={handleCloseOthers}
                title="Fechar todas as abas exceto a atual"
                className="text-[10px] font-medium text-slate-500 hover:text-slate-300 px-2 py-1 hover:bg-indigo-500/10 rounded transition-colors"
              >
                Fechar outras
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {children}

          {/* Global Footer */}
          <footer className="pt-6 pb-2 border-t border-indigo-500/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>Cybertech RP — Sistema de Gestão</span>
            <span>© 2026 Todos os direitos reservados v2.1.0</span>
          </footer>
        </main>
      </div>

      {/* Modal de Boas-Vindas e Atualizações do Sistema */}
      <WhatsNewModal
        userName={userName}
        forceOpen={showWhatsNew}
        onClose={() => setShowWhatsNew(false)}
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 pt-2.5 pb-1">
      {children}
    </div>
  );
}

function NavItem({
  href, icon, label, active, onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
        active
          ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30"
          : "text-slate-400 hover:text-white hover:bg-indigo-500/10"
      }`}
    >
      <div className={`${active ? "text-white" : "text-slate-400"} shrink-0`}>
        {icon}
      </div>
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}
