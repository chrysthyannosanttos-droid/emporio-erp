"use client";

import { useState, useEffect, useRef } from "react";
import { Package, Search, Plus, FileCode, X, Check, AlertCircle, Zap, Loader2, Sparkles, ScanBarcode, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getProducts, createProductsFromInvoice, lookupBarcodeOnline, quickCreateProductByBarcode } from "@/actions/product";

export default function StockPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [xmlLoading, setXmlLoading] = useState(false);
  const [xmlSuccess, setXmlSuccess] = useState("");
  const [xmlError, setXmlError] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<"inv1" | "inv2" | "">("");

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
    } catch (_) {}
  };

  const invoicesData = {
    inv1: [
      { name: "Refrigerante Guaraná Antarctica 2L", barcode: "7891991000821", price: 7.99, cost: 5.10, stock: 60, ncm: "2202.10.00", cest: "03.010.00", cfop: "5405", cst: "060", ibsRate: 12, cbsRate: 8.8, isRate: 5 },
      { name: "Batata Palha Elma Chips 140g", barcode: "7891000120202", price: 9.90, cost: 6.40, stock: 40, ncm: "2005.20.00", cest: "17.031.00", cfop: "5102", cst: "102", ibsRate: 8.5, cbsRate: 5.8, isRate: 0 },
    ],
    inv2: [
      { name: "Biscoito Oreo Chocolate 90g", barcode: "7622300742186", price: 3.50, cost: 2.10, stock: 120, ncm: "1905.31.00", cest: "17.020.00", cfop: "5102", cst: "102", ibsRate: 8.5, cbsRate: 5.8, isRate: 0 },
      { name: "Detergente Ypê Coco 500ml", barcode: "7891022100139", price: 2.80, cost: 1.65, stock: 80, ncm: "3402.20.00", cest: "17.025.00", cfop: "5405", cst: "060", ibsRate: 12, cbsRate: 8.8, isRate: 0 },
    ],
  };

  const [stockArea, setStockArea] = useState<"ALL" | "SALE" | "LOSS" | "PRODUCTION">("ALL");

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

  const handleImportXml = async () => {
    if (!selectedInvoice) { setXmlError("Selecione uma nota fiscal."); return; }
    setXmlLoading(true); setXmlError(""); setXmlSuccess("");
    const res = await createProductsFromInvoice(invoicesData[selectedInvoice]);
    if (res.success) {
      setXmlSuccess(`Importado! ${res.count} produtos atualizados.`);
      setSelectedInvoice(""); loadProducts();
      setTimeout(() => { setIsXmlModalOpen(false); setXmlSuccess(""); }, 2000);
    } else { setXmlError(res.error || "Erro ao importar."); }
    setXmlLoading(false);
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    if (!matchesSearch) return false;

    if (stockArea === "SALE") {
      return !p.isSelfProduced && p.stock > 0;
    }
    if (stockArea === "PRODUCTION") {
      return p.isSelfProduced === true;
    }
    if (stockArea === "LOSS") {
      return p.stock <= 5;
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Controle de Estoque</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie seu catálogo de produtos e insumos.</p>
        </div>
        <div className="flex gap-2">
          {/* Botão de Destaque: Bipar / Cadastro Automático */}
          <button
            onClick={() => {
              setIsBarcodeModalOpen(true);
              setBarcodeFeedback(null);
              setFoundProduct(null);
              setBarcodeInput("");
            }}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 text-sm active:scale-95"
            title="Cadastrar produtos instantaneamente apontando leitor ou digitando código de barras"
          >
            <ScanBarcode size={17} className="text-emerald-200" />
            <span>Bipar / Cadastro Rápido</span>
          </button>
          <button onClick={() => setIsXmlModalOpen(true)} className="bg-[#111528] border border-indigo-500/15 text-slate-300 hover:bg-[#161b33] px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors text-sm">
            <FileCode size={16} className="text-indigo-400" /> Importar XML
          </button>
          <Link href="/stock/new" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 text-sm">
            <Plus size={16} /> Novo Produto
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-indigo-500/[0.08] shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input type="text" placeholder="Buscar por nome ou código..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium placeholder:text-slate-600" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: "ALL", label: "Estoque Geral" },
              { key: "SALE", label: "Área de Venda" },
              { key: "LOSS", label: "Avaria / Crítico" },
              { key: "PRODUCTION", label: "Produção Própria" }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStockArea(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  stockArea === tab.key
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                    : "bg-[#0c0f1a] border-indigo-500/10 text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">Carregando...</div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-red-400 text-sm">{error}</div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Produto</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Código (EAN)</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Cód. Toledo (Prix)</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Preço Venda</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Estoque</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-600">Nenhum produto cadastrado.</td></tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} className="hover:bg-indigo-500/[0.04] transition-colors">
                      <td className="px-5 py-3 font-semibold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/15 shrink-0">
                          <Package size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="truncate">{p.name}</span>
                          {p.isSelfProduced && <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Produção Própria</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{p.barcode || "---"}</td>
                      <td className="px-5 py-3 text-slate-400 font-mono text-xs font-bold">{p.internalCode || "---"}</td>
                      <td className="px-5 py-3 text-slate-300 text-right font-mono text-xs">R$ {Number(p.price).toFixed(2).replace('.', ',')}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          p.stock <= 10 ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                        }`}>
                          {p.stock} {p.unit || "UN"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/15 px-2.5 py-1 rounded-lg transition-colors">Editar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* XML Modal */}
      {isXmlModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-indigo-500/[0.08] flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileCode className="text-indigo-400" size={18} /> Importar NF-e (XML)</h3>
              <button onClick={() => { setIsXmlModalOpen(false); setXmlError(""); setXmlSuccess(""); setSelectedInvoice(""); }} className="p-1 rounded-lg hover:bg-indigo-500/10 text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {xmlError && <div className="p-3 bg-red-500/10 border border-red-500/15 text-red-400 rounded-xl flex items-center gap-2 text-sm font-medium"><AlertCircle size={16} />{xmlError}</div>}
              {xmlSuccess && <div className="p-3 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 rounded-xl flex items-center gap-2 text-sm font-medium"><Check size={16} />{xmlSuccess}</div>}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Selecione o XML</label>
                {(["inv1", "inv2"] as const).map(inv => (
                  <button key={inv} type="button" onClick={() => setSelectedInvoice(inv)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                      selectedInvoice === inv ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-indigo-500/10 bg-[#0c0f1a] hover:border-indigo-500/25 text-slate-400"
                    }`}>
                    <div>
                      <span className="block text-sm text-white font-medium">{inv === "inv1" ? "NFe_88392_distribuidora.xml" : "NFe_88410_laticinios.xml"}</span>
                      <span className="text-xs text-slate-500">{inv === "inv1" ? "Guaraná, Batata Palha" : "Oreo, Detergente Ypê"}</span>
                    </div>
                    <FileCode size={16} />
                  </button>
                ))}
              </div>
              {selectedInvoice && (
                <div className="bg-[#0c0f1a] border border-indigo-500/10 p-3 rounded-xl space-y-1">
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Itens na Nota:</span>
                  {invoicesData[selectedInvoice].map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-400">
                      <span>• {item.name}</span>
                      <span className="font-mono text-slate-300">Qtd: {item.stock}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setIsXmlModalOpen(false); setSelectedInvoice(""); setXmlError(""); }}
                  className="flex-1 bg-[#0c0f1a] hover:bg-[#161b33] text-slate-400 font-semibold py-2.5 rounded-xl border border-indigo-500/10 text-sm transition-colors">Voltar</button>
                <button onClick={handleImportXml} disabled={xmlLoading || !selectedInvoice}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 text-sm transition-all disabled:opacity-40">
                  {xmlLoading ? "Importando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Bipagem Rápida e Cadastro Automático por Código de Barras */}
      {isBarcodeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-emerald-500/20 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Top Header */}
            <div className="p-5 border-b border-indigo-500/[0.08] flex justify-between items-center bg-gradient-to-r from-emerald-950/40 via-transparent to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                  <ScanBarcode size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Cadastro Automático por Código de Barras
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                      Entrada Expressa
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
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
                className="p-1.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Feedback Alert */}
              {barcodeFeedback && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
                    barcodeFeedback.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : barcodeFeedback.type === "error"
                      ? "bg-red-500/10 border-red-500/20 text-red-300"
                      : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                  }`}
                >
                  {barcodeFeedback.type === "success" ? (
                    <Check size={16} className="shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0 text-red-400" />
                  )}
                  <span className="flex-1">{barcodeFeedback.message}</span>
                </div>
              )}

              {/* Input Principal do Código de Barras */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Código de Barras (EAN / GTIN)</span>
                  <span className="text-[10px] font-normal text-slate-500">Pressione Enter ou bipe com o leitor</span>
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
                        // Dispara debounce de busca
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
                    className="w-full pl-4 pr-24 py-3 bg-[#0c0f1a] border-2 border-emerald-500/30 focus:border-emerald-400 text-white rounded-xl outline-none font-mono text-base tracking-wider placeholder:text-slate-600 transition-all shadow-inner"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchingBarcode ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                        <Loader2 size={14} className="animate-spin text-emerald-400" />
                        <span>Buscando...</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBarcodeSearch()}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
                      >
                        Buscar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card do Produto Identificado */}
              {foundProduct && (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-start gap-3.5">
                    {foundProduct.imageUrl ? (
                      <img
                        src={foundProduct.imageUrl}
                        alt={foundProduct.name}
                        className="w-16 h-16 rounded-xl object-contain bg-white/5 border border-white/10 p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
                        <Package size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/25">
                          {foundProduct.source || "Base Pública"}
                        </span>
                        {foundProduct.brand && (
                          <span className="text-[10px] font-bold text-slate-400 bg-[#0c0f1a] px-2 py-0.5 rounded border border-white/5">
                            Marca: {foundProduct.brand}
                          </span>
                        )}
                        {foundProduct.ncm && (
                          <span className="text-[10px] font-mono text-slate-400 bg-[#0c0f1a] px-2 py-0.5 rounded border border-white/5">
                            NCM: {foundProduct.ncm}
                          </span>
                        )}
                        {foundProduct.categorySuggested && (
                          <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {foundProduct.categorySuggested}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-white mt-1 leading-snug">
                        {foundProduct.name}
                      </h4>
                    </div>
                  </div>

                  {/* Campos Rápidos de Preço e Estoque */}
                  <form onSubmit={handleQuickSave} className="space-y-4 pt-2 border-t border-emerald-500/15">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
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
                          className="w-full px-3 py-2 bg-[#0c0f1a] border border-emerald-500/30 focus:border-emerald-400 text-white rounded-lg outline-none font-mono text-base font-bold text-emerald-300"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Preço Custo (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={productCost}
                          onChange={(e) => setProductCost(e.target.value)}
                          placeholder="0,00"
                          className="w-full px-3 py-2 bg-[#0c0f1a] border border-indigo-500/20 focus:border-indigo-400 text-white rounded-lg outline-none font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Estoque Inicial (Qtd)
                        </label>
                        <input
                          type="number"
                          step="1"
                          required
                          value={productStock}
                          onChange={(e) => setProductStock(e.target.value)}
                          placeholder="1"
                          className="w-full px-3 py-2 bg-[#0c0f1a] border border-indigo-500/20 focus:border-indigo-400 text-white rounded-lg outline-none font-mono text-sm"
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
                          className="w-4 h-4 rounded bg-[#0c0f1a] border-emerald-500/30 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-slate-300 font-semibold">
                          Modo Bipagem Contínua (próximo item automático)
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={savingProduct || !productPrice}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 text-sm"
                      >
                        {savingProduct ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Confirmar & Salvar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Histórico da Sessão Atual */}
              {sessionCreatedProducts.length > 0 && (
                <div className="pt-3 border-t border-indigo-500/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Cadastrados nesta sessão ({sessionCreatedProducts.length})</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Salvos no banco de dados</span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {sessionCreatedProducts.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-[#0c0f1a] border border-indigo-500/10 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="font-semibold text-white truncate">{item.name}</span>
                          <span className="text-slate-500 font-mono text-[10px]">[{item.barcode}]</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-emerald-400 font-mono font-semibold">
                            R$ {item.price.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-slate-400 bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono">
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
            <div className="p-4 border-t border-indigo-500/[0.08] bg-[#0c0f1a]/50 flex justify-between items-center text-xs text-slate-500">
              <span>Dica: se precisar cadastrar variações completas, acesse "Novo Produto".</span>
              <button
                type="button"
                onClick={() => setIsBarcodeModalOpen(false)}
                className="px-4 py-2 bg-[#161b33] border border-indigo-500/15 hover:bg-[#1f2648] text-slate-300 font-semibold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
