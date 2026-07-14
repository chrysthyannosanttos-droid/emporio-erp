"use client";

import { FileText, Printer } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="h-full flex flex-col gap-5">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-white tracking-tight">Relatórios</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gere demonstrativos e relatórios consolidados.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1 content-start">
        <ReportCard title="Fechamento de Caixa" desc="Relatório detalhado do turno com vendas, sangrias e suprimentos." />
        <ReportCard title="Vendas por Período" desc="Volume de vendas, descontos e produtos mais vendidos." />
        <ReportCard title="Fluxo de Caixa" desc="Entradas, saídas e previsões financeiras." />
        <ReportCard title="Mensalidades" desc="Status das assinaturas e inadimplência." />
        <ReportCard title="Posição de Estoque" desc="Valor em estoque, itens críticos e curva ABC." />
      </div>
    </div>
  );
}

function ReportCard({ title, desc }: { title: string; desc: string }) {
  const handleOpenReport = () => {
    const url = `/reports/view?title=${encodeURIComponent(title)}&desc=${encodeURIComponent(desc)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="bg-[#111528] p-5 rounded-2xl border border-indigo-500/10 hover:border-indigo-500/20 transition-all group cursor-pointer flex flex-col">
      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-all border border-indigo-500/15">
        <FileText size={20} />
      </div>
      <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-500 mb-4 flex-1">{desc}</p>
      <button onClick={handleOpenReport} className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs hover:text-indigo-300 transition-colors">
        <Printer size={13} /> Visualizar & Imprimir
      </button>
    </div>
  );
}
