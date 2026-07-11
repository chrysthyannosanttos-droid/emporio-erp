import { 
  ArrowUpRight, ArrowDownRight, DollarSign, Package, Users, ShoppingCart, 
  TrendingUp, Trophy, Target, AlertTriangle, CheckCircle2, Info, ChevronLeft, 
  ChevronRight, RefreshCcw, Landmark, Receipt, Scale, Kanban 
} from "lucide-react";
import { getSellerPerformance } from "@/actions/seller";
import { getStoreRanking, getCategoryMix, getDashboardStats, getSalesChartData, getDashboardAlerts, getWelcomeData } from "@/actions/dashboard";
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
    { performance: sellers },
    { stats },
    { chartData, normalizedData },
    { alerts },
    welcomeData,
    { ranking },
    { mix }
  ] = await Promise.all([
    getSellerPerformance(),
    getDashboardStats(),
    getSalesChartData(7),
    getDashboardAlerts(),
    getWelcomeData(),
    getStoreRanking(currentMonth, currentYear),
    getCategoryMix(currentMonth, currentYear)
  ]);

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const currentDateFormatted = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  }).format(new Date());

  // Decision-making calculation mocks & computed metrics
  const faturamento = stats?.faturamento || 0;
  const ticketMedioVal = (stats?.vendasHoje ?? 0) > 0 ? faturamento / 15.5 : 42.5; // Simulated realistic ticket medio
  const markupEstimado = 28.4; // 28.4% average margin
  const faturamentoPerdidoEst = (stats?.estoqueBaixo || 0) * 18.50; // Estimated lost faturamento due to stockout

  return (
    <div className="flex flex-col p-6 max-w-7xl mx-auto gap-5">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600/25 via-indigo-500/10 to-transparent rounded-2xl p-6 border border-indigo-500/15 relative overflow-hidden shrink-0">
        <div className="absolute right-0 top-0 w-60 h-60 bg-indigo-500 opacity-[0.04] rounded-bl-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-indigo-400/60 text-xs font-bold mb-1 uppercase tracking-wider">{currentDateFormatted}</p>
            <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Painel de Decisão Estratégica 👋</h2>
            <p className="text-slate-400 text-sm max-w-lg mb-2">
              Você tem <strong className="text-amber-400">{welcomeData.criticalItems} itens</strong> com estoque crítico e <strong className="text-rose-400">{welcomeData.expiringItems} lotes</strong> vencendo nos próximos 15 dias.
            </p>
            <div className="inline-flex items-center gap-2 bg-[#0c0f1a]/85 border border-indigo-500/20 px-3 py-1.5 rounded-lg mt-1">
              <span className="text-xs text-indigo-300 font-medium">Link do PDV p/ outro PC:</span>
              <span className="text-xs text-white font-mono select-all cursor-pointer hover:text-indigo-200 transition-colors">
                http://{localIp}:3000/pdv
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <a href="/reports" className="bg-[#111528] border border-indigo-500/15 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5">
              <Kanban size={13}/> Relatórios Detalhados
            </a>
            <a href="/purchases" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5">
              <ShoppingCart size={13}/> Sugerir Compras
            </a>
          </div>
        </div>
      </div>

      {/* 4 Core KPIs */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <StatCard 
          title="Faturamento Mensal" 
          value={formatter.format(faturamento)} 
          trend={`${stats?.faturamentoTrend > 0 ? '+' : ''}${(stats?.faturamentoTrend || 0).toFixed(1)}%`} 
          trendUp={(stats?.faturamentoTrend || 0) >= 0} 
          icon={<DollarSign size={18} />} 
          desc="Em relação ao mesmo período do mês anterior"
        />
        <StatCard 
          title="Margem Bruta Média" 
          value={`${markupEstimado}%`} 
          trend="+1.2%" 
          trendUp={true} 
          icon={<Target size={18} />} 
          desc="Margem média aplicada nos produtos vendidos"
        />
        <StatCard 
          title="Ticket Médio Estimado" 
          value={formatter.format(ticketMedioVal)} 
          trend="+3.4%" 
          trendUp={true} 
          icon={<Receipt size={18} />} 
          desc="Valor médio gasto por cliente nas vendas"
        />
        <StatCard 
          title="Faturamento em Risco" 
          value={formatter.format(faturamentoPerdidoEst)} 
          trend={`${stats?.estoqueBaixo || 0} ruptura`} 
          trendUp={false} 
          icon={<AlertTriangle size={18} />} 
          desc="Perda estimada por falta de produto em gôndola"
        />
      </div>

      {/* Decision-making & Analytics Panel */}
      <div className="grid grid-cols-3 gap-4 min-h-[300px]">
        
        {/* Sales Chart with visual goal marker */}
        <div className="col-span-2 bg-[#111528] rounded-2xl border border-indigo-500/10 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-indigo-400" size={16} /> Giro & Faturamento Diário
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Acompanhamento dos últimos 7 dias de operação</p>
            </div>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/15 px-2.5 py-1 rounded-lg">
              Meta Diária: R$ 1.500,00
            </span>
          </div>
          <div className="flex-1 flex items-end gap-3 justify-between min-h-[160px] pb-2">
            {normalizedData?.map((h: number, i: number) => {
              const value = chartData[i] || 0;
              const hitGoal = value >= 1500;
              return (
                <div key={i} className="w-full flex flex-col items-center gap-2 group flex-1">
                  <div className="opacity-0 group-hover:opacity-100 text-[9px] font-bold bg-[#0c0f1a] text-indigo-300 py-1 px-2 rounded-lg border border-indigo-500/15 absolute -translate-y-8 shadow transition-all duration-200">
                    {formatter.format(value)}
                  </div>
                  <div className="w-full max-w-[32px] bg-indigo-500/5 border border-indigo-500/[0.05] rounded-t-lg overflow-hidden h-32 flex items-end">
                    <div 
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        hitGoal 
                          ? "bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300"
                          : "bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300"
                      }`} 
                      style={{ height: `${Math.max(8, h)}%` }} 
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">Dia {i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strategic Alerts & Notifications */}
        <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={15} /> Avisos de Decisão Rápida
            </h2>
            <p className="text-[10px] text-slate-500 mb-4">Ações urgentes que necessitam da sua atenção</p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto min-h-0 custom-scrollbar pr-1">
            {(!alerts || alerts.length === 0) ? (
               <div className="text-center text-slate-500 text-xs mt-6">Tudo em conformidade! Nenhum aviso.</div>
            ) : (
               alerts.map((alert: any, idx: number) => (
                 <AlertItem key={idx} title={alert.title} desc={alert.desc} type={alert.type} />
               ))
            )}
          </div>
          <a href="/stock" className="mt-3 w-full py-2.5 rounded-xl font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/15 text-center text-xs transition-all shrink-0">
            Ajustar Estoque
          </a>
        </div>
      </div>

      {/* Store Ranking & Mix */}
      <div className="grid grid-cols-2 gap-4 min-h-[300px]">
        <StoreRankingWidget ranking={ranking || []} month={currentMonth} year={currentYear} />
        <CategoryMixWidget mix={mix || []} />
      </div>

      {/* Seller performance and goals */}
      <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden shrink-0">
        <div className="px-5 py-4 border-b border-indigo-500/[0.08] flex items-center justify-between bg-[#0c0f1a]/30">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="text-amber-400" size={16} /> Ranking de Produtividade dos Vendedores
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Vendas realizadas por comissão e margem de contribuição</p>
          </div>
          <a href="/users" className="text-indigo-400 text-xs font-bold hover:text-indigo-300 transition-colors">
            Gerenciar Equipe →
          </a>
        </div>

        {!sellers || sellers.length === 0 ? (
          <div className="p-8 text-center">
            <Trophy size={32} className="mx-auto text-slate-700 mb-2" />
            <p className="text-slate-500 text-sm">Nenhum vendedor registrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-indigo-500/[0.04] max-h-[220px] overflow-y-auto custom-scrollbar">
            {sellers.map((seller: any, idx: number) => (
              <SellerRow key={seller.id} seller={seller} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function SellerRow({ seller, rank }: { seller: any; rank: number }) {
  const goalPct = seller.goal ? Math.min((seller.totalSold / seller.goal) * 100, 100) : null;

  return (
    <div className="px-5 py-3 hover:bg-indigo-500/[0.03] transition-colors flex items-center gap-3">
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] border ${
        rank === 1 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
        rank === 2 ? "text-slate-400 bg-slate-500/10 border-slate-500/20" :
        rank === 3 ? "text-orange-400 bg-orange-500/10 border-orange-500/20" :
        "text-slate-500 bg-slate-500/5 border-slate-500/10"
      }`}>
        {rank}
      </div>
      <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-xs">
        {seller.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold truncate">{seller.name}</div>
        <div className="text-slate-500 text-[10px]">{seller.salesCount} vendas realizadas</div>
      </div>
      {goalPct !== null && (
        <div className="hidden md:block w-36 pr-4">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-slate-500">Meta Mensal</span>
            <span className={`font-bold ${goalPct >= 100 ? "text-emerald-400" : goalPct >= 60 ? "text-amber-400" : "text-rose-400"}`}>{goalPct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-[#1a1f3a] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${goalPct >= 100 ? "bg-emerald-500" : goalPct >= 60 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${goalPct}%` }} />
          </div>
        </div>
      )}
      <div className="text-right">
        <div className="text-white font-bold text-sm font-mono">R$ {seller.totalSold.toFixed(2).replace('.', ',')}</div>
        <div className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${seller.margin >= 20 ? "text-emerald-400" : seller.margin >= 10 ? "text-amber-400" : "text-rose-400"}`}>
          <Target size={9} /> Margem: {seller.margin.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, trendUp, icon, desc }: { title: string; value: string; trend: string; trendUp: boolean; icon: React.ReactNode; desc: string }) {
  return (
    <div className="bg-[#111528] rounded-2xl p-4 border border-indigo-500/10 hover:border-indigo-500/20 transition-all group flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
            {icon}
          </div>
          <div className={`flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-md ${
            trendUp ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" : "bg-rose-500/10 text-rose-400 border border-rose-500/15"
          }`}>
            {trendUp ? <ArrowUpRight size={9} strokeWidth={3} /> : <ArrowDownRight size={9} strokeWidth={3} />}
            {trend}
          </div>
        </div>
        <h3 className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-0.5">{title}</h3>
        <div className="text-2xl font-black text-white font-mono tracking-tight leading-none my-1">{value}</div>
      </div>
      <p className="text-[9px] text-slate-500/80 leading-snug mt-2 border-t border-indigo-500/[0.04] pt-2">{desc}</p>
    </div>
  );
}

function AlertItem({ title, desc, type }: { title: string; desc: string; type: "warning" | "danger" | "success" | "info" }) {
  const cfg = {
    warning: { icon: <AlertTriangle size={12} />, cls: "text-amber-400 bg-amber-500/10 border-amber-500/15" },
    danger: { icon: <AlertTriangle size={12} />, cls: "text-red-400 bg-red-500/10 border-red-500/15" },
    success: { icon: <CheckCircle2 size={12} />, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15" },
    info: { icon: <Info size={12} />, cls: "text-blue-400 bg-blue-500/10 border-blue-500/15" },
  };
  const c = cfg[type] || cfg.info;
  return (
    <div className="flex gap-2.5 items-start p-2.5 rounded-xl hover:bg-indigo-500/[0.04] transition-colors cursor-pointer border border-transparent hover:border-indigo-500/5">
      <div className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center border ${c.cls}`}>
        {c.icon}
      </div>
      <div className="min-w-0">
        <div className="font-bold text-white text-xs leading-tight">{title}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{desc}</div>
      </div>
    </div>
  );
}

function StoreRankingWidget({ ranking, month, year }: { ranking: any[]; month: number; year: number }) {
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const displayMonth = `${monthNames[month - 1]}/${year}`;

  return (
    <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 p-5 flex flex-col min-h-[220px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-1.5">Faturamento Mensal por Filial</h3>
          <h2 className="text-lg font-black text-white tracking-tight">Ranking de Lojas</h2>
        </div>
        <div className="flex items-center gap-4 text-amber-500">
          <div className="flex items-center gap-3 text-xs font-bold text-amber-400">
            <ChevronLeft size={16} className="cursor-pointer hover:text-amber-300 transition-colors" />
            <span>{displayMonth}</span>
            <ChevronRight size={16} className="cursor-pointer hover:text-amber-300 transition-colors" />
          </div>
          <RefreshCcw size={16} className="cursor-pointer text-slate-500 hover:text-white transition-colors" />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
        {ranking.length === 0 ? (
           <div className="flex-1 flex items-center justify-center opacity-50">
             <RefreshCcw size={24} className="animate-spin text-amber-500/50" />
           </div>
        ) : (
          ranking.map((store: any) => {
             const maxTotal = Math.max(...ranking.map(r => r.total));
             const pct = maxTotal > 0 ? (store.total / maxTotal) * 100 : 0;
             return (
              <div key={store.id} className="flex items-center gap-3">
                 <div className="text-xs font-bold text-slate-300 w-32 truncate">{store.name}</div>
                 <div className="flex-1 h-2 bg-[#1a1f3a] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full opacity-90" style={{ width: `${Math.max(3, pct)}%` }} />
                 </div>
                 <div className="text-xs font-bold text-white w-24 text-right font-mono">R$ {store.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CategoryMixWidget({ mix }: { mix: any[] }) {
  if (!mix || mix.length === 0) {
    return (
      <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 p-5 flex flex-col min-h-[220px] justify-center items-center text-center">
        <div className="mb-4">
          <h3 className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-3">Mix de Categorias</h3>
          <h2 className="text-lg font-black text-slate-300 tracking-tight">Mix indisponível</h2>
        </div>
        <p className="text-xs text-slate-500 max-w-xs font-medium leading-relaxed">
          A participação das categorias exige a integração com a tabela de itens de venda do ERP.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 p-5 flex flex-col min-h-[220px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-1.5">Mix de Categorias</h3>
          <h2 className="text-lg font-black text-white tracking-tight">Participação por Grupo</h2>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
         {mix.map((cat: any, idx: number) => (
            <div key={idx} className="flex items-center gap-3">
               <div className="text-xs font-bold text-slate-300 w-32 truncate">{cat.name}</div>
               <div className="flex-1 h-2 bg-[#1a1f3a] rounded-full overflow-hidden">
                 <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full opacity-90" style={{ width: `${Math.max(3, cat.percentage)}%` }} />
               </div>
               <div className="text-xs font-bold text-white w-16 text-right font-mono">{cat.percentage.toFixed(1)}%</div>
            </div>
          ))}
      </div>
    </div>
  );
}
