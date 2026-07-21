"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, AlertCircle, Check } from "lucide-react";
import Link from "next/link";
import { createProduct, getProductInfoByAiBarcode } from "@/actions/product";

const inputClass =
  "w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 text-sm rounded outline-none";
const inputMonoClass = inputClass + " font-mono";
const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1";
const sectionTitleClass = "text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3 pb-1.5 border-b border-indigo-500/10";

const ORIGIN_OPTIONS = [
  { value: "0", label: "0 – Nacional" },
  { value: "1", label: "1 – Estrangeira (Importação Direta)" },
  { value: "2", label: "2 – Estrangeira (Adquirida Mercado Interno)" },
  { value: "3", label: "3 – Nacional c/ >40% Conteúdo Estrangeiro" },
  { value: "4", label: "4 – Nacional (produção básica)" },
  { value: "5", label: "5 – Nacional c/ <40% Conteúdo Estrangeiro" },
  { value: "6", label: "6 – Estrangeira (Importação Direta, sem similar)" },
  { value: "7", label: "7 – Estrangeira (Mercado Interno, sem similar)" },
  { value: "8", label: "8 – Nacional c/ produção básica (CIDE)" },
];

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
  const [isSelfProduced, setIsSelfProduced] = useState(false);
  const [internalCode, setInternalCode] = useState("");
  const [manualMode, setManualMode] = useState(false);

  // Dados Fiscais Base
  const [ncm, setNcm] = useState("");
  const [cest, setCest] = useState("");
  const [cfop, setCfop] = useState("5102");
  const [cst, setCst] = useState("102");
  const [origin, setOrigin] = useState("0");

  // ICMS & FECOEP
  const [icmsRate, setIcmsRate] = useState("");
  const [icmsRedBaseRate, setIcmsRedBaseRate] = useState("");
  const [fecoepRate, setFecoepRate] = useState("");

  // PIS
  const [cstPis, setCstPis] = useState("");
  const [pisRate, setPisRate] = useState("");

  // COFINS
  const [cstCofins, setCstCofins] = useState("");
  const [cofinsRate, setCofinsRate] = useState("");

  // IPI
  const [cstIpi, setCstIpi] = useState("");
  const [ipiRate, setIpiRate] = useState("");

  // Reforma Tributária
  const [ibsRate, setIbsRate] = useState("");
  const [cbsRate, setCbsRate] = useState("");
  const [isRate, setIsRate] = useState("");

  const [activeTab, setActiveTab] = useState<"general" | "fiscal" | "rates">("general");

  // Margem dinâmica calculada em tempo real
  const computedMargin = (() => {
    const pVal = parseFloat(price);
    const cVal = parseFloat(cost);
    if (!isNaN(pVal) && !isNaN(cVal) && cVal > 0) {
      return (((pVal - cVal) / cVal) * 100).toFixed(2);
    }
    return null;
  })();

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
      if (res.icmsRate !== undefined) setIcmsRate(String(res.icmsRate));
      if (res.pisRate !== undefined) setPisRate(String(res.pisRate));
      if (res.cofinsRate !== undefined) setCofinsRate(String(res.cofinsRate));
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
    formData.append("origin", origin);
    formData.append("icmsRate", icmsRate);
    formData.append("icmsRedBaseRate", icmsRedBaseRate);
    formData.append("fecoepRate", fecoepRate);
    formData.append("cstPis", cstPis);
    formData.append("pisRate", pisRate);
    formData.append("cstCofins", cstCofins);
    formData.append("cofinsRate", cofinsRate);
    formData.append("cstIpi", cstIpi);
    formData.append("ipiRate", ipiRate);
    formData.append("ibsRate", ibsRate);
    formData.append("cbsRate", cbsRate);
    formData.append("isRate", isRate);
    formData.append("isSelfProduced", String(isSelfProduced));
    formData.append("internalCode", internalCode);

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
          {[
            { key: "general", label: "Produto ou Serviço" },
            { key: "fiscal",  label: "Dados Fiscais" },
            { key: "rates",   label: "Reforma Tributária" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-6 py-4 text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${
                activeTab === tab.key
                  ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
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
                    <label className={labelClass}>Código de Barras (EAN)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className={`flex-1 ${inputMonoClass}`}
                        placeholder="Ex: 7891234567890"
                      />
                    </div>
                    {aiLoading && (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-400 mt-1.5">
                        <Loader2 size={12} className="animate-spin" /> Buscando dados do produto...
                      </div>
                    )}
                    <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
                      <input type="checkbox" checked={manualMode} onChange={(e) => setManualMode(e.target.checked)}
                        className="rounded bg-[#0c0f1a] border-indigo-500/20 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Digitar Manualmente</span>
                    </label>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
                      <input type="checkbox" checked={isSelfProduced} onChange={(e) => setIsSelfProduced(e.target.checked)}
                        className="rounded bg-[#0c0f1a] border-indigo-500/20 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Produção Própria (Balança Prix)</span>
                    </label>
                  </div>
                  <div>
                    <label className={labelClass}>Cód. Interno / Toledo</label>
                    <input type="text" value={internalCode} onChange={(e) => setInternalCode(e.target.value)}
                      disabled={isSelfProduced && !internalCode}
                      className={`${inputClass} placeholder:text-slate-600 disabled:text-slate-500`}
                      placeholder={isSelfProduced ? "Automático (5 dígitos)" : "Ex: 00123"} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Nome do Produto *</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ex: Cerveja Heineken 350ml" />
                  </div>
                  <div>
                    <label className={labelClass}>Unidade de Medida</label>
                    <select className={inputClass}>
                      <option value="UN">Unidade (UN)</option>
                      <option value="KG">Quilo (KG)</option>
                      <option value="LT">Litro (LT)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className={labelClass}>Preço de Venda (R$) *</label>
                    <input type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} className={inputMonoClass} placeholder="0.00" />
                  </div>
                  <div>
                    <label className={labelClass}>Preço de Custo (R$)</label>
                    <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={inputMonoClass} placeholder="0.00" />
                  </div>
                  <div className="bg-[#0c0f1a] border border-indigo-500/10 rounded px-3 py-2 flex flex-col justify-center h-[38px]">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-none">Margem de Lucro</span>
                    <span className="text-sm font-black font-mono text-emerald-400 mt-1">
                      {computedMargin ? `${computedMargin}%` : "---"}
                    </span>
                  </div>
                  <div>
                    <label className={labelClass}>Estoque Inicial</label>
                    <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className={inputMonoClass} placeholder="0" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "fiscal" && (
              <div className="space-y-6">

                {/* Identificação Fiscal */}
                <div>
                  <p className={sectionTitleClass}>Identificação Fiscal</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className={labelClass}>NCM</label>
                      <input type="text" value={ncm} onChange={(e) => setNcm(e.target.value)} className={inputClass} placeholder="Ex: 2203.00.00" />
                    </div>
                    <div>
                      <label className={labelClass}>CEST</label>
                      <input type="text" value={cest} onChange={(e) => setCest(e.target.value)} className={inputClass} placeholder="Ex: 01.001.00" />
                    </div>
                    <div>
                      <label className={labelClass}>CFOP Padrão</label>
                      <input type="text" value={cfop} onChange={(e) => setCfop(e.target.value)} className={inputClass} placeholder="Ex: 5102" />
                    </div>
                    <div>
                      <label className={labelClass}>CST / CSOSN</label>
                      <input type="text" value={cst} onChange={(e) => setCst(e.target.value)} className={inputClass} placeholder="Ex: 102" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className={labelClass}>Origem da Mercadoria</label>
                    <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputClass}>
                      {ORIGIN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ICMS / FECOEP */}
                <div>
                  <p className={sectionTitleClass}>ICMS / FECOEP — Imposto sobre Circulação de Mercadorias e Fundo de Combate à Pobreza</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Alíquota ICMS (%)</label>
                      <input type="number" step="0.01" min="0" max="100" value={icmsRate}
                        onChange={(e) => setIcmsRate(e.target.value)} className={inputMonoClass} placeholder="Ex: 12.00" />
                    </div>
                    <div>
                      <label className={labelClass}>Redução Base ICMS (%)</label>
                      <input type="number" step="0.01" min="0" max="100" value={icmsRedBaseRate}
                        onChange={(e) => setIcmsRedBaseRate(e.target.value)} className={inputMonoClass} placeholder="Ex: 33.33" />
                    </div>
                    <div>
                      <label className={labelClass}>Alíquota FECOEP / FCP (%)</label>
                      <input type="number" step="0.01" min="0" max="100" value={fecoepRate}
                        onChange={(e) => setFecoepRate(e.target.value)} className={inputMonoClass} placeholder="Ex: 2.00" />
                    </div>
                  </div>
                </div>

                {/* PIS / COFINS */}
                <div>
                  <p className={sectionTitleClass}>PIS / COFINS — Contribuições Sociais</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className={labelClass}>CST PIS</label>
                      <input type="text" value={cstPis} onChange={(e) => setCstPis(e.target.value)} className={inputClass} placeholder="Ex: 01" />
                    </div>
                    <div>
                      <label className={labelClass}>Alíquota PIS (%)</label>
                      <input type="number" step="0.01" min="0" max="100" value={pisRate}
                        onChange={(e) => setPisRate(e.target.value)} className={inputMonoClass} placeholder="Ex: 1.65" />
                    </div>
                    <div>
                      <label className={labelClass}>CST COFINS</label>
                      <input type="text" value={cstCofins} onChange={(e) => setCstCofins(e.target.value)} className={inputClass} placeholder="Ex: 01" />
                    </div>
                    <div>
                      <label className={labelClass}>Alíquota COFINS (%)</label>
                      <input type="number" step="0.01" min="0" max="100" value={cofinsRate}
                        onChange={(e) => setCofinsRate(e.target.value)} className={inputMonoClass} placeholder="Ex: 7.60" />
                    </div>
                  </div>
                </div>

                {/* IPI */}
                <div>
                  <p className={sectionTitleClass}>IPI — Imposto sobre Produtos Industrializados</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>CST IPI</label>
                      <input type="text" value={cstIpi} onChange={(e) => setCstIpi(e.target.value)} className={inputClass} placeholder="Ex: 50" />
                    </div>
                    <div>
                      <label className={labelClass}>Alíquota IPI (%)</label>
                      <input type="number" step="0.01" min="0" max="100" value={ipiRate}
                        onChange={(e) => setIpiRate(e.target.value)} className={inputMonoClass} placeholder="Ex: 5.00" />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === "rates" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 border border-indigo-500/10 bg-indigo-500/5 rounded-lg px-4 py-3">
                  Campos relativos à <span className="text-indigo-300 font-bold">Reforma Tributária (EC 132/2023)</span>. Preenchidos automaticamente pela grade tributária quando o NCM do produto estiver configurado.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Alíquota IBS (%)</label>
                    <input type="number" step="0.01" value={ibsRate} onChange={(e) => setIbsRate(e.target.value)} className={inputMonoClass} placeholder="0.00" />
                    <p className="text-[10px] text-slate-600 mt-1">Imposto sobre Bens e Serviços</p>
                  </div>
                  <div>
                    <label className={labelClass}>Alíquota CBS (%)</label>
                    <input type="number" step="0.01" value={cbsRate} onChange={(e) => setCbsRate(e.target.value)} className={inputMonoClass} placeholder="0.00" />
                    <p className="text-[10px] text-slate-600 mt-1">Contribuição sobre Bens e Serviços</p>
                  </div>
                  <div>
                    <label className={labelClass}>Imp. Seletivo (IS) (%)</label>
                    <input type="number" step="0.01" value={isRate} onChange={(e) => setIsRate(e.target.value)} className={inputMonoClass} placeholder="0.00" />
                    <p className="text-[10px] text-slate-600 mt-1">Imposto Seletivo (bebidas, tabaco, etc.)</p>
                  </div>
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
