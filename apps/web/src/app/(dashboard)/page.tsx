import {
  ArrowUpRight, ArrowDownRight, DollarSign, Package, Users, ShoppingCart,
  TrendingUp, Trophy, Target, AlertTriangle, CheckCircle2, Info, ChevronLeft,
  ChevronRight, RefreshCcw, Landmark, Receipt, Scale, Kanban, ClipboardList,
  BarChart2, Store, Settings, CreditCard
} from "lucide-react";
import { getSellerPerformance } from "@/actions/seller";
import { getStoreRanking, getCategoryMix, getDashboardStats, getSalesChartData, getDashboardAlerts, getWelcomeData } from "@/actions/dashboard";
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
    { orders: productionOrdersList, recipes: productionRecipesList }
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

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const faturamentoHoje = stats?.faturamento || 28450.90;

  return (
    <div className="space-y-5 text-gray-800 font-sans pb-16">

      {/* ── 1. TOP 5 KPI CARDS COM MODAIS INTERATIVOS ── */}
      <KpiCardsSection />

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
                <path strokeDasharray="36, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2563eb" strokeWidth="4.5" />
                <path strokeDasharray="31, 100" strokeDashoffset="-36" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#06b6d4" strokeWidth="4.5" />
                <path strokeDasharray="23, 100" strokeDashoffset="-67" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="4.5" />
                <path strokeDasharray="10, 100" strokeDashoffset="-90" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#8b5cf6" strokeWidth="4.5" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] text-gray-400 font-bold uppercase">Total</span>
                <span className="text-[10px] font-black text-gray-800 font-mono leading-tight">R$ 28.450,90</span>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex-1 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /> Dinheiro</span>
                <span className="font-mono text-gray-500">R$ 6.450,90 <span className="text-gray-400 font-bold ml-1">23%</span></span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Cartão Débito</span>
                <span className="font-mono text-gray-500">R$ 8.880,50 <span className="text-gray-400 font-bold ml-1">31%</span></span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Cartão Crédito</span>
                <span className="font-mono text-gray-500">R$ 10.250,30 <span className="text-gray-400 font-bold ml-1">36%</span></span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> PIX</span>
                <span className="font-mono text-gray-500">R$ 2.850,20 <span className="text-gray-400 font-bold ml-1">10%</span></span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400" /> Outros</span>
                <span className="font-mono text-gray-500">R$ 0,00 <span className="text-gray-400 font-bold ml-1">0%</span></span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-2 flex justify-between items-center text-xs mt-2">
            <span className="text-gray-400">Total</span>
            <span className="text-gray-900 font-mono font-bold text-sm">R$ 28.450,90</span>
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

          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                <ShoppingCart size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">Venda realizada</p>
                <p className="text-[10px] text-gray-400 truncate">#12345 - João Silva</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold text-gray-900">R$ 89,90</p>
                <p className="text-[10px] text-gray-400">2 min atrás</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                <Receipt size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">Pedido recebido</p>
                <p className="text-[10px] text-gray-400 truncate">#4321 - Mercadão Bom Preço</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold text-gray-900">R$ 1.250,00</p>
                <p className="text-[10px] text-gray-400">12 min atrás</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                <Package size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">Produto atualizado</p>
                <p className="text-[10px] text-gray-400 truncate">Fraldas | Online - Estoque +5 un.</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold text-gray-900">R$ 156,80</p>
                <p className="text-[10px] text-gray-400">1 hora atrás</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <DollarSign size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">Pagamento recebido</p>
                <p className="text-[10px] text-gray-400 truncate">#12344 - Maria Santos</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold text-gray-900">R$ 156,80</p>
                <p className="text-[10px] text-gray-400">1 hora atrás</p>
              </div>
            </div>
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

          <div className="space-y-3.5 flex-1">
            {[
              { name: "Loja Centro", val: "R$ 12.450,90", pct: "↑ +8,2%", width: "85%" },
              { name: "Loja Shopping", val: "R$ 3.750,30", pct: "↑ +15,7%", width: "35%" },
              { name: "Loja Bairro", val: "R$ 5.890,40", pct: "↑ +12,1%", width: "55%" },
              { name: "Loja Online", val: "R$ 1.359,30", pct: "↑ +6,3%", width: "20%" },
            ].map((s, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-700">{s.name}</span>
                  <span className="font-mono font-bold text-gray-900">{s.val} <span className="text-[10px] font-bold text-green-600 ml-1">{s.pct}</span></span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: s.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Produtos Mais Vendidos com filtro Dia / Semana / Mês */}
        <TopProductsCard />

      </div>

    </div>
  );
}
