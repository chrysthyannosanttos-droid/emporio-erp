"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, ScanBarcode, Camera, Plus, Minus, Trash2, Check,
  AlertTriangle, ArrowUpDown, RefreshCw, Save, FileText,
  X, CheckCircle2, ChevronRight, Package, Sparkles, Filter,
  TrendingDown, TrendingUp, DollarSign, Layers, ArrowLeft
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
      setErrorMessage(`Nenhum produto encontrado com o código "${code}". Tente o nome do produto.`);
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
      // Atualiza estatísticas locais
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
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header & Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/stock"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Voltar ao Estoque"
            >
              <ArrowLeft size={18} />
            </Link>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Inventário Físico & Auditoria
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Lançamento de Balanço de Estoque
          </h1>
          <p className="text-xs text-slate-400">
            Ajuste o estoque físico por leitor de código de barras, código interno (PLU), nome ou câmera do celular.
          </p>
        </div>

        {/* Alternador de Modo de Bipagem */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setCountMode("INCREMENTAL")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
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
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
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

      {/* Cards de Métricas do Catálogo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Produtos Ativos</span>
            <Package size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalProducts}</div>
          <p className="text-[11px] text-slate-500 mt-1">Todos com PLU de 4 dígitos</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Unidades em Estoque</span>
            <Layers size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalStockUnits.toLocaleString("pt-BR")}</div>
          <p className="text-[11px] text-slate-500 mt-1">Saldo contábil no sistema</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Valor em Estoque</span>
            <DollarSign size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            R$ {stats.totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Custo médio total apurado</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Estoque Zerado / Neg.</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">
            {stats.zeroStockCount + stats.negativeStockCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{stats.negativeStockCount} negativos precisando de acerto</p>
        </div>
      </div>

      {/* Alertas de Feedback */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-bold flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={16} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm font-bold flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ÁREA DE LANÇAMENTO: Barra de Busca Unificada + Botão Câmera */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bipar código de barras, digitar PLU interno (ex: 1004) ou buscar pelo nome..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-base font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-none"
              autoFocus
            />
            {searching && (
              <RefreshCw size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 animate-spin" />
            )}
          </form>

          {/* Botão de Leitor de Câmera */}
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
            title="Abrir câmera do celular ou webcam para bipar"
          >
            <Camera size={20} />
            <span>Ler com a Câmera</span>
          </button>
        </div>

        {/* Card de Produto Selecionado para Edição Rápida de Quantidade */}
        {selectedProduct && (
          <div className="bg-blue-50/70 border-2 border-blue-400/60 rounded-2xl p-5 animate-in zoom-in-95 duration-150">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200">
                    PLU #{selectedProduct.internalCode || "SEM PLU"}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedProduct.categoryName}
                  </span>
                  {selectedProduct.barcode && (
                    <span className="text-xs font-mono text-slate-400">
                      EAN: {selectedProduct.barcode}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedProduct.name}
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <span>Estoque no Sistema: <strong className="text-slate-900">{selectedProduct.stock} {selectedProduct.unit}</strong></span>
                  <span>Custo Médio: <strong className="text-slate-900">R$ {selectedProduct.costPrice.toFixed(2)}</strong></span>
                </div>
              </div>

              {/* Controles de Quantidade Apurada */}
              <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-blue-200 shadow-sm w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setInputQuantity((q) => String(Math.max(0, (parseFloat(q) || 0) - (selectedProduct.unit.toUpperCase() === "KG" ? 1 : 1))))}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center active:scale-95"
                  >
                    -1
                  </button>
                  <input
                    ref={quantityInputRef}
                    type="number"
                    step={selectedProduct.unit.toUpperCase() === "KG" ? "0.01" : "1"}
                    value={inputQuantity}
                    onChange={(e) => setInputQuantity(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmSingleItemCount()}
                    className="w-24 text-center text-xl font-black text-slate-900 bg-transparent outline-none py-1"
                    placeholder="Qtd"
                  />
                  <span className="text-xs font-bold text-slate-400 pr-1">{selectedProduct.unit}</span>
                  <button
                    type="button"
                    onClick={() => setInputQuantity((q) => String(Math.max(0, (parseFloat(q) || 0) + (selectedProduct.unit.toUpperCase() === "KG" ? 1 : 1))))}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center active:scale-95"
                  >
                    +1
                  </button>
                </div>

                <button
                  type="button"
                  onClick={confirmSingleItemCount}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/30 active:scale-95 transition-all"
                >
                  <Check size={16} />
                  <span>Confirmar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                  title="Cancelar"
                >
                  <X size={18} />
                </button>
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
                  className="p-3.5 hover:bg-blue-50/80 cursor-pointer flex items-center justify-between transition-colors text-sm"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                        PLU #{p.internalCode || "SEM PLU"}
                      </span>
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="text-xs text-slate-400">({p.categoryName})</span>
                    </div>
                    {p.barcode && (
                      <span className="text-xs font-mono text-slate-400 block">
                        Cód. Barras: {p.barcode}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Estoque Atual</span>
                      <span className="font-black text-slate-900">{p.stock} {p.unit}</span>
                    </div>
                    {inBatch && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                        Contado: {inBatch.countedStock}
                      </span>
                    )}
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PAINEL DO LOTE DE BALANÇO (ITENS CONTADOS NA SESSÃO) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              Itens no Lote de Balanço
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                {batchItems.length} {batchItems.length === 1 ? "item" : "itens"}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Revise as divergências antes de gravar as atualizações no estoque oficial.
            </p>
          </div>

          {/* Filtros da Tabela */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setBatchFilter("ALL")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                batchFilter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              Todos ({batchItems.length})
            </button>
            <button
              onClick={() => setBatchFilter("SURPLUS")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                batchFilter === "SURPLUS" ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              Sobras ({batchSummary.surplusCount})
            </button>
            <button
              onClick={() => setBatchFilter("DEFICIT")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                batchFilter === "DEFICIT" ? "bg-rose-600 text-white shadow-sm" : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              Faltas ({batchSummary.deficitCount})
            </button>
            <button
              onClick={() => setBatchFilter("MATCH")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                batchFilter === "MATCH" ? "bg-blue-600 text-white shadow-sm" : "text-blue-700 hover:bg-blue-50"
              }`}
            >
              Exatos ({batchSummary.matchCount})
            </button>
          </div>
        </div>

        {/* Tabela de Itens Contados */}
        {batchItems.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ScanBarcode size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-700">Nenhum produto contado ainda</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Biper o código de barras, digite o código interno (PLU) ou use a câmera do celular acima para iniciar o lançamento do balanço.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
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
        )}

        {/* Rodapé do Lote com Totais e Botão de Gravação */}
        {batchItems.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
              <div className="bg-slate-100 px-3.5 py-2 rounded-xl text-slate-700">
                Itens no Lote: <strong className="text-slate-900">{batchSummary.totalItems}</strong>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-emerald-900">
                Sobras: <strong>{batchSummary.surplusCount}</strong> (+R$ {batchSummary.surplusValue.toFixed(2)})
              </div>
              <div className="bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl text-rose-900">
                Faltas: <strong>{batchSummary.deficitCount}</strong> (-R$ {batchSummary.deficitValue.toFixed(2)})
              </div>
              <div className="bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-xl text-blue-900">
                Impacto Líquido: <strong>R$ {batchSummary.totalNetImpact.toFixed(2)}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
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

      {/* MODAL DO LEITOR DE CÂMERA (COMPLETO / CELULAR OU DESKTOP) */}
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

/* ───────────────────────── Modal de Câmera & Leitor Rápido ───────────────────────── */
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
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onDetected(manualCode.trim());
      setManualCode("");
      if (!continuous) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 flex flex-col backdrop-blur-md animate-in fade-in duration-150">
      <div className="flex items-center justify-between p-4 text-white border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
            <Camera size={22} />
          </div>
          <div>
            <h2 className="font-bold text-base">Leitor de Balanço de Estoque</h2>
            <p className="text-xs text-slate-400">
              {useCamera && hasCamera
                ? "Aponte a câmera para o código de barras ou etiqueta"
                : "Digite o código de barras (EAN) ou PLU interno (4 dígitos)"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternar modo contínuo */}
          <button
            type="button"
            onClick={onContinuousToggle}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              continuous
                ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
            title="Se ativo, a câmera continua aberta após bipar cada produto"
          >
            {continuous ? "Modo Bip Contínuo (Ativo)" : "Fechar ao Bipar"}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {useCamera && hasCamera ? (
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <div className="relative w-[84%] max-w-md h-48 border-4 border-emerald-400 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] flex items-center justify-center">
            <div className="w-full h-0.5 bg-red-500 animate-pulse opacity-90" />
            {lastBip && (
              <div className="absolute -top-12 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce shadow-lg">
                Bipado: {lastBip}
              </div>
            )}
          </div>

          <div className="absolute bottom-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setUseCamera(false)}
              className="bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-full border border-slate-700 shadow-lg"
            >
              Digitar PLU / Código Manual
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-6 flex flex-col justify-center max-w-md mx-auto w-full">
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="text-center space-y-1 mb-4">
              <ScanBarcode size={48} className="mx-auto text-blue-400" />
              <h3 className="text-xl font-bold text-white">Entrada Rápida por Código</h3>
              <p className="text-xs text-slate-400">
                Digite o Código de Barras (EAN-13) ou o Código Interno / PLU (ex: 1004, 2019)
              </p>
            </div>

            <input
              type="tel"
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ex: 1004 ou 789100010001"
              className="w-full text-center text-3xl font-mono tracking-wider font-bold py-4 px-4 bg-slate-900 border-2 border-blue-500 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            />

            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-base rounded-2xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check size={20} />
              <span>Localizar e Lançar</span>
            </button>

            {hasCamera && (
              <button
                type="button"
                onClick={() => setUseCamera(true)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
              >
                Voltar para Câmera
              </button>
            )}
          </form>
        </div>
      )}

      {error && <p className="p-3 text-center text-xs font-semibold text-amber-300 bg-black/80">{error}</p>}
    </div>
  );
}
