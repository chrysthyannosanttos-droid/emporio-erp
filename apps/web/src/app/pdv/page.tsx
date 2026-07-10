"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, ShoppingCart, Trash2, CreditCard, Banknote, QrCode,
  Keyboard, Plus, Minus, X, FileText, Check, AlertCircle,
  TrendingDown, Package, Clock, User, ChevronRight, Monitor,
  DollarSign, BarChart2, LogOut, RefreshCw, Zap, Download, Settings
} from "lucide-react";
import { getProductByBarcode, searchProducts, lookupBarcodeOnline } from "@/actions/product";
import { getOrderById, getOrders } from "@/actions/order";
import { createSale } from "@/actions/sale";
import { useHotkeys, hotkeyLabels, PDVHotkeys, defaultHotkeys } from "@/hooks/useHotkeys";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
const PROMOTIONAL_ADS = [
  { title: "LEVE 3 PAGUE 2 HEINEKEN", desc: "Cerveja Heineken Long Neck 330ml - O item de menor valor sai inteiramente grátis!", badge: "OFERTA BOGO", color: "from-emerald-600 to-teal-500", imageUrl: "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?q=80&w=600" },
  { title: "QUARTA DO HORTIFRÚTI", desc: "Toda a seção de FLV (Frutas, Legumes e Verduras) com 20% de desconto direto na balança!", badge: "DESCONTO ESPECIAL", color: "from-amber-600 to-orange-500", imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600" },
  { title: "CADASTRE SEU CPF NA NOTA", desc: "Participe do nosso Clube de Vantagens e ganhe até 3% de cashback creditado na hora!", badge: "CASHBACK CRM", color: "from-indigo-600 to-purple-500", imageUrl: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=600" },
  { title: "OFERTA RELÂMPAGO DO DIA", desc: "Leite UHT Integral (diversas marcas) com limite de 12 unidades por cliente por apenas R$ 3,89!", badge: "PROMO LIMITADA", color: "from-rose-600 to-pink-500", imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600" }
];


interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode: string;
  unit?: string;
}

interface CashierSession {
  id: string;
  number: number;
  operator: string;
  openedAt: Date;
  initialBalance: number;
  sales: SessionSale[];
  withdrawals: Withdrawal[];
  supplements: Supplement[];
}

interface SessionSale {
  id: string;
  total: number;
  paymentMethod: string;
  at: Date;
}

interface Withdrawal {
  id: string;
  amount: number;
  reason: string;
  at: Date;
}

interface Supplement {
  id: string;
  amount: number;
  reason: string;
  at: Date;
}

interface OrderListItem {
  id: string;
  total: any;
  status: string;
  createdAt: Date;
  customer?: { name: string } | null;
  seller?: { name: string } | null;
}

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const PAYMENT_LABELS: Record<string, string> = {
  MONEY: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Crédito",
  DEBIT_CARD: "Débito",
  VOUCHER: "Voucher",
};

const PAYMENT_COLORS: Record<string, string> = {
  MONEY: "text-emerald-500",
  PIX: "text-sky-500",
  CREDIT_CARD: "text-violet-500",
  DEBIT_CARD: "text-blue-500",
  VOUCHER: "text-amber-500",
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

/* ─────────────────────────────────────────────
   Sugestão Visual de Troco (Notas e Moedas BR)
───────────────────────────────────────────── */
interface CurrencyPiece {
  value: number;
  label: string;
  shortLabel: string;
  type: 'note' | 'coin';
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  textColor: string;
  borderColor: string;
}

const CURRENCY_PIECES: CurrencyPiece[] = [
  { value: 200, label: 'R$ 200', shortLabel: '200', type: 'note', gradientFrom: '#8B9DAF', gradientTo: '#C4CED8', accentColor: '#6B7F94', textColor: '#3B4A5A', borderColor: '#7B8FA2' },
  { value: 100, label: 'R$ 100', shortLabel: '100', type: 'note', gradientFrom: '#4DB8C7', gradientTo: '#A8DDE5', accentColor: '#2A9AAD', textColor: '#1A6B78', borderColor: '#3BAABB' },
  { value: 50,  label: 'R$ 50',  shortLabel: '50',  type: 'note', gradientFrom: '#E8955A', gradientTo: '#F5C9A0', accentColor: '#D47835', textColor: '#8B4513', borderColor: '#D98C52' },
  { value: 20,  label: 'R$ 20',  shortLabel: '20',  type: 'note', gradientFrom: '#E8C54A', gradientTo: '#F5E4A0', accentColor: '#D4A827', textColor: '#8B7000', borderColor: '#D9B63E' },
  { value: 10,  label: 'R$ 10',  shortLabel: '10',  type: 'note', gradientFrom: '#E07070', gradientTo: '#F5B8B8', accentColor: '#C04040', textColor: '#8B2020', borderColor: '#D06060' },
  { value: 5,   label: 'R$ 5',   shortLabel: '5',   type: 'note', gradientFrom: '#B080D0', gradientTo: '#D8C0E8', accentColor: '#9060B0', textColor: '#5A3070', borderColor: '#A070C0' },
  { value: 2,   label: 'R$ 2',   shortLabel: '2',   type: 'note', gradientFrom: '#7090C0', gradientTo: '#B8CCE0', accentColor: '#5070A0', textColor: '#2A4060', borderColor: '#6080B0' },
  { value: 1,    label: 'R$ 1',    shortLabel: '1',    type: 'coin', gradientFrom: '#D4A844', gradientTo: '#F0D080', accentColor: '#B88C2A', textColor: '#705010', borderColor: '#C89838' },
  { value: 0.50, label: 'R$ 0,50', shortLabel: '0,50', type: 'coin', gradientFrom: '#C0C0C0', gradientTo: '#E8E8E8', accentColor: '#A0A0A0', textColor: '#606060', borderColor: '#B0B0B0' },
  { value: 0.25, label: 'R$ 0,25', shortLabel: '0,25', type: 'coin', gradientFrom: '#B8B0A0', gradientTo: '#D8D0C4', accentColor: '#989080', textColor: '#585048', borderColor: '#A8A090' },
  { value: 0.10, label: 'R$ 0,10', shortLabel: '0,10', type: 'coin', gradientFrom: '#C8A838', gradientTo: '#E8D078', accentColor: '#A88C20', textColor: '#685010', borderColor: '#B89830' },
  { value: 0.05, label: 'R$ 0,05', shortLabel: '0,05', type: 'coin', gradientFrom: '#B08040', gradientTo: '#D0A868', accentColor: '#906828', textColor: '#604018', borderColor: '#A07038' },
];

function getChangeBreakdown(amount: number): { piece: CurrencyPiece; count: number }[] {
  const result: { piece: CurrencyPiece; count: number }[] = [];
  let remaining = Math.round(amount * 100);
  for (const piece of CURRENCY_PIECES) {
    const cents = Math.round(piece.value * 100);
    const count = Math.floor(remaining / cents);
    if (count > 0) {
      result.push({ piece, count });
      remaining -= count * cents;
    }
  }
  return result;
}

function NoteMini({ piece, count }: { piece: CurrencyPiece; count: number }) {
  return (
    <div className="relative group">
      <div
        style={{
          background: `linear-gradient(135deg, ${piece.gradientFrom} 0%, ${piece.gradientTo} 60%, ${piece.gradientFrom} 100%)`,
          borderColor: piece.borderColor,
          width: '100px',
          height: '52px',
        }}
        className="border-2 rounded-md relative overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-default"
      >
        {/* Watermark circle pattern */}
        <div
          style={{
            background: `radial-gradient(circle at 25% 50%, ${piece.gradientTo}80 0%, transparent 45%)`,
          }}
          className="absolute inset-0 pointer-events-none"
        />
        {/* Effigy silhouette (left side) */}
        <div
          style={{
            background: `radial-gradient(ellipse at 50% 40%, ${piece.accentColor}40 0%, transparent 70%)`,
            width: '32px',
            height: '40px',
            left: '6px',
            top: '6px',
          }}
          className="absolute rounded-full pointer-events-none"
        />
        {/* Head silhouette */}
        <svg viewBox="0 0 30 40" style={{ position: 'absolute', left: '8px', top: '6px', width: '24px', height: '36px', opacity: 0.25 }}>
          <ellipse cx="15" cy="12" rx="8" ry="10" fill={piece.textColor} />
          <path d="M7 22 Q15 18 23 22 L23 38 Q15 35 7 38 Z" fill={piece.textColor} />
          <path d="M10 6 Q12 2 15 1 Q18 2 20 6" fill="none" stroke={piece.textColor} strokeWidth="1.5" />
        </svg>
        {/* Denomination number (top right) */}
        <div
          style={{ color: piece.textColor }}
          className="absolute top-1 right-2 font-black leading-none"
        >
          <span className="text-lg">{piece.shortLabel}</span>
        </div>
        {/* "REAIS" text */}
        <div
          style={{ color: piece.textColor }}
          className="absolute bottom-1 left-2"
        >
          <span className="text-[6px] font-bold tracking-widest opacity-60">REAIS</span>
        </div>
        {/* Value bottom-right */}
        <div
          style={{ color: piece.textColor }}
          className="absolute bottom-0.5 right-2"
        >
          <span className="text-[7px] font-bold opacity-50">{piece.label}</span>
        </div>
        {/* Decorative line pattern */}
        <div
          style={{
            background: `repeating-linear-gradient(90deg, ${piece.accentColor}08, ${piece.accentColor}08 1px, transparent 1px, transparent 4px)`,
          }}
          className="absolute inset-0 pointer-events-none"
        />
        {/* Inner border decoration */}
        <div
          style={{ borderColor: `${piece.accentColor}30` }}
          className="absolute inset-[3px] border border-dashed rounded-sm pointer-events-none"
        />
      </div>
      {/* Count badge */}
      {count > 1 && (
        <span
          style={{ background: piece.accentColor }}
          className="absolute -top-2 -right-2 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-20 border-2 border-white/30"
        >
          {count}x
        </span>
      )}
    </div>
  );
}

function CoinMini({ piece, count }: { piece: CurrencyPiece; count: number }) {
  return (
    <div className="relative">
      <div
        style={{
          background: `radial-gradient(circle at 40% 35%, ${piece.gradientTo} 0%, ${piece.gradientFrom} 70%, ${piece.accentColor} 100%)`,
          borderColor: piece.borderColor,
          boxShadow: `inset 0 2px 6px ${piece.gradientTo}80, inset 0 -2px 4px ${piece.accentColor}60, 0 3px 8px rgba(0,0,0,0.4)`,
          width: '44px',
          height: '44px',
        }}
        className="border-2 rounded-full flex flex-col items-center justify-center relative overflow-hidden cursor-default"
      >
        {/* Inner ring */}
        <div
          style={{ borderColor: `${piece.accentColor}50` }}
          className="absolute inset-[4px] rounded-full border pointer-events-none"
        />
        {/* Value */}
        <span style={{ color: piece.textColor }} className="text-[9px] font-black leading-none relative z-10">
          {piece.shortLabel}
        </span>
        {/* Star pattern */}
        <div
          style={{ color: piece.textColor }}
          className="absolute bottom-[6px] text-[5px] opacity-40 font-bold"
        >
          ★
        </div>
      </div>
      {count > 1 && (
        <span
          style={{ background: piece.accentColor }}
          className="absolute -top-1 -right-1 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg z-20 border border-white/30"
        >
          {count}x
        </span>
      )}
    </div>
  );
}

function ChangeVisual({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  const breakdown = getChangeBreakdown(amount);
  if (breakdown.length === 0) return null;
  const notes = breakdown.filter(b => b.piece.type === 'note');
  const coins = breakdown.filter(b => b.piece.type === 'coin');

  return (
    <div className="mt-4 space-y-4">
      <div className="text-slate-500 text-[10px] font-bold tracking-widest text-center uppercase">Sugestão de Troco</div>
      {notes.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {notes.map(({ piece, count }) => (
            <NoteMini key={piece.value} piece={piece} count={count} />
          ))}
        </div>
      )}
      {coins.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {coins.map(({ piece, count }) => (
            <CoinMini key={piece.value} piece={piece} count={count} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Select Cashier Screen
───────────────────────────────────────────── */
function SelectCashierScreen({ onSelect, autoCaixa }: { onSelect: (session: CashierSession) => void, autoCaixa: string | null }) {
  const [cashiers] = useState<CashierSession[]>([
    { id: "cx1", number: 1, operator: "Maria Silva", openedAt: new Date(), initialBalance: 200, sales: [], withdrawals: [], supplements: [] },
    { id: "cx2", number: 2, operator: "João Santos", openedAt: new Date(), initialBalance: 200, sales: [], withdrawals: [], supplements: [] },
    { id: "cx3", number: 3, operator: "Ana Costa", openedAt: new Date(), initialBalance: 150, sales: [], withdrawals: [], supplements: [] },
    { id: "cx4", number: 4, operator: "Carlos Lima", openedAt: new Date(), initialBalance: 200, sales: [], withdrawals: [], supplements: [] },
    { id: "cx5", number: 5, operator: "Livre", openedAt: new Date(), initialBalance: 0, sales: [], withdrawals: [], supplements: [] },
    { id: "cx6", number: 6, operator: "Livre", openedAt: new Date(), initialBalance: 0, sales: [], withdrawals: [], supplements: [] },
  ]);
  
  const [pin, setPin] = useState("");
  const [selected, setSelected] = useState<CashierSession | null>(null);
  const [error, setError] = useState("");
  const time = useClock();
  const [host, setHost] = useState("");

  useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  useEffect(() => {
    if (autoCaixa) {
      const cx = cashiers.find(c => c.number.toString() === autoCaixa);
      if (cx) setSelected(cx);
    }
  }, [autoCaixa, cashiers]);

  const handleSelectCashier = (cx: CashierSession) => {
    onSelect(cx);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) { setError("Digite 4 dígitos"); return; }
    if (selected) onSelect(selected);
  };

  const downloadShortcut = (cx: CashierSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/pdv?caixa=${cx.number}`;
    const content = `[InternetShortcut]\nURL=${url}\nIconIndex=0`;
    const blob = new Blob([content], { type: "application/octet-stream" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = href;
    a.download = `Caixa_${String(cx.number).padStart(2, "0")}.url`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(href);
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-white overflow-hidden relative">
      {/* Background overlay if global bg image exists */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md z-0"></div>

      {/* Top bar */}
      <div className="relative z-10 bg-[#111528]/80 backdrop-blur-xl border-b border-indigo-500/10 px-8 py-5 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <div className="text-[var(--accent)] text-3xl font-black tracking-tight flex items-center gap-2">
            <ShoppingCart size={28} /> PDV
          </div>
          <div className="text-slate-400 text-sm border-l border-indigo-500/20 pl-4">Abertura de Turno</div>
        </div>
        <div className="text-right">
          <div className="text-white text-2xl font-bold tracking-tight" suppressHydrationWarning>
            {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-slate-400 text-xs" suppressHydrationWarning>{time.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-5xl">
          <h1 className="text-center text-white text-3xl font-bold tracking-tight mb-2">Selecione o seu Caixa</h1>
          <p className="text-center text-slate-400 text-sm mb-12">Escolha o terminal que você irá operar neste turno.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {cashiers.map(cx => (
              <button
                key={cx.id}
                onClick={() => handleSelectCashier(cx)}
                className={`relative overflow-hidden border p-6 rounded-2xl transition-all text-left group shadow-lg ${
                  selected?.id === cx.id
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-[var(--accent)]/20"
                    : cx.operator === "Livre"
                    ? "border-slate-800 bg-[#0c0f1a]/80 hover:border-slate-600"
                    : "border-indigo-500/20 bg-[#111528]/80 hover:border-indigo-500/50"
                }`}
              >
                {/* Decorative background glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--accent)]/10 blur-3xl rounded-full"></div>

                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${selected?.id === cx.id ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30" : "bg-slate-800 text-slate-300 group-hover:bg-slate-700"}`}>
                      {String(cx.number).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">TERMINAL</div>
                      <div className="text-white font-bold text-lg">Caixa {String(cx.number).padStart(2, "0")}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cx.operator === "Livre" ? "border-slate-700 text-slate-400 bg-slate-800/50" : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"}`}>
                      {cx.operator === "Livre" ? "LIVRE" : "OCUPADO"}
                    </div>
                    <div 
                      onClick={(e) => downloadShortcut(cx, e)}
                      className="text-slate-500 hover:text-indigo-400 p-1 rounded-full hover:bg-indigo-500/10 transition-colors"
                      title="Baixar Atalho para este Caixa"
                    >
                      <Download size={14} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                  <User size={16} className={cx.operator === "Livre" ? "text-slate-600" : "text-indigo-400"} />
                  <span className={`text-sm font-semibold ${cx.operator === "Livre" ? "text-slate-500" : "text-slate-200"}`}>{cx.operator}</span>
                </div>
                {cx.operator !== "Livre" && (
                  <div className="mt-3 text-xs text-slate-400 flex justify-between relative z-10">
                    <span>Fundo: <strong className="text-white">R$ {fmt(cx.initialBalance)}</strong></span>
                    <span>Vendas: <strong className="text-white">{cx.sales.length}</strong></span>
                  </div>
                )}
                
                {host && (
                  <div className="mt-4 relative z-10 pt-3 border-t border-indigo-500/10" onClick={(e) => e.stopPropagation()}>
                    <div className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Acesso Direto (Link)</div>
                    <div className="text-xs font-mono text-indigo-300 bg-black/40 border border-indigo-500/20 px-2 py-1.5 rounded select-all cursor-pointer hover:bg-indigo-500/10 transition-colors w-full overflow-hidden text-ellipsis whitespace-nowrap" title="Clique para selecionar e copiar">
                      http://{host}:3000/pdv?caixa={cx.number}
                    </div>
                  </div>
                )}
                </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main PDV Container
───────────────────────────────────────────── */
function PDVContainer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialOrderId = searchParams.get("orderId");
  const autoCaixa = searchParams.get("caixa");

  // Session
  const [session, setSession] = useState<CashierSession | null>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [multiplier, setMultiplier] = useState(1);
  const [discountInput, setDiscountInput] = useState("0");
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);

  // UI state
  const [errorMessage, setErrorMessage] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [onlineLookup, setOnlineLookup] = useState<{ name: string; source: string; barcode: string; imageUrl?: string } | null>(null);
  const [lookingOnline, setLookingOnline] = useState(false);

  // Modals
  const [modal, setModal] = useState<"" | "payment" | "success" | "order" | "closing" | "withdrawal" | "pricecheck" | "cpf" | "hotkeys">(""); 
  const [ordersList, setOrdersList] = useState<OrderListItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Hotkeys
  const { hotkeys, saveHotkeys, isLoaded } = useHotkeys();
  const [tempHotkeys, setTempHotkeys] = useState<PDVHotkeys | null>(null);
  const [capturingKey, setCapturingKey] = useState<keyof PDVHotkeys | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("MONEY");
  const [amountGiven, setAmountGiven] = useState("");
  const [lastSaleId, setLastSaleId] = useState("");

  // Cash closing (Blind)
  const [closingCounted, setClosingCounted] = useState("");
  const [closingNote, setClosingNote] = useState("");
  const [closingStep, setClosingStep] = useState<"input" | "result">("input");
  const [countedMoney, setCountedMoney] = useState("");
  const [countedCard, setCountedCard] = useState("");
  const [countedPix, setCountedPix] = useState("");

  // Network / Contingency
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [contingencySales, setContingencySales] = useState<any[]>([]);

  // Inactivity / Ads Screensaver
  const [isIdle, setIsIdle] = useState(false);
  const [priceCheckIdle, setPriceCheckIdle] = useState(false);
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [promotionalAds, setPromotionalAds] = useState<any[]>(PROMOTIONAL_ADS);
  const [rotationSpeed, setRotationSpeed] = useState(4000); // default 4s
  const [idleTimeout, setIdleTimeout] = useState(15000); // default 15s

  useEffect(() => {
    const saved = localStorage.getItem("EMPORIO_PDV_PROMOTIONAL_ADS");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPromotionalAds(parsed.filter(x => x.active));
        }
      } catch (e) {
        console.error(e);
      }
    }
    const savedSpeed = localStorage.getItem("EMPORIO_PDV_AD_SPEED");
    if (savedSpeed) {
      setRotationSpeed(parseInt(savedSpeed) * 1000);
    }
    const savedTimeout = localStorage.getItem("EMPORIO_PDV_IDLE_TIMEOUT");
    if (savedTimeout) {
      setIdleTimeout(parseInt(savedTimeout) * 1000);
    }
  }, []);


  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    let priceCheckTimer: NodeJS.Timeout;

    const resetIdleTimers = () => {
      setIsIdle(false);
      setPriceCheckIdle(false);
      
      clearTimeout(idleTimer);
      clearTimeout(priceCheckTimer);

      idleTimer = setTimeout(() => {
        setIsIdle(true);
      }, idleTimeout); // user configured idle time


      priceCheckTimer = setTimeout(() => {
        setPriceCheckIdle(true);
      }, 10000); // 10 seconds for Price Check modal screensaver
    };

    window.addEventListener("mousemove", resetIdleTimers);
    window.addEventListener("keydown", resetIdleTimers);
    window.addEventListener("click", resetIdleTimers);
    
    resetIdleTimers();

    return () => {
      window.removeEventListener("mousemove", resetIdleTimers);
      window.removeEventListener("keydown", resetIdleTimers);
      window.removeEventListener("click", resetIdleTimers);
      clearTimeout(idleTimer);
      clearTimeout(priceCheckTimer);
    };
  }, []);

  // Ads cycle timer
  useEffect(() => {
    if (promotionalAds.length === 0) return;
    const cycle = setInterval(() => {
      setActiveAdIndex(prev => (prev + 1) % promotionalAds.length);
    }, rotationSpeed); // Rotate ads dynamically
    return () => clearInterval(cycle);
  }, [promotionalAds, rotationSpeed]);




  // Withdrawal / Supplement
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [withdrawalType, setWithdrawalType] = useState<"withdrawal" | "supplement">("withdrawal");

  // Price check
  const [priceCheckQuery, setPriceCheckQuery] = useState("");
  const [priceCheckResult, setPriceCheckResult] = useState<any>(null);
  const [priceCheckLoading, setPriceCheckLoading] = useState(false);

  // CPF
  const [cpfInput, setCpfInput] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const receiptFrameRef = useRef<HTMLIFrameElement>(null);
  const time = useClock();

  // Impressão automática do cupom
  const printReceipt = useCallback((
    saleId: string,
    cartItems: CartItem[],
    saleTotal: number,
    saleSub: number,
    saleDiscount: number,
    salePay: string,
    saleGiven: number,
    saleChange: number,
    cashbackEarned: number = 0,
    generatedCoupons: { campaignName: string; code: string }[] = []
  ) => {
    const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const payLabels: Record<string,string> = { MONEY:'Dinheiro', PIX:'PIX', CREDIT_CARD:'Cartão Crédito', DEBIT_CARD:'Cartão Débito', VOUCHER:'Voucher' };
    const itemRows = cartItems.map(i => {
      const n = i.name.length > 24 ? i.name.substring(0,24) : i.name;
      return `<tr><td>${n}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${fmtBRL(i.price)}</td><td style="text-align:right">${fmtBRL(i.quantity*i.price)}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cupom</title>
<style>@page{size:80mm auto;margin:0}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:4mm;color:#000;background:#fff}.center{text-align:center}.bold{font-weight:bold}.sep{border-top:1px dashed #000;margin:6px 0}.store{font-size:16px;font-weight:900;letter-spacing:2px}table{width:100%;border-collapse:collapse}th,td{padding:2px 0;font-size:11px}th{border-bottom:1px solid #000}.total-row td{font-size:14px;font-weight:900;padding-top:4px}.footer{font-size:9px;margin-top:10px}</style>
</head><body>
<div class="center"><div class="store">EMPORIO</div><div>CNPJ: 00.000.000/0001-00</div><div>Rua Principal, 100 - Centro</div></div>
<div class="sep"></div>
<div class="center bold">CUPOM NÃO FISCAL</div>
<div>Data: ${dateStr} ${timeStr}</div>
<div>Caixa: ${String(session?.number || 1).padStart(2,'0')} | Op: ${session?.operator || 'Operador'}</div>
<div>Venda: ${saleId.slice(0,12).toUpperCase()}</div>
<div class="sep"></div>
<table><thead><tr><th style="text-align:left">DESCRIÇÃO</th><th>QTD</th><th style="text-align:right">UNIT</th><th style="text-align:right">TOTAL</th></tr></thead><tbody>${itemRows}</tbody></table>
<div class="sep"></div>
<table><tr><td>Subtotal</td><td style="text-align:right">${fmtBRL(saleSub)}</td></tr>
${saleDiscount > 0 ? `<tr><td>Desconto</td><td style="text-align:right">-${fmtBRL(saleDiscount)}</td></tr>` : ''}
<tr class="total-row"><td>TOTAL</td><td style="text-align:right">R$ ${fmtBRL(saleTotal)}</td></tr></table>
<div class="sep"></div>
<div>Forma Pgto: ${payLabels[salePay] || salePay}</div>
${salePay === 'MONEY' ? `<div>Recebido: R$ ${fmtBRL(saleGiven)}</div><div class="bold">Troco: R$ ${fmtBRL(saleChange)}</div>` : ''}
${cpfInput ? `<div class="sep"></div><div>CPF na Nota: ${cpfInput}</div>` : ''}
${cashbackEarned > 0 ? `<div class="sep"></div><div class="center bold">FIDELIDADE CRM</div><div class="center bold" style="font-size:14px;color:#000;">CASHBACK CREDITADO: R$ ${fmtBRL(cashbackEarned)}</div>` : ''}
${generatedCoupons.length > 0 ? generatedCoupons.map(c => `
  <div class="sep"></div>
  <div class="center bold" style="font-size:13px;letter-spacing:1px;">CUPOM DA SORTE</div>
  <div class="center">${c.campaignName}</div>
  <div class="center" style="font-size:16px;font-weight:900;margin:6px 0;border:1px solid #000;padding:4px;">${c.code}</div>
`).join('') : ''}
<div class="sep"></div>
<div class="center footer"><div>Obrigado pela preferência!</div><div>Volte sempre!</div><div style="margin-top:6px">Emporio PDV v2.0</div></div>
<div style="height:20mm"></div>
</body></html>`;

    const iframe = receiptFrameRef.current;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open(); doc.write(html); doc.close();
        setTimeout(() => { iframe.contentWindow?.print(); }, 400);
      }
    }
  }, [session, cpfInput]);

  // Totals
  useEffect(() => {
    const sub = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const disc = parseFloat(discountInput) || 0;
    setSubtotal(sub);
    setTotal(Math.max(0, sub - disc));
  }, [cart, discountInput]);

  // Load order from URL on mount
  useEffect(() => {
    if (initialOrderId && session) handleImportOrder(initialOrderId);
  }, [initialOrderId, session]);

  // Auto-focus
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      if (modal !== "" ) return;
      if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        inputRef.current?.focus();
      }
    }, 800);
    return () => clearInterval(interval);
  }, [modal, session]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!session || !isLoaded) return;
    const handler = (e: KeyboardEvent) => {
      if (capturingKey) {
        e.preventDefault();
        setTempHotkeys(prev => prev ? { ...prev, [capturingKey]: e.key === " " ? "Space" : e.key } : null);
        setCapturingKey(null);
        return;
      }
      
      if (e.key === hotkeys.multiply) {
        const val = parseInt(barcodeInput);
        if (!isNaN(val) && val > 0) {
          e.preventDefault();
          setMultiplier(val);
          setBarcodeInput("");
        }
        return;
      }

      if (e.key === hotkeys.discount) {
        e.preventDefault();
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
        return;
      }
      
      if (modal !== "") {
        if (e.key === "Escape") { e.preventDefault(); setModal(""); setCapturingKey(null); }
        return;
      }
      if (e.key === hotkeys.payment) { e.preventDefault(); if (cart.length > 0) setModal("payment"); }
      if (e.key === hotkeys.closing)  { e.preventDefault(); setModal("closing"); }
      if (e.key === hotkeys.importOrder)  { e.preventDefault(); openOrderModal(); }
      if (e.key === hotkeys.withdrawal)  { e.preventDefault(); setWithdrawalType("withdrawal"); setModal("withdrawal"); }
      if (e.key === hotkeys.supplement)  { e.preventDefault(); setWithdrawalType("supplement"); setModal("withdrawal"); }
      if (e.key === hotkeys.priceCheck)  { e.preventDefault(); setPriceCheckQuery(""); setPriceCheckResult(null); setModal("pricecheck"); }
      if (e.key === hotkeys.cpf)  { e.preventDefault(); setCpfInput(""); setModal("cpf"); }
      if (e.key === hotkeys.cancelItem) {
        e.preventDefault();
        if (cart.length > 0 && confirm("Cancelar item selecionado?")) {
          setCart(prev => prev.slice(0, -1));
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (cart.length > 0 && confirm("Cancelar cupom atual?")) clearSale();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modal, cart, session, isLoaded, hotkeys, capturingKey]);

  // ── Actions ──────────────────────────────────
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setOnlineLookup(null);
    let query = barcodeInput.trim();
    if (!query) return;

    let inlineQty: number | undefined = undefined;
    const match = query.match(/^(\d+)[*xX](.+)$/);
    if (match) {
      inlineQty = parseInt(match[1]);
      query = match[2];
      if (inlineQty > 0) setMultiplier(inlineQty);
    }

    // Toledo MGV6 scale barcode decoder (13 digits starting with 2)
    // Format: 2 + CCCCC (5 digits product code) + VVVVVV (6 digits value) + X (check digit)
    const isScaleBarcode = /^2\d{12}$/.test(query);
    let scaleCode = "";
    let scaleValue = 0;
    if (isScaleBarcode) {
      scaleCode = query.substring(1, 6);
      scaleValue = parseFloat(query.substring(7, 12)) / 100;
    }

    // 1. Banco local por código de barras exato
    const lookupCode = isScaleBarcode ? scaleCode : query;
    let { product } = await getProductByBarcode(lookupCode);

    if (!product && isScaleBarcode) {
      // Find product by matching code directly (short codes)
      const { products } = await searchProducts(scaleCode);
      if (products && products.length > 0) {
        product = products[0];
      }
    }

    if (product) {
      let finalQty = inlineQty || multiplier;
      if (isScaleBarcode && Number(product.price) > 0) {
        finalQty = scaleValue / Number(product.price);
      }
      addToCart(product, finalQty);
      setBarcodeInput("");
      return;
    }

    // 2. Banco local por nome
    const { products } = await searchProducts(query);
    if (products && products.length > 0) {
      if (products.length === 1) { addToCart(products[0], inlineQty); setBarcodeInput(""); }
      else { setSearchResults(products); setShowSearchResults(true); }
      return;
    }

    // 3. Consulta na INTERNET
    if (/^\d{8,14}$/.test(query)) {
      setLookingOnline(true);
      const result = await lookupBarcodeOnline(query);
      setLookingOnline(false);
      if (result.found && result.name) {
        setOnlineLookup({ name: result.name, source: result.source || "Internet", barcode: query, imageUrl: result.imageUrl });
        setBarcodeInput("");
        return;
      }
    }

    setErrorMessage(`EAN ${query} não encontrado no banco nem na internet`);
  };

  const addToCart = (product: any, qty?: number) => {
    const quantityToAdd = qty || multiplier;
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantityToAdd } : i);
      return [...prev, { id: product.id, name: product.name, price: Number(product.price), quantity: quantityToAdd, barcode: product.barcode || "" }];
    });
    setMultiplier(1);
    setSearchResults([]); setShowSearchResults(false);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  const clearSale = useCallback(() => {
    setCart([]); setDiscountInput("0"); setLinkedOrderId(null);
    setBarcodeInput(""); setErrorMessage(""); setAmountGiven("");
    router.replace("/pdv");
  }, [router]);

  const openOrderModal = async () => {
    setModal("order"); setLoadingOrders(true);
    const { orders } = await getOrders();
    if (orders) setOrdersList(orders.filter((o: any) => o.status === "DRAFT" || o.status === "CONFIRMED"));
    setLoadingOrders(false);
  };

  const handleImportOrder = async (orderId: string) => {
    const { order, error } = await getOrderById(orderId);
    if (error || !order) { setErrorMessage(error || "Pedido não encontrado"); return; }
    setCart(order.items.map((i: any) => ({ id: i.product.id, name: i.product.name, price: Number(i.unitPrice), quantity: i.quantity, barcode: i.product.barcode || "" })));
    setDiscountInput(String(order.discount || 0));
    setLinkedOrderId(order.id);
    setModal("");
  };

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;
    const disc = parseFloat(discountInput) || 0;
    const saleGiven = parseFloat(amountGiven) || 0;
    const saleChange = paymentMethod === "MONEY" && saleGiven >= total ? saleGiven - total : 0;
    
    let res: any;
    if (isOfflineMode) {
      const mockSaleId = `OFF-${Date.now()}`;
      res = {
        success: true,
        saleId: mockSaleId,
        cashbackEarned: 0,
        generatedCoupons: []
      };
      setContingencySales(prev => [...prev, {
        saleId: mockSaleId,
        items: cart.map(i => ({ productId: i.id, quantity: i.quantity, unitPrice: i.price })),
        paymentMethod,
        discount: disc,
        at: new Date()
      }]);
    } else {
      res = await createSale({
        items: cart.map(i => ({ productId: i.id, quantity: i.quantity, unitPrice: i.price })),
        paymentMethod,
        discount: disc,
        orderId: linkedOrderId || undefined,
        customerCpf: cpfInput || undefined
      });
    }

    if (res.success && res.saleId) {
      if (session) {
        setSession(prev => prev ? { ...prev, sales: [...prev.sales, { id: res.saleId, total, paymentMethod, at: new Date() }] } : prev);
      }
      
      const cashback = res.cashbackEarned || 0;
      const finalDiscount = disc + (res.promoDiscountApplied || 0);
      const finalTotal = Math.max(0, subtotal - finalDiscount);

      // Imprime cupom automaticamente
      printReceipt(
        res.saleId,
        cart,
        finalTotal,
        subtotal,
        finalDiscount,
        paymentMethod,
        saleGiven,
        saleChange,
        cashback,
        res.generatedCoupons || []
      );

      setLastSaleId(res.saleId);
      setModal("");
      clearSale();
    } else {
      alert("Erro ao finalizar: " + (res.error || "Desconhecido"));
    }
  };

  const handleWithdrawal = () => {
    const amt = parseFloat(withdrawalAmount);
    if (!amt || amt <= 0) return;
    if (session) {
      setSession(prev => {
        if (!prev) return prev;
        if (withdrawalType === "withdrawal") {
          return { ...prev, withdrawals: [...prev.withdrawals, { id: Date.now().toString(), amount: amt, reason: withdrawalReason || "Sangria", at: new Date() }] };
        } else {
          return { ...prev, supplements: [...prev.supplements, { id: Date.now().toString(), amount: amt, reason: withdrawalReason || "Suprimento", at: new Date() }] };
        }
      });
    }
    setWithdrawalAmount(""); setWithdrawalReason(""); setModal("");
  };

  const handlePriceCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceCheckQuery.trim()) return;
    setPriceCheckLoading(true); setPriceCheckResult(null);
    const { product } = await getProductByBarcode(priceCheckQuery.trim());
    if (product) { setPriceCheckResult(product); }
    else {
      const { products } = await searchProducts(priceCheckQuery.trim());
      if (products && products.length > 0) setPriceCheckResult(products[0]);
      else setPriceCheckResult({ name: "Produto não encontrado", price: null });
    }
    setPriceCheckLoading(false);
  };

  // Session stats for closing
  const sessionStats = session ? {
    totalSales: session.sales.reduce((a, s) => a + s.total, 0),
    byMethod: Object.entries(PAYMENT_LABELS).map(([key, label]) => ({
      key, label,
      total: session.sales.filter(s => s.paymentMethod === key).reduce((a, s) => a + s.total, 0),
      count: session.sales.filter(s => s.paymentMethod === key).length,
    })).filter(m => m.count > 0),
    totalWithdrawals: session.withdrawals.reduce((a, w) => a + w.amount, 0),
    totalSupplements: session.supplements.reduce((a, s) => a + s.amount, 0),
    expectedCash: 0,
  } : null;

  const expectedCash = session
    ? session.initialBalance
      + session.sales.filter(s => s.paymentMethod === "MONEY").reduce((a, s) => a + s.total, 0)
      + (session.supplements.reduce((a, s) => a + s.amount, 0))
      - (session.withdrawals.reduce((a, w) => a + w.amount, 0))
    : 0;

  const troco = paymentMethod === "MONEY" && parseFloat(amountGiven) >= total
    ? parseFloat(amountGiven) - total
    : 0;

  // ── Render: Select screen ─────────────────────
  if (!session) return <SelectCashierScreen onSelect={setSession} autoCaixa={autoCaixa} />;

  // ── Render: PDV ───────────────────────────────
  if (isIdle && cart.length === 0 && promotionalAds.length > 0) {
    const currentAd = promotionalAds[activeAdIndex] || promotionalAds[0];
    const adImg = currentAd.imageUrl || (
      currentAd.title.includes("HEINEKEN") ? "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?q=80&w=600" :
      currentAd.title.includes("HORTIFRÚTI") ? "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600" :
      currentAd.title.includes("CPF") ? "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=600" :
      currentAd.title.includes("LEITE") || currentAd.title.includes("RELÂMPAGO") ? "https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600" :
      "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600"
    );

    return (
      <div 
        className="h-screen w-full flex flex-col justify-center items-center bg-[#070a1e] text-white p-12 relative overflow-hidden select-none cursor-pointer"
        onClick={() => setIsIdle(false)}
        onMouseMove={() => setIsIdle(false)}
      >
        {/* Eye-catching semi-clear backdrop with slow motion animation */}
        {adImg && (
          <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
            <img 
              src={adImg} 
              alt="Backdrop" 
              className="w-full h-full object-cover blur-[5px] scale-110 opacity-[0.55] transition-all duration-1000 ease-in-out animate-pulse" 
              style={{ animationDuration: '6s' }}
            />
            {/* Elegant vignette and darkness overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#070a1e]/40 via-[#070a1e]/85 to-[#070a1e]" />
          </div>
        )}
        
        <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/[0.03] blur-[120px] pointer-events-none z-0" />
        <div className={`w-full max-w-2xl bg-gradient-to-r ${currentAd.color} border border-white/10 rounded-3xl p-12 shadow-2xl relative overflow-hidden text-center space-y-6 animate-in zoom-in-95 duration-500 z-10 hover:scale-[1.01] transition-transform`}>
          <span className="absolute top-6 right-6 text-[10px] bg-white/20 border border-white/10 font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full">{currentAd.badge}</span>
          <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={28} className="text-white" />
          </div>
          {adImg && (
            <img src={adImg} alt="Anúncio" className="max-h-[160px] object-cover mx-auto rounded-2xl shadow-2xl border border-white/15 mb-4 bg-white/5" />
          )}
          <h1 className="text-4xl font-black tracking-tight leading-none text-white uppercase drop-shadow">{currentAd.title}</h1>
          <p className="text-base text-white/90 max-w-lg mx-auto font-bold drop-shadow">{currentAd.desc}</p>
          <div className="text-[10px] text-white/60 font-bold uppercase tracking-widest pt-8 border-t border-white/10">Toque na tela ou pressione qualquer tecla para continuar</div>
        </div>
      </div>
    );
  }



  return (


    <div className="h-screen w-full flex flex-col bg-[#0c0f1a] text-white overflow-hidden select-none">
      
      {/* ── HEADER ── */}
      <div className="bg-[#111528] border-b border-indigo-500/10 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold shadow-lg shadow-[var(--accent)]/30">
              E
            </div>
            <span className="text-white font-bold text-lg tracking-tight ml-1">PDV</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
            <span className="text-indigo-200 text-xs font-bold tracking-wide">CAIXA {String(session.number).padStart(2, "0")}</span>
          </div>
          <button 
            type="button"
            onClick={() => {
              if (isOfflineMode) {
                alert(`Conexão reestabelecida! Transmitindo ${contingencySales.length} NFC-e emitidas em contingência offline para a SEFAZ...`);
                setContingencySales([]);
              }
              setIsOfflineMode(prev => !prev);
            }}
            className={`flex items-center gap-2 border px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
              isOfflineMode 
                ? "bg-rose-500/20 border-rose-500/35 text-rose-400" 
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOfflineMode ? "bg-rose-500 animate-pulse shadow-[0_0_8px_#ef4444]" : "bg-emerald-500 shadow-[0_0_8px_#10b981]"}`}></span>
            <span>{isOfflineMode ? `Contingência Offline (${contingencySales.length})` : "Online (SEFAZ)"}</span>
          </button>

          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <User size={14} />
            <span>{session.operator}</span>
          </div>
          {linkedOrderId && (
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded-lg shadow-sm">
              <FileText size={14} />
              PEDIDO #{linkedOrderId.slice(0,8).toUpperCase()}
              <button onClick={() => setLinkedOrderId(null)} className="hover:text-amber-300 ml-1"><X size={12} /></button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-6">
          {/* Shortcuts */}
          <div className="flex gap-1.5">
            {[
              { key: hotkeys.cancelItem, label: "Cancela" },
              { key: hotkeys.cpf, label: "CPF" },
              { key: hotkeys.withdrawal, label: "Sangria" },
              { key: hotkeys.supplement, label: "Supri" },
              { key: hotkeys.priceCheck, label: "Preço" },
              { key: hotkeys.importOrder, label: "Pedido" },
              { key: hotkeys.closing, label: "Fechar" },
              { key: hotkeys.payment, label: "Pagar", primary: true },
            ].map((s, i) => (
              <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${s.primary ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]" : "bg-[#0c0f1a] border-slate-800 text-slate-400"}`}>
                <div className={`text-[10px] font-bold px-1 rounded ${s.primary ? "bg-[var(--accent)] text-white" : "bg-slate-800 text-slate-300"}`}>{s.key}</div>
                <div className="text-[10px] font-semibold whitespace-nowrap">{s.label}</div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => { setTempHotkeys(hotkeys); setModal("hotkeys"); }}
            className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Configurações de Atalhos"
          >
            <Settings size={18} />
          </button>
          <div className="text-white font-bold text-xl tabular-nums tracking-tight" suppressHydrationWarning>
            {time.toLocaleTimeString("pt-BR")}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL: Displays ── */}
        <div className="w-[340px] flex flex-col bg-[#0c0f1a] border-r border-slate-800 p-5 gap-5 shrink-0 z-0">
          
          {/* Produto / Scanner */}
          <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 shadow-lg p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Scanner / Pesquisa</span>
              <Keyboard size={14} className="text-slate-500" />
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className="relative">
                {multiplier > 1 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-[var(--accent)] text-white text-[11px] font-black px-2 py-1 rounded shadow-lg animate-in zoom-in duration-200">
                    {multiplier} x
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  placeholder="Passe o leitor ou digite..."
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] text-white text-sm font-semibold pl-10 pr-4 py-3.5 rounded-xl outline-none transition-all shadow-inner"
                  autoFocus
                />
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </form>
            
            {/* Mensagem de erro */}
            {errorMessage && (
              <div className="text-red-400 text-xs font-semibold bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={14} className="shrink-0" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Último Item Adicionado */}
          <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 shadow-lg p-5 flex-1 flex flex-col">
            <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-4">Último Item Registrado</span>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              {cart.length > 0 ? (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="w-24 h-24 mx-auto bg-[#0c0f1a] rounded-2xl border border-slate-800 flex items-center justify-center mb-4 shadow-inner">
                    <Package size={40} className="text-indigo-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg leading-tight mb-1">{cart[cart.length - 1].name}</h3>
                  <p className="text-slate-500 text-xs font-mono mb-6">{cart[cart.length - 1].barcode}</p>
                  
                  <div className="w-full bg-[#0c0f1a] rounded-xl border border-slate-800 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs font-medium">Valor Unitário</span>
                      <span className="text-white font-mono font-bold">R$ {fmt(cart[cart.length - 1].price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs font-medium">Quantidade</span>
                      <span className="text-white font-mono font-bold">x{cart[cart.length - 1].quantity}</span>
                    </div>
                    <div className="h-px w-full bg-slate-800"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-indigo-300 text-xs font-bold uppercase tracking-wider">Total do Item</span>
                      <span className="text-[var(--accent)] font-mono font-black text-xl">R$ {fmt(cart[cart.length - 1].price * cart[cart.length - 1].quantity)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-600 opacity-50">
                  <ShoppingCart size={48} className="mb-4" />
                  <p className="text-sm font-medium">Aguardando itens...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MIDDLE PANEL: Product List ── */}
        <div className="flex-1 flex flex-col relative bg-[#0c0f1a]">
          
          {/* Efeito de gradiente no topo da tabela */}
          <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-[#0c0f1a] to-transparent z-10 pointer-events-none"></div>

          {/* Lista de itens */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border border-slate-700/50">
                  <Package size={40} className="text-slate-600" />
                </div>
                <div className="text-2xl font-bold text-white mb-2 tracking-tight">Caixa Livre</div>
                <div className="text-sm text-slate-400">Passe um produto no leitor para iniciar a venda</div>
              </div>
            ) : (
              <div className="bg-[#111528] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#151a30] border-b border-slate-800 sticky top-0 z-10">
                    <tr className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                      <th className="px-5 py-4 w-12 text-center">#</th>
                      <th className="px-5 py-4">Produto</th>
                      <th className="px-5 py-4 text-center w-32">Qtd</th>
                      <th className="px-5 py-4 text-right w-32">Vlr Unit</th>
                      <th className="px-5 py-4 text-right w-36">Total</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, i) => (
                      <tr key={item.id} className="border-b border-slate-800/50 hover:bg-indigo-500/5 transition-colors group">
                        <td className="px-5 py-4 text-slate-500 font-medium text-xs text-center">{String(i + 1).padStart(3, "0")}</td>
                        <td className="px-5 py-4">
                          <div className="text-white font-semibold text-sm leading-tight mb-0.5">{item.name}</div>
                          <div className="text-slate-500 text-[10px] font-mono">{item.barcode}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center bg-[#0c0f1a] rounded-lg border border-slate-700 p-1 w-fit mx-auto">
                            <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center text-white font-bold text-sm">{item.quantity}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-slate-400 font-mono text-sm font-medium">R$ {fmt(item.price)}</td>
                        <td className="px-5 py-4 text-right text-white font-black text-sm font-mono">R$ {fmt(item.price * item.quantity)}</td>
                        <td className="px-3 py-4 text-center">
                          <button onClick={() => removeItem(item.id)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Linha de Totais Inferior */}
          <div className="bg-[#111528] border-t border-slate-800 p-6 shrink-0 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
            <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div>
                <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase block mb-1">Subtotal da Venda</span>
                <div className="text-white text-3xl font-black font-mono tracking-tight">R$ {fmt(subtotal)}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase block mb-1">Total Recebido</span>
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xl">R$</span>
                  <input
                    type="number"
                    value={amountGiven}
                    onChange={e => setAmountGiven(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-transparent text-white text-3xl font-black font-mono pl-10 py-1 outline-none border-b-2 border-transparent focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase block mb-1">Troco a Devolver</span>
                <div className="text-emerald-400 text-3xl font-black font-mono tracking-tight">R$ {fmt(troco)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Finalize Buttons ── */}
        <div className="w-[300px] bg-[#111528] flex flex-col border-l border-slate-800 p-6 shrink-0 z-20 shadow-xl">
          <div className="flex-1 space-y-6">
            
            {/* Total Block */}
            <div className="bg-gradient-to-br from-indigo-600 to-[var(--accent)] rounded-2xl p-6 shadow-lg shadow-[var(--accent)]/20 text-white">
              <span className="text-indigo-200 text-[10px] font-bold tracking-widest uppercase block mb-2">Total a Pagar</span>
              <div className="font-black text-4xl font-mono tracking-tight leading-none mb-1">R$ {fmt(total)}</div>
              <div className="text-indigo-200 text-xs mt-2 flex justify-between">
                <span>Itens:</span>
                <span className="font-bold">{cart.reduce((acc, i) => acc + i.quantity, 0)}</span>
              </div>
            </div>

            {/* Configurações da Venda */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-semibold flex justify-between">
                  <span>Desconto (R$)</span>
                  <span className="text-[10px] bg-slate-800 px-1 rounded">[{hotkeys.discount}]</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign size={14} className="text-slate-500" />
                  </div>
                  <input
                    ref={discountInputRef}
                    type="number"
                    value={discountInput}
                    onChange={e => setDiscountInput(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-slate-700 focus:border-indigo-500 text-white font-mono px-3 py-2.5 pl-9 rounded-xl outline-none text-sm transition-all shadow-inner"
                    min="0" step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-semibold">Cliente (CPF/CNPJ)</label>
                <button 
                  onClick={() => setModal("cpf")}
                  className="w-full bg-[#0c0f1a] border border-slate-700 hover:border-indigo-500 text-slate-300 font-mono px-4 py-2.5 rounded-xl outline-none text-sm transition-all flex justify-between items-center shadow-inner"
                >
                  {cpfInput ? cpfInput : <span className="text-slate-500">Não identificado</span>}
                  <ChevronRight size={16} className="text-slate-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mt-6">
            <button onClick={openOrderModal} className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-semibold py-3.5 rounded-xl text-xs tracking-wide transition-all flex items-center justify-center gap-2 border border-slate-700">
              <FileText size={16} /> Importar Pedido [F8]
            </button>
            <button
              onClick={() => setModal("closing")}
              className="w-full bg-slate-800/50 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30 text-slate-300 font-semibold py-3.5 rounded-xl text-xs tracking-wide transition-all flex items-center justify-center gap-2 border border-slate-700"
            >
              <LogOut size={16} /> Fechar Caixa [F9]
            </button>
            <button
              onClick={() => { if (cart.length > 0) setModal("payment"); }}
              disabled={cart.length === 0}
              className="w-full bg-[var(--accent)] text-white font-bold py-4 rounded-xl text-sm tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[var(--accent)]/30 disabled:opacity-50 disabled:shadow-none mt-2"
            >
              FINALIZAR [{hotkeys.payment}]
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MODALS
      ══════════════════════════════════════ */}

      {/* ── Payment Modal ── */}
      {modal === "payment" && (
        <ModalWrapper title="Pagamento da Venda" icon={<CreditCard size={20} />} onClose={() => setModal("")}>
          <form onSubmit={e => { e.preventDefault(); if (!(paymentMethod === "MONEY" && parseFloat(amountGiven) < total && amountGiven !== "")) handleFinalizeSale(); }} className="p-6 space-y-6">
            <div className="bg-[#0c0f1a] border border-indigo-500/20 rounded-2xl p-6 text-center shadow-inner">
              <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">Valor Total</div>
              <div className="text-[var(--accent)] font-black font-mono text-5xl tracking-tight">R$ {fmt(total)}</div>
            </div>

            <div>
              <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-3">Forma de Pagamento</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: "MONEY", label: "Dinheiro", icon: <Banknote size={24} /> },
                  { key: "PIX", label: "PIX", icon: <QrCode size={24} /> },
                  { key: "CREDIT_CARD", label: "Crédito", icon: <CreditCard size={24} /> },
                  { key: "DEBIT_CARD", label: "Débito", icon: <CreditCard size={24} /> },
                  { key: "VOUCHER", label: "Voucher", icon: <Zap size={24} /> },
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPaymentMethod(p.key)}
                    className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border-2 transition-all font-bold ${
                      paymentMethod === p.key
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] shadow-lg shadow-[var(--accent)]/10"
                        : "border-slate-800 bg-[#0c0f1a] text-slate-400 hover:border-indigo-500/30 hover:bg-indigo-500/5"
                    }`}
                  >
                    {p.icon}
                    <span className="text-xs">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === "MONEY" && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Valor Recebido do Cliente</div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xl">R$</span>
                  <input
                    type="number"
                    value={amountGiven}
                    onChange={e => setAmountGiven(e.target.value)}
                    className="w-full bg-[#0c0f1a] border-2 border-indigo-500/30 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] text-white font-mono font-black text-3xl text-right pl-12 pr-4 py-4 rounded-xl outline-none shadow-inner transition-all"
                    placeholder="0,00"
                    autoFocus
                    step="0.01"
                  />
                </div>
                {parseFloat(amountGiven) >= total && total > 0 && (
                  <>
                    <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex justify-between items-center shadow-inner">
                      <span className="text-emerald-400 text-sm font-bold uppercase tracking-wider">Troco</span>
                      <span className="text-emerald-400 font-black text-3xl font-mono">R$ {fmt(troco)}</span>
                    </div>
                    <ChangeVisual amount={troco} />
                  </>
                )}
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t border-slate-800">
              <button onClick={() => setModal("")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all">
                VOLTAR
              </button>
              <button
                type="submit"
                disabled={paymentMethod === "MONEY" && parseFloat(amountGiven) < total && amountGiven !== ""}
                className="flex-[2] bg-[var(--accent)] text-white font-bold py-3.5 rounded-xl text-sm tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[var(--accent)]/30 disabled:opacity-50"
              >
                CONFIRMAR VENDA
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* ── Success Modal ── */}
      {modal === "success" && (
        <ModalWrapper title="Venda Concluída" icon={<Check size={20} />} onClose={() => { setModal(""); clearSale(); }}>
          <div className="p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-emerald-500/10 border-4 border-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-in zoom-in duration-300">
              <Check size={48} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-white text-2xl font-bold tracking-tight">CUPOM EMITIDO</div>
              <div className="text-slate-400 text-sm mt-1">A venda foi registrada com sucesso no sistema.</div>
              <div className="mt-4 inline-block bg-[#0c0f1a] border border-slate-700 text-indigo-300 font-mono text-xs px-4 py-2 rounded-lg font-bold">
                Cód: {lastSaleId.slice(0, 12).toUpperCase()}
              </div>
            </div>
            
            {paymentMethod === "MONEY" && troco > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 shadow-inner">
                <div className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-widest mb-1">Troco a Devolver</div>
                <div className="text-emerald-400 font-black text-4xl font-mono">R$ {fmt(troco)}</div>
                <ChangeVisual amount={troco} />
              </div>
            )}
            
            <button
              onClick={() => { setModal(""); clearSale(); }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl text-sm tracking-widest transition-all mt-4"
            >
              INICIAR NOVA VENDA ↵
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* ── Cash Closing Modal (Blind Closure) ── */}
      {modal === "closing" && sessionStats && (
        <ModalWrapper title="Fechamento de Caixa (Cego)" icon={<LogOut size={20} />} onClose={() => { setModal(""); setClosingStep("input"); }} wide>
          <div className="p-6 space-y-6">
            
            {closingStep === "input" ? (
              /* Phase 1: Blind Input */
              <div className="space-y-5">
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/15 rounded-2xl flex gap-3">
                  <AlertCircle size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Fechamento às Cegas Ativo</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Conte fisicamente os valores na gaveta e insira-os abaixo. Os valores esperados pelo sistema só serão exibidos após você avançar.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contagem Física: Dinheiro (R$)</label>
                    <input
                      type="number"
                      value={countedMoney}
                      onChange={e => setCountedMoney(e.target.value)}
                      placeholder="Total em Espécie"
                      className="w-full bg-[#0c0f1a] border border-slate-700 focus:border-indigo-500 text-white font-mono text-lg text-right px-4 py-3 rounded-xl outline-none transition-all"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contagem Física: Cartão (R$)</label>
                    <input
                      type="number"
                      value={countedCard}
                      onChange={e => setCountedCard(e.target.value)}
                      placeholder="Soma das vias de cartão"
                      className="w-full bg-[#0c0f1a] border border-slate-700 focus:border-indigo-500 text-white font-mono text-lg text-right px-4 py-3 rounded-xl outline-none transition-all"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contagem Física: PIX (R$)</label>
                    <input
                      type="number"
                      value={countedPix}
                      onChange={e => setCountedPix(e.target.value)}
                      placeholder="Relatório de PIX recebidos"
                      className="w-full bg-[#0c0f1a] border border-slate-700 focus:border-indigo-500 text-white font-mono text-lg text-right px-4 py-3 rounded-xl outline-none transition-all"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Observações do Fechamento</label>
                  <textarea
                    value={closingNote}
                    onChange={e => setClosingNote(e.target.value)}
                    placeholder="Adicione qualquer observação ou detalhe sobre discrepâncias..."
                    className="w-full bg-[#0c0f1a] border border-slate-700 focus:border-indigo-500 text-slate-300 px-4 py-3 rounded-xl outline-none text-xs resize-none transition-all"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-800">
                  <button onClick={() => setModal("")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all">
                    CANCELAR
                  </button>
                  <button
                    onClick={() => {
                      if (!countedMoney || !countedCard || !countedPix) {
                        alert("Por favor, preencha todos os campos de contagem.");
                        return;
                      }
                      setClosingStep("result");
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl text-xs tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                  >
                    AVANÇAR PARA CONCILIAÇÃO
                  </button>
                </div>
              </div>
            ) : (
              /* Phase 2: Conciliation Comparison */
              <div className="space-y-6">
                
                {/* General Stats summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0c0f1a] border border-slate-800 rounded-xl p-4">
                    <div className="text-slate-500 text-[9px] uppercase font-bold tracking-widest mb-0.5">Fundo Inicial</div>
                    <div className="text-white font-bold text-base font-mono">R$ {fmt(session.initialBalance)}</div>
                  </div>
                  <div className="bg-[#0c0f1a] border border-slate-800 rounded-xl p-4">
                    <div className="text-slate-500 text-[9px] uppercase font-bold tracking-widest mb-0.5">Total Vendas</div>
                    <div className="text-white font-bold text-base font-mono">R$ {fmt(sessionStats.totalSales)}</div>
                  </div>
                  <div className="bg-[#0c0f1a] border border-slate-800 rounded-xl p-4">
                    <div className="text-slate-500 text-[9px] uppercase font-bold tracking-widest mb-0.5">Sangrias</div>
                    <div className="text-red-400 font-bold text-base font-mono">- R$ {fmt(sessionStats.totalWithdrawals)}</div>
                  </div>
                  <div className="bg-[#0c0f1a] border border-slate-800 rounded-xl p-4">
                    <div className="text-slate-500 text-[9px] uppercase font-bold tracking-widest mb-0.5">Suprimentos</div>
                    <div className="text-emerald-400 font-bold text-base font-mono">+ R$ {fmt(sessionStats.totalSupplements)}</div>
                  </div>
                </div>

                {/* Discrepancies Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0c0f1a]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-800/40 text-slate-500 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="px-5 py-3">Meio de Pagamento</th>
                        <th className="px-5 py-3 text-right">Esperado pelo Sistema</th>
                        <th className="px-5 py-3 text-right">Informado pelo Operador</th>
                        <th className="px-5 py-3 text-right">Diferença (Sobra/Falta)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {(() => {
                        const expectedMoney = expectedCash;
                        const expectedCard = session.sales
                          .filter(s => s.paymentMethod === "CREDIT_CARD" || s.paymentMethod === "DEBIT_CARD")
                          .reduce((a, s) => a + s.total, 0);
                        const expectedPix = session.sales
                          .filter(s => s.paymentMethod === "PIX")
                          .reduce((a, s) => a + s.total, 0);

                        const fields = [
                          { label: "Dinheiro (Espécie)", expected: expectedMoney, counted: parseFloat(countedMoney) || 0 },
                          { label: "Cartão (Crédito/Débito)", expected: expectedCard, counted: parseFloat(countedCard) || 0 },
                          { label: "PIX", expected: expectedPix, counted: parseFloat(countedPix) || 0 }
                        ];

                        return fields.map((f, idx) => {
                          const diff = f.counted - f.expected;
                          return (
                            <tr key={idx} className="hover:bg-slate-900/30">
                              <td className="px-5 py-3.5 font-bold text-white">{f.label}</td>
                              <td className="px-5 py-3.5 text-right font-mono text-slate-400">R$ {fmt(f.expected)}</td>
                              <td className="px-5 py-3.5 text-right font-mono text-slate-400">R$ {fmt(f.counted)}</td>
                              <td className={`px-5 py-3.5 text-right font-mono font-black ${
                                Math.abs(diff) < 0.05 
                                  ? "text-emerald-400" 
                                  : diff > 0 
                                    ? "text-blue-400" 
                                    : "text-red-400"
                              }`}>
                                {diff > 0 ? "+" : ""}R$ {fmt(diff)}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-800">
                  <button onClick={() => setClosingStep("input")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all">
                    CORRIGIR CONTAGEM
                  </button>
                  <button
                    onClick={() => {
                      alert("Caixa fechado às cegas com sucesso! Relatório de conciliação fiscal e financeira consolidado.");
                      setSession(null);
                      setModal("");
                      setClosingStep("input");
                      setCountedMoney("");
                      setCountedCard("");
                      setCountedPix("");
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs tracking-widest transition-all shadow-lg shadow-emerald-600/20"
                  >
                    CONFIRMAR & FECHAR CAIXA
                  </button>
                </div>
              </div>
            )}

          </div>
        </ModalWrapper>
      )}


      {/* ── Withdrawal / Supplement Modal ── */}
      {/* ... (Omitted for brevity in this snippet but fully functional in standard impl) ... */}
      {modal === "withdrawal" && (
        <ModalWrapper
          title={withdrawalType === "withdrawal" ? "Sangria de Caixa" : "Suprimento de Caixa"}
          icon={withdrawalType === "withdrawal" ? <TrendingDown size={20} /> : <Plus size={20} />}
          onClose={() => setModal("")}
        >
          <div className="p-6 space-y-5">
            <div className={`text-center py-3 rounded-xl border text-sm font-bold tracking-widest uppercase ${
              withdrawalType === "withdrawal"
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            }`}>
              {withdrawalType === "withdrawal" ? "Retirada de Dinheiro" : "Adição de Dinheiro"}
            </div>
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-2">Valor (R$)</label>
              <input
                type="number"
                value={withdrawalAmount}
                onChange={e => setWithdrawalAmount(e.target.value)}
                autoFocus
                className="w-full bg-[#0c0f1a] border border-slate-700 focus:border-indigo-500 text-white font-black text-3xl text-right px-4 py-4 rounded-xl outline-none font-mono shadow-inner transition-all"
                placeholder="0,00"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-2">Motivo / Observação</label>
              <input
                type="text"
                value={withdrawalReason}
                onChange={e => setWithdrawalReason(e.target.value)}
                className="w-full bg-[#0c0f1a] border border-slate-700 focus:border-indigo-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-sm shadow-inner transition-all"
                placeholder="Ex: Pagamento de fornecedor, troco..."
              />
            </div>
            <div className="flex gap-4 pt-4 border-t border-slate-800">
              <button onClick={() => setModal("")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all">
                CANCELAR
              </button>
              <button
                onClick={handleWithdrawal}
                disabled={!withdrawalAmount || parseFloat(withdrawalAmount) <= 0}
                className={`flex-1 font-bold py-3.5 rounded-xl text-sm tracking-widest transition-all disabled:opacity-40 text-white ${
                  withdrawalType === "withdrawal"
                    ? "bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/20"
                    : "bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                }`}
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* ── Price Check Modal ── */}
      {modal === "pricecheck" && (
        <ModalWrapper title="Consulta de Preços" icon={<Package size={20} />} onClose={() => { setModal(""); setPriceCheckIdle(false); }}>
          <div className="p-6 space-y-6">
            
            {priceCheckIdle && promotionalAds.length > 0 ? (
              /* Idle screen inside Price Check Modal */
              (() => {
                const currentAd = promotionalAds[activeAdIndex] || promotionalAds[0];
                const adImg = currentAd.imageUrl || (
                  currentAd.title.includes("HEINEKEN") ? "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?q=80&w=600" :
                  currentAd.title.includes("HORTIFRÚTI") ? "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600" :
                  currentAd.title.includes("CPF") ? "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=600" :
                  currentAd.title.includes("LEITE") || currentAd.title.includes("RELÂMPAGO") ? "https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600" :
                  "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600"
                );

                return (
                  <div 
                    className={`w-full bg-gradient-to-r ${currentAd.color} border border-white/10 rounded-2xl p-8 text-center space-y-4 cursor-pointer transition-all duration-500 shadow-xl relative overflow-hidden`}
                    onClick={() => setPriceCheckIdle(false)}
                  >
                    {/* Blurred product image background for modal */}
                    {adImg && (
                      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
                        <img src={adImg} alt="Backdrop" className="w-full h-full object-cover blur-[5px] scale-105 opacity-[0.45]" />
                        <div className="absolute inset-0 bg-black/60" />
                      </div>
                    )}
                    
                    <div className="relative z-10">
                      <div className="inline-block text-[9px] bg-white/20 font-black uppercase tracking-widest px-3 py-1 rounded-full mb-1">
                        {currentAd.badge}
                      </div>
                      {adImg && (
                        <img src={adImg} alt="Anúncio" className="max-h-[110px] object-cover mx-auto rounded-xl shadow border border-white/10 mb-2 bg-white/5" />
                      )}
                      <h4 className="text-xl font-black uppercase text-white leading-tight">{currentAd.title}</h4>
                      <p className="text-xs text-white/90 font-bold max-w-md mx-auto">{currentAd.desc}</p>
                      <div className="text-[9px] text-white/50 font-bold uppercase tracking-widest pt-4 border-t border-white/10 mt-3">
                        Escaneie o código de barras ou digite para pesquisar o preço
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (



              /* Standard search screen */
              <>
                <form onSubmit={handlePriceCheck} className="flex gap-3">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={priceCheckQuery}
                      onChange={e => setPriceCheckQuery(e.target.value)}
                      autoFocus
                      placeholder="Código de barras ou nome do produto..."
                      className="w-full bg-[#0c0f1a] border border-slate-700 focus:border-indigo-500 text-white font-mono px-4 py-3 pl-11 rounded-xl outline-none text-sm shadow-inner transition-all"
                    />
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-xs tracking-widest transition-all shadow-lg shadow-indigo-600/20">
                    BUSCAR
                  </button>
                </form>
                
                {priceCheckLoading && <div className="text-center text-slate-400 py-8 animate-pulse font-medium">Buscando produto...</div>}
                
                {priceCheckResult && (
                  <div className={`border rounded-2xl p-8 text-center shadow-inner ${priceCheckResult.price ? "border-indigo-500/30 bg-[#0c0f1a]" : "border-red-500/30 bg-red-500/5"}`}>
                    <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-3">Resultado da Busca</div>
                    <div className="text-white font-bold text-xl uppercase mb-6 leading-tight">{priceCheckResult.name}</div>
                    
                    {priceCheckResult.price !== null ? (
                      <>
                        <div className="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">Preço Atual</div>
                        <div className="text-[var(--accent)] font-black font-mono text-5xl tracking-tight mb-6">
                          R$ {fmt(Number(priceCheckResult.price))}
                        </div>
                        <button onClick={() => { addToCart(priceCheckResult); setModal(""); }} className="w-full bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 font-bold px-6 py-3.5 rounded-xl text-sm tracking-wide transition-all">
                          + ADICIONAR AO CARRINHO
                        </button>
                      </>
                    ) : (
                      <div className="text-red-400 font-medium py-4">Este produto não possui preço cadastrado ou não foi encontrado.</div>
                    )}
                  </div>
                )}
              </>
            )}

          </div>
        </ModalWrapper>
      )}


      {/* ── Order Modal ── */}
      {modal === "order" && (
        <ModalWrapper title="Importar Pedido de Televenda" icon={<FileText size={20} />} onClose={() => setModal("")} wide>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {loadingOrders ? (
              <div className="text-center text-slate-400 py-8 animate-pulse">Carregando pedidos...</div>
            ) : ordersList.length === 0 ? (
              <div className="text-center text-slate-500 py-8">Nenhum pedido pendente encontrado.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {ordersList.map((o: any) => (
                  <div key={o.id} className="bg-[#0c0f1a] border border-slate-800 p-4 rounded-xl flex justify-between items-center hover:border-indigo-500 transition-colors">
                    <div>
                      <div className="text-white font-bold text-sm">Pedido #{o.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-slate-400 text-xs mt-0.5">Cliente: {o.customer?.name || "Não identificado"}</div>
                      <div className="text-indigo-400 font-mono font-bold text-xs mt-1">Total: R$ {Number(o.total || 0).toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => handleImportOrder(o.id)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                    >
                      IMPORTAR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ModalWrapper>
      )}

      {/* ── CPF Modal ── */}
      {modal === "cpf" && (
        <ModalWrapper title="Identificar Cliente (CPF/CNPJ)" icon={<Users size={20} />} onClose={() => setModal("")}>
          <div className="p-6 space-y-4">
            <input
              type="text"
              value={cpfInput}
              onChange={e => setCpfInput(e.target.value)}
              placeholder="Digite o CPF ou CNPJ do cliente..."
              className="w-full bg-[#0c0f1a] border border-slate-700 focus:border-indigo-500 text-white font-mono text-lg px-4 py-3 rounded-xl outline-none shadow-inner transition-all text-center"
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setModal("");
                }
              }}
            />
            <button
              onClick={() => setModal("")}
              className="w-full bg-[var(--accent)] hover:opacity-90 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg"
            >
              CONFIRMAR
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* ── Hotkeys Modal ── */}
      {modal === "hotkeys" && (
        <ModalWrapper title="Configurações de Teclas" icon={<Settings size={20} />} onClose={() => { setModal(""); setCapturingKey(null); setTempHotkeys(null); }}>
          <div className="p-6">
            <p className="text-slate-400 text-sm mb-6">
              Clique em um botão de atalho abaixo e pressione a nova tecla que deseja configurar.
            </p>
            <div className="grid grid-cols-2 gap-3 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2">
              {tempHotkeys && (Object.keys(hotkeyLabels) as Array<keyof PDVHotkeys>).map((key) => (
                <div key={key as string} className="flex justify-between items-center bg-[#0c0f1a] border border-indigo-500/20 p-3 rounded-xl">
                  <span className="font-semibold text-slate-300 text-sm truncate mr-2">{hotkeyLabels[key]}</span>
                  <button
                    onClick={() => setCapturingKey(capturingKey === key ? null : key)}
                    className={`min-w-20 py-2 px-3 rounded-lg font-mono font-bold text-xs transition-all border shrink-0 ${
                      capturingKey === key
                        ? "bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:border-indigo-500 hover:text-white"
                    }`}
                  >
                    {capturingKey === key ? "Aguardando..." : String(tempHotkeys[key] || defaultHotkeys[key] || "")}
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-4 mt-8 pt-6 border-t border-indigo-500/20">
              <button 
                onClick={() => { setModal(""); setCapturingKey(null); setTempHotkeys(null); }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (tempHotkeys) saveHotkeys(tempHotkeys);
                  setModal("");
                  setCapturingKey(null);
                }}
                className="flex-1 py-3 bg-[var(--accent)] hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-[var(--accent)]/20"
              >
                Salvar Padrão
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Hidden iframe for receipt printing */}
      <iframe
        ref={receiptFrameRef}
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '80mm', height: '0', border: 'none' }}
        title="receipt-printer"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Modal Wrapper
───────────────────────────────────────────── */
function ModalWrapper({ title, icon, onClose, children, wide }: {
  title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`bg-[#111528] border border-indigo-500/20 rounded-3xl shadow-2xl w-full overflow-hidden flex flex-col ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="bg-[#151a30] border-b border-slate-800 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 text-white font-bold text-base tracking-wide">
            <div className="text-indigo-400">{icon}</div> {title}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 p-1.5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Export
───────────────────────────────────────────── */
export default function PDVPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-[#0c0f1a] text-indigo-400">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(99,102,241,0.2)]" />
          <p className="font-bold tracking-widest text-sm uppercase text-slate-400">Iniciando Terminal...</p>
        </div>
      </div>
    }>
      <PDVContainer />
    </Suspense>
  );
}
