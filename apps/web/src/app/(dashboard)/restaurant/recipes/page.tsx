"use client";

import { useState, useEffect } from "react";
import {
  ChefHat, Package, Plus, Trash2, Edit3, Save, X, Search, Utensils,
  Layers, AlertCircle, CheckCircle2, ShieldCheck, Scale, DollarSign,
  TrendingUp, TrendingDown, Percent, RefreshCw, AlertTriangle, ArrowUpDown,
  Sparkles, Calculator, Lightbulb
} from "lucide-react";

// ─── Interfaces ─────────────────────────────────────────────────────────────

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
  yieldServings?: number;
  prepTimeMinutes?: number;
  instructions?: string;
  ingredients: RecipeIngredient[];
}

interface StockMaterial {
  id: string;
  name: string;
  unit: "KG" | "G" | "UN" | "L" | "ML";
  cost: number;
  stockQty: number;
  minStock: number;
}

// ─── Dados Iniciais Padrão ───────────────────────────────────────────────────

const INITIAL_MATERIALS: StockMaterial[] = [
  { id: "rm-1", name: "Carne Blend Bovina 80/20", unit: "KG", cost: 32.00, stockQty: 45.0, minStock: 10.0 },
  { id: "rm-2", name: "Pão Brioche Gourmet", unit: "UN", cost: 1.80, stockQty: 120, minStock: 30 },
  { id: "rm-3", name: "Queijo Cheddar Inglês", unit: "KG", cost: 48.00, stockQty: 12.5, minStock: 5.0 },
  { id: "rm-4", name: "Bacon Defumado Fatiado", unit: "KG", cost: 38.00, stockQty: 15.0, minStock: 4.0 },
  { id: "rm-5", name: "Massa de Pizza Artesanal", unit: "UN", cost: 4.50, stockQty: 80, minStock: 20 },
  { id: "rm-6", name: "Queijo Mussarela Ralada", unit: "KG", cost: 42.00, stockQty: 25.0, minStock: 8.0 },
  { id: "rm-7", name: "Calabresa Fatiada Curada", unit: "KG", cost: 34.00, stockQty: 18.0, minStock: 6.0 },
  { id: "rm-8", name: "Molho de Tomate Rústico", unit: "L", cost: 14.50, stockQty: 30.0, minStock: 10.0 },
  { id: "rm-9", name: "Maionese Artesanal da Casa", unit: "KG", cost: 16.00, stockQty: 8.0, minStock: 3.0 },
  { id: "rm-10", name: "Cebola Caramelizada", unit: "KG", cost: 22.00, stockQty: 6.5, minStock: 2.0 },
];

const INITIAL_RECIPES: DishRecipe[] = [
  {
    id: "rec-1",
    dishName: "Hambúrguer Smash Bacon Duplo",
    category: "Lanches",
    salePrice: 38.90,
    sector: "Chapa & Hamburgueria",
    yieldServings: 1,
    prepTimeMinutes: 12,
    instructions: "Modelar 2 bolas de 100g, smash na chapa bem quente a 220°C por 2 minutos de cada lado. Derreter cheddar, tostar o pão na manteiga e finalizar com bacon crocante.",
    ingredients: [
      { rawMaterialId: "rm-1", name: "Carne Blend Bovina 80/20", quantity: 0.200, unit: "KG", unitCost: 32.00 },
      { rawMaterialId: "rm-2", name: "Pão Brioche Gourmet", quantity: 1, unit: "UN", unitCost: 1.80 },
      { rawMaterialId: "rm-3", name: "Queijo Cheddar Inglês", quantity: 0.040, unit: "KG", unitCost: 48.00 },
      { rawMaterialId: "rm-4", name: "Bacon Defumado Fatiado", quantity: 0.030, unit: "KG", unitCost: 38.00 },
      { rawMaterialId: "rm-9", name: "Maionese Artesanal da Casa", quantity: 0.025, unit: "KG", unitCost: 16.00 },
    ]
  },
  {
    id: "rec-2",
    dishName: "Pizza Calabresa Especial (8 Fatias)",
    category: "Pizzas",
    salePrice: 62.00,
    sector: "Forno & Pizzaria",
    yieldServings: 8,
    prepTimeMinutes: 18,
    instructions: "Abrir a massa manualmente com 35cm, espalhar 80ml de molho rústico, cobrir com mussarela ralada e fatias de calabresa. Assar a 320°C no forno de esteira ou pedra.",
    ingredients: [
      { rawMaterialId: "rm-5", name: "Massa de Pizza Artesanal", quantity: 1, unit: "UN", unitCost: 4.50 },
      { rawMaterialId: "rm-8", name: "Molho de Tomate Rústico", quantity: 0.080, unit: "L", unitCost: 14.50 },
      { rawMaterialId: "rm-6", name: "Queijo Mussarela Ralada", quantity: 0.250, unit: "KG", unitCost: 42.00 },
      { rawMaterialId: "rm-7", name: "Calabresa Fatiada Curada", quantity: 0.200, unit: "KG", unitCost: 34.00 }
    ]
  }
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RestaurantRecipesPage() {
  const [activeTab, setActiveTab] = useState<"recipes" | "materials">("recipes");

  // Estado das Fichas Técnicas e Insumos com persistência local
  const [recipes, setRecipes] = useState<DishRecipe[]>(INITIAL_RECIPES);
  const [materials, setMaterials] = useState<StockMaterial[]>(INITIAL_MATERIALS);
  const [selectedRecipe, setSelectedRecipe] = useState<DishRecipe | null>(null);

  // Filtros
  const [searchRecipe, setSearchRecipe] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("TODOS");
  const [searchMaterial, setSearchMaterial] = useState("");

  // Modais
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<DishRecipe | null>(null);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<StockMaterial | null>(null);

  // Insumo rápido sendo adicionado no modal da Ficha Técnica
  const [selectedMatIdToAdd, setSelectedMatIdToAdd] = useState("");
  const [selectedQtyToAdd, setSelectedQtyToAdd] = useState(1);

  // Carregar do localStorage
  useEffect(() => {
    try {
      const savedRecipes = localStorage.getItem("erp_restaurant_recipes_v2");
      if (savedRecipes) {
        const parsed = JSON.parse(savedRecipes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecipes(parsed);
          setSelectedRecipe(parsed[0]);
        } else {
          setSelectedRecipe(INITIAL_RECIPES[0]);
        }
      } else {
        setSelectedRecipe(INITIAL_RECIPES[0]);
      }

      const savedMaterials = localStorage.getItem("erp_restaurant_materials_v2");
      if (savedMaterials) {
        const parsedM = JSON.parse(savedMaterials);
        if (Array.isArray(parsedM) && parsedM.length > 0) {
          setMaterials(parsedM);
        }
      }
    } catch {
      setSelectedRecipe(INITIAL_RECIPES[0]);
    }
  }, []);

  // Salvar no localStorage quando alterar
  const saveRecipesState = (newRecipes: DishRecipe[]) => {
    setRecipes(newRecipes);
    try {
      localStorage.setItem("erp_restaurant_recipes_v2", JSON.stringify(newRecipes));
    } catch {}
  };

  const saveMaterialsState = (newMats: StockMaterial[]) => {
    setMaterials(newMats);
    try {
      localStorage.setItem("erp_restaurant_materials_v2", JSON.stringify(newMats));
    } catch {}
  };

  // Cálculos de custos
  const calcRecipeCost = (recipe: DishRecipe) => {
    return recipe.ingredients.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0);
  };

  // Categorias disponíveis
  const categories = ["TODOS", ...Array.from(new Set(recipes.map(r => r.category)))];

  // ─── AÇÕES DE FICHA TÉCNICA ────────────────────────────────────────────────

  const handleOpenCreateRecipe = () => {
    setEditingRecipe({
      id: `rec-${Date.now()}`,
      dishName: "",
      category: "Lanches",
      salePrice: 0,
      sector: "Cozinha Principal",
      yieldServings: 1,
      prepTimeMinutes: 10,
      instructions: "",
      ingredients: []
    });
    setSelectedMatIdToAdd("");
    setSelectedQtyToAdd(1);
    setIsRecipeModalOpen(true);
  };

  const handleOpenEditRecipe = (recipe: DishRecipe) => {
    setEditingRecipe(JSON.parse(JSON.stringify(recipe)));
    setSelectedMatIdToAdd("");
    setSelectedQtyToAdd(1);
    setIsRecipeModalOpen(true);
  };

  const handleDeleteRecipe = (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover a ficha técnica do prato "${name}"?`)) return;

    const updated = recipes.filter(r => r.id !== id);
    saveRecipesState(updated);
    if (selectedRecipe?.id === id) {
      setSelectedRecipe(updated[0] || null);
    }
  };

  const handleSaveRecipeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipe || !editingRecipe.dishName.trim()) {
      alert("Informe o nome do prato!");
      return;
    }

    const exists = recipes.some(r => r.id === editingRecipe.id);
    let updated: DishRecipe[];
    if (exists) {
      updated = recipes.map(r => r.id === editingRecipe.id ? editingRecipe : r);
    } else {
      updated = [editingRecipe, ...recipes];
    }

    saveRecipesState(updated);
    setSelectedRecipe(editingRecipe);
    setIsRecipeModalOpen(false);
  };

  // Adicionar ingrediente na receita em edição
  const handleAddIngredientToEditing = () => {
    if (!editingRecipe || !selectedMatIdToAdd) return;

    const mat = materials.find(m => m.id === selectedMatIdToAdd);
    if (!mat) return;

    const existsIndex = editingRecipe.ingredients.findIndex(i => i.rawMaterialId === mat.id);
    if (existsIndex >= 0) {
      const updatedIngs = [...editingRecipe.ingredients];
      updatedIngs[existsIndex].quantity += Number(selectedQtyToAdd);
      setEditingRecipe({ ...editingRecipe, ingredients: updatedIngs });
    } else {
      const newIng: RecipeIngredient = {
        rawMaterialId: mat.id,
        name: mat.name,
        quantity: Number(selectedQtyToAdd) || 1,
        unit: mat.unit,
        unitCost: mat.cost,
      };
      setEditingRecipe({ ...editingRecipe, ingredients: [...editingRecipe.ingredients, newIng] });
    }

    setSelectedMatIdToAdd("");
    setSelectedQtyToAdd(1);
  };

  // Remover ingrediente da receita em edição
  const handleRemoveIngredientFromEditing = (index: number) => {
    if (!editingRecipe) return;
    const updated = editingRecipe.ingredients.filter((_, i) => i !== index);
    setEditingRecipe({ ...editingRecipe, ingredients: updated });
  };

  // ─── AÇÕES DE INSUMOS ──────────────────────────────────────────────────────

  const handleOpenCreateMaterial = () => {
    setEditingMaterial({
      id: `rm-${Date.now()}`,
      name: "",
      unit: "KG",
      cost: 0,
      stockQty: 0,
      minStock: 0,
    });
    setIsMaterialModalOpen(true);
  };

  const handleOpenEditMaterial = (mat: StockMaterial) => {
    setEditingMaterial({ ...mat });
    setIsMaterialModalOpen(true);
  };

  const handleDeleteMaterial = (id: string, name: string) => {
    const isUsedIn = recipes.filter(r => r.ingredients.some(i => i.rawMaterialId === id));
    if (isUsedIn.length > 0) {
      alert(`Não é possível remover "${name}" porque ele está sendo usado em ${isUsedIn.length} ficha(s) técnica(s): ${isUsedIn.map(r => r.dishName).join(", ")}.`);
      return;
    }

    if (!confirm(`Remover o insumo "${name}" do cadastro?`)) return;

    const updated = materials.filter(m => m.id !== id);
    saveMaterialsState(updated);
  };

  const handleSaveMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial || !editingMaterial.name.trim()) {
      alert("Informe o nome do insumo!");
      return;
    }

    const exists = materials.some(m => m.id === editingMaterial.id);
    let updated: StockMaterial[];
    if (exists) {
      updated = materials.map(m => m.id === editingMaterial.id ? editingMaterial : m);
      
      // Atualizar o custo nas fichas técnicas que usam esse insumo
      const updatedRecipes = recipes.map(r => ({
        ...r,
        ingredients: r.ingredients.map(ing => {
          if (ing.rawMaterialId === editingMaterial.id) {
            return {
              ...ing,
              name: editingMaterial.name,
              unit: editingMaterial.unit,
              unitCost: editingMaterial.cost,
            };
          }
          return ing;
        })
      }));
      saveRecipesState(updatedRecipes);
      if (selectedRecipe) {
        const refreshed = updatedRecipes.find(r => r.id === selectedRecipe.id);
        if (refreshed) setSelectedRecipe(refreshed);
      }
    } else {
      updated = [editingMaterial, ...materials];
    }

    saveMaterialsState(updated);
    setIsMaterialModalOpen(false);
  };

  // Métricas de topo
  const totalRecipesCount = recipes.length;
  const totalMaterialsCount = materials.length;
  const lowStockMaterials = materials.filter(m => m.stockQty <= m.minStock);
  const avgCmv = recipes.length > 0
    ? (recipes.reduce((sum, r) => {
        const c = calcRecipeCost(r);
        return sum + (r.salePrice > 0 ? (c / r.salePrice) * 100 : 0);
      }, 0) / recipes.length).toFixed(1)
    : "0";

  return (
    <div className="flex flex-col space-y-5 text-white animate-in fade-in duration-200">
      
      {/* ── 1. Top Header com Controles Principais ──────────────────────────── */}
      <div className="bg-[#0f1426] border border-indigo-500/15 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <ChefHat size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight">Fichas Técnicas & Insumos</h1>
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                Gestão Integrada
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cadastre pratos, composições, insumos do estoque e custos em um único painel com baixa automática no PDV.
            </p>
          </div>
        </div>

        {/* Botões de Adicionar Principais */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleOpenCreateMaterial}
            className="flex-1 md:flex-none bg-[#161c36] hover:bg-[#1d2548] text-slate-200 hover:text-white border border-indigo-500/20 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Plus size={16} className="text-indigo-400" />
            <span>+ Adicionar Insumo</span>
          </button>
          
          <button
            onClick={handleOpenCreateRecipe}
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>+ Nova Ficha Técnica</span>
          </button>
        </div>
      </div>

      {/* ── 2. Cards de Resumo & Indicadores ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Fichas de Pratos</span>
          <div className="text-xl font-black font-mono text-white mt-0.5 flex items-center gap-2">
            <Utensils size={18} className="text-indigo-400" />
            {totalRecipesCount} pratos
          </div>
        </div>

        <div className="bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Insumos Cadastrados</span>
          <div className="text-xl font-black font-mono text-white mt-0.5 flex items-center gap-2">
            <Package size={18} className="text-purple-400" />
            {totalMaterialsCount} itens
          </div>
        </div>

        <div className="bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">CMV Médio Cardápio</span>
          <div className="text-xl font-black font-mono text-emerald-400 mt-0.5 flex items-center gap-2">
            <Percent size={18} className="text-emerald-400" />
            {avgCmv}%
          </div>
        </div>

        <div className="bg-[#0f1426] border border-indigo-500/10 rounded-2xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Insumos em Alerta</span>
          <div className={`text-xl font-black font-mono mt-0.5 flex items-center gap-2 ${lowStockMaterials.length > 0 ? "text-amber-400" : "text-slate-400"}`}>
            <AlertTriangle size={18} className={lowStockMaterials.length > 0 ? "text-amber-400" : "text-slate-500"} />
            {lowStockMaterials.length} críticos
          </div>
        </div>
      </div>

      {/* ── 3. Seletor de Abas: Fichas Técnicas vs Banco de Insumos ──────────── */}
      <div className="flex items-center gap-2 border-b border-indigo-500/15 pb-2">
        <button
          onClick={() => setActiveTab("recipes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "recipes"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-indigo-500/10"
          }`}
        >
          <Utensils size={15} />
          <span>Fichas Técnicas & Pratos ({recipes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("materials")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "materials"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-indigo-500/10"
          }`}
        >
          <Package size={15} />
          <span>Banco de Insumos & Ingredientes ({materials.length})</span>
        </button>
      </div>

      {/* ── 4. CONTEÚDO DA ABA: FICHAS TÉCNICAS (PRATOS) ────────────────────── */}
      {activeTab === "recipes" && (
        <div className="grid grid-cols-12 gap-5 min-h-[550px]">
          {/* Coluna Esquerda: Lista de Fichas (5 Colunas) */}
          <div className="col-span-12 lg:col-span-5 bg-[#0f1426] border border-indigo-500/15 rounded-3xl p-4 flex flex-col space-y-3 shadow-xl">
            {/* Barra de Busca e Filtro de Categoria */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="text"
                  value={searchRecipe}
                  onChange={e => setSearchRecipe(e.target.value)}
                  placeholder="Buscar prato por nome..."
                  className="w-full bg-[#080b18] border border-indigo-500/20 text-white pl-9 pr-3.5 py-2 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              {/* Pílulas de Categoria */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all shrink-0 ${
                      categoryFilter === cat
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-[#080b18] text-slate-400 hover:text-white border border-indigo-500/10"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista dos Pratos */}
            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1 max-h-[500px]">
              {recipes
                .filter(r => categoryFilter === "TODOS" || r.category === categoryFilter)
                .filter(r => r.dishName.toLowerCase().includes(searchRecipe.toLowerCase()))
                .map(r => {
                  const cost = calcRecipeCost(r);
                  const cmv = r.salePrice > 0 ? (cost / r.salePrice) * 100 : 0;
                  const isSelected = selectedRecipe?.id === r.id;

                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRecipe(r)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500/50 shadow-md"
                          : "bg-[#080b18] border-indigo-500/10 hover:border-indigo-500/30 hover:bg-[#121730]"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <div>
                          <span className="text-xs font-black text-white block leading-tight">{r.dishName}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{r.sector} · {r.ingredients.length} insumos</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono ${
                          cmv <= 32 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}>
                          CMV {cmv.toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] pt-2 border-t border-indigo-500/10">
                        <span className="text-slate-400 font-mono">Custo: <strong className="text-amber-400">R$ {fmt(cost)}</strong></span>
                        <span className="text-emerald-400 font-mono font-bold">Venda: R$ {fmt(r.salePrice)}</span>
                      </div>

                      {/* Botões rápidos ao passar o mouse */}
                      <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-[#0f1426] p-1 rounded-lg border border-indigo-500/20 shadow-md">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenEditRecipe(r); }}
                          title="Editar Ficha Técnica"
                          className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/15 rounded"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(r.id, r.dishName); }}
                          title="Remover Ficha Técnica"
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Coluna Direita: Detalhes da Ficha Técnica Selecionada (7 Colunas) */}
          <div className="col-span-12 lg:col-span-7 bg-[#0f1426] border border-indigo-500/15 rounded-3xl p-5 flex flex-col space-y-4 shadow-xl">
            {selectedRecipe ? (
              <>
                {/* Header do Prato Selecionado */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-indigo-500/15 pb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">{selectedRecipe.dishName}</h2>
                      <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                        {selectedRecipe.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Setor: <strong className="text-slate-300">{selectedRecipe.sector}</strong> · Rendimento: {selectedRecipe.yieldServings || 1} un · Tempo: {selectedRecipe.prepTimeMinutes || 10} min
                    </p>
                  </div>

                  {/* Ações: Editar e Remover Ficha */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditRecipe(selectedRecipe)}
                      className="px-3.5 py-2 bg-[#161c36] hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/25 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Edit3 size={14} /> Editar Ficha
                    </button>
                    <button
                      onClick={() => handleDeleteRecipe(selectedRecipe.id, selectedRecipe.dishName)}
                      className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Excluir esta ficha técnica"
                    >
                      <Trash2 size={14} /> Remover Ficha
                    </button>
                  </div>
                </div>

                {/* Tabela de Insumos da Ficha */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={14} className="text-indigo-400" /> Insumos & Matérias-Primas Utilizadas ({selectedRecipe.ingredients.length})
                    </h3>
                    <button
                      onClick={() => handleOpenEditRecipe(selectedRecipe)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      <Plus size={13} /> Adicionar / Remover Ingredientes
                    </button>
                  </div>

                  <div className="bg-[#080b18] rounded-2xl border border-indigo-500/10 overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#0d1226] text-slate-400 border-b border-indigo-500/10">
                        <tr>
                          <th className="px-4 py-3 font-bold uppercase text-[10px]">Insumo</th>
                          <th className="px-4 py-3 text-center uppercase text-[10px]">Qtd. Baixa</th>
                          <th className="px-4 py-3 text-right uppercase text-[10px]">Custo Unit.</th>
                          <th className="px-4 py-3 text-right uppercase text-[10px]">Custo no Prato</th>
                          <th className="px-4 py-3 text-right uppercase text-[10px]">% do Custo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-500/5 font-mono">
                        {selectedRecipe.ingredients.map((ing, i) => {
                          const totalDishCost = calcRecipeCost(selectedRecipe);
                          const ingTotal = ing.quantity * ing.unitCost;
                          const perc = totalDishCost > 0 ? (ingTotal / totalDishCost) * 100 : 0;

                          return (
                            <tr key={i} className="hover:bg-indigo-500/5 transition-colors">
                              <td className="px-4 py-3 font-bold text-white font-sans">{ing.name}</td>
                              <td className="px-4 py-3 text-center text-indigo-300 font-bold">{ing.quantity} {ing.unit}</td>
                              <td className="px-4 py-3 text-right text-slate-400">R$ {fmt(ing.unitCost)}</td>
                              <td className="px-4 py-3 text-right text-amber-400 font-bold">R$ {fmt(ingTotal)}</td>
                              <td className="px-4 py-3 text-right text-slate-400">{perc.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Instruções de Preparo (se houver) */}
                  {selectedRecipe.instructions && (
                    <div className="bg-[#080b18] p-3.5 rounded-2xl border border-indigo-500/10 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Modo de Preparo / Instruções da Cozinha:</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedRecipe.instructions}</p>
                    </div>
                  )}
                </div>

                {/* Footer Resumo de Custo & Margem */}
                <div className="bg-[#080b18] p-4 rounded-2xl border border-indigo-500/15 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Custo dos Insumos</span>
                    <span className="text-base font-black text-amber-400 font-mono">
                      R$ {fmt(calcRecipeCost(selectedRecipe))}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Preço de Venda</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      R$ {fmt(selectedRecipe.salePrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Lucro Bruto</span>
                    <span className="text-base font-black text-white font-mono">
                      R$ {fmt(selectedRecipe.salePrice - calcRecipeCost(selectedRecipe))}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">CMV Atual</span>
                    <span className="text-base font-black font-mono text-indigo-300">
                      {selectedRecipe.salePrice > 0 ? ((calcRecipeCost(selectedRecipe) / selectedRecipe.salePrice) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                <Utensils size={32} className="text-slate-600" />
                <p>Nenhuma ficha técnica selecionada.</p>
                <button
                  onClick={handleOpenCreateRecipe}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs"
                >
                  + Criar Nova Ficha Técnica
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. CONTEÚDO DA ABA: BANCO DE INSUMOS & MATÉRIAS-PRIMAS ─────────── */}
      {activeTab === "materials" && (
        <div className="bg-[#0f1426] border border-indigo-500/15 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-indigo-500/15 pb-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Package className="text-indigo-400" size={18} /> Insumos & Ingredientes Cadastrados
              </h2>
              <p className="text-xs text-slate-400">
                Estes insumos alimentam as receitas dos pratos e têm estoque abatido automaticamente nas vendas.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="text"
                  value={searchMaterial}
                  onChange={e => setSearchMaterial(e.target.value)}
                  placeholder="Buscar insumo..."
                  className="w-full bg-[#080b18] border border-indigo-500/20 text-white pl-9 pr-3.5 py-2 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <button
                onClick={handleOpenCreateMaterial}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 shrink-0"
              >
                <Plus size={15} /> + Adicionar Insumo
              </button>
            </div>
          </div>

          {/* Tabela de Insumos com Botões de Editar e Remover */}
          <div className="bg-[#080b18] rounded-2xl border border-indigo-500/10 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0d1226] text-slate-400 border-b border-indigo-500/10">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase text-[10px]">Nome do Insumo</th>
                  <th className="px-4 py-3 text-center uppercase text-[10px]">Unidade</th>
                  <th className="px-4 py-3 text-right uppercase text-[10px]">Custo de Compra</th>
                  <th className="px-4 py-3 text-center uppercase text-[10px]">Estoque Atual</th>
                  <th className="px-4 py-3 text-center uppercase text-[10px]">Estoque Mínimo</th>
                  <th className="px-4 py-3 text-center uppercase text-[10px]">Status Estoque</th>
                  <th className="px-4 py-3 text-right uppercase text-[10px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/5 font-mono">
                {materials
                  .filter(m => m.name.toLowerCase().includes(searchMaterial.toLowerCase()))
                  .map(mat => {
                    const isLow = mat.stockQty <= mat.minStock;
                    const usedInRecipes = recipes.filter(r => r.ingredients.some(i => i.rawMaterialId === mat.id));

                    return (
                      <tr key={mat.id} className="hover:bg-indigo-500/5 transition-colors">
                        <td className="px-4 py-3 font-sans">
                          <span className="font-bold text-white block">{mat.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">Presente em {usedInRecipes.length} prato(s)</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-300">{mat.unit}</td>
                        <td className="px-4 py-3 text-right text-amber-400 font-bold">R$ {fmt(mat.cost)}</td>
                        <td className="px-4 py-3 text-center text-white font-bold">{mat.stockQty} {mat.unit}</td>
                        <td className="px-4 py-3 text-center text-slate-400">{mat.minStock} {mat.unit}</td>
                        <td className="px-4 py-3 text-center font-sans">
                          {isLow ? (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <AlertTriangle size={11} /> Repor Estoque
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 size={11} /> Normal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditMaterial(mat)}
                              className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/15 rounded-lg border border-indigo-500/10 transition-colors"
                              title="Editar Insumo"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg border border-indigo-500/10 transition-colors"
                              title="Remover Insumo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. MODAL: CRIAR / EDITAR FICHA TÉCNICA COM BOTÃO ADICIONAR E REMOVER ── */}
      {isRecipeModalOpen && editingRecipe && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/25 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-indigo-500/15 flex justify-between items-center bg-[#0d1222]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  <ChefHat size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingRecipe.dishName ? `Ficha Técnica: ${editingRecipe.dishName}` : "Nova Ficha Técnica"}
                  </h3>
                  <p className="text-[11px] text-slate-400">Adicione e remova ingredientes e calcule o custo exato do prato.</p>
                </div>
              </div>
              <button onClick={() => setIsRecipeModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-indigo-500/10">
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRecipeSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Informações Básicas do Prato */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome do Prato *</label>
                  <input
                    required
                    type="text"
                    value={editingRecipe.dishName}
                    onChange={e => setEditingRecipe({ ...editingRecipe, dishName: e.target.value })}
                    placeholder="Ex: Hambúrguer Artesanal Smash"
                    className="w-full bg-[#080b18] border border-indigo-500/20 text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
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
                    className="w-full bg-[#080b18] border border-indigo-500/20 text-emerald-400 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Categoria</label>
                  <input
                    type="text"
                    value={editingRecipe.category}
                    onChange={e => setEditingRecipe({ ...editingRecipe, category: e.target.value })}
                    placeholder="Ex: Lanches, Pizzas..."
                    className="w-full bg-[#080b18] border border-indigo-500/20 text-white px-3.5 py-2 rounded-xl text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Setor da Cozinha</label>
                  <input
                    type="text"
                    value={editingRecipe.sector}
                    onChange={e => setEditingRecipe({ ...editingRecipe, sector: e.target.value })}
                    placeholder="Ex: Chapa, Pizzaria..."
                    className="w-full bg-[#080b18] border border-indigo-500/20 text-white px-3.5 py-2 rounded-xl text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rendimento (Porções)</label>
                  <input
                    type="number"
                    value={editingRecipe.yieldServings || 1}
                    onChange={e => setEditingRecipe({ ...editingRecipe, yieldServings: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#080b18] border border-indigo-500/20 text-white px-3.5 py-2 rounded-xl text-xs font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Seção de Ingredientes com Adicionar e Remover */}
              <div className="space-y-3 pt-3 border-t border-indigo-500/15">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={14} /> Ingredientes da Receita ({editingRecipe.ingredients.length})
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Custo Total: <strong className="text-amber-400">R$ {fmt(calcRecipeCost(editingRecipe))}</strong>
                  </span>
                </div>

                {/* Bloco para Adicionar Novo Ingrediente */}
                <div className="bg-[#080b18] p-3 rounded-2xl border border-indigo-500/20 flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={selectedMatIdToAdd}
                    onChange={e => setSelectedMatIdToAdd(e.target.value)}
                    className="flex-1 w-full bg-[#11162a] border border-indigo-500/20 text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="">Selecione um Insumo do Estoque...</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} (R$ {fmt(m.cost)} / {m.unit})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={selectedQtyToAdd}
                      onChange={e => setSelectedQtyToAdd(parseFloat(e.target.value) || 0)}
                      placeholder="Qtd"
                      className="w-24 bg-[#11162a] border border-indigo-500/20 text-white px-3 py-2 rounded-xl text-xs font-mono text-center outline-none focus:border-indigo-500 font-bold"
                    />

                    <button
                      type="button"
                      onClick={handleAddIngredientToEditing}
                      disabled={!selectedMatIdToAdd}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 shrink-0"
                    >
                      <Plus size={14} /> Adicionar Ingrediente
                    </button>
                  </div>
                </div>

                {/* Lista de Ingredientes Adicionados */}
                {editingRecipe.ingredients.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-indigo-500/15 rounded-2xl text-slate-500 text-xs">
                    Nenhum ingrediente adicionado ainda. Escolha um insumo acima e clique em <strong>Adicionar Ingrediente</strong>.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {editingRecipe.ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 bg-[#080b18] p-2.5 rounded-xl border border-indigo-500/10 text-xs"
                      >
                        <span className="font-bold text-white flex-1 truncate">{ing.name}</span>

                        <div className="flex items-center gap-1">
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
                            className="w-20 bg-[#11162a] border border-indigo-500/20 text-indigo-300 text-center font-mono font-bold py-1 rounded-lg outline-none"
                          />
                          <span className="text-slate-400 w-8 font-mono text-[11px]">{ing.unit}</span>
                        </div>

                        <span className="w-24 text-right font-mono text-amber-400 font-bold">
                          R$ {fmt(ing.quantity * ing.unitCost)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientFromEditing(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remover ingrediente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Instruções */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Instruções / Modo de Preparo</label>
                <textarea
                  rows={2}
                  value={editingRecipe.instructions || ""}
                  onChange={e => setEditingRecipe({ ...editingRecipe, instructions: e.target.value })}
                  placeholder="Passo a passo para a equipe da cozinha..."
                  className="w-full bg-[#080b18] border border-indigo-500/20 text-white px-3.5 py-2 rounded-xl text-xs outline-none focus:border-indigo-500"
                />
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="flex gap-2.5 pt-3 border-t border-indigo-500/15">
                <button
                  type="button"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="flex-1 bg-[#080b18] hover:bg-[#121730] text-slate-400 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Save size={15} /> Salvar Ficha Técnica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. MODAL: CRIAR / EDITAR INSUMO ──────────────────────────────────── */}
      {isMaterialModalOpen && editingMaterial && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/25 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-indigo-500/15 flex justify-between items-center bg-[#0d1222]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingMaterial.name ? `Editar Insumo: ${editingMaterial.name}` : "Novo Insumo / Matéria-Prima"}
                  </h3>
                  <p className="text-[11px] text-slate-400">Cadastre o ingrediente para uso nas fichas técnicas.</p>
                </div>
              </div>
              <button onClick={() => setIsMaterialModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-indigo-500/10">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMaterialSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome do Insumo *</label>
                <input
                  required
                  type="text"
                  value={editingMaterial.name}
                  onChange={e => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                  placeholder="Ex: Queijo Mussarela Ralada"
                  className="w-full bg-[#080b18] border border-indigo-500/20 text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unidade de Medida</label>
                  <select
                    value={editingMaterial.unit}
                    onChange={e => setEditingMaterial({ ...editingMaterial, unit: e.target.value as any })}
                    className="w-full bg-[#080b18] border border-indigo-500/20 text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="KG">Quilograma (KG)</option>
                    <option value="G">Grama (G)</option>
                    <option value="UN">Unidade (UN)</option>
                    <option value="L">Litro (L)</option>
                    <option value="ML">Mililitro (ML)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Custo de Compra (R$) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={editingMaterial.cost || ""}
                    onChange={e => setEditingMaterial({ ...editingMaterial, cost: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-[#080b18] border border-indigo-500/20 text-amber-400 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingMaterial.stockQty || ""}
                    onChange={e => setEditingMaterial({ ...editingMaterial, stockQty: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-[#080b18] border border-indigo-500/20 text-white px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingMaterial.minStock || ""}
                    onChange={e => setEditingMaterial({ ...editingMaterial, minStock: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-[#080b18] border border-indigo-500/20 text-white px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-indigo-500/15">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="flex-1 bg-[#080b18] hover:bg-[#121730] text-slate-400 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Save size={15} /> Salvar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
