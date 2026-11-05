"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, ScanBarcode, Camera, Plus, Minus, Trash2, Check,
  AlertTriangle, ArrowUpDown, RefreshCw, Save, FileText,
  X, CheckCircle2, ChevronRight, Package, Sparkles, Filter,
  TrendingDown, TrendingUp, DollarSign, Layers, ArrowLeft,
  Zap, Smartphone, Upload, Image as ImageIcon, Hash, CheckSquare, Square,
  HelpCircle, ShieldCheck, Tag
} from "lucide-react";
import Link from "next/link";
import {
  searchInventoryProducts,
  lookupInventoryItem,
  applyInventoryAdjustments,
  getNextInternalCodeAction,
  analyzeProductPhotoAction,
  createProductFromInventoryAction,
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

  // Modal de Cadastro Rápido por Foto / IA no Balanço
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [aiAnalysisDone, setAiAnalysisDone] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Campos do produto a cadastrar
  const [newProdName, setNewProdName] = useState("");
  const [newProdUnit, setNewProdUnit] = useState("UN");
  const [newProdCategory, setNewProdCategory] = useState("Geral");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCost, setNewProdCost] = useState("");
  const [newProdStock, setNewProdStock] = useState("1");

  // Flag de Código de Barras (true = SEM código de barras / usa código interno)
  const [noBarcodeFlag, setNoBarcodeFlag] = useState(false);
  const [newProdBarcode, setNewProdBarcode] = useState("");
  const [newProdInternalCode, setNewProdInternalCode] = useState("");
  const [loadingInternalCode, setLoadingInternalCode] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Modal de Finalização do Balanço com a Regra dos Antigos
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [inactivateUncounted, setInactivateUncounted] = useState(true);

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

  // Abrir modal de cadastro por foto
  const openPhotoModal = async () => {
    setPhotoPreview(null);
    setAnalyzingPhoto(false);
    setAiAnalysisDone(false);
    setPhotoError(null);
    setNewProdName("");
    setNewProdUnit("UN");
    setNewProdCategory("Geral");
    setNewProdPrice("");
    setNewProdCost("");
    setNewProdStock("1");
    setNoBarcodeFlag(false);
    setNewProdBarcode("");
    setNewProdInternalCode("");
    setIsPhotoModalOpen(true);
  };

  // Alternar flag de produto SEM código de barras
  const handleToggleNoBarcode = async (noBarcode: boolean) => {
    setNoBarcodeFlag(noBarcode);
    if (noBarcode) {
      setNewProdBarcode("");
      if (!newProdInternalCode) {
        setLoadingInternalCode(true);
        const res = await getNextInternalCodeAction();
        setLoadingInternalCode(false);
        if (res.success) {
          setNewProdInternalCode(res.code);
        }
      }
    }
  };

  // Processar seleção ou foto do produto
  const handlePhotoSelect = (file: File) => {
    if (!file) return;
    setPhotoError(null);
    setAnalyzingPhoto(true);
    setAiAnalysisDone(false);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPhotoPreview(dataUrl);

      // 1. Tentar detectar código de barras na foto com API nativa do navegador
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "code_128", "qr_code"],
          });
          const img = new Image();
          img.src = dataUrl;
          img.onload = async () => {
            try {
              const detected = await barcodeDetector.detect(img);
              if (detected && detected.length > 0 && detected[0].rawValue) {
                setNewProdBarcode(detected[0].rawValue);
                setNoBarcodeFlag(false);
              }
            } catch {}
          };
        } catch {}
      }

      // 2. Chamar IA para ler imagem e sugerir descrição, unidade e preço
      try {
        const res = await analyzeProductPhotoAction({ base64Image: dataUrl });
        if (res.success) {
          if (res.suggestedName) setNewProdName(res.suggestedName);
          if (res.suggestedUnit) setNewProdUnit(res.suggestedUnit);
          if (res.suggestedCategory) setNewProdCategory(res.suggestedCategory);
          if (res.suggestedPrice) setNewProdPrice(String(res.suggestedPrice));
          if (res.detectedBarcode && !newProdBarcode) {
            setNewProdBarcode(res.detectedBarcode);
            setNoBarcodeFlag(false);
          }
          setAiAnalysisDone(true);
        } else {
          setAiAnalysisDone(true);
          if (res.error && !res.error.includes("Chave Gemini")) {
            setPhotoError(res.error);
          }
        }
      } catch (err: any) {
        setPhotoError(err.message || "Erro ao analisar imagem.");
      } finally {
        setAnalyzingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submeter cadastro do produto e adicionar direto ao balanço
  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProdName.trim();
    if (!name) {
      setPhotoError("O nome / descrição do produto é obrigatório.");
      return;
    }

    const countedStock = parseFloat(newProdStock.replace(",", "."));
    if (isNaN(countedStock) || countedStock < 0) {
      setPhotoError("Informe uma quantidade contada válida.");
      return;
    }

    setCreatingProduct(true);
    setPhotoError(null);

    const price = newProdPrice ? parseFloat(newProdPrice.replace(",", ".")) : 0;
    const cost = newProdCost ? parseFloat(newProdCost.replace(",", ".")) : undefined;

    const res = await createProductFromInventoryAction({
      name,
      barcode: noBarcodeFlag ? null : newProdBarcode.trim() || null,
      internalCode: noBarcodeFlag ? newProdInternalCode.trim() || null : null,
      unit: newProdUnit,
      countedStock,
      price: isNaN(price) ? 0 : price,
      cost: cost && !isNaN(cost) ? cost : undefined,
      categoryName: newProdCategory.trim() || undefined,
      photoBase64: photoPreview || undefined,
    });

    setCreatingProduct(false);

    if (res.success && res.product) {
      registerProductCount(res.product, countedStock, false);
      setIsPhotoModalOpen(false);
      setSaveSuccess(`Produto "${res.product.name}" cadastrado e adicionado ao balanço!`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } else {
      setPhotoError(res.error || "Erro ao cadastrar produto.");
    }
  };

  // Abrir modal de finalização do balanço
  const handleFinalizeInventory = () => {
    if (batchItems.length === 0) {
      setErrorMessage("Nenhum item na lista de balanço para gravar.");
      return;
    }
    setShowFinalizeModal(true);
  };

  // Executar a gravação final do balanço
  const confirmFinalizeInventory = async () => {
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
      inactivateUncounted,
    });

    setSaving(false);
    setShowFinalizeModal(false);

    if (res.success) {
      setSaveSuccess(
        `Balanço gravado com sucesso! ${res.totalAdjusted} produtos atualizados no estoque.` +
        (inactivateUncounted ? " Cadastros antigos não inventariados foram retirados/zerados conforme solicitado." : "")
      );
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

          {/* Botões de Leitura e Cadastro */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Abrir câmera do celular ou webcam para bipar"
            >
              <Camera size={18} />
              <span>Ler com a Câmera</span>
            </button>

            <button
              type="button"
              onClick={openPhotoModal}
              className="w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Tirar foto do produto para a IA identificar nome, unidade e cadastrar no balanço"
            >
              <Sparkles size={18} className="animate-pulse" />
              <span>Cadastrar por Foto (IA)</span>
            </button>
          </div>
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
                            registerProductCount(item.product, Math.round((item.countedStock + step) * 1000) / 1000, false);
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

      {/* MODAL DE CADASTRO POR FOTO / IA (MOBILE FIRST & RESPONSIVO) */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Cabeçalho */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Cadastrar Produto por Foto (IA)</h3>
                  <p className="text-xs text-slate-400">
                    Tire a foto do rótulo/embalagem para sugerir dados e cadastrar no balanço
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo rolável */}
            <form onSubmit={handleCreateProductSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
              {/* Alerta de Erro ou Item Já Cadastrado */}
              {photoError && (
                <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                  photoError.includes("já contém cadastro")
                    ? "bg-amber-50 border-amber-300 text-amber-950"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <AlertTriangle size={18} className={photoError.includes("já contém cadastro") ? "text-amber-600 shrink-0" : "text-rose-600 shrink-0"} />
                    <span>{photoError}</span>
                  </div>

                  {photoError.includes("já contém cadastro") && newProdBarcode && (
                    <button
                      type="button"
                      onClick={() => {
                        const code = newProdBarcode;
                        setIsPhotoModalOpen(false);
                        handleCodeLookup(code);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                    >
                      <Check size={14} />
                      <span>Lançar Este Item no Balanço</span>
                    </button>
                  )}
                </div>
              )}

              {/* SEÇÃO 1: FOTO DO PRODUTO */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>1. Foto da Embalagem / Rótulo</span>
                  {analyzingPhoto && (
                    <span className="text-emerald-600 flex items-center gap-1 font-bold animate-pulse text-[11px]">
                      <RefreshCw size={12} className="animate-spin" /> IA lendo rótulo...
                    </span>
                  )}
                </label>

                {photoPreview ? (
                  <div className="relative rounded-2xl border-2 border-emerald-300 bg-slate-50 p-2 flex items-center gap-3">
                    <img
                      src={photoPreview}
                      alt="Prévia da Foto"
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 space-y-1">
                      {analyzingPhoto ? (
                        <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 animate-pulse">
                          <Sparkles size={14} className="text-emerald-500" />
                          <span>Identificando nome, marca e unidade...</span>
                        </div>
                      ) : aiAnalysisDone ? (
                        <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 size={15} className="text-emerald-600" />
                          <span>Rótulo lido com sucesso pela IA!</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 font-medium">
                          Foto capturada. Você pode preencher ou ajustar os dados abaixo.
                        </div>
                      )}
                      <label className="inline-block cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-700 underline mt-1">
                        Tirar outra foto
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 sm:p-6 text-center transition-colors bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Camera size={24} />
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        Fotografar Produto com a Câmera
                      </span>
                      <p className="text-xs text-slate-400 max-w-xs">
                        A IA vai ler a embalagem e preencher o nome padronizado, unidade e código.
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                        <label className="cursor-pointer px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5">
                          <Camera size={16} />
                          <span>Abrir Câmera</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
                            className="hidden"
                          />
                        </label>

                        <label className="cursor-pointer px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center gap-1.5">
                          <Upload size={16} />
                          <span>Galeria / Arquivo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 2: DADOS DO PRODUTO (NOME, UNIDADE, CATEGORIA) */}
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Nome / Descrição Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value.toUpperCase())}
                    placeholder="Ex: LEITE CONDENSADO MOÇA 395G"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 text-sm font-bold text-slate-900 uppercase placeholder:normal-case placeholder:font-normal outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sugerido automaticamente pela IA. Você pode editar se desejar.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                      Unidade de Medida *
                    </label>
                    <select
                      value={newProdUnit}
                      onChange={(e) => setNewProdUnit(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-600 text-sm font-bold text-slate-900 bg-white outline-none"
                    >
                      <option value="UN">UN - Unidade</option>
                      <option value="KG">KG - Quilo</option>
                      <option value="LT">LT - Litro</option>
                      <option value="CX">CX - Caixa</option>
                      <option value="PCT">PCT - Pacote</option>
                      <option value="BDJ">BDJ - Bandeja</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                      Categoria
                    </label>
                    <input
                      type="text"
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value)}
                      placeholder="Ex: Mercearia, Laticínios"
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-600 text-sm font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                      Preço de Venda (R$)
                    </label>
                    <input
                      type="text"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-600 text-sm font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                      Preço de Custo (R$)
                    </label>
                    <input
                      type="text"
                      value={newProdCost}
                      onChange={(e) => setNewProdCost(e.target.value)}
                      placeholder="Opcional"
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-600 text-sm font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: CÓDIGO DE BARRAS OU CÓDIGO INTERNO (FLAG) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div
                  onClick={() => handleToggleNoBarcode(!noBarcodeFlag)}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    noBarcodeFlag
                      ? "bg-amber-50/90 border-amber-400 text-amber-950"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      noBarcodeFlag ? "bg-amber-600 border-amber-600 text-white" : "border-slate-400 bg-white"
                    }`}>
                      {noBarcodeFlag && <Check size={14} />}
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold block">
                        Produto NÃO possui Código de Barras
                      </span>
                      <span className="text-[11px] text-slate-500">
                        O sistema vai gerar e sugerir um Código Interno (PLU) livre
                      </span>
                    </div>
                  </div>
                  <Tag size={18} className={noBarcodeFlag ? "text-amber-600" : "text-slate-400"} />
                </div>

                {noBarcodeFlag ? (
                  /* Modo SEM Código de Barras: Exibe Código Interno Sugerido */
                  <div className="bg-amber-500/10 border border-amber-300 p-3.5 rounded-2xl space-y-1.5 animate-in zoom-in-95">
                    <label className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between">
                      <span>Código Interno (PLU) Sugerido</span>
                      {loadingInternalCode && <RefreshCw size={12} className="animate-spin text-amber-700" />}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newProdInternalCode}
                        onChange={(e) => setNewProdInternalCode(e.target.value)}
                        placeholder="Ex: 8128"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border-2 border-amber-400 text-base font-mono font-black text-amber-950 bg-white outline-none focus:ring-4 focus:ring-amber-200"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          setLoadingInternalCode(true);
                          const res = await getNextInternalCodeAction();
                          setLoadingInternalCode(false);
                          if (res.success) setNewProdInternalCode(res.code);
                        }}
                        className="px-3 py-2.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                        title="Gerar outro código sequencial"
                      >
                        <RefreshCw size={14} />
                        <span>Novo PLU</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Código sequencial único para identificar o produto no PDV e balança Toledo.
                    </p>
                  </div>
                ) : (
                  /* Modo COM Código de Barras */
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                      Código de Barras (EAN-13 / EAN-8)
                    </label>
                    <input
                      type="text"
                      value={newProdBarcode}
                      onChange={(e) => setNewProdBarcode(e.target.value.trim())}
                      placeholder="Bipe com o leitor ou digite o código de barras"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-600 font-mono text-sm font-bold text-slate-900 outline-none"
                    />
                    <p className="text-[11px] text-slate-400">
                      Se a foto continha o código legível, ele já foi preenchido acima.
                    </p>
                  </div>
                )}
              </div>

              {/* SEÇÃO 4: QUANTIDADE CONTADA NO BALANÇO */}
              <div className="pt-2 border-t border-slate-100 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-emerald-900 block">
                  Quantidade Física Contada no Balanço *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={newProdUnit === "KG" ? "0.001" : "1"}
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-emerald-500 text-lg font-black text-slate-900 bg-white outline-none focus:ring-4 focus:ring-emerald-200 text-center"
                    placeholder="Qtd"
                  />
                  <span className="font-extrabold text-sm text-emerald-800 px-2">
                    {newProdUnit}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  O produto será cadastrado no sistema já com essa quantidade na contagem do balanço.
                </p>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  {creatingProduct ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>Cadastrar e Incluir no Balanço</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO & FINALIZAÇÃO DO BALANÇO (COM REGRA DOS ANTIGOS) */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-slate-800 animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Save size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Gravar Balanço no Estoque</h3>
                  <p className="text-xs text-slate-400">
                    Confirme o encerramento da contagem e aplicação no banco
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Resumo da Contagem */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block font-bold">Total Itens Contados</span>
                  <strong className="text-base text-slate-900">{batchSummary.totalItems} produtos</strong>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block font-bold">Impacto Líquido</span>
                  <strong className={`text-base ${batchSummary.totalNetImpact >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {batchSummary.totalNetImpact >= 0 ? "+" : ""}R$ {batchSummary.totalNetImpact.toFixed(2)}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-between">
                  <span>Sobras (+):</span>
                  <strong>{batchSummary.surplusCount} itens</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-100 flex items-center justify-between">
                  <span>Faltas (-):</span>
                  <strong>{batchSummary.deficitCount} itens</strong>
                </div>
              </div>

              {/* REGRA SOLICITADA PELO USUÁRIO: RETIRAR CADASTROS ANTIGOS NÃO CONTADOS */}
              <div
                onClick={() => setInactivateUncounted(!inactivateUncounted)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  inactivateUncounted
                    ? "bg-amber-50/90 border-amber-400 text-amber-950"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5 shrink-0 ${
                    inactivateUncounted ? "bg-amber-600 border-amber-600 text-white" : "border-slate-400 bg-white"
                  }`}>
                    {inactivateUncounted && <Check size={14} />}
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs sm:text-sm font-extrabold block">
                      Manter apenas estes produtos e retirar cadastros antigos não inventariados
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Conforme a nova regra de balanço: produtos que não foram apurados nesta contagem física serão retirados do catálogo ativo (ou terão estoque zerado se já houver histórico fiscal/venda).
                    </p>
                  </div>
                </div>
              </div>

              {/* Motivo do Ajuste */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Motivo / Observação da Auditoria
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Balanço Periódico de Estoque"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-600 text-sm font-medium outline-none"
                />
              </div>

              {/* Botões */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={confirmFinalizeInventory}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Gravando Balanço...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Confirmar e Gravar Balanço</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
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
