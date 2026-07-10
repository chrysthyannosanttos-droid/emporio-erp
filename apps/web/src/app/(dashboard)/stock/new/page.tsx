"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Package, Sparkles, Loader2, AlertCircle, Check } from "lucide-react";
import Link from "next/link";
import { createProduct, getProductInfoByAiBarcode } from "@/actions/product";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState("");
  const [aiError, setAiError] = useState("");

  // Form states to allow automatic fill-in from AI
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [ncm, setNcm] = useState("");
  const [cest, setCest] = useState("");
  const [cfop, setCfop] = useState("5102");
  const [cst, setCst] = useState("102");
  const [ibsRate, setIbsRate] = useState("");
  const [cbsRate, setCbsRate] = useState("");
  const [isRate, setIsRate] = useState("");

  const [activeTab, setActiveTab] = useState<"general" | "fiscal" | "rates">("general");

  const [manualMode, setManualMode] = useState(false);

  // Auto-lookup with debounce
  useEffect(() => {
    if (manualMode || !barcode.trim() || barcode.trim().length < 8) return;
    
    const handler = setTimeout(() => {
      handleAutoLookup(barcode.trim());
    }, 800);

    return () => clearTimeout(handler);
  }, [barcode, manualMode]);

  async function handleAutoLookup(code: string) {
    setAiLoading(true);
    setAiError("");
    setAiSuccess("");

    const res = await getProductInfoByAiBarcode(code);
    if (res.success && res.name) {
      setName(res.name);
      if (res.price) setPrice(String(res.price));
      if (res.cost) setCost(String(res.cost));
      if (res.ncm) setNcm(res.ncm);
      if (res.cest) setCest(res.cest);
      if (res.cfop) setCfop(res.cfop);
      if (res.cst) setCst(res.cst);
      if (res.ibsRate !== undefined) setIbsRate(String(res.ibsRate));
      if (res.cbsRate !== undefined) setCbsRate(String(res.cbsRate));
      if (res.isRate !== undefined) setIsRate(String(res.isRate));
      
      setAiSuccess("Produto identificado e campos preenchidos com sucesso!");
    } else {
      setAiError("Produto não encontrado. Preencha manualmente.");
    }
    setAiLoading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("barcode", barcode);
    formData.append("price", price);
    formData.append("stock", stock);
    formData.append("ncm", ncm);
    formData.append("cest", cest);
    formData.append("cfop", cfop);
    formData.append("cst", cst);
    formData.append("ibsRate", ibsRate);
    formData.append("cbsRate", cbsRate);
    formData.append("isRate", isRate);

    const result = await createProduct(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/stock");
    }
  }

  return (
    <div className="max-w-full mx-auto h-full flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stock" className="p-2 bg-[#161b33] border border-indigo-500/15 rounded-lg hover:bg-[#161b33] transition-colors">
            <ArrowLeft size={20} className="text-slate-300" />
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Novo Produto</h1>
        </div>
      </div>

      <div className="bg-[#111528] rounded-xl border border-indigo-500/[0.08] shadow-xl overflow-hidden">
        {/* Abas de Navegação Estilo Agenda */}
        <div className="flex border-b border-indigo-500/10 bg-[#0c0f1a]/20">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-6 py-4 text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${
              activeTab === "general"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-slate-400 hover:text-slate-100"
            }`}
          >
            Produto ou Serviço
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fiscal")}
            className={`px-6 py-4 text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${
              activeTab === "fiscal"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-slate-400 hover:text-slate-100"
            }`}
          >
            Dados Fiscais
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rates")}
            className={`px-6 py-4 text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${
              activeTab === "rates"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-slate-400 hover:text-slate-100"
            }`}
          >
            Reforma Tributária
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 text-red-400 text-xs font-semibold flex items-center gap-1.5 border-b border-red-500/20 pb-3">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {aiError && (
            <div className="mb-6 text-red-400 text-xs font-semibold flex items-center gap-1.5 border-b border-red-500/20 pb-3">
              <AlertCircle size={14} />
              {aiError}
            </div>
          )}

          {aiSuccess && (
            <div className="mb-6 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 border-b border-emerald-500/20 pb-3">
              <Check size={14} />
              {aiSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {activeTab === "general" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Código de Barras (EAN)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className="flex-1 bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none font-mono"
                        placeholder="Ex: 7891234567890"
                      />
                    </div>
                    {aiLoading && (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-400 mt-1.5">
                        <Loader2 size={12} className="animate-spin" /> Buscando dados do produto...
                      </div>
                    )}
                    <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
                      <input 
                        type="checkbox" 
                        checked={manualMode}
                        onChange={e => setManualMode(e.target.checked)}
                        className="rounded bg-[#0c0f1a] border-indigo-500/20 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                      />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Digitar Manualmente</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Código Interno</label>
                    <input type="text" disabled className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] text-slate-500 px-3 py-2 text-sm rounded outline-none" placeholder="Automático" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome do Produto *</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none"
                      placeholder="Ex: Cerveja Heineken 350ml"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unidade de Medida</label>
                    <select className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] text-white px-3 py-2 text-sm rounded outline-none">
                      <option value="UN">Unidade (UN)</option>
                      <option value="KG">Quilo (KG)</option>
                      <option value="LT">Litro (LT)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Preço de Venda (R$) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Preço de Custo (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estoque Inicial</label>
                    <input 
                      type="number" 
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "fiscal" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">NCM</label>
                  <input 
                    type="text" 
                    value={ncm}
                    onChange={(e) => setNcm(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none" 
                    placeholder="Ex: 2203.00.00" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CEST</label>
                  <input 
                    type="text" 
                    value={cest}
                    onChange={(e) => setCest(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none" 
                    placeholder="Ex: 01.001.00" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CFOP Padrão</label>
                  <input 
                    type="text" 
                    value={cfop}
                    onChange={(e) => setCfop(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none" 
                    placeholder="Ex: 5102" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CST / CSOSN Padrão</label>
                  <input 
                    type="text" 
                    value={cst}
                    onChange={(e) => setCst(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none" 
                    placeholder="Ex: 102" 
                  />
                </div>
              </div>
            )}

            {activeTab === "rates" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Alíquota IBS (%)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={ibsRate}
                    onChange={(e) => setIbsRate(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none font-mono" 
                    placeholder="0.00" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Alíquota CBS (%)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={cbsRate}
                    onChange={(e) => setCbsRate(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none font-mono" 
                    placeholder="0.00" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Imp. Seletivo (IS) (%)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={isRate}
                    onChange={(e) => setIsRate(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none font-mono" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-indigo-500/10 flex justify-end gap-3">
              <Link href="/stock" className="px-5 py-2.5 rounded-lg font-bold text-slate-300 bg-[#161b33] border border-indigo-500/15 hover:bg-[#161b33] transition-colors text-sm">
                Cancelar
              </Link>
              <button 
                type="submit" 
                disabled={loading}
                className="px-5 py-2.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 text-sm"
              >
                <Save size={16} />
                {loading ? "Salvando..." : "Salvar Produto"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
