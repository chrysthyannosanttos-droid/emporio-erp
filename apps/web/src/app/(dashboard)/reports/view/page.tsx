"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Printer, ArrowLeft } from "lucide-react";

function ReportViewContent() {
  const searchParams = useSearchParams();
  const title = searchParams.get("title") || "Relatório Consolidado";
  const desc = searchParams.get("desc") || "Demonstrativo detalhado do sistema.";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0c0f1a] text-white p-8 font-sans">
      {/* Barra superior de ações */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-indigo-500/10 no-print">
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Fechar Aba
        </button>
        <button
          onClick={handlePrint}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
        >
          <Printer size={16} /> Imprimir Relatório
        </button>
      </div>

      {/* Área do Relatório */}
      <div className="max-w-4xl mx-auto bg-[#111528] rounded-2xl border border-indigo-500/10 p-10 print-area shadow-2xl">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-indigo-500/10">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/15">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{title}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{desc}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#0c0f1a] rounded-xl border border-indigo-500/5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Data de Geração</span>
              <span className="text-sm font-semibold text-white">{new Date().toLocaleString("pt-BR")}</span>
            </div>
            <div className="p-4 bg-[#0c0f1a] rounded-xl border border-indigo-500/5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Gerado por</span>
              <span className="text-sm font-semibold text-white">Administrador</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Demonstrativo Financeiro</h3>
            <div className="border border-indigo-500/10 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0c0f1a] text-slate-400 border-b border-indigo-500/10">
                  <tr>
                    <th className="p-3">Descrição / Item</th>
                    <th className="p-3 text-right">Qtd</th>
                    <th className="p-3 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/5">
                  <tr>
                    <td className="p-3 text-white font-semibold">Vendas Totais em Dinheiro</td>
                    <td className="p-3 text-slate-400 text-right">142</td>
                    <td className="p-3 text-emerald-400 font-bold text-right">R$ 4.250,00</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-white font-semibold">Vendas Totais em Cartão</td>
                    <td className="p-3 text-slate-400 text-right">89</td>
                    <td className="p-3 text-emerald-400 font-bold text-right">R$ 2.890,50</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-white font-semibold">Suprimentos de Caixa</td>
                    <td className="p-3 text-slate-400 text-right">4</td>
                    <td className="p-3 text-indigo-400 font-bold text-right">R$ 400,00</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-white font-semibold">Sangrias de Caixa</td>
                    <td className="p-3 text-slate-400 text-right">8</td>
                    <td className="p-3 text-red-400 font-bold text-right">- R$ 1.200,00</td>
                  </tr>
                </tbody>
                <tfoot className="bg-[#0c0f1a] border-t border-indigo-500/10">
                  <tr>
                    <td className="p-3 font-bold text-white">Saldo Líquido</td>
                    <td />
                    <td className="p-3 text-emerald-400 font-black text-sm text-right">R$ 6.340,50</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-xs text-slate-400 leading-relaxed">
            <strong>Observação técnica:</strong> Este relatório é gerado a partir do banco de dados consolidado do Emporio ERP. Todas as transações estão auditadas e registradas em conformidade com as regras fiscais vigentes.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0c0f1a] flex items-center justify-center text-slate-400 text-sm">
        Carregando relatório...
      </div>
    }>
      <ReportViewContent />
    </Suspense>
  );
}
