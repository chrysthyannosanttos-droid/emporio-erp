"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, ShoppingBag, X, Volume2 } from "lucide-react";
import { getPendingDigitalMenuOrdersSummary } from "@/actions/order";

interface PendingOrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  deliveryType: string;
  createdAt: string;
}

function playNewOrderChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [587.33, 739.99, 880]; // Ré5 -> Fá#5 -> Lá5 (campainha agradável)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + idx * 0.14;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch {
    // Ignora bloqueio de autoplay se ainda não houve interação na página
  }
}

export function DigitalMenuOrderNotifier() {
  const router = useRouter();
  const [pendingOrders, setPendingOrders] = useState<PendingOrderItem[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const seenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await getPendingDigitalMenuOrdersSummary();
        if (!active) return;
        const list = res.orders || [];

        if (seenIdsRef.current === null) {
          seenIdsRef.current = new Set(list.map((o) => o.id));
        } else {
          const hasNew = list.some((o) => !seenIdsRef.current!.has(o.id));
          if (hasNew) {
            playNewOrderChime();
            setDismissed(false);
            try {
              window.dispatchEvent(new CustomEvent("digital-menu-new-order"));
            } catch {}
          }
          seenIdsRef.current = new Set(list.map((o) => o.id));
        }

        setPendingOrders(list);
      } catch {
        // ignora falhas momentâneas de rede
      }
    };

    poll();
    const id = setInterval(poll, 6000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (pendingOrders.length === 0) return null;

  const latest = pendingOrders[0];

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        className="fixed right-4 bottom-20 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl border border-emerald-400 text-xs font-black animate-bounce cursor-pointer print:hidden"
        title="Ver novo pedido do Cardápio Digital"
      >
        <BellRing size={15} />
        <span>{pendingOrders.length} novo(s) pedido(s)</span>
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-20 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white border-2 border-emerald-500 rounded-2xl shadow-2xl p-4 space-y-3 animate-in slide-in-from-right-5 print:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 animate-pulse">
            <BellRing size={18} />
          </div>
          <div>
            <div className="text-xs font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1">
              Novo Pedido Online
              <Volume2 size={12} className="text-emerald-600" />
            </div>
            <div className="text-[11px] font-bold text-slate-500">
              {pendingOrders.length} pedido(s) aguardando confirmação
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          title="Minimizar balão"
        >
          <X size={15} />
        </button>
      </div>

      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 text-xs space-y-0.5">
        <div className="flex items-center justify-between font-black text-slate-900">
          <span className="font-mono text-emerald-800">#{latest.orderNumber}</span>
          <span className="font-mono text-emerald-700">
            R$ {latest.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="font-semibold text-slate-800 truncate">{latest.customerName}</div>
        <div className="text-[10px] text-slate-500">
          {latest.deliveryType === "ENTREGA" ? "Entrega em domicílio" : latest.deliveryType === "MESA" ? "Mesa / Loja" : "Retirada no local"} •{" "}
          {new Date(latest.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            router.push("/ecommerce");
          }}
          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <ShoppingBag size={14} /> Abrir Pedidos
        </button>
        <button
          type="button"
          onClick={() => playNewOrderChime()}
          className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
          title="Testar som"
        >
          <Volume2 size={14} />
        </button>
      </div>
    </div>
  );
}
