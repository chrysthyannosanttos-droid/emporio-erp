"use client";

import { useState, useEffect } from "react";
import { Ticket, Search, Plus, X, Calendar, Clock, Tag, Loader2, Play, Pause } from "lucide-react";
import { getProducts } from "@/actions/product";
import { getCampaigns, createCampaign, toggleCampaignStatus } from "@/actions/campaign";

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // New Promotion Form States
  const [promoName, setPromoName] = useState("");
  const [promoType, setPromoType] = useState("DISCOUNT_PERCENT"); // DISCOUNT_FIXED, DISCOUNT_PERCENT, BOGO
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("22:00");
  
  // Rules
  const [ruleType, setRuleType] = useState("QTY"); // QTY, AMT
  const [minQty, setMinQty] = useState("1");
  const [minAmount, setMinAmount] = useState("0");
  const [discountValue, setDiscountValue] = useState("0");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [buyQty, setBuyQty] = useState("3");
  const [payQty, setPayQty] = useState("2");

  // Selected Products
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [campRes, prodRes] = await Promise.all([
      getCampaigns(),
      getProducts()
    ]);
    
    if (campRes.campaigns) {
      setPromotions(campRes.campaigns.filter((c: any) => c.type === "PROMO"));
    }
    if (prodRes.products) setProducts(prodRes.products);
    setLoading(false);
  }

  const handleSavePromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!promoName || !startDate || !startTime) return;

    setSaving(true);
    
    const rules = {
      promoType,
      ruleType,
      minQty: ruleType === "QTY" ? parseInt(minQty) || 1 : null,
      minAmount: ruleType === "AMT" ? parseFloat(minAmount) || 0 : null,
      discountValue: promoType === "DISCOUNT_FIXED" ? parseFloat(discountValue) || 0 : null,
      discountPercent: promoType === "DISCOUNT_PERCENT" ? parseFloat(discountPercent) || 0 : null,
      buyQty: promoType === "BOGO" ? parseInt(buyQty) || 3 : null,
      payQty: promoType === "BOGO" ? parseInt(payQty) || 2 : null,
      productIds: selectedProducts.map(p => p.id)
    };

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = endDate ? new Date(`${endDate}T${endTime}`) : undefined;

    const res = await createCampaign({
      name: promoName,
      type: "PROMO",
      startDate: startDateTime.toISOString(),
      endDate: endDateTime?.toISOString(),
      active: true,
      rules
    });

    if (res.success) {
      loadData();
      setIsModalOpen(false);
      // Reset form
      setPromoName("");
      setStartDate("");
      setEndDate("");
      setSelectedProducts([]);
      setMinQty("1");
      setMinAmount("0");
      setDiscountValue("0");
      setDiscountPercent("0");
      setBuyQty("3");
      setPayQty("2");
    } else {
      alert("Erro ao criar promoção: " + res.error);
    }
    setSaving(false);
  };

  const handleToggleStatus = async (id: string, active: boolean) => {
    const res = await toggleCampaignStatus(id, active);
    if (res.success) {
      setPromotions(prev => prev.map(p => p.id === id ? { ...p, active } : p));
    }
  };

  const formatPromoDescription = (promo: any) => {
    try {
      const rules = promo.rules ? JSON.parse(promo.rules) : null;
      if (!rules) return promo.description || "Sem regras adicionais";

      let prodName = "Qualquer produto";
      if (rules.productIds && Array.isArray(rules.productIds) && rules.productIds.length > 0) {
        if (rules.productIds.length === 1) {
          const p = products.find(prod => prod.id === rules.productIds[0]);
          prodName = p ? `"${p.name}"` : "Produto selecionado";
        } else {
          prodName = `${rules.productIds.length} produtos selecionados`;
        }
      }

      if (rules.promoType === "BOGO") {
        return `Leve ${rules.buyQty} Pague ${rules.payQty} em ${prodName}.`;
      }

      let cond = "";
      if (rules.ruleType === "QTY") {
        cond = `A partir de ${rules.minQty} un. de ${prodName}`;
      } else {
        cond = `Em compras de ${prodName} acima de R$ ${rules.minAmount.toFixed(2)}`;
      }

      let benefit = "";
      if (rules.promoType === "DISCOUNT_FIXED") {
        benefit = `ganhe R$ ${rules.discountValue.toFixed(2)} de desconto.`;
      } else if (rules.promoType === "DISCOUNT_PERCENT") {
        benefit = `ganhe ${rules.discountPercent}% de desconto.`;
      }

      return `${cond}, ${benefit}`;
    } catch (_) {
      return promo.description || "Promoção geral ativa.";
    }
  };

  const filtered = promotions.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Promoções e Ofertas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Crie regras e ofertas de desconto agendadas para todos os clientes no PDV (sem CPF).</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 text-sm active:scale-95">
          <Plus size={16} /> Criar Promoção
        </button>
      </div>

      <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-indigo-500/[0.08] shrink-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} type="text" placeholder="Buscar promoção..." className="w-full pl-9 pr-4 py-2 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium placeholder:text-slate-600" />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="animate-spin text-indigo-500 mb-3" size={24} />
              Carregando promoções...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16">
               <Ticket size={48} className="mx-auto text-indigo-500/20 mb-4" />
               <p className="text-slate-500 font-medium">Nenhuma promoção ativa ou agendada.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Nome da Promoção</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Regra & Mecânica</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Início</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Término</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-indigo-500/[0.04] transition-colors">
                    <td className="px-5 py-3 font-bold text-white">{p.name}</td>
                    <td className="px-5 py-3 text-slate-300 font-medium max-w-xs truncate">{formatPromoDescription(p)}</td>
                    <td className="px-5 py-3 text-slate-400 font-mono text-xs">{new Date(p.startDate).toLocaleString("pt-BR")}</td>
                    <td className="px-5 py-3 text-slate-400 font-mono text-xs">
                      {p.endDate ? new Date(p.endDate).toLocaleString("pt-BR") : "Sem expiração"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] px-2 py-0.5 border font-bold rounded-md ${
                        p.active 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" 
                          : "bg-slate-500/10 text-slate-500 border-slate-500/15"
                      }`}>
                        {p.active ? "Ativa no PDV" : "Pausada"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button 
                        onClick={() => handleToggleStatus(p.id, !p.active)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                          p.active 
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        }`}
                      >
                        {p.active ? "Pausar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-indigo-500/[0.08] flex justify-between items-center shrink-0 bg-[#0c0f1a]/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Ticket className="text-indigo-400" size={18}/> Criar Nova Promoção</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:bg-indigo-500/10 p-1 rounded-lg"><X size={18} /></button>
            </div>

            <form onSubmit={handleSavePromo} className="flex-1 overflow-auto p-5 space-y-5">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nome Comercial da Promoção</label>
                  <input value={promoName} onChange={e => setPromoName(e.target.value)} required autoFocus className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm font-semibold transition-all" placeholder="Ex: Festival de Sucos Tang" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tipo do Desconto</label>
                    <select value={promoType} onChange={e => setPromoType(e.target.value)} className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-sm font-semibold transition-all">
                      <option value="DISCOUNT_PERCENT">Desconto Percentual (%)</option>
                      <option value="DISCOUNT_FIXED">Desconto em Valor Fixo (R$)</option>
                      <option value="BOGO">Leve X Pague Y (BOGO)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Início da Promoção</label>
                    <div className="flex gap-2">
                      <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" required className="flex-1 bg-[#0c0f1a] border border-indigo-500/15 text-slate-300 px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                      <input value={startTime} onChange={e => setStartTime(e.target.value)} type="time" required className="w-24 bg-[#0c0f1a] border border-indigo-500/15 text-slate-300 px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Término da Promoção (Opcional)</label>
                    <div className="flex gap-2">
                      <input value={endDate} onChange={e => setEndDate(e.target.value)} type="date" className="flex-1 bg-[#0c0f1a] border border-indigo-500/15 text-slate-300 px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                      <input value={endTime} onChange={e => setEndTime(e.target.value)} type="time" className="w-24 bg-[#0c0f1a] border border-indigo-500/15 text-slate-300 px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Produtos Participantes */}
              <div className="space-y-4 pt-4 border-t border-indigo-500/[0.08]">
                <div className="bg-[#0c0f1a]/50 p-4 rounded-xl border border-indigo-500/10 space-y-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Selecionar Produtos Participantes</label>
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input 
                        type="text" 
                        value={productSearch} 
                        onChange={e => setProductSearch(e.target.value)} 
                        placeholder="Buscar por nome, EAN ou código..." 
                        className="w-full pl-9 pr-4 py-2 bg-[#111528] border border-indigo-500/15 text-white rounded-lg outline-none focus:border-indigo-500 text-xs font-semibold"
                      />
                    </div>
                    {productSearch.trim().length >= 2 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          const query = productSearch.toLowerCase();
                          const matches = products.filter(p => 
                            p.name.toLowerCase().includes(query) || 
                            p.barcode?.includes(query) || 
                            p.id.includes(query)
                          );
                          const newToAdd = matches.filter(m => !selectedProducts.some(sp => sp.id === m.id));
                          if (newToAdd.length > 0) {
                            setSelectedProducts(prev => [...prev, ...newToAdd]);
                            setProductSearch("");
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                      >
                        Add Família ({products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.barcode?.includes(productSearch)).length})
                      </button>
                    )}
                  </div>

                  {/* Scrollable list of products */}
                  <div className="bg-[#111528] border border-indigo-500/15 rounded-lg max-h-36 overflow-y-auto divide-y divide-indigo-500/[0.06] custom-scrollbar">
                    {products.filter(p => {
                      if (!productSearch.trim()) return true;
                      const q = productSearch.toLowerCase();
                      return p.name.toLowerCase().includes(q) || p.barcode?.includes(q);
                    }).slice(0, 10).map(p => (
                      <div key={p.id} className="p-2 flex justify-between items-center text-xs">
                        <span className="text-white font-semibold truncate max-w-[70%]">{p.name} (R$ {p.price.toFixed(2)})</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (!selectedProducts.some(sp => sp.id === p.id)) {
                              setSelectedProducts(prev => [...prev, p]);
                            }
                            setProductSearch("");
                          }}
                          className="text-indigo-400 hover:underline font-bold"
                        >
                          + Adicionar
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Selected products tag list */}
                  {selectedProducts.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-[#111528]/50 rounded-lg border border-indigo-500/5">
                      {selectedProducts.map(p => (
                        <div key={p.id} className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded-md">
                          <span className="truncate max-w-[150px]">{p.name}</span>
                          <button 
                            type="button" 
                            onClick={() => setSelectedProducts(prev => prev.filter(sp => sp.id !== p.id))}
                            className="text-indigo-400 hover:text-rose-400"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic">Nenhum produto selecionado. Válido para toda a loja.</div>
                  )}
                </div>
              </div>

              {/* Promo Rules Engine */}
              <div className="bg-[#0c0f1a] border border-indigo-500/10 rounded-xl p-4 space-y-3">
                <h4 className="text-[10px] uppercase font-black text-indigo-400 tracking-wider">Regras de Ativação do Desconto</h4>
                
                {promoType !== "BOGO" && (
                  <div className="flex gap-4 border-b border-indigo-500/[0.05] pb-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input type="radio" name="ruleType" checked={ruleType === "QTY"} onChange={() => setRuleType("QTY")} className="text-indigo-500" />
                      Por quantidade mínima de itens
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input type="radio" name="ruleType" checked={ruleType === "AMT"} onChange={() => setRuleType("AMT")} className="text-indigo-500" />
                      Por valor mínimo acumulado
                    </label>
                  </div>
                )}

                {promoType !== "BOGO" && (
                  ruleType === "QTY" ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">A partir de quantas unidades compradas?</label>
                      <input type="number" min="1" value={minQty} onChange={e => setMinQty(e.target.value)} className="w-32 bg-[#111528] border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">A partir de qual valor acumulado do produto?</label>
                      <input type="number" step="0.01" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="w-32 bg-[#111528] border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500" />
                    </div>
                  )
                )}

                {/* Values / Benefits Inputs */}
                {promoType === "DISCOUNT_FIXED" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor do desconto (R$)</label>
                    <input type="number" step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="w-32 bg-[#111528] border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-rose-400 font-mono font-bold outline-none focus:border-indigo-500" />
                  </div>
                )}

                {promoType === "DISCOUNT_PERCENT" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Porcentagem do desconto (%)</label>
                    <input type="number" step="0.1" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} className="w-32 bg-[#111528] border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-rose-400 font-mono font-bold outline-none focus:border-indigo-500" />
                  </div>
                )}

                {promoType === "BOGO" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Leve (Quantidade total)</label>
                      <input type="number" min="1" value={buyQty} onChange={e => setBuyQty(e.target.value)} className="w-full bg-[#111528] border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pague (Quantidade cobrada)</label>
                      <input type="number" min="1" value={payQty} onChange={e => setPayQty(e.target.value)} className="w-full bg-[#111528] border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6 border-t border-indigo-500/[0.08] sticky bottom-0 bg-[#111528] pb-1">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-[#0c0f1a] hover:bg-[#161b33] text-slate-400 font-bold py-3 rounded-xl border border-indigo-500/10 text-sm transition-all active:scale-95">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-grow bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 text-sm transition-all active:scale-95 flex items-center justify-center gap-1">
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /> Gravando...</>
                  ) : (
                    "Gravar Promoção"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
