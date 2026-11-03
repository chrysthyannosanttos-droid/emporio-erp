"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  CheckCircle2,
  LayoutDashboard,
  Store,
  Landmark,
  Wallet,
  GraduationCap,
  ArrowRight
} from "lucide-react";

interface TourStep {
  title: string;
  subtitle: string;
  badge: string;
  icon: any;
  content: string;
  featureList: string[];
  actionLabel?: string;
  actionUrl?: string;
  hotkey?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Dashboard Executivo em Tempo Real",
    subtitle: "Visão 360° do seu negócio sem lentidão",
    badge: "Etapa 1 de 5",
    icon: LayoutDashboard,
    content: "Acompanhe faturamento líquido, margem de lucro real, ticket médio e rupturas de estoque atualizados instantaneamente em tempo real.",
    featureList: [
      "Faturamento consolidado: Hoje, Semana e Mês",
      "Alerta de Rupturas de Estoque (produtos zerados com alta demanda)",
      "Mix de Pagamentos detalhado (Pix, Cartão de Crédito/Débito e Dinheiro)",
      "Top Produtos Mais Vendidos e giro de mercadoria"
    ],
    actionLabel: "Ver no Dashboard",
    actionUrl: "/"
  },
  {
    title: "Frente de Caixa (PDV) de Alta Velocidade",
    subtitle: "Venda concluída em menos de 10 segundos",
    badge: "Etapa 2 de 5",
    icon: Store,
    content: "PDV intuitivo desenhado para suportar alta demanda no caixa, sem travamentos e com emissão fiscal instantânea.",
    featureList: [
      "Leitura rápida por leitor de código de barras ou balança Toledo",
      "QR Code Pix dinâmico direto na tela (baixa automática)",
      "Atalhos de teclado ágeis para os caixas (F2, F4, Enter)",
      "Fechamento de caixa cego com sangria e suprimento auditados"
    ],
    actionLabel: "Abrir PDV Caixa",
    actionUrl: "/pdv",
    hotkey: "F2 no teclado"
  },
  {
    title: "Estoque Inteligente & Etiquetas de Gôndola",
    subtitle: "Importação de NF-e em 1 clique",
    badge: "Etapa 3 de 5",
    icon: Landmark,
    content: "Elimine o trabalho manual de cadastro. Dê entrada no estoque importando o XML da nota do fornecedor com precificação automática.",
    featureList: [
      "Importação direta de XML de compra com cálculo de custo e margem",
      "Gerador de etiquetas de gôndola e código de barras térmicas",
      "Exportação oficial para balanças de açougue e padaria (MGV6)",
      "Controle de perdas, validades e lotes críticos"
    ],
    actionLabel: "Abrir Estoque",
    actionUrl: "/stock"
  },
  {
    title: "Financeiro & DRE Gerencial Automático",
    subtitle: "Saiba exatamente quanto você lucrou no fim do dia",
    badge: "Etapa 4 de 5",
    icon: Wallet,
    content: "Controle completo de Contas a Pagar, Contas a Receber e DRE (Demonstrativo do Resultado do Exercício) em tempo real.",
    featureList: [
      "DRE Automático: Receita bruta, custos operacionais e margem de contribuição",
      "Conciliação bancária de taxas de operadoras de cartão e Pix",
      "Fluxo de caixa diário projetado para evitar surpresas",
      "Histórico de transações e sangrias auditadas por operador"
    ],
    actionLabel: "Abrir Financeiro",
    actionUrl: "/finance"
  },
  {
    title: "Guia Oficial & Central de Apresentação",
    subtitle: "Treinamento e material comercial integrado",
    badge: "Etapa 5 de 5",
    icon: GraduationCap,
    content: "Acesse o módulo oficial de Guia e Apresentação para aprender tudo sobre as telas ou apresentar o sistema para novos clientes.",
    featureList: [
      "Roteiro de apresentação comercial (Pitch de Vendas)",
      "Passo a passo com capturas visuais de cada tela do sistema",
      "Manual de operações para operadores e novos colaboradores",
      "Atalhos e boas práticas de operação no varejo"
    ],
    actionLabel: "Acessar Módulo Guia",
    actionUrl: "/guide"
  }
];

export function DemoTourGuide({ isDemoUser = false }: { isDemoUser?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasDismissed, setHasDismissed] = useState(false);

  // Inicializa aberto automaticamente para o usuário demonstrativo na primeira visita
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cybertech_demo_tour_dismissed");
      if (isDemoUser && !saved) {
        setIsOpen(true);
      }
    } catch {}
  }, [isDemoUser]);

  const step = TOUR_STEPS[currentStepIndex];
  const IconComponent = step.icon;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsOpen(false);
      try {
        localStorage.setItem("cybertech_demo_tour_dismissed", "true");
      } catch {}
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    try {
      localStorage.setItem("cybertech_demo_tour_dismissed", "true");
    } catch {}
  };

  const handleExecuteAction = (url?: string) => {
    if (url) {
      router.push(url);
    }
  };

  return (
    <>
      {/* Botão Flutuante Permanente de Tour (sempre disponível para o usuário demonstrativo ou qualquer um) */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
        <button
          onClick={() => {
            setIsOpen(true);
            setCurrentStepIndex(0);
          }}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white rounded-full font-bold text-xs shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all border border-white/20 active:scale-95 group"
          title="Abrir Tour Interativo e Apresentação do Sistema"
        >
          <Sparkles size={16} className="text-yellow-300 animate-pulse" />
          <span>Guia & Tour do Sistema</span>
          <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
            {TOUR_STEPS.length} Etapas
          </span>
        </button>
      </div>

      {/* Modal / Card Interativo do Tour de Tela */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-xl w-full overflow-hidden flex flex-col relative transform transition-all scale-100">
            {/* Topo com gradiente suave */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 relative">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Fechar Tour"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {step.badge}
                </span>
                {isDemoUser && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Modo Demonstrativo
                  </span>
                )}
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600/30 rounded-2xl border border-blue-400/30 text-blue-300 shrink-0">
                  <IconComponent size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">{step.title}</h3>
                  <p className="text-xs text-blue-200/80 font-medium mt-0.5">{step.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Conteúdo com detalhes e pontos-chave */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed font-medium">
                {step.content}
              </p>

              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-2.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Destaques principais desta tela:
                </p>
                <ul className="space-y-2">
                  {step.featureList.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {step.actionLabel && (
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleExecuteAction(step.actionUrl)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors group cursor-pointer"
                  >
                    <span>{step.actionLabel}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  {step.hotkey && (
                    <span className="text-[11px] text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                      Atalho: {step.hotkey}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Barra de Progresso e Navegação Inferior */}
            <div className="p-4 px-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              {/* Indicadores de bolinha */}
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentStepIndex
                        ? "w-6 bg-blue-600"
                        : "w-2 bg-gray-300 hover:bg-gray-400"
                    }`}
                    title={`Ir para etapa ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Botões Voltar / Avançar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentStepIndex === 0}
                  className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-600 rounded-xl transition-colors"
                >
                  Voltar
                </button>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <span>
                    {currentStepIndex === TOUR_STEPS.length - 1 ? "Concluir Guia" : "Próximo"}
                  </span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

