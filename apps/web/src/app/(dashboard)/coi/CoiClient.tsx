"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Sliders, ArrowDownLeft, ArrowUpRight, Search, Plus, Check,
  AlertTriangle, CheckCircle2, X, RefreshCw, Layers, DollarSign,
  Package, FileText, ArrowLeft, ArrowRightLeft, ShieldCheck, Tag,
  ShoppingBag, Trash2, Edit2, Play, ChevronRight
} from "lucide-react";
import Link from "next/link";
import {
  CoiDTO, CoiStats, createCoi, updateCoi,
  executeStockMovementByCoi, getRecentCoiMovements
} from "@/actions/coi";
import { searchProductsForAsset } from "@/actions/assets";

interface Props {
  initialCois: CoiDTO[];
  initialStats: CoiStats;
}

export function CoiClient({ initialCois, initialStats }: Props) {
  const [cois, setCois] = useState<CoiDTO[]>(initialCois);
  const [stats, setStats] = useState<CoiStats>(initialStats);
  const [activeTab, setActiveTab] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [search, setSearch] = useState("");

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);

  // Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form de Criação de COI
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    type: "OUT" as "IN" | "OUT",
    stockMovement: "SUBTRACT" as "ADD" | "SUBTRACT" | "NONE",
    financialImpact: "EXPENSE" as "PAYABLE" | "RECEIVABLE" | "EXPENSE" | "NONE",
    defaultCfop: "",
    costCenter: "",
    requiresApproval: false,
  });
  const [savingCoi, setSavingCoi] = useState(false);

  // Form de Lançamento por COI
  const [selectedCoiId, setSelectedCoiId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productsList, setProductsList] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [movementQty, setMovementQty] = useState("1");
  const [movementNotes, setMovementNotes] = useState("");
  const [executingMovement, setExecutingMovement] = useState(false);

  // Carrega histórico recente de movimentos
  useEffect(() => {
    getRecentCoiMovements(10).then((res) => {
      setRecentMovements(res.movements || []);
    });
  }, []);

  // Busca produtos no modal de lançamento
  useEffect(() => {
    if (!isMovementModalOpen) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await searchProductsForAsset(productSearch);
      if (!cancelled) setProductsList(res.products || []);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [productSearch, isMovementModalOpen]);

  // Filtra COIs por aba e busca
  const filteredCois = useMemo(() => {
    return cois.filter((c) => {
      if (activeTab !== "ALL" && c.type !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const mCode = c.code.toLowerCase().includes(q);
        const mName = c.name.toLowerCase().includes(q);
        const mCfop = c.defaultCfop?.toLowerCase().includes(q) ?? false;
        const mCost = c.costCenter?.toLowerCase().includes(q) ?? false;
        if (!mCode && !mName && !mCfop && !mCost) return false;
      }
      return true;
    });
  }, [cois, activeTab, search]);

  const handleCreateCoi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) return;

    setSavingCoi(true);
    const res = await createCoi({
      code: formData.code,
      name: formData.name,
      description: formData.description,
      type: formData.type,
      stockMovement: formData.stockMovement,
      financialImpact: formData.financialImpact,
      defaultCfop: formData.defaultCfop || undefined,
      costCenter: formData.costCenter || undefined,
      requiresApproval: formData.requiresApproval,
    });

    setSavingCoi(false);
    if (res.success) {
      setCois((prev) => [
        ...prev,
        {
          id: `coi-${formData.code}`,
          code: formData.code,
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          stockMovement: formData.stockMovement,
          financialImpact: formData.financialImpact,
          defaultCfop: formData.defaultCfop || null,
          costCenter: formData.costCenter || null,
          requiresApproval: formData.requiresApproval,
          active: true,
          isSystemStandard: false,
          movementsCount: 0,
        },
      ]);
      setIsCreateModalOpen(false);
      setFeedback({ type: "success", message: `COI ${formData.code} cadastrado com sucesso!` });
    } else {
      setFeedback({ type: "error", message: res.error || "Erro ao criar COI." });
    }
  };

  const handleExecuteMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoiId || !selectedProduct) return;

    setExecutingMovement(true);
    const res = await executeStockMovementByCoi({
      coiId: selectedCoiId,
      productId: selectedProduct.id,
      quantity: parseFloat(movementQty) || 1,
      notes: movementNotes,
    });

    setExecutingMovement(false);
    if (res.success) {
      setIsMovementModalOpen(false);
      setSelectedProduct(null);
      setMovementQty("1");
      setMovementNotes("");
      setFeedback({ type: "success", message: res.message || "Movimentação executada com sucesso!" });
      getRecentCoiMovements(10).then((r) => setRecentMovements(r.movements || []));
    } else {
      setFeedback({ type: "error", message: res.error || "Erro ao executar movimentação." });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-16 max-w-7xl mx-auto px-2 sm:px-4 md:px-0 select-none animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/stock"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Voltar ao Estoque"
            >
              <ArrowLeft size={18} />
            </Link>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              Gestão de Movimentos & Regras Fiscais
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Códigos de Operação Interna (COI)
          </h1>
          <p className="text-xs text-slate-400">
            Regras de entrada, saída, transferências, perdas e consumo interno vinculados ao estoque, financeiro e CFOP.
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
          {/* Lançar Movimento Avulso */}
          <button
            type="button"
            onClick={() => {
              setIsMovementModalOpen(true);
              setSelectedCoiId(cois[0]?.id || "");
              setSelectedProduct(null);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Lançar consumo interno, quebra, sobra ou transferência manual"
          >
            <Play size={16} />
            <span>Lançar Movimento por COI</span>
          </button>

          {/* Novo COI */}
          <button
            type="button"
            onClick={() => {
              setFormData({
                code: "",
                name: "",
                description: "",
                type: "OUT",
                stockMovement: "SUBTRACT",
                financialImpact: "EXPENSE",
                defaultCfop: "",
                costCenter: "",
                requiresApproval: false,
              });
              setIsCreateModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Novo COI</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total de COIs</span>
            <Sliders size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Operações mapeadas</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">COIs de Entrada</span>
            <ArrowDownLeft size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{stats.inCount}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Compras, sobras e devoluções</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">COIs de Saída</span>
            <ArrowUpRight size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{stats.outCount}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Vendas, quebras e consumo</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Movem Estoque</span>
            <Package size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{stats.stockAffectingCount}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Altera saldo físico</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Impacto Financeiro</span>
            <DollarSign size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{stats.financialAffectingCount}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Pagar, Receber ou Despesa</p>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between animate-in slide-in-from-top-2 border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Abas */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold self-start">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              Todos ({cois.length})
            </button>
            <button
              onClick={() => setActiveTab("IN")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                activeTab === "IN" ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <ArrowDownLeft size={14} />
              <span>Entradas ({stats.inCount})</span>
            </button>
            <button
              onClick={() => setActiveTab("OUT")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                activeTab === "OUT" ? "bg-rose-600 text-white shadow-sm" : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              <ArrowUpRight size={14} />
              <span>Saídas ({stats.outCount})</span>
            </button>
          </div>

          {/* Busca */}
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código (001), nome, CFOP..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-600 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Lista de COIs */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black text-slate-900">
            Tabela de Operações Internas Mapeadas
          </h2>
          <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full">
            {filteredCois.length} registros
          </span>
        </div>

        {/* 1. VISÃO EM CARDS PARA SMARTPHONES (md:hidden) */}
        <div className="block md:hidden divide-y divide-slate-100 p-2 sm:p-3 space-y-2">
          {filteredCois.map((c) => {
            const isEntry = c.type === "IN";
            return (
              <div key={c.id} className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-md ${
                        isEntry ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"
                      }`}>
                        COI {c.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isEntry ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}>
                        {isEntry ? "📥 ENTRADA" : "📤 SAÍDA"}
                      </span>
                      {c.defaultCfop && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                          CFOP {c.defaultCfop}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">
                      {c.name}
                    </h3>
                    {c.description && (
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {c.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Estoque</span>
                    <span className={`font-black ${
                      c.stockMovement === "ADD" ? "text-emerald-700" : c.stockMovement === "SUBTRACT" ? "text-rose-700" : "text-slate-500"
                    }`}>
                      {c.stockMovement === "ADD" ? "Soma (+)" : c.stockMovement === "SUBTRACT" ? "Subtrai (-)" : "Não Altera"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Financeiro / DRE</span>
                    <span className="font-bold text-slate-700">
                      {c.financialImpact === "PAYABLE" && "A Pagar"}
                      {c.financialImpact === "RECEIVABLE" && "A Receber"}
                      {c.financialImpact === "EXPENSE" && "Despesa / Perda"}
                      {c.financialImpact === "NONE" && "Sem Financeiro"}
                    </span>
                  </div>
                </div>

                {c.costCenter && (
                  <p className="text-[10px] text-slate-500 pt-0.5">
                    Centro de Custo: <strong className="text-slate-700">{c.costCenter}</strong>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* 2. VISÃO EM TABELA PARA DESKTOP (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Descrição da Operação</th>
                <th className="py-3 px-4 text-center">Tipo</th>
                <th className="py-3 px-4 text-center">Estoque</th>
                <th className="py-3 px-4 text-center">Financeiro / DRE</th>
                <th className="py-3 px-4 text-center">CFOP Vinculado</th>
                <th className="py-3 px-4">Centro de Custo</th>
                <th className="py-3 px-4 text-center">Aprovação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCois.map((c) => {
                const isEntry = c.type === "IN";
                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-black text-slate-900">
                      <span className={`px-2 py-0.5 rounded ${
                        isEntry ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"
                      }`}>
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{c.name}</span>
                      {c.description && (
                        <span className="text-[11px] text-slate-400 block max-w-md truncate">
                          {c.description}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isEntry ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}>
                        {isEntry ? "📥 ENTRADA" : "📤 SAÍDA"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs font-black ${
                        c.stockMovement === "ADD" ? "text-emerald-700" : c.stockMovement === "SUBTRACT" ? "text-rose-700" : "text-slate-400"
                      }`}>
                        {c.stockMovement === "ADD" ? "+ Soma" : c.stockMovement === "SUBTRACT" ? "- Subtrai" : "Neutro"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-semibold text-slate-700">
                        {c.financialImpact === "PAYABLE" && "Contas a Pagar"}
                        {c.financialImpact === "RECEIVABLE" && "Contas a Receber"}
                        {c.financialImpact === "EXPENSE" && "Despesa / Perda"}
                        {c.financialImpact === "NONE" && "Sem Financeiro"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {c.defaultCfop ? (
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          {c.defaultCfop}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {c.costCenter || "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {c.requiresApproval ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          Gerente
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Livre</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico Recente de Movimentos Realizados */}
      {recentMovements.length > 0 && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-indigo-600" />
            <span>Últimas Movimentações Operacionais por COI</span>
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {recentMovements.map((m) => (
              <div key={m.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">
                    [COI {m.coiCode}] {m.productName}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Qtd: <strong>{m.quantity}</strong> • Operador: {m.operatorName} • {m.createdAt}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-700 block">
                    R$ {m.totalCost.toFixed(2)}
                  </span>
                  <span className={`text-[10px] font-bold ${
                    m.coiType === "IN" ? "text-emerald-700" : "text-rose-700"
                  }`}>
                    {m.coiType === "IN" ? "Entrada" : "Saída"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: LANÇAR MOVIMENTO POR COI */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Play size={18} className="text-emerald-600" />
                  <span>Lançamento Operacional por COI</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Registre saídas de consumo interno, quebras, sobras ou transferências.
                </p>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExecuteMovement} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  1. Selecione o Código de Operação (COI) *
                </label>
                <select
                  required
                  value={selectedCoiId}
                  onChange={(e) => setSelectedCoiId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none"
                >
                  <optgroup label="📤 Operações de Saída">
                    {cois.filter((c) => c.type === "OUT").map((c) => (
                      <option key={c.id} value={c.id}>
                        COI {c.code} - {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📥 Operações de Entrada">
                    {cois.filter((c) => c.type === "IN").map((c) => (
                      <option key={c.id} value={c.id}>
                        COI {c.code} - {c.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  2. Localizar Produto no Estoque *
                </label>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Digite o nome, PLU ou código de barras..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />

                <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto mt-1 divide-y divide-slate-100 bg-slate-50">
                  {productsList.length === 0 ? (
                    <p className="p-2 text-center text-xs text-slate-400">Digite para buscar produto...</p>
                  ) : (
                    productsList.map((p) => {
                      const isSel = selectedProduct?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProduct(p)}
                          className={`p-2 cursor-pointer text-xs flex justify-between items-center ${
                            isSel ? "bg-emerald-50 border-l-4 border-emerald-600" : "hover:bg-white"
                          }`}
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{p.name}</span>
                            <span className="text-[10px] text-slate-400">PLU #{p.internalCode || "-"} • Estoque Atual: {p.stock} {p.unit}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-700">R$ {p.cost.toFixed(2)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedProduct && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Item Selecionado</span>
                    <strong className="text-slate-900">{selectedProduct.name}</strong>
                  </div>
                  <span className="text-xs font-bold text-slate-600">Estoque: {selectedProduct.stock} {selectedProduct.unit}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantidade *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={movementQty}
                    onChange={(e) => setMovementQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Motivo / Observações</label>
                  <input
                    type="text"
                    value={movementNotes}
                    onChange={(e) => setMovementNotes(e.target.value)}
                    placeholder="Ex: Quebra no manuseio, consumo equipe..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedProduct || executingMovement}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {executingMovement ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Confirmar Movimentação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CRIAR NOVO COI */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Novo Código de Operação (COI)
                </h3>
                <p className="text-xs text-slate-400">
                  Defina o fluxo de entrada/saída, estoque e impacto fiscal.
                </p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCoi} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ex: 108"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nome da Operação *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Saída para Degustação de Clientes"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Finalidade e regras desta operação..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tipo de Operação</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    <option value="IN">📥 Entrada</option>
                    <option value="OUT">📤 Saída</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Efeito no Estoque</label>
                  <select
                    value={formData.stockMovement}
                    onChange={(e) => setFormData({ ...formData, stockMovement: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    <option value="ADD">Soma (+)</option>
                    <option value="SUBTRACT">Subtrai (-)</option>
                    <option value="NONE">Não altera saldo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Impacto Financeiro / DRE</label>
                  <select
                    value={formData.financialImpact}
                    onChange={(e) => setFormData({ ...formData, financialImpact: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    <option value="EXPENSE">Despesa / Custo Operacional</option>
                    <option value="PAYABLE">Contas a Pagar</option>
                    <option value="RECEIVABLE">Contas a Receber</option>
                    <option value="NONE">Sem Efeito Financeiro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">CFOP Padrão</label>
                  <input
                    type="text"
                    value={formData.defaultCfop}
                    onChange={(e) => setFormData({ ...formData, defaultCfop: e.target.value })}
                    placeholder="Ex: 5.949"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCoi}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {savingCoi ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Gravar COI</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

