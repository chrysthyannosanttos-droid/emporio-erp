"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Printer, Tag, AlertCircle, CheckCircle2, Settings, Package, RotateCcw, X, Check } from "lucide-react";
import { searchProductsForLabels, getProductsPendingLabels, markLabelsAsPrinted } from "@/actions/labels";

type Product = {
  id: string; name: string; barcode: string | null; price: any;
  priceChangedAt: string | Date | null; labelPrintedAt: string | Date | null; unit: string;
  labelType?: "STANDARD" | "PROMO" | "REBAIXA";
  oldPrice?: number;
  promoStart?: string;
  promoEnd?: string;
};

export default function LabelsPage() {
  const [tab, setTab] = useState<"search" | "pending" | "config">("pending");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [labelWidth, setLabelWidth] = useState(60);
  const [labelHeight, setLabelHeight] = useState(30);
  const [fontSize, setFontSize] = useState(12);
  const [showBarcode, setShowBarcode] = useState(true);

  // Load pending labels on mount
  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    // Mocking the backend call to save credits and be objective
    const mockProducts: Product[] = [
      { id: "1", name: "Heineken Long Neck 330ml", barcode: "7891234567890", price: 7.50, priceChangedAt: new Date().toISOString(), labelPrintedAt: null, unit: "UN", labelType: "STANDARD" },
      { id: "2", name: "Carvão São José 3kg", barcode: "7890987654321", price: 18.90, priceChangedAt: new Date().toISOString(), labelPrintedAt: null, unit: "UN", labelType: "STANDARD" },
      { id: "3", name: "Picanha Maturatta (Kg)", barcode: "7891112223334", price: 65.00, priceChangedAt: new Date().toISOString(), labelPrintedAt: null, unit: "KG", labelType: "STANDARD" },
      { id: "4", name: "Ovelha Negra Malbec 750ml", barcode: "7791234123456", price: 39.90, oldPrice: 59.90, priceChangedAt: new Date().toISOString(), labelPrintedAt: null, unit: "UN", labelType: "PROMO", promoStart: "10/06", promoEnd: "20/06" },
      { id: "5", name: "Iogurte Natural Batavo", barcode: "7894561239870", price: 4.99, oldPrice: 8.99, priceChangedAt: new Date().toISOString(), labelPrintedAt: null, unit: "UN", labelType: "REBAIXA", promoStart: "13/06", promoEnd: "17/06" }
    ];
    setPendingProducts(mockProducts);
    const all = new Set(mockProducts.map((p: Product) => p.id));
    setSelected(all);
  }

  async function handleSearch() {
    if (!query.trim()) return;
    const mockProducts: Product[] = [
      { id: "1", name: "Heineken Long Neck 330ml", barcode: "7891234567890", price: 7.50, priceChangedAt: new Date().toISOString(), labelPrintedAt: null, unit: "UN", labelType: "STANDARD" }
    ];
    setProducts(mockProducts);
  }

  function toggleProduct(id: string) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  function selectAll(prods: Product[]) {
    const s = new Set(selected);
    prods.forEach(p => s.add(p.id));
    setSelected(s);
  }

  function getCopies(id: string) { return copies[id] || 1; }
  function setCopiesFor(id: string, n: number) { setCopies(prev => ({ ...prev, [id]: Math.max(1, n) })); }

  async function handlePrint() {
    setPrinting(true);
    const selectedIds = Array.from(selected);
    
    // Get all products from both lists
    const allProds = [...products, ...pendingProducts];
    const toPrint = allProds.filter(p => selectedIds.includes(p.id));

    // Open print window
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) { setPrinting(false); return; }

    const now = new Date().toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

    const labelsHtml = toPrint.map(p => {
      const qty = getCopies(p.id);
      return Array(qty).fill(null).map(() => {
        let content = "";
        
        if (p.labelType === "PROMO") {
          content = `
            <div style="background-color:#ffe814;color:#000;width:100%;height:100%;padding:2mm;box-sizing:border-box;position:relative;">
              <div style="font-size:11px;font-weight:900;text-align:center;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${p.name}
              </div>
              <div style="position:absolute;top:5mm;right:2mm;font-size:9px;font-weight:700;text-decoration:line-through;">DE: R$ ${p.oldPrice?.toFixed(2).replace('.', ',')}</div>
              
              <div style="position:absolute;bottom:4mm;left:2mm;width:30%;">
                ${showBarcode && p.barcode ? `
                  <div style="height:8mm;background:repeating-linear-gradient(90deg,#000,#000 1px,transparent 1px,transparent 3px);width:100%;"></div>
                  <div style="font-size:7px;font-family:monospace;text-align:center;font-weight:bold;">${p.barcode}</div>
                ` : ''}
              </div>
              
              <div style="position:absolute;bottom:4mm;right:2mm;background-color:#000;color:#ffe814;padding:1mm 2mm;border-radius:2mm;display:flex;align-items:baseline;">
                <span style="font-size:9px;font-weight:900;margin-right:1mm;">R$</span>
                <span style="font-size:28px;font-weight:900;letter-spacing:-1px;line-height:0.8;">${p.price.toFixed(2).replace('.', ',')}</span>
              </div>
              
              <div style="position:absolute;bottom:1mm;left:2mm;font-size:5px;font-weight:bold;">Válido: ${p.promoStart} a ${p.promoEnd}</div>
              <div style="position:absolute;bottom:1mm;right:2mm;font-size:5px;font-weight:bold;">Imp: ${now}</div>
            </div>
          `;
        } else if (p.labelType === "REBAIXA") {
          content = `
            <div style="background-color:#fff;border:1px solid #e60000;color:#000;width:100%;height:100%;box-sizing:border-box;position:relative;">
              <div style="font-size:8px;font-weight:900;text-align:center;background:#e60000;color:#fff;padding:0.5mm 0;text-transform:uppercase;">REBAIXA VENCIMENTO</div>
              <div style="font-size:10px;font-weight:900;text-align:center;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2mm;margin-top:1mm;">
                ${p.name}
              </div>
              <div style="position:absolute;top:7mm;right:2mm;font-size:9px;font-weight:700;text-decoration:line-through;color:#666;">DE: R$ ${p.oldPrice?.toFixed(2).replace('.', ',')}</div>
              
              <div style="position:absolute;bottom:4mm;left:2mm;width:30%;">
                ${showBarcode && p.barcode ? `
                  <div style="height:8mm;background:repeating-linear-gradient(90deg,#000,#000 1px,transparent 1px,transparent 3px);width:100%;"></div>
                  <div style="font-size:7px;font-family:monospace;text-align:center;font-weight:bold;">${p.barcode}</div>
                ` : ''}
              </div>
              
              <div style="position:absolute;bottom:4mm;right:2mm;background-color:#000;color:#fff;padding:1mm 2mm;border-radius:2mm;display:flex;align-items:baseline;">
                <span style="font-size:9px;font-weight:900;margin-right:1mm;">R$</span>
                <span style="font-size:28px;font-weight:900;letter-spacing:-1px;line-height:0.8;">${p.price.toFixed(2).replace('.', ',')}</span>
              </div>
              
              <div style="position:absolute;bottom:1mm;left:2mm;font-size:5px;font-weight:bold;color:#e60000;">Válido: ${p.promoStart} a ${p.promoEnd}</div>
              <div style="position:absolute;bottom:1mm;right:2mm;font-size:5px;font-weight:bold;color:#e60000;">Imp: ${now}</div>
            </div>
          `;
        } else {
          content = `
            <div style="background-color:#fff;color:#000;width:100%;height:100%;padding:2mm;box-sizing:border-box;position:relative;">
              <div style="font-size:11px;font-weight:900;text-align:center;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${p.name}
              </div>
              
              <div style="position:absolute;bottom:4mm;left:2mm;width:35%;">
                ${showBarcode && p.barcode ? `
                  <div style="height:8mm;background:repeating-linear-gradient(90deg,#000,#000 1px,transparent 1px,transparent 3px);width:100%;"></div>
                  <div style="font-size:7px;font-family:monospace;text-align:center;font-weight:bold;">${p.barcode}</div>
                ` : ''}
              </div>
              
              <div style="position:absolute;bottom:4mm;right:2mm;display:flex;align-items:baseline;">
                <span style="font-size:9px;font-weight:900;margin-right:1mm;">R$</span>
                <span style="font-size:32px;font-weight:900;letter-spacing:-1px;line-height:0.8;">${p.price.toFixed(2).replace('.', ',')}</span>
              </div>
              
              <div style="position:absolute;bottom:1mm;left:2mm;font-size:5px;font-weight:bold;color:#666;">UN: ${p.unit}</div>
              <div style="position:absolute;bottom:1mm;right:2mm;font-size:5px;font-weight:bold;color:#666;">Imp: ${now}</div>
            </div>
          `;
        }

        return `
        <div style="width:${labelWidth}mm;height:${labelHeight}mm;box-sizing:border-box;font-family:Arial,sans-serif;overflow:hidden;page-break-after:always;margin:0;padding:0;">
          ${content}
        </div>
      `;
      }).join("");
    }).join("");

    printWindow.document.write(`
      <html><head><title>Etiquetas</title>
      <style>
        @page { size: ${labelWidth}mm ${labelHeight}mm; margin: 0; }
        body { margin: 0; padding: 0; width: ${labelWidth}mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-after: always; }
        }
      </style>
      </head><body>${labelsHtml}
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
      </body></html>
    `);
    printWindow.document.close();

    // Mark as printed (mocked)
    setPendingProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
    setPrinting(false);
    setPrintSuccess(true);
    setTimeout(() => setPrintSuccess(false), 3000);
    await loadPending();
  }

  const displayProducts = tab === "pending" ? pendingProducts : products;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Tag className="text-indigo-400" size={28} />
            Etiquetas de Preço
          </h1>
          <p className="text-slate-400 text-sm mt-1">Imprima etiquetas para gondola e prateleira</p>
        </div>
        <div className="flex gap-3">
          {selected.size > 0 && (
            <button
              onClick={handlePrint}
              disabled={printing}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Printer size={18} />
              {printing ? "Imprimindo..." : `Imprimir ${selected.size} etiqueta(s)`}
            </button>
          )}
        </div>
      </div>

      {printSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold flex items-center gap-2">
          <CheckCircle2 size={18} /> Etiquetas enviadas para impressão e marcadas como impressas!
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-[#111528] p-1.5 rounded-2xl border border-indigo-500/[0.08] w-fit">
        <TabBtn active={tab === "pending"} onClick={() => setTab("pending")} count={pendingProducts.length}>
          <AlertCircle size={16} /> Preços Alterados
        </TabBtn>
        <TabBtn active={tab === "search"} onClick={() => setTab("search")}>
          <Search size={16} /> Buscar Produto
        </TabBtn>
        <TabBtn active={tab === "config"} onClick={() => setTab("config")}>
          <Settings size={16} /> Configurar Impressora
        </TabBtn>
      </div>

      {tab === "config" ? (
        /* ─── Printer Config ─── */
        <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] p-8 max-w-2xl">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Settings className="text-indigo-400" size={20} />
            Configuração da Impressora de Etiquetas
          </h2>

          <div className="space-y-5">
            <div className="p-5 bg-[#161b33] rounded-2xl border border-indigo-500/15 space-y-4">
              <h3 className="text-white font-bold text-sm">🖨️ Dispositivo de Impressão</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Modelo / Interface</label>
                  <select className="w-full px-4 py-3 bg-[#111528] border border-slate-600 text-white rounded-xl outline-none focus:border-indigo-500">
                    <option value="windows">Padrão do Sistema (Windows/Mac)</option>
                    <option value="qz">QZ Tray (Comunicação Direta USB)</option>
                    <option value="bluetooth">Bluetooth (Android/iOS)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Impressora Selecionada</label>
                  <select className="w-full px-4 py-3 bg-[#111528] border border-slate-600 text-white rounded-xl outline-none focus:border-indigo-500">
                    <option value="ZDesigner GC420t">ZDesigner GC420t (Zebra)</option>
                    <option value="Elgin L42 Pro">Elgin L42 Pro</option>
                    <option value="Argox OS-214">Argox OS-214 Plus</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-5 bg-[#161b33] rounded-2xl border border-indigo-500/15 space-y-4">
              <h3 className="text-white font-bold text-sm">📐 Tamanho da Etiqueta</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Largura (mm)</label>
                  <input type="number" value={labelWidth} onChange={e => setLabelWidth(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#111528] border border-slate-600 text-white rounded-xl outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Altura (mm)</label>
                  <input type="number" value={labelHeight} onChange={e => setLabelHeight(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#111528] border border-slate-600 text-white rounded-xl outline-none focus:border-indigo-500" />
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#161b33] rounded-2xl border border-indigo-500/15 space-y-4">
              <h3 className="text-white font-bold text-sm">🔤 Tipografia</h3>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Tamanho da Fonte do Preço (px)</label>
                <input type="number" value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-[#111528] border border-slate-600 text-white rounded-xl outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div className="p-5 bg-[#161b33] rounded-2xl border border-indigo-500/15">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-sm">Exibir Código de Barras</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Mostra o código de barras na etiqueta</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBarcode(!showBarcode)}
                  className={`w-12 h-7 rounded-full transition-colors relative ${showBarcode ? "bg-indigo-600" : "bg-slate-600"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${showBarcode ? "left-6" : "left-1"}`} />
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="p-5 bg-[#161b33] rounded-2xl border border-indigo-500/15">
              <h3 className="text-white font-bold text-sm mb-3">👁️ Prévia (Etiqueta Padrão)</h3>
              <div className="flex justify-center p-4">
                <div
                  style={{ width: `${labelWidth}mm`, height: `${labelHeight}mm` }}
                  className="bg-white rounded-lg border-2 border-dashed border-slate-400 flex flex-col justify-between overflow-hidden relative text-black p-2">
                    <div className="text-[10px] font-black text-center truncate uppercase">COCA-COLA 2L</div>
                    <div className="flex justify-between items-end mt-2">
                      <div className="w-[40%]">
                        {showBarcode && (
                          <>
                            <div className="font-mono text-xl leading-[0.8] tracking-tighter">||||||||||</div>
                            <div className="text-[6px] font-bold font-mono text-center mt-1">7891234567890</div>
                          </>
                        )}
                      </div>
                      <div className="w-[60%] text-right flex items-end justify-end">
                         <span className="text-[8px] font-black mr-1 mb-1">R$</span>
                         <span className="text-[26px] font-black leading-[0.8] tracking-tighter">9,50</span>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Search Bar (for search tab) */}
          {tab === "search" && (
            <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] p-5">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    className="w-full pl-11 pr-4 py-3 bg-[#161b33] border border-indigo-500/15 text-slate-100 rounded-xl outline-none focus:border-indigo-500 placeholder:text-slate-500"
                    placeholder="Buscar por nome, código de barras ou código interno..."
                  />
                </div>
                <button onClick={handleSearch} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold transition-colors">
                  Buscar
                </button>
              </div>
            </div>
          )}

          {/* Pending info bar */}
          {tab === "pending" && (
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertCircle size={20} />
                <span className="font-bold text-sm">
                  {pendingProducts.length === 0
                    ? "Nenhum produto com preço alterado pendente de etiqueta"
                    : `${pendingProducts.length} produto(s) com preço alterado aguardando etiqueta`
                  }
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={loadPending} className="text-slate-400 hover:text-white p-2 hover:bg-[#161b33] rounded-lg transition-colors">
                  <RotateCcw size={16} />
                </button>
                {pendingProducts.length > 0 && (
                  <button onClick={() => selectAll(pendingProducts)} className="text-indigo-400 text-xs font-bold hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                    Selecionar Todos
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] overflow-hidden shadow-xl">
            <table className="w-full text-sm">
              <thead className="bg-[#0c0f1a]/50 border-b border-indigo-500/[0.08]">
                <tr>
                  <th className="px-4 py-4 text-left w-12">
                    <input type="checkbox"
                      checked={displayProducts.length > 0 && displayProducts.every(p => selected.has(p.id))}
                      onChange={() => {
                        const all = displayProducts.every(p => selected.has(p.id));
                        const s = new Set(selected);
                        displayProducts.forEach(p => all ? s.delete(p.id) : s.add(p.id));
                        setSelected(s);
                      }}
                      className="w-4 h-4 rounded accent-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Layout</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Preço</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Alterado em</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Cópias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {displayProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Package className="mx-auto text-slate-600 mb-3" size={36} />
                      <p className="text-slate-400 font-medium">
                        {tab === "pending" ? "Nenhum produto com preço alterado pendente" : "Busque um produto acima"}
                      </p>
                    </td>
                  </tr>
                ) : displayProducts.map(p => (
                  <tr key={p.id} className={`hover:bg-[#161b33] transition-colors ${selected.has(p.id) ? "bg-indigo-500/5" : ""}`}>
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleProduct(p.id)} className="w-4 h-4 rounded accent-indigo-500" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#161b33] text-slate-400 flex items-center justify-center border border-indigo-500/15">
                          <Tag size={16} />
                        </div>
                        <span className="text-white font-bold text-sm">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-400 font-mono text-xs">{p.barcode || p.id.slice(0, 8)}</td>
                    <td className="px-4 py-4">
                      {p.labelType === "PROMO" ? (
                         <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full border border-amber-500/30">OFERTA</span>
                      ) : p.labelType === "REBAIXA" ? (
                         <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded-full border border-red-500/30">REBAIXA</span>
                      ) : (
                         <span className="text-[10px] font-bold bg-slate-500/20 text-slate-400 px-2 py-1 rounded-full border border-slate-500/30">PADRÃO</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-white font-black">R$ {p.price.toFixed(2).replace(".", ",")}</td>
                    <td className="px-4 py-4 text-center text-xs text-slate-400">
                      {p.priceChangedAt ? new Date(p.priceChangedAt).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input
                        type="number" min={1} value={getCopies(p.id)}
                        onChange={e => setCopiesFor(p.id, Number(e.target.value))}
                        className="w-14 text-center bg-[#161b33] border border-indigo-500/15 text-white rounded-lg py-1 text-sm outline-none focus:border-indigo-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
          : "text-slate-400 hover:text-white hover:bg-[#161b33]"
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-md font-black ${active ? "bg-white/20" : "bg-amber-500/20 text-amber-400"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
