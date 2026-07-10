"use client";

import { useState, useEffect } from "react";
import { Users, Gift, Ticket, Search, Plus, X, Loader2, Calendar, ShoppingBag, Filter, Award, ChevronDown, Check, Play, Pause, Tag, Clock, FileText } from "lucide-react";
import { getCustomersWithStats } from "@/actions/customer";
import { getCampaigns, createCampaign, toggleCampaignStatus } from "@/actions/campaign";
import { getProducts } from "@/actions/product";

export default function CrmPage() {
  const [tab, setTab] = useState<"customers" | "crm_campaigns" | "promotions" | "media_ads">("customers");
  const [loading, setLoading] = useState(true);

  
  // DB Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Filter States for Clients
  const [searchQuery, setSearchQuery] = useState("");
  const [minSpent, setMinSpent] = useState("");
  const [minPurchases, setMinPurchases] = useState("");
  const [inactiveDays, setInactiveDays] = useState("");
  const [minCashback, setMinCashback] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Unified Modal Form State
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState("CRM"); // CRM (CPF Required) or GENERAL (All Clients)
  const [type, setType] = useState("DISCOUNT"); // DISCOUNT, CASHBACK, BOGO, POINTS, RAFFLE (CRM) or DISCOUNT_PERCENT, DISCOUNT_FIXED, BOGO (GENERAL)
  
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("22:00");
  
  // Rules
  const [ruleType, setRuleType] = useState("QTY"); // QTY or AMT
  const [minQty, setMinQty] = useState("1");
  const [minAmount, setMinAmount] = useState("0");
  const [discountValue, setDiscountValue] = useState("0");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [cashbackPercent, setCashbackPercent] = useState("0");
  const [buyQty, setBuyQty] = useState("3");
  const [payQty, setPayQty] = useState("2");

  // Product Selection
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  const [savingCampaign, setSavingCampaign] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Update default benefit types when target type changes
  useEffect(() => {
    if (targetType === "CRM") {
      setType("DISCOUNT");
    } else {
      setType("DISCOUNT_PERCENT");
    }
  }, [targetType]);

  async function loadData() {
    setLoading(true);
    const [custRes, campRes, prodRes] = await Promise.all([
      getCustomersWithStats(),
      getCampaigns(),
      getProducts()
    ]);
    
    if (custRes.customers) setCustomers(custRes.customers);
    if (campRes.campaigns) setCampaigns(campRes.campaigns);
    if (prodRes.products) setProducts(prodRes.products);
    setLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate) return;

    setSavingCampaign(true);
    
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = endDate ? new Date(`${endDate}T${endTime}`) : undefined;

    let rules: any = {};
    if (targetType === "CRM") {
      rules = {
        ruleType,
        minQty: ruleType === "QTY" ? parseInt(minQty) || 1 : null,
        minAmount: ruleType === "AMT" ? parseFloat(minAmount) || 0 : null,
        discountValue: type === "DISCOUNT" ? parseFloat(discountValue) || 0 : null,
        cashbackPercent: type === "CASHBACK" ? parseFloat(cashbackPercent) || 0 : null,
        buyQty: type === "BOGO" ? parseInt(buyQty) || 3 : null,
        payQty: type === "BOGO" ? parseInt(payQty) || 2 : null,
        productIds: selectedProducts.map(p => p.id)
      };
    } else {
      // General Promotions (PROMO type)
      rules = {
        promoType: type, // DISCOUNT_PERCENT, DISCOUNT_FIXED, BOGO
        ruleType: type === "BOGO" ? "QTY" : ruleType,
        minQty: ruleType === "QTY" ? parseInt(minQty) || 1 : null,
        minAmount: ruleType === "AMT" ? parseFloat(minAmount) || 0 : null,
        discountValue: type === "DISCOUNT_FIXED" ? parseFloat(discountValue) || 0 : null,
        discountPercent: type === "DISCOUNT_PERCENT" ? parseFloat(discountPercent) || 0 : null,
        buyQty: type === "BOGO" ? parseInt(buyQty) || 3 : null,
        payQty: type === "BOGO" ? parseInt(payQty) || 2 : null,
        productIds: selectedProducts.map(p => p.id)
      };
    }

    const res = await createCampaign({
      name,
      type: targetType === "CRM" ? type : "PROMO",
      description,
      startDate: startDateTime.toISOString(),
      endDate: endDateTime?.toISOString(),
      active: true,
      rules
    });

    if (res.success) {
      loadData();
      setIsOpen(false);
      // Reset form
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setProductSearchQuery("");
      setSelectedProducts([]);
      setMinQty("1");
      setMinAmount("0");
      setDiscountValue("0");
      setDiscountPercent("0");
      setCashbackPercent("0");
      setBuyQty("3");
      setPayQty("2");
    } else {
      alert("Erro ao criar campanha/promoção: " + res.error);
    }
    setSavingCampaign(false);
  };

  const handleToggleStatus = async (id: string, active: boolean) => {
    const res = await toggleCampaignStatus(id, active);
    if (res.success) {
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, active } : c));
    }
  };

  // Filter clients logically
  const filteredCustomers = customers.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchDoc = c.document?.includes(q);
      if (!matchName && !matchDoc) return false;
    }
    if (minSpent && c.totalSpent < parseFloat(minSpent)) return false;
    if (minPurchases && c.salesCount < parseInt(minPurchases)) return false;
    if (minCashback && c.cashbackBalance < parseFloat(minCashback)) return false;
    if (inactiveDays) {
      if (!c.lastPurchase) return false;
      const days = (Date.now() - new Date(c.lastPurchase).getTime()) / (1000 * 60 * 60 * 24);
      if (days < parseInt(inactiveDays)) return false;
    }
    return true;
  });

  const getCampaignBadgeColor = (type: string) => {
    switch (type) {
      case "DISCOUNT": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "CASHBACK": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "BOGO": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "RAFFLE": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const formatRuleDescription = (camp: any) => {
    try {
      const rules = camp.rules ? JSON.parse(camp.rules) : null;
      if (!rules) return camp.description || "Sem regras adicionais";
      
      let prodName = "Qualquer produto";
      if (rules.productIds && Array.isArray(rules.productIds) && rules.productIds.length > 0) {
        if (rules.productIds.length === 1) {
          const p = products.find(prod => prod.id === rules.productIds[0]);
          prodName = p ? `"${p.name}"` : "Produto selecionado";
        } else {
          prodName = `${rules.productIds.length} produtos selecionados`;
        }
      }

      // If it's a general promotion (PROMO)
      if (camp.type === "PROMO") {
        if (rules.promoType === "BOGO") {
          return `Leve ${rules.buyQty} Pague ${rules.payQty} em ${prodName}.`;
        }
        let cond = `A partir de ${rules.ruleType === "QTY" ? `${rules.minQty} un.` : `R$ ${rules.minAmount.toFixed(2)}`} de ${prodName}`;
        let benefit = rules.promoType === "DISCOUNT_PERCENT" 
          ? `ganhe ${rules.discountPercent}% de desconto.` 
          : `ganhe R$ ${rules.discountValue.toFixed(2)} de desconto.`;
        return `${cond}, ${benefit}`;
      }

      // CRM Campaigns
      if (camp.type === "BOGO") {
        return `Leve ${rules.buyQty} Pague ${rules.payQty} em ${prodName}.`;
      }
      
      let cond = "";
      if (rules.ruleType === "QTY") {
        cond = `A cada ${rules.minQty} unidade(s) de ${prodName}`;
      } else {
        cond = `Em compras de ${prodName} acima de R$ ${rules.minAmount.toFixed(2)}`;
      }

      let benefit = "";
      if (camp.type === "DISCOUNT") {
        benefit = `ganhe R$ ${rules.discountValue.toFixed(2)} de desconto imediato.`;
      } else if (camp.type === "CASHBACK") {
        benefit = `receba ${rules.cashbackPercent}% de cashback de volta.`;
      } else if (camp.type === "RAFFLE") {
        benefit = `ganhe 1 Número da Sorte impresso no cupom.`;
      }

      return `${cond}, ${benefit}`;
    } catch {
      return camp.description || "Campanha ativa.";
    }
  };

  // Split CRM campaigns from general promotions
  const crmCampaignsList = campaigns.filter(c => c.type !== "PROMO");
  const generalPromotionsList = campaigns.filter(c => c.type === "PROMO");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CRM, Promoções & Fidelidade</h1>
          <p className="text-slate-500 text-sm mt-0.5">Painel único para gerenciar cashback de clientes, campanhas de fidelidade e ofertas do PDV.</p>
        </div>
        <button onClick={() => setIsOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 text-sm active:scale-95">
          <Plus size={16} /> Criar Promoção / Campanha
        </button>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        {[
          { label: "Clientes Fidelizados", value: customers.length, sub: "Total na base", icon: <Users size={18} />, color: "text-blue-400" },
          { label: "Promoções Ativas (PDV)", value: generalPromotionsList.filter(c => c.active).length, sub: "Válidas para todos", icon: <Tag size={18} />, color: "text-rose-400" },
          { label: "Campanhas CRM Ativas", value: crmCampaignsList.filter(c => c.active).length, sub: "Requerem identificação (CPF)", icon: <Award size={18} />, color: "text-amber-400" },
          { label: "Total em Cashback", value: `R$ ${customers.reduce((sum, c) => sum + c.cashbackBalance, 0).toFixed(2).replace(".", ",")}`, sub: "Saldo acumulado", icon: <Gift size={18} />, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="bg-[#111528] border border-indigo-500/10 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{s.label}</span>
              <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
              <p className="text-[9px] text-slate-600 mt-0.5">{s.sub}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/5 flex items-center justify-center border border-indigo-500/10 text-slate-400">
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex gap-4 border-b border-indigo-500/[0.08] px-5 shrink-0">
          <button onClick={() => setTab("customers")} className={`pb-3 pt-4 text-xs font-semibold border-b-2 px-1 transition-all ${tab === "customers" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            Base de Clientes ({filteredCustomers.length})
          </button>
          <button onClick={() => setTab("promotions")} className={`pb-3 pt-4 text-xs font-semibold border-b-2 px-1 transition-all ${tab === "promotions" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            Promoções Gerais ({generalPromotionsList.length})
          </button>
          <button onClick={() => setTab("crm_campaigns")} className={`pb-3 pt-4 text-xs font-semibold border-b-2 px-1 transition-all ${tab === "crm_campaigns" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            Campanhas CRM (Fidelidade) ({crmCampaignsList.length})
          </button>
          <button onClick={() => setTab("media_ads")} className={`pb-3 pt-4 text-xs font-semibold border-b-2 px-1 transition-all ${tab === "media_ads" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            Anúncios & Mídias (PDV)
          </button>
        </div>


        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="animate-spin text-indigo-500 mb-3" size={24} />
            Carregando dados...
          </div>
        ) : tab === "customers" ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filter controls */}
            <div className="p-4 border-b border-indigo-500/[0.08] bg-[#0c0f1a]/40 space-y-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[#0c0f1a] border border-indigo-500/15 text-white rounded-lg outline-none focus:border-indigo-500 text-sm placeholder:text-slate-600" placeholder="Buscar cliente por nome ou CPF..." />
                </div>
                <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-bold transition-all ${showFilters ? "border-indigo-500 bg-indigo-500/10 text-indigo-400" : "border-indigo-500/15 text-slate-400 hover:bg-[#161b33]"}`}>
                  <Filter size={12} /> Filtros de Segmentação
                </button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-4 gap-4 p-4 bg-[#0c0f1a]/80 border border-indigo-500/10 rounded-xl animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gasto Acumulado Mínimo</label>
                    <input type="number" placeholder="R$ 0,00" value={minSpent} onChange={e => setMinSpent(e.target.value)} className="w-full bg-[#080b13] border border-indigo-500/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quantidade de Compras</label>
                    <input type="number" placeholder="Ex: 5" value={minPurchases} onChange={e => setMinPurchases(e.target.value)} className="w-full bg-[#080b13] border border-indigo-500/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Inativo há (dias)</label>
                    <input type="number" placeholder="Ex: 30" value={inactiveDays} onChange={e => setInactiveDays(e.target.value)} className="w-full bg-[#080b13] border border-indigo-500/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo Cashback Mínimo</label>
                    <input type="number" placeholder="R$ 0,00" value={minCashback} onChange={e => setMinCashback(e.target.value)} className="w-full bg-[#080b13] border border-indigo-500/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0c0f1a]/60 text-slate-500 text-[10px] font-semibold uppercase sticky top-0 border-b border-indigo-500/[0.08] z-10">
                  <tr>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">CPF</th>
                    <th className="px-5 py-3 text-right">Gasto Total</th>
                    <th className="px-5 py-3 text-right">Qtd Compras</th>
                    <th className="px-5 py-3 text-right">Saldo Cashback</th>
                    <th className="px-5 py-3 text-right">Última Compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/[0.06]">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-xs">
                        Nenhum cliente atende aos filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-indigo-500/[0.04] transition-colors">
                        <td className="px-5 py-3 font-semibold text-white">{c.name}</td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-xs">{c.document || "—"}</td>
                        <td className="px-5 py-3 text-right font-mono text-white text-xs">R$ {c.totalSpent.toFixed(2).replace(".", ",")}</td>
                        <td className="px-5 py-3 text-right font-mono text-slate-400 text-xs">{c.salesCount}</td>
                        <td className="px-5 py-3 text-right font-mono text-emerald-400 font-semibold text-xs">R$ {c.cashbackBalance.toFixed(2).replace(".", ",")}</td>
                        <td className="px-5 py-3 text-right font-mono text-slate-500 text-xs">
                          {c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString("pt-BR") : "Nunca comprou"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === "promotions" || tab === "crm_campaigns" ? (
          <div className="flex-1 overflow-auto min-h-0 p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(tab === "crm_campaigns" ? crmCampaignsList : generalPromotionsList).length === 0 ? (
                <div className="col-span-2 text-center text-slate-500 text-xs py-10">
                  Nenhuma campanha/promoção ativa neste grupo.
                </div>
              ) : (
                (tab === "crm_campaigns" ? crmCampaignsList : generalPromotionsList).map(camp => (
                  <div key={camp.id} className={`bg-[#0c0f1a] border rounded-2xl p-5 flex flex-col justify-between transition-all ${camp.active ? "border-indigo-500/20" : "border-slate-800 opacity-60"}`}>
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase ${getCampaignBadgeColor(camp.type === "PROMO" ? JSON.parse(camp.rules || "{}").promoType : camp.type)}`}>
                            {camp.type === "PROMO" ? "Promoção Geral" : camp.type}
                          </span>
                          <h3 className="text-white font-bold text-base mt-1.5">{camp.name}</h3>
                        </div>
                        <button 
                          onClick={() => handleToggleStatus(camp.id, !camp.active)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                            camp.active 
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                          }`}
                        >
                          {camp.active ? (
                            <><Pause size={10} /> Pausar</>
                          ) : (
                            <><Play size={10} /> Ativar</>
                          )}
                        </button>
                      </div>
                      <p className="text-slate-300 text-xs font-semibold mt-1 bg-[#111528] border border-indigo-500/5 p-3 rounded-lg leading-relaxed">
                        {formatRuleDescription(camp)}
                      </p>
                      {camp.description && (
                        <p className="text-slate-500 text-[11px] mt-2 italic">"{camp.description}"</p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-indigo-500/[0.06] flex justify-between items-center text-[10px] text-slate-500 font-bold">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {new Date(camp.startDate).toLocaleDateString("pt-BR")}
                        {camp.endDate ? ` até ${new Date(camp.endDate).toLocaleDateString("pt-BR")}` : " (Sem fim)"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <MediaAdsTab />
        )}
      </div>


      {/* Unified Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[#0c0f1a]/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Gift className="text-indigo-400" size={18} /> Criar Nova Regra</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-indigo-500/10 text-slate-500 transition-colors"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Público Alvo (Destino)</label>
                  <select value={targetType} onChange={e => setTargetType(e.target.value)} className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-sm font-semibold transition-all">
                    <option value="CRM">Clientes Fidelidade (CRM - Requer CPF)</option>
                    <option value="GENERAL">Todos os Clientes (Promoção Geral - No PDV)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tipo do Benefício</label>
                  {targetType === "CRM" ? (
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-sm font-semibold transition-all">
                      <option value="DISCOUNT">Desconto Direto no Caixa</option>
                      <option value="CASHBACK">Cashback Fidelidade</option>
                      <option value="BOGO">Leve X Pague Y (BOGO)</option>
                      <option value="RAFFLE">Sorteio (Cupom da Sorte)</option>
                    </select>
                  ) : (
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-sm font-semibold transition-all">
                      <option value="DISCOUNT_PERCENT">Desconto Percentual (%)</option>
                      <option value="DISCOUNT_FIXED">Desconto em Valor Fixo (R$)</option>
                      <option value="BOGO">Leve X Pague Y (BOGO)</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nome Comercial</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-sm font-semibold transition-all" placeholder="Ex: Festival de Aniversário - Cervejas" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Data/Hora de Início</label>
                  <div className="flex gap-2">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-sm font-semibold transition-all" required />
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-24 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-sm font-semibold transition-all" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Data/Hora de Término (Opcional)</label>
                  <div className="flex gap-2">
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-sm font-semibold transition-all" />
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-24 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-sm font-semibold transition-all" />
                  </div>
                </div>
              </div>

              {/* Advanced Product Selector */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-[#0c0f1a] border border-indigo-500/10 rounded-xl p-4 space-y-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Produtos Participantes da Campanha</label>
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input 
                        type="text" 
                        value={productSearchQuery} 
                        onChange={e => setProductSearchQuery(e.target.value)} 
                        placeholder="Buscar por nome, EAN ou código..." 
                        className="w-full pl-9 pr-4 py-2.5 bg-[#111528] border border-indigo-500/15 text-white rounded-lg outline-none focus:border-indigo-500 text-xs font-semibold"
                      />
                    </div>
                    {productSearchQuery.trim().length >= 2 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          const query = productSearchQuery.toLowerCase();
                          const matches = products.filter(p => 
                            p.name.toLowerCase().includes(query) || 
                            p.barcode?.includes(query) || 
                            p.id.includes(query)
                          );
                          const newToAdd = matches.filter(m => !selectedProducts.some(sp => sp.id === m.id));
                          if (newToAdd.length > 0) {
                            setSelectedProducts(prev => [...prev, ...newToAdd]);
                            setProductSearchQuery("");
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                      >
                        Add Família ({products.filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || p.barcode?.includes(productSearchQuery)).length})
                      </button>
                    )}
                  </div>

                  {/* Search results dropdown/list */}
                  <div className="bg-[#111528] border border-indigo-500/15 rounded-lg max-h-36 overflow-y-auto divide-y divide-indigo-500/[0.06] custom-scrollbar">
                    {products.filter(p => {
                      if (!productSearchQuery.trim()) return true;
                      const q = productSearchQuery.toLowerCase();
                      return p.name.toLowerCase().includes(q) || p.barcode?.includes(q);
                    }).slice(0, 10).map(p => (
                      <div key={p.id} className="p-2 flex justify-between items-center text-xs">
                        <span className="text-white truncate max-w-[70%] font-semibold">{p.name} (R$ {p.price.toFixed(2)})</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (!selectedProducts.some(sp => sp.id === p.id)) {
                              setSelectedProducts(prev => [...prev, p]);
                            }
                            setProductSearchQuery("");
                          }}
                          className="text-indigo-400 hover:underline font-bold"
                        >
                          + Adicionar
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Selected products tags */}
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

              {/* Rules Engine */}
              <div className="bg-[#0c0f1a] border border-indigo-500/10 rounded-xl p-4 space-y-3">
                <h4 className="text-[10px] uppercase font-black text-indigo-400 tracking-wider">Regras de Ativação do Benefício</h4>
                
                {type !== "BOGO" && (
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

                {type !== "BOGO" && (
                  ruleType === "QTY" ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">A cada quantas unidades compradas?</label>
                      <input type="number" min="1" value={minQty} onChange={e => setMinQty(e.target.value)} className="w-32 bg-[#111528] border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">A partir de qual valor acumulado?</label>
                      <input type="number" step="0.01" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="w-32 bg-[#111528] border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500" />
                    </div>
                  )
                )}

                {/* Values Inputs */}
                {(type === "DISCOUNT" || type === "DISCOUNT_FIXED") && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor do desconto (R$)</label>
                    <input type="number" step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="w-32 bg-[#111528] border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-rose-400 font-mono font-bold outline-none focus:border-indigo-500" />
                  </div>
                )}

                {type === "DISCOUNT_PERCENT" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Porcentagem do desconto (%)</label>
                    <input type="number" step="0.1" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} className="w-32 bg-[#111528] border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-rose-400 font-mono font-bold outline-none focus:border-indigo-500" />
                  </div>
                )}

                {type === "CASHBACK" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Porcentagem de cashback (%)</label>
                    <input type="number" step="0.1" value={cashbackPercent} onChange={e => setCashbackPercent(e.target.value)} className="w-32 bg-[#111528] border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono font-bold outline-none focus:border-indigo-500" />
                  </div>
                )}

                {type === "BOGO" && (
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

                {type === "RAFFLE" && (
                  <div className="text-[10px] text-indigo-300 font-medium italic">
                    Ao atingir a regra configurada, o PDV imprimirá automaticamente um Cupom da Sorte contendo um código QR e um número aleatório único de sorteio para o cliente participante.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descrição Interna (Opcional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-sm h-16 resize-none transition-all" placeholder="Informações internas do regulamento..." />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 bg-[#0c0f1a] hover:bg-[#161b33] text-slate-400 font-bold py-3 rounded-xl border border-indigo-500/10 text-sm transition-all active:scale-95">Voltar</button>
                <button type="submit" disabled={savingCampaign} className="flex-grow flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 text-sm transition-all active:scale-95 disabled:opacity-50">
                  {savingCampaign ? (
                    <><Loader2 className="animate-spin" size={14} /> Salvando...</>
                  ) : (
                    "Gravar Campanha"
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

// ─── Sub-component: MediaAdsTab ──────────────────────────────────────────
const DEFAULT_ADS = [
  { id: "1", title: "LEVE 3 PAGUE 2 HEINEKEN", desc: "Cerveja Heineken Long Neck 330ml - O item de menor valor sai inteiramente grátis!", badge: "OFERTA BOGO", color: "from-emerald-600 to-teal-500", imageUrl: "", active: true },
  { id: "2", title: "QUARTA DO HORTIFRÚTI", desc: "Toda a seção de FLV (Frutas, Legumes e Verduras) com 20% de desconto direto na balança!", badge: "DESCONTO ESPECIAL", color: "from-amber-600 to-orange-500", imageUrl: "", active: true },
  { id: "3", title: "CADASTRE SEU CPF NA NOTA", desc: "Participe do nosso Clube de Vantagens e ganhe até 3% de cashback creditado na hora!", badge: "CASHBACK CRM", color: "from-indigo-600 to-purple-500", imageUrl: "", active: true },
  { id: "4", title: "OFERTA RELÂMPAGO DO DIA", desc: "Leite UHT Integral (diversas marcas) com limite de 12 unidades por cliente por apenas R$ 3,89!", badge: "PROMO LIMITADA", color: "from-rose-600 to-pink-500", imageUrl: "", active: true }
];

const BG_COLORS = [
  { value: "from-emerald-600 to-teal-500", label: "Verde Esmeralda" },
  { value: "from-amber-600 to-orange-500", label: "Laranja Outono" },
  { value: "from-indigo-600 to-purple-500", label: "Roxo Moderno" },
  { value: "from-rose-600 to-pink-500", label: "Rosa Pink" },
  { value: "from-slate-700 to-slate-900", label: "Escuro Clássico" },
];

function MediaAdsTab() {
  const [ads, setAds] = useState<any[]>([]);
  const [speed, setSpeed] = useState("4"); // in seconds
  const [idle, setIdle] = useState("15"); // in seconds
  const [isOpenForm, setIsOpenForm] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [badge, setBadge] = useState("");
  const [color, setColor] = useState("from-indigo-600 to-purple-500");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("EMPORIO_PDV_PROMOTIONAL_ADS");
    if (saved) {
      try {
        setAds(JSON.parse(saved));
      } catch (e) {
        setAds(DEFAULT_ADS);
      }
    } else {
      setAds(DEFAULT_ADS);
      localStorage.setItem("EMPORIO_PDV_PROMOTIONAL_ADS", JSON.stringify(DEFAULT_ADS));
    }

    const savedSpeed = localStorage.getItem("EMPORIO_PDV_AD_SPEED");
    if (savedSpeed) setSpeed(savedSpeed);

    const savedTimeout = localStorage.getItem("EMPORIO_PDV_IDLE_TIMEOUT");
    if (savedTimeout) setIdle(savedTimeout);
  }, []);

  const saveToStorage = (updatedList: any[]) => {
    setAds(updatedList);
    localStorage.setItem("EMPORIO_PDV_PROMOTIONAL_ADS", JSON.stringify(updatedList));
  };

  const handleToggleAd = (id: string) => {
    const updated = ads.map(x => x.id === id ? { ...x, active: !x.active } : x);
    saveToStorage(updated);
  };

  const handleDeleteAd = (id: string) => {
    const updated = ads.filter(x => x.id !== id);
    saveToStorage(updated);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !desc) return;
    const newAd = {
      id: Date.now().toString(),
      title: title.toUpperCase(),
      desc,
      badge: badge ? badge.toUpperCase() : "PROMOÇÃO",
      color,
      imageUrl,
      active: true
    };
    const updated = [newAd, ...ads];
    saveToStorage(updated);
    
    // Reset Form
    setTitle(""); setDesc(""); setBadge(""); setImageUrl("");
    setIsOpenForm(false);
  };

  const handleSaveConfigs = () => {
    localStorage.setItem("EMPORIO_PDV_AD_SPEED", speed);
    localStorage.setItem("EMPORIO_PDV_IDLE_TIMEOUT", idle);
    alert("Configurações de exibição de mídia do PDV salvas!");
  };

  return (
    <div className="flex-1 overflow-auto min-h-0 p-5 space-y-6">
      
      {/* Settings Row */}
      <div className="bg-[#0c0f1a] border border-indigo-500/10 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tempo de Rotação dos Anúncios (Segundos)</label>
          <input 
            type="number" 
            min="2" 
            value={speed} 
            onChange={e => setSpeed(e.target.value)} 
            className="w-full bg-[#111528] border border-indigo-500/15 focus:border-indigo-500 text-white font-mono px-3 py-2 rounded-lg text-sm outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Inatividade para Ativar (Segundos)</label>
          <input 
            type="number" 
            min="5" 
            value={idle} 
            onChange={e => setIdle(e.target.value)} 
            className="w-full bg-[#111528] border border-indigo-500/15 focus:border-indigo-500 text-white font-mono px-3 py-2 rounded-lg text-sm outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSaveConfigs}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Salvar Ajustes
          </button>
          <button 
            onClick={() => setIsOpenForm(true)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Novo Anúncio
          </button>
        </div>
      </div>

      {/* Ads Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ads.map(ad => (
          <div key={ad.id} className={`bg-[#0c0f1a] border rounded-2xl p-5 flex flex-col justify-between transition-all ${ad.active ? "border-indigo-500/20" : "border-slate-800 opacity-50"}`}>
            <div className="flex gap-4">
              {ad.imageUrl && (
                <img src={ad.imageUrl} alt="preview" className="w-16 h-16 rounded-xl object-cover border border-indigo-500/10 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 font-black uppercase tracking-widest px-2 py-0.5 rounded">
                      {ad.badge || "ANÚNCIO"}
                    </span>
                    <h4 className="text-white font-bold text-sm mt-1.5 truncate">{ad.title}</h4>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => handleToggleAd(ad.id)}
                      className={`px-2.5 py-1 rounded-md text-[9px] font-bold border transition-colors ${
                        ad.active 
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20" 
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      {ad.active ? "Pausar" : "Ativar"}
                    </button>
                    <button 
                      onClick={() => handleDeleteAd(ad.id)}
                      className="px-2 py-1 rounded-md text-[9px] font-bold bg-slate-500/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">{ad.desc}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[9px] text-slate-500 font-semibold uppercase">Gradiente:</span>
                  <div className={`h-3 w-12 rounded bg-gradient-to-r ${ad.color} border border-white/10`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Ad modal Form */}
      {isOpenForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[#0c0f1a]/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="text-indigo-400" size={16} /> Novo Anúncio do PDV
              </h3>
              <button onClick={() => setIsOpenForm(false)} className="p-1 rounded-lg hover:bg-indigo-500/10 text-slate-500"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleCreateAd} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Título da Promoção (Chamada Principal)</label>
                <input 
                  type="text" required value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="EX: LEVE 3 PAGUE 2 COCA-COLA" 
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2.5 rounded-lg outline-none text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Regra / Descrição do Anúncio</label>
                <textarea 
                  required value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Descreva o benefício e as condições da oferta..."
                  rows={2}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2.5 rounded-lg outline-none text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tag / Selo</label>
                  <input 
                    type="text" value={badge} onChange={e => setBadge(e.target.value)}
                    placeholder="EX: CLUBE FIDELIDADE" 
                    className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2.5 rounded-lg outline-none text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estilo / Cor Visual</label>
                  <select value={color} onChange={e => setColor(e.target.value)} className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-xs font-semibold">
                    {BG_COLORS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Imagem da Promoção</label>
                <div className="flex gap-3 items-center">
                  <input 
                    type="file" accept="image/*" onChange={handleImageUpload} 
                    className="hidden" id="ad-image-file"
                  />
                  <label 
                    htmlFor="ad-image-file"
                    className="cursor-pointer bg-[#0c0f1a] hover:bg-[#161b33] text-indigo-400 hover:text-indigo-300 border border-indigo-500/15 border-dashed rounded-xl px-4 py-3 text-xs font-bold transition-all text-center flex-1"
                  >
                    {imageUrl ? "✓ Imagem Carregada" : "Selecionar Imagem..."}
                  </label>
                  {imageUrl && (
                    <img src={imageUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-indigo-500/20" />
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsOpenForm(false)} className="flex-1 bg-[#0c0f1a] hover:bg-[#161b33] text-slate-400 font-bold py-2.5 rounded-xl border border-indigo-500/10 text-xs">Voltar</button>
                <button type="submit" className="flex-grow bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg">Cadastrar Anúncio</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

