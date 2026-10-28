import { 
  ArrowUpRight, ArrowDownRight, DollarSign, Package, Users, ShoppingCart, 
  TrendingUp, Trophy, Target, AlertTriangle, CheckCircle2, Info, ChevronLeft, 
  ChevronRight, RefreshCcw, Landmark, Receipt, Scale, Kanban, ClipboardList,
  BarChart2, Store, Settings
} from "lucide-react";
import { getSellerPerformance } from "@/actions/seller";
import { getStoreRanking, getCategoryMix, getDashboardStats, getSalesChartData, getDashboardAlerts, getWelcomeData } from "@/actions/dashboard";
import { getCompanyModulesConfig } from "@/actions/modules";
import { getDistributorDashboardStats } from "@/actions/distributorDashboard";
import { getProductionOrders } from "@/actions/productionOrder";
import { DistributorDashboard } from "./_components/DistributorDashboard";
import { FactoryDashboard } from "./_components/FactoryDashboard";
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
  }  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const faturamentoHoje = stats?.faturamento || 28450.90;

  return (
    <div className="space-y-6 text-slate-100 font-sans">

      {/* ── 1. TOP 5 KPI CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Faturamento Hoje */}
        <div className="bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
              <ArrowUpRight size={12} />
              <span>+16,8%</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Faturamento Hoje</span>
            <div className="text-xl font-black text-white font-mono mt-0.5 tracking-tight">
              {formatter.format(faturamentoHoje)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">vs ontem <span className="text-emerald-400 font-semibold">↑ 16,8%</span></span>
          </div>
        </div>

        {/* Card 2: Margem Bruta */}
        <div className="bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
              <ArrowUpRight size={12} />
              <span>+1,2%</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Margem Bruta</span>
            <div className="text-xl font-black text-white font-mono mt-0.5 tracking-tight">
              28,4%
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">vs ontem <span className="text-emerald-400 font-semibold">↑ 1,2%</span></span>
          </div>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
              <Receipt size={20} />
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
              <ArrowUpRight size={12} />
              <span>+3,4%</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ticket Médio</span>
            <div className="text-xl font-black text-white font-mono mt-0.5 tracking-tight">
              R$ 15,77
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">vs ontem <span className="text-emerald-400 font-semibold">↑ 3,4%</span></span>
          </div>
        </div>

        {/* Card 4: Itens Vendidos */}
        <div className="bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
              <Package size={20} />
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
              <ArrowUpRight size={12} />
              <span>+12,6%</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Itens Vendidos</span>
            <div className="text-xl font-black text-white font-mono mt-0.5 tracking-tight">
              1.804
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">vs ontem <span className="text-emerald-400 font-semibold">↑ 12,6%</span></span>
          </div>
        </div>

        {/* Card 5: Rupturas */}
        <div className="bg-[#0f1426] border border-rose-500/20 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-rose-500/40 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold">
              <AlertTriangle size={20} />
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">
              <span>5 ruptura</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rupturas</span>
            <div className="text-xl font-black text-white font-mono mt-0.5 tracking-tight">
              5
            </div>
            <span className="text-[10px] text-rose-400 mt-1 block">produtos em falta</span>
          </div>
        </div>
      </div>

      {/* ── 2. SEÇÃO CENTRAL (GRÁFICO + TOP PRODUTOS + ALERTAS) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Gráfico de Faturamento 7 Dias (Coluna 1-6) */}
        <div className="lg:col-span-6 bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faturamento dos últimos 7 dias</span>
                <Info size={13} className="text-slate-500" />
              </div>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-2xl font-black text-white font-mono tracking-tight">R$ 196.540,50</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                  ↑ 23,5% <span className="text-slate-400 font-normal">vs 7 dias anteriores</span>
                </span>
              </div>
            </div>
            <select className="bg-[#161c33] border border-indigo-500/20 text-slate-300 text-xs px-3 py-1.5 rounded-xl font-medium outline-none">
              <option>Faturamento</option>
              <option>Quantidade</option>
              <option>Lucro Bruto</option>
            </select>
          </div>

          {/* Gráfico de Linha Suave SVG com Gradiente Roxo */}
          <div className="mt-6 relative h-48 w-full flex flex-col justify-end">
            <svg className="w-full h-36 overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Linha de Grade Horizontal */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="#ffffff10" strokeDasharray="4" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#ffffff10" strokeDasharray="4" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="#ffffff10" strokeDasharray="4" />

              {/* Curva e Preenchimento Gradiente */}
              <path
                d="M 0,90 C 80,75 120,60 160,50 C 200,40 240,20 280,30 C 320,40 360,50 400,35 C 440,20 480,10 500,5 L 500,120 L 0,120 Z"
                fill="url(#purpleGrad)"
              />
              <path
                d="M 0,90 C 80,75 120,60 160,50 C 200,40 240,20 280,30 C 320,40 360,50 400,35 C 440,20 480,10 500,5"
                fill="none"
                stroke="#818cf8"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Pontos com Brilho */}
              <circle cx="0" cy="90" r="4" fill="#818cf8" stroke="#ffffff" strokeWidth="2" />
              <circle cx="80" cy="75" r="4" fill="#818cf8" stroke="#ffffff" strokeWidth="2" />
              <circle cx="160" cy="50" r="4" fill="#818cf8" stroke="#ffffff" strokeWidth="2" />
              <circle cx="240" cy="20" r="4" fill="#818cf8" stroke="#ffffff" strokeWidth="2" />
              <circle cx="320" cy="30" r="4" fill="#818cf8" stroke="#ffffff" strokeWidth="2" />
              <circle cx="400" cy="35" r="4" fill="#818cf8" stroke="#ffffff" strokeWidth="2" />
              <circle cx="500" cy="5" r="5" fill="#a5b4fc" stroke="#ffffff" strokeWidth="2" className="animate-pulse" />
            </svg>

            {/* Rótulos dos Dias */}
            <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-2 px-1">
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
              <span>Dom</span>
              <span>Seg</span>
              <span className="text-indigo-400 font-bold">Hoje</span>
            </div>
          </div>
        </div>

        {/* Top Produtos (Coluna 7-9) */}
        <div className="lg:col-span-3 bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Top Produtos</h3>
            <a href="/stock/new" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Ver todos</a>
          </div>

          <div className="space-y-3 flex-1">
            {[
              { rank: 1, icon: "🥩", name: "Picanha Bovina", val: "R$ 4.250,90", pct: "+ 18,5%" },
              { rank: 2, icon: "🥤", name: "Coca-Cola 2L", val: "R$ 2.890,50", pct: "+ 12,3%" },
              { rank: 3, icon: "🌾", name: "Arroz Tipo 1 5kg", val: "R$ 2.450,00", pct: "+ 9,7%" },
              { rank: 4, icon: "🍗", name: "Frango Congelado", val: "R$ 2.120,30", pct: "+ 8,1%" },
              { rank: 5, icon: "🥛", name: "Leite Integral 1L", val: "R$ 1.890,80", pct: "+ 7,2%" },
            ].map((p) => (
              <div key={p.rank} className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-indigo-500/5 transition-colors">
                <span className="text-xs font-extrabold text-slate-400 w-4 text-center">{p.rank}</span>
                <div className="w-8 h-8 rounded-lg bg-[#161c33] border border-indigo-500/10 flex items-center justify-center text-sm shrink-0">
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-slate-200">{p.val}</p>
                  <p className="text-[10px] font-bold text-emerald-400">{p.pct}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Avisos e Alertas (Coluna 10-12) */}
        <div className="lg:col-span-3 bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Avisos e Alertas</h3>
            <a href="/stock" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Ver todos</a>
          </div>

          <div className="space-y-3 flex-1">
            {/* Alerta 1 */}
            <div className="bg-[#18152b] border border-rose-500/20 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-rose-500/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-rose-300 truncate">5 produtos em ruptura</p>
                <p className="text-[10px] text-slate-400 truncate">Clique para ver os produtos</p>
              </div>
              <ChevronRight size={16} className="text-slate-500 shrink-0" />
            </div>

            {/* Alerta 2 */}
            <div className="bg-[#241e1a] border border-amber-500/20 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-amber-500/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-300 truncate">2 pedidos atrasados</p>
                <p className="text-[10px] text-slate-400 truncate">Necessitam de atenção</p>
              </div>
              <ChevronRight size={16} className="text-slate-500 shrink-0" />
            </div>

            {/* Alerta 3 */}
            <div className="bg-[#141d33] border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-indigo-500/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Package size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-indigo-300 truncate">Estoque baixo</p>
                <p className="text-[10px] text-slate-400 truncate">12 produtos com estoque baixo</p>
              </div>
              <ChevronRight size={16} className="text-slate-500 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. SEÇÃO INFERIOR (PAGAMENTOS + MOVIMENTAÇÕES + LOJAS + AÇÕES) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        
        {/* Formas de Pagamento (Coluna 1-3) */}
        <div className="lg:col-span-3 bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-5 flex flex-col justify-between shadow-md">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Formas de Pagamento</h3>
          
          <div className="flex items-center justify-between gap-4 my-2">
            {/* Gráfico de Rosca (Donut SVG) */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path strokeDasharray="35, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#6366f1" strokeWidth="4" />
                <path strokeDasharray="25, 100" strokeDashoffset="-35" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" strokeWidth="4" />
                <path strokeDasharray="24, 100" strokeDashoffset="-60" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="4" />
                <path strokeDasharray="10, 100" strokeDashoffset="-84" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#06b6d4" strokeWidth="4" />
              </svg>
            </div>

            {/* Legenda */}
            <div className="flex-1 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Dinheiro</span>
                <span className="font-mono text-slate-400">R$ 8.450,90 <span className="text-slate-500 font-sans">29%</span></span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Cartão Débito</span>
                <span className="font-mono text-slate-400">R$ 6.890,50 <span className="text-slate-500 font-sans">24%</span></span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Cartão Crédito</span>
                <span className="font-mono text-slate-400">R$ 10.250,30 <span className="text-slate-500 font-sans">35%</span></span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> PIX</span>
                <span className="font-mono text-slate-400">R$ 2.859,20 <span className="text-slate-500 font-sans">10%</span></span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600" /> Outros</span>
                <span className="font-mono text-slate-400">R$ 0,00 <span className="text-slate-500 font-sans">0%</span></span>
              </div>
            </div>
          </div>

          <div className="border-t border-indigo-500/10 pt-2 flex justify-between items-center text-xs mt-2">
            <span className="text-slate-400">Total</span>
            <span className="text-white font-mono font-bold text-sm">R$ 28.450,90</span>
          </div>
        </div>

        {/* Movimentações Recentes (Coluna 4-6) */}
        <div className="lg:col-span-3 bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Movimentações Recentes</h3>
            <a href="/sales" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Ver todos</a>
          </div>

          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShoppingCart size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">Venda realizada</p>
                <p className="text-[10px] text-slate-400 truncate">#12345 - João Silva</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold text-white">R$ 89,90</p>
                <p className="text-[10px] text-slate-500">2 min atrás</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <ClipboardList size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">Pedido recebido</p>
                <p className="text-[10px] text-slate-400 truncate">#54321 - Mercado Bom Preço</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold text-white">R$ 1.250,00</p>
                <p className="text-[10px] text-slate-500">15 min atrás</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Package size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">Produto atualizado</p>
                <p className="text-[10px] text-slate-400 truncate">Picanha Bovina - Estoque: 45 un.</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-500">1 hora atrás</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <DollarSign size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">Pagamento recebido</p>
                <p className="text-[10px] text-slate-400 truncate">#12344 - Maria Santos</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold text-white">R$ 156,80</p>
                <p className="text-[10px] text-slate-500">2 horas atrás</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance das Lojas (Coluna 7-9) */}
        <div className="lg:col-span-3 bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Performance das Lojas</h3>
            <a href="/reports" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Ver todos</a>
          </div>

          <div className="space-y-3.5 flex-1">
            {[
              { name: "Loja Centro", val: "R$ 12.450,90", pct: "+ 18,2%", width: "85%" },
              { name: "Loja Shopping", val: "R$ 8.750,30", pct: "+ 15,7%", width: "65%" },
              { name: "Loja Bairro", val: "R$ 5.890,40", pct: "+ 12,1%", width: "45%" },
              { name: "Loja Online", val: "R$ 1.359,30", pct: "+ 8,3%", width: "25%" },
            ].map((s, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">{s.name}</span>
                  <span className="font-mono font-bold text-white">{s.val} <span className="text-[10px] font-bold text-emerald-400">{s.pct}</span></span>
                </div>
                <div className="h-1.5 w-full bg-[#161c33] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full" style={{ width: s.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ações Rápidas (Coluna 10-12) */}
        <div className="lg:col-span-3 bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-5 flex flex-col justify-between shadow-md">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Ações Rápidas</h3>

          <div className="grid grid-cols-3 gap-2.5 flex-1">
            <a href="/pdv" className="bg-[#141a33] hover:bg-indigo-600/30 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all group">
              <ShoppingCart size={20} className="text-indigo-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200">Nova Venda</span>
            </a>

            <a href="/distribution/orders" className="bg-[#141a33] hover:bg-indigo-600/30 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all group">
              <ClipboardList size={20} className="text-emerald-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200">Novo Pedido</span>
            </a>

            <a href="/stock/new" className="bg-[#141a33] hover:bg-indigo-600/30 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all group">
              <Package size={20} className="text-purple-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200">Adicionar Produto</span>
            </a>

            <a href="/reports" className="bg-[#141a33] hover:bg-indigo-600/30 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all group">
              <BarChart2 size={20} className="text-blue-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200">Relatório de Vendas</span>
            </a>

            <a href="/pdv" target="_blank" className="bg-[#141a33] hover:bg-indigo-600/30 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all group">
              <Store size={20} className="text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200">Abrir PDV</span>
            </a>

            <a href="/settings" className="bg-[#141a33] hover:bg-indigo-600/30 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all group">
              <Settings size={20} className="text-slate-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200">Mais Ações</span>
            </a>
          </div>
        </div>

      </div>

    </div>
  );
}

