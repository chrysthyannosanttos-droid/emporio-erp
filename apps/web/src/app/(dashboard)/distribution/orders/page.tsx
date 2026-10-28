"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Plus, Search, Filter, Truck, CheckCircle2, Clock, AlertTriangle, ArrowRight, User, Calendar, FileText } from "lucide-react";
import Link from "next/link";
import { getB2BOrders, createB2BOrder, updateB2BOrderStatus } from "@/actions/distributionOrder";
import { getPricingData } from "@/actions/pricing";
import { getSellers } from "@/actions/seller";

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Rascunho", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  CONFIRMED: { label: "Aprovado / Psd", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  PICKING: { label: "Em Separação", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  PICKED: { label: "Separado / Conferido", color: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  INVOICED: { label: "Faturado (NF-e)", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  IN_TRANSIT: { label: "Em Transporte", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  DELIVERED: { label: "Entregue", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  CANCELED: { label: "Cancelado", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
};

export default function B2BOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal Novo Pedido
  const [showModal, setShowModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("30 dias");
  const [freightType, setFreightType] = useState("CIF");
  const [sellerId, setSellerId] = useState("");
  const [notes, setNotes] = useState("");

  // Itens do Pedido no Modal
  const [productsCatalog, setProductsCatalog] = useState<any[]>([]);
  const [sellersList, setSellersList] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [ordersRes, catalogRes, sellersRes] = await Promise.all([
      getB2BOrders(),
      getPricingData(),
      getSellers(),
    ]);

    if (ordersRes.orders) setOrders(ordersRes.orders);
    if (catalogRes.products) setProductsCatalog(catalogRes.products);
    if (sellersRes.sellers) setSellersList(sellersRes.sellers);
    setLoading(false);
  }

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const prod = productsCatalog.find((p) => p.id === id);
    if (prod) {
      setItemUnitPrice(String(prod.price));
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = productsCatalog.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const qty = parseFloat(itemQty) || 1;
    const price = parseFloat(itemUnitPrice) || prod.price;

    setOrderItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        name: prod.name,
        unit: prod.unit || "UN",
        quantity: qty,
        unitPrice: price,
        total: qty * price,
      },
    ]);

    setSelectedProductId("");
    setItemQty("1");
    setItemUnitPrice("");
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert("Adicione pelo menos 1 produto ao pedido.");
      return;
    }
    setSubmitting(true);

    const res = await createB2BOrder({
      sellerId: sellerId || undefined,
      paymentTerm,
      freightType,
      notes: notes ? `Cliente: ${customerName} | ${notes}` : `Cliente: ${customerName}`,
      items: orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    setSubmitting(false);
    if (res.success) {
      setShowModal(false);
      setOrderItems([]);
      setCustomerName("");
      setNotes("");
      loadData();
    } else {
      alert(res.error || "Erro ao criar pedido");
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateB2BOrderStatus(orderId, newStatus);
    loadData();
  };

  const orderTotalCalculated = orderItems.reduce((acc, item) => acc + item.total, 0);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      (o.orderNumber && o.orderNumber.toLowerCase().includes(search.toLowerCase())) ||
      (o.customer?.name && o.customer.name.toLowerCase().includes(search.toLowerCase())) ||
      (o.notes && o.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="text-indigo-400" />
            Pedidos de Venda B2B
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Gestão comercial para Distribuição, Atacado e Vendas a Prazo.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-xs"
        >
          <Plus size={16} />
          Novo Pedido B2B
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, pedido..."
            className="w-full bg-[#0c0f1a] border border-indigo-500/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <Filter size={14} className="text-slate-500 shrink-0" />
          {["ALL", "CONFIRMED", "PICKING", "PICKED", "INVOICED", "DELIVERED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-[#0c0f1a] border border-indigo-500/10 text-slate-400 hover:text-white"
              }`}
            >
              {st === "ALL" ? "Todos" : STATUS_BADGES[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Pedidos */}
      <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-indigo-400/60 uppercase tracking-wider border-b border-indigo-500/10 text-[10px] bg-[#0c0f1a]/40">
                <th className="py-3 px-4">Nº Pedido</th>
                <th className="py-3 px-4">Cliente / Info</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4">Prazo / Frete</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Carregando pedidos B2B...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Nenhum pedido B2B encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const badge = STATUS_BADGES[o.status] || { label: o.status, color: "bg-slate-500/20 text-slate-400" };
                  return (
                    <tr key={o.id} className="hover:bg-indigo-500/[0.03]">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                        {o.orderNumber || `#${o.id.substring(0, 8)}`}
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{o.customer?.name || "Cliente Balcão B2B"}</div>
                        {o.notes && <div className="text-[10px] text-slate-400 line-clamp-1">{o.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {o.seller?.name || "Sem Vendedor"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <div>{o.paymentTerm || "À vista"}</div>
                        <span className="text-[10px] font-bold text-indigo-400/80">{o.freightType || "CIF"}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-400 text-sm">
                        R$ {Number(o.total).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusChange(o.id, e.target.value)}
                          className="bg-[#0c0f1a] border border-indigo-500/20 text-slate-300 text-[11px] rounded px-2 py-1 outline-none"
                        >
                          <option value="DRAFT">Rascunho</option>
                          <option value="CONFIRMED">Aprovado</option>
                          <option value="PICKING">Em Separação</option>
                          <option value="PICKED">Separado</option>
                          <option value="INVOICED">Faturado</option>
                          <option value="IN_TRANSIT">Em Transporte</option>
                          <option value="DELIVERED">Entregue</option>
                          <option value="CANCELED">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Pedido B2B */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-2xl p-6 max-w-3xl w-full shadow-2xl my-8">
            <h2 className="text-lg font-bold text-white mb-4">Novo Pedido de Venda B2B</h2>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Razão Social ou Nome Fantasia"
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Vendedor Responsável</label>
                  <select
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Selecione Vendedor --</option>
                    {sellersList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Prazo de Pagamento</label>
                  <select
                    value={paymentTerm}
                    onChange={(e) => setPaymentTerm(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value="À vista">À vista (PIX / Dinheiro)</option>
                    <option value="14 dias">Faturado 14 dias</option>
                    <option value="30 dias">Faturado 30 dias</option>
                    <option value="30/60 dias">Faturado 30/60 dias</option>
                    <option value="30/60/90 dias">Faturado 30/60/90 dias</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Frete</label>
                  <select
                    value={freightType}
                    onChange={(e) => setFreightType(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value="CIF">CIF (Emitente/Distribuidor entrega)</option>
                    <option value="FOB">FOB (Cliente retira / paga frete)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Observações / Entrega</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instruções de entrega..."
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Seção Adicionar Produtos */}
              <div className="pt-3 border-t border-indigo-500/10">
                <label className="block text-xs font-bold text-indigo-400 uppercase mb-2">Adicionar Produtos ao Pedido</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Selecione o Produto --</option>
                      {productsCatalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (R$ {Number(p.price).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="number"
                      step="0.01"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      placeholder="Qtd"
                      className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold py-2 rounded-xl text-xs transition-all border border-indigo-500/30"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              {/* Lista de Itens Adicionados */}
              {orderItems.length > 0 && (
                <div className="border border-indigo-500/15 rounded-xl overflow-hidden mt-3">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0c0f1a] text-indigo-400/70 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Produto</th>
                        <th className="py-2 px-3 text-right">Qtd</th>
                        <th className="py-2 px-3 text-right">Preço Un.</th>
                        <th className="py-2 px-3 text-right">Total</th>
                        <th className="py-2 px-3 text-center">Remover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/10">
                      {orderItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-white font-medium">{item.name}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">{item.quantity} {item.unit}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">R$ {item.unitPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">R$ {item.total.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-400 hover:text-rose-300 text-xs"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="bg-[#0c0f1a] p-3 text-right border-t border-indigo-500/10">
                    <span className="text-xs text-slate-400 font-bold mr-2">TOTAL DO PEDIDO:</span>
                    <span className="text-base font-black font-mono text-emerald-400">
                      R$ {orderTotalCalculated.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
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
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? "Gerando Pedido..." : "Confirmar Pedido B2B"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
