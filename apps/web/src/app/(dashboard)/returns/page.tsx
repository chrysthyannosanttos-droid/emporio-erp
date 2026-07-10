"use client";

import { useState } from "react";
import { ArrowLeftRight, Search, FileText, User, ShoppingCart, Package, AlertTriangle, CheckCircle, Tag, Wallet } from "lucide-react";
import { findSaleForReturn, processReturn } from "@/actions/returns";

export default function ReturnsPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sale, setSale] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);

  const [selectedItems, setSelectedItems] = useState<{
    [productId: string]: { quantity: number; destiny: "STOCK" | "LOSS" }
  }>({});

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);
    setSale(null);
    setSelectedItems({});

    const res = await findSaleForReturn(query);
    if (res?.error) {
      setError(res.error);
    } else if (res?.sale) {
      setSale(res.sale);
    }
    setLoading(false);
  };

  const handleItemToggle = (productId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (checked) {
        next[productId] = { quantity: 1, destiny: "STOCK" };
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  const handleItemChange = (productId: string, field: "quantity" | "destiny", value: any) => {
    setSelectedItems(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const handleProcessReturn = async () => {
    if (!sale) return;
    const itemsToReturn = Object.entries(selectedItems).map(([productId, data]) => {
      const originalItem = sale.items.find((i: any) => i.productId === productId);
      return {
        productId,
        quantity: data.quantity,
        unitPrice: Number(originalItem.unitPrice),
        destiny: data.destiny
      };
    });

    if (itemsToReturn.length === 0) {
      setError("Selecione pelo menos um item para devolver.");
      return;
    }

    if (!sale.customerId || !sale.customer?.document) {
      setError("Cliente não identificado ou cadastro incompleto (Falta CPF). Atualize o cadastro do cliente antes de gerar o Vale-Crédito.");
      return;
    }

    setLoading(true);
    const totalAmount = itemsToReturn.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

    const res = await processReturn({
      saleId: sale.id,
      customerId: sale.customerId,
      companyId: sale.companyId,
      userId: sale.userId,
      items: itemsToReturn,
      totalAmount,
      reason: "Devolução iniciada via Central"
    });

    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess({
        message: `Devolução processada! Crédito de R$ ${totalAmount.toFixed(2)} gerado para ${sale.customer.name}.`,
        invoiceId: res.invoice?.id,
        returnId: res.returnId
      });
      setSale(null);
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <ArrowLeftRight className="text-[var(--accent)]" size={28} />
          Central de Trocas e Devoluções
        </h1>
        <p className="text-slate-500 text-sm mt-1">Busque a nota original, selecione os produtos e gere o Vale-Crédito para o cliente.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} />
            <span className="font-bold text-lg">{success.message}</span>
          </div>
          <div className="flex gap-4">
            <button className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <FileText size={16} /> Ver NF-e de Devolução
            </button>
            <button onClick={() => setSuccess(null)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg text-sm">
              Nova Devolução
            </button>
          </div>
        </div>
      )}

      {!success && (
        <div className="bg-[#111528] border border-indigo-500/10 rounded-2xl p-6">
          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Digite o número da Nota, Chave de Acesso ou ID da Venda..."
                className="w-full pl-12 pr-4 py-4 bg-[#0c0f1a] border border-indigo-500/15 focus:border-[var(--accent)] text-white rounded-xl outline-none text-base font-medium shadow-inner"
              />
            </div>
            <button type="submit" disabled={loading} className="bg-[var(--accent)] hover:opacity-90 text-white font-black px-8 py-4 rounded-xl tracking-widest text-sm shadow-[0_0_20px_var(--accent)]/30 disabled:opacity-50">
              {loading ? "BUSCANDO..." : "BUSCAR VENDA"}
            </button>
          </form>

          {sale && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0c0f1a] border border-indigo-500/15 rounded-xl p-4 flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <ShoppingCart className="text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Dados da Venda</span>
                    <div className="text-white font-bold text-lg">ID: {sale.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-slate-400 text-sm mt-1">Total: R$ {Number(sale.total).toFixed(2)}</div>
                  </div>
                </div>
                
                <div className={`border rounded-xl p-4 flex gap-4 ${!sale.customerId || !sale.customer?.document ? 'bg-red-500/5 border-red-500/20' : 'bg-[#0c0f1a] border-indigo-500/15'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${!sale.customerId || !sale.customer?.document ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                    <User className={!sale.customerId || !sale.customer?.document ? 'text-red-400' : 'text-emerald-400'} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cliente Identificado</span>
                    {sale.customer ? (
                      <>
                        <div className="text-white font-bold text-lg">{sale.customer.name}</div>
                        <div className={`${sale.customer.document ? 'text-slate-400' : 'text-red-400'} text-sm mt-1 font-mono`}>
                          CPF: {sale.customer.document || "NÃO INFORMADO"}
                        </div>
                      </>
                    ) : (
                      <div className="text-red-400 font-bold mt-1">Consumidor Não Identificado na Venda Original</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-indigo-500/15 rounded-xl overflow-hidden">
                <div className="bg-[#0c0f1a] px-4 py-3 border-b border-indigo-500/15 text-sm font-bold text-slate-400 flex items-center gap-2">
                  <Package size={16} /> Itens da Venda Original
                </div>
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="bg-[#111528] text-slate-500 border-b border-indigo-500/10">
                    <tr>
                      <th className="px-4 py-3 w-10"></th>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3 text-center">Comprado</th>
                      <th className="px-4 py-3 text-center">Devolver (Qtd)</th>
                      <th className="px-4 py-3">Destino do Produto</th>
                      <th className="px-4 py-3 text-right">Valor Restituição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/5">
                    {sale.items.map((item: any) => {
                      const isSelected = !!selectedItems[item.productId];
                      const selectedData = selectedItems[item.productId];
                      
                      return (
                        <tr key={item.id} className={isSelected ? 'bg-indigo-500/5' : ''}>
                          <td className="px-4 py-4">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => handleItemToggle(item.productId, e.target.checked)}
                              className="w-5 h-5 rounded border-indigo-500/30 text-[var(--accent)] bg-[#0c0f1a] focus:ring-[var(--accent)] cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4 font-bold text-white">{item.product.name}</td>
                          <td className="px-4 py-4 text-center font-mono text-slate-400">{item.quantity}</td>
                          <td className="px-4 py-4">
                            {isSelected && (
                              <input 
                                type="number" 
                                min="1" 
                                max={item.quantity}
                                value={selectedData.quantity}
                                onChange={(e) => handleItemChange(item.productId, "quantity", Number(e.target.value))}
                                className="w-20 bg-[#0c0f1a] border border-indigo-500/30 focus:border-[var(--accent)] text-white text-center py-1.5 rounded outline-none font-mono"
                              />
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {isSelected && (
                              <select 
                                value={selectedData.destiny}
                                onChange={(e) => handleItemChange(item.productId, "destiny", e.target.value)}
                                className="bg-[#0c0f1a] border border-indigo-500/30 focus:border-[var(--accent)] text-white py-1.5 px-3 rounded outline-none text-xs font-bold"
                              >
                                <option value="STOCK">Volta pro Estoque (Bom)</option>
                                <option value="LOSS">Avaria/Perda (Lixo)</option>
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-emerald-400 font-mono">
                            {isSelected ? `R$ ${(selectedData.quantity * Number(item.unitPrice)).toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4 border-t border-indigo-500/15">
                <button 
                  onClick={handleProcessReturn}
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-8 py-4 rounded-xl flex items-center gap-3 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <Wallet size={20} />
                  CONFIRMAR DEVOLUÇÃO E GERAR CRÉDITO
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
