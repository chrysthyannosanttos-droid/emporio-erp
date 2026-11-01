"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Search,
  Plus,
  X,
  Package,
  FileText,
  Hash,
  Calendar,
  Tag,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  getLossesAndExpirationsData,
  registerLossRecord,
  registerProductBatch,
  applyBatchMarkdownPrice,
} from "@/actions/losses";

export default function LossesAndExpirationsPage() {
  const [activeTab, setActiveTab] = useState<"LOSSES" | "EXPIRATIONS">("EXPIRATIONS");
  const [products, setProducts] = useState<any[]>([]);
  const [expirations, setExpirations] = useState<any[]>([]);
  const [losses, setLosses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [selectedPromoItem, setSelectedPromoItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [daysFilter, setDaysFilter] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await getLossesAndExpirationsData();
      if (res.success) {
        setProducts(res.products || []);
        setExpirations(res.expirations || []);
        setLosses(res.losses || []);
      }
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(null), 4500);
  }

  async function handleAddLoss(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    const productId = f.get("productId") as string;
    const quantity = Number(f.get("qty"));
    const reason = (f.get("reason") as string) || "Avaria / Vencimento";
    const nfe = (f.get("nfe") as string) || "";

    const res = await registerLossRecord({ productId, quantity, reason, nfe });
    setSubmitting(false);

    if (res.success) {
      setIsLossModalOpen(false);
      await loadData();
      showToast("Perda registrada no banco de dados e estoque baixado automaticamente!");
    } else {
      alert(res.error || "Erro ao registrar perda.");
    }
  }

  async function handleAddBatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    const productId = f.get("productId") as string;
    const batchNumber = f.get("batchNumber") as string;
    const expirationDate = f.get("expirationDate") as string;
    const quantity = Number(f.get("quantity"));

    const res = await registerProductBatch({
      productId,
      batchNumber,
      expirationDate,
      quantity,
    });
    setSubmitting(false);

    if (res.success) {
      setIsBatchModalOpen(false);
      await loadData();
      showToast("Novo lote e validade salvos no banco de dados!");
    } else {
      alert(res.error || "Erro ao cadastrar lote.");
    }
  }

  async function handleApplyPromo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPromoItem) return;
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    const newPrice = Number(f.get("newPrice"));

    const res = await applyBatchMarkdownPrice({
      productId: selectedPromoItem.productId,
      newPrice,
    });
    setSubmitting(false);

    if (res.success) {
      setIsPromoModalOpen(false);
      setSelectedPromoItem(null);
      await loadData();
      showToast(
        `Preço de "${selectedPromoItem.product}" atualizado para R$ ${newPrice.toFixed(2)} no PDV e enviado para a fila de Etiquetas!`
      );
    } else {
      alert(res.error || "Erro ao aplicar rebaixa de preço.");
    }
  }

  const filteredLosses = losses.filter(
    (i) =>
      i.product.toLowerCase().includes(search.toLowerCase()) ||
      i.reason.toLowerCase().includes(search.toLowerCase())
  );

  const filteredExpirations = expirations.filter((i) => {
    const matchesSearch =
      i.product.toLowerCase().includes(search.toLowerCase()) ||
      i.batch.toLowerCase().includes(search.toLowerCase());
    if (!daysFilter) return matchesSearch;
    if (daysFilter === 5) return matchesSearch && i.daysLeft <= 5;
    if (daysFilter === 10) return matchesSearch && i.daysLeft > 5 && i.daysLeft <= 10;
    if (daysFilter === 15) return matchesSearch && i.daysLeft > 10 && i.daysLeft <= 15;
    return matchesSearch && i.daysLeft > 15;
  });

  return (
    <div className="h-full flex flex-col gap-5 pb-12">
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <AlertTriangle className="text-amber-600" size={28} />
            Perdas & Validades (Integrado ao Estoque Real)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitoramento de lotes perecíveis (doces, carnes, laticínios) e baixa automática de perdas no banco de dados.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 text-xs"
          >
            <Calendar size={15} /> + Novo Lote / Validade
          </button>
          <button
            onClick={() => setIsLossModalOpen(true)}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-red-600/20 text-xs"
          >
            <Plus size={15} /> Registrar Perda (Baixar Estoque)
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          {bannerMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#c4d5ee] pb-px shrink-0">
        <button
          onClick={() => setActiveTab("EXPIRATIONS")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "EXPIRATIONS"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Calendar size={16} /> Validades e Lotes ({expirations.length})
        </button>
        <button
          onClick={() => setActiveTab("LOSSES")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "LOSSES"
              ? "border-red-500 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <AlertTriangle size={16} /> Histórico de Perdas ({losses.length})
        </button>
      </div>

      {/* EXPIRATIONS TAB */}
      {activeTab === "EXPIRATIONS" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            {[
              { days: 5, label: "Crítico (Até 5 dias)", color: "text-red-600", count: expirations.filter((i) => i.daysLeft <= 5).length },
              { days: 10, label: "6 a 10 Dias", color: "text-amber-600", count: expirations.filter((i) => i.daysLeft > 5 && i.daysLeft <= 10).length },
              { days: 15, label: "11 a 15 Dias", color: "text-yellow-600", count: expirations.filter((i) => i.daysLeft > 10 && i.daysLeft <= 15).length },
              { days: 30, label: "Acima de 15 Dias", color: "text-emerald-600", count: expirations.filter((i) => i.daysLeft > 15).length },
            ].map((card) => (
              <button
                key={card.days}
                onClick={() => setDaysFilter(daysFilter === card.days ? null : card.days)}
                className={`bg-[#fbfdff] border rounded-2xl p-4 flex flex-col items-center justify-center gap-1 transition-all ${
                  daysFilter === card.days
                    ? "border-blue-600 ring-2 ring-blue-500/20"
                    : "border-[#c4d5ee] hover:border-blue-300"
                }`}
              >
                <div className={`text-3xl font-black ${card.color}`}>{card.count}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</div>
              </button>
            ))}
          </div>

          <div className="bg-[#fbfdff] rounded-2xl border border-[#c4d5ee] overflow-hidden flex-1 flex flex-col min-h-0 shadow-sm">
            <div className="p-4 border-b border-[#c4d5ee] shrink-0 flex gap-4 items-center justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder="Buscar produto ou código do lote..."
                  className="w-full pl-9 pr-4 py-2 bg-[#f3f7fe] border border-[#c4d5ee] focus:border-blue-500 text-gray-900 rounded-lg outline-none text-sm font-medium"
                />
              </div>
              {daysFilter && (
                <button
                  onClick={() => setDaysFilter(null)}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Limpar filtro de prazo
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#f3f7fe] border-b border-[#c4d5ee] text-slate-600 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Produto</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Lote / Origem</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Qtd. Lote</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Validade</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Prazo</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px] text-right">Ação Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dce7f7]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-semibold">
                        Carregando lotes e validades do banco...
                      </td>
                    </tr>
                  ) : filteredExpirations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        Nenhum lote encontrado para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredExpirations.map((i) => (
                      <tr key={i.id} className="hover:bg-blue-50/40">
                        <td className="px-6 py-3.5 font-bold text-gray-900">{i.product}</td>
                        <td className="px-6 py-3.5 text-slate-600 font-mono text-xs">
                          {i.batch}{" "}
                          {i.source === "PRODUCAO" && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                              Produção Própria
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-slate-700 font-bold">
                          {i.qty} {i.unit}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 font-mono text-xs font-bold">
                          {i.dateFormatted}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black ${
                              i.daysLeft <= 5
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : i.daysLeft <= 15
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {i.daysLeft <= 0 ? "Vencido" : `${i.daysLeft} dias`}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {i.productId && (
                            <button
                              onClick={() => {
                                setSelectedPromoItem(i);
                                setIsPromoModalOpen(true);
                              }}
                              className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5"
                            >
                              <Tag size={12} /> Precificar Rebaixa <ArrowRight size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* LOSSES TAB */}
      {activeTab === "LOSSES" && (
        <div className="bg-[#fbfdff] rounded-2xl border border-[#c4d5ee] overflow-hidden flex-1 flex flex-col min-h-0 shadow-sm">
          <div className="p-4 border-b border-[#c4d5ee] shrink-0 flex gap-4 items-center justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="text"
                placeholder="Buscar perda registrada..."
                className="w-full pl-9 pr-4 py-2 bg-[#f3f7fe] border border-[#c4d5ee] focus:border-blue-500 text-gray-900 rounded-lg outline-none text-sm font-medium"
              />
            </div>
            <div className="text-xs font-bold text-slate-600">
              Total de registros: <span className="text-red-600 font-black">{filteredLosses.length}</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            {filteredLosses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertTriangle size={42} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium text-sm">Nenhum registro de perda encontrado.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-[#f3f7fe] border-b border-[#c4d5ee] text-slate-600 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Data / Hora</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Produto</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Qtd. Baixada</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Motivo / NF</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Responsável</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dce7f7]">
                  {filteredLosses.map((i) => (
                    <tr key={i.id} className="hover:bg-red-50/30">
                      <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{i.dateFormatted}</td>
                      <td className="px-6 py-3.5 font-bold text-gray-900">{i.product}</td>
                      <td className="px-6 py-3.5 text-red-600 font-black">
                        -{i.qty} {i.unit}
                      </td>
                      <td className="px-6 py-3.5 text-slate-700 text-xs font-medium">{i.reason}</td>
                      <td className="px-6 py-3.5 text-slate-600 text-xs">{i.userName}</td>
                      <td className="px-6 py-3.5">
                        <span className="text-[10px] px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 font-bold rounded-lg uppercase">
                          Estoque Baixado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal: Registrar Perda (com baixa real no estoque) */}
      {isLossModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#c4d5ee] flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={18} /> Lançar Perda / Avaria (Baixa Real no Estoque)
              </h3>
              <button
                onClick={() => setIsLossModalOpen(false)}
                className="text-slate-500 hover:bg-[#eaf1fc] p-1.5 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddLoss} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={12} /> Produto do Estoque
                  </label>
                  <select
                    name="productId"
                    required
                    autoFocus
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-3 rounded-xl outline-none focus:border-red-500 text-sm font-semibold"
                  >
                    <option value="">Selecione um produto cadastrado...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Estoque atual: {p.stock} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash size={12} /> Quantidade Perdida
                  </label>
                  <input
                    name="qty"
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-red-500 font-mono text-base font-bold"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={12} /> Motivo da Perda
                  </label>
                  <select
                    name="reason"
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-3 py-2.5 rounded-xl outline-none focus:border-red-500 text-sm font-semibold"
                  >
                    <option value="Vencimento de Validade">Vencimento de Validade</option>
                    <option value="Avaria / Embalagem Danificada">Avaria / Embalagem Danificada</option>
                    <option value="Quebra na Produção / Descarte">Quebra na Produção / Descarte</option>
                    <option value="Furto / Divergência de Inventário">Furto / Divergência de Inventário</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Nota Fiscal / Lote / Observação (Opcional)
                  </label>
                  <input
                    name="nfe"
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-red-500 text-sm"
                    placeholder="Ex: Lote L-204 ou NF 8841"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-[#c4d5ee]">
                <button
                  type="button"
                  onClick={() => setIsLossModalOpen(false)}
                  className="flex-1 bg-[#eaf1fc] hover:bg-[#dce7f7] text-gray-800 font-bold py-3 rounded-xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl shadow-md shadow-red-600/20 text-sm transition-all disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : "CONFIRMAR BAIXA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Novo Lote / Validade */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#c4d5ee] flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="text-blue-600" size={18} /> Cadastrar Lote e Data de Validade
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-500 hover:bg-[#eaf1fc] p-1.5 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddBatch} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Produto
                  </label>
                  <select
                    name="productId"
                    required
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-3 rounded-xl outline-none focus:border-blue-500 text-sm font-semibold"
                  >
                    <option value="">Selecione um produto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Código do Lote
                  </label>
                  <input
                    name="batchNumber"
                    required
                    defaultValue={`L-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`}
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-blue-500 font-mono text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Quantidade no Lote
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    defaultValue="10"
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-blue-500 font-mono text-sm font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Data de Vencimento
                  </label>
                  <input
                    name="expirationDate"
                    type="date"
                    required
                    defaultValue={new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]}
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-blue-500 text-sm font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-[#c4d5ee]">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="flex-1 bg-[#eaf1fc] hover:bg-[#dce7f7] text-gray-800 font-bold py-3 rounded-xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-md shadow-blue-500/20 text-sm transition-all disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : "SALVAR LOTE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Precificar Rebaixa */}
      {isPromoModalOpen && selectedPromoItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#c4d5ee] flex justify-between items-center bg-blue-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Tag className="text-blue-600" size={18} /> Precificar Rebaixa de Validade
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Atualiza o preço no PDV e envia para impressão de etiqueta
                </p>
              </div>
              <button
                onClick={() => setIsPromoModalOpen(false)}
                className="text-slate-500 hover:text-gray-900 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleApplyPromo} className="p-5 space-y-4">
              <div className="bg-[#f3f7fe] border border-[#c4d5ee] rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-900 text-base">{selectedPromoItem.product}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Lote: {selectedPromoItem.batch} • Vence em {selectedPromoItem.daysLeft} dias
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Preço Atual</span>
                    <span className="block text-sm font-black text-slate-700">
                      R$ {Number(selectedPromoItem.currentPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-blue-700 mb-1.5 uppercase tracking-wider">
                  Novo Preço Promocional (R$)
                </label>
                <input
                  name="newPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  defaultValue={Math.max(0.5, Number(selectedPromoItem.currentPrice || 1) * 0.75).toFixed(2)}
                  className="w-full bg-[#f3f7fe] border-2 border-blue-300 text-gray-900 font-black text-2xl px-4 py-3 rounded-xl outline-none focus:border-blue-600"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="flex-1 bg-[#eaf1fc] text-gray-800 font-bold py-3 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-sm shadow-md shadow-blue-500/20"
                >
                  {submitting ? "Aplicando..." : "APLICAR PREÇO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
