"use client";

import { useState, useEffect } from "react";
import {
  Sparkles, X, CheckCircle2, Zap, Layers, Menu, ArrowRight,
  ShieldCheck, Rocket, BellRing
} from "lucide-react";

// Versão do anúncio atual do sistema. Sempre que houver uma atualização, basta mudar esta chave!
export const SYSTEM_CHANGELOG_VERSION = "2.2.0-drawer-tabs";

interface ChangelogItem {
  icon: any;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeColor: string;
  title: string;
  description: string;
}

const CHANGELOG_ITEMS: ChangelogItem[] = [
  {
    icon: Menu,
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-400",
    badge: "Novo Design",
    badgeColor: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    title: "Menu Gaveta Flutuante (100% de Tela Livre)",
    description: "O menu agora desliza em uma gaveta rápida ao clicar no botão superior esquerdo. Com isso, o PDV e os relatórios ocupam todo o seu monitor sem barras fixas atrapalhando.",
  },
  {
    icon: Layers,
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-400",
    badge: "Multitarefas",
    badgeColor: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    title: "Sistema de Abas de Navegação",
    description: "Trabalhe em várias telas ao mesmo tempo! Abra PDV, Estoque, Pedidos e Clientes em abas no topo e alterne entre elas com um clique, sem perder o que estava fazendo.",
  },
  {
    icon: Zap,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    badge: "Super Rápido",
    badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    title: "Carregamento Instantâneo (Turbopack)",
    description: "O motor do sistema foi turbinado. As novas telas agora abrem em menos de 300ms, com redução drástica de consumo de memória do servidor.",
  },
  {
    icon: ShieldCheck,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    badge: "Otimizado",
    badgeColor: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    title: "Rotas Corrigidas & Gastronomia Integrada",
    description: "Módulos de PDV Restaurante, Cozinha (KDS), Fichas Técnicas e relatórios de fluxo financeiro totalmente sincronizados.",
  },
];

interface WhatsNewModalProps {
  userName?: string;
  forceOpen?: boolean;
  onClose?: () => void;
}

export function WhatsNewModal({ userName = "Usuário", forceOpen, onClose }: WhatsNewModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Determinar a saudação pelo horário
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    try {
      const lastSeen = localStorage.getItem("erp_last_seen_changelog");
      if (lastSeen !== SYSTEM_CHANGELOG_VERSION) {
        // Aguarda 800ms após carregar a página para abrir suavemente
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [forceOpen]);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      localStorage.setItem("erp_last_seen_changelog", SYSTEM_CHANGELOG_VERSION);
    } catch {}
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Backdrop escuro com desfoque */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={handleDismiss}
      />

      {/* Caixa do Modal */}
      <div className="relative w-full max-w-2xl bg-[#0c1020] border border-indigo-500/25 rounded-2xl shadow-2xl shadow-indigo-950/60 flex flex-col overflow-hidden z-10 max-h-[90vh]">
        
        {/* Banner Superior Decorativo */}
        <div className="relative bg-gradient-to-r from-indigo-950 via-[#131938] to-[#0c1020] p-6 border-b border-indigo-500/20 overflow-hidden shrink-0">
          {/* Efeito Glow Neon no Fundo */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full tracking-wide">
                  <Sparkles size={13} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                  Novidades da Versão v2.2
                </span>
                <span className="text-[11px] font-mono text-slate-400">Cybertech RP</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 pt-1">
                {getGreeting()}, <span className="text-indigo-300">{userName}</span>! 👋
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
                Preparamos uma grande atualização para o sistema hoje. Veja o que mudou para deixar o seu trabalho mais rápido e produtivo:
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-indigo-500/15 rounded-xl transition-colors border border-indigo-500/10"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Lista de Novidades com Scroll */}
        <div className="p-4 sm:p-6 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 bg-[#090d1a]/50">
          {CHANGELOG_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#11162a] border border-indigo-500/10 hover:border-indigo-500/30 transition-all hover:bg-[#151b33] group"
              >
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 border border-indigo-500/15 shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      {item.title}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md border ${item.badgeColor} uppercase tracking-wider`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé com Botão de Ação */}
        <div className="p-4 sm:p-5 border-t border-indigo-500/15 bg-[#0a0d18] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span>Você pode rever este aviso a qualquer momento pelo botão <strong>Novidades</strong> no topo.</span>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-102 cursor-pointer"
          >
            <span>Entendido, vamos começar!</span>
            <Rocket size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
