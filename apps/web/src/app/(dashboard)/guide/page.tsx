"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  LayoutDashboard,
  Store,
  Package,
  Wallet,
  Receipt,
  Utensils,
  Play,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileText,
  Printer,
  Barcode,
  TrendingUp,
  CreditCard,
  QrCode,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Target
} from "lucide-react";

type TabKey = "PITCH" | "DASHBOARD" | "PDV" | "STOCK" | "FINANCE" | "FISCAL" | "RESTAURANT";

export default function GuideModulePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("PITCH");

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* ── HEADER DA PÁGINA ── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-blue-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
              <Sparkles size={14} className="text-yellow-300" />
              <span>Manual Comercial & Operacional Cybertech RP</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Guia Completo de Apresentação e Uso
            </h1>
            <p className="text-sm text-blue-100/80 leading-relaxed">
              Aprenda a demonstrar o sistema para encantar novos clientes no varejo e domine cada tela operacional (PDV, Estoque, Financeiro e Fiscal) com agilidade e clareza.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/pdv"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
            >
              <Store size={16} />
              <span>Testar Frente de Caixa</span>
            </Link>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold backdrop-blur-md border border-white/20 transition-all"
            >
              <Printer size={16} />
              <span>Imprimir Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MENU DE ABAS DO GUIA ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-gray-200">
        <TabButton
          active={activeTab === "PITCH"}
          onClick={() => setActiveTab("PITCH")}
          icon={<Target size={16} />}
          label="1. Roteiro Comercial (Pitch)"
        />
        <TabButton
          active={activeTab === "DASHBOARD"}
          onClick={() => setActiveTab("DASHBOARD")}
          icon={<LayoutDashboard size={16} />}
          label="2. Dashboard Executivo"
        />
        <TabButton
          active={activeTab === "PDV"}
          onClick={() => setActiveTab("PDV")}
          icon={<Store size={16} />}
          label="3. Frente de Caixa (PDV)"
        />
        <TabButton
          active={activeTab === "STOCK"}
          onClick={() => setActiveTab("STOCK")}
          icon={<Package size={16} />}
          label="4. Estoque & Balança"
        />
        <TabButton
          active={activeTab === "FINANCE"}
          onClick={() => setActiveTab("FINANCE")}
          icon={<Wallet size={16} />}
          label="5. Financeiro & DRE"
        />
        <TabButton
          active={activeTab === "FISCAL"}
          onClick={() => setActiveTab("FISCAL")}
          icon={<Receipt size={16} />}
          label="6. Fiscal & Contábil"
        />
        <TabButton
          active={activeTab === "RESTAURANT"}
          onClick={() => setActiveTab("RESTAURANT")}
          icon={<Utensils size={16} />}
          label="7. Mesas & Restaurante"
        />
      </div>

      {/* ── CONTEÚDO DAS ABAS ── */}
      <div className="space-y-6">
        {/* ABA 1: ROTEIRO COMERCIAL (PITCH DE VENDAS) */}
        {activeTab === "PITCH" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  !
                </div>
                <h3 className="font-bold text-gray-900 text-base">As 4 Maiores Dores do Lojista</h3>
                <ul className="space-y-2.5 text-xs text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span><strong>Filas e lentidão no caixa:</strong> clientes desistem da compra quando o PDV trava.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span><strong>Furo de estoque e rupturas:</strong> faltar produto chave na gôndola e perder vendas.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span><strong>Incerteza do lucro real:</strong> faturar muito mas não saber para onde o dinheiro foi no fim do mês.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span><strong>Preço errado na prateleira:</strong> multa e constrangimento na hora de passar no leitor.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  ✓
                </div>
                <h3 className="font-bold text-gray-900 text-base">Como o Cybertech RP Resolve</h3>
                <ul className="space-y-2.5 text-xs text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>PDV Ultra-Rápido:</strong> venda em 10 segundos com PIX dinâmico e leitor veloz.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Entrada por XML:</strong> cadastro automático de produtos com margem e tributação exatas.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>DRE em Tempo Real:</strong> cálculo do lucro líquido diário considerando taxas e custos.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Sincronização com Balanças:</strong> integração direta com Toledo MGV6 e etiquetas térmicas.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-md space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold">
                  ★
                </div>
                <h3 className="font-bold text-white text-base">Roteiro de 5 Minutos (Pitch)</h3>
                <p className="text-xs text-blue-100 leading-relaxed">
                  "Sr. Cliente, o Cybertech RP foi construído para que sua equipe nunca mais sofra com filas, erros fiscais ou descontrole no estoque. Deixe-me mostrar uma venda real no PDV e como ela atualiza o financeiro instantaneamente."
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab("PDV")}
                    className="w-full py-2.5 bg-white text-blue-900 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    Ver Demonstração do PDV →
                  </button>
                </div>
              </div>
            </div>

            {/* Dica de Apresentação */}
            <div className="bg-amber-50 border border-amber-200/60 rounded-3xl p-5 flex items-start gap-4">
              <Lightbulb size={24} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Dica de Ouro para a Apresentação:
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Use sempre o usuário <strong>demonstrativo</strong> (com senha <strong>1234</strong>) para apresentar! Ele já contém produtos cadastrados de alto valor perceptível (Picanha Angus, Cervejas importadas, Queijos especiais) e 59 vendas registradas que preenchem os gráficos com visual profissional.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: DASHBOARD EXECUTIVO */}
        {activeTab === "DASHBOARD" && (
          <div className="space-y-6">
            {/* Visual Mockup do Dashboard */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-slate-400 font-mono ml-2">Visão Executiva - Dashboard Gerencial</span>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full font-bold">
                  ● 0.7s Tempo de Resposta
                </span>
              </div>

              {/* Cards Mockup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Faturamento Mês</p>
                  <p className="text-xl font-black text-white">R$ 48.290,00</p>
                  <span className="text-[10px] text-emerald-400 font-bold">+18,4% vs mês anterior</span>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Ticket Médio</p>
                  <p className="text-xl font-black text-white">R$ 64,80</p>
                  <span className="text-[10px] text-blue-400 font-bold">59 atendimentos</span>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Mix de Meios de Pagamento</p>
                  <p className="text-xl font-black text-white">Pix (46%)</p>
                  <span className="text-[10px] text-slate-400">Cartão 38% | Dinheiro 16%</span>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Rupturas de Estoque</p>
                  <p className="text-xl font-black text-emerald-400">0 Rupturas</p>
                  <span className="text-[10px] text-slate-400">Estoque 100% abastecido</span>
                </div>
              </div>
            </div>

            {/* O que falar e o que mostrar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span>
                  O que Falar ao Cliente:
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  "O Dashboard é a bússola do gestor. Em uma única tela, você sabe exatamente quanto faturou hoje, seu ticket médio por cliente e quais formas de pagamento entraram no caixa. Sem relatórios demorados: abriu a tela, tudo carrega em menos de 1 segundo."
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</span>
                  Onde Clicar para Demonstrar:
                </h3>
                <ul className="text-xs text-gray-600 space-y-2">
                  <li>• Clique nos filtros de <strong>Hoje / Semana / Mês</strong> para mostrar a atualização instantânea.</li>
                  <li>• Aponte o card de <strong>Rupturas</strong> explicando como ele avisa antes do produto faltar na prateleira.</li>
                  <li>• Mostre a lista de <strong>Top Produtos</strong> com os campeões de venda.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: FRENTE DE CAIXA (PDV) */}
        {activeTab === "PDV" && (
          <div className="space-y-6">
            {/* Visual Mockup da Tela do PDV */}
            <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <Store className="text-blue-400" size={20} />
                  <div>
                    <h3 className="font-bold text-sm text-white">PDV Frente de Caixa - Caixa 01 Aberto</h3>
                    <p className="text-[11px] text-slate-400">Operador: Cristiano | Modo Varejo Rápido</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-900/60 text-blue-300 border border-blue-700/50 rounded-lg text-xs font-mono font-bold">
                    F2: Nova Venda
                  </span>
                  <span className="px-3 py-1 bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 rounded-lg text-xs font-mono font-bold">
                    F4: Finalizar
                  </span>
                </div>
              </div>

              {/* Itens Bipados Simulados */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase">Itens da Compra (Cesto)</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl">
                      <div>
                        <p className="font-bold text-white">1x Picanha Bovina Angus Resfriada (1,250 kg)</p>
                        <p className="text-[10px] text-slate-400">789100000001 • R$ 89,90/kg</p>
                      </div>
                      <p className="font-mono font-black text-emerald-400 text-sm">R$ 112,38</p>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl">
                      <div>
                        <p className="font-bold text-white">6x Cerveja Heineken Long Neck 330ml</p>
                        <p className="text-[10px] text-slate-400">789100000005 • R$ 7,99 un</p>
                      </div>
                      <p className="font-mono font-black text-emerald-400 text-sm">R$ 47,94</p>
                    </div>
                  </div>
                </div>

                {/* Totalizador do PDV */}
                <div className="bg-gradient-to-b from-blue-950 to-indigo-950 rounded-2xl p-5 border border-blue-800/50 flex flex-col justify-between">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-blue-300 uppercase">Total a Pagar</p>
                    <p className="text-3xl font-black text-white font-mono">R$ 160,32</p>
                    <div className="pt-2 flex items-center gap-2 text-xs text-blue-200">
                      <QrCode size={16} className="text-emerald-400" />
                      <span>Pix com baixa automática</span>
                    </div>
                  </div>

                  <Link
                    href="/pdv"
                    className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-center text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    Abrir PDV na Prática →
                  </Link>
                </div>
              </div>
            </div>

            {/* Roteiro de Demonstração do PDV */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-sm">Roteiro de Demonstração em 3 Passos:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="text-xs font-black text-blue-600">PASSO 1</div>
                  <h4 className="font-bold text-gray-900 text-xs">Bipar o Produto</h4>
                  <p className="text-xs text-gray-600">
                    Digite o código de barras ou nome (ex: "Picanha" ou "Heineken") e aperte <strong>Enter</strong>. O item cai instantaneamente na tela.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="text-xs font-black text-blue-600">PASSO 2</div>
                  <h4 className="font-bold text-gray-900 text-xs">Escolher Pagamento</h4>
                  <p className="text-xs text-gray-600">
                    Aperte <strong>F4</strong> ou clique em Pagamento. Escolha <strong>Pix</strong>, <strong>Cartão</strong> ou <strong>Dinheiro</strong> com cálculo de troco automático.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="text-xs font-black text-blue-600">PASSO 3</div>
                  <h4 className="font-bold text-gray-900 text-xs">Emitir Cupom & Baixa</h4>
                  <p className="text-xs text-gray-600">
                    Ao confirmar, o cupom NFC-e é gerado na impressora térmica e o estoque e faturamento são atualizados no mesmo segundo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: ESTOQUE & BALANÇAS */}
        {activeTab === "STOCK" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Barcode size={20} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Entrada Rápida por XML</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Basta arrastar o XML da nota de compra do fornecedor. O sistema cadastra os produtos que não existiam, atualiza custos e calcula o preço de venda com base na margem cadastrada.
                </p>
                <Link href="/invoices" className="text-xs font-bold text-blue-600 hover:underline inline-block pt-1">
                  Acessar Entrada de Notas →
                </Link>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Tag size={20} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Etiquetas de Gôndola</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Gerador inteligente de etiquetas para prateleira (com preço grande, código de barras e unidade). Imprima em folha adesiva ou impressora térmica Zebra/Argox.
                </p>
                <Link href="/labels" className="text-xs font-bold text-blue-600 hover:underline inline-block pt-1">
                  Ver Módulo de Etiquetas →
                </Link>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  ⚖️
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Balanças Toledo (MGV6)</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Exportação de arquivo de carga (`ITENSTX.TXT`) para as balanças de peso variável de açougue, padaria e frios com apenas 1 clique.
                </p>
                <Link href="/scales" className="text-xs font-bold text-blue-600 hover:underline inline-block pt-1">
                  Ver Carga de Balanças →
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-gray-900">Quer ver o catálogo de produtos no ambiente de demonstração?</h4>
                <p className="text-xs text-gray-500 mt-0.5">Estão cadastrados 20 itens com estoque, custos e preços prontos para teste.</p>
              </div>
              <Link
                href="/stock"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                Abrir Estoque de Produtos
              </Link>
            </div>
          </div>
        )}

        {/* ABA 5: FINANCEIRO & DRE */}
        {activeTab === "FINANCE" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-base">DRE Gerencial em Tempo Real</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Mostre ao cliente como o sistema separa <strong>Receita Bruta</strong>, <strong>Custos de Mercadoria (CMV)</strong>, <strong>Taxas de Cartão</strong> e <strong>Despesas Operacionais</strong>, entregando o <strong>Lucro Líquido Real</strong>.
              </p>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 font-mono text-xs space-y-2">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>(+) RECEITA BRUTA DE VENDAS</span>
                  <span className="text-emerald-600">R$ 48.290,00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>(-) Custo das Mercadorias Vendidas (CMV)</span>
                  <span className="text-red-500">- R$ 28.974,00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>(-) Taxas de Cartão & Impostos</span>
                  <span className="text-red-500">- R$ 2.414,50</span>
                </div>
                <div className="border-t border-slate-300 pt-2 flex justify-between font-black text-slate-900 text-sm">
                  <span>(=) LUCRO LÍQUIDO DO PERÍODO</span>
                  <span className="text-emerald-600">R$ 16.901,50 (35%)</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href="/finance"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  Abrir Painel Financeiro →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ABA 6: FISCAL & CONTÁBIL */}
        {activeTab === "FISCAL" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Emissão NFC-e e NF-e Instantânea</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Emissão direta com a SEFAZ em menos de 2 segundos. Sem necessidade de servidores locais pesados. Contingência offline automática quando a internet oscilar.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Envio Mensal para o Contador</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  No fim do mês, o lojista não precisa perder horas separando notas. Com 1 clique o sistema compacta todos os XMLs e relatórios de vendas e envia direto para o e-mail da contabilidade.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ABA 7: RESTAURANTE, MESAS & COMANDAS */}
        {activeTab === "RESTAURANT" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-base">Módulo Food: Mesas, Comandas & Cozinha (KDS)</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Ideal para empórios com cafeteria, restaurantes, hamburguerias e padarias que precisam de controle de atendimento na mesa e tela de produção na cozinha.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <Link
                  href="/restaurant/pdv"
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all group"
                >
                  <p className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                    1. Mapa de Mesas & Comandas →
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Abertura e fechamento rápido de contas por mesa.</p>
                </Link>

                <Link
                  href="/restaurant/kds"
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all group"
                >
                  <p className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                    2. Tela da Cozinha (KDS) →
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Pedidos enviados em tempo real sem papel.</p>
                </Link>

                <Link
                  href="/restaurant/recipes"
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all group"
                >
                  <p className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                    3. Fichas Técnicas & Receitas →
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Baixa automática de insumos (carne, queijo, pão).</p>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
          : "bg-white text-gray-600 hover:text-gray-900 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

