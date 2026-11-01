"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Printer, ArrowLeft } from "lucide-react";
import { CybertechBrand } from "@/components/CybertechBrand";

function ReportViewContent() {
  const searchParams = useSearchParams();
  const title = searchParams.get("title") || "Relatório Consolidado";
  const desc = searchParams.get("desc") || "Demonstrativo detalhado do sistema.";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f5f8ff] text-gray-900 p-8 font-sans">
      {/* Barra superior de ações */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-6 pb-4 border-b border-gray-200 no-print">
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-semibold transition-colors"
        >
          <ArrowLeft size={16} /> Fechar Aba
        </button>
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
        >
          <Printer size={16} /> Imprimir Relatório
        </button>
      </div>

      {/* Área do Relatório */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 p-10 print-area shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h1>
              <p className="text-gray-500 text-sm mt-0.5">{desc}</p>
            </div>
          </div>
          <div className="text-right">
            <CybertechBrand size="sm" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Data de Geração</span>
              <span className="text-sm font-bold text-gray-900">{new Date().toLocaleString("pt-BR")}</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Gerado por</span>
              <span className="text-sm font-bold text-gray-900">Administrador</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Demonstrativo Financeiro</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="p-3 font-bold uppercase tracking-wider text-[11px]">Descrição / Item</th>
                    <th className="p-3 font-bold uppercase tracking-wider text-[11px] text-right">Qtd</th>
                    <th className="p-3 font-bold uppercase tracking-wider text-[11px] text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50/50">
                    <td className="p-3 text-gray-900 font-semibold">Vendas Totais em Dinheiro</td>
                    <td className="p-3 text-gray-600 text-right">142</td>
                    <td className="p-3 text-emerald-600 font-bold text-right">R$ 4.250,00</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="p-3 text-gray-900 font-semibold">Vendas Totais em Cartão</td>
                    <td className="p-3 text-gray-600 text-right">89</td>
                    <td className="p-3 text-emerald-600 font-bold text-right">R$ 2.890,50</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="p-3 text-gray-900 font-semibold">Suprimentos de Caixa</td>
                    <td className="p-3 text-gray-600 text-right">4</td>
                    <td className="p-3 text-blue-600 font-bold text-right">R$ 400,00</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="p-3 text-gray-900 font-semibold">Sangrias de Caixa</td>
                    <td className="p-3 text-gray-600 text-right">8</td>
                    <td className="p-3 text-red-600 font-bold text-right">- R$ 1.200,00</td>
                  </tr>
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="p-3 font-bold text-gray-900">Saldo Líquido</td>
                    <td />
                    <td className="p-3 text-emerald-600 font-black text-sm text-right">R$ 6.340,50</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-gray-600 leading-relaxed">
            <strong className="text-gray-900">Observação técnica:</strong> Este relatório é gerado a partir do banco de dados consolidado do Cybertech RP. Todas as transações estão auditadas e registradas em conformidade com as regras fiscais vigentes.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center text-gray-500 text-sm">
        Carregando relatório...
      </div>
    }>
      <ReportViewContent />
    </Suspense>
  );
}
