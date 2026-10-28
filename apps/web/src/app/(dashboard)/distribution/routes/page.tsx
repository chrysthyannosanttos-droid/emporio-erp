"use client";

import { useState, useEffect } from "react";
import { Truck, Plus, Calendar, User, MapPin, CheckCircle2, Clock, AlertTriangle, ArrowRight, Layers } from "lucide-react";
import { getDeliveryRoutes, createDeliveryRoute, addStopToRoute, updateStopStatus } from "@/actions/routes";
import { getB2BOrders } from "@/actions/distributionOrder";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);

  // Modal Nova Rota
  const [showModal, setShowModal] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split("T")[0]);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");

  // Modal Adicionar Pedido na Rota
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [routesRes, ordersRes] = await Promise.all([
      getDeliveryRoutes(),
      getB2BOrders(),
    ]);

    if (routesRes.routes) {
      setRoutes(routesRes.routes);
      setVehicles(routesRes.vehicles || []);
      setDrivers(routesRes.drivers || []);
      if (routesRes.routes.length > 0 && !selectedRoute) {
        setSelectedRoute(routesRes.routes[0]);
      }
    }

    if (ordersRes.orders) {
      // Filtrar pedidos elegíveis (faturados ou separados)
      setAvailableOrders(ordersRes.orders.filter((o: any) => o.status === "PICKED" || o.status === "INVOICED" || o.status === "CONFIRMED"));
    }

    setLoading(false);
  }

  async function handleCreateRoute(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", routeName);
    formData.append("date", routeDate);
    formData.append("vehicleId", vehicleId);
    formData.append("driverId", driverId);
    formData.append("notes", notes);

    const res = await createDeliveryRoute(formData);
    if (res.success && res.route) {
      setShowModal(false);
      setRouteName("");
      setNotes("");
      loadData();
    }
  }

  async function handleAddStop() {
    if (!selectedRoute || !selectedOrderId) return;
    const seq = (selectedRoute.stops?.length || 0) + 1;
    await addStopToRoute({
      routeId: selectedRoute.id,
      orderId: selectedOrderId,
      sequence: seq,
    });

    setShowAddOrderModal(false);
    setSelectedOrderId("");
    loadData();
  }

  async function handleUpdateStop(stopId: string, status: string) {
    await updateStopStatus(stopId, status);
    loadData();
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Truck className="text-indigo-400" />
            Rotas & Roteirização de Entregas
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Gestão de veículos, motoristas e mapa de entregas por cliente.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-xs"
        >
          <Plus size={16} />
          Nova Rota de Entrega
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel Esquerdo: Lista de Rotas */}
        <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-indigo-400 pb-2 border-b border-indigo-500/10">
            Rotas Agendadas ({routes.length})
          </h2>

          {loading ? (
            <div className="py-8 text-center text-slate-500 text-xs">Carregando...</div>
          ) : routes.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">Nenhuma rota criada</div>
          ) : (
            <div className="space-y-2">
              {routes.map((r) => {
                const isSelected = selectedRoute?.id === r.id;
                const stopsCount = r.stops?.length || 0;
                const deliveredCount = r.stops?.filter((s: any) => s.status === "DELIVERED").length || 0;

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoute(r)}
                    className={`cursor-pointer rounded-xl p-3 border transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500 text-white font-semibold"
                        : "bg-[#0c0f1a] border-indigo-500/10 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div>
                      <h3 className="text-xs font-bold text-white">{r.name}</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>📅 {new Date(r.date).toLocaleDateString("pt-BR")}</span>
                        <span>• {deliveredCount}/{stopsCount} entregues</span>
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        r.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {r.status === "COMPLETED" ? "Concluída" : "Em Rota"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel Direito: Sequência da Rota Selecionada */}
        <div className="lg:col-span-3 bg-[#111528] border border-indigo-500/15 rounded-2xl p-5 flex flex-col gap-4">
          {selectedRoute ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-indigo-500/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Rota Selecionada:</span>
                    <h2 className="text-lg font-bold text-white">{selectedRoute.name}</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                    <span>Motorista: {selectedRoute.driver?.name || "Não atribuído"}</span>
                    <span>• Veículo: {selectedRoute.vehicle?.model || "Não atribuído"}</span>
                  </p>
                </div>

                <button
                  onClick={() => setShowAddOrderModal(true)}
                  className="flex items-center gap-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold px-3 py-2 rounded-xl text-xs transition-all border border-indigo-500/30"
                >
                  <Plus size={14} />
                  Incluir Pedido nesta Rota
                </button>
              </div>

              {/* Linha do Tempo / Sequência de Paradas */}
              {selectedRoute.stops && selectedRoute.stops.length > 0 ? (
                <div className="space-y-3">
                  {selectedRoute.stops.map((stop: any, idx: number) => {
                    const isDelivered = stop.status === "DELIVERED";
                    return (
                      <div
                        key={stop.id}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isDelivered
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                            : "bg-[#0c0f1a] border-indigo-500/10 text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-mono font-bold text-xs text-indigo-300 shrink-0">
                            #{stop.sequence}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">
                              {stop.order?.customer?.name || "Cliente Balcão"}
                              <span className="ml-2 font-mono text-xs text-indigo-300">
                                ({stop.order?.orderNumber || `#${stop.order?.id?.substring(0, 8)}`})
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={12} className="text-indigo-400 shrink-0" />
                              {stop.order?.customer?.address || "Endereço principal do cadastrado"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span className="font-mono font-bold text-xs text-emerald-400">
                            R$ {Number(stop.order?.total || 0).toFixed(2)}
                          </span>

                          <select
                            value={stop.status}
                            onChange={(e) => handleUpdateStop(stop.id, e.target.value)}
                            className="bg-[#111528] border border-indigo-500/20 text-xs rounded px-2.5 py-1 text-slate-300 outline-none font-semibold"
                          >
                            <option value="PENDING">Em Rota</option>
                            <option value="DELIVERED">✅ Entregue</option>
                            <option value="NOT_DELIVERED">❌ Ausente / Recusado</option>
                            <option value="RESCHEDULED">🔄 Reagendado</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs">
                  Nenhum pedido atribuído a esta rota ainda. Clique em "Incluir Pedido" acima.
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-slate-500 text-xs">
              Selecione uma rota para visualizar a sequência de entregas.
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar Nova Rota */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Nova Rota de Entrega</h2>
            <form onSubmit={handleCreateRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Rota *</label>
                <input
                  type="text"
                  required
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="Ex: Rota Zona Sul - Segunda"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data Agendada *</label>
                <input
                  type="date"
                  required
                  value={routeDate}
                  onChange={(e) => setRouteDate(e.target.value)}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Motorista</label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Selecione --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Veículo / Placa</label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Selecione --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>
                    ))}
                  </select>
                </div>
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
                  Criar Rota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adicionar Pedido na Rota */}
      {showAddOrderModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Incluir Pedido na Rota</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Selecione o Pedido Elegível</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="">-- Escolha um pedido --</option>
                  {availableOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber || `#${o.id.substring(0, 8)}`} - {o.customer?.name || "Cliente Balcão"} (R$ {Number(o.total).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/30"
                >
                  Confirmar Parada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
