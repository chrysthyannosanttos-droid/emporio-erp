"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, ScanBarcode, Camera, Plus, Minus, Trash2, Check,
  AlertTriangle, ArrowUpDown, RefreshCw, Save, FileText,
  X, CheckCircle2, ChevronRight, Package, Sparkles, Filter,
  TrendingDown, TrendingUp, DollarSign, Layers, ArrowLeft,
  Zap, Smartphone
} from "lucide-react";
import Link from "next/link";
import {
  searchInventoryProducts,
  lookupInventoryItem,
  applyInventoryAdjustments,
  InventoryProduct,
  InventoryStats
} from "@/actions/inventory";

interface Props {
  initialStats: InventoryStats;
  initialProducts: InventoryProduct[];
}

interface CountedItem {
  product: InventoryProduct;
  countedStock: number;
  systemStock: number;
  diff: number;
  financialImpact: number;
}

// Bip sonoro com Web Audio API + Vibração Háptica para smartphones
function triggerBipFeedback() {
  try {
    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1760, ctx.currentTime); // 1760Hz (A6)
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40]);
      }
    }
  } catch {}
}

export function InventoryClient({ initialStats, initialProducts }: Props) {
  const [stats, setStats] = useState<InventoryStats>(initialStats);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InventoryProduct[]>(initialProducts);
  const [searching, setSearching] = useState(false);

  // Modo de contagem: "DIRECT" (digita a quantidade) ou "INCREMENTAL" (+1 a cada bip)
  const [countMode, setCountMode] = useState<"DIRECT" | "INCREMENTAL">("INCREMENTAL");

  // Item atualmente selecionado para contagem rápida
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [inputQuantity, setInputQuantity] = useState<string>("1");

  // Lista de produtos contados no lote de balanço
  const [batchItems, setBatchItems] = useState<CountedItem[]>([]);
  const [batchFilter, setBatchFilter] = useState<"ALL" | "SURPLUS" | "DEFICIT" | "MATCH">("ALL");

  // Leitor de câmera
  const [showScanner, setShowScanner] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(false);
  const [scannerContinuous, setScannerContinuous] = useState(true);

  // Status de gravação
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("Balanço Periódico de Estoque");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setScannerSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(initialProducts);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await searchInventoryProducts(q);
      setSearchResults(res.products || []);
      setSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, initialProducts]);

  // Adiciona ou incrementa produto no lote de contagem
  const registerProductCount = useCallback((product: InventoryProduct, quantityToSet?: number, isDelta = false) => {
    triggerBipFeedback();

    setBatchItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.product.id === product.id);
      let newCounted = 0;

      if (existingIdx >= 0) {
        if (isDelta) {
          const step = product.unit.toUpperCase() === "KG" ? 0.1 : 1;
          newCounted = Math.round((prev[existingIdx].countedStock + (quantityToSet ?? step)) * 1000) / 1000;
        } else {
          newCounted = quantityToSet !== undefined ? quantityToSet : prev[existingIdx].countedStock;
        }
      } else {
        newCounted = quantityToSet !== undefined ? quantityToSet : (countMode === "INCREMENTAL" ? (product.unit.toUpperCase() === "KG" ? 0.1 : 1) : 1);
      }

      newCounted = Math.max(0, newCounted);
      const diff = Math.round((newCounted - product.stock) * 1000) / 1000;
      const financialImpact = Math.round(diff * product.costPrice * 100) / 100;

      const newItem: CountedItem = {
        product,
        countedStock: newCounted,
        systemStock: product.stock,
        diff,
        financialImpact,
      };

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newItem;
        return updated;
      }
      return [newItem, ...prev];
    });

    setSaveSuccess(null);
    setErrorMessage(null);
  }, [countMode]);

  // Trata bip por leitor ou submissão direta do input
  const handleCodeLookup = async (codeToLookup: string) => {
    const code = codeToLookup.trim();
    if (!code) return;

    setSearching(true);
    const res = await lookupInventoryItem(code);
    setSearching(false);

    if (res.product) {
      if (countMode === "INCREMENTAL") {
        registerProductCount(res.product, undefined, true);
        setSaveSuccess(`+1 contado: ${res.product.name} (PLU ${res.product.internalCode || "-"})`);
        setTimeout(() => setSaveSuccess(null), 2500);
      } else {
        setSelectedProduct(res.product);
        const existing = batchItems.find((b) => b.product.id === res.product?.id);
        setInputQuantity(String(existing ? existing.countedStock : res.product.stock));
        setTimeout(() => quantityInputRef.current?.focus(), 50);
      }
      setQuery("");
    } else {
      setErrorMessage(`Nenhum produto com código "${code}". Digite o nome ou verifique o PLU.`);
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleCodeLookup(query);
    }
  };

  const handleSelectProductFromList = (p: InventoryProduct) => {
    setSelectedProduct(p);
    const existing = batchItems.find((b) => b.product.id === p.id);
    setInputQuantity(String(existing ? existing.countedStock : p.stock));
    setTimeout(() => quantityInputRef.current?.focus(), 50);
  };

  const confirmSingleItemCount = () => {
    if (!selectedProduct) return;
    const qty = parseFloat(inputQuantity.replace(",", "."));
    if (isNaN(qty) || qty < 0) {
      setErrorMessage("Informe uma quantidade válida.");
      return;
    }
    registerProductCount(selectedProduct, qty, false);
    setSelectedProduct(null);
    setInputQuantity("1");
    searchInputRef.current?.focus();
  };

  const removeBatchItem = (productId: string) => {
    setBatchItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Resumo do lote atual
  const batchSummary = useMemo(() => {
    let totalCountedUnits = 0;
    let surplusCount = 0;
    let surplusValue = 0;
    let deficitCount = 0;
    let deficitValue = 0;
    let matchCount = 0;
    let totalNetImpact = 0;

    for (const item of batchItems) {
      totalCountedUnits += item.countedStock;
      totalNetImpact += item.financialImpact;

      if (item.diff > 0) {
        surplusCount++;
        surplusValue += item.financialImpact;
      } else if (item.diff < 0) {
        deficitCount++;
        deficitValue += Math.abs(item.financialImpact);
      } else {
        matchCount++;
      }
    }

    return {
      totalItems: batchItems.length,
      totalCountedUnits: Math.round(totalCountedUnits * 1000) / 1000,
      surplusCount,
      surplusValue: Math.round(surplusValue * 100) / 100,
      deficitCount,
      deficitValue: Math.round(deficitValue * 100) / 100,
      matchCount,
      totalNetImpact: Math.round(totalNetImpact * 100) / 100,
    };
  }, [batchItems]);

  // Grava o balanço no banco
  const handleFinalizeInventory = async () => {
    if (batchItems.length === 0) {
      setErrorMessage("Nenhum item na lista de balanço para gravar.");
      return;
    }

    const confirmMsg = `Confirma o lançamento do balanço para ${batchItems.length} produtos?\n` +
      `Sobras: ${batchSummary.surplusCount} itens (+R$ ${batchSummary.surplusValue.toFixed(2)})\n` +
      `Faltas: ${batchSummary.deficitCount} itens (-R$ ${batchSummary.deficitValue.toFixed(2)})\n` +
      `Impacto Líquido: R$ ${batchSummary.totalNetImpact.toFixed(2)}`;

    if (!window.confirm(confirmMsg)) return;

    setSaving(true);
    setErrorMessage(null);

    const payload = batchItems.map((b) => ({
      productId: b.product.id,
      countedStock: b.countedStock,
      reason,
    }));

    const res = await applyInventoryAdjustments({
      items: payload,
      defaultReason: reason,
    });

    setSaving(false);

    if (res.success) {
      setSaveSuccess(`Balanço aplicado com sucesso! ${res.totalAdjusted} produtos atualizados no estoque.`);
      setBatchItems([]);
      setStats((prev) => ({
        ...prev,
        totalStockUnits: Math.round((prev.totalStockUnits + (batchSummary.surplusCount - batchSummary.deficitCount)) * 100) / 100,
        totalStockValue: Math.round((prev.totalStockValue + batchSummary.totalNetImpact) * 100) / 100,
      }));
    } else {
      setErrorMessage(res.error || "Erro ao gravar balanço.");
    }
  };

  const filteredBatchItems = useMemo(() => {
    return batchItems.filter((i) => {
      if (batchFilter === "SURPLUS") return i.diff > 0;
      if (batchFilter === "DEFICIT") return i.diff < 0;
      if (batchFilter === "MATCH") return i.diff === 0;
      return true;
    });
  }, [batchItems, batchFilter]);

  return (
    <div className="space-y-4 md:space-y-6 pb-28 md:pb-20 animate-in fade-in duration-200 px-2 sm:px-4 md:px-0 max-w-7xl mx-auto">
      {/* Header & Ações - Responsivo para Smartphone */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/stock"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Voltar ao Estoque"
            >
              <ArrowLeft size={18} />
            </Link>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Inventário Físico & Auditoria
            </span>
            <span className="inline-flex md:hidden items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              <Smartphone size={10} /> Mobile Ready
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Lançamento de Balanço de Estoque
          </h1>
          <p className="text-xs text-slate-400">
            Ajuste o estoque físico por leitor de código de barras, código interno (PLU), nome ou câmera do celular.
          </p>
        </div>

        {/* Alternador de Modo de Bipagem */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 self-stretch sm:self-start md:self-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={() => setCountMode("INCREMENTAL")}
            className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              countMode === "INCREMENTAL"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                : "text-slate-400 hover:text-white"
            }`}
            title="A cada bip no leitor ou câmera, soma +1 unidade"
          >
            <Plus size={14} />
            <span>Bip Contínuo (+1)</span>
          </button>
          <button
            type="button"
            onClick={() => setCountMode("DIRECT")}
            className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              countMode === "DIRECT"
                ? "bg-blue-600 text-white shadow-md shadow-blue-950"
                : "text-slate-400 hover:text-white"
            }`}
            title="Abre campo para digitar a quantidade contada completa"
          >
            <ArrowUpDown size={14} />
            <span>Digitar Quantidade</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas do Catálogo - 2 colunas no celular, 4 no desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Produtos</span>
            <Package size={15} className="text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.totalProducts}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Com PLU 4 dígitos</p>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Unidades</span>
            <Layers size={15} className="text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.totalStockUnits.toLocaleString("pt-BR")}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Saldo no sistema</p>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Valor Total</span>
            <DollarSign size={15} className="text-amber-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 truncate">
            R$ {stats.totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Custo médio apurado</p>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Zerado / Neg.</span>
            <AlertTriangle size={15} className="text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">
            {stats.zeroStockCount + stats.negativeStockCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{stats.negativeStockCount} negativos para acertar</p>
        </div>
      </div>

      {/* Alertas de Feedback */}
      {saveSuccess && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-700 hover:text-emerald-900 p-1">
            <X size={16} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-bold flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900 p-1">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ÁREA DE LANÇAMENTO: Barra de Busca Unificada + Botão Câmera com feedback tátil */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bipar código, digitar PLU (ex: 1004) ou buscar nome..."
              className="w-full pl-10 pr-9 py-3 rounded-xl sm:rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-none"
              autoFocus
            />
            {searching && (
              <RefreshCw size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-600 animate-spin" />
            )}
          </form>

          {/* Botão de Leitor de Câmera */}
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
            title="Abrir câmera do celular ou webcam para bipar"
          >
            <Camera size={18} />
            <span>Ler com a Câmera</span>
          </button>
        </div>

        {/* Card de Produto Selecionado para Edição Rápida de Quantidade */}
        {selectedProduct && (
          <div className="bg-blue-50/80 border-2 border-blue-400/60 rounded-2xl p-3.5 sm:p-5 animate-in zoom-in-95 duration-150">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1 w-full md:w-auto">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200">
                    PLU #{selectedProduct.internalCode || "SEM PLU"}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {selectedProduct.categoryName}
                  </span>
                  {selectedProduct.barcode && (
                    <span className="text-[11px] font-mono text-slate-400">
                      EAN: {selectedProduct.barcode}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {selectedProduct.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                  <span>Estoque Sistema: <strong className="text-slate-900">{selectedProduct.stock} {selectedProduct.unit}</strong></span>
                  <span>Custo Médio: <strong className="text-slate-900">R$ {selectedProduct.costPrice.toFixed(2)}</strong></span>
                </div>
              </div>

              {/* Controles de Quantidade Apurada */}
              <div className="flex items-center gap-2 sm:gap-3 bg-white p-1.5 sm:p-2 rounded-2xl border border-blue-200 shadow-sm w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setInputQuantity((q) => String(Math.max(0, (parseFloat(q) || 0) - (selectedProduct.unit.toUpperCase() === "KG" ? 0.5 : 1))))}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center active:scale-95 text-xs"
                  >
                    -
                  </button>
                  <input
                    ref={quantityInputRef}
                    type="number"
                    step={selectedProduct.unit.toUpperCase() === "KG" ? "0.01" : "1"}
                    value={inputQuantity}
                    onChange={(e) => setInputQuantity(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmSingleItemCount()}
                    className="w-20 text-center text-lg sm:text-xl font-black text-slate-900 bg-transparent outline-none py-1"
                    placeholder="Qtd"
                  />
                  <span className="text-xs font-bold text-slate-400 pr-1">{selectedProduct.unit}</span>
                  <button
                    type="button"
                    onClick={() => setInputQuantity((q) => String(Math.max(0, (parseFloat(q) || 0) + (selectedProduct.unit.toUpperCase() === "KG" ? 0.5 : 1))))}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center active:scale-95 text-xs"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={confirmSingleItemCount}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-1 shadow-md shadow-blue-600/30 active:scale-95 transition-all"
                  >
                    <Check size={16} />
                    <span>Confirmar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                    title="Cancelar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dropdown com Resultados de Busca quando o usuário digita */}
        {query.trim().length >= 2 && searchResults.length > 0 && !selectedProduct && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
            {searchResults.map((p) => {
              const inBatch = batchItems.find((b) => b.product.id === p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProductFromList(p)}
                  className="p-3 hover:bg-blue-50/80 cursor-pointer flex items-center justify-between transition-colors text-xs sm:text-sm"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black font-mono px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                        PLU #{p.internalCode || "SEM PLU"}
                      </span>
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="text-[11px] text-slate-400">({p.categoryName})</span>
                    </div>
                    {p.barcode && (
                      <span className="text-[11px] font-mono text-slate-400 block">
                        Cód. Barras: {p.barcode}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Estoque</span>
                      <span className="font-black text-slate-900">{p.stock} {p.unit}</span>
                    </div>
                    {inBatch && (
                      <span className="text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-lg">
                        Cont: {inBatch.countedStock}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PAINEL DO LOTE DE BALANÇO (ITENS CONTADOS NA SESSÃO) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              Itens no Lote de Balanço
              <span className="text-xs font-extrabold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                {batchItems.length}
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Revise divergências antes de gravar no estoque oficial.
            </p>
          </div>

          {/* Filtros da Lista / Tabela */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setBatchFilter("ALL")}
              className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg transition-all ${
                batchFilter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              Todos ({batchItems.length})
            </button>
            <button
              onClick={() => setBatchFilter("SURPLUS")}
              className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg transition-all ${
                batchFilter === "SURPLUS" ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              Sobras ({batchSummary.surplusCount})
            </button>
            <button
              onClick={() => setBatchFilter("DEFICIT")}
              className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg transition-all ${
                batchFilter === "DEFICIT" ? "bg-rose-600 text-white shadow-sm" : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              Faltas ({batchSummary.deficitCount})
            </button>
            <button
              onClick={() => setBatchFilter("MATCH")}
              className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg transition-all ${
                batchFilter === "MATCH" ? "bg-blue-600 text-white shadow-sm" : "text-blue-700 hover:bg-blue-50"
              }`}
            >
              Exatos ({batchSummary.matchCount})
            </button>
          </div>
        </div>

        {/* Quando vazio */}
        {batchItems.length === 0 ? (
          <div className="py-10 sm:py-12 text-center space-y-2 sm:space-y-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ScanBarcode size={28} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-700">Nenhum produto contado ainda</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Biper o código de barras, digite o PLU interno (ex: 1004) ou toque no botão de câmera acima para iniciar.
            </p>
          </div>
        ) : (
          <>
            {/* 1. Visão Otimizada em CARDS para SMARTPHONES (md:hidden) */}
            <div className="block md:hidden space-y-2.5">
              {filteredBatchItems.map((item) => {
                const isSurplus = item.diff > 0;
                const isDeficit = item.diff < 0;

                return (
                  <div
                    key={item.product.id}
                    className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-black px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded-md">
                            PLU #{item.product.internalCode || "SEM PLU"}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {item.product.categoryName}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {item.product.name}
                        </h4>
                        {item.product.barcode && (
                          <p className="text-[10px] font-mono text-slate-400">
                            EAN: {item.product.barcode}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBatchItem(item.product.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors active:scale-90"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Quantidades e Ajuste Rápido no Smartphone */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Estoque Sistema</span>
                        <span className="font-extrabold text-slate-700">{item.systemStock} {item.product.unit}</span>
                      </div>

                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            const step = item.product.unit.toUpperCase() === "KG" ? 0.1 : 1;
                            registerProductCount(item.product, Math.max(0, Math.round((item.countedStock - step) * 1000) / 1000), false);
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-100 active:bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-sm"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step={item.product.unit.toUpperCase() === "KG" ? "0.01" : "1"}
                          value={item.countedStock}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v >= 0) registerProductCount(item.product, v, false);
                          }}
                          className="w-14 text-center font-black text-slate-900 bg-transparent outline-none text-base"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const step = item.product.unit.toUpperCase() === "KG" ? 0.1 : 1;
                            registerProductCount(item.product, Math.round((item.countedStock + step) * 1000) / 1000), false);
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-100 active:bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-sm"
                        >
                          +
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 pr-1">{item.product.unit}</span>
                      </div>
                    </div>

                    {/* Status de Divergência e Impacto Financeiro */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div>
                        {isSurplus && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            <TrendingUp size={12} />
                            +{item.diff} {item.product.unit} (Sobra)
                          </span>
                        )}
                        {isDeficit && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                            <TrendingDown size={12} />
                            {item.diff} {item.product.unit} (Falta)
                          </span>
                        )}
                        {!isSurplus && !isDeficit && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                            <Check size={12} />
                            Conforme (0)
                          </span>
                        )}
                      </div>
                      <div className="font-mono font-black text-right text-xs">
                        <span className={isSurplus ? "text-emerald-700" : isDeficit ? "text-rose-700" : "text-slate-400"}>
                          {item.financialImpact > 0 ? "+" : ""}
                          R$ {item.financialImpact.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Visão em TABELA para COMPUTADORES & TABLETS (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Código / PLU</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-center">Estoque Sistema</th>
                    <th className="py-3 px-4 text-center">Contagem Física</th>
                    <th className="py-3 px-4 text-center">Divergência</th>
                    <th className="py-3 px-4 text-right">Impacto Financeiro</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBatchItems.map((item) => {
                    const isSurplus = item.diff > 0;
                    const isDeficit = item.diff < 0;

                    return (
                      <tr key={item.product.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-extrabold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                            #{item.product.internalCode || "SEM PLU"}
                          </span>
                          {item.product.barcode && (
                            <span className="block text-[11px] font-mono text-slate-400 mt-0.5">
                              {item.product.barcode}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{item.product.name}</span>
                          <span className="text-xs text-slate-400">{item.product.categoryName}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-600">
                          {item.systemStock} {item.product.unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl">
                            <input
                              type="number"
                              step={item.product.unit.toUpperCase() === "KG" ? "0.01" : "1"}
                              value={item.countedStock}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v) && v >= 0) {
                                  registerProductCount(item.product, v, false);
                                }
                              }}
                              className="w-16 text-center font-black text-slate-900 bg-transparent outline-none"
                            />
                            <span className="text-xs text-slate-400">{item.product.unit}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isSurplus && (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                              <TrendingUp size={14} />
                              +{item.diff} {item.product.unit} (Sobra)
                            </span>
                          )}
                          {isDeficit && (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg">
                              <TrendingDown size={14} />
                              {item.diff} {item.product.unit} (Falta)
                            </span>
                          )}
                          {!isSurplus && !isDeficit && (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg">
                              <Check size={14} />
                              Conforme (0)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-mono font-bold ${
                            isSurplus ? "text-emerald-700" : isDeficit ? "text-rose-700" : "text-slate-400"
                          }`}>
                            {item.financialImpact > 0 ? "+" : ""}
                            R$ {item.financialImpact.toFixed(2).replace(".", ",")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => removeBatchItem(item.product.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remover do lote"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Rodapé do Lote com Totais e Botão de Gravação Desktop */}
        {batchItems.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm font-semibold">
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl text-slate-700">
                Itens: <strong className="text-slate-900">{batchSummary.totalItems}</strong>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-emerald-900">
                Sobras: <strong>{batchSummary.surplusCount}</strong> (+R$ {batchSummary.surplusValue.toFixed(2)})
              </div>
              <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-rose-900">
                Faltas: <strong>{batchSummary.deficitCount}</strong> (-R$ {batchSummary.deficitValue.toFixed(2)})
              </div>
              <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-blue-900">
                Impacto Líquido: <strong>R$ {batchSummary.totalNetImpact.toFixed(2)}</strong>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Deseja realmente limpar toda a contagem atual?")) {
                    setBatchItems([]);
                  }
                }}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all"
              >
                Limpar Lote
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleFinalizeInventory}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Gravando Balanço...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Gravar Balanço no Estoque</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BARRA FIXA FLUTUANTE NO RODAPÉ PARA SMARTPHONE (STICKY BOTTOM BAR) */}
      {batchItems.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3">
          <div className="leading-tight">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              {batchSummary.totalItems} {batchSummary.totalItems === 1 ? "item" : "itens"} | Balanço Líquido
            </span>
            <span className={`text-sm font-black font-mono ${
              batchSummary.totalNetImpact > 0 ? "text-emerald-600" : batchSummary.totalNetImpact < 0 ? "text-rose-600" : "text-slate-900"
            }`}>
              {batchSummary.totalNetImpact > 0 ? "+" : ""}R$ {batchSummary.totalNetImpact.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Limpar contagem?")) setBatchItems([]);
              }}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl"
              title="Limpar"
            >
              <Trash2 size={16} />
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleFinalizeInventory}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 active:from-emerald-700 active:to-teal-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Gravar Balanço</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DO LEITOR DE CÂMERA (TOTALMENTE FULLSCREEN PARA SMARTPHONES) */}
      {showScanner && (
        <CameraScannerModal
          continuous={scannerContinuous}
          onContinuousToggle={() => setScannerContinuous(!scannerContinuous)}
          onDetected={(code) => {
            handleCodeLookup(code);
            if (!scannerContinuous) {
              setShowScanner(false);
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Modal de Câmera & Leitor Mobile-First ───────────────────────── */
function CameraScannerModal({
  onDetected,
  onClose,
  continuous,
  onContinuousToggle,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
  continuous: boolean;
  onContinuousToggle: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [hasCamera, setHasCamera] = useState(false);
  const [useCamera, setUseCamera] = useState(true);
  const [lastBip, setLastBip] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const startCamera = async () => {
      try {
        const Detector = (window as any).BarcodeDetector;
        if (!Detector) {
          setHasCamera(false);
          setUseCamera(false);
          return;
        }

        setHasCamera(true);
        const detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        mediaStreamRef.current = stream;

        // Verifica suporte a lanterna (flash) no smartphone
        const track = stream.getVideoTracks()[0];
        const capabilities = (track as any)?.getCapabilities?.();
        if (capabilities && "torch" in capabilities) {
          setHasTorch(true);
        }

        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        let cooldown = false;
        timer = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2 || cooldown) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              const detected = codes[0].rawValue;
              setLastBip(detected);
              triggerBipFeedback();
              cooldown = true;
              onDetected(detected);
              setTimeout(() => {
                cooldown = false;
              }, 1200);
            }
          } catch {}
        }, 200);
      } catch {
        setHasCamera(false);
        setUseCamera(false);
      }
    };

    startCamera();

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  const toggleTorch = async () => {
    try {
      const track = mediaStreamRef.current?.getVideoTracks()[0];
      if (track) {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      }
    } catch {}
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      triggerBipFeedback();
      onDetected(manualCode.trim());
      setManualCode("");
      if (!continuous) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col backdrop-blur-md animate-in fade-in duration-150">
      {/* Topo do Scanner */}
      <div className="flex items-center justify-between p-3 sm:p-4 text-white border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
            <Camera size={20} />
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base">Scanner de Balanço</h2>
            <p className="text-[11px] text-slate-400">
              {useCamera && hasCamera ? "Aponte para a etiqueta ou código" : "Digite o PLU ou EAN"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Lanterna para celular */}
          {hasTorch && useCamera && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                torchOn ? "bg-amber-500 text-slate-950 border-amber-400" : "bg-slate-800 text-slate-300 border-slate-700"
              }`}
              title="Ligar/Desligar Lanterna"
            >
              <Zap size={16} />
            </button>
          )}

          {/* Alternar modo contínuo */}
          <button
            type="button"
            onClick={onContinuousToggle}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              continuous
                ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {continuous ? "Contínuo" : "1 Bip"}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {useCamera && hasCamera ? (
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden select-none">
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          
          {/* Mira de leitura de código centralizada */}
          <div className="relative w-[88%] max-w-xs sm:max-w-md h-44 sm:h-52 border-4 border-emerald-400 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] flex items-center justify-center">
            <div className="w-full h-0.5 bg-red-500 animate-pulse opacity-90 shadow-sm" />
            {lastBip && (
              <div className="absolute -top-11 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce shadow-lg">
                Bipado: {lastBip}
              </div>
            )}
          </div>

          <div className="absolute bottom-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setUseCamera(false)}
              className="bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-full border border-slate-700 shadow-lg active:scale-95"
            >
              Digitar PLU / Código Manual
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center max-w-md mx-auto w-full">
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="text-center space-y-1 mb-2">
              <ScanBarcode size={42} className="mx-auto text-blue-400" />
              <h3 className="text-lg font-bold text-white">Entrada Rápida por Código</h3>
              <p className="text-xs text-slate-400">
                Digite o Código de Barras (EAN-13) ou o Código Interno / PLU (ex: 1004, 2019)
              </p>
            </div>

            <input
              type="tel"
              inputMode="numeric"
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ex: 1004 ou EAN"
              className="w-full text-center text-3xl font-mono tracking-wider font-bold py-3.5 px-4 bg-slate-900 border-2 border-blue-500 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            />

            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base rounded-2xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check size={18} />
              <span>Localizar e Lançar</span>
            </button>

            {hasCamera && (
              <button
                type="button"
                onClick={() => setUseCamera(true)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl active:scale-95"
              >
                Voltar para Câmera
              </button>
            )}
          </form>
        </div>
      )}

      {error && <p className="p-2 text-center text-xs font-semibold text-amber-300 bg-black/80">{error}</p>}
    </div>
  );
}
