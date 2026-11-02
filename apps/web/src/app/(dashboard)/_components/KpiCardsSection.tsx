"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DollarSign, TrendingUp, Receipt, Package, AlertTriangle, X,
  ExternalLink, ShoppingCart, ArrowUpRight, CheckCircle2,
  Calendar, Layers, Truck, FileText
} from "lucide-react";

interface SparklineProps {
  data: number[];
  color?: string;
  id: string;
  width?: number;
  height?: number;
}

function Sparkline({
  data,
  color = "#2563eb",
  id,
  width = 92,
  height = 36,
}: SparklineProps) {
  const safeData = data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0];
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const range = max - min || 1;
  const paddingY = 4;
  const innerH = height - paddingY * 2;

  const points = safeData.map((val, idx) => {
    const x = (idx / (safeData.length - 1 || 1)) * width;
    const y = height - paddingY - ((val - min) / range) * innerH;
    return { x, y };
  });

  let linePath = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = ((p0.x + p1.x) / 2).toFixed(1);
    linePath += ` C ${mx},${p0.y.toFixed(1)} ${mx},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }

  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;
  const last = points[points.length - 1];

  return (
    <div className="relative shrink-0 flex items-center justify-end pointer-events-none">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        fill="none"
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${id})`} />
        <path
          d={linePath}
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last.x} cy={last.y} r="5" fill={color} fillOpacity="0.25" className="animate-pulse" />
        <circle cx={last.x} cy={last.y} r="2.8" fill={color} />
        <circle cx={last.x} cy={last.y} r="1.3" fill="#ffffff" />
      </svg>
    </div>
  );
}

export interface SoldItemDetail {
  id: string;
  name: string;
  category: string;
  qty: number;
  unitPrice: number;
  total: number;
  code: string;
}

export interface RuptureDetail {
  id: string;
  name: string;
  category: string;
  code: string;
  stock: number;
  minStock: number;
  supplier: string;
  lastSale: string;
  lossEst: string;
}

export interface KpiCardsProps {
  faturamentoHoje?: number;
  faturamentoOntem?: number;
  faturamentoTrend?: number;
  sparklineFat?: number[];
  margemBruta?: number;
  margemTrend?: number;
  sparklineMargem?: number[];
  ticketMedio?: number;
  ticketTrend?: number;
  sparklineTicket?: number[];
  itensVendidosHoje?: number;
  itensVendidosOntem?: number;
  itensTrend?: number;
  sparklineItens?: number[];
  rupturasCount?: number;
  sparklineRupturas?: number[];
  soldItemsList?: SoldItemDetail[];
  rupturesList?: RuptureDetail[];
}

export function KpiCardsSection({
  faturamentoHoje = 0,
  faturamentoOntem = 0,
  faturamentoTrend = 0,
  sparklineFat = [0, 0, 0, 0, 0, 0, 0],
  margemBruta = 0,
  margemTrend = 0,
  sparklineMargem = [0, 0, 0, 0, 0, 0, 0],
  ticketMedio = 0,
  ticketTrend = 0,
  sparklineTicket = [0, 0, 0, 0, 0, 0, 0],
  itensVendidosHoje = 0,
  itensVendidosOntem = 0,
  itensTrend = 0,
  sparklineItens = [0, 0, 0, 0, 0, 0, 0],
  rupturasCount = 0,
  sparklineRupturas = [0, 0, 0, 0, 0, 0, 0],
  soldItemsList = [],
  rupturesList = [],
}: KpiCardsProps) {
  const [activeModal, setActiveModal] = useState<"itens" | "rupturas" | null>(null);

  return (
    <>
      {/* ── 1. TOP 5 KPI CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

        {/* Card 1: Faturamento Hoje */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-blue-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">FATURAMENTO HOJE</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 font-mono tracking-tight">
              R$ {faturamentoHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div>
                <span className={`text-xs font-bold flex items-center gap-0.5 ${faturamentoTrend >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {faturamentoTrend >= 0 ? "↑" : "↓"} {faturamentoTrend >= 0 ? `+${faturamentoTrend.toFixed(1)}%` : `${faturamentoTrend.toFixed(1)}%`}
                </span>
                <span className="text-[10px] text-gray-400 block">
                  vs ontem: R$ {faturamentoOntem.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <Sparkline
                data={sparklineFat}
                color="#2563eb"
                id="fat"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Margem Bruta */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-indigo-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MARGEM BRUTA</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 font-mono tracking-tight">
              {margemBruta.toFixed(1).replace(".", ",")}%
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div>
                <span className={`text-xs font-bold flex items-center gap-0.5 ${margemTrend >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {margemTrend >= 0 ? "↑" : "↓"} {margemTrend >= 0 ? `+${margemTrend.toFixed(1)}%` : `${margemTrend.toFixed(1)}%`}
                </span>
                <span className="text-[10px] text-gray-400 block">estimada sobre vendas</span>
              </div>
              <Sparkline
                data={sparklineMargem}
                color="#6366f1"
                id="margem"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-sky-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold">
              <Receipt size={20} />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TICKET MÉDIO</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 font-mono tracking-tight">
              R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div>
                <span className={`text-xs font-bold flex items-center gap-0.5 ${ticketTrend >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {ticketTrend >= 0 ? "↑" : "↓"} {ticketTrend >= 0 ? `+${ticketTrend.toFixed(1)}%` : `${ticketTrend.toFixed(1)}%`}
                </span>
                <span className="text-[10px] text-gray-400 block">por venda concluída</span>
              </div>
              <Sparkline
                data={sparklineTicket}
                color="#0284c7"
                id="ticket"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Itens Vendidos (CLICÁVEL) */}
        <div
          onClick={() => setActiveModal("itens")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveModal("itens")}
          className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-emerald-500 hover:shadow-lg hover:ring-2 hover:ring-emerald-500/10 transition-all cursor-pointer select-none text-left"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Package size={20} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ITENS VENDIDOS</span>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full opacity-80 group-hover:opacity-100">
                Ver lista ➔
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 font-mono tracking-tight group-hover:text-emerald-700 transition-colors">
              {itensVendidosHoje.toLocaleString("pt-BR")}
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div>
                <span className={`text-xs font-bold flex items-center gap-0.5 ${itensTrend >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {itensTrend >= 0 ? "↑" : "↓"} {itensTrend >= 0 ? `+${itensTrend.toFixed(1)}%` : `${itensTrend.toFixed(1)}%`}
                </span>
                <span className="text-[10px] text-gray-400 block">
                  vs ontem: {itensVendidosOntem.toLocaleString("pt-BR")}
                </span>
              </div>
              <Sparkline
                data={sparklineItens}
                color="#10b981"
                id="itens"
              />
            </div>
          </div>
        </div>

        {/* Card 5: Rupturas (CLICÁVEL) */}
        <div
          onClick={() => setActiveModal("rupturas")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveModal("rupturas")}
          className={`bg-white border rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-lg transition-all cursor-pointer select-none text-left ${
            rupturasCount > 0
              ? "border-red-200 hover:border-red-500 hover:ring-2 hover:ring-red-500/10"
              : "border-gray-200 hover:border-emerald-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold group-hover:scale-105 transition-transform ${
              rupturasCount > 0
                ? "bg-red-50 text-red-500 border-red-100"
                : "bg-emerald-50 text-emerald-600 border-emerald-100"
            }`}>
              <AlertTriangle size={20} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">RUPTURAS</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                rupturasCount > 0
                  ? "text-red-600 bg-red-50 border border-red-200 animate-pulse"
                  : "text-emerald-700 bg-emerald-50 border border-emerald-200"
              }`}>
                {rupturasCount} rupturas ➔
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-black font-mono tracking-tight transition-colors ${
              rupturasCount > 0 ? "text-gray-900 group-hover:text-red-600" : "text-gray-900"
            }`}>
              {rupturasCount}
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div>
                <span className={`text-xs font-bold flex items-center gap-0.5 ${
                  rupturasCount > 0 ? "text-red-500" : "text-emerald-600"
                }`}>
                  {rupturasCount > 0 ? "↑ produtos em falta" : "✓ estoque regular"}
                </span>
                <span className="text-[10px] text-gray-400 block">Clique para ver</span>
              </div>
              <Sparkline
                data={sparklineRupturas}
                color={rupturasCount > 0 ? "#ef4444" : "#10b981"}
                id="rupturas"
              />
            </div>
          </div>
        </div>

      </div>

      {/* ── MODAL: DETALHAMENTO DE ITENS VENDIDOS ───────────────────────── */}
      {activeModal === "itens" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Package size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-gray-900">Itens Vendidos Hoje</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {itensVendidosHoje} {itensVendidosHoje === 1 ? "item" : "itens"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Detalhamento dos produtos com saída no dia de hoje em todos os caixas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal KPI Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-6 bg-gray-50/60 border-b border-gray-100">
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Volume Total de Unidades</span>
                <span className="text-xl font-black text-gray-900 font-mono">{itensVendidosHoje} un</span>
                <span className="text-[11px] font-bold text-emerald-600 block mt-0.5">vs ontem: {itensVendidosOntem} un</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Faturamento em Itens</span>
                <span className="text-xl font-black text-gray-900 font-mono">
                  R$ {faturamentoHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] font-semibold text-gray-500 block mt-0.5">
                  Ticket médio: R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Produtos Diferentes</span>
                <span className="text-xl font-black text-gray-900 font-mono">{soldItemsList.length} tipos</span>
                <span className="text-[11px] font-semibold text-emerald-600 block mt-0.5">Vendas ativas hoje</span>
              </div>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Produtos Vendidos Hoje
                </h3>
                <span className="text-xs text-gray-400">Ordenado por quantidade</span>
              </div>

              {soldItemsList.length === 0 ? (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center border border-gray-200 rounded-2xl bg-gray-50/50">
                  <Package size={40} className="text-gray-300 mb-2 stroke-[1.5]" />
                  <p className="text-sm font-bold text-gray-700">Nenhum item vendido hoje</p>
                  <p className="text-xs text-gray-400 mt-0.5">As vendas registradas no PDV aparecerão aqui em tempo real.</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Produto</th>
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4 text-center">Qtd Vendida</th>
                        <th className="py-3 px-4 text-right">Preço Unit.</th>
                        <th className="py-3 px-4 text-right">Total Faturado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {soldItemsList.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-gray-400">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900">{item.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">Cód: {item.code}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-medium">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-black text-sm text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                              {item.qty} un
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-600">
                            R$ {item.unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-gray-900">
                            R$ {item.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {soldItemsList.length > 0 ? `Total de ${soldItemsList.length} itens listados.` : "Nenhuma venda registrada hoje."}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <Link
                  href="/reports"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                >
                  <span>Ver Relatórios</span>
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DETALHAMENTO DE RUPTURAS ────────────────────────────── */}
      {activeModal === "rupturas" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                  rupturasCount > 0
                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                }`}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-gray-900">Rupturas de Estoque</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      rupturasCount > 0
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {rupturasCount} {rupturasCount === 1 ? "produto esgotado" : "produtos esgotados"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Produtos com saldo zerado que estão impedindo vendas no PDV.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal KPI Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-6 bg-gray-50/50 border-b border-gray-200">
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Itens com Estoque Zero</span>
                <span className="text-xl font-black text-gray-900 font-mono">{rupturasCount} produtos</span>
                <span className={`text-[11px] font-bold block mt-0.5 ${rupturasCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {rupturasCount > 0 ? "Reposição necessária" : "Estoque 100% regular"}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Status do Catálogo</span>
                <span className="text-xl font-black text-gray-900 font-mono">
                  {rupturasCount === 0 ? "OK" : "Atenção"}
                </span>
                <span className="text-[11px] font-semibold text-gray-500 block mt-0.5">Alerta automático</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ação Recomendada</span>
                <span className="text-xl font-black text-gray-900 font-mono">
                  {rupturasCount > 0 ? "Fazer Pedido" : "Manter"}
                </span>
                <span className="text-[11px] font-semibold text-blue-600 block mt-0.5">Gestão de Compras</span>
              </div>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Lista de Produtos em Falta
                </h3>
              </div>

              {rupturesList.length === 0 ? (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center border border-gray-200 rounded-2xl bg-gray-50/50">
                  <CheckCircle2 size={40} className="text-emerald-500 mb-2 stroke-[1.5]" />
                  <p className="text-sm font-bold text-gray-700">Nenhuma ruptura de estoque detectada</p>
                  <p className="text-xs text-gray-400 mt-0.5">Todos os produtos estão com estoque regular ou a loja está pronta para cadastro.</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Produto</th>
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4 text-center">Estoque Atual</th>
                        <th className="py-3 px-4 text-center">Estoque Mínimo</th>
                        <th className="py-3 px-4">Fornecedor</th>
                        <th className="py-3 px-4 text-right">Preço Venda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rupturesList.map((item) => (
                        <tr key={item.id} className="hover:bg-red-50/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900">{item.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">EAN: {item.code} • Última venda: {item.lastSale}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-medium">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                              <strong className="font-mono font-bold">0 un</strong>
                              <span className="text-[10px] text-rose-500 font-medium">Esgotado</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-gray-600">
                            {item.minStock} un
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-gray-700 font-semibold text-[11px] flex items-center gap-1">
                              <Truck size={12} className="text-gray-400" />
                              {item.supplier}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-red-600">
                            {item.lossEst}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {rupturesList.length > 0 ? `${rupturesList.length} produtos identificados com estoque zero.` : "Estoque 100% regular."}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <Link
                  href="/stock"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-red-600/20"
                >
                  <span>Ir para Gestão de Estoque</span>
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
