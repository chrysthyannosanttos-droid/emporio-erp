"use client";

import { useState, useEffect } from "react";
import { Tag, Plus, Trash2, Edit3, Check, Search, DollarSign, Layers, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { getPriceTables, createPriceTable, getPriceTableItems, savePriceTableItem, deletePriceTable } from "@/actions/priceTables";
import { getPricingData } from "@/actions/pricing";

export default function PriceTablesPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  
  // Modal Novo/Edição
  const [showModal, setShowModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableType, setNewTableType] = useState("FIXED");
  const [newTableDesc, setNewTableDesc] = useState("");

  // Edição de Preços da Tabela selecionada
  const [tableItems, setTableItems] = useState<any[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [savingItem, setSavingItem] = useState<string | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  async function loadTables() {
    setLoading(true);
    const res = await getPriceTables();
    if (res.tables) {
      setTables(res.tables);
      if (res.tables.length > 0 && !selectedTable) {
        handleSelectTable(res.tables[0]);
      }
    }
    setLoading(false);
  }

  async function handleSelectTable(table: any) {
    setSelectedTable(table);
    const [itemsRes, catalogRes] = await Promise.all([
      getPriceTableItems(table.id),
      getPricingData(),
    ]);

    if (itemsRes.items) {
      setTableItems(itemsRes.items);
      const priceMap: Record<string, number> = {};
      itemsRes.items.forEach((item: any) => {
        priceMap[item.productId] = Number(item.price);
      });
      setEditedPrices(priceMap);
    }
    if (catalogRes.products) {
      setProductsCatalog(catalogRes.products);
    }
  }

  async function handleCreateTable(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", newTableName);
    formData.append("type", newTableType);
    formData.append("description", newTableDesc);

    const res = await createPriceTable(formData);
    if (res.success && res.table) {
      setShowModal(false);
      setNewTableName("");
      setNewTableDesc("");
      loadTables();
      handleSelectTable(res.table);
    }
  }

  async function handleSaveProductPrice(productId: string, currentBasePrice: number) {
    if (!selectedTable) return;
    setSavingItem(productId);
    const priceToSave = editedPrices[productId] ?? currentBasePrice;

    await savePriceTableItem({
      priceTableId: selectedTable.id,
      productId,
      price: priceToSave,
    });

    setSavingItem(null);
  }

  async function handleDeleteTable(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta tabela de preços?")) return;
    await deletePriceTable(id);
    setSelectedTable(null);
    loadTables();
  }

  const filteredProducts = productsCatalog.filter((p) =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Tag className="text-indigo-400" />
            Tabelas de Preço B2B
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Configure preços diferenciados para Varejo, Atacado, Distribuição e Clientes Especiais.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-xs"
        >
          <Plus size={16} />
          Nova Tabela de Preço
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel Esquerdo: Lista de Tabelas */}
        <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-indigo-400 pb-2 border-b border-indigo-500/10">
            Tabelas Cadastradas ({tables.length})
          </h2>

          {loading ? (
            <div className="py-8 text-center text-slate-500 text-xs">Carregando...</div>
          ) : tables.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">Nenhuma tabela cadastrada</div>
          ) : (
            <div className="space-y-2">
              {tables.map((t) => {
                const isSelected = selectedTable?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTable(t)}
                    className={`cursor-pointer rounded-xl p-3 border transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500 text-white font-semibold"
                        : "bg-[#0c0f1a] border-indigo-500/10 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div>
                      <h3 className="text-sm font-bold text-white">{t.name}</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {t.type === "FIXED" ? "Preços Fixos" : t.type === "MARGIN" ? "Baseado em Margem" : "Preço por Volume"} • {t._count?.items || 0} produtos
                      </p>
                    </div>
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(t.id);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        title="Excluir Tabela"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel Direito: Edição de Produtos na Tabela Selecionada */}
        <div className="lg:col-span-3 bg-[#111528] border border-indigo-500/15 rounded-2xl p-5 flex flex-col gap-4">
          {selectedTable ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-indigo-500/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Tabela Selecionada:</span>
                    <h2 className="text-lg font-bold text-white">{selectedTable.name}</h2>
                  </div>
                  {selectedTable.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{selectedTable.description}</p>
                  )}
                </div>

                {/* Filtro de Busca */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar produto ou seção..."
                    className="w-full bg-[#0c0f1a] border border-indigo-500/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Tabela de Produtos & Preços */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-indigo-400/60 uppercase tracking-wider border-b border-indigo-500/10 text-[10px]">
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3">Seção</th>
                      <th className="py-2.5 px-3 text-right">Preço Varejo (Base)</th>
                      <th className="py-2.5 px-3 text-right">Preço Nesta Tabela</th>
                      <th className="py-2.5 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/[0.06]">
                    {filteredProducts.map((p) => {
                      const currentVal = editedPrices[p.id] ?? p.price;
                      const diffPercent = p.price > 0 ? (((currentVal - p.price) / p.price) * 100).toFixed(1) : 0;
                      const isSaving = savingItem === p.id;

                      return (
                        <tr key={p.id} className="hover:bg-indigo-500/[0.03]">
                          <td className="py-3 px-3 font-semibold text-white">
                            {p.name}
                            {p.barcode && <span className="block text-[10px] text-slate-500 font-mono">{p.barcode}</span>}
                          </td>
                          <td className="py-3 px-3 text-slate-400">{p.category || "Geral"}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-400">
                            R$ {Number(p.price).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] font-bold text-slate-500 font-mono">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={currentVal}
                                onChange={(e) =>
                                  setEditedPrices({
                                    ...editedPrices,
                                    [p.id]: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-24 bg-[#0c0f1a] border border-indigo-500/20 rounded px-2 py-1 text-right text-xs text-emerald-400 font-mono font-bold outline-none focus:border-indigo-500"
                              />
                              {Number(diffPercent) !== 0 && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    Number(diffPercent) < 0
                                      ? "bg-rose-500/10 text-rose-400"
                                      : "bg-emerald-500/10 text-emerald-400"
                                  }`}
                                >
                                  {Number(diffPercent) > 0 ? `+${diffPercent}%` : `${diffPercent}%`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleSaveProductPrice(p.id, p.price)}
                              disabled={isSaving}
                              className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50"
                            >
                              {isSaving ? "..." : "Salvar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-500 text-xs">
              Selecione ou crie uma tabela de preços para começar a editar.
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar Nova Tabela */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Nova Tabela de Preço</h2>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Tabela *</label>
                <input
                  type="text"
                  required
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Ex: Tabela Atacado SP, Distribuidor Ouro"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Precificação</label>
                <select
                  value={newTableType}
                  onChange={(e) => setNewTableType(e.target.value)}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="FIXED">Preço Fixo por Produto</option>
                  <option value="MARGIN">Desconto / Margem Percentual</option>
                  <option value="VOLUME">Preço por Volume (Qtd Mínima)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição / Região</label>
                <textarea
                  value={newTableDesc}
                  onChange={(e) => setNewTableDesc(e.target.value)}
                  placeholder="Observações sobre quem utiliza esta tabela..."
                  rows={3}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
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
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/30"
                >
                  Criar Tabela
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
