"use client";

import { useState, useEffect } from "react";
import {
  ChefHat, Clock, CheckCircle2, AlertTriangle, Printer, Filter,
  RefreshCw, Utensils, Flame, Pizza, Wine, ArrowRight, Play, Check
} from "lucide-react";

type TicketStatus = "NEW" | "PREPARING" | "READY" | "SERVED";
type Sector = "ALL" | "KITCHEN" | "GRILL" | "PIZZERIA" | "BAR";

interface TicketItem {
  name: string;
  quantity: number;
  notes?: string;
  additions?: string[];
}

interface Ticket {
  id: string;
  tableOrOrder: string;
  waiter: string;
  sector: Sector;
  status: TicketStatus;
  createdAt: Date;
  items: TicketItem[];
}

const INITIAL_TICKETS: Ticket[] = [
  {
    id: "T-101",
    tableOrOrder: "Mesa 02",
    waiter: "Carlos Silva",
    sector: "GRILL",
    status: "PREPARING",
    createdAt: new Date(Date.now() - 18 * 60 * 1000), // 18 min ago
    items: [
      { name: "Hambúrguer Smash Bacon Double", quantity: 2, notes: "Sem cebola", additions: ["+ Cheddar Extra"] },
      { name: "Batata Frita Especial", quantity: 1, notes: "Crocante" }
    ]
  },
  {
    id: "T-102",
    tableOrOrder: "Mesa 05",
    waiter: "Ana Oliveira",
    sector: "PIZZERIA",
    status: "NEW",
    createdAt: new Date(Date.now() - 6 * 60 * 1000), // 6 min ago
    items: [
      { name: "Pizza 1/2 Calabresa + 1/2 4 Queijos", quantity: 1, notes: "Massa fina", additions: ["+ Borda Catupiry"] }
    ]
  },
  {
    id: "T-103",
    tableOrOrder: "Balcão #44",
    waiter: "Mateus Santos",
    sector: "KITCHEN",
    status: "NEW",
    createdAt: new Date(Date.now() - 28 * 60 * 1000), // 28 min ago (Atrasado!)
    items: [
      { name: "Picanha na Chapa 500g", quantity: 1, notes: "Carne ao ponto" },
      { name: "Porção de Farofa da Casa", quantity: 1 }
    ]
  },
  {
    id: "T-104",
    tableOrOrder: "Mesa 09",
    waiter: "Carlos Silva",
    sector: "BAR",
    status: "READY",
    createdAt: new Date(Date.now() - 12 * 60 * 1000), // 12 min ago
    items: [
      { name: "Chopp Artesanal IPA 500ml", quantity: 3 },
      { name: "Suco Natural de Laranja 500ml", quantity: 1, notes: "Sem açúcar" }
    ]
  }
];

export default function RestaurantKdsPage() {
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [selectedSector, setSelectedSector] = useState<Sector>("ALL");
  const [now, setNow] = useState<Date>(new Date());

  // Update timer every minute for elapsed wait time
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const handleAdvanceStatus = (ticketId: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        let nextStatus: TicketStatus = "PREPARING";
        if (t.status === "NEW") nextStatus = "PREPARING";
        else if (t.status === "PREPARING") nextStatus = "READY";
        else if (t.status === "READY") nextStatus = "SERVED";
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const handlePrintTicket = (ticket: Ticket) => {
    alert(`🖨️ Imprimindo comanda do setor ${ticket.sector} para a ${ticket.tableOrOrder}...`);
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSector = selectedSector === "ALL" || t.sector === selectedSector;
    return matchesSector && t.status !== "SERVED";
  });

  return (
    <div className="h-full flex flex-col bg-[#e8f0fc] text-gray-900 p-6 space-y-4 overflow-hidden animate-in fade-in duration-200">
      
      {/* ── Header KDS ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-[#fbfdff] p-4 rounded-3xl border border-[#c4d5ee] shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <ChefHat size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">KDS — Tela da Cozinha & Produção</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Ao Vivo
              </span>
            </div>
            <p className="text-xs text-slate-500">Acompanhamento em tempo real dos pedidos por setor de produção.</p>
          </div>
        </div>

        {/* Filtros por Setor */}
        <div className="flex bg-[#e8f0fc] p-1 rounded-2xl border border-indigo-200 gap-1">
          {[
            { key: "ALL", label: "Todos os Setores", icon: <Utensils size={14} /> },
            { key: "KITCHEN", label: "Cozinha Principal", icon: <ChefHat size={14} /> },
            { key: "GRILL", label: "Chapa & Lanches", icon: <Flame size={14} /> },
            { key: "PIZZERIA", label: "Pizzaria", icon: <Pizza size={14} /> },
            { key: "BAR", label: "Bar & Copa", icon: <Wine size={14} /> },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setSelectedSector(s.key as Sector)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedSector === s.key
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-500 hover:text-gray-900 hover:bg-indigo-500/10"
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grade de Comandas da Cozinha ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-1">
        {filteredTickets.map(ticket => {
          const elapsedMinutes = Math.floor((now.getTime() - ticket.createdAt.getTime()) / (1000 * 60));
          const isDelayed = elapsedMinutes >= 25;
          const isWarning = elapsedMinutes >= 15 && elapsedMinutes < 25;

          return (
            <div
              key={ticket.id}
              className={`rounded-3xl border-2 p-4 flex flex-col justify-between transition-all shadow-xl bg-[#fbfdff] ${
                ticket.status === "READY"
                  ? "border-emerald-500/50 bg-emerald-50/80"
                  : isDelayed
                  ? "border-red-500/60 bg-red-50/80 animate-pulse"
                  : isWarning
                  ? "border-amber-500/50 bg-amber-50/80"
                  : "border-indigo-200"
              }`}
            >
              {/* Card Top */}
              <div className="border-b border-[#c4d5ee] pb-3 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 leading-none">{ticket.tableOrOrder}</h2>
                    <span className="text-[10px] text-slate-500 block mt-1">Garçom: {ticket.waiter}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase font-mono tracking-wider flex items-center gap-1 ${
                    isDelayed ? "bg-red-500/20 text-red-700 border border-red-500/40" :
                    isWarning ? "bg-amber-500/20 text-amber-700 border border-amber-500/40" :
                    "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  }`}>
                    <Clock size={12} /> {elapsedMinutes} min
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest bg-indigo-500/10 border border-indigo-200 px-2 py-0.5 rounded-md">
                    Setor: {ticket.sector}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">{ticket.id}</span>
                </div>
              </div>

              {/* Lista de Itens do Pedido */}
              <div className="py-3 flex-1 space-y-2.5 overflow-y-auto max-h-56 custom-scrollbar">
                {ticket.items.map((item, idx) => (
                  <div key={idx} className="bg-[#e8f0fc] p-3 rounded-2xl border border-[#c4d5ee] space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 font-mono">
                        {item.quantity}x
                      </span>
                      <p className="text-xs font-bold text-gray-900 leading-snug">{item.name}</p>
                    </div>

                    {item.notes && (
                      <p className="text-[10px] text-amber-700 font-semibold italic pl-8">⚠️ Obs: {item.notes}</p>
                    )}

                    {item.additions && item.additions.length > 0 && (
                      <p className="text-[10px] text-indigo-700 font-medium pl-8">+ {item.additions.join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Card Footer / Ações de Status */}
              <div className="border-t border-[#c4d5ee] pt-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => handlePrintTicket(ticket)}
                  className="p-2.5 bg-[#e8f0fc] hover:bg-indigo-600/20 text-slate-500 hover:text-indigo-700 border border-[#c4d5ee] rounded-xl transition-all"
                  title="Imprimir Comanda do Setor"
                >
                  <Printer size={15} />
                </button>

                <button
                  onClick={() => handleAdvanceStatus(ticket.id)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 ${
                    ticket.status === "NEW"
                      ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                      : ticket.status === "PREPARING"
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                  }`}
                >
                  {ticket.status === "NEW" && <><Play size={13} /> Iniciar Preparo</>}
                  {ticket.status === "PREPARING" && <><Check size={13} /> Marcar como Pronto</>}
                  {ticket.status === "READY" && <><CheckCircle2 size={13} /> Concluir Entrega</>}
                </button>
              </div>
            </div>
          );
        })}

        {!filteredTickets.length && (
          <div className="col-span-full py-32 text-center text-slate-500 space-y-3">
            <ChefHat size={48} className="mx-auto opacity-30" />
            <p className="text-sm font-bold text-slate-500">Nenhum pedido pendente neste setor!</p>
            <p className="text-xs text-slate-600">Novos pedidos lançados no PDV Touch aparecerão aqui automaticamente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
