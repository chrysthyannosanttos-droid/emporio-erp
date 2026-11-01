"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Plus, Search, Filter, Truck, CheckCircle2, Clock, AlertTriangle, ArrowRight, User, Calendar, FileText, X } from "lucide-react";
import Link from "next/link";
import { getB2BOrders, createB2BOrder, updateB2BOrderStatus } from "@/actions/distributionOrder";
import { getPricingData } from "@/actions/pricing";
import { getSellers } from "@/actions/seller";

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Rascunho", color: "bg-gray-100 text-gray-700 border-gray-200" },
  CONFIRMED: { label: "Aprovado / Psd", color: "bg-blue-50 text-blue-700 border-blue-200" },
  PICKING: { label: "Em Separação", color: "bg-amber-50 text-amber-700 border-amber-200" },
  PICKED: { label: "Separado / Conferido", color: "bg-teal-50 text-teal-700 border-teal-200" },
  INVOICED: { label: "Faturado (NF-e)", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  IN_TRANSIT: { label: "Em Transporte", color: "bg-purple-50 text-purple-700 border-purple-200" },
  DELIVERED: { label: "Entregue", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELED: { label: "Cancelado", color: "bg-rose-50 text-rose-700 border-rose-200" },
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

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = productsCatalog.find((p) => p.id === prodId);
    if (prod) {
      setItemUnitPrice(Number(prod.price || 0).toFixed(2));
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = productsCatalog.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const qty = parseFloat(itemQty) || 1;
    const unitPrice = parseFloat(itemUnitPrice) || Number(prod.price || 0);

    setOrderItems([
      ...orderItems,
      {
        productId: prod.id,
        name: prod.name,
        quantity: qty,
        unitPrice,
        total: qty * unitPrice,
        unit: prod.unit || "UN",
      },
    ]);

    setSelectedProductId("");
    setItemQty("1");
    setItemUnitPrice("");
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) {
      alert("Informe o nome do cliente.");
      return;
    }
    if (orderItems.length === 0) {
      alert("Adicione ao menos 1 item ao pedido.");
      return;
    }

    setSubmitting(true);
    const res = await createB2BOrder({
      customerName,
      paymentTerm,
      freightType,
      sellerId: sellerId || undefined,
      notes,
      items: orderItems,
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
    <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="text-blue-600" size={24} />
            Pedidos de Venda B2B
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Gestão comercial para Distribuição, Atacado e Vendas a Prazo.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all text-xs"
        >
          <Plus size={16} />
          Novo Pedido B2B
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, pedido..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all font-medium placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <Filter size={14} className="text-gray-400 shrink-0" />
          {["ALL", "CONFIRMED", "PICKING", "PICKED", "INVOICED", "DELIVERED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
              }`}
            >
              {st === "ALL" ? "Todos" : STATUS_BADGES[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Pedidos */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-gray-500 uppercase tracking-wider border-b border-gray-200 text-[10px] bg-gray-50 font-bold">
                <th className="py-3 px-4">Nº Pedido</th>
                <th className="py-3 px-4">Cliente / Info</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4">Prazo / Frete</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                    Carregando pedidos B2B...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                    Nenhum pedido B2B encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const badge = STATUS_BADGES[o.status] || { label: o.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={o.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {o.orderNumber || `#${o.id.substring(0, 8)}`}
                        <span className="block text-[10px] text-gray-400 font-normal">
                          {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{o.customer?.name || "Cliente Balcão B2B"}</div>
                        {o.notes && <div className="text-[10px] text-gray-500 line-clamp-1">{o.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 font-medium">
                        {o.seller?.name || "Sem Vendedor"}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <div>{o.paymentTerm || "À vista"}</div>
                        <span className="text-[10px] font-bold text-blue-600">{o.freightType || "CIF"}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 text-sm">
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
                          className="bg-gray-50 border border-gray-200 text-gray-800 text-[11px] rounded-lg px-2.5 py-1 outline-none font-medium"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 max-w-3xl w-full shadow-2xl my-8 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-black text-gray-900 mb-4">Novo Pedido de Venda B2B</h2>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Razão Social ou Nome Fantasia"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Vendedor Responsável</label>
                  <select
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">-- Selecione Vendedor --</option>
                    {sellersList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Prazo de Pagamento</label>
                  <select
                    value={paymentTerm}
                    onChange={(e) => setPaymentTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="À vista">À vista (PIX / Dinheiro)</option>
                    <option value="14 dias">Faturado 14 dias</option>
                    <option value="30 dias">Faturado 30 dias</option>
                    <option value="30/60 dias">Faturado 30/60 dias</option>
                    <option value="30/60/90 dias">Faturado 30/60/90 dias</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tipo de Frete</label>
                  <select
                    value={freightType}
                    onChange={(e) => setFreightType(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="CIF">CIF (Emitente/Distribuidor entrega)</option>
                    <option value="FOB">FOB (Cliente retira / paga frete)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Observações / Entrega</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instruções de entrega..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Seção Adicionar Produtos */}
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Adicionar Produtos ao Pedido</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-medium"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-mono outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-2 rounded-xl text-xs transition-all border border-blue-200"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              {/* Lista de Itens Adicionados */}
              {orderItems.length > 0 && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden mt-3">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2 px-3">Produto</th>
                        <th className="py-2 px-3 text-right">Qtd</th>
                        <th className="py-2 px-3 text-right">Preço Un.</th>
                        <th className="py-2 px-3 text-right">Total</th>
                        <th className="py-2 px-3 text-center">Remover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orderItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-gray-900 font-bold">{item.name}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-600">{item.quantity} {item.unit}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-600">R$ {item.unitPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">R$ {item.total.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-red-500 hover:text-red-700 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="bg-gray-50 p-3 text-right border-t border-gray-200">
                    <span className="text-xs text-gray-500 font-bold mr-2">TOTAL DO PEDIDO:</span>
                    <span className="text-base font-black font-mono text-emerald-600">
                      R$ {orderTotalCalculated.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-600 hover:text-gray-900 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/20 disabled:opacity-50"
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
