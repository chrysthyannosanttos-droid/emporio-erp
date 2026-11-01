"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, AlertCircle, Check, Search, Calculator, Scale, RefreshCw, Hash } from "lucide-react";
import Link from "next/link";
import { createProduct, getProductInfoByAiBarcode } from "@/actions/product";
import { getMercadologico } from "@/actions/mercadologico";
import { getOperationalCostConfig } from "@/actions/company";
import { calculateProductPricing, formatBRL, formatPct } from "@/lib/product-pricing";
import { DEFAULT_SCALE_SECTORS, detectScaleSector } from "@/lib/scaleConfig";
import { getNextScaleCode } from "@/actions/scale";

const inputClass =
  "w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-900 px-3 py-2 text-sm rounded-xl outline-none font-semibold transition-all placeholder:text-gray-500 shadow-2xs";
const inputMonoClass = inputClass + " font-mono";
const labelClass = "block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1";
const sectionTitleClass = "text-[11px] font-black uppercase tracking-widest text-blue-600 mb-3 pb-1.5 border-b border-gray-200";

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
  const [imageUrl, setImageUrl] = useState("");
  const [sourceFound, setSourceFound] = useState("");
  const [isSelfProduced, setIsSelfProduced] = useState(false);
  const [internalCode, setInternalCode] = useState("");
  const [manualMode, setManualMode] = useState(false);

  // Estados para Balança Toledo MGV6
  const [sendToScale, setSendToScale] = useState(false);
  const [scaleSector, setScaleSector] = useState("carnes");
  const [scaleDigits, setScaleDigits] = useState<4 | 5>(5);
  const [scaleDays, setScaleDays] = useState("3");
  const [scaleDept, setScaleDept] = useState("1");
  const [generatingScaleCode, setGeneratingScaleCode] = useState(false);

  async function handleGenerateScaleCode(sectorId = scaleSector, digits = scaleDigits) {
    setGeneratingScaleCode(true);
    const res = await getNextScaleCode(sectorId, digits);
    if (res.success && res.code) {
      setInternalCode(res.code);
      setScaleDept(String(res.deptCode));
    }
    setGeneratingScaleCode(false);
  }

  async function handleToggleSendToScale(enabled: boolean) {
    setSendToScale(enabled);
    if (enabled) {
      if (unitSale !== "KG" && unitSale !== "UN") {
        setUnitSale("KG");
      }
      if (!internalCode) {
        const detected = detectScaleSector(name);
        setScaleSector(detected.id);
        setScaleDays(String(detected.defaultDays));
        setScaleDept(String(detected.deptCode));
        await handleGenerateScaleCode(detected.id, scaleDigits);
      }
    }
  }

  async function handleSectorChange(newSectorId: string) {
    setScaleSector(newSectorId);
    const sectorObj = DEFAULT_SCALE_SECTORS.find((s) => s.id === newSectorId);
    if (sectorObj) {
      setScaleDays(String(sectorObj.defaultDays));
      setScaleDept(String(sectorObj.deptCode));
    }
    await handleGenerateScaleCode(newSectorId, scaleDigits);
  }

  async function handleDigitsChange(newDigits: 4 | 5) {
    setScaleDigits(newDigits);
    await handleGenerateScaleCode(scaleSector, newDigits);
  }

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

  // Impostos de Entrada
  const [cfopIn, setCfopIn] = useState("1102");
  const [cstIn, setCstIn] = useState("");
  const [icmsRateIn, setIcmsRateIn] = useState("");
  const [icmsRedBaseRateIn, setIcmsRedBaseRateIn] = useState("");
  const [fecoepRateIn, setFecoepRateIn] = useState("");
  const [cstPisIn, setCstPisIn] = useState("");
  const [pisRateIn, setPisRateIn] = useState("");
  const [cstCofinsIn, setCstCofinsIn] = useState("");
  const [cofinsRateIn, setCofinsRateIn] = useState("");
  const [cstIpiIn, setCstIpiIn] = useState("");
  const [ipiRateIn, setIpiRateIn] = useState("");

  // Reforma Tributária
  const [ibsRate, setIbsRate] = useState("");
  const [cbsRate, setCbsRate] = useState("");
  const [isRate, setIsRate] = useState("");

  // Dados Multissetoriais (Logística, Distribuição & Indústria)
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [unitPurchase, setUnitPurchase] = useState("UN");
  const [unitSale, setUnitSale] = useState("UN");
  const [unitConvFactor, setUnitConvFactor] = useState("1");
  const [packagingType, setPackagingType] = useState("UNIT");
  const [unitsPerPack, setUnitsPerPack] = useState("1");
  const [minOrderQty, setMinOrderQty] = useState("1");
  const [grossWeight, setGrossWeight] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [depth, setDepth] = useState("");
  const [isRawMaterial, setIsRawMaterial] = useState(false);
  const [isFinishedGood, setIsFinishedGood] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [freightOther, setFreightOther] = useState("");
  const [operationalRate, setOperationalRate] = useState("15");
  const [desiredMargin, setDesiredMargin] = useState("25");
  const [priceManual, setPriceManual] = useState(false);

  const [activeTab, setActiveTab] = useState<"general" | "logistics" | "fiscal" | "rates">("general");
  const [fiscalSubTab, setFiscalSubTab] = useState<"saida" | "entrada">("saida");

  const pricing = useMemo(
    () =>
      calculateProductPricing({
        purchaseCost: parseFloat(cost) || 0,
        freightOther: parseFloat(freightOther) || 0,
        operationalRate: parseFloat(operationalRate) || 0,
        desiredMargin: parseFloat(desiredMargin) || 0,
        icmsRate: parseFloat(icmsRate) || 0,
        icmsRedBaseRate: parseFloat(icmsRedBaseRate) || 0,
        fecoepRate: parseFloat(fecoepRate) || 0,
        pisRate: parseFloat(pisRate) || 0,
        cofinsRate: parseFloat(cofinsRate) || 0,
        ipiRate: parseFloat(ipiRate) || 0,
        ibsRate: parseFloat(ibsRate) || 0,
        cbsRate: parseFloat(cbsRate) || 0,
        isRate: parseFloat(isRate) || 0,
        icmsRateIn: parseFloat(icmsRateIn) || 0,
        icmsRedBaseRateIn: parseFloat(icmsRedBaseRateIn) || 0,
        fecoepRateIn: parseFloat(fecoepRateIn) || 0,
        pisRateIn: parseFloat(pisRateIn) || 0,
        cofinsRateIn: parseFloat(cofinsRateIn) || 0,
        ipiRateIn: parseFloat(ipiRateIn) || 0,
      }),
    [
      cost, freightOther, operationalRate, desiredMargin,
      icmsRate, icmsRedBaseRate, fecoepRate, pisRate, cofinsRate, ipiRate,
      ibsRate, cbsRate, isRate,
      icmsRateIn, icmsRedBaseRateIn, fecoepRateIn, pisRateIn, cofinsRateIn, ipiRateIn,
    ]
  );

  const computedMargin = (() => {
    const pVal = parseFloat(price);
    const cVal = pricing.totalCost || parseFloat(cost);
    if (!isNaN(pVal) && cVal > 0) {
      return (((pVal - cVal) / cVal) * 100).toFixed(2);
    }
    return null;
  })();

  function applySuggestedPrice() {
    if (pricing.suggestedPrice <= 0 || pricing.error) return;
    setPrice(pricing.suggestedPrice.toFixed(2));
    setPriceManual(false);
  }

  // Mercadológico / Categorias
  const [categoryId, setCategoryId] = useState("");
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  useEffect(() => {
    async function loadCategories() {
      const res = await getMercadologico();
      if (res.categories) {
        setCategoriesList(res.categories);
      }
    }
    async function loadCompanyPricingConfig() {
      const res = await getOperationalCostConfig();
      if (res?.config) {
        if (res.config.defaultOperationalRate !== undefined && res.config.defaultOperationalRate !== null) {
          setOperationalRate(String(res.config.defaultOperationalRate));
        }
        if (res.config.defaultProfitMargin !== undefined && res.config.defaultProfitMargin !== null) {
          setDesiredMargin(String(res.config.defaultProfitMargin));
        }
        if (res.config.defaultFreightOther !== undefined && res.config.defaultFreightOther !== null && res.config.defaultFreightOther > 0) {
          setFreightOther(String(res.config.defaultFreightOther));
        }
      }
    }
    loadCategories();
    loadCompanyPricingConfig();
  }, []);

  // Auto-lookup with debounce
  useEffect(() => {
    if (manualMode || !barcode.trim() || barcode.trim().length < 8) return;

    const handler = setTimeout(() => {
      handleAutoLookup(barcode.trim());
    }, 800);

    return () => clearTimeout(handler);
  }, [barcode, manualMode]);

  useEffect(() => {
    if (priceManual || pricing.suggestedPrice <= 0 || pricing.error) return;
    setPrice(pricing.suggestedPrice.toFixed(2));
  }, [pricing.suggestedPrice, pricing.error, priceManual]);

  async function handleAutoLookup(code: string) {
    setAiLoading(true);
    setAiError("");
    setAiSuccess("");

    const res = await getProductInfoByAiBarcode(code);
    if (res.success && res.name) {
      setName(res.name);
      if (res.price && res.price > 0) {
        setPrice(String(res.price));
        setPriceManual(true);
      }
      if (res.cost && res.cost > 0) setCost(String(res.cost));
      if (res.ncm) setNcm(res.ncm);
      if (res.cest) setCest(res.cest);
      if (res.cfop) setCfop(res.cfop);
      if (res.cst) setCst(res.cst);
      if (res.brand) setBrand(res.brand);
      if (res.imageUrl) setImageUrl(res.imageUrl);
      if (res.source) setSourceFound(res.source);
      if (res.unit) {
        setUnitSale(res.unit);
        setUnitPurchase(res.unit);
      }
      if (res.icmsRate !== undefined) setIcmsRate(String(res.icmsRate));
      if (res.pisRate !== undefined) setPisRate(String(res.pisRate));
      if (res.cofinsRate !== undefined) setCofinsRate(String(res.cofinsRate));
      if (res.ibsRate !== undefined) setIbsRate(String(res.ibsRate));
      if (res.cbsRate !== undefined) setCbsRate(String(res.cbsRate));
      if (res.isRate !== undefined) setIsRate(String(res.isRate));

      // Auto-identificar o Grupo Mercadológico correspondente
      if (categoriesList.length > 0) {
        const nameLower = res.name.toLowerCase();
        const catSuggested = (res.categorySuggested || "").toLowerCase();
        const matched = categoriesList.find((c: any) => {
          const catName = c.name.toLowerCase();
          if (catSuggested && catName.includes(catSuggested)) return true;
          const catParts = catName.split(" > ");
          return catParts.some((part: string) => part.length >= 4 && nameLower.includes(part));
        });
        if (matched) {
          setCategoryId(matched.id);
        }
      }

      setAiSuccess(`Produto identificado via ${res.source || "Base Pública"}!`);
    } else {
      setAiError("Produto não encontrado nas bases públicas. Preencha manualmente.");
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
    formData.append("cost", cost);
    formData.append("stock", stock);
    formData.append("categoryId", categoryId);
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
    // Entrada
    formData.append("cfopIn", cfopIn);
    formData.append("cstIn", cstIn);
    formData.append("icmsRateIn", icmsRateIn);
    formData.append("icmsRedBaseRateIn", icmsRedBaseRateIn);
    formData.append("fecoepRateIn", fecoepRateIn);
    formData.append("cstPisIn", cstPisIn);
    formData.append("pisRateIn", pisRateIn);
    formData.append("cstCofinsIn", cstCofinsIn);
    formData.append("cofinsRateIn", cofinsRateIn);
    formData.append("cstIpiIn", cstIpiIn);
    formData.append("ipiRateIn", ipiRateIn);
    formData.append("isSelfProduced", String(isSelfProduced));
    formData.append("sendToScale", String(sendToScale));
    formData.append("scaleDays", scaleDays);
    formData.append("scaleDept", scaleDept);
    formData.append("internalCode", internalCode);
    formData.append("unit", unitSale);

    // Campos Multissetoriais (Distribuição / Indústria / Logística)
    formData.append("sku", sku);
    formData.append("brand", brand);
    formData.append("manufacturer", manufacturer);
    formData.append("unitPurchase", unitPurchase);
    formData.append("unitSale", unitSale);
    formData.append("unitConvFactor", unitConvFactor);
    formData.append("packagingType", packagingType);
    formData.append("unitsPerPack", unitsPerPack);
    formData.append("minOrderQty", minOrderQty);
    formData.append("grossWeight", grossWeight);
    formData.append("netWeight", netWeight);
    formData.append("width", width);
    formData.append("height", height);
    formData.append("depth", depth);
    formData.append("isRawMaterial", String(isRawMaterial));
    formData.append("isFinishedGood", String(isFinishedGood));
    formData.append("isPackaging", String(isPackaging));
    formData.append("minStock", minStock);
    formData.append("maxStock", maxStock);
    formData.append("leadTimeDays", leadTimeDays);

    const result = await createProduct(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/stock");
    }
  }

  return (
    <div className="max-w-full mx-auto w-full flex flex-col gap-5 select-none pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stock" className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 shadow-sm transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Novo Produto</h1>
            <p className="text-xs text-gray-500 mt-0.5">Cadastre um novo item no estoque com inteligência artificial e tributação automatizada.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Abas de Navegação Estilo Agenda */}
        <div className="flex border-b border-gray-200 bg-gray-50/80">
          {[
            { key: "general", label: "Produto ou Serviço" },
            { key: "logistics", label: "Logística & Indústria" },
            { key: "fiscal", label: "Dados Fiscais" },
            { key: "rates", label: "Reforma Tributária" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-6 py-3.5 text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${activeTab === tab.key
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 text-red-600 text-xs font-semibold flex items-center gap-1.5 border-b border-red-200 pb-3 bg-red-50 p-3 rounded-xl">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {aiError && (
            <div className="mb-6 text-red-600 text-xs font-semibold flex items-center gap-1.5 border-b border-red-200 pb-3 bg-red-50 p-3 rounded-xl">
              <AlertCircle size={16} />
              {aiError}
            </div>
          )}

          {aiSuccess && (
            <div className="mb-6 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 border-b border-emerald-200 pb-3 bg-emerald-50 p-3 rounded-xl">
              <Check size={16} />
              {aiSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {activeTab === "general" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className={labelClass}>Código de Barras (EAN)</label>
                      {sourceFound && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Identificado via {sourceFound}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (barcode.trim()) handleAutoLookup(barcode.trim());
                          }
                        }}
                        className={`flex-1 ${inputMonoClass}`}
                        placeholder="Ex: 7891234567890 (digite ou bipe com leitor)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (barcode.trim()) handleAutoLookup(barcode.trim());
                        }}
                        disabled={aiLoading || !barcode.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-blue-500/20 shrink-0"
                      >
                        {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                        <span>Buscar EAN</span>
                      </button>
                    </div>

                    {imageUrl && (
                      <div className="mt-2.5 p-2 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                        <img src={imageUrl} alt="Foto do produto" className="w-12 h-12 object-contain bg-white rounded p-1 shrink-0 border border-gray-100" />
                        <div className="text-xs">
                          <p className="text-gray-900 font-bold truncate">{name}</p>
                          <p className="text-gray-500 text-[10px]">Imagem e metadados obtidos da base pública</p>
                        </div>
                      </div>
                    )}

                    {aiLoading && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1.5 font-medium">
                        <Loader2 size={12} className="animate-spin" /> Buscando dados do produto nas bases públicas...
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer w-fit">
                        <input type="checkbox" checked={manualMode} onChange={(e) => setManualMode(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Digitar Manualmente</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer w-fit">
                        <input type="checkbox" checked={sendToScale} onChange={(e) => handleToggleSendToScale(e.target.checked)}
                          className="rounded border-amber-400 text-amber-600 focus:ring-amber-500" />
                        <span className="text-[10px] text-amber-800 font-black uppercase tracking-wider flex items-center gap-1">
                          <Scale size={13} className="text-amber-600" /> Produto de Balança (MGV6 / Toledo Prix)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer w-fit">
                        <input type="checkbox" checked={isSelfProduced} onChange={(e) => setIsSelfProduced(e.target.checked)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                        <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Fabricação Própria</span>
                      </label>
                    </div>

                    {sendToScale && (
                      <div className="mt-3 bg-amber-50/70 border-2 border-amber-300/80 rounded-2xl p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-amber-200/80">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                              <Scale size={15} />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                                Carga de Balança Toledo MGV6
                              </h4>
                              <p className="text-[10px] text-amber-800">
                                O código de balança segue sequência por setor (Ex: Carnes inicia com 5, Horti com 6).
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-amber-900">Formato Toledo:</span>
                            <div className="inline-flex rounded-lg border border-amber-300 bg-white p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleDigitsChange(4)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${scaleDigits === 4 ? "bg-amber-500 text-white shadow-xs" : "text-amber-800 hover:bg-amber-50"
                                  }`}
                              >
                                4 Dígitos (ex: 5001)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDigitsChange(5)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${scaleDigits === 5 ? "bg-amber-500 text-white shadow-xs" : "text-amber-800 hover:bg-amber-50"
                                  }`}
                              >
                                5 Dígitos (Padrão Prix: 50001)
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                              Setor da Balança
                            </label>
                            <select
                              value={scaleSector}
                              onChange={(e) => handleSectorChange(e.target.value)}
                              className="w-full bg-white border border-amber-300 text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-bold focus:ring-2 focus:ring-amber-500 shadow-2xs"
                            >
                              {DEFAULT_SCALE_SECTORS.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} (Prefixo {s.prefix})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                                Cód. Balança (PLU) *
                              </label>
                              <button
                                type="button"
                                onClick={() => handleGenerateScaleCode(scaleSector, scaleDigits)}
                                disabled={generatingScaleCode}
                                className="text-[10px] text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1"
                                title="Gerar próximo número livre na sequência do setor"
                              >
                                <RefreshCw size={10} className={generatingScaleCode ? "animate-spin" : ""} /> Próximo
                              </button>
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                required={sendToScale}
                                value={internalCode}
                                onChange={(e) => setInternalCode(e.target.value.replace(/\D/g, "").slice(0, scaleDigits))}
                                placeholder={scaleDigits === 4 ? "Ex: 5001" : "Ex: 50001"}
                                className="w-full bg-white border border-amber-300 text-gray-900 pl-8 pr-3 py-2 text-xs rounded-xl outline-none font-mono font-black tracking-wider focus:ring-2 focus:ring-amber-500 shadow-2xs"
                              />
                              <Hash size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-600" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                              Validade Etiqueta (Dias)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="999"
                              value={scaleDays}
                              onChange={(e) => setScaleDays(e.target.value)}
                              className="w-full bg-white border border-amber-300 text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-mono font-bold focus:ring-2 focus:ring-amber-500 shadow-2xs"
                              placeholder="Ex: 3"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                              Tipo na Balança
                            </label>
                            <select
                              value={unitSale}
                              onChange={(e) => {
                                setUnitSale(e.target.value);
                                setUnitPurchase(e.target.value);
                              }}
                              className="w-full bg-white border border-amber-300 text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-bold focus:ring-2 focus:ring-amber-500 shadow-2xs"
                            >
                              <option value="KG">Pesável por Quilo (KG)</option>
                              <option value="UN">Unitário na Balança (UN)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Cód. Balança / Toledo (PLU)</label>
                    <input type="text" value={internalCode} onChange={(e) => setInternalCode(e.target.value)}
                      disabled={sendToScale}
                      className={`${inputClass} placeholder:text-slate-600 disabled:text-slate-700 disabled:bg-gray-100 font-mono font-bold`}
                      placeholder={sendToScale ? "Definido no card de Balança" : "Ex: 50001"} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Nome do Produto *</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ex: Picanha Bovina Fatiada" />
                  </div>
                  <div>
                    <label className={labelClass}>Unidade de Medida</label>
                    <select
                      value={unitSale}
                      onChange={(e) => {
                        setUnitSale(e.target.value);
                        setUnitPurchase(e.target.value);
                      }}
                      className={inputClass}
                    >
                      <option value="UN">Unidade (UN)</option>
                      <option value="KG">Quilo (KG)</option>
                      <option value="LT">Litro (LT)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Grupo Mercadológico / Categoria
                    {categoryId && <span className="ml-2 text-[10px] text-emerald-600 font-bold">(Sugerido via IA / Automático)</span>}
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className={`${inputClass} font-semibold text-indigo-700`}
                  >
                    <option value="">-- Selecione a Categoria Mercadológica --</option>
                    {categoriesList.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className={labelClass}>Custo de Compra (R$)</label>
                    <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={inputMonoClass} placeholder="0.00" />
                  </div>
                  <div>
                    <label className={labelClass}>Preço de Venda (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        setPriceManual(true);
                      }}
                      className={inputMonoClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="bg-[#f3f7fe] border border-[#c4d5ee] rounded px-3 py-2 flex flex-col justify-center h-[38px]">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-none">Markup sobre custo real</span>
                    <span className="text-sm font-black font-mono text-emerald-600 mt-1">
                      {computedMargin ? `${computedMargin}%` : "---"}
                    </span>
                  </div>
                  <div>
                    <label className={labelClass}>Estoque Inicial</label>
                    <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className={inputMonoClass} placeholder="0" />
                  </div>
                </div>

                <div className="rounded-xl border border-[#c4d5ee] bg-indigo-500/[0.04] p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calculator size={16} className="text-indigo-600" />
                      <p className="text-xs font-black uppercase tracking-widest text-indigo-700">Custo real e preço sugerido</p>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Usa impostos de entrada, saída, reforma, frete, operacional e margem.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Frete / outros (R$)</label>
                      <input type="number" step="0.01" value={freightOther} onChange={(e) => setFreightOther(e.target.value)} className={inputMonoClass} placeholder="0.00" />
                    </div>
                    <div>
                      <label className={labelClass}>Custo operacional (%)</label>
                      <input type="number" step="0.01" min="0" max="99" value={operationalRate} onChange={(e) => setOperationalRate(e.target.value)} className={inputMonoClass} placeholder="15.00" />
                    </div>
                    <div>
                      <label className={labelClass}>Margem desejada (%)</label>
                      <input type="number" step="0.01" min="0" max="99" value={desiredMargin} onChange={(e) => setDesiredMargin(e.target.value)} className={inputMonoClass} placeholder="25.00" />
                    </div>
                  </div>

                  {pricing.error ? (
                    <p className="text-xs text-red-600 font-semibold">{pricing.error}</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-[#f3f7fe] border border-[#c4d5ee] rounded-lg px-3 py-2.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Impostos de entrada</span>
                        <span className="text-sm font-mono font-bold text-amber-700">{formatBRL(pricing.inboundTaxAmount)}</span>
                        <span className="text-[10px] text-slate-500 block">{formatPct(pricing.inboundTaxRate)}</span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 shadow-2xs">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Custo real</span>
                        <span className="text-sm font-mono font-bold text-gray-900">{formatBRL(pricing.totalCost)}</span>
                        <span className="text-[10px] text-gray-500 block">compra + tributos + frete</span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 shadow-2xs">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Carga de saída</span>
                        <span className="text-sm font-mono font-bold text-rose-600">{formatPct(pricing.outboundTaxRate)}</span>
                        <span className="text-[10px] text-gray-500 block">ICMS, PIS, COFINS, IPI, IBS, CBS, IS</span>
                      </div>
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg px-3 py-2.5 shadow-2xs">
                        <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Preço sugerido</span>
                        <span className="text-lg font-mono font-black text-emerald-700 leading-tight">{formatBRL(pricing.suggestedPrice)}</span>
                        <span className="text-[10px] text-emerald-600 block">lucro est. {formatBRL(pricing.estimatedProfit)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[10px] text-slate-500">
                      Fórmula: preço = custo real ÷ (1 − impostos de saída − operacional − margem).
                      {priceManual ? " Preço editado manualmente." : " Preço preenchido automaticamente."}
                    </p>
                    <button
                      type="button"
                      onClick={applySuggestedPrice}
                      disabled={pricing.suggestedPrice <= 0 || !!pricing.error}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-emerald-600/20 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-600/30 disabled:opacity-40"
                    >
                      Usar preço sugerido
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "logistics" && (
              <div className="space-y-6">
                <div>
                  <p className={sectionTitleClass}>Identificação Industrial & Comercial</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>SKU (Código Único)</label>
                      <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} placeholder="Ex: PROD-1002" />
                    </div>
                    <div>
                      <label className={labelClass}>Marca</label>
                      <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} placeholder="Ex: Nestlé, Ambev, Marca Própria" />
                    </div>
                    <div>
                      <label className={labelClass}>Fabricante / Indústria</label>
                      <input type="text" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className={inputClass} placeholder="Ex: Indústrias Reunidas S/A" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className={sectionTitleClass}>Unidades Múltiplas & Fator de Conversão</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Unidade de Compra</label>
                      <input type="text" value={unitPurchase} onChange={(e) => setUnitPurchase(e.target.value)} className={inputClass} placeholder="Ex: CX, FD, KG, TON, BARRA" />
                    </div>
                    <div>
                      <label className={labelClass}>Unidade de Venda</label>
                      <input type="text" value={unitSale} onChange={(e) => setUnitSale(e.target.value)} className={inputClass} placeholder="Ex: UN, KG, MT, TON" />
                    </div>
                    <div>
                      <label className={labelClass}>Fator de Conversão (Qtd na Venda por Compra)</label>
                      <input type="number" step="0.001" value={unitConvFactor} onChange={(e) => setUnitConvFactor(e.target.value)} className={inputMonoClass} placeholder="Ex: 12 (1 CX = 12 UN)" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className={sectionTitleClass}>Embalagem Comercial & Pedido Mínimo (MOQ)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Tipo de Embalagem</label>
                      <select value={packagingType} onChange={(e) => setPackagingType(e.target.value)} className={inputClass}>
                        <option value="UNIT">Unidade (UN)</option>
                        <option value="BOX">Caixa (CX)</option>
                        <option value="PALLET">Palete (PL)</option>
                        <option value="BAG">Fardo / Saco (FD)</option>
                        <option value="BUNDLE">Pacote (PCT)</option>
                        <option value="BARRA">Barra (BR)</option>
                        <option value="BOBINA">Bobina (BOB)</option>
                        <option value="CHAPA">Chapa (CHP)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Unidades por Embalagem</label>
                      <input type="number" value={unitsPerPack} onChange={(e) => setUnitsPerPack(e.target.value)} className={inputMonoClass} placeholder="1" />
                    </div>
                    <div>
                      <label className={labelClass}>Qtd Mínima de Pedido (MOQ)</label>
                      <input type="number" value={minOrderQty} onChange={(e) => setMinOrderQty(e.target.value)} className={inputMonoClass} placeholder="1" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className={sectionTitleClass}>Pesos & Dimensões Logísticas</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <label className={labelClass}>Peso Bruto (KG)</label>
                      <input type="number" step="0.001" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} className={inputMonoClass} placeholder="0.000" />
                    </div>
                    <div>
                      <label className={labelClass}>Peso Líquido (KG)</label>
                      <input type="number" step="0.001" value={netWeight} onChange={(e) => setNetWeight(e.target.value)} className={inputMonoClass} placeholder="0.000" />
                    </div>
                    <div>
                      <label className={labelClass}>Largura (cm)</label>
                      <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} className={inputMonoClass} placeholder="0" />
                    </div>
                    <div>
                      <label className={labelClass}>Altura (cm)</label>
                      <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className={inputMonoClass} placeholder="0" />
                    </div>
                    <div>
                      <label className={labelClass}>Profundidade / Comp. (cm)</label>
                      <input type="number" value={depth} onChange={(e) => setDepth(e.target.value)} className={inputMonoClass} placeholder="0" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className={sectionTitleClass}>Classificação Industrial & Parâmetros de Estoque</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-gray-200 hover:border-blue-400 shadow-2xs transition-colors">
                      <input type="checkbox" checked={isRawMaterial} onChange={(e) => setIsRawMaterial(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-800">Matéria-Prima / Insumo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-gray-200 hover:border-blue-400 shadow-2xs transition-colors">
                      <input type="checkbox" checked={isFinishedGood} onChange={(e) => setIsFinishedGood(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-800">Produto Acabado (Fabricação)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-gray-200 hover:border-blue-400 shadow-2xs transition-colors">
                      <input type="checkbox" checked={isPackaging} onChange={(e) => setIsPackaging(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-800">Embalagem / Consumível</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Estoque Mínimo</label>
                      <input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} className={inputMonoClass} placeholder="0" />
                    </div>
                    <div>
                      <label className={labelClass}>Estoque Máximo</label>
                      <input type="number" value={maxStock} onChange={(e) => setMaxStock(e.target.value)} className={inputMonoClass} placeholder="Sem limite" />
                    </div>
                    <div>
                      <label className={labelClass}>Prazo de Reposição (Lead Time - Dias)</label>
                      <input type="number" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} className={inputMonoClass} placeholder="0" />
                    </div>
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
                      <label className={labelClass}>Origem da Mercadoria</label>
                      <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputClass}>
                        {ORIGIN_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div />
                  </div>
                </div>

                {/* Sub-abas Entrada / Saída */}
                <div className="flex gap-1 border-b border-gray-200 mb-0">
                  {[
                    { key: "saida", label: "🔼 Saída (Emissão NF-e de Venda)", color: "blue" },
                    { key: "entrada", label: "🔽 Entrada (Recebimento de Compra)", color: "amber" },
                  ].map((sub) => (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => setFiscalSubTab(sub.key as typeof fiscalSubTab)}
                      className={`px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all cursor-pointer ${fiscalSubTab === sub.key
                          ? sub.key === "saida"
                            ? "border-blue-600 text-blue-700 bg-blue-50/70"
                            : "border-amber-600 text-amber-800 bg-amber-50/70"
                          : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                        }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* ─── ABA SAÍDA ─── */}
                {fiscalSubTab === "saida" && (
                  <div className="space-y-5 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>CFOP Saída</label>
                        <input type="text" value={cfop} onChange={(e) => setCfop(e.target.value)} className={inputClass} placeholder="Ex: 5102" />
                        <p className="text-[10px] text-slate-600 mt-1">Saída Interna: 5xxx | Saída Interestadual: 6xxx</p>
                      </div>
                      <div>
                        <label className={labelClass}>CST / CSOSN Saída</label>
                        <input type="text" value={cst} onChange={(e) => setCst(e.target.value)} className={inputClass} placeholder="Ex: 102" />
                      </div>
                    </div>

                    <div>
                      <p className={sectionTitleClass}>ICMS / FECOEP — Saída</p>
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

                    <div>
                      <p className={sectionTitleClass}>PIS / COFINS — Saída</p>
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

                    <div>
                      <p className={sectionTitleClass}>IPI — Saída</p>
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

                {/* ─── ABA ENTRADA ─── */}
                {fiscalSubTab === "entrada" && (
                  <div className="space-y-5 pt-2">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                      <strong className="text-amber-950 font-bold">Impostos de Entrada</strong> são usados no cálculo do custo real de compra e na somatória tributária do Pedido de Compra. CFOP de Entrada: 1xxx (compras estaduais), 2xxx (interestaduais), 3xxx (exterior).
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>CFOP Entrada</label>
                        <input type="text" value={cfopIn} onChange={(e) => setCfopIn(e.target.value)} className={inputClass} placeholder="Ex: 1102" />
                        <p className="text-[10px] text-slate-600 mt-1">Entrada Interna: 1xxx | Entrada Interestadual: 2xxx</p>
                      </div>
                      <div>
                        <label className={labelClass}>CST / CSOSN Entrada</label>
                        <input type="text" value={cstIn} onChange={(e) => setCstIn(e.target.value)} className={inputClass} placeholder="Ex: 102" />
                      </div>
                    </div>

                    <div>
                      <p className={sectionTitleClass}>ICMS / FECOEP — Entrada</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={labelClass}>Alíquota ICMS Entrada (%)</label>
                          <input type="number" step="0.01" min="0" max="100" value={icmsRateIn}
                            onChange={(e) => setIcmsRateIn(e.target.value)} className={inputMonoClass} placeholder="Ex: 12.00" />
                        </div>
                        <div>
                          <label className={labelClass}>Redução Base ICMS Entrada (%)</label>
                          <input type="number" step="0.01" min="0" max="100" value={icmsRedBaseRateIn}
                            onChange={(e) => setIcmsRedBaseRateIn(e.target.value)} className={inputMonoClass} placeholder="Ex: 0.00" />
                        </div>
                        <div>
                          <label className={labelClass}>FECOEP / FCP Entrada (%)</label>
                          <input type="number" step="0.01" min="0" max="100" value={fecoepRateIn}
                            onChange={(e) => setFecoepRateIn(e.target.value)} className={inputMonoClass} placeholder="Ex: 2.00" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className={sectionTitleClass}>PIS / COFINS — Entrada</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className={labelClass}>CST PIS Entrada</label>
                          <input type="text" value={cstPisIn} onChange={(e) => setCstPisIn(e.target.value)} className={inputClass} placeholder="Ex: 50" />
                        </div>
                        <div>
                          <label className={labelClass}>Alíquota PIS Entrada (%)</label>
                          <input type="number" step="0.01" min="0" max="100" value={pisRateIn}
                            onChange={(e) => setPisRateIn(e.target.value)} className={inputMonoClass} placeholder="Ex: 1.65" />
                        </div>
                        <div>
                          <label className={labelClass}>CST COFINS Entrada</label>
                          <input type="text" value={cstCofinsIn} onChange={(e) => setCstCofinsIn(e.target.value)} className={inputClass} placeholder="Ex: 50" />
                        </div>
                        <div>
                          <label className={labelClass}>Alíquota COFINS Entrada (%)</label>
                          <input type="number" step="0.01" min="0" max="100" value={cofinsRateIn}
                            onChange={(e) => setCofinsRateIn(e.target.value)} className={inputMonoClass} placeholder="Ex: 7.60" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className={sectionTitleClass}>IPI — Entrada</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>CST IPI Entrada</label>
                          <input type="text" value={cstIpiIn} onChange={(e) => setCstIpiIn(e.target.value)} className={inputClass} placeholder="Ex: 00" />
                        </div>
                        <div>
                          <label className={labelClass}>Alíquota IPI Entrada (%)</label>
                          <input type="number" step="0.01" min="0" max="100" value={ipiRateIn}
                            onChange={(e) => setIpiRateIn(e.target.value)} className={inputMonoClass} placeholder="Ex: 5.00" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {activeTab === "rates" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 border border-[#c4d5ee] bg-indigo-500/5 rounded-lg px-4 py-3">
                  Campos relativos à <span className="text-indigo-700 font-bold">Reforma Tributária (EC 132/2023)</span>. Preenchidos automaticamente pela grade tributária quando o NCM do produto estiver configurado.
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

            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
              <Link href="/stock" className="px-5 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors text-sm">
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50 text-sm"
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
