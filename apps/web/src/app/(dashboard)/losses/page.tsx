"use client";
import { useState } from "react";
import { AlertTriangle, Search, Plus, X, Package, FileText, Truck, Hash, Calendar, Tag, ArrowRight } from "lucide-react";

const EXPIRATIONS_MOCK = [
  { id: "1", product: "Iogurte Natural Batavo", batch: "L-2910", qty: 24, daysLeft: 4, status: "CRITICAL", currentPrice: 8.99 },
  { id: "2", product: "Pão de Forma Tradicional", batch: "L-091A", qty: 15, daysLeft: 5, status: "CRITICAL", currentPrice: 12.50 },
  { id: "3", product: "Cerveja Pilsen Lata 350ml", batch: "L-9982", qty: 120, daysLeft: 10, status: "WARNING", currentPrice: 4.50 },
  { id: "4", product: "Leite Integral Parmalat 1L", batch: "L-1123", qty: 45, daysLeft: 15, status: "WARNING", currentPrice: 6.80 },
  { id: "5", product: "Queijo Mussarela Peça", batch: "L-4412", qty: 8, daysLeft: 28, status: "SAFE", currentPrice: 45.00 },
];

export default function LossesAndExpirationsPage() {
  const [activeTab, setActiveTab] = useState<"LOSSES" | "EXPIRATIONS">("EXPIRATIONS");
  const [items, setItems] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Promo Modal State
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [selectedPromoItem, setSelectedPromoItem] = useState<any>(null);
  
  const [search, setSearch] = useState("");
  const [daysFilter, setDaysFilter] = useState<number | null>(null);

  const handleAddLoss = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setItems(prev => [{ 
      id: Date.now().toString(), 
      product: f.get("product") as string, 
      qty: f.get("qty") as string,
      nfe: f.get("nfe") as string,
      supplier: f.get("supplier") as string,
      status: "Registrado" 
    }, ...prev]);
    setIsModalOpen(false);
  };

  const filteredLosses = items.filter(i => i.product.toLowerCase().includes(search.toLowerCase()));
  
  const filteredExpirations = EXPIRATIONS_MOCK.filter(i => {
    const matchesSearch = i.product.toLowerCase().includes(search.toLowerCase());
    const matchesDays = daysFilter ? i.daysLeft <= daysFilter && i.daysLeft > (daysFilter === 5 ? 0 : daysFilter === 10 ? 5 : daysFilter === 15 ? 10 : 15) : true;
    return matchesSearch && matchesDays;
  });

  const handleOpenPromo = (item: any) => {
    setSelectedPromoItem(item);
    setIsPromoModalOpen(true);
  };

  const handleApplyPromo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newPrice = f.get("newPrice");
    alert(`Preço do lote de ${selectedPromoItem.product} rebaixado para R$ ${newPrice} com sucesso! O sistema atualizará os PDVs em 5 minutos.`);
    setIsPromoModalOpen(false);
    setSelectedPromoItem(null);
  };

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <AlertTriangle className="text-amber-400" size={28} />
            Perdas & Validades
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestão de produtos próximos ao vencimento e registro de avarias/furtos.</p>
        </div>
        {activeTab === "LOSSES" && (
          <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 text-sm">
            <Plus size={16} /> Registrar Perda
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-indigo-500/10 pb-px shrink-0">
        <button 
          onClick={() => setActiveTab("EXPIRATIONS")} 
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "EXPIRATIONS" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-slate-500 hover:text-slate-300"}`}
        >
          <Calendar size={16}/> Validades e Vencimentos
        </button>
        <button 
          onClick={() => setActiveTab("LOSSES")} 
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "LOSSES" ? "border-red-500 text-red-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
        >
          <AlertTriangle size={16}/> Histórico de Perdas
        </button>
      </div>

      {/* EXPIRATIONS TAB */}
      {activeTab === "EXPIRATIONS" && (
        <>
          <div className="grid grid-cols-4 gap-4 shrink-0">
            {[5, 10, 15, 30].map(days => (
              <button 
                key={days} 
                onClick={() => setDaysFilter(daysFilter === days ? null : days)}
                className={`bg-[#111528] border rounded-2xl p-4 flex flex-col items-center justify-center gap-1 transition-all ${daysFilter === days ? "border-[var(--accent)] shadow-[0_0_15px_var(--accent)]/20" : "border-indigo-500/10 hover:border-indigo-500/30"}`}
              >
                <div className={`text-3xl font-black ${days === 5 ? "text-red-500" : days === 10 ? "text-amber-500" : days === 15 ? "text-yellow-400" : "text-emerald-500"}`}>
                  {EXPIRATIONS_MOCK.filter(i => i.daysLeft <= days && i.daysLeft > (days === 5 ? 0 : days === 10 ? 5 : days === 15 ? 10 : 15)).length}
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Em {days} Dias</div>
              </button>
            ))}
          </div>

          <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex-1 flex flex-col min-h-0 shadow-xl">
            <div className="p-4 border-b border-indigo-500/[0.08] shrink-0 flex gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Buscar produto..." className="w-full pl-9 pr-4 py-2 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium" />
              </div>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Produto</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Lote</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Qtd. Estoque</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Vence em</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Ação Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/[0.06]">
                  {filteredExpirations.map(i => (
                    <tr key={i.id} className="hover:bg-indigo-500/[0.04]">
                      <td className="px-6 py-4 font-bold text-white">{i.product}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{i.batch}</td>
                      <td className="px-6 py-4 text-slate-400 font-bold">{i.qty}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black ${
                          i.daysLeft <= 5 ? "bg-red-500/10 text-red-500 border border-red-500/20" : 
                          i.daysLeft <= 15 ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : 
                          "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        }`}>
                          {i.daysLeft} Dias
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleOpenPromo(i)} className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20 text-[var(--accent)] px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-1.5 shadow-lg">
                          <Tag size={12}/> Precificar Rebaixa <ArrowRight size={12}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* LOSSES TAB (Old view modernized) */}
      {activeTab === "LOSSES" && (
        <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-indigo-500/[0.08] shrink-0 flex gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Buscar perda registrada..." className="w-full pl-9 pr-4 py-2 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium" />
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                 <AlertTriangle size={48} className="mx-auto text-indigo-500/20 mb-4" />
                 <p className="text-slate-500 font-medium">Nenhum registro de perda encontrado.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Produto Cadastrado</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Qtd Perdida</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Nota Fiscal / Origem</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/[0.06]">
                  {filteredLosses.map(i => (
                    <tr key={i.id} className="hover:bg-indigo-500/[0.04]">
                      <td className="px-6 py-4 font-bold text-white">{i.product}</td>
                      <td className="px-6 py-4 text-red-400 font-bold">-{i.qty}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{i.nfe || 'N/A'}</td>
                      <td className="px-6 py-4"><span className="text-[10px] px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 font-bold rounded-lg uppercase tracking-wider">{i.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Loss Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-indigo-500/[0.08] flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><AlertTriangle className="text-red-400" size={18}/> Lançar Perda / Avaria</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:bg-slate-800 p-1.5 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddLoss} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest flex items-center gap-1.5"><Package size={12}/> Selecionar Produto</label>
                  <select name="product" required autoFocus className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-4 py-3 rounded-xl outline-none focus:border-red-500 text-sm">
                    <option value="">Selecione um produto do estoque...</option>
                    <option value="Heineken Long Neck 330ml">Heineken Long Neck 330ml</option>
                    <option value="Leite Integral Parmalat 1L">Leite Integral Parmalat 1L</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest flex items-center gap-1.5"><Hash size={12}/> Qtd. (Avaria/Perda)</label>
                  <input name="qty" type="number" required min="1" className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-4 py-3 rounded-xl outline-none focus:border-red-500 font-mono text-lg" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12}/> Nota Fiscal Vinculada</label>
                  <input name="nfe" className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-4 py-3 rounded-xl outline-none focus:border-red-500 font-mono text-sm" placeholder="Opcional..." />
                </div>
              </div>
              <div className="flex gap-3 pt-5 border-t border-indigo-500/[0.08]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all">Cancelar</button>
                <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-red-600/20 text-sm tracking-widest transition-all">CONFIRMAR PERDA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promo/Precificação Modal */}
      {isPromoModalOpen && selectedPromoItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-[var(--accent)]/30 rounded-3xl w-full max-w-md shadow-[0_0_50px_var(--accent)]/10 overflow-hidden">
            <div className="p-6 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[var(--accent)]/5">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Tag className="text-[var(--accent)]" size={20}/> Campanha de Rebaixa
                </h3>
                <p className="text-xs text-[var(--accent)]/80 mt-1 font-bold tracking-widest uppercase">Precificação de Validade Crítica</p>
              </div>
              <button onClick={() => setIsPromoModalOpen(false)} className="text-slate-500 hover:text-white p-1.5 rounded-lg transition-colors bg-slate-800/50"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleApplyPromo} className="p-6 space-y-5">
              <div className="bg-[#0c0f1a] border border-red-500/20 rounded-xl p-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Produto Selecionado</div>
                <div className="flex justify-between items-start mb-3">
                  <div className="font-bold text-white text-base leading-tight">{selectedPromoItem.product}</div>
                  <div className="text-right shrink-0">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Preço Atual</span>
                    <span className="block text-sm font-black text-slate-300 line-through decoration-red-500/50">R$ {selectedPromoItem.currentPrice.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/10">
                   <div>
                     <span className="block text-[10px] font-bold text-red-500/70 uppercase">Lote: {selectedPromoItem.batch}</span>
                     <span className="block text-xs font-black text-red-400">Vence em {selectedPromoItem.daysLeft} dias!</span>
                   </div>
                   <div className="text-right">
                     <span className="block text-[10px] font-bold text-slate-500 uppercase">Estoque do Lote</span>
                     <span className="block text-lg font-black text-white">{selectedPromoItem.qty} UN</span>
                   </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[var(--accent)] mb-2 uppercase tracking-widest">
                  Novo Preço (Rebaixa)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold text-lg">R$</span>
                  <input 
                    name="newPrice" 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    required 
                    autoFocus
                    className="w-full bg-[#0c0f1a] border-2 border-[var(--accent)]/30 text-white font-black text-3xl pl-12 pr-4 py-4 rounded-xl outline-none focus:border-[var(--accent)] shadow-inner transition-all" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <div className="bg-[#0c0f1a] border border-indigo-500/15 rounded-xl p-4">
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Aplicar em quais lojas?</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-indigo-500/30 text-indigo-600 focus:ring-indigo-500/50 bg-[#111528] cursor-pointer" />
                    <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Todas as Lojas (Rede)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-indigo-500/30 text-indigo-600 focus:ring-indigo-500/50 bg-[#111528] cursor-pointer" />
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Loja 1 - Matriz Centro</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-indigo-500/30 text-indigo-600 focus:ring-indigo-500/50 bg-[#111528] cursor-pointer" />
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Loja 2 - Filial Zona Sul</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsPromoModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl text-sm transition-all">Cancelar</button>
                <button type="submit" className="flex-1 bg-[var(--accent)] hover:opacity-90 text-white font-black py-4 rounded-xl shadow-[0_0_20px_var(--accent)]/40 text-sm tracking-widest transition-all">
                  APLICAR REBAIXA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
