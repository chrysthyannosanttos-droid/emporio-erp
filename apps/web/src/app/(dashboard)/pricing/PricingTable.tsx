"use client";
import { useState, useMemo } from "react";
import {
  Search, Save, Percent, X, CheckCircle2, AlertCircle, RefreshCw,
  ChevronDown, FileText, GitBranch, Layers, TrendingUp, TrendingDown,
  AlertTriangle, Filter, RotateCcw
} from "lucide-react";
import { updatePricing, applyMarginToCategory, applyMarginToInvoice, applyMarginToFamily } from "@/actions/pricing";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  brand: string | null;
  category: string;
  categoryId: string | null;
  parentProductId: string | null;
  variationsCount: number;
  price: number;
  cost: number;
  lastInvoice: string | null;
  lastInvoiceId: string | null;
  lastEntryDate: string | null;
  markup: number;
  priceChangedAt: string | null;
};

type Invoice = { id: string; num: string; date: string | null };

type BatchMode = "category" | "invoice" | "family" | null;

const MARKUP_FILTERS = [
  { label: "Todos", value: "all" },
  { label: "Sem custo definido", value: "no_cost" },
  { label: "Margem negativa (prejuízo)", value: "negative" },
  { label: "Margem < 10%", value: "lt10" },
  { label: "Margem 10% – 30%", value: "10_30" },
  { label: "Margem 30% – 60%", value: "30_60" },
  { label: "Margem > 60%", value: "gt60" },
  { label: "Sem preço de venda", value: "no_price" },
  { label: "Com variações (família)", value: "has_family" },
];

export default function PricingTable({
  initialProducts,
  categories,
  invoices,
}: {
  initialProducts: Product[];
  categories: any[];
  invoices: Invoice[];
}) {
  const router = useRouter();

  // ── State ──
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [markupFilter, setMarkupFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "markup" | "price" | "cost">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [batchMode, setBatchMode] = useState<BatchMode>(null);

  // Per-product state
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<Record<string, string>>({});
  const [errorIds, setErrorIds] = useState<Record<string, string>>({});

  // Batch form
  const [batchCategoryId, setBatchCategoryId] = useState("");
  const [batchInvoiceId, setBatchInvoiceId] = useState("");
  const [batchFamilyId, setBatchFamilyId] = useState("");
  const [batchMargin, setBatchMargin] = useState("");
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState("");
  const [batchError, setBatchError] = useState("");

  // ── Filtering & Sorting ──
  const filtered = useMemo(() => {
    let list = [...products];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.barcode || "").includes(q) ||
        (p.lastInvoice || "").includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      list = list.filter(p => p.categoryId === categoryFilter);
    }

    // Markup filter
    switch (markupFilter) {
      case "no_cost":     list = list.filter(p => p.cost <= 0); break;
      case "negative":    list = list.filter(p => p.cost > 0 && p.markup < 0); break;
      case "lt10":        list = list.filter(p => p.cost > 0 && p.markup >= 0 && p.markup < 10); break;
      case "10_30":       list = list.filter(p => p.markup >= 10 && p.markup < 30); break;
      case "30_60":       list = list.filter(p => p.markup >= 30 && p.markup < 60); break;
      case "gt60":        list = list.filter(p => p.markup >= 60); break;
      case "no_price":    list = list.filter(p => p.price <= 0); break;
      case "has_family":  list = list.filter(p => p.variationsCount > 0 || p.parentProductId); break;
    }

    // Sorting
    list.sort((a, b) => {
      let va: number | string = a[sortBy];
      let vb: number | string = b[sortBy];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return list;
  }, [products, search, categoryFilter, markupFilter, sortBy, sortDir]);

  // ── KPI summary ──
  const kpis = useMemo(() => ({
    total: products.length,
    noCost: products.filter(p => p.cost <= 0).length,
    negative: products.filter(p => p.cost > 0 && p.markup < 0).length,
    lowMargin: products.filter(p => p.cost > 0 && p.markup >= 0 && p.markup < 15).length,
    families: products.filter(p => p.variationsCount > 0).length,
  }), [products]);

  // ── Helpers ──
  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy !== col ? null : sortDir === "asc"
      ? <TrendingUp size={11} className="inline ml-1" />
      : <TrendingDown size={11} className="inline ml-1" />;

  // ── Local editing ──
  const handlePriceChange = (id: string, val: string) => {
    const n = parseFloat(val.replace(",", "."));
    if (isNaN(n)) return;
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const c = p.cost > 0 ? p.cost : 1;
      return { ...p, price: n, markup: ((n - c) / c) * 100 };
    }));
    setSavedIds(prev => { const x = { ...prev }; delete x[id]; return x; });
  };

  const handleMarkupChange = (id: string, val: string) => {
    const n = parseFloat(val.replace(",", "."));
    if (isNaN(n)) return;
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const c = p.cost > 0 ? p.cost : 1;
      return { ...p, markup: n, price: c * (1 + n / 100) };
    }));
    setSavedIds(prev => { const x = { ...prev }; delete x[id]; return x; });
  };

  const handleSave = async (p: Product) => {
    setLoadingIds(prev => ({ ...prev, [p.id]: true }));
    setErrorIds(prev => { const x = { ...prev }; delete x[p.id]; return x; });
    try {
      const r = await updatePricing(p.id, p.price) as any;
      if (r?.error) { setErrorIds(prev => ({ ...prev, [p.id]: r.error })); }
      else {
        setSavedIds(prev => ({ ...prev, [p.id]: "ok" }));
        setTimeout(() => setSavedIds(prev => { const x = { ...prev }; delete x[p.id]; return x; }), 3000);
      }
    } catch (e: any) {
      setErrorIds(prev => ({ ...prev, [p.id]: e.message }));
    } finally {
      setLoadingIds(prev => ({ ...prev, [p.id]: false }));
    }
  };

  // ── Local state update helper after batch ──
  const applyLocalMargin = (ids: string[], margin: number) => {
    setProducts(prev => prev.map(p => {
      if (!ids.includes(p.id)) return p;
      const c = p.cost > 0 ? p.cost : 1;
      return { ...p, price: c * (1 + margin / 100), markup: margin };
    }));
  };

  // ── Batch handlers ──
  const runBatch = async () => {
    const margin = parseFloat(batchMargin);
    if (isNaN(margin) || margin < 0) return setBatchError("Informe uma margem válida (ex: 40).");
    setBatchError(""); setIsBatchLoading(true);

    try {
      let result: any;
      let affectedIds: string[] = [];

      if (batchMode === "category") {
        if (!batchCategoryId) return setBatchError("Selecione uma seção.");
        result = await applyMarginToCategory(batchCategoryId, margin);
        affectedIds = products.filter(p => p.categoryId === batchCategoryId).map(p => p.id);
      } else if (batchMode === "invoice") {
        if (!batchInvoiceId) return setBatchError("Selecione uma nota fiscal.");
        result = await applyMarginToInvoice(batchInvoiceId, margin);
        affectedIds = products.filter(p => p.lastInvoiceId === batchInvoiceId).map(p => p.id);
      } else if (batchMode === "family") {
        if (!batchFamilyId) return setBatchError("Selecione o produto pai.");
        result = await applyMarginToFamily(batchFamilyId, margin);
        affectedIds = products.filter(p => p.id === batchFamilyId || p.parentProductId === batchFamilyId).map(p => p.id);
      }

      if (result?.error) { setBatchError(result.error); }
      else {
        applyLocalMargin(affectedIds, margin);
        setBatchSuccess(`✓ ${affectedIds.length} produto(s) precificado(s) com margem de ${margin}%`);
        setTimeout(() => { setBatchSuccess(""); setBatchMode(null); router.refresh(); }, 3000);
      }
    } catch (e: any) {
      setBatchError(e.message || "Erro inesperado");
    } finally {
      setIsBatchLoading(false);
    }
  };

  // ── Markup badge color ──
  const markupColor = (m: number, hasCost: boolean) => {
    if (!hasCost) return "bg-gray-100 text-gray-500";
    if (m < 0) return "bg-red-100 text-red-700";
    if (m < 15) return "bg-orange-100 text-orange-700";
    if (m < 40) return "bg-blue-100 text-blue-700";
    return "bg-emerald-100 text-emerald-700";
  };

  // Families list for batch modal
  const familyProducts = products.filter(p => p.variationsCount > 0);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
        {[
          { label: "Total de Produtos", val: kpis.total, color: "bg-blue-50 border-blue-200 text-blue-700", click: () => setMarkupFilter("all") },
          { label: "Sem Custo", val: kpis.noCost, color: "bg-gray-50 border-gray-200 text-gray-600", click: () => setMarkupFilter("no_cost") },
          { label: "Margem Negativa", val: kpis.negative, color: "bg-red-50 border-red-200 text-red-700", click: () => setMarkupFilter("negative") },
          { label: "Margem < 15%", val: kpis.lowMargin, color: "bg-orange-50 border-orange-200 text-orange-700", click: () => setMarkupFilter("lt10") },
          { label: "Famílias", val: kpis.families, color: "bg-purple-50 border-purple-200 text-purple-700", click: () => setMarkupFilter("has_family") },
        ].map(k => (
          <button key={k.label} onClick={k.click}
            className={`rounded-xl border p-3 text-left cursor-pointer hover:shadow-sm transition-all ${k.color}`}>
            <div className="text-2xl font-black">{k.val}</div>
            <div className="text-xs font-semibold opacity-80">{k.label}</div>
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 shrink-0 flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto, marca, NF, código..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 rounded-xl outline-none text-sm transition-all" />
        </div>

        {/* Category */}
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium">
          <option value="all">Todas as Seções</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Markup filter */}
        <select value={markupFilter} onChange={e => setMarkupFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium">
          {MARKUP_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* Reset filters */}
        {(search || categoryFilter !== "all" || markupFilter !== "all") && (
          <button onClick={() => { setSearch(""); setCategoryFilter("all"); setMarkupFilter("all"); }}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <RotateCcw size={15} />
          </button>
        )}

        <div className="flex-1" />

        {/* Reajuste em Lote buttons */}
        <div className="flex gap-2">
          <button onClick={() => setBatchMode(batchMode === "category" ? null : "category")}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${batchMode === "category" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"}`}>
            <Layers size={13} /> Por Seção
          </button>
          <button onClick={() => setBatchMode(batchMode === "invoice" ? null : "invoice")}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${batchMode === "invoice" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"}`}>
            <FileText size={13} /> Por Nota Fiscal
          </button>
          <button onClick={() => setBatchMode(batchMode === "family" ? null : "family")}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${batchMode === "family" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"}`}>
            <GitBranch size={13} /> Por Família
          </button>
        </div>
      </div>

      {/* ── Batch panel (inline, below toolbar) ── */}
      {batchMode && (
        <div className={`bg-white rounded-2xl border shadow-sm p-5 shrink-0 ${batchMode === "family" ? "border-purple-200" : "border-blue-200"}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
              {batchMode === "category" && <><Layers size={16} className="text-blue-600" /> Reajuste por Seção</>}
              {batchMode === "invoice" && <><FileText size={16} className="text-blue-600" /> Reajuste por Nota Fiscal</>}
              {batchMode === "family" && <><GitBranch size={16} className="text-purple-600" /> Reajuste por Família de Produtos</>}
            </h3>
            <button onClick={() => { setBatchMode(null); setBatchError(""); setBatchSuccess(""); }}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100">
              <X size={15} />
            </button>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            {/* Selector */}
            {batchMode === "category" && (
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Seção</label>
                <select value={batchCategoryId} onChange={e => setBatchCategoryId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 text-gray-900 rounded-xl text-sm font-medium px-3 py-2.5 outline-none">
                  <option value="">-- Selecione --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {batchMode === "invoice" && (
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Nota Fiscal</label>
                {invoices.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhuma NF com entrada registrada.</p>
                ) : (
                  <select value={batchInvoiceId} onChange={e => setBatchInvoiceId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 text-gray-900 rounded-xl text-sm font-medium px-3 py-2.5 outline-none">
                    <option value="">-- Selecione a NF --</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        NF {inv.num}{inv.date ? ` — ${new Date(inv.date).toLocaleDateString("pt-BR")}` : ""}
                        {" "}({products.filter(p => p.lastInvoiceId === inv.id).length} itens)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {batchMode === "family" && (
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Produto Pai (Família)</label>
                {familyProducts.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhum produto com variações cadastradas.</p>
                ) : (
                  <select value={batchFamilyId} onChange={e => setBatchFamilyId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 text-gray-900 rounded-xl text-sm font-medium px-3 py-2.5 outline-none">
                    <option value="">-- Selecione o produto --</option>
                    {familyProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.variationsCount} variações)</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Margin input */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Margem de Lucro (%)</label>
              <div className="relative">
                <input type="number" step="0.5" min="0" value={batchMargin}
                  onChange={e => { setBatchMargin(e.target.value); setBatchError(""); }}
                  placeholder="Ex: 40"
                  className="w-32 bg-gray-50 border border-gray-200 focus:border-blue-500 text-gray-900 rounded-xl text-sm font-black px-3 py-2.5 pr-8 outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">%</span>
              </div>
            </div>

            {/* Apply button */}
            {batchSuccess ? (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold">
                <CheckCircle2 size={15} /> {batchSuccess}
              </div>
            ) : (
              <button onClick={runBatch} disabled={isBatchLoading}
                className={`px-5 py-2.5 rounded-xl font-black text-sm text-white flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm ${batchMode === "family" ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                {isBatchLoading ? <><RefreshCw size={13} className="animate-spin" /> Aplicando...</> : <><Percent size={13} /> Aplicar e Salvar</>}
              </button>
            )}
          </div>

          {batchError && (
            <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-xs font-bold">
              <AlertCircle size={14} /> {batchError}
            </div>
          )}

          {/* Preview of affected items */}
          {batchMode === "invoice" && batchInvoiceId && (
            <div className="mt-3 text-xs text-gray-500">
              Produtos que serão afetados:{" "}
              <span className="font-bold text-gray-900">
                {products.filter(p => p.lastInvoiceId === batchInvoiceId).map(p => p.name).join(", ")}
              </span>
            </div>
          )}
          {batchMode === "family" && batchFamilyId && (
            <div className="mt-3 text-xs text-gray-500">
              Variações que serão afetadas:{" "}
              <span className="font-bold text-gray-900">
                {products.filter(p => p.id === batchFamilyId || p.parentProductId === batchFamilyId).map(p => p.name).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Result count */}
        <div className="px-5 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-gray-400">
            {filtered.length} produto(s) exibido(s)
            {filtered.length !== products.length && ` de ${products.length}`}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Filter size={11} /> Ordenar por:
            {(["name", "markup", "price", "cost"] as const).map(col => (
              <button key={col} onClick={() => toggleSort(col)}
                className={`px-2 py-0.5 rounded-md font-bold transition-colors ${sortBy === col ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-500"}`}>
                {col === "name" ? "Nome" : col === "markup" ? "Markup" : col === "price" ? "Preço" : "Custo"}
                <SortIcon col={col} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Produto</th>
                <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider">NF / Entrada</th>
                <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-right">Custo</th>
                <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-center">Markup %</th>
                <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-right">Preço PDV</th>
                <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-400 text-sm">
                    Nenhum produto encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : filtered.map(p => {
                const hasCost = p.cost > 0;
                const isLoading = loadingIds[p.id];
                const isSaved = savedIds[p.id];
                const hasErr = errorIds[p.id];
                const isFamily = p.variationsCount > 0 || !!p.parentProductId;

                return (
                  <tr key={p.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-4 py-3.5 max-w-[260px]">
                      <div className="flex items-start gap-2">
                        <div>
                          <span className="font-bold text-gray-900 text-sm leading-tight block">{p.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-blue-500 font-semibold">{p.category}</span>
                            {p.brand && <span className="text-[10px] text-gray-400">· {p.brand}</span>}
                            {isFamily && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full">
                                <GitBranch size={9} />
                                {p.variationsCount > 0 ? `${p.variationsCount} variações` : "variação"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {p.lastInvoice
                        ? <><span className="font-bold text-gray-700">NF {p.lastInvoice}</span><br /><span className="text-[10px]">{p.lastEntryDate ? new Date(p.lastEntryDate).toLocaleDateString("pt-BR") : ""}</span></>
                        : <span className="italic text-gray-300">Sem nota</span>
                      }
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap">
                      {hasCost
                        ? <span className="text-gray-700">R$ {p.cost.toFixed(2)}</span>
                        : <span className="text-gray-300 italic text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                        <input type="number" step="0.1"
                          value={p.markup.toFixed(1)}
                          onChange={e => handleMarkupChange(p.id, e.target.value)}
                          className="w-14 bg-transparent text-blue-700 text-right font-black outline-none text-sm" />
                        <span className="text-blue-400 text-xs font-bold">%</span>
                      </div>
                      <div className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded-full inline-block ${markupColor(p.markup, hasCost)}`}>
                        {!hasCost ? "sem custo" : p.markup < 0 ? "prejuízo" : p.markup < 15 ? "baixo" : p.markup < 40 ? "ok" : "ótimo"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5">
                        <span className="text-emerald-600 text-xs font-bold">R$</span>
                        <input type="number" step="0.01" min="0"
                          value={p.price.toFixed(2)}
                          onChange={e => handlePriceChange(p.id, e.target.value)}
                          className="w-20 bg-transparent text-emerald-700 font-black font-mono text-right outline-none text-sm" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {hasErr ? (
                        <span className="text-red-500 text-[10px] font-bold block max-w-[90px] mx-auto">{hasErr}</span>
                      ) : isSaved ? (
                        <span className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-bold">
                          <CheckCircle2 size={13} /> Salvo!
                        </span>
                      ) : (
                        <button onClick={() => handleSave(p)} disabled={isLoading}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center mx-auto gap-1 min-w-[80px] disabled:opacity-50 transition-all">
                          {isLoading
                            ? <><RefreshCw size={11} className="animate-spin" /> Salvando</>
                            : <><Save size={11} /> Salvar</>
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
