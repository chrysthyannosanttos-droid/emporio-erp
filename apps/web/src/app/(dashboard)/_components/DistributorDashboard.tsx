import { Truck, ClipboardList, Tag, Users, Package, DollarSign, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

interface DistributorDashboardProps {
  stats: {
    faturamentoB2B: number;
    pedidosAbertos: number;
    entregasPendentes: number;
    ticketMedio: number;
    totalPedidos: number;
  };
  sellers: any[];
}

export function DistributorDashboard({ stats, sellers }: DistributorDashboardProps) {
  const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col gap-6">
      {/* Banner Superior */}
      <div className="bg-gradient-to-r from-amber-950/40 via-[#fbfdff] to-[#f3f7fe] rounded-2xl p-6 border border-amber-500/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mb-2 inline-block">
              Painel de Operação: Distribuidora & Atacado
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Visão Geral Comercial & Logística
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Acompanhe pedidos B2B em carteira, expedição, rotas de entrega e desempenho dos vendedores.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/distribution/orders"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <ClipboardList size={14} /> Novo Pedido B2B
            </Link>
            <Link
              href="/distribution/routes"
              className="bg-[#eaf1fc] border border-indigo-200 text-slate-700 hover:text-gray-900 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Truck size={14} /> Roteirizar Entregas
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Faturamento B2B Total
          </span>
          <div className="text-2xl font-black font-mono text-emerald-600">
            {formatter.format(stats.faturamentoB2B)}
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">
            {stats.totalPedidos} pedidos faturados/em carteira
          </span>
        </div>

        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Pedidos Em Carteira (Separação/Expedição)
          </span>
          <div className="text-2xl font-black font-mono text-amber-600">
            {stats.pedidosAbertos}
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">
            Aguardando faturamento / transporte
          </span>
        </div>

        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Rotas / Entregas Pendentes
          </span>
          <div className="text-2xl font-black font-mono text-indigo-600">
            {stats.entregasPendentes}
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">
            Rotas agendadas em andamento
          </span>
        </div>

        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Ticket Médio B2B
          </span>
          <div className="text-2xl font-black font-mono text-gray-900">
            {formatter.format(stats.ticketMedio)}
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">
            Valor médio por pedido de cliente
          </span>
        </div>
      </div>

      {/* Acessos Rápidos Módulos B2B */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href="/distribution/orders"
          className="bg-[#fbfdff] border border-[#c4d5ee] hover:border-indigo-500/40 rounded-2xl p-4 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-gray-900 transition-all">
              <ClipboardList size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Pedidos B2B</h3>
              <p className="text-[11px] text-slate-500">Gerenciar vendas a prazo</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-600 group-hover:text-indigo-600 transition-colors" />
        </Link>

        <Link
          href="/distribution/price-tables"
          className="bg-[#fbfdff] border border-[#c4d5ee] hover:border-indigo-500/40 rounded-2xl p-4 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-600 group-hover:bg-amber-600 group-hover:text-gray-900 transition-all">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Tabelas de Preço</h3>
              <p className="text-[11px] text-slate-500">Atacado, Distribuição, Regiões</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-600 group-hover:text-amber-600 transition-colors" />
        </Link>

        <Link
          href="/distribution/shipping"
          className="bg-[#fbfdff] border border-[#c4d5ee] hover:border-indigo-500/40 rounded-2xl p-4 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-600/20 text-teal-600 group-hover:bg-teal-600 group-hover:text-gray-900 transition-all">
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Expedição / Picking</h3>
              <p className="text-[11px] text-slate-500">Conferência por código de barras</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-600 group-hover:text-teal-600 transition-colors" />
        </Link>

        <Link
          href="/distribution/routes"
          className="bg-[#fbfdff] border border-[#c4d5ee] hover:border-indigo-500/40 rounded-2xl p-4 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-gray-900 transition-all">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Rotas & Entregas</h3>
              <p className="text-[11px] text-slate-500">Frotas, motoristas e mapa</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-600 group-hover:text-emerald-600 transition-colors" />
        </Link>
      </div>

      {/* Equipe de Vendas B2B */}
      {sellers && sellers.length > 0 && (
        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Users size={16} className="text-indigo-600" />
              Equipe Comercial & Comissões
            </h2>
            <Link href="/distribution/sellers" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
              Ver Todos os Vendedores →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sellers.slice(0, 3).map((s: any) => (
              <div key={s.id} className="bg-[#f3f7fe] border border-[#c4d5ee] rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-gray-900">{s.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Comissão: <strong className="text-indigo-700">{s.commission}%</strong>
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600">
                  {s.goal ? `Meta: R$ ${Number(s.goal).toFixed(0)}` : "Sem Meta"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
