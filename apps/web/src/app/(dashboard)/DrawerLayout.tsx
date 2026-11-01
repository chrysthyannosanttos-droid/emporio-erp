"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Users, Package, Wallet, FileText,
  LogOut, Bell, Hammer, Percent, Tag, Truck, ClipboardList, BarChart2,
  ChevronRight, Store, Landmark, HeartHandshake, AlertTriangle,
  Scale, ShoppingBag, Palette, ArrowLeftRight, FolderTree,
  Utensils, ChefHat, BookOpen, Menu, X, ShieldAlert, ShieldCheck, Shield,
  Sliders, Settings, Search, Calendar, HelpCircle, Hexagon,
  CreditCard, TrendingDown, TrendingUp, Building2, Monitor,
  Plus, Pin, PinOff, Sparkles, Receipt, RefreshCw, Globe, Smartphone
} from "lucide-react";
import { logout } from "@/actions/auth";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { AutoInstallLogo } from "@/components/AutoInstallLogo";
import { CybertechBrand } from "@/components/CybertechBrand";
import { ConcurrentSessionWatcher } from "@/components/ConcurrentSessionWatcher";

interface DrawerLayoutProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
  userInitials: string;
  logoUrl?: string | null;
  activeModules?: string[];
  operationTypes?: string[];
  canMobilePdv?: boolean;
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
  "/pdv/mobile": { title: "PDV Mobile", iconName: "Smartphone" },
  "/contracts": { title: "Contratos de Venda", iconName: "FileText" },
  "/distribution/orders": { title: "Pedidos", iconName: "ClipboardList" },
  "/customers": { title: "Clientes", iconName: "Users" },
  "/invoices": { title: "Entrada de Notas", iconName: "Receipt" },
  "/labels": { title: "Etiquetas", iconName: "Tag" },
  "/scales": { title: "Balanças (Toledo MGV6)", iconName: "Scale" },
  "/expirations": { title: "Validades", iconName: "Calendar" },
  "/stock": { title: "Estoque", iconName: "Landmark" },
  "/stock/new": { title: "Cadastrar Produto", iconName: "Package" },
  "/purchases": { title: "Pedidos de Compra & Cotações", iconName: "ClipboardList" },
  "/suppliers": { title: "Fornecedores", iconName: "Truck" },
  "/mercadologico": { title: "Categorias", iconName: "Tag" },
  "/restaurant/pdv": { title: "PDV Mesas", iconName: "Utensils" },
  "/restaurant/kds": { title: "Cozinha (KDS)", iconName: "ChefHat" },
  "/restaurant/recipes": { title: "Fichas Técnicas", iconName: "BookOpen" },
  "/finance/reconciliation": { title: "Conciliação Bancária", iconName: "Landmark" },
  "/finance": { title: "Financeiro", iconName: "Wallet" },
  "/reports": { title: "Relatórios & BI", iconName: "FileText" },
  "/settings/terminals": { title: "Terminais PDV", iconName: "Monitor" },
  "/settings/modules": { title: "Lojas & Módulos", iconName: "Building2" },
  "/settings/users": { title: "Usuários", iconName: "Users" },
  "/settings/roles": { title: "Perfis & Setores", iconName: "Shield" },
  "/settings/integrations": { title: "Integrações & Conexão Externa", iconName: "Globe" },
  "/settings": { title: "Configurações", iconName: "Settings" },
  "/migration": { title: "Migração Saipos", iconName: "RefreshCw" },
  "/pricing": { title: "Tabela de Preços", iconName: "Percent" },
  "/promotions": { title: "Promoções", iconName: "Tag" },
  "/audit": { title: "Log Auditoria", iconName: "ShieldAlert" },
  "/returns": { title: "Devoluções", iconName: "ArrowLeftRight" },
  "/factory": { title: "Produção Industrial", iconName: "Hammer" },
};

function getRouteMeta(path: string): { title: string; iconName: string } {
  if (ROUTE_DEFINITIONS[path]) return ROUTE_DEFINITIONS[path];

  for (const [key, val] of Object.entries(ROUTE_DEFINITIONS)) {
    if (key !== "/" && path.startsWith(key)) {
      return val;
    }
  }

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
    case "Shield": return <Shield size={size} />;
    case "Settings": return <Settings size={size} />;
    case "Percent": return <Percent size={size} />;
    case "ShieldAlert": return <ShieldAlert size={size} />;
    case "ArrowLeftRight": return <ArrowLeftRight size={size} />;
    case "Hammer": return <Hammer size={size} />;
    case "Scale": return <Scale size={size} />;
    case "RefreshCw": return <RefreshCw size={size} />;
    case "Globe": return <Globe size={size} />;
    case "Smartphone": return <Smartphone size={size} />;
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
  operationTypes = [],
  canMobilePdv = false,
}: DrawerLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const [tabs, setTabs] = useState<WorkspaceTab[]>([
    { id: "/", href: "/", title: "Dashboard", iconName: "LayoutDashboard" },
  ]);

  const [currentDateFormatted, setCurrentDateFormatted] = useState("");

  // Pré-aquecimento das rotas principais em segundo plano para abertura instantânea de abas
  useEffect(() => {
    const keyRoutes = [
      "/stock",
      "/settings/roles",
      "/settings/users",
      "/settings/integrations",
      "/settings/terminals",
      "/pdv",
      "/finance",
      "/reports",
      "/migration",
      "/scales",
      "/labels",
      "/pricing",
      "/purchases",
      "/invoices"
    ];
    const timer = setTimeout(() => {
      keyRoutes.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {}
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      weekday: "long"
    });
    // Capitalizar primeira letra do dia da semana
    setCurrentDateFormatted(formatted.charAt(0).toUpperCase() + formatted.slice(1));
  }, []);

  const hasModule = (code: string) => {
    return activeModules.length === 0 || activeModules.includes(code);
  };

  useEffect(() => {
    const savedPinned = localStorage.getItem("erp_drawer_pinned");
    if (savedPinned === "true") {
      setIsPinned(true);
    }

    const savedTabs = localStorage.getItem("erp_workspace_tabs");
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(parsed);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!pathname) return;

    setTabs((prevTabs) => {
      const exists = prevTabs.find((t) => t.href === pathname);
      if (exists) return prevTabs;

      const meta = getRouteMeta(pathname);
      const newTab: WorkspaceTab = {
        id: pathname,
        href: pathname,
        title: meta.title,
        iconName: meta.iconName,
      };

      const updated = [...prevTabs, newTab];
      try {
        localStorage.setItem("erp_workspace_tabs", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [pathname]);

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

  const handleNavigate = (targetHref?: string) => {
    if (!isPinned) {
      setIsOpen(false);
    }
    if (targetHref && targetHref !== pathname) {
      setIsNavigating(true);
      // Criação otimista instantânea da aba (0ms)
      setTabs((prevTabs) => {
        if (prevTabs.some((t) => t.href === targetHref)) return prevTabs;
        const meta = getRouteMeta(targetHref);
        const newTab: WorkspaceTab = {
          id: targetHref,
          href: targetHref,
          title: meta.title,
          iconName: meta.iconName,
        };
        const updated = [...prevTabs, newTab];
        try {
          localStorage.setItem("erp_workspace_tabs", JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 text-gray-700 w-[270px] select-none shadow-xl">
      {/* Fechar / Fixar Gaveta */}
      <div className="px-4 py-2.5 flex items-center justify-end border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={togglePin}
            title={isPinned ? "Desafixar menu (usar como gaveta)" : "Fixar menu lateral"}
            className={`hidden md:flex p-1.5 rounded-lg transition-colors text-xs ${
              isPinned ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            title="Fechar menu gaveta (Esc)"
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar">
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

        {/* VENDAS & COMERCIAL */}
        <div className="space-y-0.5">
          <SectionLabel>VENDAS & COMERCIAL</SectionLabel>
          {hasModule("PDV") && <NavItem href="/pdv" icon={<Store size={16} />} label="PDV Caixa" active={pathname === "/pdv"} onNavigate={handleNavigate} />}
          {hasModule("PDV") && canMobilePdv && <NavItem href="/pdv/mobile" icon={<Smartphone size={16} />} label="PDV Mobile" active={pathname === "/pdv/mobile"} onNavigate={handleNavigate} />}
          <NavItem href="/distribution/orders" icon={<ClipboardList size={16} />} label="Pedidos" active={pathname?.startsWith("/distribution/orders")} onNavigate={handleNavigate} />
          <NavItem href="/contracts" icon={<FileText size={16} />} label="Contratos de Venda" active={pathname === "/contracts"} onNavigate={handleNavigate} />
          <NavItem href="/customers" icon={<Users size={16} />} label="Clientes" active={pathname === "/customers"} onNavigate={handleNavigate} />
        </div>

        {/* PRODUTOS & ESTOQUE */}
        <div className="space-y-0.5">
          <SectionLabel>PRODUTOS & ESTOQUE</SectionLabel>
          {hasModule("STOCK") && <NavItem href="/stock" icon={<Landmark size={16} />} label="Estoque & Produtos" active={pathname === "/stock"} onNavigate={handleNavigate} />}
          <NavItem href="/stock/new" icon={<Package size={16} />} label="Cadastrar Produto" active={pathname === "/stock/new"} onNavigate={handleNavigate} />
          <NavItem href="/purchases" icon={<ClipboardList size={16} />} label="Pedidos de Compra & Cotações" active={pathname?.startsWith("/purchases")} onNavigate={handleNavigate} />
          <NavItem href="/invoices" icon={<Receipt size={16} />} label="Entrada de Notas & XML" active={pathname === "/invoices"} onNavigate={handleNavigate} />
          <NavItem href="/pricing" icon={<Percent size={16} />} label="Precificação & Margens" active={pathname === "/pricing"} onNavigate={handleNavigate} />
          <NavItem href="/labels" icon={<Tag size={16} />} label="Impressão de Etiquetas" active={pathname === "/labels"} onNavigate={handleNavigate} />
          <NavItem href="/scales" icon={<Scale size={16} />} label="Balanças (Toledo MGV6)" active={pathname === "/scales"} onNavigate={handleNavigate} />
          <NavItem href="/expirations" icon={<Calendar size={16} />} label="Controle de Validades" active={pathname === "/expirations"} onNavigate={handleNavigate} />
          <NavItem href="/suppliers" icon={<Truck size={16} />} label="Fornecedores" active={pathname === "/suppliers"} onNavigate={handleNavigate} />
          {hasModule("MERCADOLOGICO") && <NavItem href="/mercadologico" icon={<FolderTree size={16} />} label="Categorias" active={pathname === "/mercadologico"} onNavigate={handleNavigate} />}
        </div>

        {/* GASTRONOMIA */}
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
          <NavItem href="/finance/reconciliation" icon={<Landmark size={16} />} label="Conciliação Bancária" active={pathname?.startsWith("/finance/reconciliation")} onNavigate={handleNavigate} />
          <NavItem href="/finance/cash-closings" icon={<Receipt size={16} />} label="Fechamento & Tesouraria" active={pathname?.startsWith("/finance/cash-closings")} onNavigate={handleNavigate} />
          {hasModule("REPORTS") && <NavItem href="/reports" icon={<FileText size={16} />} label="Relatórios & BI" active={pathname === "/reports"} onNavigate={handleNavigate} />}
        </div>

        {/* CONFIGURAÇÕES */}
        <div className="space-y-0.5">
          <SectionLabel>CONFIGURAÇÕES</SectionLabel>
          <NavItem href="/settings/terminals" icon={<Monitor size={16} />} label="Terminais PDV" active={pathname === "/settings/terminals"} onNavigate={handleNavigate} />
          <NavItem href="/settings/modules" icon={<Building2 size={16} />} label="Lojas & Módulos" active={pathname === "/settings/modules"} onNavigate={handleNavigate} />
          <NavItem href="/settings/users" icon={<Users size={16} />} label="Usuários" active={pathname === "/settings/users"} onNavigate={handleNavigate} />
          <NavItem href="/settings/roles" icon={<Shield size={16} />} label="Perfis & Setores" active={pathname === "/settings/roles"} onNavigate={handleNavigate} />
          <NavItem href="/settings/integrations" icon={<Globe size={16} />} label="Integrações & IP Nuvem" active={pathname === "/settings/integrations"} onNavigate={handleNavigate} />
          <NavItem href="/migration" icon={<RefreshCw size={16} />} label="Migração Saipos" active={pathname === "/migration"} onNavigate={handleNavigate} />
          <NavItem href="/settings" icon={<Settings size={16} />} label="Configurações Gerais" active={pathname === "/settings"} onNavigate={handleNavigate} />
        </div>
      </nav>

      {/* Novidades & Logout */}
      <div className="p-3 border-t border-gray-100 shrink-0 space-y-2">
        <button
          onClick={() => {
            setIsOpen(false);
            setShowWhatsNew(true);
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all"
        >
          <Sparkles size={14} className="text-blue-500" />
          <span>O que mudou? (Novidades)</span>
        </button>

        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 rounded-xl transition-all"
          >
            <LogOut size={14} />
            <span>Sair / Trocar Usuário</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f8ff] text-gray-800 font-sans">
      {/* Backdrop da Gaveta */}
      {isOpen && !isPinned && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Gaveta */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen || isPinned ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Área Principal de Conteúdo */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden bg-[#dce7f7] transition-all duration-300 print:bg-white print:p-0 print:m-0 print:overflow-visible ${isPinned ? "md:pl-[270px] print:pl-0" : ""}`}>

        
        {/* Barra de Carregamento Ultrarrápida de Transição de Abas */}
        {isNavigating && (
          <div className="h-0.5 w-full bg-blue-100 overflow-hidden shrink-0 z-50">
            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-500 w-full animate-pulse transition-all" />
          </div>
        )}

        {/* Top Header Bar */}
        <header className="h-14 border-b border-gray-200 px-4 md:px-6 flex items-center justify-between shrink-0 bg-[#ecf3ff] shadow-sm z-30 print:hidden">
          <div className="flex items-center gap-4">
            {/* Botão Hambúrguer */}
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="px-3 py-1.5 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 border border-gray-200 transition-all flex items-center gap-2 group shadow-sm bg-white"
              title="Abrir Menu Gaveta"
            >
              <Menu size={16} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold hidden sm:inline">Menu</span>
            </button>

            {/* Logo compacta */}
            <Link href="/" className="flex items-center">
              <CybertechBrand size="sm" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Busca Rápida */}
            <div className="hidden lg:flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-500 px-3 py-1.5 rounded-xl text-xs w-64 focus-within:border-blue-500 transition-all">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar no sistema..."
                className="bg-transparent text-gray-800 outline-none w-full text-xs placeholder:text-gray-400 font-medium"
              />
            </div>

            {/* Seletor de Loja */}
            <div className="hidden sm:flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs text-gray-700">
              <Store size={14} className="text-blue-600" />
              <select className="bg-transparent border-none text-gray-700 text-xs font-semibold outline-none cursor-pointer">
                <option className="bg-white">Todas as Lojas</option>
                <option className="bg-white">Matriz Centro</option>
              </select>
            </div>

            {/* Data Atual */}
            <div className="hidden xl:flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs text-gray-600">
              <Calendar size={14} className="text-blue-600" />
              <span className="text-[11px] font-medium">{currentDateFormatted}</span>
            </div>

            {/* Botão de Novidades */}
            <button
              onClick={() => setShowWhatsNew(true)}
              title="Ver novidades e o que mudou nesta versão do sistema"
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Sparkles size={13} className="text-blue-500" />
              <span className="hidden sm:inline">Novidades</span>
              <span className="text-[10px] bg-blue-600 text-white px-1 rounded font-mono">v2.2</span>
            </button>

            {/* Perfil & Logout */}
            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                {userInitials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-gray-800 leading-none">{userName}</p>
                <p className="text-[9px] text-green-600 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                </p>
              </div>
              <Link href="/settings" className="p-1 text-gray-400 hover:text-gray-700 transition-colors" title="Configurações">
                <Settings size={15} />
              </Link>
            </div>
          </div>
        </header>

        {/* ─── BARRA DE ABAS DE TAREFAS ────────────── */}
        <div className="bg-[#d2e0f5] border-b border-gray-200 px-4 py-2 shrink-0 flex items-center justify-between gap-2 overflow-x-auto select-none custom-scrollbar print:hidden">
          {/* Lista de Abas Abertas */}
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 flex-1 min-w-0">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch={true}
                  onMouseEnter={() => {
                    try {
                      router.prefetch(tab.href);
                    } catch {}
                  }}
                  onClick={() => {
                    if (tab.href !== pathname) setIsNavigating(true);
                  }}
                  className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}>
                    {renderTabIcon(tab.iconName, 13)}
                  </span>
                  <span className="truncate max-w-[150px]">{tab.title}</span>
                  {tabs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCloseTab(tab.href, e);
                      }}
                      title="Fechar aba"
                      className="p-0.5 rounded hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors opacity-60 group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  )}
                </Link>
              );
            })}

            {/* Botão + para abrir o menu e iniciar nova tarefa */}
            <button
              onClick={() => setIsOpen(true)}
              title="Abrir nova tarefa no Menu Gaveta"
              className="px-2.5 py-1.5 text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all flex items-center gap-1 shrink-0 text-xs font-semibold shadow-sm"
            >
              <Plus size={13} />
              <span className="hidden sm:inline">Nova Tarefa</span>
            </button>
          </div>

          {/* Opção Fechar Outras Abas */}
          {tabs.length > 1 && (
            <div className="shrink-0 flex items-center pl-2 border-l border-gray-200">
              <button
                onClick={handleCloseOthers}
                title="Fechar todas as abas exceto a atual"
                className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 px-2 py-1 rounded transition-colors"
              >
                Fechar outras &gt;
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Page Body */}
        <main
          className={`flex-1 min-h-0 custom-scrollbar print:p-0 print:m-0 print:overflow-visible ${
            pathname === "/labels"
              ? "overflow-hidden p-2.5 flex flex-col"
              : "overflow-y-auto p-4 md:p-6 space-y-5"
          }`}
        >
          {children}
        </main>

        <AutoInstallLogo />
      </div>

      {/* Modal de Boas-Vindas */}
      <WhatsNewModal
        userName={userName}
        forceOpen={showWhatsNew}
        onClose={() => setShowWhatsNew(false)}
      />

      {/* Monitor de Acesso Simultâneo (Encerra sessão se outro aparelho logar) */}
      <ConcurrentSessionWatcher />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">
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
  onNavigate?: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      onMouseEnter={() => {
        try {
          if (typeof window !== "undefined") {
            const r = (window as any).__nextRouter;
            if (r?.prefetch) r.prefetch(href);
          }
        } catch {}
      }}
      onClick={() => onNavigate?.(href)}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      <div className={`${active ? "text-white" : "text-gray-400"} shrink-0`}>
        {icon}
      </div>
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}
