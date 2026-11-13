"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChefHat,
  Package,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Search,
  Utensils,
  Percent,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  getProductionWorkspace,
  saveRecipe,
  deleteRecipe,
  saveRawMaterialProduct,
  deleteRawMaterialProduct,
} from "@/actions/production";

interface RecipeItemRow {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  itemRole: "INGREDIENT" | "PACKAGING";
}

interface RealRecipe {
  id: string;
  productId: string;
  dishName: string;
  category: string;
  salePrice: number;
  unit: string;
  yieldAmount: number;
  instructions: string;
  items: RecipeItemRow[];
}

interface RealProduct {
  id: string;
  name: string;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
  isRawMaterial: boolean;
  isPackaging: boolean;
  isSelfProduced: boolean;
  categoryName: string;
}

function fmt(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function RestaurantRecipesPage() {
  const [activeTab, setActiveTab] = useState<"recipes" | "materials">("recipes");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dados 100% reais do PostgreSQL
  const [recipes, setRecipes] = useState<RealRecipe[]>([]);
  const [allProducts, setAllProducts] = useState<RealProduct[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Filtros
  const [searchRecipe, setSearchRecipe] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("TODOS");
  const [searchMaterial, setSearchMaterial] = useState("");
  const [materialRoleFilter, setMaterialRoleFilter] = useState<"ALL" | "INGREDIENT" | "PACKAGING">("ALL");

  // Modal: Criar / Editar Ficha Técnica
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState("");
  const [editingYield, setEditingYield] = useState("1");
  const [editingInstructions, setEditingInstructions] = useState("");
  const [editingItems, setEditingItems] = useState<RecipeItemRow[]>([]);

  const [selectedMatIdToAdd, setSelectedMatIdToAdd] = useState("");
  const [selectedQtyToAdd, setSelectedQtyToAdd] = useState("1");
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<"INGREDIENT" | "PACKAGING">("INGREDIENT");

  // Modal: Criar / Editar Insumo ou Embalagem no Banco
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<{
    id?: string;
    name: string;
    unit: string;
    cost: number;
    stock: number;
    minStock: number;
    isPackaging: boolean;
  } | null>(null);

  useEffect(() => {
    loadWorkspace();
  }, []);

  async function loadWorkspace(preferRecipeId?: string) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getProductionWorkspace();
      if (!res.success) {
        setErrorMsg(res.error || "Não foi possível carregar as fichas técnicas.");
        return;
      }

      const mappedProducts: RealProduct[] = (res.ingredients || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        unit: p.unit || "UN",
        cost: Number(p.cost || 0),
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        minStock: Number(p.minStock || 0),
        isRawMaterial: Boolean(p.isRawMaterial),
        isPackaging: Boolean(p.isPackaging),
        isSelfProduced: Boolean(p.isSelfProduced),
        categoryName: p.categoryName || "Geral",
      }));
      setAllProducts(mappedProducts);

      const mappedRecipes: RealRecipe[] = (res.recipes || []).map((r: any) => ({
        id: r.id,
        productId: r.productId,
        dishName: r.product?.name || "Produto",
        category: r.product?.categoryName || "Geral",
        salePrice: Number(r.product?.price || 0),
        unit: r.product?.unit || "UN",
        yieldAmount: Number(r.yield || 1),
        instructions: r.instructions || "",
        items: (r.items || []).map((it: any) => ({
          productId: it.productId,
          name: it.product?.name || "Insumo",
          quantity: Number(it.quantity || 0),
          unit: it.unit || it.product?.unit || "UN",
          unitCost: Number(it.product?.cost || 0),
          itemRole: it.itemRole === "PACKAGING" ? "PACKAGING" : "INGREDIENT",
        })),
      }));
      setRecipes(mappedRecipes);

      setSelectedRecipeId((prev) => {
        const target = preferRecipeId || prev;
        if (target && mappedRecipes.some((r) => r.id === target)) return target;
        return mappedRecipes[0]?.id || null;
      });
    } finally {
      setLoading(false);
    }
  }

  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId) || null,
    [recipes, selectedRecipeId]
  );

  // Lista de insumos e embalagens do banco
  const materials = useMemo(() => {
    const tagged = allProducts.filter((p) => p.isRawMaterial || p.isPackaging);
    // Se a empresa ainda não marcou flags específicas, exibe todos que não são exclusivamente acabados para facilitar
    return tagged.length > 0 ? tagged : allProducts;
  }, [allProducts]);

  const calcRecipeCost = (items: RecipeItemRow[]) =>
    items.reduce((acc, i) => acc + Number(i.quantity || 0) * Number(i.unitCost || 0), 0);

  const categories = useMemo(
    () => ["TODOS", ...Array.from(new Set(recipes.map((r) => r.category)))],
    [recipes]
  );

  // ─── AÇÕES DE FICHA TÉCNICA ────────────────────────────────────────────────

  const handleOpenCreateRecipe = () => {
    setEditingProductId("");
    setEditingYield("1");
    setEditingInstructions("");
    setEditingItems([]);
    setSelectedMatIdToAdd("");
    setSelectedQtyToAdd("1");
    setSelectedRoleToAdd("INGREDIENT");
    setIsRecipeModalOpen(true);
  };

  const handleOpenEditRecipe = (recipe: RealRecipe) => {
    setEditingProductId(recipe.productId);
    setEditingYield(String(recipe.yieldAmount || 1));
    setEditingInstructions(recipe.instructions || "");
    setEditingItems(recipe.items.map((i) => ({ ...i })));
    setSelectedMatIdToAdd("");
    setSelectedQtyToAdd("1");
    setSelectedRoleToAdd("INGREDIENT");
    setIsRecipeModalOpen(true);
  };

  const handleDeleteRecipe = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover a ficha técnica do prato "${name}"?`)) return;
    setErrorMsg(null);
    const res = await deleteRecipe(id);
    if (res.success) {
      setSuccessMsg(`Ficha técnica de "${name}" removida.`);
      await loadWorkspace();
    } else {
      setErrorMsg(res.error || "Não foi possível remover a ficha técnica.");
    }
  };

  const handleAddIngredientToEditing = () => {
    if (!selectedMatIdToAdd) return;
    const mat = allProducts.find((m) => m.id === selectedMatIdToAdd);
    if (!mat) return;
    const qty = parseFloat(selectedQtyToAdd) || 0;
    if (qty <= 0) return;

    setEditingItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === mat.id && i.itemRole === selectedRoleToAdd
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: Number((updated[idx].quantity + qty).toFixed(4)),
        };
        return updated;
      }
      return [
        ...prev,
        {
          productId: mat.id,
          name: mat.name,
          quantity: qty,
          unit: mat.unit,
          unitCost: mat.cost,
          itemRole: selectedRoleToAdd,
        },
      ];
    });

    setSelectedMatIdToAdd("");
    setSelectedQtyToAdd("1");
  };

  const handleRemoveIngredientFromEditing = (index: number) => {
    setEditingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRecipeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) {
      alert("Selecione o produto/prato acabado cadastrado no estoque!");
      return;
    }
    if (editingItems.length === 0) {
      alert("Adicione pelo menos um insumo ou embalagem!");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    const res = await saveRecipe({
      productId: editingProductId,
      yieldAmount: parseFloat(editingYield) || 1,
      instructions: editingInstructions,
      items: editingItems.map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unit: it.unit,
        itemRole: it.itemRole,
      })),
    });
    setSubmitting(false);

    if (res.success && res.recipe) {
      setIsRecipeModalOpen(false);
      setSuccessMsg("Ficha técnica salva no banco de dados com sucesso!");
      await loadWorkspace(res.recipe.id);
    } else {
      setErrorMsg(res.error || "Erro ao salvar ficha técnica.");
    }
  };

  // ─── AÇÕES DE INSUMOS / EMBALAGENS ────────────────────────────────────────

  const handleOpenCreateMaterial = () => {
    setEditingMaterial({
      name: "",
      unit: "KG",
      cost: 0,
      stock: 0,
      minStock: 0,
      isPackaging: false,
    });
    setIsMaterialModalOpen(true);
  };

  const handleOpenEditMaterial = (mat: RealProduct) => {
    setEditingMaterial({
      id: mat.id,
      name: mat.name,
      unit: mat.unit || "UN",
      cost: mat.cost,
      stock: mat.stock,
      minStock: mat.minStock,
      isPackaging: mat.isPackaging,
    });
    setIsMaterialModalOpen(true);
  };

  const handleDeleteMaterial = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}" do banco de dados?`)) return;
    setErrorMsg(null);
    const res = await deleteRawMaterialProduct(id);
    if (res.success) {
      setSuccessMsg(`Item "${name}" excluído.`);
      await loadWorkspace();
    } else {
      setErrorMsg(res.error || "Erro ao excluir insumo.");
    }
  };

  const handleSaveMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial || !editingMaterial.name.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    const res = await saveRawMaterialProduct(editingMaterial);
    setSubmitting(false);

    if (res.success) {
      setIsMaterialModalOpen(false);
      setSuccessMsg("Insumo / Embalagem salvo no banco de dados!");
      await loadWorkspace();
    } else {
      setErrorMsg(res.error || "Erro ao salvar insumo.");
    }
  };

  // Métricas reais de topo
  const lowStockMaterials = materials.filter((m) => m.stock <= m.minStock);
  const avgCmv =
    recipes.length > 0
      ? (
          recipes.reduce((sum, r) => {
            const c = calcRecipeCost(r.items) / (r.yieldAmount || 1);
            return sum + (r.salePrice > 0 ? (c / r.salePrice) * 100 : 0);
          }, 0) / recipes.length
        ).toFixed(1)
      : "0.0";

  const filteredMaterials = materials.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(searchMaterial.toLowerCase());
    if (!matchSearch) return false;
    if (materialRoleFilter === "INGREDIENT") return !m.isPackaging;
    if (materialRoleFilter === "PACKAGING") return m.isPackaging;
    return true;
  });

  return (
    <div className="flex flex-col space-y-5 text-gray-900 pb-16">
      {/* Header */}
      <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-3xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <ChefHat size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Fichas Técnicas &amp; Insumos (Banco Real)
              </h1>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-200 px-2 py-0.5 rounded-md">
                PostgreSQL Integrado
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Composições reais de pratos e bebidas com insumos e embalagens vinculados diretamente ao estoque da empresa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <button
            type="button"
            onClick={() => loadWorkspace()}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
          <button
            type="button"
            onClick={handleOpenCreateMaterial}
            className="flex-1 md:flex-none bg-[#eaf1fc] hover:bg-indigo-100 text-slate-800 border border-indigo-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={15} className="text-indigo-600" />
            <span>Novo Insumo / Embalagem</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreateRecipe}
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus size={15} />
            <span>Nova Ficha Técnica</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            {successMsg}
          </span>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Fichas Cadastradas
          </span>
          <div className="text-xl font-black font-mono text-gray-900 mt-0.5 flex items-center gap-2">
            <Utensils size={18} className="text-indigo-600" />
            {recipes.length} pratos
          </div>
        </div>

        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Insumos &amp; Embalagens
          </span>
          <div className="text-xl font-black font-mono text-gray-900 mt-0.5 flex items-center gap-2">
            <Package size={18} className="text-purple-600" />
            {materials.length} itens
          </div>
        </div>

        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            CMV Médio Unitário
          </span>
          <div className="text-xl font-black font-mono text-emerald-600 mt-0.5 flex items-center gap-2">
            <Percent size={18} className="text-emerald-600" />
            {avgCmv}%
          </div>
        </div>

        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Itens em Estoque Baixo
          </span>
          <div
            className={`text-xl font-black font-mono mt-0.5 flex items-center gap-2 ${
              lowStockMaterials.length > 0 ? "text-amber-600" : "text-slate-500"
            }`}
          >
            <AlertTriangle
              size={18}
              className={lowStockMaterials.length > 0 ? "text-amber-600" : "text-slate-500"}
            />
            {lowStockMaterials.length} críticos
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-2 border-b border-[#c4d5ee] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("recipes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "recipes"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-500 hover:text-gray-900 hover:bg-indigo-500/10"
          }`}
        >
          <Utensils size={15} />
          <span>Fichas Técnicas &amp; Pratos ({recipes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("materials")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "materials"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-500 hover:text-gray-900 hover:bg-indigo-500/10"
          }`}
        >
          <Package size={15} />
          <span>Catálogo de Insumos &amp; Embalagens ({materials.length})</span>
        </button>
      </div>

      {/* ABA 1: FICHAS TÉCNICAS */}
      {activeTab === "recipes" && (
        <div className="grid grid-cols-12 gap-5 min-h-[520px]">
          {/* Lista à esquerda */}
          <div className="col-span-12 lg:col-span-5 bg-[#fbfdff] border border-[#c4d5ee] rounded-3xl p-4 flex flex-col space-y-3 shadow-xs">
            <div className="space-y-2">
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  size={14}
                />
                <input
                  type="text"
                  value={searchRecipe}
                  onChange={(e) => setSearchRecipe(e.target.value)}
                  placeholder="Buscar prato ou bebida..."
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 pl-9 pr-3.5 py-2 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all shrink-0 ${
                      categoryFilter === cat
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-[#e8f0fc] text-slate-500 hover:text-gray-900 border border-[#c4d5ee]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[500px]">
              {loading ? (
                <div className="text-center py-12 text-xs text-slate-400 font-bold">
                  Carregando fichas técnicas do banco...
                </div>
              ) : recipes.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  Nenhuma ficha técnica cadastrada ainda no banco de dados.
                </div>
              ) : (
                recipes
                  .filter((r) => categoryFilter === "TODOS" || r.category === categoryFilter)
                  .filter((r) => r.dishName.toLowerCase().includes(searchRecipe.toLowerCase()))
                  .map((r) => {
                    const totalCost = calcRecipeCost(r.items);
                    const unitCost = totalCost / (r.yieldAmount || 1);
                    const cmv = r.salePrice > 0 ? (unitCost / r.salePrice) * 100 : 0;
                    const isSelected = selectedRecipe?.id === r.id;

                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRecipeId(r.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                          isSelected
                            ? "bg-indigo-600/15 border-indigo-500/50 shadow-sm"
                            : "bg-[#e8f0fc] border-[#c4d5ee] hover:border-indigo-300"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <div>
                            <span className="text-xs font-black text-gray-900 block leading-tight">
                              {r.dishName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {r.category} • Rendimento: {r.yieldAmount} {r.unit} • {r.items.length}{" "}
                              itens
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono ${
                              cmv <= 35
                                ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-700 border-amber-500/30"
                            }`}
                          >
                            CMV {cmv.toFixed(1)}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[11px] pt-2 border-t border-[#c4d5ee]">
                          <span className="text-slate-500 font-mono">
                            Custo Unit.:{" "}
                            <strong className="text-amber-700">R$ {fmt(unitCost)}</strong>
                          </span>
                          <span className="text-emerald-700 font-mono font-bold">
                            Venda: R$ {fmt(r.salePrice)}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Detalhes à direita */}
          <div className="col-span-12 lg:col-span-7 bg-[#fbfdff] border border-[#c4d5ee] rounded-3xl p-5 flex flex-col space-y-4 shadow-xs">
            {selectedRecipe ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#c4d5ee] pb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-gray-900">
                        {selectedRecipe.dishName}
                      </h2>
                      <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
                        {selectedRecipe.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Rendimento Padrão:{" "}
                      <strong>
                        {selectedRecipe.yieldAmount} {selectedRecipe.unit}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditRecipe(selectedRecipe)}
                      className="px-3.5 py-2 bg-[#eaf1fc] hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Edit3 size={14} /> Editar Ficha
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteRecipe(selectedRecipe.id, selectedRecipe.dishName)
                      }
                      className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={14} className="text-indigo-600" /> Insumos &amp; Embalagens (
                      {selectedRecipe.items.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleOpenEditRecipe(selectedRecipe)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                    >
                      <Plus size={13} /> Alterar Composição
                    </button>
                  </div>

                  <div className="bg-[#e8f0fc] rounded-2xl border border-[#c4d5ee] overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#fbfdff] text-slate-500 border-b border-[#c4d5ee]">
                        <tr>
                          <th className="px-4 py-3 font-bold uppercase text-[10px]">Item</th>
                          <th className="px-4 py-3 font-bold uppercase text-[10px]">Papel</th>
                          <th className="px-4 py-3 text-center uppercase text-[10px]">Qtd. Baixa</th>
                          <th className="px-4 py-3 text-right uppercase text-[10px]">Custo Unit.</th>
                          <th className="px-4 py-3 text-right uppercase text-[10px]">Subtotal</th>
                          <th className="px-4 py-3 text-right uppercase text-[10px]">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c4d5ee] font-mono">
                        {selectedRecipe.items.map((ing, i) => {
                          const totalDishCost = calcRecipeCost(selectedRecipe.items);
                          const ingTotal = ing.quantity * ing.unitCost;
                          const perc = totalDishCost > 0 ? (ingTotal / totalDishCost) * 100 : 0;

                          return (
                            <tr key={i} className="hover:bg-indigo-500/5">
                              <td className="px-4 py-3 font-bold text-gray-900 font-sans">
                                {ing.name}
                              </td>
                              <td className="px-4 py-3 font-sans">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    ing.itemRole === "PACKAGING"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  }`}
                                >
                                  {ing.itemRole === "PACKAGING" ? "Embalagem" : "Insumo"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-indigo-700 font-bold">
                                {ing.quantity} {ing.unit}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                R$ {fmt(ing.unitCost)}
                              </td>
                              <td className="px-4 py-3 text-right text-amber-700 font-bold">
                                R$ {fmt(ingTotal)}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-500">
                                {perc.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {selectedRecipe.instructions && (
                    <div className="bg-[#e8f0fc] p-3.5 rounded-2xl border border-[#c4d5ee] space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Modo de Preparo / Instruções:
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {selectedRecipe.instructions}
                      </p>
                    </div>
                  )}
                </div>

                {(() => {
                  const totalBatch = calcRecipeCost(selectedRecipe.items);
                  const unitCost = totalBatch / (selectedRecipe.yieldAmount || 1);
                  const profit = selectedRecipe.salePrice - unitCost;
                  const cmv =
                    selectedRecipe.salePrice > 0
                      ? ((unitCost / selectedRecipe.salePrice) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <div className="bg-[#e8f0fc] p-4 rounded-2xl border border-[#c4d5ee] grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          Custo Unitário
                        </span>
                        <span className="text-base font-black text-amber-700 font-mono">
                          R$ {fmt(unitCost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          Preço Venda
                        </span>
                        <span className="text-base font-black text-emerald-700 font-mono">
                          R$ {fmt(selectedRecipe.salePrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          Margem Bruta
                        </span>
                        <span className="text-base font-black text-gray-900 font-mono">
                          R$ {fmt(profit)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          CMV Real
                        </span>
                        <span className="text-base font-black font-mono text-indigo-700">
                          {cmv}%
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2 py-12">
                <Utensils size={32} className="text-slate-400" />
                <p>Nenhuma ficha técnica selecionada.</p>
                <button
                  type="button"
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

      {/* ABA 2: CATÁLOGO REAL DE INSUMOS E EMBALAGENS */}
      {activeTab === "materials" && (
        <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#c4d5ee] pb-4">
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Package className="text-indigo-600" size={18} /> Insumos &amp; Embalagens Reais
              </h2>
              <p className="text-xs text-slate-500">
                Produtos reais da empresa usados na composição das receitas e baixados na produção/venda.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <div className="inline-flex rounded-xl border border-indigo-200 bg-white p-0.5">
                {[
                  { key: "ALL" as const, label: "Todos" },
                  { key: "INGREDIENT" as const, label: "Insumos" },
                  { key: "PACKAGING" as const, label: "Embalagens" },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setMaterialRoleFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                      materialRoleFilter === f.key
                        ? "bg-indigo-600 text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 sm:w-56">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={14}
                />
                <input
                  type="text"
                  value={searchMaterial}
                  onChange={(e) => setSearchMaterial(e.target.value)}
                  placeholder="Buscar item..."
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 pl-8 pr-3 py-2 rounded-xl text-xs outline-none font-semibold"
                />
              </div>
              <button
                type="button"
                onClick={handleOpenCreateMaterial}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1"
              >
                <Plus size={14} /> Cadastrar Item
              </button>
            </div>
          </div>

          <div className="bg-[#e8f0fc] rounded-2xl border border-[#c4d5ee] overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#fbfdff] text-slate-500 border-b border-[#c4d5ee]">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase text-[10px]">Item</th>
                  <th className="px-4 py-3 text-center uppercase text-[10px]">Tipo</th>
                  <th className="px-4 py-3 text-center uppercase text-[10px]">Unidade</th>
                  <th className="px-4 py-3 text-right uppercase text-[10px]">Custo</th>
                  <th className="px-4 py-3 text-center uppercase text-[10px]">Estoque Atual</th>
                  <th className="px-4 py-3 text-center uppercase text-[10px]">Mínimo</th>
                  <th className="px-4 py-3 text-right uppercase text-[10px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4d5ee] font-mono">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                      Nenhum insumo ou embalagem encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((mat) => {
                    const isLow = mat.stock <= mat.minStock;
                    const usedCount = recipes.filter((r) =>
                      r.items.some((i) => i.productId === mat.id)
                    ).length;

                    return (
                      <tr key={mat.id} className="hover:bg-indigo-500/5">
                        <td className="px-4 py-3 font-sans">
                          <span className="font-bold text-gray-900 block">{mat.name}</span>
                          <span className="text-[10px] text-slate-500">
                            Usado em {usedCount} ficha(s) técnica(s)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-sans">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              mat.isPackaging
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            {mat.isPackaging ? "Embalagem" : "Insumo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-700">
                          {mat.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-700 font-bold">
                          R$ {fmt(mat.cost)}
                        </td>
                        <td
                          className={`px-4 py-3 text-center font-bold ${
                            isLow ? "text-amber-700" : "text-gray-900"
                          }`}
                        >
                          {mat.stock} {mat.unit}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">
                          {mat.minStock} {mat.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditMaterial(mat)}
                              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg border border-[#c4d5ee]"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-100 rounded-lg border border-[#c4d5ee]"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR FICHA TÉCNICA REAL */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-indigo-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#f3f7fe]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-700 flex items-center justify-center">
                  <ChefHat size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Salvar Ficha Técnica no Banco
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Vincule o produto acabado aos insumos e embalagens reais do estoque.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecipeModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-gray-900 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRecipeSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Produto / Prato Acabado *
                  </label>
                  <select
                    required
                    value={editingProductId}
                    onChange={(e) => setEditingProductId(e.target.value)}
                    className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="">Selecione o produto cadastrado...</option>
                    {allProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit}) — Venda R$ {fmt(p.price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Rendimento Padrão *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editingYield}
                    onChange={(e) => setEditingYield(e.target.value)}
                    className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>

              {/* Bloco para adicionar Insumo ou Embalagem */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    Composição ({editingItems.length} itens)
                  </span>
                  <span className="text-xs font-mono text-slate-600">
                    Custo Total Lote:{" "}
                    <strong className="text-amber-700">R$ {fmt(calcRecipeCost(editingItems))}</strong>
                  </span>
                </div>

                <div className="bg-[#e8f0fc] p-3 rounded-2xl border border-indigo-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <select
                    value={selectedRoleToAdd}
                    onChange={(e) =>
                      setSelectedRoleToAdd(e.target.value as "INGREDIENT" | "PACKAGING")
                    }
                    className="sm:col-span-3 bg-white border border-indigo-200 text-gray-900 px-2.5 py-2 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="INGREDIENT">Insumo</option>
                    <option value="PACKAGING">Embalagem</option>
                  </select>

                  <select
                    value={selectedMatIdToAdd}
                    onChange={(e) => setSelectedMatIdToAdd(e.target.value)}
                    className="sm:col-span-5 bg-white border border-indigo-200 text-gray-900 px-2.5 py-2 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="">Selecione do estoque...</option>
                    {allProducts
                      .filter((p) => p.id !== editingProductId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (R$ {fmt(m.cost)}/{m.unit})
                        </option>
                      ))}
                  </select>

                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={selectedQtyToAdd}
                    onChange={(e) => setSelectedQtyToAdd(e.target.value)}
                    className="sm:col-span-2 bg-white border border-indigo-200 text-gray-900 px-2 py-2 rounded-xl text-xs font-mono text-center font-bold outline-none"
                    placeholder="Qtd"
                  />

                  <button
                    type="button"
                    onClick={handleAddIngredientToEditing}
                    disabled={!selectedMatIdToAdd}
                    className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold px-3 py-2 rounded-xl text-xs"
                  >
                    + Incluir
                  </button>
                </div>

                {editingItems.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {editingItems.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 bg-[#f3f7fe] p-2.5 rounded-xl border border-indigo-100 text-xs"
                      >
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            ing.itemRole === "PACKAGING"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {ing.itemRole === "PACKAGING" ? "Embalagem" : "Insumo"}
                        </span>
                        <span className="font-bold text-gray-900 flex-1 truncate">{ing.name}</span>
                        <input
                          type="number"
                          step="0.001"
                          value={ing.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setEditingItems((prev) =>
                              prev.map((row, rIdx) =>
                                rIdx === idx ? { ...row, quantity: val } : row
                              )
                            );
                          }}
                          className="w-20 bg-white border border-indigo-200 text-indigo-700 text-center font-mono font-bold py-1 rounded-lg outline-none"
                        />
                        <span className="text-slate-500 w-8 font-mono text-[11px]">{ing.unit}</span>
                        <span className="w-20 text-right font-mono text-amber-700 font-bold">
                          R$ {fmt(ing.quantity * ing.unitCost)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientFromEditing(idx)}
                          className="p-1 text-slate-500 hover:text-rose-600 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Instruções / Modo de Preparo
                </label>
                <textarea
                  rows={2}
                  value={editingInstructions}
                  onChange={(e) => setEditingInstructions(e.target.value)}
                  placeholder="Passo a passo para a equipe..."
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="flex-1 bg-gray-100 text-slate-600 py-2.5 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save size={15} /> {submitting ? "Salvando..." : "Salvar Ficha Técnica"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR INSUMO OU EMBALAGEM NO BANCO */}
      {isMaterialModalOpen && editingMaterial && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-indigo-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#f3f7fe]">
              <h3 className="text-base font-bold text-gray-900">
                {editingMaterial.id ? "Editar Insumo / Embalagem" : "Novo Insumo / Embalagem"}
              </h3>
              <button
                type="button"
                onClick={() => setIsMaterialModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMaterialSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Nome *
                </label>
                <input
                  required
                  type="text"
                  value={editingMaterial.name}
                  onChange={(e) =>
                    setEditingMaterial({ ...editingMaterial, name: e.target.value })
                  }
                  placeholder="Ex: Açúcar Sachê ou Copo 200ml"
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-[#f3f7fe] p-3 rounded-xl border border-indigo-100">
                <input
                  type="checkbox"
                  checked={editingMaterial.isPackaging}
                  onChange={(e) =>
                    setEditingMaterial({ ...editingMaterial, isPackaging: e.target.checked })
                  }
                  className="rounded text-indigo-600"
                />
                <span className="text-xs font-bold text-gray-800">
                  Classificar como Embalagem / Descartável (Copo, Tampa, Pote, Sacola)
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Unidade
                  </label>
                  <select
                    value={editingMaterial.unit}
                    onChange={(e) =>
                      setEditingMaterial({ ...editingMaterial, unit: e.target.value })
                    }
                    className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilograma (KG)</option>
                    <option value="G">Grama (G)</option>
                    <option value="LT">Litro (LT)</option>
                    <option value="ML">Mililitro (ML)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Custo Unit. (R$) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={editingMaterial.cost}
                    onChange={(e) =>
                      setEditingMaterial({
                        ...editingMaterial,
                        cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#e8f0fc] border border-indigo-200 text-amber-700 px-3 py-2.5 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Estoque Atual
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingMaterial.stock}
                    onChange={(e) =>
                      setEditingMaterial({
                        ...editingMaterial,
                        stock: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingMaterial.minStock}
                    onChange={(e) =>
                      setEditingMaterial({
                        ...editingMaterial,
                        minStock: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="flex-1 bg-gray-100 text-slate-600 py-2.5 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save size={15} /> {submitting ? "Salvando..." : "Salvar no Banco"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
