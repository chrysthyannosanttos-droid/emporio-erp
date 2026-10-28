"use client";

import { useState, useEffect } from "react";
import { Hammer, Plus, CheckCircle2, Clock, AlertTriangle, Layers, BookOpen, ChevronRight, CheckSquare } from "lucide-react";
import Link from "next/link";
import { getProductionOrders, createProductionOrder, finishProductionOrder } from "@/actions/productionOrder";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PLANNED: { label: "Planejada", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  IN_PROGRESS: { label: "Em Produção", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  FINISHED: { label: "Finalizada", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  CANCELED: { label: "Cancelada", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
};

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Nova OP
  const [showModal, setShowModal] = useState(false);
  const [recipeId, setRecipeId] = useState("");
  const [plannedQty, setPlannedQty] = useState("100");
  const [batchNumber, setBatchNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal Finalizar OP
  const [selectedOpToFinish, setSelectedOpToFinish] = useState<any | null>(null);
  const [producedQty, setProducedQty] = useState("");
  const [rejectedQty, setRejectedQty] = useState("0");
  const [actualLaborCost, setActualLaborCost] = useState("0");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const res = await getProductionOrders();
    if (res.orders) setOrders(res.orders);
    if (res.recipes) setRecipes(res.recipes);
    setLoading(false);
  }

  async function handleCreateOP(e: React.FormEvent) {
    e.preventDefault();
    if (!recipeId) return;
    setSubmitting(true);

    const res = await createProductionOrder({
      recipeId,
      plannedQty: parseFloat(plannedQty) || 1,
      batchNumber: batchNumber || undefined,
      expirationDate: expirationDate || undefined,
    });

    setSubmitting(false);
    if (res.success) {
      setShowModal(false);
      setRecipeId("");
      setBatchNumber("");
      setExpirationDate("");
      loadData();
    } else {
      alert(res.error || "Erro ao criar OP");
    }
  }

  async function handleFinishOP(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOpToFinish) return;
    setSubmitting(true);

    const res = await finishProductionOrder({
      orderId: selectedOpToFinish.id,
      producedQty: parseFloat(producedQty) || selectedOpToFinish.plannedQty,
      rejectedQty: parseFloat(rejectedQty) || 0,
      actualLaborCost: parseFloat(actualLaborCost) || 0,
    });

    setSubmitting(false);
    if (res.success) {
      setSelectedOpToFinish(null);
      loadData();
    } else {
      alert(res.error || "Erro ao finalizar OP");
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Hammer className="text-indigo-400" />
            Ordens de Produção (OP) Industriais
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Planejamento fabril, baixa de matérias-primas e formação de lote de produtos acabados.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/restaurant/recipes"
            className="flex items-center gap-1.5 bg-[#111528] border border-indigo-500/20 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors"
          >
            <BookOpen size={15} /> Fichas Técnicas
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-xs"
          >
            <Plus size={16} />
            Abrir Ordem de Produção
          </button>
        </div>
      </div>

      {/* Tabela de Ordens de Produção */}
      <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-indigo-500/10 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white">Ordens Registradas ({orders.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-indigo-400/60 uppercase tracking-wider border-b border-indigo-500/10 text-[10px] bg-[#0c0f1a]/40">
                <th className="py-3 px-4">Nº OP</th>
                <th className="py-3 px-4">Produto Fabricado</th>
                <th className="py-3 px-4 text-right">Qtd Planejada</th>
                <th className="py-3 px-4 text-right">Qtd Produzida</th>
                <th className="py-3 px-4">Lote / Validade</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Carregando ordens de produção...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Nenhuma ordem de produção registrada.
                  </td>
                </tr>
              ) : (
                orders.map((op) => {
                  const badge = STATUS_MAP[op.status] || { label: op.status, color: "bg-slate-500/20 text-slate-400" };
                  return (
                    <tr key={op.id} className="hover:bg-indigo-500/[0.03]">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{op.number}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {op.recipe?.product?.name || "Produto não identificado"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300">
                        {op.plannedQty} {op.recipe?.product?.unit || "UN"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        {op.producedQty > 0 ? `${op.producedQty} ${op.recipe?.product?.unit || "UN"}` : "---"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        <div>{op.batchNumber || "---"}</div>
                        {op.expirationDate && (
                          <div className="text-[10px] text-amber-400">
                            Val: {new Date(op.expirationDate).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {op.status !== "FINISHED" ? (
                          <button
                            onClick={() => {
                              setSelectedOpToFinish(op);
                              setProducedQty(String(op.plannedQty));
                            }}
                            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white px-3 py-1 rounded text-[11px] font-bold transition-all border border-emerald-500/30"
                          >
                            Finalizar Produção
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">Concluída</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Nova OP */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Nova Ordem de Produção (OP)</h2>
            <form onSubmit={handleCreateOP} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Selecione a Ficha Técnica *</label>
                <select
                  required
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="">-- Escolha o Produto a Fabricar --</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.product?.name} (Rendimento: {r.yield} {r.product?.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Quantidade Planejada *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={plannedQty}
                  onChange={(e) => setPlannedQty(e.target.value)}
                  placeholder="Ex: 500"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Número do Lote</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="Gerado auto..."
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data de Validade</label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? "Abrindo OP..." : "Confirmar OP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Finalizar OP */}
      {selectedOpToFinish && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Finalizar Produção ({selectedOpToFinish.number})</h2>
            <p className="text-xs text-slate-400 mb-4">
              Ao confirmar, o sistema baixará automaticamente o estoque dos insumos e adicionará {producedQty} {selectedOpToFinish.recipe?.product?.unit} ao estoque de produtos acabados.
            </p>

            <form onSubmit={handleFinishOP} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Quantidade Efetivamente Produzida *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={producedQty}
                  onChange={(e) => setProducedQty(e.target.value)}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none text-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Quantidade Rejeitada / Perda</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mão de Obra Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualLaborCost}
                    onChange={(e) => setActualLaborCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOpToFinish(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  {submitting ? "Finalizando..." : "Baixar Insumos & Entrar Estoque"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
