"use client";

import { useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";

export interface ProductRank {
  rank: number;
  icon: string;
  name: string;
  val: string;
  pct: string;
}

interface TopProductsCardProps {
  data?: Record<"day" | "week" | "month", ProductRank[]>;
}

export function TopProductsCard({ data }: TopProductsCardProps) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const items = data?.[period] || [];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
      {/* Header com título e filtro de período */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Top Produtos</h3>
        
        {/* Filtro: Dia / Semana / Mês */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-[10px]">
          <button
            type="button"
            onClick={() => setPeriod("day")}
            className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
              period === "day"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Dia
          </button>
          <button
            type="button"
            onClick={() => setPeriod("week")}
            className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
              period === "week"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setPeriod("month")}
            className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
              period === "month"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Mês
          </button>
        </div>
      </div>

      {/* Lista dos mais vendidos no período ou estado vazio */}
      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {items.length === 0 ? (
          <div className="py-8 text-center text-gray-400 flex flex-col items-center justify-center">
            <Package size={32} className="text-gray-300 mb-2 stroke-[1.5]" />
            <p className="text-xs font-bold text-gray-700">Nenhum produto vendido ainda</p>
            <p className="text-[10px] text-gray-400 mt-0.5">As vendas registradas no PDV aparecerão aqui.</p>
          </div>
        ) : (
          items.map((p) => (
            <div
              key={p.rank}
              className="flex items-center gap-3 p-1 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <span className="text-xs font-bold text-gray-400 w-4 text-center">
                {p.rank}
              </span>
              <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-sm shrink-0">
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold text-gray-900">{p.val}</p>
                <p className="text-[10px] font-bold text-green-600">↑ {p.pct}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rodapé com link ver todos */}
      <div className="border-t border-gray-100 pt-2 flex justify-between items-center text-xs mt-2">
        <span className="text-gray-400 text-[11px]">
          Filtro ativo: <strong className="text-blue-600 capitalize">{period === 'day' ? 'Hoje' : period === 'week' ? 'Últimos 7 dias' : 'Últimos 30 dias'}</strong>
        </span>
        <Link href="/products" className="text-xs font-bold text-blue-600 hover:text-blue-700">
          Ver produtos
        </Link>
      </div>
    </div>
  );
}
