"use client";

import { useState } from "react";
import Link from "next/link";

interface ProductRank {
  rank: number;
  icon: string;
  name: string;
  val: string;
  pct: string;
}

const DATA_BY_PERIOD: Record<"day" | "week" | "month", ProductRank[]> = {
  day: [
    { rank: 1, icon: "🥩", name: "Picanha Bovina", val: "R$ 1.850,00", pct: "+ 14,2%" },
    { rank: 2, icon: "🍺", name: "Cerveja Heineken 350ml", val: "R$ 980,50", pct: "+ 21,0%" },
    { rank: 3, icon: "🥤", name: "Coca-Cola 2L", val: "R$ 740,00", pct: "+ 11,5%" },
    { rank: 4, icon: "🥖", name: "Pão Francês Kg", val: "R$ 520,30", pct: "+ 8,4%" },
    { rank: 5, icon: "🥛", name: "Leite Integral 1L", val: "R$ 410,20", pct: "+ 5,1%" },
  ],
  week: [
    { rank: 1, icon: "🥩", name: "Picanha Bovina", val: "R$ 4.250,90", pct: "+ 18,5%" },
    { rank: 2, icon: "🥤", name: "Coca-Cola 2L", val: "R$ 2.890,50", pct: "+ 12,3%" },
    { rank: 3, icon: "🌾", name: "Arroz Tipo 1 5kg", val: "R$ 2.450,00", pct: "+ 9,7%" },
    { rank: 4, icon: "🍗", name: "Frango Congelado", val: "R$ 2.120,30", pct: "+ 8,1%" },
    { rank: 5, icon: "🥛", name: "Leite Integral 1L", val: "R$ 1.890,80", pct: "+ 7,2%" },
  ],
  month: [
    { rank: 1, icon: "🌾", name: "Arroz Tipo 1 5kg", val: "R$ 18.940,00", pct: "+ 24,1%" },
    { rank: 2, icon: "🥩", name: "Picanha Bovina", val: "R$ 16.420,50", pct: "+ 19,8%" },
    { rank: 3, icon: "🫘", name: "Feijão Carioca 1kg", val: "R$ 11.230,00", pct: "+ 15,2%" },
    { rank: 4, icon: "🥤", name: "Coca-Cola 2L", val: "R$ 9.850,00", pct: "+ 13,0%" },
    { rank: 5, icon: "🍳", name: "Óleo de Soja 900ml", val: "R$ 7.910,40", pct: "+ 9,4%" },
  ],
};

export function TopProductsCard() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const items = DATA_BY_PERIOD[period];

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

      {/* Lista dos 5 mais vendidos no período */}
      <div className="space-y-3 flex-1">
        {items.map((p) => (
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
        ))}
      </div>

      {/* Rodapé com link ver todos */}
      <div className="border-t border-gray-100 pt-2 flex justify-between items-center text-xs mt-2">
        <span className="text-gray-400 text-[11px]">
          Filtro ativo: <strong className="text-blue-600 capitalize">{period === 'day' ? 'Hoje' : period === 'week' ? 'Últimos 7 dias' : 'Últimos 30 dias'}</strong>
        </span>
        <Link href="/stock/new" className="text-xs font-bold text-blue-600 hover:text-blue-700">
          Ver todos
        </Link>
      </div>
    </div>
  );
}
