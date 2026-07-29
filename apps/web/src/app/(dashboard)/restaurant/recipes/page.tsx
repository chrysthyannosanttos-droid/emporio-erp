"use client";

import { useState } from "react";
import {
  ChefHat, Package, Plus, Trash2, Edit3, Save, X, Search, Utensils,
  Layers, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, Scale
} from "lucide-react";

interface RecipeIngredient {
  rawMaterialId: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

interface DishRecipe {
  id: string;
  dishName: string;
  category: string;
  salePrice: number;
  sector: string;
  ingredients: RecipeIngredient[];
}

const MOCK_STOCK_MATERIALS = [
  { id: "rm1", name: "Carne Moída Blend 80/20", unit: "KG", cost: 32.00, stockQty: 45.0 },
  { id: "rm2", name: "Pão Brioche Gourmet", unit: "UN", cost: 1.80, stockQty: 120 },
  { id: "rm3", name: "Queijo Cheddar Fatiado", unit: "KG", cost: 48.00, stockQty: 12.5 },
  { id: "rm4", name: "Bacon Fatiado Defumado", unit: "KG", cost: 38.00, stockQty: 15.0 },
  { id: "rm5", name: "Massa de Pizza Artesanal", unit: "UN", cost: 4.50, stockQty: 80 },
  { id: "rm6", name: "Queijo Mussarela Ralado", unit: "KG", cost: 42.00, stockQty: 25.0 },
  { id: "rm7", name: "Calabresa Fatiada", unit: "KG", cost: 34.00, stockQty: 18.0 }
];

const INITIAL_RECIPES: DishRecipe[] = [
  {
    id: "rec-1",
    dishName: "Hambúrguer Smash Bacon Double",
    category: "BURGER",
    salePrice: 36.90,
    sector: "Chapa & Lanches",
    ingredients: [
      { rawMaterialId: "rm1", name: "Carne Moída Blend 80/20", quantity: 0.200, unit: "KG", unitCost: 32.00 },
      { rawMaterialId: "rm2", name: "Pão Brioche Gourmet", quantity: 1, unit: "UN", unitCost: 1.80 },
      { rawMaterialId: "rm3", name: "Queijo Cheddar Fatiado", quantity: 0.040, unit: "KG", unitCost: 48.00 },
      { rawMaterialId: "rm4", name: "Bacon Fatiado Defumado", quantity: 0.030, unit: "KG", unitCost: 38.00 }
    ]
  },
  {
    id: "rec-2",
    dishName: "Pizza Calabresa Especial",
    category: "PIZZA",
    salePrice: 58.00,
    sector: "Pizzaria",
    ingredients: [
      { rawMaterialId: "rm5", name: "Massa de Pizza Artesanal", quantity: 1, unit: "UN", unitCost: 4.50 },
      { rawMaterialId: "rm6", name: "Queijo Mussarela Ralado", quantity: 0.250, unit: "KG", unitCost: 42.00 },
      { rawMaterialId: "rm7", name: "Calabresa Fatiada", quantity: 0.200, unit: "KG", unitCost: 34.00 }
    ]
  }
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RestaurantRecipesPage() {
  const [recipes, setRecipes] = useState<DishRecipe[]>(INITIAL_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<DishRecipe | null>(INITIAL_RECIPES[0]);
  const [search, setSearch] = useState("");

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<DishRecipe | null>(null);

  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipe) return;

    setRecipes(prev => {
      const exists = prev.some(r => r.id === editingRecipe.id);
      if (exists) {
        return prev.map(r => r.id === editingRecipe.id ? editingRecipe : r);
      }
      return [editingRecipe, ...prev];
    });

    setSelectedRecipe(editingRecipe);
    setIsModalOpen(false);
  };

  const calcRecipeCost = (recipe: DishRecipe) => {
    return recipe.ingredients.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0);
  };

  return (
    <div className="h-full flex flex-col bg-[#070914] text-white p-6 space-y-4 overflow-hidden animate-in fade-in duration-200">
      
      {/* ── Header Ficha Técnica ────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-[#0f1324] p-4 rounded-3xl border border-indigo-500/15 shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <ChefHat size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Ficha Técnica & Baixa de Insumos</h1>
            <p className="text-xs text-slate-400">Associe ingredientes do estoque aos pratos para baixa automática ao vender no PDV.</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingRecipe({
              id: `rec-${Date.now()}`,
              dishName: "",
              category: "BURGER",
              salePrice: 0,
              sector: "Cozinha Principal",
              ingredients: []
            });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
        >
          <Plus size={16} /> Nova Ficha Técnica
        </button>
      </div>

      {/* ── Conteúdo Principal ─────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 min-h-0 gap-5 overflow-hidden">
        
        {/* Coluna Esquerda: Lista de Fichas Técnicas (5 Colunas) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0 bg-[#0f1324] p-4 rounded-3xl border border-indigo-500/15 space-y-3 shadow-xl">
          <div className="relative shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar prato por nome..."
              className="w-full bg-[#070914] border border-indigo-500/20 text-white pl-9 pr-3.5 py-2 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {recipes.filter(r => r.dishName.toLowerCase().includes(search.toLowerCase())).map(r => {
              const totalCost = calcRecipeCost(r);
              const margin = r.salePrice > 0 ? ((r.salePrice - totalCost) / r.salePrice) * 100 : 0;
              const isSelected = selectedRecipe?.id === r.id;

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRecipe(r)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500/50 shadow-md"
                      : "bg-[#070914] border-indigo-500/10 hover:border-indigo-500/30"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-black text-white">{r.dishName}</span>
                    <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                      CMV: {r.salePrice > 0 ? ((totalCost / r.salePrice) * 100).toFixed(1) : 0}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-2 border-t border-indigo-500/10">
                    <span className="text-slate-400 font-mono">Custo Insumos: <strong className="text-amber-400">R$ {fmt(totalCost)}</strong></span>
                    <span className="text-emerald-400 font-mono font-bold">Venda: R$ {fmt(r.salePrice)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita: Detalhes dos Insumos da Ficha Técnica (7 Colunas) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col min-h-0 bg-[#0f1324] p-5 rounded-3xl border border-indigo-500/15 space-y-4 shadow-xl">
          {selectedRecipe ? (
            <>
              <div className="flex justify-between items-center border-b border-indigo-500/10 pb-4 shrink-0">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Utensils className="text-indigo-400" size={18} /> {selectedRecipe.dishName}
                  </h2>
                  <p className="text-xs text-slate-400">Setor: {selectedRecipe.sector} · Categoria: {selectedRecipe.category}</p>
                </div>

                <button
                  onClick={() => {
                    setEditingRecipe(selectedRecipe);
                    setIsModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-[#070914] hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Edit3 size={14} /> Editar Ficha
                </button>
              </div>

              {/* Lista de Matérias-Primas do Prato */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Package size={14} className="text-indigo-400" /> Insumos & Matérias-Primas do Estoque
                </h3>

                <div className="bg-[#070914] rounded-2xl border border-indigo-500/10 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#0a0e1a] text-slate-400 border-b border-indigo-500/10">
                      <tr>
                        <th className="px-4 py-3 font-bold uppercase">Matéria-Prima</th>
                        <th className="px-4 py-3 text-center uppercase">Qtd Utilizada</th>
                        <th className="px-4 py-3 text-right uppercase">Custo Unit.</th>
                        <th className="px-4 py-3 text-right uppercase">Custo Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/5 font-mono">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <tr key={i} className="hover:bg-indigo-500/5">
                          <td className="px-4 py-3 font-bold text-white font-sans">{ing.name}</td>
                          <td className="px-4 py-3 text-center text-indigo-300 font-bold">{ing.quantity} {ing.unit}</td>
                          <td className="px-4 py-3 text-right text-slate-400">R$ {fmt(ing.unitCost)}</td>
                          <td className="px-4 py-3 text-right text-amber-400 font-bold">R$ {fmt(ing.quantity * ing.unitCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Resumo de Custo & Margem */}
              <div className="bg-[#070914] p-4 rounded-2xl border border-indigo-500/10 flex justify-between items-center shrink-0">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Baixa de Estoque</span>
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck size={14} /> Débito Automático Habilitado no PDV
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Custo Total do Prato</span>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    R$ {fmt(calcRecipeCost(selectedRecipe))}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Selecione uma ficha técnica à esquerda.
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: EDITAR / CRIAR FICHA TÉCNICA ────────────────────────────── */}
      {isModalOpen && editingRecipe && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-indigo-500/10 flex justify-between items-center bg-[#0c0f1a]/50">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <ChefHat className="text-indigo-400" size={18} /> Ficha Técnica — {editingRecipe.dishName || "Novo Prato"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-500 hover:text-white"><X size={18}/></button>
            </div>

            <form onSubmit={handleSaveRecipe} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome do Prato *</label>
                  <input
                    required
                    type="text"
                    value={editingRecipe.dishName}
                    onChange={e => setEditingRecipe({ ...editingRecipe, dishName: e.target.value })}
                    placeholder="Ex: Hambúrguer Artisan"
                    className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Preço Venda (R$) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={editingRecipe.salePrice || ""}
                    onChange={e => setEditingRecipe({ ...editingRecipe, salePrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3 py-2 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              </div>

              {/* Adicionar Insumos do Estoque */}
              <div className="space-y-2 pt-2 border-t border-indigo-500/10">
                <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  Ingredientes & Quantidades
                </label>
                
                <div className="space-y-2">
                  {editingRecipe.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#070914] p-2.5 rounded-xl border border-indigo-500/10 text-xs">
                      <span className="flex-1 font-bold text-white">{ing.name}</span>
                      <input
                        type="number"
                        step="0.001"
                        value={ing.quantity}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          const updated = [...editingRecipe.ingredients];
                          updated[idx].quantity = val;
                          setEditingRecipe({ ...editingRecipe, ingredients: updated });
                        }}
                        className="w-20 bg-[#111528] border border-indigo-500/20 text-indigo-300 text-center font-mono font-bold py-1 rounded-lg outline-none"
                      />
                      <span className="text-slate-400 w-8 font-mono text-[10px]">{ing.unit}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRecipe({
                            ...editingRecipe,
                            ingredients: editingRecipe.ingredients.filter((_, i) => i !== idx)
                          });
                        }}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Seleção de Insumo do Estoque para Adicionar */}
                <div className="pt-2">
                  <select
                    onChange={e => {
                      const selectedMat = MOCK_STOCK_MATERIALS.find(m => m.id === e.target.value);
                      if (selectedMat && !editingRecipe.ingredients.some(i => i.rawMaterialId === selectedMat.id)) {
                        setEditingRecipe({
                          ...editingRecipe,
                          ingredients: [
                            ...editingRecipe.ingredients,
                            {
                              rawMaterialId: selectedMat.id,
                              name: selectedMat.name,
                              quantity: 1,
                              unit: selectedMat.unit,
                              unitCost: selectedMat.cost
                            }
                          ]
                        });
                      }
                    }}
                    className="w-full bg-[#070914] border border-indigo-500/20 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="">+ Adicionar Insumo do Estoque Principal...</option>
                    {MOCK_STOCK_MATERIALS.map(m => (
                      <option key={m.id} value={m.id}>{m.name} (Estoque: {m.stockQty} {m.unit})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-indigo-500/10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-[#070914] text-slate-400 py-2.5 rounded-xl text-xs font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5">
                  <Save size={15} /> Salvar Ficha Técnica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
