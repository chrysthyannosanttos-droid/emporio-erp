export const dynamic = "force-dynamic";

import {
  ArrowUpRight, ArrowDownRight, DollarSign, Package, Users, ShoppingCart,
  TrendingUp, Trophy, Target, AlertTriangle, CheckCircle2, Info, ChevronLeft,
  ChevronRight, RefreshCcw, Landmark, Receipt, Scale, Kanban, ClipboardList,
  BarChart2, Store, Settings, CreditCard
} from "lucide-react";
import { getSellerPerformance } from "@/actions/seller";
import {
  getStoreRanking,
  getCategoryMix,
  getDashboardStats,
  getSalesChartData,
  getDashboardAlerts,
  getWelcomeData,
  getDashboardOverview
} from "@/actions/dashboard";
import { getCompanyModulesConfig } from "@/actions/modules";
import { getDistributorDashboardStats } from "@/actions/distributorDashboard";
import { getProductionOrders } from "@/actions/productionOrder";
import { DistributorDashboard } from "./_components/DistributorDashboard";
import { FactoryDashboard } from "./_components/FactoryDashboard";
import { TopProductsCard } from "./_components/TopProductsCard";
import { KpiCardsSection } from "./_components/KpiCardsSection";
import { networkInterfaces } from "os";

function getLocalIp() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

export default async function Dashboard() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const localIp = getLocalIp();

  const [
    { operationTypes },
    { performance: sellers },
    { stats },
    { chartData, normalizedData },
    { alerts },
    welcomeData,
    { ranking },
    { mix },
    { stats: distributorStats },
    { orders: productionOrdersList, recipes: productionRecipesList },
    overview
  ] = await Promise.all([
    getCompanyModulesConfig(),
    getSellerPerformance(),
    getDashboardStats(),
    getSalesChartData(7),
    getDashboardAlerts(),
    getWelcomeData(),
    getStoreRanking(currentMonth, currentYear),
    getCategoryMix(currentMonth, currentYear),
    getDistributorDashboardStats(),
    getProductionOrders(),
    getDashboardOverview(),
  ]);

  // Se a empresa for primariamente DISTRIBUTOR ou WHOLESALE, exibir o Dashboard de Distribuição
  if (operationTypes.includes("DISTRIBUTOR") || operationTypes.includes("WHOLESALE")) {
    return <DistributorDashboard stats={distributorStats as any} sellers={sellers} />;
  }

  // Se a empresa for primariamente FACTORY ou PRODUCTION, exibir o Dashboard Industrial
  if (operationTypes.includes("FACTORY") || operationTypes.includes("PRODUCTION")) {
    const plannedTotal = productionOrdersList.reduce((acc: number, op: any) => acc + (op.plannedQty || 0), 0);
    const producedTotal = productionOrdersList.reduce((acc: number, op: any) => acc + (op.producedQty || 0), 0);

    return (
      <FactoryDashboard
        ordersCount={productionOrdersList.length}
        recipesCount={productionRecipesList.length}
        plannedTotal={plannedTotal}
        producedTotal={producedTotal}
      />
    );
  }

  const { payments, recentMovements, storesPerformance, topProducts, kpis, soldItemsList, rupturesList } = overview;
  const totalPagamentos = payments.total || 0;

  // Cálculo percentuais para o donut
  const pctDinheiro = totalPagamentos > 0 ? (payments.dinheiro / totalPagamentos) * 100 : 0;
  const pctDebito = totalPagamentos > 0 ? (payments.debito / totalPagamentos) * 100 : 0;
  const pctCredito = totalPagamentos > 0 ? (payments.credito / totalPagamentos) * 100 : 0;
  const pctPix = totalPagamentos > 0 ? (payments.pix / totalPagamentos) * 100 : 0;
  const pctOutros = totalPagamentos > 0 ? (payments.outros / totalPagamentos) * 100 : 0;

  // Donut SVG offsets
  const offsetDebito = -pctDinheiro;
  const offsetCredito = offsetDebito - pctDebito;
  const offsetPix = offsetCredito - pctCredito;

  return (
    <div className="space-y-5 text-gray-800 font-sans pb-16">

      {/* ── 1. TOP 5 KPI CARDS COM MODAIS INTERATIVOS CONECTADOS AO BANCO ── */}
      <KpiCardsSection
        faturamentoHoje={kpis.faturamentoHoje}
        faturamentoOntem={kpis.faturamentoOntem}
        faturamentoTrend={kpis.faturamentoTrend}
        sparklineFat={kpis.sparklineFat}
        margemBruta={kpis.margemBruta}
        margemTrend={kpis.margemTrend}
        sparklineMargem={kpis.sparklineMargem}
        ticketMedio={kpis.ticketMedio}
        ticketTrend={kpis.ticketTrend}
        sparklineTicket={kpis.sparklineTicket}
        itensVendidosHoje={kpis.itensVendidosHoje}
        itensVendidosOntem={kpis.itensVendidosOntem}
        itensTrend={kpis.itensTrend}
        sparklineItens={kpis.sparklineItens}
        rupturasCount={kpis.rupturasCount}
        sparklineRupturas={kpis.sparklineRupturas}
        soldItemsList={soldItemsList}
        rupturesList={rupturesList}
      />

      {/* ── 2. SEÇÃO PRINCIPAL (PAGAMENTOS + MOVIMENTAÇÕES + PERFORMANCE + TOP PRODUTOS) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Formas de Pagamento */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">FORMAS DE PAGAMENTO</h3>
            </div>
            <BarChart2 size={14} className="text-gray-400" />
          </div>

          <div className="flex items-center justify-between gap-4 my-2">
            {/* Gráfico de Rosca (Donut SVG) */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {totalPagamentos === 0 ? (
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="4.5" />
                ) : (
                  <>
                    {pctDinheiro > 0 && (
                      <path
                        strokeDasharray={`${pctDinheiro}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="4.5"
                      />
                    )}
                    {pctDebito > 0 && (
                      <path
                        strokeDasharray={`${pctDebito}, 100`}
                        strokeDashoffset={offsetDebito}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="4.5"
                      />
                    )}
                    {pctCredito > 0 && (
                      <path
                        strokeDasharray={`${pctCredito}, 100`}
                        strokeDashoffset={offsetCredito}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="4.5"
                      />
                    )}
                    {pctPix > 0 && (
                      <path
                        strokeDasharray={`${pctPix}, 100`}
                        strokeDashoffset={offsetPix}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="4.5"
                      />
                    )}
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] text-gray-400 font-bold uppercase">Total</span>
                <span className="text-[10px] font-black text-gray-800 font-mono leading-tight">
                  R$ {totalPagamentos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex-1 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /> Dinheiro</span>
                <span className="font-mono text-gray-500">
                  R$ {payments.dinheiro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} <span className="text-gray-400 font-bold ml-1">{pctDinheiro.toFixed(0)}%</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Cartão Débito</span>
                <span className="font-mono text-gray-500">
                  R$ {payments.debito.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} <span className="text-gray-400 font-bold ml-1">{pctDebito.toFixed(0)}%</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Cartão Crédito</span>
                <span className="font-mono text-gray-500">
                  R$ {payments.credito.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} <span className="text-gray-400 font-bold ml-1">{pctCredito.toFixed(0)}%</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> PIX</span>
                <span className="font-mono text-gray-500">
                  R$ {payments.pix.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} <span className="text-gray-400 font-bold ml-1">{pctPix.toFixed(0)}%</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400" /> Outros</span>
                <span className="font-mono text-gray-500">
                  R$ {payments.outros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} <span className="text-gray-400 font-bold ml-1">{pctOutros.toFixed(0)}%</span>
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-2 flex justify-between items-center text-xs mt-2">
            <span className="text-gray-400">Total Vendas Hoje</span>
            <span className="text-gray-900 font-mono font-bold text-sm">
              R$ {totalPagamentos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Movimentações Recentes */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">MOVIMENTAÇÕES RECENTES</h3>
            </div>
            <a href="/sales" className="text-xs font-bold text-blue-600 hover:text-blue-700">Ver todos</a>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {recentMovements.length === 0 ? (
              <div className="py-8 text-center text-gray-400 flex flex-col items-center justify-center">
                <TrendingUp size={32} className="text-gray-300 mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-gray-700">Nenhuma movimentação hoje</p>
                <p className="text-[10px] text-gray-400 mt-0.5">As vendas concluídas aparecerão aqui.</p>
              </div>
            ) : (
              recentMovements.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                    <ShoppingCart size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{m.title}</p>
                    <p className="text-[10px] text-gray-400 truncate">{m.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-bold text-gray-900">
                      R$ {m.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-gray-400">{m.timeText}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Performance das Lojas */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Store size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">PERFORMANCE DAS LOJAS</h3>
            </div>
            <a href="/reports" className="text-xs font-bold text-blue-600 hover:text-blue-700">Ver todos</a>
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {storesPerformance.length === 0 ? (
              <div className="py-8 text-center text-gray-400 flex flex-col items-center justify-center">
                <Store size={32} className="text-gray-300 mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-gray-700">Empório Agrobélem - Matriz</p>
                <p className="text-[10px] text-gray-400 mt-0.5">R$ 0,00 faturados hoje</p>
              </div>
            ) : (
              storesPerformance.map((s, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-700 truncate max-w-[140px]">{s.name}</span>
                    <span className="font-mono font-bold text-gray-900">
                      {s.val} <span className="text-[10px] font-bold text-green-600 ml-1">{s.pct}</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: s.width }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Produtos Mais Vendidos com filtro Dia / Semana / Mês */}
        <TopProductsCard data={topProducts} />

      </div>

    </div>
  );
}
