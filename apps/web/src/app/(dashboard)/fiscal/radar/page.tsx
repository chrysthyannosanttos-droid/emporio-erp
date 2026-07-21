"use client";

import { useState, useRef, useEffect } from "react";
import { 
  FileText, UploadCloud, Search, RefreshCw, CheckCircle2, 
  AlertCircle, ChevronRight, Package, DollarSign, X, 
  ArrowRight, Key, Calendar, MapPin
} from "lucide-react";

// Mocks
const RADAR_XMLS = [
  { id: "1", accessKey: "35231012345678000199550010001234561001234567", supplier: "Distribuidora Bebidas Norte", cnpj: "12.345.678/0001-99", value: 3450.00, date: "10/06/2026", status: "PENDING_AUTHORIZATION" },
  { id: "2", accessKey: "35231098765432000188550010009876541009876543", supplier: "Frigorífico Boi Gordo LTDA", cnpj: "98.765.432/0001-88", value: 8900.50, date: "12/06/2026", status: "AUTHORIZED_FOR_COLLECTOR", poNumber: "14580", itemsCount: 4 },
  { id: "3", accessKey: "35231011122233000177550010001112221001112223", supplier: "Ambev S.A.", cnpj: "07.526.557/0001-00", value: 12400.00, date: "12/06/2026", status: "IMPORTED" },
];

const XML_ITEMS_MOCK = [
  { nItem: 1, ean: "7891112223334", name: "Cerveja Pilsen Lata 350ml - Fardo 12", qty: 50, ucom: "FD", vUnCom: 35.00, vProd: 1750.00, mappedProduct: null },
  { nItem: 2, ean: "7894445556667", name: "Cerveja IPA Garrafa 600ml", qty: 24, ucom: "UN", vUnCom: 12.50, vProd: 300.00, mappedProduct: { id: "p1", name: "Cerveja IPA Artesanal 600ml", stock: 12 } },
];

function fmt(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function RadarXMLPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem("radarInvoices");
    if (saved) setInvoices(JSON.parse(saved));
    else setInvoices(RADAR_XMLS);
  }, []);

  useEffect(() => {
    if (invoices.length > 0) localStorage.setItem("radarInvoices", JSON.stringify(invoices));
  }, [invoices]);

  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import Wizard State
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [itemsToMap, setItemsToMap] = useState<any[]>([]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
  };

  const processFile = (file: File) => {
    setTimeout(() => {
      const fakeNfe = { id: Date.now().toString(), accessKey: "35" + Math.random().toString().slice(2, 44), supplier: "Fornecedor Importado via XML", cnpj: "00.000.000/0000-00", value: 1250.00, date: new Date().toLocaleDateString("pt-BR"), status: "PENDING_AUTHORIZATION" };
      setInvoices(prev => [fakeNfe, ...prev]);
      alert("XML Carregado com Sucesso!");
    }, 600);
  };

  const authorizeForCollector = (id: string) => {
    // In a real scenario, we would ask for the Purchase Order (Pedido de Compra) link here
    const poNumber = prompt("Digite o número do Pedido de Compra para vincular a esta nota:");
    if (poNumber) {
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "AUTHORIZED_FOR_COLLECTOR", poNumber, itemsCount: Math.floor(Math.random() * 20) + 1 } : i));
      alert(`Nota autorizada e vinculada ao Pedido #${poNumber}. Agora está disponível no Coletor.`);
    }
  };

  const openImportWizard = (invoice: any) => {
    setSelectedInvoice(invoice);
    setItemsToMap([...XML_ITEMS_MOCK]); // Load mock items
    setWizardStep(1);
    setImportWizardOpen(true);
  };

  // Return Note Generation State
  const [returnModalData, setReturnModalData] = useState<any>(null);

  const handleGenerateReturnNote = (type: "TOTAL" | "DIVERGINCIAS_ONLY") => {
    if (!selectedInvoice) return;
    const isTotal = type === "TOTAL";
    const returnedItems = isTotal ? XML_ITEMS_MOCK : [
      { name: "Cerveja Pilsen Lata 350ml - Fardo 12", qty: 10, ucom: "FD", vUnCom: 35.00, vProd: 350.00, reason: "Divergência de Quantidade (Faltando na entrega física)" }
    ];
    const totalReturnVal = returnedItems.reduce((a, i) => a + i.vProd, 0);

    setReturnModalData({
      type,
      title: isTotal ? "NF-e de Devolução Total da Nota" : "NF-e de Devolução Apenas das Divergências",
      accessKeyRef: selectedInvoice.accessKey,
      supplier: selectedInvoice.supplier,
      cnpj: selectedInvoice.cnpj,
      cfop: "5202",
      items: returnedItems,
      totalValue: totalReturnVal
    });
  };

  const finishImport = () => {
    setInvoices(prev => prev.map(i => i.id === selectedInvoice.id ? { ...i, status: "IMPORTED" } : i));
    setImportWizardOpen(false);
    alert("Entrada de nota concluída! Estoque atualizado e contas a pagar gerado.");
  };

  const filtered = invoices.filter(i => i.supplier.toLowerCase().includes(search.toLowerCase()) || i.accessKey.includes(search));

  return (
    <div className="h-full flex flex-col gap-5 text-slate-100">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <FileText className="text-[var(--accent)]" size={28} />
            Radar XML e Entrada de Notas
          </h1>
          <p className="text-slate-400 text-sm mt-1">Busca automática na SEFAZ e importação manual de arquivos XML para entrada de compras.</p>
        </div>
        <button className="bg-[#161b33] border border-indigo-500/20 text-indigo-300 hover:text-indigo-200 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95">
          <RefreshCw size={18} /> Sincronizar SEFAZ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 shrink-0">
        {/* Upload Zone */}
        <div 
          className={`lg:col-span-1 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 transition-all ${isDragging ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-indigo-500/20 bg-[#111528] hover:border-indigo-500/40"}`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" ref={fileInputRef} className="hidden" accept=".xml" onChange={handleFileChange} />
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
            <UploadCloud size={32} className="text-indigo-400" />
          </div>
          <h3 className="font-bold text-white mb-1">Upload de XML Manual</h3>
          <p className="text-xs text-slate-400 text-center">Arraste e solte o arquivo aqui<br/>ou clique para procurar</p>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-5">
           <div className="bg-[#111528] rounded-2xl p-6 border border-indigo-500/10 shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/10 rounded-bl-full blur-2xl" />
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Aguardando Autorização</p>
             <p className="text-4xl font-black font-mono text-white">{invoices.filter(i => i.status === "PENDING_AUTHORIZATION").length}</p>
             <p className="text-xs text-amber-400 mt-2 font-medium">Notas emitidas contra o CNPJ</p>
           </div>
           <div className="bg-[#111528] rounded-2xl p-6 border border-indigo-500/10 shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full blur-2xl" />
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Entradas no Mês</p>
             <p className="text-4xl font-black font-mono text-emerald-400">R$ {fmt(invoices.filter(i => i.status === "IMPORTED").reduce((a,b) => a+b.value, 0))}</p>
             <p className="text-xs text-emerald-500/60 mt-2 font-medium">Valor total importado</p>
           </div>
        </div>
      </div>

      {/* Radar Table */}
      <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex-1 flex flex-col min-h-0 shadow-xl">
        <div className="p-5 border-b border-indigo-500/[0.08] flex items-center justify-between shrink-0">
          <h2 className="font-bold text-white">Documentos Fiscais no Radar</h2>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Buscar por chave ou fornecedor..." className="w-full pl-9 pr-4 py-2 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium transition-all" />
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 sticky top-0">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Fornecedor</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Chave de Acesso</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Data Emissão</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right">Valor Total</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/[0.06]">
              {filtered.map(i => (
                <tr key={i.id} className="hover:bg-indigo-500/[0.04] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white mb-0.5">{i.supplier}</div>
                    <div className="text-xs text-slate-500 font-mono">{i.cnpj}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-indigo-300/70">{i.accessKey.replace(/(\d{4})/g, "$1 ")}</td>
                  <td className="px-6 py-4 text-slate-400 font-medium">{i.date}</td>
                  <td className="px-6 py-4 text-right font-black font-mono text-white">R$ {fmt(i.value)}</td>
                  <td className="px-6 py-4 text-center">
                    {i.status === "PENDING_AUTHORIZATION" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertCircle size={12}/> Pendente</span>
                    ) : i.status === "AUTHORIZED_FOR_COLLECTOR" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20"><Package size={12}/> No Coletor</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 size={12}/> Importada</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    {i.status === "PENDING_AUTHORIZATION" && (
                      <button onClick={() => authorizeForCollector(i.id)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20">
                        Autorizar Coletor
                      </button>
                    )}
                    {(i.status === "PENDING_AUTHORIZATION" || i.status === "AUTHORIZED_FOR_COLLECTOR") && (
                      <button onClick={() => openImportWizard(i)} className="bg-[var(--accent)] hover:opacity-90 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-[var(--accent)]/20 flex items-center gap-1.5">
                        Dar Entrada <ArrowRight size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">Nenhum documento fiscal encontrado no Radar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Import Wizard Modal ── */}
      {importWizardOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0f1a] border border-indigo-500/30 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
            {/* Header */}
            <div className="bg-[#111528] px-8 py-5 border-b border-indigo-500/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Package className="text-[var(--accent)]" /> Importação Inteligente de NF-e</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">{selectedInvoice.accessKey}</p>
              </div>
              <button onClick={() => setImportWizardOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
            </div>
            
            {/* Steps Indicator */}
            <div className="flex bg-[#111528]/50 border-b border-indigo-500/10 px-8 py-4 shrink-0">
              {[
                { num: 1, label: "Resumo da Nota" },
                { num: 2, label: "De/Para de Produtos" },
                { num: 3, label: "Financeiro & Confirmação" }
              ].map(step => (
                <div key={step.num} className={`flex-1 flex items-center gap-3 ${step.num < 3 ? "border-r border-indigo-500/10 mr-4 pr-4" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${wizardStep === step.num ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] shadow-[0_0_15px_var(--accent)]" : wizardStep > step.num ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-slate-700 text-slate-500"}`}>
                    {wizardStep > step.num ? <CheckCircle2 size={16} /> : step.num}
                  </div>
                  <span className={`font-semibold text-sm ${wizardStep === step.num ? "text-white" : wizardStep > step.num ? "text-emerald-400" : "text-slate-500"}`}>{step.label}</span>
                </div>
              ))}
            </div>

            {/* Wizard Content */}
            <div className="flex-1 overflow-auto p-8 relative">
              {wizardStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-[#111528] rounded-2xl p-6 border border-indigo-500/10 space-y-4">
                       <h4 className="font-bold text-indigo-400 text-sm uppercase tracking-widest flex items-center gap-2"><MapPin size={16}/> Dados do Fornecedor</h4>
                       <div><p className="text-xs text-slate-500">Razão Social</p><p className="font-bold text-white text-lg">{selectedInvoice.supplier}</p></div>
                       <div><p className="text-xs text-slate-500">CNPJ</p><p className="font-mono text-slate-300">{selectedInvoice.cnpj}</p></div>
                    </div>
                    <div className="bg-[#111528] rounded-2xl p-6 border border-indigo-500/10 space-y-4">
                       <h4 className="font-bold text-[var(--accent)] text-sm uppercase tracking-widest flex items-center gap-2"><DollarSign size={16}/> Valores Totais</h4>
                       <div><p className="text-xs text-slate-500">Valor Total da Nota</p><p className="font-black font-mono text-3xl text-white">R$ {fmt(selectedInvoice.value)}</p></div>
                       <div className="flex gap-6">
                         <div><p className="text-xs text-slate-500">Volumes/Itens</p><p className="font-bold text-slate-300">{XML_ITEMS_MOCK.length}</p></div>
                         <div><p className="text-xs text-slate-500">Data de Emissão</p><p className="font-bold text-slate-300 flex items-center gap-1"><Calendar size={14}/> {selectedInvoice.date}</p></div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-indigo-300 font-bold text-sm">Associação de Produtos (De/Para) & Validação Fiscal</h4>
                      <p className="text-indigo-200/70 text-xs mt-1">O sistema tentou vincular automaticamente os itens da nota com o seu estoque pelo código EAN. Associe os itens faltantes para dar entrada correta.</p>
                    </div>
                  </div>

                  {/* Banner de Sugestão de Devolução e Divergências */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <AlertCircle size={16} /> 
                        <span>Divergência Detectada! (Ex: Cerveja Pilsen veio com 10 unidades a menos no caminhão)</span>
                      </div>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">1 Divergência</span>
                    </div>
                    
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => handleGenerateReturnNote("TOTAL")}
                        className="bg-red-600/90 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                      >
                        🚫 Sugerir Devolução Total da Nota
                      </button>
                      <button 
                        onClick={() => handleGenerateReturnNote("DIVERGINCIAS_ONLY")}
                        className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                      >
                        ⚡ Gerar Nota de Devolução Apenas das Divergências
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#111528] border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-xs uppercase">Produto no XML (Fornecedor)</th>
                          <th className="px-4 py-3 font-semibold text-xs uppercase">Qtd XML</th>
                          <th className="px-4 py-3 font-semibold text-xs uppercase">Custo Unit</th>
                          <th className="px-4 py-3 font-semibold text-xs uppercase">Produto no Estoque (Seu Sistema)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {itemsToMap.map((item, idx) => (
                          <tr key={idx} className="bg-[#0c0f1a]">
                            <td className="px-4 py-4">
                              <div className="font-bold text-slate-200 text-xs mb-0.5">{item.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">EAN: {item.ean}</div>
                            </td>
                            <td className="px-4 py-4 text-slate-400 font-mono text-xs">{item.qty} {item.ucom}</td>
                            <td className="px-4 py-4 text-slate-400 font-mono text-xs">R$ {fmt(item.vUnCom)}</td>
                            <td className="px-4 py-4">
                              {item.mappedProduct ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg flex items-center justify-between">
                                  <div>
                                    <div className="text-emerald-400 font-bold text-xs">{item.mappedProduct.name}</div>
                                    <div className="text-emerald-500/60 text-[10px]">Estoque atual: {item.mappedProduct.stock}</div>
                                  </div>
                                  <CheckCircle2 size={16} className="text-emerald-500" />
                                </div>
                              ) : (
                                <button className="w-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-bold px-3 py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2">
                                  <Search size={14} /> Vincular Produto
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                   <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center space-y-4">
                     <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                       <CheckCircle2 size={40} className="text-emerald-400" />
                     </div>
                     <h2 className="text-2xl font-bold text-white tracking-tight">Tudo pronto para a entrada!</h2>
                     <p className="text-slate-400 max-w-lg mx-auto">Os produtos foram mapeados com sucesso. Ao concluir, o sistema realizará as seguintes ações automaticamente:</p>
                     
                     <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto mt-6 text-left">
                       <div className="bg-[#111528] p-4 rounded-xl border border-indigo-500/10">
                         <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2"><Package size={16} /> Estoque</div>
                         <p className="text-xs text-slate-300">Os {XML_ITEMS_MOCK.length} itens serão adicionados ao estoque da loja principal.</p>
                       </div>
                       <div className="bg-[#111528] p-4 rounded-xl border border-indigo-500/10">
                         <div className="flex items-center gap-2 text-amber-400 font-bold mb-2"><DollarSign size={16} /> Financeiro</div>
                         <p className="text-xs text-slate-300">Lançamento de Contas a Pagar no valor de R$ {fmt(selectedInvoice.value)} vinculado ao fornecedor.</p>
                       </div>
                     </div>
                   </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="bg-[#111528] px-8 py-5 border-t border-indigo-500/10 flex justify-between shrink-0">
              <button 
                onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setImportWizardOpen(false)} 
                className="px-6 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors"
              >
                {wizardStep === 1 ? "Cancelar" : "Voltar"}
              </button>
              
              {wizardStep < 3 ? (
                <button onClick={() => setWizardStep(wizardStep + 1)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20">
                  Próximo <ArrowRight size={16} />
                </button>
              ) : (
                <button onClick={finishImport} className="bg-[var(--accent)] hover:opacity-90 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-[var(--accent)]/30">
                  <CheckCircle2 size={18} /> Confirmar Entrada
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Emissão de Nota de Devolução (Total ou Parcial) ── */}
      {returnModalData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0f1a] border border-amber-500/30 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#111528] px-6 py-4 border-b border-amber-500/20 flex justify-between items-center">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <FileText size={20} /> {returnModalData.title}
              </h3>
              <button onClick={() => setReturnModalData(null)} className="p-1 hover:bg-amber-500/10 rounded-lg text-slate-500"><X size={18}/></button>
            </div>
            
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-[#111528] p-4 rounded-xl border border-indigo-500/10 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 font-bold block uppercase">Destinatário (Fornecedor)</span>
                  <span className="text-white font-bold">{returnModalData.supplier}</span>
                  <span className="text-slate-400 block font-mono">{returnModalData.cnpj}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block uppercase">NF-e de Referência</span>
                  <span className="text-indigo-300 font-mono text-[10px] block truncate">{returnModalData.accessKeyRef}</span>
                  <span className="text-amber-400 font-bold mt-1 block">CFOP: {returnModalData.cfop} - Devolução de Compras</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[10px]">Itens a serem devolvidos na NF-e</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#111528] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-right">Qtd</th>
                        <th className="p-2.5 text-right">Unit.</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {returnModalData.items.map((it: any, idx: number) => (
                        <tr key={idx} className="bg-[#0c0f1a]">
                          <td className="p-2.5 font-sans font-medium text-slate-200">
                            <div>{it.name}</div>
                            {it.reason && <div className="text-[10px] text-amber-400 font-sans mt-0.5">{it.reason}</div>}
                          </td>
                          <td className="p-2.5 text-right text-slate-300">{it.qty} {it.ucom}</td>
                          <td className="p-2.5 text-right text-slate-300">R$ {fmt(it.vUnCom)}</td>
                          <td className="p-2.5 text-right text-emerald-400 font-bold">R$ {fmt(it.vProd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-amber-300 font-bold block">Valor Total da Nota de Devolução</span>
                  <span className="text-slate-400 text-[10px]">Será gerado XML com tag de NF-e Referenciada e transmitida à SEFAZ.</span>
                </div>
                <span className="text-2xl font-black font-mono text-amber-300">R$ {fmt(returnModalData.totalValue)}</span>
              </div>
            </div>

            <div className="bg-[#111528] px-6 py-4 border-t border-amber-500/20 flex justify-between items-center">
              <button onClick={() => setReturnModalData(null)} className="px-4 py-2 rounded-xl text-slate-400 font-semibold hover:bg-slate-800">Cancelar</button>
              <button 
                onClick={() => {
                  alert(`NF-e de Devolução transmitida com sucesso para a SEFAZ!\nChave de Devolução: 352310999...${Date.now().toString().slice(-6)}\nDocumento enviado ao Fornecedor.`);
                  setReturnModalData(null);
                  setImportWizardOpen(false);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all"
              >
                <CheckCircle2 size={16} /> Emitir & Transmitir NF-e de Devolução
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
