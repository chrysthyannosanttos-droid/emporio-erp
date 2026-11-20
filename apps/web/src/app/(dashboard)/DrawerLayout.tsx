"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Users, Package, Wallet, FileText,
  LogOut, Bell, Hammer, Percent, Tag, Truck, ClipboardList, BarChart2,
  ChevronRight, ChevronDown, Store, Landmark, HeartHandshake, AlertTriangle,
  Scale, ShoppingBag, Palette, ArrowLeftRight, FolderTree,
  Utensils, ChefHat, BookOpen, Menu, X, ShieldAlert, ShieldCheck, Shield,
  Sliders, Settings, Search, Calendar, HelpCircle, Hexagon,
  CreditCard, TrendingDown, TrendingUp, Building2, Monitor,
  Plus, Pin, PinOff, Sparkles, Receipt, RefreshCw, Globe, Smartphone,
  ClipboardCheck, BedDouble, Pencil, Trash2
} from "lucide-react";
import { logout, switchToMaster } from "@/actions/auth";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { AutoInstallLogo } from "@/components/AutoInstallLogo";
import { CybertechBrand } from "@/components/CybertechBrand";
import { ConcurrentSessionWatcher } from "@/components/ConcurrentSessionWatcher";
import { DemoTourGuide } from "@/components/DemoTourGuide";
import { GlobalTabActionModal } from "@/components/GlobalTabActionModal";
import { DigitalMenuOrderNotifier } from "@/components/DigitalMenuOrderNotifier";

interface DrawerLayoutProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
  userInitials: string;
  logoUrl?: string | null;
  activeModules?: string[];
  operationTypes?: string[];
  canMobilePdv?: boolean;
  isMasterEligible?: boolean;
  isCristiano?: boolean;
  stores?: Array<{ id: string; name: string }>;
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
  "/sales": { title: "Vendas", iconName: "ShoppingBag" },
  "/vendas-diretas": { title: "Venda Direta", iconName: "Receipt" },
  "/ecommerce": { title: "Cardápio Digital", iconName: "ShoppingBag" },
  "/comandas": { title: "Comandas / Quartos", iconName: "BedDouble" },
  "/contracts": { title: "Contratos de Venda", iconName: "FileText" },
  "/distribution/orders": { title: "Pedidos", iconName: "ClipboardList" },
  "/customers": { title: "Clientes", iconName: "Users" },
  "/fiscal": { title: "Central Fiscal & SEFAZ", iconName: "Receipt" },
  "/invoices": { title: "Entrada de Notas", iconName: "Receipt" },
  "/fiscal/decretos": { title: "Decretos AL & NCMs", iconName: "Scale" },
  "/decretos": { title: "Decretos AL & NCMs", iconName: "Scale" },
  "/labels": { title: "Etiquetas", iconName: "Tag" },
  "/scales": { title: "Balanças (Toledo MGV6)", iconName: "Scale" },
  "/expirations": { title: "Validades", iconName: "Calendar" },
  "/losses": { title: "Avarias & Perdas", iconName: "AlertTriangle" },
  "/production": { title: "Produção Própria", iconName: "Hammer" },
  "/stock": { title: "Estoque", iconName: "Landmark" },
  "/stock/inventory": { title: "Balanço & Inventário", iconName: "ClipboardCheck" },
  "/coi": { title: "Operações Internas (COI)", iconName: "Sliders" },
  "/assets": { title: "Ativo Imobilizado", iconName: "Shield" },
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
  "/guide": { title: "Guia & Demonstração", iconName: "BookOpen" },
  "/settings/terminals": { title: "Terminais PDV", iconName: "Monitor" },
  "/settings/pdv-screensaver": { title: "Descanso de Tela PDV", iconName: "Monitor" },
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
    case "Sliders": return <Sliders size={size} />;
    case "RefreshCw": return <RefreshCw size={size} />;
    case "Globe": return <Globe size={size} />;
    case "Smartphone": return <Smartphone size={size} />;
    case "ShoppingBag": return <ShoppingBag size={size} />;
    case "AlertTriangle": return <AlertTriangle size={size} />;
    case "BedDouble": return <BedDouble size={size} />;
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
  isMasterEligible = false,
  isCristiano = false,
  stores = [],
}: DrawerLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [globalActionMode, setGlobalActionMode] = useState<"edit" | "delete" | null>(null);
  const [menuSearch, setMenuSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    vendas: true,
    fiscal: true,
  });

  const toggleMenuGroup = (groupKey: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupKey]: !prev[groupKey] };
      try {
        localStorage.setItem("EMPORIO_MENU_GROUPS", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("EMPORIO_MENU_GROUPS");
      if (saved) setOpenGroups((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}
  }, []);

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
      "/sales",
      "/vendas-diretas",
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
    if (isCristiano) return true;
    if (activeModules && activeModules.length > 0) {
      return activeModules.includes(code);
    }
    return true;
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

      {/* Navigation List — Organizada por Setor com Busca e Grupos Recolhíveis */}
      <nav className="flex-1 px-3 py-3 space-y-2.5 overflow-y-auto custom-scrollbar">
        {/* Busca rápida no menu */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
            placeholder="Filtrar menu..."
            className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl pl-8 pr-7 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 outline-none"
          />
          {menuSearch && (
            <button
              type="button"
              onClick={() => setMenuSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Dashboard Principal */}
        <div>
          <NavItem
            href="/"
            icon={<LayoutDashboard size={16} />}
            label="Dashboard"
            active={pathname === "/"}
            onNavigate={handleNavigate}
          />
        </div>

        {(() => {
          const q = menuSearch.trim().toLowerCase();
          const groups = [
            {
              key: "vendas",
              title: "Vendas & Atendimento",
              items: [
                hasModule("PDV") && { href: "/pdv", icon: <Store size={15} />, label: "PDV Caixa", active: pathname === "/pdv" },
                hasModule("PDV") && canMobilePdv && { href: "/pdv/mobile", icon: <Smartphone size={15} />, label: "PDV Mobile", active: pathname === "/pdv/mobile" },
                { href: "/sales", icon: <ShoppingBag size={15} />, label: "Vendas", active: pathname === "/sales" },
                { href: "/vendas-diretas", icon: <Receipt size={15} />, label: "Venda Direta", active: Boolean(pathname?.startsWith("/vendas-diretas")) },
                hasModule("ECOMMERCE") && { href: "/ecommerce", icon: <ShoppingBag size={15} />, label: "Cardápio Digital", active: Boolean(pathname?.startsWith("/ecommerce")) },
                hasModule("DISTRIBUTION_ORDERS") && { href: "/distribution/orders", icon: <ClipboardList size={15} />, label: "Pedidos", active: Boolean(pathname?.startsWith("/distribution/orders")) },
                hasModule("HOTEL_TABS") && { href: "/comandas", icon: <BedDouble size={15} />, label: "Comandas / Quartos", active: Boolean(pathname?.startsWith("/comandas")) },
                (isCristiano || hasModule("CONTRACTS")) && { href: "/contracts", icon: <FileText size={15} />, label: "Contratos de Venda", active: pathname === "/contracts" },
                hasModule("CRM") && { href: "/customers", icon: <Users size={15} />, label: "Clientes", active: pathname === "/customers" },
              ].filter(Boolean) as Array<{ href: string; icon: React.ReactNode; label: string; active: boolean }>,
            },
            {
              key: "fiscal",
              title: "Fiscal & Notas (SEFAZ)",
              items: [
                { href: "/fiscal", icon: <Receipt size={15} />, label: "Central Fiscal & SEFAZ", active: pathname === "/fiscal" },
                hasModule("FISCAL_RADAR") && { href: "/invoices", icon: <FileText size={15} />, label: "Entrada de Notas & XML", active: pathname === "/invoices" },
                hasModule("FISCAL") && { href: "/fiscal/decretos", icon: <Scale size={15} />, label: "Decretos AL & NCMs", active: Boolean(pathname?.startsWith("/fiscal/decretos") || pathname === "/decretos") },
              ].filter(Boolean) as Array<{ href: string; icon: React.ReactNode; label: string; active: boolean }>,
            },
            {
              key: "compras",
              title: "Compras & Fornecedores",
              items: [
                hasModule("PURCHASES") && { href: "/purchases", icon: <ClipboardList size={15} />, label: "Pedidos de Compra & Cotações", active: Boolean(pathname?.startsWith("/purchases")) },
                hasModule("SUPPLIERS") && { href: "/suppliers", icon: <Truck size={15} />, label: "Fornecedores", active: pathname === "/suppliers" },
                hasModule("PURCHASES") && { href: "/reports/purchases-by-supplier", icon: <BarChart2 size={15} />, label: "Compras por Fornecedor", active: pathname === "/reports/purchases-by-supplier" },
              ].filter(Boolean) as Array<{ href: string; icon: React.ReactNode; label: string; active: boolean }>,
            },
            {
              key: "estoque",
              title: "Produtos & Estoque",
              items: [
                hasModule("STOCK") && { href: "/stock", icon: <Landmark size={15} />, label: "Estoque & Produtos", active: pathname === "/stock" },
                hasModule("STOCK") && { href: "/stock/new", icon: <Package size={15} />, label: "Cadastrar Produto", active: pathname === "/stock/new" },
                hasModule("MERCADOLOGICO") && { href: "/mercadologico", icon: <FolderTree size={15} />, label: "Categorias", active: pathname === "/mercadologico" },
                hasModule("PRICING") && { href: "/pricing", icon: <Percent size={15} />, label: "Precificação & Margens", active: pathname === "/pricing" },
                hasModule("LABELS") && { href: "/labels", icon: <Tag size={15} />, label: "Impressão de Etiquetas", active: pathname === "/labels" },
                hasModule("SCALES") && { href: "/scales", icon: <Scale size={15} />, label: "Balanças (Toledo MGV6)", active: pathname === "/scales" },
                hasModule("EXPIRATIONS") && { href: "/expirations", icon: <Calendar size={15} />, label: "Controle de Validades", active: pathname === "/expirations" },
                hasModule("STOCK") && { href: "/stock/inventory", icon: <ClipboardCheck size={15} />, label: "Balanço & Inventário", active: pathname === "/stock/inventory" },
                hasModule("LOSSES") && { href: "/losses", icon: <AlertTriangle size={15} />, label: "Avarias & Perdas", active: Boolean(pathname?.startsWith("/losses")) },
                hasModule("COI") && { href: "/coi", icon: <Sliders size={15} />, label: "Operações de Estoque (COI)", active: pathname === "/coi" },
                hasModule("PRODUCTION") && { href: "/production", icon: <Hammer size={15} />, label: "Produção Própria", active: Boolean(pathname?.startsWith("/production")) },
                hasModule("ASSETS") && { href: "/assets", icon: <Shield size={15} />, label: "Ativo Imobilizado", active: pathname === "/assets" },
              ].filter(Boolean) as Array<{ href: string; icon: React.ReactNode; label: string; active: boolean }>,
            },
            {
              key: "restaurante",
              title: "Restaurante",
              items: [
                hasModule("RESTAURANT") && { href: "/restaurant/pdv", icon: <Utensils size={15} />, label: "PDV Touch & Mesas", active: Boolean(pathname?.startsWith("/restaurant/pdv")) },
                hasModule("RESTAURANT") && { href: "/restaurant/kds", icon: <ChefHat size={15} />, label: "Cozinha (KDS)", active: Boolean(pathname?.startsWith("/restaurant/kds")) },
                hasModule("RECIPES") && { href: "/restaurant/recipes", icon: <BookOpen size={15} />, label: "Fichas Técnicas", active: Boolean(pathname?.startsWith("/restaurant/recipes")) },
              ].filter(Boolean) as Array<{ href: string; icon: React.ReactNode; label: string; active: boolean }>,
            },
            {
              key: "financeiro",
              title: "Financeiro & Relatórios",
              items: [
                hasModule("FINANCE") && { href: "/finance", icon: <Wallet size={15} />, label: "Financeiro Completo", active: pathname === "/finance" },
                hasModule("RECONCILIATION") && { href: "/finance/reconciliation", icon: <Landmark size={15} />, label: "Conciliação Bancária", active: Boolean(pathname?.startsWith("/finance/reconciliation")) },
                hasModule("CASH_CLOSINGS") && { href: "/finance/cash-closings", icon: <Receipt size={15} />, label: "Fechamento & Tesouraria", active: Boolean(pathname?.startsWith("/finance/cash-closings")) },
                hasModule("REPORTS") && { href: "/reports", icon: <FileText size={15} />, label: "Relatórios & BI", active: pathname === "/reports" },
              ].filter(Boolean) as Array<{ href: string; icon: React.ReactNode; label: string; active: boolean }>,
            },
            {
              key: "configuracoes",
              title: "Configurações & Sistema",
              items: [
                { href: "/settings/terminals", icon: <Monitor size={15} />, label: "Terminais PDV", active: pathname === "/settings/terminals" },
                { href: "/settings/pdv-screensaver", icon: <Monitor size={15} />, label: "Descanso de Tela PDV", active: pathname === "/settings/pdv-screensaver" },
                { href: "/settings/modules", icon: <Building2 size={15} />, label: "Lojas & Módulos", active: pathname === "/settings/modules" },
                { href: "/settings/users", icon: <Users size={15} />, label: "Usuários", active: pathname === "/settings/users" },
                { href: "/settings/roles", icon: <Shield size={15} />, label: "Perfis & Setores", active: pathname === "/settings/roles" },
                { href: "/settings/integrations", icon: <Globe size={15} />, label: "Integrações & IP Nuvem", active: pathname === "/settings/integrations" },
                isCristiano && { href: "/audit", icon: <ShieldAlert size={15} />, label: "Log Auditoria & Segurança", active: pathname === "/audit" || pathname === "/settings/audit" },
                hasModule("MIGRATION") && { href: "/migration", icon: <RefreshCw size={15} />, label: "Migração Saipos", active: pathname === "/migration" },
                { href: "/settings", icon: <Settings size={15} />, label: "Configurações Gerais", active: pathname === "/settings" },
                { href: "/guide", icon: <BookOpen size={15} />, label: "Guia & Demonstração", active: pathname === "/guide" },
              ].filter(Boolean) as Array<{ href: string; icon: React.ReactNode; label: string; active: boolean }>,
            },
          ];

          return groups.map((group) => {
            const visibleItems = q
              ? group.items.filter((it) => it.label.toLowerCase().includes(q))
              : group.items;
            if (visibleItems.length === 0) return null;

            const hasActiveChild = visibleItems.some((it) => it.active);
            const isGroupOpen = q.length > 0 || hasActiveChild || Boolean(openGroups[group.key]);

            return (
              <div key={group.key} className="border-t border-gray-100 pt-2">
                <button
                  type="button"
                  onClick={() => toggleMenuGroup(group.key)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span>{group.title}</span>
                  {isGroupOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                {isGroupOpen && (
                  <div className="space-y-0.5 mt-1">
                    {visibleItems.map((it) => (
                      <NavItem
                        key={it.href}
                        href={it.href}
                        icon={it.icon}
                        label={it.label}
                        active={it.active}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          });
        })()}
      </nav>

      {/* Novidades & Logout */}
      <div className="p-3 border-t border-gray-100 shrink-0 space-y-2">
        {isMasterEligible && (
          <button
            onClick={async () => {
              setIsOpen(false);
              const res = await switchToMaster();
              if (res?.redirectUrl) {
                window.location.href = res.redirectUrl;
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 rounded-xl transition-all shadow-sm shadow-purple-900/20 active:scale-95"
          >
            <ShieldCheck size={15} className="text-purple-200" />
            <span>👑 Painel Master SaaS</span>
          </button>
        )}

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

            {/* Seletor de Loja (exibido apenas quando a empresa possui mais de 1 loja) */}
            {stores.length > 1 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs text-gray-700">
                <Store size={14} className="text-blue-600" />
                <select className="bg-transparent border-none text-gray-700 text-xs font-semibold outline-none cursor-pointer">
                  <option value="todas" className="bg-white">Todas as Lojas</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id} className="bg-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Data Atual */}
            <div className="hidden xl:flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs text-gray-600">
              <Calendar size={14} className="text-blue-600" />
              <span className="text-[11px] font-medium">{currentDateFormatted}</span>
            </div>

            {/* Botão Atalho Painel Master SaaS */}
            {isMasterEligible && (
              <button
                onClick={async () => {
                  const res = await switchToMaster();
                  if (res?.redirectUrl) {
                    window.location.href = res.redirectUrl;
                  }
                }}
                title="Acessar o Painel Master do SaaS (Gerenciar Empresas, Licenças e Planos)"
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white border border-purple-500/40 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-purple-900/10 active:scale-95"
              >
                <ShieldCheck size={14} className="text-purple-200" />
                <span className="hidden sm:inline">Painel Master (SaaS)</span>
              </button>
            )}

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

          {/* Ações Globais da Aba Atual (Editar / Excluir) + Fechar outras abas */}
          <div className="shrink-0 flex items-center gap-2 pl-2 border-l border-gray-300/70">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 shadow-2xs gap-0.5">
              <button
                type="button"
                onClick={() => setGlobalActionMode("edit")}
                title={`Editar registros em ${getRouteMeta(pathname || "/").title}`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Pencil size={12} />
                <span className="hidden md:inline">Editar</span>
              </button>
              <button
                type="button"
                onClick={() => setGlobalActionMode("delete")}
                title={`Excluir / Apagar registros em ${getRouteMeta(pathname || "/").title}`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 size={12} />
                <span className="hidden md:inline">Excluir</span>
              </button>
            </div>

            {tabs.length > 1 && (
              <button
                onClick={handleCloseOthers}
                title="Fechar todas as abas exceto a atual"
                className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                Fechar outras &gt;
              </button>
            )}
          </div>
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

      {/* Tour Interativo do Sistema e Apresentação */}
      <DemoTourGuide isDemoUser={userName.toLowerCase().includes("demonstrativo")} />
      <DigitalMenuOrderNotifier />

      {/* Ação Rápida Global de Editar / Excluir da Aba Atual */}
      {globalActionMode && (
        <GlobalTabActionModal
          mode={globalActionMode}
          pathname={pathname || "/"}
          onClose={() => setGlobalActionMode(null)}
        />
      )}
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
