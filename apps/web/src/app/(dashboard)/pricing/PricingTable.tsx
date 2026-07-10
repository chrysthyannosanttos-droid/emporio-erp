"use client";
import { useState } from "react";
import { Search, Save, Percent, X } from "lucide-react";
import { updatePricing, applyMarginToCategory } from "@/actions/pricing";
import { useRouter } from "next/navigation";

export default function PricingTable({ initialProducts, categories }: { initialProducts: any[], categories: any[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState(initialProducts);
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCategoryId, setBatchCategoryId] = useState("");
  const [batchMargin, setBatchMargin] = useState("");
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handlePriceChange = (id: string, newPrice: string) => {
    const val = parseFloat(newPrice.replace(',', '.'));
    if (isNaN(val)) return;

    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const pCost = p.cost > 0 ? p.cost : 1;
        const newMarkup = ((val - pCost) / pCost) * 100;
        return { ...p, price: val, markup: newMarkup };
      }
      return p;
    }));
  };

  const handleMarkupChange = (id: string, newMarkup: string) => {
    const val = parseFloat(newMarkup.replace(',', '.'));
    if (isNaN(val)) return;

    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const pCost = p.cost > 0 ? p.cost : 1;
        const newPrice = pCost * (1 + (val / 100));
        return { ...p, markup: val, price: newPrice };
      }
      return p;
    }));
  };

  const handleSave = async (product: any) => {
    setLoadingIds(prev => ({ ...prev, [product.id]: true }));
    try {
      await updatePricing(product.id, product.price);
    } catch (err) {
      alert("Erro ao salvar preço");
    } finally {
      setLoadingIds(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const handleBatchApply = async () => {
    if (!batchCategoryId || !batchMargin) return alert("Selecione a seção e informe a margem.");
    setIsBatchLoading(true);
    try {
      await applyMarginToCategory(batchCategoryId, parseFloat(batchMargin));
      setShowBatchModal(false);
      router.refresh(); // recarrega os dados do servidor
    } catch (err) {
      alert("Erro ao aplicar em lote");
    } finally {
      setIsBatchLoading(false);
    }
  };

  return (
    <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex-1 flex flex-col min-h-0 relative">
      <div className="p-4 border-b border-indigo-500/[0.08] shrink-0 flex gap-3 justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Buscar produto para precificar..." className="w-full pl-9 pr-4 py-2 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium placeholder:text-slate-600" />
        </div>
        <button onClick={() => setShowBatchModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 text-sm">
          <Percent size={16} /> Reajuste em Lote
        </button>
      </div>

      {showBatchModal && (
        <div className="absolute top-16 right-4 w-80 bg-[#1a1e36] border border-indigo-500/30 shadow-2xl rounded-2xl p-5 z-20 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm">Aplicar Margem por Seção</h3>
            <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Selecione a Seção</label>
              <select value={batchCategoryId} onChange={e => setBatchCategoryId(e.target.value)} className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium px-3 py-2">
                <option value="">-- Selecione --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Margem Desejada (%)</label>
              <input type="number" step="0.1" value={batchMargin} onChange={e => setBatchMargin(e.target.value)} placeholder="Ex: 40" className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium px-3 py-2" />
            </div>
            <button onClick={handleBatchApply} disabled={isBatchLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg font-bold text-sm transition-all shadow-md">
              {isBatchLoading ? "Aplicando..." : "Aplicar e Salvar"}
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Produto</th>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Última Entrada</th>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Custo da Nota</th>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px] text-center">Markup (%)</th>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Preço Final (PDV)</th>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px] text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-500/[0.06]">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-indigo-500/[0.04] transition-colors group">
                <td className="px-5 py-4 font-semibold text-white">
                  {p.name}
                  <div className="text-[10px] text-indigo-400/70 font-medium mt-0.5">{p.category}</div>
                </td>
                <td className="px-5 py-4 text-slate-400 text-xs">
                   {p.lastInvoice ? `NF: ${p.lastInvoice}` : 'Sem Nota'}<br/>
                   <span className="text-[10px] opacity-70">{p.lastEntryDate ? new Date(p.lastEntryDate).toLocaleDateString('pt-BR') : ''}</span>
                </td>
                <td className="px-5 py-4 text-slate-400 font-mono text-right">R$ {(p.cost || 0).toFixed(2)}</td>
                <td className="px-5 py-4 text-center">
                   <div className="inline-flex items-center gap-1 bg-[#0c0f1a] border border-indigo-500/20 rounded-md px-2 py-1">
                     <input type="number" step="0.1" value={p.markup ? p.markup.toFixed(1) : "0.0"} onChange={e => handleMarkupChange(p.id, e.target.value)} className="w-16 bg-transparent text-indigo-400 text-right font-bold outline-none text-xs" />
                     <span className="text-indigo-400/50 text-xs">%</span>
                   </div>
                </td>
                <td className="px-5 py-4 text-right">
                   <div className="inline-flex items-center gap-1 bg-[#0c0f1a] border border-indigo-500/20 rounded-md px-2 py-1">
                     <span className="text-emerald-400/50 text-xs">R$</span>
                     <input type="number" step="0.01" value={p.price ? p.price.toFixed(2) : "0.00"} onChange={e => handlePriceChange(p.id, e.target.value)} className="w-20 bg-transparent text-emerald-400 font-bold font-mono text-right outline-none text-sm" />
                   </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <button onClick={() => handleSave(p)} disabled={loadingIds[p.id]} className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center justify-center mx-auto min-w-[80px] shadow-sm">
                    {loadingIds[p.id] ? "..." : <><Save size={14} className="mr-1" /> Salvar</>}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-sm">Nenhum produto encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
