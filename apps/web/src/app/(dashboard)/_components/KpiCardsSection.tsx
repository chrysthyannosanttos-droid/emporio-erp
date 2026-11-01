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
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const paddingY = 4;
  const innerH = height - paddingY * 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
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

// Dados detalhados de exemplo para os modais
const SAMPLE_SOLD_ITEMS = [
  { id: "1", name: "Picanha Bovina Resfriada", category: "Açougue & Carnes", qty: 142, unitPrice: 79.90, total: 11345.80, code: "7891234001" },
  { id: "2", name: "Cerveja Heineken Long Neck 330ml", category: "Bebidas", qty: 384, unitPrice: 6.99, total: 2684.16, code: "7891234002" },
  { id: "3", name: "Refrigerante Coca-Cola 2L", category: "Bebidas", qty: 295, unitPrice: 10.50, total: 3097.50, code: "7891234003" },
  { id: "4", name: "Pão Francês Tradicional Kg", category: "Padaria", qty: 218, unitPrice: 16.90, total: 3684.20, code: "7891234004" },
  { id: "5", name: "Leite Integral Piracanjuba 1L", category: "Laticínios", qty: 186, unitPrice: 4.89, total: 909.54, code: "7891234005" },
  { id: "6", name: "Arroz Tipo 1 Camil 5kg", category: "Mercearia", qty: 114, unitPrice: 28.90, total: 3294.60, code: "7891234006" },
  { id: "7", name: "Óleo de Soja Soya 900ml", category: "Mercearia", qty: 98, unitPrice: 6.49, total: 636.02, code: "7891234007" },
  { id: "8", name: "Café Torrado e Moído Pilão 500g", category: "Mercearia", qty: 85, unitPrice: 18.90, total: 1606.50, code: "7891234008" },
  { id: "9", name: "Sabão em Pó OMO Lavagem Perfeita 1.6kg", category: "Limpeza", qty: 62, unitPrice: 24.90, total: 1543.80, code: "7891234009" },
  { id: "10", name: "Queijo Mussarela Fatiado Kg", category: "Frios", qty: 45, unitPrice: 48.90, total: 2200.50, code: "7891234010" },
];

const SAMPLE_RUPTURES = [
  {
    id: "r1",
    name: "Azeite de Oliva Extra Virgem Gallo 500ml",
    category: "Mercearia Nobre",
    code: "7891000315482",
    stock: 0,
    minStock: 24,
    supplier: "Gallo Distribuidora Brasil",
    lastSale: "Hoje, 09:40",
    lossEst: "R$ 480,00/sem"
  },
  {
    id: "r2",
    name: "Café Melitta Tradicional Vácuo 500g",
    category: "Mercearia",
    code: "7891025112004",
    stock: 0,
    minStock: 30,
    supplier: "Melitta do Brasil",
    lastSale: "Hoje, 10:15",
    lossEst: "R$ 360,00/sem"
  },
  {
    id: "r3",
    name: "Cerveja Corona Extra Long Neck 330ml",
    category: "Bebidas",
    code: "7501064191420",
    stock: 0,
    minStock: 48,
    supplier: "Ambev Distribuição",
    lastSale: "Ontem, 21:20",
    lossEst: "R$ 290,00/sem"
  },
  {
    id: "r4",
    name: "Detergente Líquido Ypê Neutro 500ml",
    category: "Limpeza",
    code: "7891022101019",
    stock: 0,
    minStock: 60,
    supplier: "Química Amparo (Ypê)",
    lastSale: "Ontem, 19:10",
    lossEst: "R$ 150,00/sem"
  },
  {
    id: "r5",
    name: "Farinha de Trigo Dona Benta 1kg",
    category: "Mercearia",
    code: "7896005800115",
    stock: 0,
    minStock: 40,
    supplier: "J.Macêdo Alimentos",
    lastSale: "Ontem, 18:35",
    lossEst: "R$ 140,00/sem"
  },
];

export function KpiCardsSection() {
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
              R$ 28.450,90
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div>
                <span className="text-xs font-bold text-green-600 flex items-center gap-0.5">↑ +8,8%</span>
                <span className="text-[10px] text-gray-400 block">vs ontem: R$ 26.150,20</span>
              </div>
              <Sparkline
                data={[21400, 23800, 22900, 25600, 25100, 27200, 28450]}
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
              28,4%
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div>
                <span className="text-xs font-bold text-green-600 flex items-center gap-0.5">↑ +1,2%</span>
                <span className="text-[10px] text-gray-400 block">vs ontem: 27,2%</span>
              </div>
              <Sparkline
                data={[26.2, 26.8, 27.4, 27.0, 27.6, 28.0, 28.4]}
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
              R$ 15,77
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div>
                <span className="text-xs font-bold text-green-600 flex items-center gap-0.5">↑ +3,4%</span>
                <span className="text-[10px] text-gray-400 block">vs ontem: R$ 15,25</span>
              </div>
              <Sparkline
                data={[14.10, 14.65, 14.90, 14.75, 15.20, 15.45, 15.77]}
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
              1.804
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div>
                <span className="text-xs font-bold text-green-600 flex items-center gap-0.5">↑ +12,6%</span>
                <span className="text-[10px] text-gray-400 block">vs ontem: 1.600</span>
              </div>
              <Sparkline
                data={[1380, 1490, 1460, 1610, 1580, 1720, 1804]}
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
          className="bg-white border border-red-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-red-500 hover:shadow-lg hover:ring-2 hover:ring-red-500/10 transition-all cursor-pointer select-none text-left"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <AlertTriangle size={20} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">RUPTURAS</span>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full animate-pulse">
                5 rupturas ➔
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 font-mono tracking-tight group-hover:text-red-600 transition-colors">
              5
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div>
                <span className="text-xs font-bold text-red-500 flex items-center gap-0.5">↑ produtos em falta</span>
                <span className="text-[10px] text-gray-400 block">Clique para ver</span>
              </div>
              <Sparkline
                data={[9, 8, 10, 7, 8, 6, 5]}
                color="#ef4444"
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
                      1.804 itens
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Detalhamento dos produtos com maior saída no dia de hoje em todos os caixas.
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
                <span className="text-xl font-black text-gray-900 font-mono">1.804 un</span>
                <span className="text-[11px] font-bold text-emerald-600 block mt-0.5">↑ +12,6% vs ontem (1.600 un)</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Faturamento em Itens</span>
                <span className="text-xl font-black text-gray-900 font-mono">R$ 28.450,90</span>
                <span className="text-[11px] font-semibold text-gray-500 block mt-0.5">Ticket médio: R$ 15,77</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Média por Cesta (Itens/Pedido)</span>
                <span className="text-xl font-black text-gray-900 font-mono">6,4 itens</span>
                <span className="text-[11px] font-semibold text-emerald-600 block mt-0.5">Alta eficiência de checkout</span>
              </div>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Top 10 Produtos Mais Vendidos Hoje
                </h3>
                <span className="text-xs text-gray-400">Ordenado por quantidade</span>
              </div>

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
                    {SAMPLE_SOLD_ITEMS.map((item, idx) => (
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
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Mostrando os 10 itens de maior saída hoje.
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
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-xs">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-gray-900">Rupturas de Estoque</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      5 produtos esgotados
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Produtos com saldo zerado que estão impedindo vendas na gôndola e no caixa.
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
                <span className="text-xl font-black text-gray-900 font-mono">5 produtos</span>
                <span className="text-[11px] font-bold text-rose-600 block mt-0.5">Urgência de reposição alta</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Estimativa de Perda em Vendas</span>
                <span className="text-xl font-black text-gray-900 font-mono">~R$ 1.420,00</span>
                <span className="text-[11px] font-semibold text-gray-500 block mt-0.5">Impacto semanal estimado</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Fornecedores Envolvidos</span>
                <span className="text-xl font-black text-gray-900 font-mono">5 parceiros</span>
                <span className="text-[11px] font-semibold text-blue-600 block mt-0.5">Prontos para pedido de compra</span>
              </div>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Lista de Produtos em Falta (Gôndola Vazia)
                </h3>
                <span className="text-xs font-semibold text-red-600">Ação imediata necessária</span>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4 text-center">Estoque Atual</th>
                      <th className="py-3 px-4 text-center">Estoque Mínimo</th>
                      <th className="py-3 px-4">Fornecedor</th>
                      <th className="py-3 px-4 text-right">Perda Est./Sem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {SAMPLE_RUPTURES.map((item) => (
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
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                5 produtos identificados com ruptura de estoque hoje.
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

