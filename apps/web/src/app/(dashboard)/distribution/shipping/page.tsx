"use client";

import { useState, useEffect } from "react";
import { Package, Search, CheckCircle2, Clock, Barcode, AlertTriangle, ArrowRight, Truck, CheckSquare } from "lucide-react";
import { getPickingLists, updatePickingItemStatus, updatePickingListStatus } from "@/actions/shipping";

export default function ShippingPage() {
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<any | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");

  useEffect(() => {
    loadLists();
  }, []);

  async function loadLists() {
    setLoading(true);
    const res = await getPickingLists();
    if (res.lists) {
      setLists(res.lists);
      if (res.lists.length > 0 && !selectedList) {
        setSelectedList(res.lists[0]);
      }
    }
    setLoading(false);
  }

  const handleSelect = (list: any) => {
    setSelectedList(list);
  };

  const handleItemQtyChange = async (itemId: string, qty: number) => {
    await updatePickingItemStatus(itemId, qty);
    loadLists();
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList || !barcodeInput.trim()) return;

    const code = barcodeInput.trim();
    const item = selectedList.items.find(
      (i: any) => i.product.barcode === code || i.product.internalCode === code
    );

    if (item) {
      const newQty = item.pickedQty + 1;
      handleItemQtyChange(item.id, newQty);
      setBarcodeInput("");
    } else {
      alert(`Produto com código ${code} não pertence a este pedido!`);
      setBarcodeInput("");
    }
  };

  const handleFinishPicking = async (status: string) => {
    if (!selectedList) return;
    await updatePickingListStatus(selectedList.id, status);
    loadLists();
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="text-indigo-400" />
            Expedição & Conferência (Picking)
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Separação e conferência eletrônica por código de barras para envio aos clientes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de Pedidos em Separação */}
        <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-indigo-400 pb-2 border-b border-indigo-500/10">
            Fila de Expedição ({lists.length})
          </h2>

          {loading ? (
            <div className="py-8 text-center text-slate-500 text-xs">Carregando...</div>
          ) : lists.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">Nenhum pedido pendente de separação</div>
          ) : (
            <div className="space-y-2">
              {lists.map((l) => {
                const isSelected = selectedList?.id === l.id;
                const totalItems = l.items.length;
                const pickedItems = l.items.filter((i: any) => i.pickedQty >= i.quantity).length;
                const isDone = totalItems > 0 && pickedItems === totalItems;

                return (
                  <div
                    key={l.id}
                    onClick={() => handleSelect(l)}
                    className={`cursor-pointer rounded-xl p-3 border transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500 text-white font-semibold"
                        : "bg-[#0c0f1a] border-indigo-500/10 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div>
                      <h3 className="text-xs font-bold text-white font-mono">
                        Pedido #{l.orderId.substring(0, 8)}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {pickedItems} de {totalItems} itens conferidos
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {isDone ? "Conferido" : "Pendente"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detalhes e Conferência do Pedido Selecionado */}
        <div className="lg:col-span-3 bg-[#111528] border border-indigo-500/15 rounded-2xl p-5 flex flex-col gap-4">
          {selectedList ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-indigo-500/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Conferindo Expedição:</span>
                    <h2 className="text-lg font-bold text-white font-mono">#{selectedList.orderId.substring(0, 8)}</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Utilize o leitor de código de barras ou confirme manualmente os itens separados.
                  </p>
                </div>

                {/* Leitor de Código de Barras */}
                <form onSubmit={handleBarcodeScan} className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1">
                    <Barcode size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="Bipar Barcode EAN..."
                      className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-xl text-xs">
                    Bipar
                  </button>
                </form>
              </div>

              {/* Tabela de Itens em Separação */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-indigo-400/60 uppercase tracking-wider border-b border-indigo-500/10 text-[10px]">
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3">Código / EAN</th>
                      <th className="py-2.5 px-3 text-right">Qtd Pedida</th>
                      <th className="py-2.5 px-3 text-right">Qtd Conferida</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/[0.06]">
                    {selectedList.items.map((item: any) => {
                      const isComplete = item.pickedQty >= item.quantity;
                      return (
                        <tr key={item.id} className="hover:bg-indigo-500/[0.03]">
                          <td className="py-3 px-3 font-semibold text-white">{item.product.name}</td>
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {item.product.barcode || item.product.internalCode || "---"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-300">
                            {item.quantity} {item.product.unit || "UN"}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              value={item.pickedQty}
                              onChange={(e) => handleItemQtyChange(item.id, parseFloat(e.target.value) || 0)}
                              className="w-20 bg-[#0c0f1a] border border-indigo-500/20 rounded px-2 py-1 text-right text-xs font-mono font-bold text-emerald-400 outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                isComplete
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : item.pickedQty > 0
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-slate-500/20 text-slate-400"
                              }`}
                            >
                              {isComplete ? "OK" : item.pickedQty > 0 ? "Incompleto" : "Pendente"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Ações de Conclusão */}
              <div className="flex justify-between items-center pt-4 border-t border-indigo-500/10">
                <button
                  onClick={() => handleFinishPicking("IN_PROGRESS")}
                  className="px-4 py-2 bg-[#0c0f1a] border border-indigo-500/20 text-slate-300 hover:text-white rounded-xl text-xs font-medium"
                >
                  Pausar Separação
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleFinishPicking("CHECKED")}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 text-xs transition-all"
                  >
                    <CheckSquare size={16} />
                    Finalizar Conferência & Liberar Faturamento
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-500 text-xs">
              Selecione um pedido na fila para iniciar a conferência.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
