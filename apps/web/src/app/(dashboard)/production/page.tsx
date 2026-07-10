"use client";

import { useState, useEffect } from "react";
import { 
  Hammer, Plus, FileText, Calendar, Layers, Clipboard, 
  Trash, Eye, ChevronRight, Check, AlertCircle, TrendingUp, X
} from "lucide-react";
import { getProducts } from "@/actions/product";
import { getRecipes, createRecipe, recordProduction, getProductionLogs } from "@/actions/production";

export default function ProductionPage() {
  const [activeTab, setActiveTab] = useState<"recipes" | "logs">("recipes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Data lists
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // State for Create Recipe Modal/Form
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [recipeYield, setRecipeYield] = useState("1");
  const [recipeInstructions, setRecipeInstructions] = useState("");
  const [recipeItems, setRecipeItems] = useState<{ productId: string; quantity: number; unit: string }[]>([]);

  // State for Record Production Modal
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [prodQty, setProdQty] = useState("1");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    const [pRes, rRes, lRes] = await Promise.all([
      getProducts(),
      getRecipes(),
      getProductionLogs()
    ]);

    if (pRes.products) setProducts(pRes.products);
    if (rRes.recipes) setRecipes(rRes.recipes);
    if (lRes.logs) setLogs(lRes.logs);
    setLoading(false);
  };

  // Calculations for recipe items
  const calculateRecipeCost = (items: any[]) => {
    return items.reduce((acc, item) => {
      const cost = Number(item.product.cost) || Number(item.product.price) * 0.6;
      return acc + (cost * item.quantity);
    }, 0);
  };

  const handleAddRecipeItem = () => {
    setRecipeItems(prev => [...prev, { productId: "", quantity: 0, unit: "KG" }]);
  };

  const handleRemoveRecipeItem = (index: number) => {
    setRecipeItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleRecipeItemChange = (index: number, field: string, value: any) => {
    setRecipeItems(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleCreateRecipeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedProductId) {
      setError("Selecione o produto final.");
      return;
    }

    if (recipeItems.length === 0) {
      setError("Adicione pelo menos um insumo/matéria-prima.");
      return;
    }

    // Validate recipe items
    for (const item of recipeItems) {
      if (!item.productId || item.quantity <= 0) {
        setError("Preencha todos os insumos e respectivas quantidades.");
        return;
      }
    }

    const res = await createRecipe({
      productId: selectedProductId,
      yield: parseFloat(recipeYield) || 1,
      instructions: recipeInstructions,
      items: recipeItems.map(item => ({
        ...item,
        quantity: Number(item.quantity)
      }))
    });

    if (res.success) {
      setSuccess("Ficha técnica cadastrada com sucesso!");
      setIsRecipeModalOpen(false);
      resetRecipeForm();
      loadData();
    } else {
      setError(res.error || "Erro ao criar ficha técnica.");
    }
  };

  const resetRecipeForm = () => {
    setSelectedProductId("");
    setRecipeYield("1");
    setRecipeInstructions("");
    setRecipeItems([]);
  };

  const handleRecordProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedRecipe) return;

    const res = await recordProduction(selectedRecipe.id, parseFloat(prodQty));
    if (res.success) {
      setSuccess(`Produção de ${prodQty}x ${selectedRecipe.product.name} registrada com sucesso! Estoque e insumos atualizados.`);
      setIsProdModalOpen(false);
      setProdQty("1");
      loadData();
    } else {
      setError(res.error || "Erro ao registrar produção.");
    }
  };

  return (
    <div className="space-y-5 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Hammer className="text-indigo-400" size={28} />
            Produção & Panificação
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie fichas técnicas (receitas) de fabricação própria e ordens de produção.</p>
        </div>
        <button 
          onClick={() => setIsRecipeModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={20} /> Nova Ficha Técnica
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-2 text-sm font-semibold">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-2 text-sm font-semibold">
          <Check size={20} />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-indigo-500/[0.08]">
        <button 
          onClick={() => setActiveTab("recipes")}
          className={`pb-4 text-sm font-bold border-b-2 px-2 transition-all ${
            activeTab === "recipes" 
              ? "border-indigo-500 text-white" 
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Fichas Técnicas ({recipes.length})
        </button>
        <button 
          onClick={() => setActiveTab("logs")}
          className={`pb-4 text-sm font-bold border-b-2 px-2 transition-all ${
            activeTab === "logs" 
              ? "border-indigo-500 text-white" 
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Histórico de Produção ({logs.length})
        </button>
      </div>

      {/* List content */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando dados de produção...</div>
      ) : activeTab === "recipes" ? (
        /* RECIPES TAB */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.length === 0 ? (
            <div className="col-span-full bg-[#111528]/40 rounded-2xl border border-indigo-500/[0.08] p-12 text-center text-slate-500">
              <Clipboard size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-bold">Nenhuma ficha técnica cadastrada</p>
              <p className="text-sm">Clique em &apos;Nova Ficha Técnica&apos; para começar a associar insumos aos produtos de fabricação própria.</p>
            </div>
          ) : (
            recipes.map((recipe) => {
              const totalCost = calculateRecipeCost(recipe.items);
              const unitCost = totalCost / recipe.yield;
              return (
                <div key={recipe.id} className="bg-[#111528] border border-indigo-500/[0.08] rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{recipe.product.name}</h2>
                        <span className="text-xs text-slate-500 font-mono">RENDIMENTO: {recipe.yield} {recipe.product.unit || "UN"}</span>
                      </div>
                      <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-1 rounded-lg border border-indigo-500/20 font-bold">
                        Fabricação
                      </span>
                    </div>

                    {/* Ingredients Summary */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Insumos ({recipe.items.length})</span>
                      <div className="max-h-24 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                        {recipe.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-xs text-slate-400 font-medium">
                            <span>• {item.product.name}</span>
                            <span className="font-mono text-slate-300">{item.quantity} {item.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Costs Info */}
                    <div className="pt-4 border-t border-indigo-500/[0.08]/60 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block uppercase">Custo da Receita</span>
                        <span className="font-mono font-bold text-slate-300">R$ {totalCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block uppercase">Custo Unitário</span>
                        <span className="font-mono font-black text-indigo-400">R$ {unitCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        setIsProdModalOpen(true);
                      }}
                      className="w-full bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-transparent text-indigo-400 hover:text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Layers size={16} /> Registrar Produção
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* LOGS TAB */
        <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] overflow-hidden shadow-xl">
          <table className="w-full text-sm">
            <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 font-bold">
              <tr>
                <th className="px-6 py-4 text-left">Data</th>
                <th className="px-6 py-4 text-left">Produto Fabricado</th>
                <th className="px-6 py-4 text-center">Quantidade</th>
                <th className="px-6 py-4 text-left">Lote Gerado</th>
                <th className="px-6 py-4 text-left">Vencimento</th>
                <th className="px-6 py-4 text-left">Operador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/[0.06]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhum registro de produção encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-indigo-500/[0.04] transition-colors">
                    <td className="px-6 py-4 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-white font-bold">{log.recipe.product.name}</td>
                    <td className="px-6 py-4 text-center text-indigo-400 font-bold font-mono">+{log.quantityProduced} {log.recipe.product.unit || "UN"}</td>
                    <td className="px-6 py-4"><span className="font-mono text-xs bg-[#0c0f1a] border border-indigo-500/[0.08] text-slate-300 px-2 py-0.5 rounded-md">{log.batchNumber}</span></td>
                    <td className="px-6 py-4 text-slate-400 font-mono">{log.expirationDate ? new Date(log.expirationDate).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-4 text-slate-400">{log.user.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: NEW RECIPE */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/[0.08] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[#0c0f1a]/60">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="text-indigo-400" />
                Nova Ficha Técnica (Receita)
              </h3>
              <button 
                onClick={() => setIsRecipeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#161b33] text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRecipeSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-1">Produto Acabado</label>
                  <select 
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all"
                    required
                  >
                    <option value="">Selecione o produto final...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-1">Rendimento Padrão</label>
                  <input 
                    type="number" 
                    value={recipeYield}
                    onChange={(e) => setRecipeYield(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Insumos & Ingredientes</h4>
                  <button 
                    type="button"
                    onClick={handleAddRecipeItem}
                    className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20 font-bold text-xs transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> Adicionar Insumo
                  </button>
                </div>

                {recipeItems.length === 0 ? (
                  <div className="p-6 bg-[#0c0f1a]/30 rounded-2xl border border-indigo-500/10 text-center text-slate-500 text-sm">
                    Nenhum ingrediente adicionado. Adicione insumos para compor o custo do produto acabado.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {recipeItems.map((item, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <select 
                          value={item.productId}
                          onChange={(e) => handleRecipeItemChange(index, "productId", e.target.value)}
                          className="flex-1 bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white rounded-xl px-3 py-2 text-sm outline-none transition-all"
                          required
                        >
                          <option value="">Selecione o insumo...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                          ))}
                        </select>
                        <input 
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) => handleRecipeItemChange(index, "quantity", e.target.value)}
                          placeholder="Quant."
                          className="w-24 bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white rounded-xl px-3 py-2 text-sm text-right outline-none transition-all"
                          required
                          min="0.0001"
                          step="0.0001"
                        />
                        <select 
                          value={item.unit}
                          onChange={(e) => handleRecipeItemChange(index, "unit", e.target.value)}
                          className="w-24 bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white rounded-xl px-3 py-2 text-sm outline-none transition-all"
                        >
                          <option value="KG">KG</option>
                          <option value="G">G</option>
                          <option value="L">L</option>
                          <option value="ML">ML</option>
                          <option value="UN">UN</option>
                        </select>
                        <button 
                          type="button"
                          onClick={() => handleRemoveRecipeItem(index)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">Modo de Preparo / Instruções</label>
                <textarea 
                  value={recipeInstructions}
                  onChange={(e) => setRecipeInstructions(e.target.value)}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all h-20 resize-none"
                  placeholder="Instruções de fabricação..."
                />
              </div>

              <div className="pt-4 border-t border-indigo-500/[0.08]/80 flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="bg-[#161b33] hover:bg-[#161b33] text-slate-300 font-bold px-5 py-3 rounded-xl transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm"
                >
                  Gravar Receita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD PRODUCTION */}
      {isProdModalOpen && selectedRecipe && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/[0.08] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[#0c0f1a]/60">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="text-indigo-400" />
                Registrar Produção
              </h3>
              <button 
                onClick={() => setIsProdModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#161b33] text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRecordProductionSubmit} className="p-6 space-y-5">
              <div className="text-center bg-[#0c0f1a]/50 p-4 rounded-2xl border border-indigo-500/[0.08]/60">
                <span className="text-slate-500 text-[10px] font-bold block uppercase tracking-wider">PRODUTO FINITO</span>
                <span className="text-xl font-bold text-white block">{selectedRecipe.product.name}</span>
                <span className="text-xs text-slate-400 font-mono">Unidade base: {selectedRecipe.product.unit || "UN"}</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Quantidade Produzida ({selectedRecipe.product.unit || "UN"})</label>
                <input 
                  type="number"
                  value={prodQty}
                  onChange={(e) => setProdQty(e.target.value)}
                  className="w-full text-center text-3xl font-black bg-[#0c0f1a] border-2 border-indigo-500/50 focus:border-indigo-400 text-white rounded-2xl py-4 outline-none font-mono tracking-tight"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>

              {/* Insumos required simulation card */}
              <div className="bg-[#0c0f1a]/60 border border-indigo-500/10 p-4 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Insumos que serão baixados:</span>
                <div className="space-y-1.5">
                  {selectedRecipe.items.map((item: any) => {
                    const simulatedUsage = (item.quantity / selectedRecipe.yield) * (parseFloat(prodQty) || 0);
                    return (
                      <div key={item.id} className="flex justify-between text-xs text-slate-400">
                        <span>• {item.product.name}</span>
                        <span className="font-mono font-bold text-red-400">-{simulatedUsage.toFixed(4)} {item.unit}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsProdModalOpen(false)}
                  className="flex-1 bg-[#161b33] hover:bg-[#161b33] text-slate-300 font-bold py-3.5 rounded-xl border border-indigo-500/15 text-sm transition-colors"
                >
                  Voltar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm"
                >
                  Registrar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
