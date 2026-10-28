import { Hammer, BookOpen, Layers, ShieldCheck, ArrowRight, AlertTriangle, CheckCircle2, Factory } from "lucide-react";
import Link from "next/link";

interface FactoryDashboardProps {
  ordersCount: number;
  recipesCount: number;
  plannedTotal: number;
  producedTotal: number;
}

export function FactoryDashboard({ ordersCount, recipesCount, plannedTotal, producedTotal }: FactoryDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Banner Superior */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-[#111528] to-[#0c0f1a] rounded-2xl p-6 border border-emerald-500/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-2 inline-block">
              Painel de Operação: Indústria & Fábrica
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Controle de Produção Fabril
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Acompanhe ordens de produção (OPs), consumo de insumos, fichas técnicas e controle de lote.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/factory/production-orders"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              <Hammer size={14} /> Abrir Ordem de Produção
            </Link>
            <Link
              href="/restaurant/recipes"
              className="bg-[#161b33] border border-indigo-500/20 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <BookOpen size={14} /> Fichas Técnicas
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Industriais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Ordens de Produção Totais
          </span>
          <div className="text-2xl font-black font-mono text-indigo-400">
            {ordersCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block">
            OPs planejadas ou executadas
          </span>
        </div>

        <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Fichas Técnicas (Fórmulas)
          </span>
          <div className="text-2xl font-black font-mono text-white">
            {recipesCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block">
            Produtos com composição definida
          </span>
        </div>

        <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Volume Planejado (Total)
          </span>
          <div className="text-2xl font-black font-mono text-amber-400">
            {plannedTotal} un
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block">
            Meta de produção acumulada
          </span>
        </div>

        <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Volume Produzido (Concluído)
          </span>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {producedTotal} un
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block">
            Produtos acabados em estoque
          </span>
        </div>
      </div>

      {/* Atalhos para Módulos Industriais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/factory/production-orders"
          className="bg-[#111528] border border-indigo-500/15 hover:border-emerald-500/40 rounded-2xl p-5 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Hammer size={22} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Ordens de Produção (OP)</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Lotes, validade e baixa de insumos</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
        </Link>

        <Link
          href="/restaurant/recipes"
          className="bg-[#111528] border border-indigo-500/15 hover:border-indigo-500/40 rounded-2xl p-5 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <BookOpen size={22} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Fichas Técnicas & Insumos</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Composição de matérias-primas</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
        </Link>

        <Link
          href="/pricing"
          className="bg-[#111528] border border-indigo-500/15 hover:border-indigo-500/40 rounded-2xl p-5 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-600/20 text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
              <Factory size={22} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Custo Industrial & Margens</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Formação de preço por lote</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-600 group-hover:text-amber-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
