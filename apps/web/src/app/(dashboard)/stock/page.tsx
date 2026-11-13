"use client";

import { useState, useEffect, useRef } from "react";
import { Package, Search, Plus, FileCode, X, Check, AlertCircle, Zap, Loader2, Sparkles, ScanBarcode, ArrowRight, Scale, Edit2, Radio, ClipboardCheck, ChefHat, Trash2, Utensils } from "lucide-react";
import Link from "next/link";
import { getProducts, lookupBarcodeOnline, quickCreateProductByBarcode, updateProduct, getIngredientAndPackagingCatalog } from "@/actions/product";

export default function StockPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Estados da Bipagem Rápida / Cadastro por Código de Barras
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchingBarcode, setSearchingBarcode] = useState(false);
  const [foundProduct, setFoundProduct] = useState<any>(null);
  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [productStock, setProductStock] = useState("1");
  const [continuousMode, setContinuousMode] = useState(true);
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [sessionCreatedProducts, setSessionCreatedProducts] = useState<any[]>([]);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Beep sonoro de leitor de código de barras
  const playScanBeep = (isSuccess = true) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(isSuccess ? 1500 : 400, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isSuccess ? 0.09 : 0.25));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (isSuccess ? 0.09 : 0.25));
    } catch (_) { }
  };

  const [stockArea, setStockArea] = useState<"ALL" | "SALE" | "PRODUCTION" | "INSUMOS" | "COMODATO" | "CONSUMO" | "LOSS" | "SCALE">("ALL");

  const isComodatoProduct = (p: any) => {
    const catName = (p.category?.name || "").toLowerCase();
    const nl = (p.name || "").toLowerCase();
    return (
      catName.includes("comodato") ||
      catName.includes("equipamento") ||
      nl.includes("freezer") ||
      nl.includes("estufa 8bd") ||
      nl.includes("maquina de capsulas") ||
      nl.includes("máquina de capsulas")
    );
  };

  const isConsumoProduct = (p: any) => {
    const catName = (p.category?.name || "").toLowerCase();
    return (
      catName.includes("escritório") ||
      catName.includes("descartáveis") ||
      catName.includes("higiene") ||
      catName.includes("limpeza")
    );
  };

  const isProductionProduct = (p: any) => {
    const catName = (p.category?.name || "").toLowerCase();
    const nl = (p.name || "").toLowerCase();
    return (
      p.isSelfProduced === true ||
      catName.includes("própria") ||
      catName.includes("propria") ||
      catName.includes("sanduíches") ||
      catName.includes("sanduiches") ||
      catName.includes("padaria artesanal") ||
      nl.includes("agrobelém") ||
      nl.includes("agrobelem") ||
      nl.includes("fórmula do sossego") ||
      nl.includes("formula do sossego")
    );
  };

  const isInsumoProduct = (p: any) => {
    const catName = (p.category?.name || "").toLowerCase();
    return (
      p.isRawMaterial === true ||
      p.isPackaging === true ||
      catName.includes("insumo") ||
      catName.includes("matéria-prima") ||
      catName.includes("matérias-primas") ||
      catName.includes("embalag")
    );
  };

  // Edição completa de Produto (Flags, Cardápio Digital, Composição, Balança e Unidades)
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editBarcode, setEditBarcode] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editUnit, setEditUnit] = useState("UN");
  const [editUnitPurchase, setEditUnitPurchase] = useState("UN");
  const [editUnitSale, setEditUnitSale] = useState("UN");
  const [editUnitConvFactor, setEditUnitConvFactor] = useState("1");
  const [editPackagingType, setEditPackagingType] = useState("UNIT");
  const [editUnitsPerPack, setEditUnitsPerPack] = useState("1");
  const [editSendToScale, setEditSendToScale] = useState(false);
  const [editInternalCode, setEditInternalCode] = useState("");
  const [editScaleDays, setEditScaleDays] = useState("0");
  const [editIsSelfProduced, setEditIsSelfProduced] = useState(false);
  const [editIsRawMaterial, setEditIsRawMaterial] = useState(false);
  const [editIsFinishedGood, setEditIsFinishedGood] = useState(false);
  const [editIsPackaging, setEditIsPackaging] = useState(false);
  const [editShowInDigitalMenu, setEditShowInDigitalMenu] = useState(false);

  // Composição na Edição
  const [editCatalog, setEditCatalog] = useState<any[]>([]);
  const [editRecipeYield, setEditRecipeYield] = useState("1");
  const [editRecipeInstructions, setEditRecipeInstructions] = useState("");
  const [editRecipeItems, setEditRecipeItems] = useState<
    { productId: string; name: string; quantity: number; unit: string; unitCost: number; itemRole: "INGREDIENT" | "PACKAGING" }[]
  >([]);
  const [editCompProductId, setEditCompProductId] = useState("");
  const [editCompQty, setEditCompQty] = useState("1");
  const [editCompUnit, setEditCompUnit] = useState("UN");
  const [editCompRole, setEditCompRole] = useState<"INGREDIENT" | "PACKAGING">("INGREDIENT");

  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const handleOpenEditModal = async (p: any) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditBarcode(p.barcode || "");
    setEditPrice(String(p.price || ""));
    setEditCost(p.cost ? String(p.cost) : "");
    setEditStock(String(p.stock || "0"));
    const baseUnit = p.unitSale || p.unit || (p.sendToScale ? "KG" : "UN");
    setEditUnit(baseUnit);
    setEditUnitPurchase(p.unitPurchase || baseUnit);
    setEditUnitSale(p.unitSale || baseUnit);
    setEditUnitConvFactor(String(p.unitConvFactor || 1));
    setEditPackagingType(p.packagingType || "UNIT");
    setEditUnitsPerPack(String(p.unitsPerPack || 1));
    setEditSendToScale(Boolean(p.sendToScale));
    setEditInternalCode(p.internalCode || "");
    setEditScaleDays(String(p.scaleDays || 0));
    setEditIsSelfProduced(Boolean(p.isSelfProduced));
    setEditIsRawMaterial(Boolean(p.isRawMaterial));
    setEditIsFinishedGood(Boolean(p.isFinishedGood));
    setEditIsPackaging(Boolean(p.isPackaging));
    setEditShowInDigitalMenu(Boolean(p.showInDigitalMenu));

    setEditRecipeYield(String(p.recipe?.yield || 1));
    setEditRecipeInstructions(p.recipe?.instructions || "");
    setEditRecipeItems(
      (p.recipe?.items || []).map((it: any) => ({
        productId: it.productId,
        name: it.product?.name || "Insumo",
        quantity: Number(it.quantity || 0),
        unit: it.unit || it.product?.unit || "UN",
        unitCost: Number(it.product?.cost || 0),
        itemRole: it.itemRole === "PACKAGING" ? "PACKAGING" : "INGREDIENT",
      }))
    );
    setEditCompProductId("");
    setEditCompQty("1");
    setEditError("");

    if (editCatalog.length === 0) {
      const catRes = await getIngredientAndPackagingCatalog();
      if (catRes.success && catRes.products) {
        setEditCatalog(catRes.products);
      }
    }
  };

  const editCompositionTotalCost = editRecipeItems.reduce(
    (acc, it) => acc + Number(it.quantity || 0) * Number(it.unitCost || 0),
    0
  );
  const editCompositionUnitCost =
    parseFloat(editRecipeYield) > 0
      ? editCompositionTotalCost / parseFloat(editRecipeYield)
      : editCompositionTotalCost;

  const handleAddEditCompItem = () => {
    if (!editCompProductId) return;
    const found = editCatalog.find((c) => c.id === editCompProductId);
    if (!found) return;
    const qty = parseFloat(editCompQty);
    if (!Number.isFinite(qty) || qty <= 0) return;
    setEditRecipeItems((prev) => [
      ...prev,
      {
        productId: found.id,
        name: found.name,
        quantity: qty,
        unit: editCompUnit || found.unit || "UN",
        unitCost: Number(found.cost || 0),
        itemRole: editCompRole,
      },
    ]);
    setEditCompProductId("");
    setEditCompQty("1");
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEdit(true);
    setEditError("");

    const fd = new FormData();
    fd.append("name", editName);
    fd.append("barcode", editBarcode);
    fd.append("price", editPrice);
    fd.append("cost", editCost);
    fd.append("stock", editStock);
    fd.append("unit", editUnit);
    fd.append("unitPurchase", editUnitPurchase);
    fd.append("unitSale", editUnitSale || editUnit);
    fd.append("unitConvFactor", editUnitConvFactor);
    fd.append("packagingType", editPackagingType);
    fd.append("unitsPerPack", editUnitsPerPack);
    fd.append("sendToScale", String(editSendToScale));
    fd.append("internalCode", editInternalCode);
    fd.append("scaleDays", editScaleDays);
    fd.append("isSelfProduced", String(editIsSelfProduced));
    fd.append("isRawMaterial", String(editIsRawMaterial));
    fd.append("isFinishedGood", String(editIsFinishedGood));
    fd.append("isPackaging", String(editIsPackaging));
    fd.append("showInDigitalMenu", String(editShowInDigitalMenu));
    if (editingProduct.categoryId) fd.append("categoryId", editingProduct.categoryId);

    if (editIsSelfProduced) {
      fd.append("recipeYield", editRecipeYield || "1");
      fd.append("recipeInstructions", editRecipeInstructions);
      fd.append(
        "recipeItems",
        JSON.stringify(
          editRecipeItems.map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity),
            unit: it.unit,
            itemRole: it.itemRole,
          }))
        )
      );
    }

    const res = await updateProduct(editingProduct.id, fd);
    setSavingEdit(false);

    if (res.error) {
      setEditError(res.error);
    } else {
      setEditingProduct(null);
      loadProducts();
    }
  };

  useEffect(() => { loadProducts(); }, []);

  // Foca no input ao abrir o modal de código de barras
  useEffect(() => {
    if (isBarcodeModalOpen) {
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    }
  }, [isBarcodeModalOpen]);

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    const res = await getProducts();
    if (res.products) setProducts(res.products);
    else setError(res.error || "Erro ao buscar produtos");
    setLoading(false);
  };

  // Busca automática do código de barras
  const handleBarcodeSearch = async (codeToSearch?: string) => {
    const code = (codeToSearch || barcodeInput).trim();
    if (!code || code.length < 6) return;

    setSearchingBarcode(true);
    setBarcodeFeedback(null);
    setFoundProduct(null);

    try {
      const res = await lookupBarcodeOnline(code);
      if (res.found && res.name) {
        playScanBeep(true);
        setFoundProduct(res);
        setProductPrice(res.price && res.price > 0 ? String(res.price) : "");
        setProductCost(res.cost && res.cost > 0 ? String(res.cost) : "");
        setBarcodeFeedback({
          type: "success",
          message: `Produto identificado: ${res.name} (${res.source || "Base Pública"})`
        });
        // Foca automaticamente no campo de Preço para agilidade
        setTimeout(() => priceInputRef.current?.focus(), 100);
      } else {
        playScanBeep(false);
        setBarcodeFeedback({
          type: "error",
          message: `Código ${code} não localizado nas bases públicas. Você pode preencher manualmente na tela de Novo Produto.`
        });
      }
    } catch (_) {
      setBarcodeFeedback({ type: "error", message: "Erro ao consultar código de barras na internet." });
    } finally {
      setSearchingBarcode(false);
    }
  };

  // Salva o produto rapidamente
  const handleQuickSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!foundProduct || !foundProduct.name || !barcodeInput.trim()) return;

    const pPrice = parseFloat(productPrice);
    if (isNaN(pPrice) || pPrice <= 0) {
      setBarcodeFeedback({ type: "error", message: "Informe um preço de venda válido maior que zero." });
      priceInputRef.current?.focus();
      return;
    }

    setSavingProduct(true);
    const res = await quickCreateProductByBarcode({
      barcode: barcodeInput.trim(),
      name: foundProduct.name,
      price: pPrice,
      cost: parseFloat(productCost) || 0,
      stock: parseFloat(productStock) || 1,
      ncm: foundProduct.ncm || "",
      brand: foundProduct.brand || "",
      unit: foundProduct.unit || "UN",
      categoryName: foundProduct.categorySuggested || "Geral",
    });

    setSavingProduct(false);

    if (res.success) {
      playScanBeep(true);
      setBarcodeFeedback({ type: "success", message: res.message || "Produto registrado com sucesso!" });
      setSessionCreatedProducts(prev => [
        {
          name: foundProduct.name,
          barcode: barcodeInput.trim(),
          price: pPrice,
          stock: parseFloat(productStock) || 1,
          time: new Date().toLocaleTimeString(),
          isUpdate: res.updated,
        },
        ...prev
      ]);

      // Recarrega o estoque na tabela de fundo
      loadProducts();

      if (continuousMode) {
        // Limpa e prepara para o próximo código de barras
        setBarcodeInput("");
        setFoundProduct(null);
        setProductPrice("");
        setProductCost("");
        setProductStock("1");
        setTimeout(() => barcodeInputRef.current?.focus(), 150);
      } else {
        setIsBarcodeModalOpen(false);
      }
    } else {
      setBarcodeFeedback({ type: "error", message: res.error || "Erro ao salvar produto." });
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    if (!matchesSearch) return false;

    if (stockArea === "COMODATO") {
      return isComodatoProduct(p);
    }
    if (stockArea === "CONSUMO") {
      return isConsumoProduct(p);
    }
    if (stockArea === "PRODUCTION") {
      return isProductionProduct(p);
    }
    if (stockArea === "INSUMOS") {
      return isInsumoProduct(p);
    }
    if (stockArea === "SALE") {
      return !isComodatoProduct(p) && !isConsumoProduct(p) && !isInsumoProduct(p) && p.stock > 0;
    }
    if (stockArea === "SCALE") {
      return p.sendToScale === true || Boolean(p.internalCode);
    }
    if (stockArea === "LOSS") {
      return !isComodatoProduct(p) && p.stock <= 5;
    }
    return true;
  });

  return (
    <div className="w-full flex flex-col gap-5 select-none pb-16">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Controle de Estoque</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gerencie seu catálogo de produtos e insumos.</p>
        </div>
        <div className="flex gap-2">
          {/* Lançamento de Balanço & Inventário Físico */}
          <Link
            href="/stock/inventory"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 text-sm active:scale-95"
            title="Realizar balanço físico de estoque, contagem e ajuste por código de barras, código interno, nome ou câmera"
          >
            <ClipboardCheck size={17} className="text-indigo-100" />
            <span>Lançar Balanço</span>
          </Link>
          {/* Botão de Destaque: Bipar / Cadastro Automático */}
          <button
            onClick={() => {
              setIsBarcodeModalOpen(true);
              setBarcodeFeedback(null);
              setFoundProduct(null);
              setBarcodeInput("");
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-green-600/20 text-sm active:scale-95"
            title="Cadastrar produtos instantaneamente apontando leitor ou digitando código de barras"
          >
            <ScanBarcode size={17} className="text-green-100" />
            <span>Bipar / Cadastro Rápido</span>
          </button>
          <Link
            href="/scales"
            className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 text-sm active:scale-95"
            title="Exportação de carga e configuração de balança Toledo MGV6"
          >
            <Scale size={16} />
            <span>Carga Balança (MGV6)</span>
          </Link>
          <Link href="/invoices" className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-sm">
            <Radio size={16} className="text-blue-600" /> Radar XML & Entradas
          </Link>
          <Link href="/stock/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 text-sm">
            <Plus size={16} /> Novo Produto
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-100 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Buscar por nome ou código..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-800 rounded-xl outline-none text-sm font-medium placeholder:text-gray-400 transition-all" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: "ALL", label: "Estoque Geral" },
              { key: "SALE", label: "Área de Venda" },
              { key: "PRODUCTION", label: "👨‍🍳 Produção Própria" },
              { key: "INSUMOS", label: "🌾 Insumos & Matérias-Primas" },
              { key: "COMODATO", label: "❄️ Comodatos & Equipamentos" },
              { key: "CONSUMO", label: "📦 Uso & Consumo" },
              { key: "SCALE", label: "Balança MGV6" },
              { key: "LOSS", label: "Avaria / Crítico" }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStockArea(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${stockArea === tab.key
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {stockArea === "PRODUCTION" && (
          <div className="px-5 py-3 bg-emerald-50/70 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900">
            <div>
              <strong>Produtos de Fabricação Própria & Cozinha Agrobelém:</strong> Linha Agrobelém (Purês de Macaxeira, Caipirão, Carne de Sol Agrobelém, Doce Fórmula do Sossego, Torrada Artesanal), Sanduíches & Lanches e Padaria Artesanal.
            </div>
            <Link
              href="/production"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shrink-0 text-[11px] transition-colors"
            >
              Ver Fichas Técnicas & Ordens de Produção →
            </Link>
          </div>
        )}

        {stockArea === "INSUMOS" && (
          <div className="px-5 py-3 bg-teal-50/70 border-b border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-teal-900">
            <div>
              <strong>Estoque de Insumos & Matérias-Primas da Cozinha (PLUs 8001–8025):</strong> Ingredientes e bases utilizados nas Fichas Técnicas de Produção Própria e Lanchonete (Costela Desfiada, Carne de Sol Desfiada, Frango Desfiado, Macaxeira Bruta, Molho Aioli, Queijo Coalho, Requeijão).
            </div>
            <Link
              href="/production"
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shrink-0 text-[11px] transition-colors"
            >
              Gerenciar Receitas e Baixa de Insumos →
            </Link>
          </div>
        )}

        {stockArea === "COMODATO" && (
          <div className="px-5 py-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-900">
            <div>
              <strong>Estoque de Comodatos & Equipamentos (COI 007 — CFOP 1.908):</strong> Equipamentos emprestados por fornecedores ou de uso operacional da loja (Freezers, Estufas, Máquinas de Cápsulas). Separados da Área de Venda para não afetar o CMV.
            </div>
            <Link
              href="/assets"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shrink-0 text-[11px] transition-colors"
            >
              Ver em Ativo Imobilizado & Patrimônio →
            </Link>
          </div>
        )}

        {stockArea === "CONSUMO" && (
          <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
            <div>
              <strong>Estoque de Uso & Consumo Interno (COI 008 — CFOP 1.556):</strong> Materiais de escritório, bobinas, etiquetas, descartáveis e produtos de limpeza para operação interna da loja.
            </div>
            <Link
              href="/coi"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shrink-0 text-[11px] transition-colors"
            >
              Regras de Operação (COI) →
            </Link>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Carregando...</div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-red-500 text-sm">{error}</div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px]">Produto</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px]">Código (EAN)</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px]">Cód. Toledo (Prix)</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px] text-right">Preço Venda</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px] text-right">Estoque</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Nenhum produto cadastrado nesta área.</td></tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                          <Package size={15} />
                        </div>
                        <div className="flex flex-col">
                          <span className="truncate">{p.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {p.category?.name && (
                              <span className="text-[9px] text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200 font-semibold">
                                {p.category.name}
                              </span>
                            )}
                            {isComodatoProduct(p) && (
                              <span className="text-[9px] text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 font-bold uppercase tracking-wider">
                                ❄️ Comodato / Equipamento
                              </span>
                            )}
                            {isConsumoProduct(p) && (
                              <span className="text-[9px] text-purple-800 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 font-bold uppercase tracking-wider">
                                📦 Uso & Consumo
                              </span>
                            )}
                            {p.sendToScale && (
                              <span className="text-[9px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-bold uppercase tracking-wider flex items-center gap-0.5">
                                <Scale size={10} /> Balança MGV6
                              </span>
                            )}
                            {isProductionProduct(p) && (
                              <span className="text-[9px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-bold uppercase tracking-wider">
                                👨‍🍳 Produção Própria
                              </span>
                            )}
                            {isInsumoProduct(p) && (
                              <span className="text-[9px] text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 font-bold uppercase tracking-wider">
                                🌾 {p.isPackaging ? "Embalagem / Insumo" : "Insumo / Cozinha"}
                              </span>
                            )}
                            {p.showInDigitalMenu && (
                              <span className="text-[9px] text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 font-bold uppercase tracking-wider">
                                📱 Cardápio Digital
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{p.barcode || "---"}</td>
                      <td className="px-5 py-3.5 text-gray-700 font-mono text-xs font-bold">{p.internalCode || "---"}</td>
                      <td className="px-5 py-3.5 text-gray-900 text-right font-mono text-xs font-bold">R$ {Number(p.price).toFixed(2).replace('.', ',')}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${p.stock <= 10 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                          {p.stock} {p.unit || "UN"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="text-blue-600 hover:text-blue-700 text-xs font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>



      {/* Modal de Bipagem Rápida e Cadastro Automático por Código de Barras */}
      {isBarcodeModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 text-gray-800">
            {/* Top Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-600 shadow-sm">
                  <ScanBarcode size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Cadastro Automático por Código de Barras
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-green-50 text-green-700 border border-green-200">
                      Entrada Expressa
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Aponte o leitor de código de barras ou digite o EAN para buscar dados automaticamente.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBarcodeModalOpen(false);
                  setBarcodeInput("");
                  setFoundProduct(null);
                  setBarcodeFeedback(null);
                }}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Feedback Alert */}
              {barcodeFeedback && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${barcodeFeedback.type === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : barcodeFeedback.type === "error"
                      ? "bg-red-50 border-red-200 text-red-600"
                      : "bg-blue-50 border-blue-200 text-blue-700"
                    }`}
                >
                  {barcodeFeedback.type === "success" ? (
                    <Check size={16} className="shrink-0 text-green-600" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0 text-red-600" />
                  )}
                  <span className="flex-1">{barcodeFeedback.message}</span>
                </div>
              )}

              {/* Input Principal do Código de Barras */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Código de Barras (EAN / GTIN)</span>
                  <span className="text-[10px] font-normal text-gray-400">Pressione Enter ou bipe com o leitor</span>
                </label>
                <div className="relative">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBarcodeInput(val);
                      if (val.trim().length >= 8 && !searchingBarcode) {
                        const timer = setTimeout(() => handleBarcodeSearch(val), 400);
                        return () => clearTimeout(timer);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBarcodeSearch(barcodeInput);
                      }
                    }}
                    placeholder="Bipe o código de barras ou digite... (Ex: 7894900010015)"
                    className="w-full pl-4 pr-24 py-3 bg-gray-50 border-2 border-gray-200 focus:border-green-500 focus:bg-white text-gray-900 rounded-xl outline-none font-mono text-base tracking-wider placeholder:text-gray-400 transition-all shadow-sm"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchingBarcode ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold">
                        <Loader2 size={14} className="animate-spin text-green-600" />
                        <span>Buscando...</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBarcodeSearch()}
                        className="px-3.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors shadow-sm"
                      >
                        Buscar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card do Produto Identificado */}
              {foundProduct && (
                <div className="p-4 rounded-xl border border-green-200 bg-green-50/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-start gap-3.5">
                    {foundProduct.imageUrl ? (
                      <img
                        src={foundProduct.imageUrl}
                        alt={foundProduct.name}
                        className="w-16 h-16 rounded-xl object-contain bg-white border border-gray-200 p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Package size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-200">
                          {foundProduct.source || "Base Pública"}
                        </span>
                        {foundProduct.brand && (
                          <span className="text-[10px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                            Marca: {foundProduct.brand}
                          </span>
                        )}
                        {foundProduct.ncm && (
                          <span className="text-[10px] font-mono text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                            NCM: {foundProduct.ncm}
                          </span>
                        )}
                        {foundProduct.categorySuggested && (
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {foundProduct.categorySuggested}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-gray-900 mt-1 leading-snug">
                        {foundProduct.name}
                      </h4>
                    </div>
                  </div>

                  {/* Campos Rápidos de Preço e Estoque */}
                  <form onSubmit={handleQuickSave} className="space-y-4 pt-2 border-t border-green-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Preço Venda (R$) *
                        </label>
                        <input
                          ref={priceInputRef}
                          type="number"
                          step="0.01"
                          required
                          value={productPrice}
                          onChange={(e) => setProductPrice(e.target.value)}
                          placeholder="0,00"
                          className="w-full px-3 py-2 bg-white border border-green-300 focus:border-green-600 text-gray-900 rounded-lg outline-none font-mono text-base font-bold text-green-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Preço Custo (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={productCost}
                          onChange={(e) => setProductCost(e.target.value)}
                          placeholder="0,00"
                          className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-blue-500 text-gray-900 rounded-lg outline-none font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Estoque Inicial (Qtd)
                        </label>
                        <input
                          type="number"
                          step="1"
                          required
                          value={productStock}
                          onChange={(e) => setProductStock(e.target.value)}
                          placeholder="1"
                          className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-blue-500 text-gray-900 rounded-lg outline-none font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Botões de Ação do Card */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={continuousMode}
                          onChange={(e) => setContinuousMode(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-xs text-gray-700 font-semibold">
                          Modo Bipagem Contínua (próximo item automático)
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={savingProduct || !productPrice}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-green-600/20 text-sm"
                      >
                        {savingProduct ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Confirmar &amp; Salvar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Histórico da Sessão Atual */}
              {sessionCreatedProducts.length > 0 && (
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <span>Cadastrados nesta sessão ({sessionCreatedProducts.length})</span>
                    <span className="text-[10px] text-green-600 font-normal">Salvos no banco de dados</span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {sessionCreatedProducts.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                          <span className="font-semibold text-gray-800 truncate">{item.name}</span>
                          <span className="text-gray-400 font-mono text-[10px]">[{item.barcode}]</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-green-600 font-mono font-bold">
                            R$ {item.price.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded text-[10px] font-mono">
                            +{item.stock} UN
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
              <span>Dica: se precisar cadastrar variações completas, acesse "Novo Produto".</span>
              <button
                type="button"
                onClick={() => setIsBarcodeModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Edição de Produto */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Editar Produto</h3>
                  <p className="text-[10px] text-gray-500">Altere preços, flags, cardápio digital, composição, balança e unidades.</p>
                </div>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-1 rounded-full text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="p-5 space-y-4 overflow-y-auto flex-1">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-semibold focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Código de Barras (EAN)</label>
                  <input
                    type="text"
                    value={editBarcode}
                    onChange={(e) => setEditBarcode(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-mono focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Unidade Base / Venda</label>
                  <select
                    value={editUnit}
                    onChange={(e) => {
                      setEditUnit(e.target.value);
                      setEditUnitSale(e.target.value);
                    }}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-semibold focus:border-blue-500"
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilo (KG) - Pesável</option>
                    <option value="LT">Litro (LT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Unid. Compra / Fator</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={editUnitPurchase}
                      onChange={(e) => setEditUnitPurchase(e.target.value)}
                      placeholder="CX"
                      className="w-1/2 bg-gray-50 border border-gray-200 focus:bg-white text-gray-900 px-2.5 py-2 text-xs rounded-xl outline-none font-bold"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={editUnitConvFactor}
                      onChange={(e) => setEditUnitConvFactor(e.target.value)}
                      title="Fator de conversão"
                      className="w-1/2 bg-gray-50 border border-gray-200 focus:bg-white text-gray-900 px-2.5 py-2 text-xs rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Preço Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-mono font-bold focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Custo Compra (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-mono focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Estoque</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-mono focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Tipo Embalagem</label>
                  <select
                    value={editPackagingType}
                    onChange={(e) => setEditPackagingType(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-semibold"
                  >
                    <option value="UNIT">Unidade (UN)</option>
                    <option value="BOX">Caixa (CX)</option>
                    <option value="PALLET">Palete (PL)</option>
                    <option value="BAG">Fardo / Saco (FD)</option>
                    <option value="BUNDLE">Pacote (PCT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Unid. por Embalagem</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editUnitsPerPack}
                    onChange={(e) => setEditUnitsPerPack(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              {/* Flags de Classificação & Cardápio Digital */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-2.5">
                <span className="block text-[10px] font-black text-gray-600 uppercase tracking-wider">
                  Classificação e Exibição
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-indigo-800">
                    <input
                      type="checkbox"
                      checked={editShowInDigitalMenu}
                      onChange={(e) => setEditShowInDigitalMenu(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="flex items-center gap-1"><Utensils size={12} /> Cardápio Digital</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-emerald-800">
                    <input
                      type="checkbox"
                      checked={editIsSelfProduced}
                      onChange={(e) => setEditIsSelfProduced(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Produção Própria</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={editIsRawMaterial}
                      onChange={(e) => setEditIsRawMaterial(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Insumo / Mat.-Prima</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={editIsPackaging}
                      onChange={(e) => setEditIsPackaging(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Embalagem</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={editIsFinishedGood}
                      onChange={(e) => setEditIsFinishedGood(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Produto Acabado</span>
                  </label>
                </div>
              </div>

              {/* Composição: Insumos & Embalagens (quando Produção Própria marcado) */}
              {editIsSelfProduced && (
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ChefHat size={15} className="text-emerald-600" /> Composição: Insumos &amp; Embalagens
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                      <span>Rendimento:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editRecipeYield}
                        onChange={(e) => setEditRecipeYield(e.target.value)}
                        className="w-12 text-center font-mono font-black border-b border-emerald-300 outline-none"
                      />
                      <span>{editUnit}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <select
                      value={editCompProductId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditCompProductId(val);
                        const found = editCatalog.find((c) => c.id === val);
                        if (found) {
                          setEditCompUnit(found.unit || "UN");
                          setEditCompRole(found.suggestedRole || "INGREDIENT");
                        }
                      }}
                      className="sm:col-span-5 bg-white border border-emerald-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-900 outline-none"
                    >
                      <option value="">Selecionar Insumo / Embalagem...</option>
                      {editCatalog
                        .filter((c) => c.id !== editingProduct.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.unit}) — R$ {Number(c.cost || 0).toFixed(2)}
                          </option>
                        ))}
                    </select>
                    <select
                      value={editCompRole}
                      onChange={(e) => setEditCompRole(e.target.value as "INGREDIENT" | "PACKAGING")}
                      className="sm:col-span-3 bg-white border border-emerald-200 rounded-xl px-2 py-2 text-xs font-bold text-gray-900 outline-none"
                    >
                      <option value="INGREDIENT">Insumo</option>
                      <option value="PACKAGING">Embalagem</option>
                    </select>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={editCompQty}
                      onChange={(e) => setEditCompQty(e.target.value)}
                      className="sm:col-span-2 bg-white border border-emerald-200 rounded-xl px-2 py-2 text-xs font-mono font-bold text-center outline-none"
                      placeholder="Qtd"
                    />
                    <button
                      type="button"
                      onClick={handleAddEditCompItem}
                      disabled={!editCompProductId}
                      className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-2 px-2 rounded-xl text-xs"
                    >
                      + Incluir
                    </button>
                  </div>

                  {editRecipeItems.length > 0 && (
                    <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden">
                      <div className="divide-y divide-emerald-100 max-h-36 overflow-y-auto">
                        {editRecipeItems.map((it, idx) => (
                          <div key={idx} className="px-3 py-1.5 flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-gray-900 truncate flex-1">{it.name}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                it.itemRole === "PACKAGING"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              {it.itemRole === "PACKAGING" ? "Embalagem" : "Insumo"}
                            </span>
                            <span className="font-mono font-bold text-gray-700">
                              {it.quantity} {it.unit}
                            </span>
                            <span className="font-mono text-gray-500">
                              R$ {(it.quantity * it.unitCost).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditRecipeItems((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-xs font-bold text-emerald-900">
                      Custo Estimado da Composição:{" "}
                      <strong className="font-mono">R$ {editCompositionUnitCost.toFixed(2)}</strong>
                    </span>
                    <button
                      type="button"
                      disabled={editRecipeItems.length === 0}
                      onClick={() => setEditCost(editCompositionUnitCost.toFixed(2))}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[10px] font-black"
                    >
                      Usar custo calculado como custo do produto
                    </button>
                  </div>
                </div>
              )}

              {/* Seção Balança Toledo MGV6 */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editSendToScale}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEditSendToScale(checked);
                      if (checked && editUnit !== "KG") setEditUnit("KG");
                    }}
                    className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                    <Scale size={14} className="text-amber-600" /> Enviar para Balança Toledo (MGV6)
                  </span>
                </label>

                {editSendToScale && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200/80">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                        Cód. Balança (PLU - 4 ou 5 dígitos)
                      </label>
                      <input
                        type="text"
                        value={editInternalCode}
                        onChange={(e) => setEditInternalCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                        placeholder="Ex: 50001 (Carnes) ou 60001 (FLV)"
                        className="w-full bg-white border border-amber-300 text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-mono font-black focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                        Validade na Etiqueta (Dias)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={editScaleDays}
                        onChange={(e) => setEditScaleDays(e.target.value)}
                        className="w-full bg-white border border-amber-300 text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-mono font-bold focus:ring-2 focus:ring-amber-500"
                        placeholder="Ex: 3"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all"
                >
                  {savingEdit ? "Salvando..." : "Salvar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
