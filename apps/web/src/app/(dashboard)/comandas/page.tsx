"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BedDouble,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  X,
  Search,
  RefreshCw,
  User,
  Edit3,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  FileText,
  AlertCircle,
  Lock,
  ShoppingCart,
} from "lucide-react";
import {
  getHotelTabsWorkspace,
  addItemsToRoomTab,
  removeItemFromRoomTab,
  updateRoomInfo,
  closeRoomTabFutureSale,
} from "@/actions/hotelTabs";

interface RoomItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string | null;
  stockDeducted?: boolean;
  product: {
    id: string;
    name: string;
    unit: string;
    price: number;
    barcode?: string | null;
    isSelfProduced?: boolean;
  };
}

interface RoomData {
  id: string;
  code: string;
  name: string;
  guestName?: string | null;
  notes?: string | null;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  tabTotal: number;
  itemsCount: number;
  openOrder?: {
    id: string;
    orderNumber?: string | null;
    subtotal: number;
    discount: number;
    total: number;
    createdAt: string;
    items: RoomItem[];
  } | null;
}

interface CustomerGroup {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  consolidatedTotal: number;
  openRoomsCount: number;
  rooms: RoomData[];
}

interface WorkspaceProduct {
  id: string;
  name: string;
  barcode?: string | null;
  internalCode?: string | null;
  price: number;
  stock: number;
  unit: string;
  isSelfProduced?: boolean;
  category?: { id: string; name: string } | null;
}

function fmtBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isFractionalUnit(unit?: string | null) {
  const u = (unit || "").trim().toUpperCase();
  return u === "KG" || u === "L" || u === "LT" || u === "G" || u === "GR" || u === "ML" || u === "M" || u === "MT";
}

function roundQty(q: number) {
  return Math.round(Number(q || 0) * 1000) / 1000;
}

function parseDecimalQty(raw: string) {
  const normalized = String(raw || "").trim().replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? roundQty(n) : 0;
}

function formatQtyDisplay(qty: number, unit?: string | null) {
  const val = roundQty(qty);
  if (isFractionalUnit(unit) && val % 1 !== 0) {
    return val.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }
  return val.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

const PAYMENT_OPTIONS = [
  { key: "DINHEIRO", label: "Dinheiro", desc: "Pago à vista", icon: Banknote },
  { key: "PIX", label: "PIX", desc: "Pago à vista", icon: QrCode },
  { key: "CREDIT_CARD", label: "Cartão Crédito", desc: "Pago à vista", icon: CreditCard },
  { key: "DEBIT_CARD", label: "Cartão Débito", desc: "Pago à vista", icon: CreditCard },
  { key: "FATURADO", label: "Faturado (A Prazo)", desc: "Gera pendente p/ recebimento futuro", icon: FileText },
];

export default function ComandasQuartosPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [customers, setCustomers] = useState<CustomerGroup[]>([]);
  const [products, setProducts] = useState<WorkspaceProduct[]>([]);
  const [recentClosed, setRecentClosed] = useState<any[]>([]);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Modals state
  const [launchRoom, setLaunchRoom] = useState<RoomData | null>(null);
  const [launchSearch, setLaunchSearch] = useState("");
  const [launchDraft, setLaunchDraft] = useState<
    { product: WorkspaceProduct; quantity: number; qtyText: string; valueText: string; notes: string }[]
  >([]);
  const [submittingLaunch, setSubmittingLaunch] = useState(false);

  const [detailRoomId, setDetailRoomId] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const [editRoom, setEditRoom] = useState<RoomData | null>(null);
  const [guestNameInput, setGuestNameInput] = useState("");
  const [roomNotesInput, setRoomNotesInput] = useState("");
  const [savingRoomInfo, setSavingRoomInfo] = useState(false);

  // Checkout Modal (1 ou múltiplos quartos)
  const [closeModalCustomer, setCloseModalCustomer] = useState<CustomerGroup | null>(null);
  const [selectedRoomIdsToClose, setSelectedRoomIdsToClose] = useState<string[]>([]);
  const [closePaymentMethod, setClosePaymentMethod] = useState("FATURADO");
  const [closeDiscount, setCloseDiscount] = useState("0");
  const [closingTab, setClosingTab] = useState(false);
  const [closedSummary, setClosedSummary] = useState<any | null>(null);

  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadWorkspace = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getHotelTabsWorkspace();
      setEnabled(Boolean(res.enabled));
      setCompanyName(res.companyName || "");
      setCustomers((res.customers || []) as CustomerGroup[]);
      setProducts((res.products || []) as WorkspaceProduct[]);
      setRecentClosed((res.recentClosedOrders || []) as any[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace(false);
  }, [loadWorkspace]);

  const detailRoom = useMemo(() => {
    if (!detailRoomId) return null;
    for (const c of customers) {
      const found = c.rooms.find((r) => r.id === detailRoomId);
      if (found) return found;
    }
    return null;
  }, [customers, detailRoomId]);

  const filteredLaunchProducts = useMemo(() => {
    const q = launchSearch.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.barcode || "").toLowerCase().includes(q) ||
            (p.internalCode || "").toLowerCase().includes(q) ||
            (p.category?.name || "").toLowerCase().includes(q)
        )
      : products;
    return list.slice(0, 40);
  }, [products, launchSearch]);

  const addProductToLaunchDraft = (prod: WorkspaceProduct) => {
    const step = isFractionalUnit(prod.unit) ? 0.5 : 1;
    setLaunchDraft((prev) => {
      const idx = prev.findIndex((i) => i.product.id === prod.id);
      if (idx >= 0) {
        const nextQty = roundQty(prev[idx].quantity + step);
        const nextText = String(nextQty).replace(".", ",");
        return prev.map((item, i) =>
          i === idx
            ? {
                ...item,
                quantity: nextQty,
                qtyText: nextText,
                valueText: (nextQty * item.product.price).toFixed(2).replace(".", ","),
              }
            : item
        );
      }
      const initialQty = isFractionalUnit(prod.unit) ? 0.5 : 1;
      const initialText = String(initialQty).replace(".", ",");
      return [
        ...prev,
        {
          product: prod,
          quantity: initialQty,
          qtyText: initialText,
          valueText: (initialQty * prod.price).toFixed(2).replace(".", ","),
          notes: "",
        },
      ];
    });
  };

  const setDraftExactQty = (productId: string, rawText: string) => {
    const sanitized = rawText.replace(/[^0-9.,]/g, "");
    const parsed = parseDecimalQty(sanitized);
    setLaunchDraft((prev) =>
      prev.map((d) =>
        d.product.id === productId
          ? {
              ...d,
              qtyText: sanitized,
              quantity: parsed,
              valueText: parsed > 0 ? (parsed * d.product.price).toFixed(2).replace(".", ",") : "",
            }
          : d
      )
    );
  };

  const setDraftQuickQty = (productId: string, qty: number) => {
    const rounded = roundQty(qty);
    const text = isFractionalUnit("KG") && rounded % 1 !== 0
      ? rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",")
      : String(rounded).replace(".", ",");
    setLaunchDraft((prev) =>
      prev.map((d) =>
        d.product.id === productId
          ? {
              ...d,
              quantity: rounded,
              qtyText: text,
              valueText: (rounded * d.product.price).toFixed(2).replace(".", ","),
            }
          : d
      )
    );
  };

  const setDraftByBRL = (productId: string, rawBRL: string) => {
    const sanitized = rawBRL.replace(/[^0-9.,]/g, "");
    const brl = parseDecimalQty(sanitized);
    setLaunchDraft((prev) =>
      prev.map((d) => {
        if (d.product.id !== productId) return d;
        const unitPrice = Number(d.product.price || 0);
        const calcQty = unitPrice > 0 && brl > 0 ? roundQty(brl / unitPrice) : 0;
        const qtyStr = calcQty > 0 ? calcQty.toFixed(3).replace(".", ",") : "";
        return {
          ...d,
          valueText: sanitized,
          quantity: calcQty,
          qtyText: qtyStr,
        };
      })
    );
  };

  const handleSubmitLaunch = async () => {
    if (!launchRoom) return;
    const validItems = launchDraft.filter((d) => d.quantity > 0);
    if (validItems.length === 0) {
      showToast("err", "Informe uma quantidade ou peso maior que zero.");
      return;
    }
    setSubmittingLaunch(true);
    try {
      const res = await addItemsToRoomTab({
        roomId: launchRoom.id,
        items: validItems.map((d) => ({
          productId: d.product.id,
          quantity: roundQty(d.quantity),
          notes: d.notes.trim() || undefined,
        })),
      });
      if (res.error) {
        showToast("err", res.error);
      } else {
        showToast("ok", `Itens lançados na comanda de ${launchRoom.name}!`);
        setLaunchRoom(null);
        setLaunchDraft([]);
        setLaunchSearch("");
        await loadWorkspace(true);
      }
    } finally {
      setSubmittingLaunch(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setRemovingItemId(itemId);
    try {
      const res = await removeItemFromRoomTab(itemId);
      if (res.error) {
        showToast("err", res.error);
      } else {
        showToast("ok", "Item removido e estoque estornado.");
        await loadWorkspace(true);
      }
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleSaveRoomInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoom) return;
    setSavingRoomInfo(true);
    try {
      const res = await updateRoomInfo({
        roomId: editRoom.id,
        guestName: guestNameInput,
        notes: roomNotesInput,
      });
      if (res.error) {
        showToast("err", res.error);
      } else {
        showToast("ok", `Dados de ${editRoom.name} atualizados!`);
        setEditRoom(null);
        await loadWorkspace(true);
      }
    } finally {
      setSavingRoomInfo(false);
    }
  };

  const openCloseModal = (customer: CustomerGroup, roomIds: string[]) => {
    setCloseModalCustomer(customer);
    setSelectedRoomIdsToClose(roomIds);
    setClosePaymentMethod("FATURADO");
    setCloseDiscount("0");
  };

  const closePreviewStats = useMemo(() => {
    if (!closeModalCustomer) return { subtotal: 0, discount: 0, total: 0, itemsCount: 0 };
    const selectedRooms = closeModalCustomer.rooms.filter(
      (r) => selectedRoomIdsToClose.includes(r.id) && r.openOrder
    );
    const subtotal = selectedRooms.reduce((acc, r) => acc + Number(r.tabTotal || 0), 0);
    const itemsCount = selectedRooms.reduce((acc, r) => acc + Number(r.itemsCount || 0), 0);
    const disc = Math.max(0, parseFloat(closeDiscount) || 0);
    const total = Math.max(0, subtotal - disc);
    return { subtotal, discount: disc, total, itemsCount };
  }, [closeModalCustomer, selectedRoomIdsToClose, closeDiscount]);

  const handleConfirmClose = async () => {
    if (selectedRoomIdsToClose.length === 0) {
      showToast("err", "Selecione ao menos um quarto aberto.");
      return;
    }
    setClosingTab(true);
    try {
      const res = await closeRoomTabFutureSale({
        roomIds: selectedRoomIdsToClose,
        paymentMethod: closePaymentMethod,
        discount: parseFloat(closeDiscount) || 0,
      });
      if (res.error) {
        showToast("err", res.error);
      } else {
        setCloseModalCustomer(null);
        setSelectedRoomIdsToClose([]);
        setClosedSummary(res.summary);
        showToast("ok", "Comanda fechada e registrada no financeiro!");
        await loadWorkspace(true);
      }
    } finally {
      setClosingTab(false);
    }
  };

  const printThermalStatement = (title: string, subtitle: string, rows: { name: string; qty: number; unitPrice: number; total: number; obs?: string | null }[], subtotal: number, discount: number, total: number, extraFooter?: string) => {
    const itemsHtml = rows
      .map(
        (r) => `
      <tr>
        <td>${r.name}${r.obs ? `<br/><small>Obs: ${r.obs}</small>` : ""}</td>
        <td style="text-align:center">${r.qty}</td>
        <td style="text-align:right">${fmtBRL(r.unitPrice)}</td>
        <td style="text-align:right">${fmtBRL(r.total)}</td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
@page{size:80mm auto;margin:0}
body{font-family:'Courier New',monospace;font-size:12px;font-weight:700;width:76mm;padding:4mm 2mm;color:#000;margin:0}
.center{text-align:center}.sep{border-top:1px dashed #000;margin:6px 0}
table{width:100%;border-collapse:collapse}th,td{padding:2px 0;font-size:11px;vertical-align:top}
th{border-bottom:1px solid #000}.tot{font-size:14px;font-weight:900}
</style></head><body>
<div class="center"><div style="font-size:15px;font-weight:900">${companyName || "EMPÓRIO"}</div><div>${title}</div><div>${subtitle}</div><div>${new Date().toLocaleString("pt-BR")}</div></div>
<div class="sep"></div>
<table><thead><tr><th style="text-align:left">ITEM</th><th>QTD</th><th style="text-align:right">UN</th><th style="text-align:right">TOT</th></tr></thead><tbody>${itemsHtml}</tbody></table>
<div class="sep"></div>
<table>
<tr><td>Subtotal</td><td style="text-align:right">R$ ${fmtBRL(subtotal)}</td></tr>
${discount > 0 ? `<tr><td>Desconto</td><td style="text-align:right">-R$ ${fmtBRL(discount)}</td></tr>` : ""}
<tr class="tot"><td>TOTAL</td><td style="text-align:right">R$ ${fmtBRL(total)}</td></tr>
</table>
${extraFooter ? `<div class="sep"></div><div class="center">${extraFooter}</div>` : ""}
</body></html>`;

    const iframe = printFrameRef.current;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 150);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-slate-400 text-sm">
        Carregando módulo de Comandas &amp; Quartos...
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl p-10 max-w-xl mx-auto mt-8 text-center shadow-xs space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
          <Lock size={26} />
        </div>
        <h1 className="text-xl font-black text-gray-900">
          Comandas de Quartos — Recurso Exclusivo
        </h1>
        <p className="text-sm text-slate-500">
          O módulo de Comandas por Quartos para fechamento futuro está disponível apenas para estabelecimentos habilitados pelo administrador Master.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
            toast.type === "ok"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.type === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <BedDouble size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Comandas &amp; Quartos (Fechamento Futuro)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Controle de consumo por quarto com baixa imediata de estoque e faturamento individual ou consolidado.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadWorkspace(true)}
          disabled={refreshing}
          className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 self-start md:self-center cursor-pointer"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          <span>Atualizar Comandas</span>
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-slate-500 text-sm">
          Nenhum cliente com quartos cadastrados foi encontrado nesta empresa.
        </div>
      ) : (
        customers.map((customer) => {
          const openRoomIds = customer.rooms
            .filter((r) => Boolean(r.openOrder))
            .map((r) => r.id);

          return (
            <div key={customer.id} className="space-y-4">
              {/* Resumo do Cliente / Fazenda Belém */}
              <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-blue-200">
                    Cliente / Convênio de Hospedagem
                  </span>
                  <h2 className="text-2xl font-black tracking-tight">{customer.name}</h2>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {customer.rooms.length} quarto(s) cadastrado(s) · {customer.openRoomsCount} com comanda aberta
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl px-4 py-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-100 block">
                      Total Consolidado {customer.name}
                    </span>
                    <span className="text-2xl font-black font-mono">
                      R$ {fmtBRL(customer.consolidatedTotal)}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={openRoomIds.length === 0}
                    onClick={() => openCloseModal(customer, openRoomIds)}
                    className="px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Receipt size={17} />
                    <span>Fechar Todos os Quartos (Faturamento {customer.name})</span>
                  </button>
                </div>
              </div>

              {/* Cards dos Quartos */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {customer.rooms.map((room) => {
                  const isOpen = Boolean(room.openOrder);
                  const items = room.openOrder?.items || [];

                  return (
                    <div
                      key={room.id}
                      className={`bg-white rounded-2xl border-2 p-4 flex flex-col justify-between gap-4 shadow-xs transition-all ${
                        isOpen ? "border-blue-500 shadow-blue-500/10" : "border-gray-200"
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center ${
                                isOpen
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {room.code}
                            </div>
                            <div>
                              <h3 className="font-black text-gray-900 text-base leading-tight">
                                {room.name}
                              </h3>
                              <span
                                className={`inline-block mt-0.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  isOpen
                                    ? "bg-amber-50 text-amber-800 border-amber-300"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {isOpen ? "Comanda Aberta" : "Livre"}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setEditRoom(room);
                              setGuestNameInput(room.guestName || "");
                              setRoomNotesInput(room.notes || "");
                            }}
                            title="Editar hóspede / observação do quarto"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>

                        {/* Hóspede / Obs */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            <User size={12} className="text-slate-400" />
                            <span>{room.guestName || "Sem hóspede informado"}</span>
                          </div>
                          {room.notes && (
                            <p className="text-[11px] text-slate-500 truncate">{room.notes}</p>
                          )}
                        </div>

                        {/* Total & prévia de itens */}
                        <div className="flex items-baseline justify-between pt-1">
                          <span className="text-xs font-bold text-slate-500">
                            {items.length} {items.length === 1 ? "lançamento" : "lançamentos"}
                          </span>
                          <span
                            className={`text-2xl font-black font-mono ${
                              isOpen ? "text-blue-700" : "text-slate-400"
                            }`}
                          >
                            R$ {fmtBRL(room.tabTotal)}
                          </span>
                        </div>

                        {items.length > 0 && (
                          <div className="border-t border-slate-100 pt-2 space-y-1 max-h-28 overflow-y-auto text-[11px]">
                            {items.slice(-4).map((it) => (
                              <div key={it.id} className="flex justify-between gap-2 text-slate-600">
                                <span className="truncate">
                                  {formatQtyDisplay(it.quantity, it.product?.unit)} {it.product?.unit || "UN"} {it.product?.name}
                                </span>
                                <span className="font-mono font-bold text-slate-800 shrink-0">
                                  R$ {fmtBRL(it.total)}
                                </span>
                              </div>
                            ))}
                            {items.length > 4 && (
                              <div className="text-[10px] text-blue-600 font-bold">
                                + {items.length - 4} item(ns) no extrato...
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ações do Quarto */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setLaunchRoom(room);
                            setLaunchDraft([]);
                            setLaunchSearch("");
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>Lançar Produtos / Consumo</span>
                        </button>

                        {isOpen && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailRoomId(room.id)}
                              className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <FileText size={13} />
                              <span>Extrato</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openCloseModal(customer, [room.id])}
                              className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Receipt size={13} />
                              <span>Fechar Conta</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Histórico recente de fechamentos de quartos */}
      {recentClosed.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-gray-200 bg-slate-50">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
              Últimos Fechamentos de Quartos
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/50 border-b border-gray-100 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-2.5">Quarto / Cliente</th>
                  <th className="px-5 py-2.5">Itens</th>
                  <th className="px-5 py-2.5">Observações / Venda</th>
                  <th className="px-5 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentClosed.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-bold text-gray-900">
                      {ord.room?.name || "Quarto"} · {ord.customer?.name || "Cliente"}
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">
                      {(ord.items || []).length} item(ns)
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">{ord.notes || "Fechada"}</td>
                    <td className="px-5 py-2.5 text-right font-mono font-bold text-gray-900">
                      R$ {fmtBRL(ord.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Lançar Consumo no Quarto */}
      {launchRoom && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                  Lançamento para Fechamento Futuro
                </span>
                <h3 className="text-lg font-black text-gray-900">
                  {launchRoom.customerName} — {launchRoom.name} ({launchRoom.code})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLaunchRoom(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              {/* Lista de Produtos */}
              <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col min-h-0">
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      autoFocus
                      value={launchSearch}
                      onChange={(e) => setLaunchSearch(e.target.value)}
                      placeholder="Buscar produto por nome, código de barras ou categoria..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-blue-500 rounded-xl text-xs font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
                  {filteredLaunchProducts.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => addProductToLaunchDraft(prod)}
                      className="text-left p-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all flex flex-col justify-between gap-1.5 cursor-pointer"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block truncate">
                          {prod.category?.name || "Geral"}
                        </span>
                        <span className="font-bold text-xs text-gray-900 line-clamp-2">
                          {prod.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 font-mono">
                          Est: {prod.stock} {prod.unit}
                        </span>
                        <span className="font-mono font-black text-xs text-emerald-700">
                          R$ {fmtBRL(prod.price)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Carrinho de Lançamento */}
              <div className="lg:col-span-5 flex flex-col min-h-0 bg-slate-50/60">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-1.5">
                    <ShoppingCart size={14} className="text-blue-600" />
                    Itens a Lançar ({launchDraft.length})
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {launchDraft.length === 0 ? (
                    <div className="text-center text-slate-400 text-xs py-10">
                      Clique nos produtos ao lado para adicionar à comanda do quarto.
                    </div>
                  ) : (
                    launchDraft.map((item) => {
                      const frac = isFractionalUnit(item.product.unit);
                      const step = frac ? 0.1 : 1;
                      const unitUpper = (item.product.unit || "UN").toUpperCase();
                      return (
                        <div
                          key={item.product.id}
                          className="bg-white border border-gray-200 rounded-xl p-2.5 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-gray-900 leading-tight block">
                                {item.product.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                R$ {fmtBRL(item.product.price)} / {unitUpper}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setLaunchDraft((prev) =>
                                  prev.filter((d) => d.product.id !== item.product.id)
                                )
                              }
                              className="text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = roundQty(item.quantity - step);
                                  if (next <= 0) {
                                    setLaunchDraft((prev) => prev.filter((d) => d.product.id !== item.product.id));
                                  } else {
                                    setDraftQuickQty(item.product.id, next);
                                  }
                                }}
                                className="w-6 h-6 rounded bg-white flex items-center justify-center cursor-pointer"
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.qtyText}
                                onChange={(e) => setDraftExactQty(item.product.id, e.target.value)}
                                placeholder="0,000"
                                aria-label={`Quantidade em ${unitUpper}`}
                                className="w-16 text-center font-mono font-black text-xs bg-white rounded mx-0.5 py-1 border border-blue-200 focus:border-blue-500 outline-none"
                              />
                              <span className="text-[10px] font-bold text-slate-500 pr-1.5">{unitUpper}</span>
                              <button
                                type="button"
                                onClick={() => setDraftQuickQty(item.product.id, roundQty(item.quantity + step))}
                                className="w-6 h-6 rounded bg-white flex items-center justify-center cursor-pointer"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                            <span className="font-mono font-black text-xs text-gray-900">
                              R$ {fmtBRL(item.product.price * item.quantity)}
                            </span>
                          </div>

                          {frac && (
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {[
                                { label: unitUpper === "KG" ? "100g" : "0,10", val: 0.1 },
                                { label: unitUpper === "KG" ? "250g" : "0,25", val: 0.25 },
                                { label: unitUpper === "KG" ? "500g" : "0,50", val: 0.5 },
                                { label: unitUpper === "KG" ? "1kg" : "1,0", val: 1 },
                              ].map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => setDraftQuickQty(item.product.id, preset.val)}
                                  className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] border border-blue-200 cursor-pointer"
                                >
                                  {preset.label}
                                </button>
                              ))}
                              <div className="ml-auto flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                                <span className="text-[10px] font-bold text-emerald-700">R$</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.valueText}
                                  onChange={(e) => setDraftByBRL(item.product.id, e.target.value)}
                                  placeholder="Valor"
                                  title="Digite o valor em R$ para calcular o peso automaticamente"
                                  className="w-12 text-right font-mono font-bold text-[10px] bg-transparent text-emerald-900 outline-none"
                                />
                              </div>
                            </div>
                          )}

                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) =>
                              setLaunchDraft((prev) =>
                                prev.map((d) =>
                                  d.product.id === item.product.id
                                    ? { ...d, notes: e.target.value }
                                    : d
                                )
                              )
                            }
                            placeholder="Obs. (opcional)"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] outline-none"
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-white space-y-3">
                  <div className="flex items-center justify-between text-sm font-black text-gray-900">
                    <span>Subtotal deste lançamento</span>
                    <span className="font-mono text-lg text-blue-700">
                      R$ {fmtBRL(launchDraft.reduce((a, d) => a + d.product.price * d.quantity, 0))}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={launchDraft.filter((d) => d.quantity > 0).length === 0 || submittingLaunch}
                    onClick={handleSubmitLaunch}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider shadow-md cursor-pointer"
                  >
                    {submittingLaunch ? "Lançando..." : `Confirmar Lançamento em ${launchRoom.name}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Extrato Detalhado do Quarto */}
      {detailRoom && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl max-h-[88vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600">
                  Extrato da Comanda Aberta
                </span>
                <h3 className="text-lg font-black text-gray-900">
                  {detailRoom.customerName} — {detailRoom.name} ({detailRoom.code})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailRoomId(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!detailRoom.openOrder || detailRoom.openOrder.items.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-8">
                  Esta comanda não possui itens lançados no momento.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Produto</th>
                        <th className="px-4 py-2.5 text-center">Qtd</th>
                        <th className="px-4 py-2.5 text-right">Unitário</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                        <th className="px-3 py-2.5 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detailRoom.openOrder.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-gray-900">{item.product?.name}</div>
                            {item.notes && (
                              <div className="text-[11px] text-amber-700">Obs: {item.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold">
                            {formatQtyDisplay(item.quantity, item.product?.unit)} {item.product?.unit}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                            R$ {fmtBRL(item.unitPrice)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-black text-gray-900">
                            R$ {fmtBRL(item.total)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              disabled={removingItemId === item.id}
                              onClick={() => handleRemoveItem(item.id)}
                              title="Remover item e estornar estoque"
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer disabled:opacity-40"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">
                  Total Acumulado em {detailRoom.name}
                </span>
                <span className="text-2xl font-black font-mono text-blue-700">
                  R$ {fmtBRL(detailRoom.tabTotal)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {detailRoom.openOrder && detailRoom.openOrder.items.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        printThermalStatement(
                          `EXTRATO PARCIAL - ${detailRoom.name}`,
                          `${detailRoom.customerName}${detailRoom.guestName ? ` (${detailRoom.guestName})` : ""}`,
                          detailRoom.openOrder!.items.map((it) => ({
                            name: it.product?.name || "Item",
                            qty: it.quantity,
                            unitPrice: it.unitPrice,
                            total: it.total,
                            obs: it.notes,
                          })),
                          detailRoom.openOrder!.subtotal,
                          detailRoom.openOrder!.discount,
                          detailRoom.tabTotal,
                          "Documento para conferência - Sem valor fiscal"
                        )
                      }
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={14} />
                      <span>Imprimir Parcial</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const cust = customers.find((c) => c.id === detailRoom.customerId);
                        if (cust) {
                          setDetailRoomId(null);
                          openCloseModal(cust, [detailRoom.id]);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Receipt size={14} />
                      <span>Fechar Venda do Quarto</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Editar Hóspede / Observações do Quarto */}
      {editRoom && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-gray-900 text-sm">
                Informações de {editRoom.name} ({editRoom.customerName})
              </h3>
              <button
                type="button"
                onClick={() => setEditRoom(null)}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveRoomInfo} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nome do Hóspede / Responsável
                </label>
                <input
                  type="text"
                  value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value)}
                  placeholder="Opcional"
                  className="w-full bg-slate-50 border border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Observações do Quarto
                </label>
                <textarea
                  rows={3}
                  value={roomNotesInput}
                  onChange={(e) => setRoomNotesInput(e.target.value)}
                  placeholder="Observações de consumo ou hospedagem..."
                  className="w-full bg-slate-50 border border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditRoom(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRoomInfo}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                >
                  {savingRoomInfo ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Fechamento de Venda (1 ou múltiplos quartos) */}
      {closeModalCustomer && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-emerald-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  Fechamento Financeiro (Sem Dupla Baixa de Estoque)
                </span>
                <h3 className="text-lg font-black text-gray-900">
                  Fechar Comanda(s) — {closeModalCustomer.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCloseModalCustomer(null)}
                className="p-1.5 rounded-full hover:bg-emerald-100 text-emerald-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Seleção de Quartos */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">
                  Quartos incluídos neste fechamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {closeModalCustomer.rooms
                    .filter((r) => Boolean(r.openOrder))
                    .map((room) => {
                      const checked = selectedRoomIdsToClose.includes(room.id);
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() =>
                            setSelectedRoomIdsToClose((prev) =>
                              prev.includes(room.id)
                                ? prev.filter((id) => id !== room.id)
                                : [...prev, room.id]
                            )
                          }
                          className={`p-3 rounded-xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                            checked
                              ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                              : "border-gray-200 bg-white text-gray-600"
                          }`}
                        >
                          <div>
                            <div className="font-black text-xs">{room.name}</div>
                            <div className="text-[11px] opacity-75">
                              {room.itemsCount} item(ns)
                            </div>
                          </div>
                          <span className="font-mono font-black text-xs">
                            R$ {fmtBRL(room.tabTotal)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">
                  Forma de Pagamento / Faturamento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = closePaymentMethod === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setClosePaymentMethod(opt.key)}
                        className={`p-3 rounded-xl border-2 text-left flex items-center gap-2.5 cursor-pointer transition-all ${
                          active
                            ? "border-blue-600 bg-blue-50 text-blue-950"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <Icon size={18} className={active ? "text-blue-600" : "text-slate-400"} />
                        <div>
                          <div className="font-black text-xs">{opt.label}</div>
                          <div className="text-[10px] text-slate-500">{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desconto */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Desconto (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closeDiscount}
                  onChange={(e) => setCloseDiscount(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none"
                />
              </div>

              {/* Resumo Financeiro */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({closePreviewStats.itemsCount} itens)</span>
                  <span className="font-mono font-bold">R$ {fmtBRL(closePreviewStats.subtotal)}</span>
                </div>
                {closePreviewStats.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Desconto</span>
                    <span className="font-mono font-bold">- R$ {fmtBRL(closePreviewStats.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-slate-200">
                  <span>Total a Fechar</span>
                  <span className="font-mono text-emerald-700">R$ {fmtBRL(closePreviewStats.total)}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-slate-50 flex gap-2.5">
              <button
                type="button"
                onClick={() => setCloseModalCustomer(null)}
                className="flex-1 py-3 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={selectedRoomIdsToClose.length === 0 || closingTab}
                onClick={handleConfirmClose}
                className="flex-[2] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider shadow-md cursor-pointer"
              >
                {closingTab ? "Fechando..." : "Confirmar Fechamento de Conta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Resumo da Venda Fechada */}
      {closedSummary && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Comanda Fechada com Sucesso!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Venda #{String(closedSummary.saleId).slice(0, 8).toUpperCase()} ·{" "}
                {closedSummary.customerName}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-left space-y-1.5">
              <div>
                <span className="text-slate-500">Quartos fechados:</span>{" "}
                <strong className="text-gray-900">{(closedSummary.roomsClosed || []).join(", ")}</strong>
              </div>
              <div>
                <span className="text-slate-500">Pagamento:</span>{" "}
                <strong className="text-gray-900">{closedSummary.paymentMethod}</strong> (
                {closedSummary.transactionStatus === "PENDING" ? "Lançado Pendente no Financeiro" : "Quitado no Financeiro"})
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-black text-gray-900">
                <span>Total Fechado</span>
                <span className="font-mono text-emerald-700">R$ {fmtBRL(closedSummary.total)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  printThermalStatement(
                    "FECHAMENTO DE COMANDA",
                    `${closedSummary.customerName} (${(closedSummary.roomsClosed || []).join(", ")})`,
                    (closedSummary.items || []).map((it: any) => ({
                      name: it.name,
                      qty: it.quantity,
                      unitPrice: it.unitPrice,
                      total: it.total,
                    })),
                    closedSummary.subtotal,
                    closedSummary.discount,
                    closedSummary.total,
                    `Pgto: ${closedSummary.paymentMethod} | Venda #${String(closedSummary.saleId).slice(0, 8).toUpperCase()}`
                  )
                }
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} /> Imprimir Recibo
              </button>
              <button
                type="button"
                onClick={() => setClosedSummary(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Iframe oculto para impressão térmica */}
      <iframe
        ref={printFrameRef}
        style={{ position: "fixed", left: "-9999px", top: 0, width: "80mm", height: "800px", border: "none" }}
        title="room-tab-printer"
      />
    </div>
  );
}
