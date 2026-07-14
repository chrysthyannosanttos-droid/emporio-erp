"use client";

import { useState, useEffect } from "react";
import { Package, Search, Plus, FileCode, X, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getProducts, createProductsFromInvoice } from "@/actions/product";

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

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    const res = await getProducts();
    if (res.products) setProducts(res.products);
    else setError(res.error || "Erro ao buscar produtos");
    setLoading(false);
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
      // Exibe produtos avariados/críticos com estoque baixo ou perdas
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
    </div>
  );
}
