"use client";

import { useState, useRef, useEffect } from "react";
import { Package, Search, ChevronRight, CheckCircle2, AlertTriangle, ArrowLeft, Camera, Calendar, CheckSquare, Square } from "lucide-react";

export default function CollectorPage() {
  const [authorizedInvoices, setAuthorizedInvoices] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("radarInvoices");
    if (saved) {
      const parsed = JSON.parse(saved);
      setAuthorizedInvoices(parsed.filter((i: any) => i.status === "AUTHORIZED_FOR_COLLECTOR"));
    }
  }, []);

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  // Scanning state
  const [barcode, setBarcode] = useState("");
  const [qty, setQty] = useState("");
  const [expiration, setExpiration] = useState("");
  const [isBonificacao, setIsBonificacao] = useState(false);
  const [scannedItems, setScannedItems] = useState<any[]>([]);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input
  useEffect(() => {
    if (selectedInvoice && !qty && !expiration) {
      const t = setTimeout(() => barcodeInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [selectedInvoice, barcode, qty, expiration]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode || !qty || !expiration) {
      alert("Preencha Código de Barras, Quantidade e Validade.");
      return;
    }
    
    // Check if item exists in PO (Mock validation)
    const isValid = barcode.length > 5; // Fake logic: any barcode > 5 digits is "valid"
    
    if (!isValid) {
      alert("PRODUTO NÃO CONSTA NO PEDIDO DE COMPRA!");
      return;
    }

    setScannedItems(prev => [
      { id: Date.now().toString(), barcode, qty: parseInt(qty), expiration, isBonificacao },
      ...prev
    ]);
    
    setBarcode("");
    setQty("");
    setExpiration("");
    setIsBonificacao(false);
    barcodeInputRef.current?.focus();
  };

  const finishReceipt = () => {
    if (scannedItems.length === 0) return;
    if (confirm("Finalizar o recebimento às cegas? O sistema irá cruzar com o Pedido de Compra.")) {
      alert("Recebimento finalizado e enviado para auditoria!");
      
      // Remove from localStorage
      const saved = localStorage.getItem("radarInvoices");
      if (saved) {
        const parsed = JSON.parse(saved);
        const updated = parsed.filter((i: any) => i.id !== selectedInvoice.id);
        localStorage.setItem("radarInvoices", JSON.stringify(updated));
        setAuthorizedInvoices(updated.filter((i: any) => i.status === "AUTHORIZED_FOR_COLLECTOR"));
      }

      setSelectedInvoice(null);
      setScannedItems([]);
    }
  };

  if (!selectedInvoice) {
    return (
      <div className="min-h-full bg-[#0c0f1a] text-slate-100 flex flex-col max-w-2xl mx-auto border-x border-indigo-500/10">
        <div className="bg-[#111528] p-5 border-b border-indigo-500/10 shrink-0">
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
            <Package className="text-blue-400" size={24} />
            Coletor - Docas
          </h1>
          <p className="text-xs text-slate-400 mt-1">Selecione uma nota autorizada para iniciar o recebimento às cegas.</p>
        </div>
        
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {authorizedInvoices.map(inv => (
            <button 
              key={inv.id} 
              onClick={() => setSelectedInvoice(inv)}
              className="w-full bg-[#111528] border border-indigo-500/15 hover:border-blue-500/50 rounded-2xl p-4 flex items-center justify-between transition-all active:scale-95 text-left"
            >
              <div>
                <div className="text-blue-400 font-black text-sm mb-1">Pedido #{inv.poNumber}</div>
                <div className="font-bold text-white text-base leading-tight mb-2">{inv.supplier}</div>
                <div className="text-xs font-semibold text-slate-500 flex gap-3">
                  <span>{inv.itemsCount} volumes</span>
                  <span>{inv.date}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                <ChevronRight size={20} />
              </div>
            </button>
          ))}
          {authorizedInvoices.length === 0 && (
            <div className="text-center p-10 text-slate-500 flex flex-col items-center">
               <AlertTriangle size={32} className="opacity-20 mb-3" />
               <p className="font-bold">Nenhuma nota autorizada.</p>
               <p className="text-xs mt-2">Acesse "Entrada de Notas (Radar XML)" e autorize o envio de uma NF-e para a doca.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0c0f1a] text-slate-100 flex flex-col max-w-2xl mx-auto border-x border-indigo-500/10">
      {/* Header */}
      <div className="bg-[#111528] px-4 py-3 border-b border-indigo-500/10 shrink-0 flex items-center gap-3">
        <button onClick={() => setSelectedInvoice(null)} className="p-2 -ml-2 rounded-lg hover:bg-slate-800 text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-black text-white">Recebimento #{selectedInvoice.poNumber}</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedInvoice.supplier}</p>
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 shrink-0 bg-[#111528] border-b border-indigo-500/10 shadow-lg">
        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cód. Barras do Produto</label>
            <div className="relative">
              <input 
                ref={barcodeInputRef}
                value={barcode} 
                onChange={e => setBarcode(e.target.value)}
                type="text" 
                className="w-full bg-[#0c0f1a] border-2 border-indigo-500/20 focus:border-blue-500 text-white font-mono text-lg p-3 pl-10 rounded-xl outline-none transition-all shadow-inner"
                placeholder="Bipe o produto..."
              />
              <Camera className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Quantidade FÍSICA</label>
              <input 
                value={qty} 
                onChange={e => setQty(e.target.value)}
                type="number" 
                min="1"
                className="w-full bg-[#0c0f1a] border-2 border-indigo-500/20 focus:border-blue-500 text-white font-black text-xl text-center p-3 rounded-xl outline-none transition-all"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">Data de Validade</label>
              <div className="relative">
                <input 
                  value={expiration} 
                  onChange={e => setExpiration(e.target.value)}
                  type="date" 
                  className="w-full bg-[#0c0f1a] border-2 border-amber-500/30 focus:border-amber-500 text-amber-100 font-bold text-sm p-3.5 rounded-xl outline-none transition-all shadow-inner"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button 
              type="button" 
              onClick={() => setIsBonificacao(!isBonificacao)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all font-bold text-xs ${isBonificacao ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-slate-800 text-slate-400"}`}
            >
              {isBonificacao ? <CheckSquare size={16}/> : <Square size={16}/>}
              É BONIFICAÇÃO?
            </button>
            <button type="submit" className="bg-blue-600 active:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-sm tracking-widest shadow-lg flex-1 ml-4 transition-all">
              INSERIR
            </button>
          </div>
        </form>
      </div>

      {/* Scanned Items List */}
      <div className="flex-1 overflow-auto p-4 bg-[#0c0f1a]">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Itens Bipados ({scannedItems.length})</h3>
        <div className="space-y-2">
          {scannedItems.map((item) => (
            <div key={item.id} className="bg-[#111528] border border-indigo-500/10 p-3 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-mono text-sm text-white font-bold">{item.barcode}</div>
                <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                  <Calendar size={10} /> Val: {new Date(item.expiration).toLocaleDateString("pt-BR")}
                </div>
                {item.isBonificacao && <div className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded mt-1 inline-block font-bold">BONIFICAÇÃO</div>}
              </div>
              <div className="bg-[#0c0f1a] border border-slate-800 px-3 py-1.5 rounded-lg text-center min-w-[60px]">
                <div className="text-[10px] text-slate-500 font-bold">QTD</div>
                <div className="text-white font-black text-lg">{item.qty}</div>
              </div>
            </div>
          ))}
          {scannedItems.length === 0 && (
            <div className="text-center py-10 text-slate-600 flex flex-col items-center gap-2">
              <Package size={32} className="opacity-20" />
              <p className="text-xs font-bold">Nenhum item bipado ainda.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {scannedItems.length > 0 && (
        <div className="p-4 bg-[#111528] border-t border-indigo-500/10 shrink-0">
          <button onClick={finishReceipt} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-sm tracking-widest shadow-lg shadow-emerald-600/20 transition-all">
            CONCLUIR RECEBIMENTO
          </button>
        </div>
      )}
    </div>
  );
}
