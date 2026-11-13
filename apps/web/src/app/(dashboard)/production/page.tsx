"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Hammer,
  Plus,
  Layers,
  Clipboard,
  Trash2,
  Check,
  AlertCircle,
  X,
  UserCheck,
  Edit3,
  Package,
  AlertTriangle,
  Calendar,
  Boxes,
  RefreshCw,
} from "lucide-react";
import {
  getProductionWorkspace,
  saveRecipe,
  deleteRecipe,
  recordProduction,
  getProductionReportByUser,
} from "@/actions/production";

function fmtBRL(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProductionPage() {
  const [activeTab, setActiveTab] = useState<"recipes" | "logs">("recipes");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dados reais do workspace
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSummary, setUserSummary] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Filtro de usuário nos logs
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("ALL");

  // Modal: Criar / Editar Ficha Técnica
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [recipeYield, setRecipeYield] = useState("1");
  const [recipeInstructions, setRecipeInstructions] = useState("");
  const [recipeItems, setRecipeItems] = useState<
    { productId: string; quantity: number; unit: string; itemRole: "INGREDIENT" | "PACKAGING" }[]
  >([]);

  // Modal: Registrar Produção
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [producerUserId, setProducerUserId] = useState("");
  const [prodQty, setProdQty] = useState("1");
  const [batchNumber, setBatchNumber] = useState("");
  const [validityMode, setValidityMode] = useState<"DAYS" | "DATE">("DAYS");
  const [shelfLifeDays, setShelfLifeDays] = useState("10");
  const [expirationDate, setExpirationDate] = useState("");
  const [prodNotes, setProdNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [wsRes, repRes] = await Promise.all([
        getProductionWorkspace(),
        getProductionReportByUser(),
      ]);
      if (wsRes.success) {
        setProducts(wsRes.ingredients || []);
        setRecipes(wsRes.recipes || []);
        setLogs(wsRes.logs || []);
        setUsers(wsRes.users || []);
        if (wsRes.currentUserId) {
          setCurrentUserId(wsRes.currentUserId);
        }
      } else if (wsRes.error) {
        setError(wsRes.error);
      }
      if (repRes.success) {
        setUserSummary(repRes.byUser || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateRecipeCost = (items: any[]) => {
    return items.reduce((acc, item) => {
      const unitCost = Number(item.product?.cost ?? 0);
      return acc + unitCost * Number(item.quantity || 0);
    }, 0);
  };

  const openNewRecipeModal = () => {
    setSelectedProductId("");
    setRecipeYield("1");
    setRecipeInstructions("");
    setRecipeItems([]);
    setIsRecipeModalOpen(true);
  };

  const openEditRecipeModal = (recipe: any) => {
    setSelectedProductId(recipe.productId);
    setRecipeYield(String(recipe.yield || 1));
    setRecipeInstructions(recipe.instructions || "");
    setRecipeItems(
      (recipe.items || []).map((it: any) => ({
        productId: it.productId,
        quantity: Number(it.quantity || 0),
        unit: it.unit || it.product?.unit || "UN",
        itemRole: it.itemRole === "PACKAGING" ? "PACKAGING" : "INGREDIENT",
      }))
    );
    setIsRecipeModalOpen(true);
  };

  const handleAddRecipeItem = (role: "INGREDIENT" | "PACKAGING") => {
    setRecipeItems((prev) => [
      ...prev,
      { productId: "", quantity: 1, unit: role === "PACKAGING" ? "UN" : "KG", itemRole: role },
    ]);
  };

  const handleRemoveRecipeItem = (index: number) => {
    setRecipeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRecipeItemChange = (index: number, field: string, value: any) => {
    setRecipeItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === "productId") {
          const found = products.find((p) => p.id === value);
          if (found) {
            updated.unit = found.unit || updated.unit;
          }
        }
        return updated;
      })
    );
  };

  const handleSaveRecipeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedProductId) {
      setError("Selecione o produto acabado.");
      return;
    }
    if (recipeItems.length === 0) {
      setError("Adicione pelo menos um insumo ou embalagem.");
      return;
    }
    for (const item of recipeItems) {
      if (!item.productId || Number(item.quantity) <= 0) {
        setError("Preencha todos os insumos/embalagens e respectivas quantidades.");
        return;
      }
    }

    setSubmitting(true);
    const res = await saveRecipe({
      productId: selectedProductId,
      yieldAmount: parseFloat(recipeYield) || 1,
      instructions: recipeInstructions,
      items: recipeItems.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unit: item.unit,
        itemRole: item.itemRole,
      })),
    });
    setSubmitting(false);

    if (res.success) {
      setSuccess("Ficha técnica salva com sucesso no banco de dados!");
      setIsRecipeModalOpen(false);
      await loadData();
    } else {
      setError(res.error || "Erro ao salvar ficha técnica.");
    }
  };

  const handleDeleteRecipe = async (recipe: any) => {
    if (!confirm(`Deseja remover a ficha técnica de "${recipe.product?.name}"?`)) return;
    setError("");
    setSuccess("");
    const res = await deleteRecipe(recipe.id);
    if (res.success) {
      setSuccess("Ficha técnica removida.");
      await loadData();
    } else {
      setError(res.error || "Não foi possível remover a ficha técnica.");
    }
  };

  const openRecordProductionModal = (recipe: any) => {
    setSelectedRecipe(recipe);
    const defaultProducer =
      users.find((u) => u.id === currentUserId)?.id || users[0]?.id || "";
    setProducerUserId(defaultProducer);
    setProdQty(String(recipe.yield || 1));
    setBatchNumber(
      `LOTE-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`
    );
    const defaultDays = recipe.product?.scaleDays && recipe.product.scaleDays > 0 ? recipe.product.scaleDays : 10;
    setValidityMode("DAYS");
    setShelfLifeDays(String(defaultDays));
    setExpirationDate(
      new Date(Date.now() + defaultDays * 86400000).toISOString().slice(0, 10)
    );
    setProdNotes("");
    setIsProdModalOpen(true);
  };

  const productionPreview = useMemo(() => {
    if (!selectedRecipe) return { rows: [], hasInsufficient: false, totalCost: 0 };
    const qty = parseFloat(prodQty) || 0;
    const yieldVal = Number(selectedRecipe.yield || 1) || 1;
    const factor = qty / yieldVal;
    let hasInsufficient = false;
    let totalCost = 0;

    const rows = (selectedRecipe.items || []).map((item: any) => {
      const required = Number(item.quantity || 0) * factor;
      const currentStock = Number(item.product?.stock ?? 0);
      const unitCost = Number(item.product?.cost ?? 0);
      const itemCost = required * unitCost;
      const insufficient = currentStock < required;
      const lowAfter = !insufficient && currentStock - required <= Number(item.product?.minStock || 2);
      if (insufficient) hasInsufficient = true;
      totalCost += itemCost;
      return {
        id: item.id,
        name: item.product?.name || "Item",
        unit: item.unit || item.product?.unit || "UN",
        itemRole: item.itemRole === "PACKAGING" ? "PACKAGING" : "INGREDIENT",
        required,
        currentStock,
        itemCost,
        insufficient,
        lowAfter,
      };
    });

    return { rows, hasInsufficient, totalCost };
  }, [selectedRecipe, prodQty]);

  const handleRecordProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedRecipe) return;
    if (!producerUserId) {
      setError("Selecione quem produziu o lote.");
      return;
    }

    setSubmitting(true);
    const res = await recordProduction({
      recipeId: selectedRecipe.id,
      quantityProduced: parseFloat(prodQty),
      producerUserId,
      batchNumber,
      shelfLifeDays: validityMode === "DAYS" ? parseInt(shelfLifeDays, 10) || 0 : undefined,
      expirationDate: validityMode === "DATE" ? expirationDate : undefined,
      notes: prodNotes,
    });
    setSubmitting(false);

    if (res.success) {
      const producerName = users.find((u) => u.id === producerUserId)?.name || "Colaborador";
      setSuccess(
        `Produção de ${prodQty} ${selectedRecipe.product?.unit || "UN"} de "${selectedRecipe.product?.name}" registrada por ${producerName}! Estoque, insumos/embalagens e validade atualizados.`
      );
      setIsProdModalOpen(false);
      await loadData();
    } else {
      setError(res.error || "Erro ao registrar produção.");
    }
  };

  const filteredLogs = logs.filter((l) =>
    selectedUserFilter === "ALL" ? true : l.userId === selectedUserFilter
  );

  // Preview de custo dentro do modal de Ficha Técnica
  const modalRecipeCostPreview = useMemo(() => {
    return recipeItems.reduce((acc, it) => {
      const p = products.find((prod) => prod.id === it.productId);
      return acc + Number(p?.cost || 0) * Number(it.quantity || 0);
    }, 0);
  }, [recipeItems, products]);

  return (
    <div className="space-y-5 text-slate-800 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Hammer className="text-indigo-600" size={28} />
            Produção Própria &amp; Fichas Técnicas
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gerencie receitas com insumos e embalagens, lance lotes identificando o colaborador produtor e controle o custo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-2xs"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
          <button
            type="button"
            onClick={openNewRecipeModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all text-sm"
          >
            <Plus size={18} /> Nova Ficha Técnica
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-semibold">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-2xl flex items-center gap-2 text-sm font-semibold">
          <Check size={20} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Quadro rápido de Produção por Usuário */}
      <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <UserCheck size={17} className="text-indigo-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-800">
              Quadro Rápido de Produção por Usuário
            </h2>
          </div>
          {selectedUserFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedUserFilter("ALL")}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Mostrar todos os produtores
            </button>
          )}
        </div>

        {userSummary.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nenhuma produção lançada ainda. Registre um lote abaixo selecionando o usuário produtor.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {userSummary.map((u) => {
              const active = selectedUserFilter === u.userId;
              return (
                <button
                  key={u.userId}
                  type="button"
                  onClick={() => {
                    setSelectedUserFilter(active ? "ALL" : u.userId);
                    setActiveTab("logs");
                  }}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20"
                      : "bg-[#f8fbff] border-indigo-100 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-sm text-gray-900 truncate">{u.userName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {u.totalLotes} lote(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-indigo-100 text-[11px]">
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase font-bold">Produzido</span>
                      <span className="font-mono font-black text-gray-800">{u.totalProduzido}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase font-bold">Receitas</span>
                      <span className="font-mono font-bold text-indigo-700">{u.receitasDistintas}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 block text-[9px] uppercase font-bold">Custo Ins.</span>
                      <span className="font-mono font-bold text-emerald-700">
                        R$ {fmtBRL(u.custoInsumos)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-indigo-500/[0.08]">
        <button
          type="button"
          onClick={() => setActiveTab("recipes")}
          className={`pb-3.5 text-sm font-bold border-b-2 px-2 transition-all ${
            activeTab === "recipes"
              ? "border-indigo-500 text-gray-900"
              : "border-transparent text-slate-500 hover:text-slate-600"
          }`}
        >
          Fichas Técnicas ({recipes.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`pb-3.5 text-sm font-bold border-b-2 px-2 transition-all ${
            activeTab === "logs"
              ? "border-indigo-500 text-gray-900"
              : "border-transparent text-slate-500 hover:text-slate-600"
          }`}
        >
          Histórico de Produção ({filteredLogs.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 font-semibold">
          Carregando dados reais de produção...
        </div>
      ) : activeTab === "recipes" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-indigo-100 p-12 text-center text-slate-500">
              <Clipboard size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-bold">Nenhuma ficha técnica cadastrada</p>
              <p className="text-sm">
                Clique em &quot;Nova Ficha Técnica&quot; para associar insumos e embalagens aos produtos de fabricação própria.
              </p>
            </div>
          ) : (
            recipes.map((recipe) => {
              const totalCost = calculateRecipeCost(recipe.items);
              const unitCost = totalCost / (Number(recipe.yield) || 1);
              const ingredientsList = recipe.items.filter(
                (i: any) => i.itemRole !== "PACKAGING"
              );
              const packagingList = recipe.items.filter(
                (i: any) => i.itemRole === "PACKAGING"
              );

              return (
                <div
                  key={recipe.id}
                  className="bg-white border border-indigo-100 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:border-indigo-300 transition-all"
                >
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h2 className="text-base font-black text-gray-900 leading-snug">
                          {recipe.product?.name}
                        </h2>
                        <span className="text-xs text-slate-500 font-mono">
                          RENDIMENTO: {recipe.yield} {recipe.product?.unit || "UN"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditRecipeModal(recipe)}
                          title="Editar Ficha Técnica"
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecipe(recipe)}
                          title="Remover Ficha Técnica"
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Insumos */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">
                        Insumos ({ingredientsList.length})
                      </span>
                      {ingredientsList.length === 0 ? (
                        <p className="text-[11px] text-gray-400 italic">Sem insumos vinculados</p>
                      ) : (
                        <div className="max-h-24 overflow-y-auto pr-1 space-y-1">
                          {ingredientsList.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-xs text-slate-600"
                            >
                              <span className="truncate pr-2">• {item.product?.name}</span>
                              <span className="font-mono font-bold text-slate-700 shrink-0">
                                {item.quantity} {item.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Embalagens */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                      <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">
                        Embalagens ({packagingList.length})
                      </span>
                      {packagingList.length === 0 ? (
                        <p className="text-[11px] text-gray-400 italic">Sem embalagens</p>
                      ) : (
                        <div className="max-h-20 overflow-y-auto pr-1 space-y-1">
                          {packagingList.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-xs text-slate-600"
                            >
                              <span className="truncate pr-2">• {item.product?.name}</span>
                              <span className="font-mono font-bold text-amber-700 shrink-0">
                                {item.quantity} {item.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Custos */}
                    <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          Custo da Receita
                        </span>
                        <span className="font-mono font-bold text-slate-700">
                          R$ {fmtBRL(totalCost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          Custo Unitário
                        </span>
                        <span className="font-mono font-black text-indigo-600">
                          R$ {fmtBRL(unitCost)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => openRecordProductionModal(recipe)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-sm"
                    >
                      <Layers size={15} /> Lançar Produção (Lote)
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* LOGS TAB */
        <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600">Filtrar por Produtor:</span>
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 outline-none"
              >
                <option value="ALL">Todos os Usuários</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs font-bold text-gray-500">
              {filteredLogs.length} registro(s) encontrado(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-slate-500 uppercase text-[10px] font-black">
                <tr>
                  <th className="px-4 py-3">Data / Hora</th>
                  <th className="px-4 py-3">Produto Fabricado</th>
                  <th className="px-4 py-3 text-center">Quantidade</th>
                  <th className="px-4 py-3 text-right">Custo Insumos</th>
                  <th className="px-4 py-3">Lote Gerado</th>
                  <th className="px-4 py-3">Validade</th>
                  <th className="px-4 py-3">Quem Produziu</th>
                  <th className="px-4 py-3">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      Nenhum registro de produção encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3.5 text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3.5 text-gray-900 font-bold">
                        {log.recipe?.product?.name}
                      </td>
                      <td className="px-4 py-3.5 text-center text-indigo-600 font-black font-mono">
                        +{log.quantityProduced} {log.recipe?.product?.unit || "UN"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">
                        R$ {fmtBRL(log.totalCost)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] bg-indigo-50 border border-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold">
                          {log.batchNumber || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono">
                        {log.expirationDate
                          ? new Date(log.expirationDate).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-gray-800">
                        {log.user?.name || "Operador"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-[200px] truncate">
                        {log.notes || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CRIAR / EDITAR FICHA TÉCNICA (INSUMOS x EMBALAGENS) */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Boxes className="text-indigo-600" size={20} />
                Ficha Técnica (Insumos &amp; Embalagens)
              </h3>
              <button
                type="button"
                onClick={() => setIsRecipeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRecipeSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Produto Acabado *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-500 text-gray-900 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                    required
                  >
                    <option value="">Selecione o produto final...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit}) — Estoque: {p.stock}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Rendimento Padrão *
                  </label>
                  <input
                    type="number"
                    value={recipeYield}
                    onChange={(e) => setRecipeYield(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-500 text-gray-900 rounded-xl px-3 py-2.5 text-xs font-mono font-bold outline-none"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Botões para adicionar Insumo vs Embalagem */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  Composição da Receita ({recipeItems.length} itens • Custo Total: R${" "}
                  {fmtBRL(modalRecipeCostPreview)})
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddRecipeItem("INGREDIENT")}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold text-xs flex items-center gap-1"
                  >
                    <Plus size={14} /> + Insumo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddRecipeItem("PACKAGING")}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 font-bold text-xs flex items-center gap-1"
                  >
                    <Package size={14} /> + Embalagem
                  </button>
                </div>
              </div>

              {recipeItems.length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center text-slate-500 text-xs">
                  Adicione insumos (ingredientes/matéria-prima) e embalagens (copos, potes, tampas) acima.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {recipeItems.map((item, index) => (
                    <div
                      key={index}
                      className={`flex flex-wrap sm:flex-nowrap gap-2 items-center p-2.5 rounded-xl border ${
                        item.itemRole === "PACKAGING"
                          ? "bg-amber-50/40 border-amber-200"
                          : "bg-emerald-50/40 border-emerald-200"
                      }`}
                    >
                      <select
                        value={item.itemRole}
                        onChange={(e) =>
                          handleRecipeItemChange(
                            index,
                            "itemRole",
                            e.target.value as "INGREDIENT" | "PACKAGING"
                          )
                        }
                        className="w-28 bg-white border border-gray-200 text-gray-800 rounded-lg px-2 py-2 text-xs font-bold outline-none"
                      >
                        <option value="INGREDIENT">Insumo</option>
                        <option value="PACKAGING">Embalagem</option>
                      </select>

                      <select
                        value={item.productId}
                        onChange={(e) => handleRecipeItemChange(index, "productId", e.target.value)}
                        className="flex-1 min-w-[180px] bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs font-semibold outline-none"
                        required
                      >
                        <option value="">Selecione o item...</option>
                        {products
                          .filter((p) => p.id !== selectedProductId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit}) — Custo R$ {Number(p.cost || 0).toFixed(2)}
                            </option>
                          ))}
                      </select>

                      <input
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) => handleRecipeItemChange(index, "quantity", e.target.value)}
                        placeholder="Qtd"
                        className="w-20 bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs text-right font-mono font-bold outline-none"
                        required
                        min="0.0001"
                        step="0.0001"
                      />

                      <select
                        value={item.unit}
                        onChange={(e) => handleRecipeItemChange(index, "unit", e.target.value)}
                        className="w-20 bg-white border border-gray-200 text-gray-900 rounded-lg px-2 py-2 text-xs font-bold outline-none"
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
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Modo de Preparo / Instruções
                </label>
                <textarea
                  value={recipeInstructions}
                  onChange={(e) => setRecipeInstructions(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-500 text-gray-900 rounded-xl px-3 py-2.5 text-xs outline-none h-20 resize-none"
                  placeholder="Instruções de fabricação e envase..."
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : "Salvar Ficha Técnica"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LANÇAR PRODUÇÃO (COM USUÁRIO PRODUTOR, LOTE, VALIDADE E PRÉVIA DE INSUMOS) */}
      {isProdModalOpen && selectedRecipe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Layers className="text-indigo-600" size={18} />
                Lançar Produção — {selectedRecipe.product?.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsProdModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRecordProductionSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Seleção obrigatória do Usuário Produtor */}
              <div>
                <label className="block text-xs font-black text-indigo-900 uppercase mb-1 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-indigo-600" /> Quem Produziu (Usuário Cadastrado) *
                </label>
                <select
                  value={producerUserId}
                  onChange={(e) => setProducerUserId(e.target.value)}
                  required
                  className="w-full bg-indigo-50/50 border-2 border-indigo-200 focus:border-indigo-500 text-gray-900 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none"
                >
                  <option value="">Selecione o colaborador responsável...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Quantidade Produzida ({selectedRecipe.product?.unit || "UN"}) *
                  </label>
                  <input
                    type="number"
                    value={prodQty}
                    onChange={(e) => setProdQty(e.target.value)}
                    className="w-full text-center text-2xl font-black bg-gray-50 border-2 border-indigo-300 focus:border-indigo-500 text-gray-900 rounded-xl py-2 outline-none font-mono"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Número do Lote
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-500 text-gray-900 rounded-xl px-3 py-3 text-xs font-mono font-bold outline-none"
                    placeholder="Ex: LOTE-20261110"
                  />
                </div>
              </div>

              {/* Validade: Dias ou Data */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Calendar size={14} className="text-indigo-600" /> Controle de Validade (Gera Lote)
                  </span>
                  <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setValidityMode("DAYS")}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${
                        validityMode === "DAYS" ? "bg-indigo-600 text-white" : "text-gray-600"
                      }`}
                    >
                      Por Dias
                    </button>
                    <button
                      type="button"
                      onClick={() => setValidityMode("DATE")}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${
                        validityMode === "DATE" ? "bg-indigo-600 text-white" : "text-gray-600"
                      }`}
                    >
                      Por Data Fixa
                    </button>
                  </div>
                </div>

                {validityMode === "DAYS" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={shelfLifeDays}
                      onChange={(e) => setShelfLifeDays(e.target.value)}
                      className="w-28 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                    />
                    <span className="text-xs text-gray-500">
                      dias de validade (0 = não gerar lote com validade)
                    </span>
                  </div>
                ) : (
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold"
                  />
                )}
              </div>

              {/* Prévia dos insumos e embalagens que serão baixados */}
              <div
                className={`border rounded-xl p-3.5 space-y-2.5 ${
                  productionPreview.hasInsufficient
                    ? "bg-red-50/60 border-red-300"
                    : "bg-indigo-50/40 border-indigo-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-700">
                    Prévia de Baixa (Insumos &amp; Embalagens)
                  </span>
                  <span className="text-xs font-mono font-black text-emerald-700">
                    Custo Total Est.: R$ {fmtBRL(productionPreview.totalCost)}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {productionPreview.rows.map((row: any) => (
                    <div
                      key={row.id}
                      className={`flex items-center justify-between gap-2 text-xs p-2 rounded-lg border ${
                        row.insufficient
                          ? "bg-red-100/80 border-red-300 text-red-900"
                          : row.lowAfter
                          ? "bg-amber-50 border-amber-200 text-amber-900"
                          : "bg-white border-gray-200 text-gray-700"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              row.itemRole === "PACKAGING"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {row.itemRole === "PACKAGING" ? "Embalagem" : "Insumo"}
                          </span>
                          <span className="font-bold truncate">{row.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Saldo atual: {row.currentStock.toFixed(3)} {row.unit}
                          {row.insufficient && " — SALDO INSUFICIENTE!"}
                          {row.lowAfter && " — Saldo ficará baixo"}
                        </span>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <span className="font-black text-red-600 block">
                          -{row.required.toFixed(3)} {row.unit}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          R$ {fmtBRL(row.itemCost)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {productionPreview.hasInsufficient && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-700">
                    <AlertTriangle size={14} /> Um ou mais insumos não possuem saldo suficiente para esta quantidade.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Observações da Produção (Opcional)
                </label>
                <input
                  type="text"
                  value={prodNotes}
                  onChange={(e) => setProdNotes(e.target.value)}
                  placeholder="Ex: Turno da manhã, fornada 01..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProdModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || productionPreview.hasInsufficient}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black py-3 rounded-xl shadow-md text-xs"
                >
                  {submitting ? "Registrando..." : "Confirmar Produção"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
