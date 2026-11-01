"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, ShoppingCart, Trash2, CreditCard, Banknote, QrCode,
  Keyboard, Plus, Minus, X, FileText, Check, AlertCircle,
  TrendingDown, Package, Clock, User, Users, ChevronRight, Monitor,
  DollarSign, BarChart2, LogOut, RefreshCw, Zap, Download, Settings,
  Maximize2, Minimize2, Wifi, Volume2, Battery, Barcode, Tag, Key
} from "lucide-react";
import {
  getProductByBarcode,
  searchProducts,
  lookupBarcodeOnline,
  getProductsByCategory,
  seedSampleCategoryProducts,
  getFullCatalogForOfflineSync
} from "@/actions/product";
import { getOrderById, getOrders } from "@/actions/order";
import { createSale } from "@/actions/sale";
import { saveCashClosing } from "@/actions/cashClosing";
import { useHotkeys, hotkeyLabels, PDVHotkeys, defaultHotkeys } from "@/hooks/useHotkeys";
import { PdvSplashScreen } from "@/components/PdvSplashScreen";
import { CybertechBrand } from "@/components/CybertechBrand";
import { PdvConfigModal } from "@/components/PdvConfigModal";
import { playScannerBeep } from "@/lib/pdvHardwareConfig";
import { activateTerminalOnline } from "@/actions/terminals";
import { getPdvOperators, verifyPdvPin } from "@/actions/users";
import {
  loadPdvPaymentConfig,
  savePdvPaymentConfig,
  PdvPaymentConfig,
  DEFAULT_PDV_PAYMENT_CONFIG,
  ALL_SUGGESTED_ACQUIRERS,
  ALL_SUGGESTED_BRANDS,
} from "@/lib/pdvPaymentConfig";

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

export function findInOfflineCatalog(query: string) {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("CYBERTECH_OFFLINE_CATALOG") : null;
    if (!raw) return { product: null, products: [] };
    const catalog: any[] = JSON.parse(raw);
    const qClean = query.trim().toLowerCase();

    // 1. Código de barras exato ou código interno
    const exact = catalog.find(p => String(p.barcode || "").trim() === query || String(p.internalCode || "").trim() === query);
    if (exact) return { product: exact, products: [exact] };

    // 2. Busca por nome aproximado
    const matches = catalog.filter(p =>
      String(p.name || "").toLowerCase().includes(qClean) ||
      String(p.barcode || "").includes(query)
    );
    if (matches.length > 0) {
      return { product: matches.length === 1 ? matches[0] : null, products: matches };
    }
  } catch {}
  return { product: null, products: [] };
}

export async function syncOfflineCatalog(companyId?: string) {
  try {
    const res = await getFullCatalogForOfflineSync(companyId);
    if (res.success && res.products) {
      localStorage.setItem("CYBERTECH_OFFLINE_CATALOG", JSON.stringify(res.products));
      localStorage.setItem("CYBERTECH_OFFLINE_CATALOG_SYNC_AT", new Date().toISOString());
      console.log(`[CyberSync] Catálogo offline atualizado: ${res.products.length} itens.`);
      return res.products;
    }
  } catch (err) {
    console.warn("[CyberSync] Não foi possível atualizar catálogo offline (offline):", err);
  }
  return [];
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
  { value: 50, label: 'R$ 50', shortLabel: '50', type: 'note', gradientFrom: '#E8955A', gradientTo: '#F5C9A0', accentColor: '#D47835', textColor: '#8B4513', borderColor: '#D98C52' },
  { value: 20, label: 'R$ 20', shortLabel: '20', type: 'note', gradientFrom: '#E8C54A', gradientTo: '#F5E4A0', accentColor: '#D4A827', textColor: '#8B7000', borderColor: '#D9B63E' },
  { value: 10, label: 'R$ 10', shortLabel: '10', type: 'note', gradientFrom: '#E07070', gradientTo: '#F5B8B8', accentColor: '#C04040', textColor: '#8B2020', borderColor: '#D06060' },
  { value: 5, label: 'R$ 5', shortLabel: '5', type: 'note', gradientFrom: '#B080D0', gradientTo: '#D8C0E8', accentColor: '#9060B0', textColor: '#5A3070', borderColor: '#A070C0' },
  { value: 2, label: 'R$ 2', shortLabel: '2', type: 'note', gradientFrom: '#7090C0', gradientTo: '#B8CCE0', accentColor: '#5070A0', textColor: '#2A4060', borderColor: '#6080B0' },
  { value: 1, label: 'R$ 1', shortLabel: '1', type: 'coin', gradientFrom: '#D4A844', gradientTo: '#F0D080', accentColor: '#B88C2A', textColor: '#705010', borderColor: '#C89838' },
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
function SelectCashierScreen({ onSelect, autoCaixa }: { onSelect: (session: CashierSession, pausedData?: any) => void, autoCaixa: string | null }) {
  const [cashiers] = useState<CashierSession[]>([
    { id: "cx1", number: 1, operator: "Maria Silva", openedAt: new Date(), initialBalance: 200, sales: [], withdrawals: [], supplements: [] },
    { id: "cx2", number: 2, operator: "João Santos", openedAt: new Date(), initialBalance: 200, sales: [], withdrawals: [], supplements: [] },
    { id: "cx3", number: 3, operator: "Ana Costa", openedAt: new Date(), initialBalance: 150, sales: [], withdrawals: [], supplements: [] },
    { id: "cx4", number: 4, operator: "Carlos Lima", openedAt: new Date(), initialBalance: 200, sales: [], withdrawals: [], supplements: [] },
    { id: "cx5", number: 5, operator: "Livre", openedAt: new Date(), initialBalance: 0, sales: [], withdrawals: [], supplements: [] },
    { id: "cx6", number: 6, operator: "Livre", openedAt: new Date(), initialBalance: 0, sales: [], withdrawals: [], supplements: [] },
  ]);

  const OPERATORS = [
    { name: "Maria Silva", pin: "1234", role: "Operador Líder" },
    { name: "João Santos", pin: "2345", role: "Operador de Caixa" },
    { name: "Ana Costa", pin: "3456", role: "Operador de Caixa" },
    { name: "Carlos Lima", pin: "4567", role: "Fiscal de Caixa" },
  ];

  const [operatorsList, setOperatorsList] = useState<any[]>(OPERATORS);
  const [selectedTerminal, setSelectedTerminal] = useState<CashierSession | null>(null);
  const [configuredTerminalNum, setConfiguredTerminalNum] = useState<string | null>(null);
  const [isChangingTerminal, setIsChangingTerminal] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState(OPERATORS[0].name);
  const [operatorPin, setOperatorPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [pausedMap, setPausedMap] = useState<Record<string, any>>({});
  const time = useClock();
  const [host, setHost] = useState("");

  // Estado de Ativação Online do Terminal por Código
  const [terminalConfig, setTerminalConfig] = useState<{
    id?: string;
    code?: string;
    name?: string;
    cashierNumber?: number;
    companyName?: string;
    storeName?: string;
    token?: string;
  } | null>(null);
  const [activationCodeInput, setActivationCodeInput] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState("");
  const [showManualSelection, setShowManualSelection] = useState(false);

  useEffect(() => {
    setHost(window.location.hostname);
    try {
      const saved = localStorage.getItem("EMPORIO_PAUSED_SESSIONS");
      if (saved) setPausedMap(JSON.parse(saved));
    } catch { }

    // Carrega operadores reais cadastrados na nuvem para este cliente
    getPdvOperators().then(res => {
      if (res.operators && res.operators.length > 0) {
        setOperatorsList(res.operators);
        setSelectedOperator(res.operators[0].name);
        try {
          localStorage.setItem("CYBERTECH_PDV_OPERATORS", JSON.stringify(res.operators));
        } catch {}
      } else {
        const cached = localStorage.getItem("CYBERTECH_PDV_OPERATORS");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.length > 0) {
              setOperatorsList(parsed);
              setSelectedOperator(parsed[0].name);
            }
          } catch {}
        }
      }
    }).catch(() => {
      const cached = localStorage.getItem("CYBERTECH_PDV_OPERATORS");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.length > 0) {
            setOperatorsList(parsed);
            setSelectedOperator(parsed[0].name);
          }
        } catch {}
      }
    });

    // 1. Tenta carregar ativação oficial por código
    try {
      const savedConfig = localStorage.getItem("CYBERTECH_TERMINAL_CONFIG");
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setTerminalConfig(parsed);
        syncOfflineCatalog(parsed.companyId);
        const cxNum = String(parsed.cashierNumber || 1);
        setConfiguredTerminalNum(cxNum);
        const cx = cashiers.find(c => c.number.toString() === cxNum) || {
          id: `cx-${cxNum}`,
          number: parsed.cashierNumber || 1,
          operator: OPERATORS[0].name,
          openedAt: new Date(),
          initialBalance: 200,
          sales: [],
          withdrawals: [],
          supplements: []
        };
        setSelectedTerminal(cx);
        return;
      }
    } catch { }

    // 2. Se houver parâmetro na URL ou número fixo antigo
    const initialCaixa = autoCaixa || (typeof window !== "undefined" ? localStorage.getItem("EMPORIO_TERMINAL_CAIXA") : null);
    if (initialCaixa) {
      setConfiguredTerminalNum(initialCaixa);
      try {
        localStorage.setItem("EMPORIO_TERMINAL_CAIXA", initialCaixa);
      } catch { }
      const cx = cashiers.find(c => c.number.toString() === initialCaixa);
      if (cx) setSelectedTerminal(cx);
    }
  }, [autoCaixa, cashiers]);

  const handleActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCodeInput.trim()) return;
    setIsActivating(true);
    setActivationError("");

    const res = await activateTerminalOnline(activationCodeInput.trim());
    setIsActivating(false);

    if (res.success && res.terminal) {
      setTerminalConfig(res.terminal);
      const cxNum = String(res.terminal.cashierNumber || 1);
      setConfiguredTerminalNum(cxNum);
      try {
        localStorage.setItem("CYBERTECH_TERMINAL_CONFIG", JSON.stringify(res.terminal));
        localStorage.setItem("EMPORIO_TERMINAL_CAIXA", cxNum);
      } catch {}

      // Baixa catálogo completo para permitir vendas 100% offline no caixa
      syncOfflineCatalog(res.terminal.companyId);

      const cx = cashiers.find(c => c.number.toString() === cxNum) || {
        id: `cx-${cxNum}`,
        number: res.terminal.cashierNumber || 1,
        operator: OPERATORS[0].name,
        openedAt: new Date(),
        initialBalance: 200,
        sales: [],
        withdrawals: [],
        supplements: []
      };
      setSelectedTerminal(cx);
      setIsChangingTerminal(false);
    } else {
      setActivationError(res.error || "Código de ativação inválido.");
    }
  };

  const handleUnlinkTerminal = () => {
    if (confirm("Deseja realmente desvincular este terminal? O caixa precisará de um novo código de ativação para operar.")) {
      try {
        localStorage.removeItem("CYBERTECH_TERMINAL_CONFIG");
        localStorage.removeItem("EMPORIO_TERMINAL_CAIXA");
      } catch {}
      setTerminalConfig(null);
      setSelectedTerminal(null);
      setConfiguredTerminalNum(null);
      setIsChangingTerminal(false);
      setActivationCodeInput("");
      setActivationError("");
    }
  };

  const handleSelectCashier = (cx: CashierSession) => {
    setSelectedTerminal(cx);
    setConfiguredTerminalNum(cx.number.toString());
    try {
      localStorage.setItem("EMPORIO_TERMINAL_CAIXA", cx.number.toString());
    } catch { }
    setIsChangingTerminal(false);
    setOperatorPin("");
    setLoginError("");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerminal) return;
    if (operatorPin.length < 4) {
      setLoginError("Digite o PIN de 4 dígitos");
      return;
    }

    setLoginError("");
    const verifyRes = await verifyPdvPin({ userName: selectedOperator, pin: operatorPin });
    if (!verifyRes.success) {
      setLoginError(verifyRes.error || "PIN incorreto");
      return;
    }

    const paused = pausedMap[selectedOperator];
    if (paused) {
      const updated = { ...pausedMap };
      delete updated[selectedOperator];
      setPausedMap(updated);
      try {
        localStorage.setItem("EMPORIO_PAUSED_SESSIONS", JSON.stringify(updated));
      } catch { }
    }

    onSelect({
      ...selectedTerminal,
      operator: selectedOperator,
      sales: paused?.session?.sales || selectedTerminal.sales,
      initialBalance: paused?.session?.initialBalance || (selectedTerminal.initialBalance || 200)
    }, paused);
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
    <div className="min-h-screen flex flex-col bg-[#dce7f7] text-gray-800 overflow-hidden relative select-none">

      {/* Top bar */}
      <div className="relative z-10 bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <CybertechBrand size="md" />
          <span className="text-gray-400 text-sm border-l border-gray-200 pl-3 font-medium">Abertura de Turno / Caixa</span>
        </div>
        <div className="text-right">
          <div className="text-gray-800 text-2xl font-black tracking-tight" suppressHydrationWarning>
            {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-gray-400 text-xs font-semibold capitalize" suppressHydrationWarning>
            {time.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* DEDICATED DIRECT LOGIN SCREEN (When terminal is configured) */}
      {selectedTerminal && !isChangingTerminal ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-2xl max-w-lg w-full text-gray-800 space-y-6">

            {/* Header info */}
            <div className="text-center space-y-2 pb-4 border-b border-gray-100">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold uppercase tracking-widest shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                Terminal Caixa {String(selectedTerminal.number).padStart(2, "0")} Vinculado
                {terminalConfig?.companyName ? ` — ${terminalConfig.companyName}` : ""}
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Identificação do Operador</h2>
              <p className="text-xs text-gray-500">Selecione seu usuário e digite o PIN para abrir as vendas.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                  Selecione o Operador de Caixa
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {operatorsList.map(op => {
                    const hasPaused = !!pausedMap[op.name];
                    return (
                      <button
                        key={op.name}
                        type="button"
                        onClick={() => {
                          setSelectedOperator(op.name);
                          setOperatorPin("");
                          setLoginError("");
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${selectedOperator === op.name
                            ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-2 ring-blue-500/20"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                          }`}
                      >
                        {hasPaused && (
                          <span className="absolute -top-1.5 -right-1 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                            Pausado
                          </span>
                        )}
                        <div className="font-extrabold text-sm">{op.name}</div>
                        <div className="text-[11px] text-gray-500 font-medium">{op.role}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {pausedMap[selectedOperator] && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-center gap-3">
                  <span className="text-xl">🔄</span>
                  <div>
                    <strong className="font-bold">Turno pausado detectado!</strong>
                    <p className="text-[11px] text-amber-800">
                      Seu carrinho ({pausedMap[selectedOperator].cart?.length || 0} itens) e sessão anterior serão restaurados.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                  Senha / PIN de Acesso (4 dígitos)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={operatorPin}
                  onChange={e => setOperatorPin(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  className="w-full text-center tracking-[0.8em] text-3xl font-mono font-black py-3 bg-gray-50 border-2 border-gray-300 focus:border-blue-600 focus:bg-white rounded-2xl outline-none shadow-2xs transition-all"
                />
                {loginError && (
                  <p className="text-xs font-bold text-rose-600 mt-1.5 text-center">{loginError}</p>
                )}
                <p className="text-[11px] text-gray-400 text-center mt-1">Dica de teste: use o PIN padrão 1234</p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <Check size={18} /> Entrar no Caixa {String(selectedTerminal.number).padStart(2, "0")}
              </button>
            </form>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500">
              <button
                type="button"
                onClick={handleUnlinkTerminal}
                className="hover:text-red-600 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Desvincular esta máquina do cliente"
              >
                <span>Desvincular Máquina</span>
              </button>
              <button
                type="button"
                onClick={() => setIsChangingTerminal(true)}
                className="hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Settings size={14} />
                <span>Trocar Código / Terminal</span>
              </button>
            </div>
          </div>
        </div>
      ) : !showManualSelection ? (
        /* TELA DE ATIVAÇÃO ONLINE DO TERMINAL POR CÓDIGO */
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-600 flex items-center justify-center mx-auto text-2xl font-black shadow-xs">
              <Key size={30} className="text-blue-600" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Ativação de Terminal PDV
              </span>
              <h2 className="text-2xl font-black text-gray-900 mt-2">Vincular Caixa à Nuvem</h2>
              <p className="text-xs text-gray-500 mt-1">
                Digite o Código de Ativação gerado na sua Central em Nuvem. O número do caixa e a loja serão baixados automaticamente pela internet.
              </p>
            </div>

            <form onSubmit={handleActivationSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={activationCodeInput}
                  onChange={e => {
                    setActivationCodeInput(e.target.value.toUpperCase());
                    setActivationError("");
                  }}
                  placeholder="EX: CYBER-7419"
                  autoFocus
                  className="w-full text-center tracking-widest text-2xl font-mono font-black py-3 bg-gray-50 border-2 border-blue-400 focus:border-blue-600 focus:bg-white rounded-2xl outline-none shadow-inner uppercase"
                />
                {activationError && (
                  <p className="text-xs font-bold text-rose-600 mt-2">{activationError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isActivating || !activationCodeInput.trim()}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                {isActivating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Conectando à Nuvem...</span>
                  </>
                ) : (
                  <>
                    <Wifi size={14} />
                    <span>Ativar e Sincronizar Caixa ➔</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              {selectedTerminal && (
                <button
                  type="button"
                  onClick={() => setIsChangingTerminal(false)}
                  className="font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  ← Voltar
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowManualSelection(true)}
                className="font-bold text-blue-600 hover:underline cursor-pointer ml-auto"
              >
                Modo Demonstração / Seleção Manual
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TERMINAL CONFIGURATION / SELECTION GRID MANUAL */
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-150">
          <div className="w-full max-w-5xl">
            <div className="text-center mb-8">
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Seleção Manual de Terminal
              </span>
              <h1 className="text-gray-900 text-3xl font-black tracking-tight mt-2 mb-1">Qual é o número deste Caixa?</h1>
              <p className="text-gray-500 text-sm">
                Selecione um número de caixa ou volte para ativar via Código de Nuvem.
              </p>
              <button
                type="button"
                onClick={() => setShowManualSelection(false)}
                className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                ← Voltar para Ativação por Código
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {cashiers.map(cx => (
                <button
                  key={cx.id}
                  onClick={() => handleSelectCashier(cx)}
                  className={`relative overflow-hidden border-2 p-6 rounded-2xl transition-all text-left group shadow-sm bg-white cursor-pointer hover:border-blue-500 hover:shadow-lg ${configuredTerminalNum === cx.number.toString()
                      ? "border-blue-600 ring-2 ring-blue-100 shadow-md"
                      : "border-gray-200"
                    }`}
                >
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black bg-blue-600 text-white shadow-md shadow-blue-500/20">
                        {String(cx.number).padStart(2, "0")}
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">TERMINAL</div>
                        <div className="text-gray-900 font-black text-lg">Caixa {String(cx.number).padStart(2, "0")}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                        Fixar nesta máquina ➔
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative z-10 pt-2 border-t border-gray-100">
                    <User size={15} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-600">Padrão: {cx.operator}</span>
                  </div>
                </button>
              ))}
            </div>

            {selectedTerminal && isChangingTerminal && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsChangingTerminal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar e voltar para Caixa {String(selectedTerminal.number).padStart(2, "0")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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

  // Splash Screen desativada para carregamento instantâneo do PDV
  const [showSplash, setShowSplash] = useState(false);

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

  // Category quick filter & Sample products
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [loadingCategoryProducts, setLoadingCategoryProducts] = useState(false);
  const [viewMode, setViewMode] = useState<"cart" | "catalog">("cart");

  // Pause PDV & Multi-operator shift switching
  const [isPaused, setIsPaused] = useState(false);
  const [pausePin, setPausePin] = useState("");
  const [pauseError, setPauseError] = useState("");
  const [pausedSessions, setPausedSessions] = useState<Record<string, any>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("EMPORIO_PAUSED_SESSIONS");
      if (saved) setPausedSessions(JSON.parse(saved));
    } catch { }
  }, []);

  const handlePausePDV = () => {
    setIsPaused(true);
    setPausePin("");
    setPauseError("");
  };

  const handleResumePDV = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pausePin.length >= 4) {
      setIsPaused(false);
      setPausePin("");
      setPauseError("");
    } else {
      setPauseError("Digite o PIN de 4 dígitos para destravar");
    }
  };

  const handleSwitchOperator = () => {
    if (!session) return;
    const updated = {
      ...pausedSessions,
      [session.operator]: {
        session,
        cart,
        discountInput,
        linkedOrderId,
        pausedAt: new Date().toISOString()
      }
    };
    setPausedSessions(updated);
    try {
      localStorage.setItem("EMPORIO_PAUSED_SESSIONS", JSON.stringify(updated));
    } catch { }

    setSession(null);
    setCart([]);
    setIsPaused(false);
    setPausePin("");
  };

  useEffect(() => {
    seedSampleCategoryProducts().catch(() => { });
  }, []);

  // Sincronização automática de vendas offline quando a conexão com a nuvem é restabelecida
  useEffect(() => {
    const handleSyncOfflineSales = async () => {
      try {
        const raw = localStorage.getItem("CYBERTECH_OFFLINE_SALES_QUEUE");
        if (!raw) return;
        const queue: any[] = JSON.parse(raw);
        if (!Array.isArray(queue) || queue.length === 0) return;

        console.log(`[CyberSync] Sincronizando ${queue.length} vendas da contingência offline com a nuvem...`);
        const remaining: any[] = [];
        for (const item of queue) {
          try {
            const res = await createSale({
              items: item.items,
              paymentMethod: item.paymentMethod,
              discount: item.discount,
              customerCpf: item.customerCpf
            });
            if (!res.success) {
              remaining.push(item);
            }
          } catch {
            remaining.push(item);
          }
        }
        localStorage.setItem("CYBERTECH_OFFLINE_SALES_QUEUE", JSON.stringify(remaining));
      } catch {}
    };

    window.addEventListener("online", handleSyncOfflineSales);
    handleSyncOfflineSales();
    const interval = setInterval(handleSyncOfflineSales, 60000);
    return () => {
      window.removeEventListener("online", handleSyncOfflineSales);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadCategory() {
      setLoadingCategoryProducts(true);
      const res = await getProductsByCategory(selectedCategory);
      if (active) {
        setCategoryProducts(res.products || []);
        setLoadingCategoryProducts(false);
      }
    }
    loadCategory();
    return () => { active = false; };
  }, [selectedCategory]);

  // Modals & Config
  const [modal, setModal] = useState<"" | "payment" | "success" | "order" | "closing" | "withdrawal" | "pricecheck" | "cpf" | "hotkeys" | "quantity">("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quantityPromptInput, setQuantityPromptInput] = useState("1");
  const [ordersList, setOrdersList] = useState<OrderListItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Fullscreen helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Bloqueio de fechamento/recarregamento com venda aberta
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cart.length > 0) {
        e.preventDefault();
        e.returnValue = "Há uma venda com itens em andamento no caixa. Deseja realmente sair?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [cart.length]);

  // Hotkeys
  const { hotkeys, saveHotkeys, isLoaded } = useHotkeys();
  const [tempHotkeys, setTempHotkeys] = useState<PDVHotkeys | null>(null);
  const [capturingKey, setCapturingKey] = useState<keyof PDVHotkeys | null>(null);

  // Payment & POS Card Metadata (Configurável por Cliente)
  const [pdvPayConfig, setPdvPayConfig] = useState<PdvPaymentConfig>(DEFAULT_PDV_PAYMENT_CONFIG);
  const [showPosConfig, setShowPosConfig] = useState(false);
  const [newAcquirerInput, setNewAcquirerInput] = useState("");
  const [newBrandInput, setNewBrandInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MONEY");
  const [amountGiven, setAmountGiven] = useState("");
  const [lastSaleId, setLastSaleId] = useState("");
  const troco = paymentMethod === "MONEY" && parseFloat(amountGiven) >= total
    ? parseFloat(amountGiven) - total
    : 0;
  const [posStep, setPosStep] = useState<"ACQUIRER" | "BRAND" | "AUTH">("ACQUIRER");
  const [posAcquirer, setPosAcquirer] = useState("Stone");
  const [posBrand, setPosBrand] = useState("Visa");
  const [posAuthCode, setPosAuthCode] = useState("");
  const [posInstallments, setPosInstallments] = useState("1");

  const getInitialPosStep = (cfg: PdvPaymentConfig = pdvPayConfig): "ACQUIRER" | "BRAND" | "AUTH" => {
    if (cfg.askAcquirer) return "ACQUIRER";
    if (cfg.askBrand) return "BRAND";
    return "AUTH";
  };

  useEffect(() => {
    const syncConfig = () => {
      const cfg = loadPdvPaymentConfig();
      setPdvPayConfig(cfg);
      if (cfg.acquirers.length > 0 && !cfg.acquirers.includes(posAcquirer)) {
        setPosAcquirer(cfg.acquirers[0]);
      }
      if (cfg.brands.length > 0 && !cfg.brands.includes(posBrand)) {
        setPosBrand(cfg.brands[0]);
      }
    };
    syncConfig();
    window.addEventListener("pdv-payment-config-updated", syncConfig);
    return () => window.removeEventListener("pdv-payment-config-updated", syncConfig);
  }, []);

  const updateClientPayConfig = (next: PdvPaymentConfig) => {
    setPdvPayConfig(next);
    savePdvPaymentConfig(next);
  };

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
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const payLabels: Record<string, string> = { MONEY: 'Dinheiro', PIX: 'PIX', CREDIT_CARD: 'Cartão Crédito', DEBIT_CARD: 'Cartão Débito', VOUCHER: 'Voucher' };
    const itemRows = cartItems.map(i => {
      const n = i.name.length > 24 ? i.name.substring(0, 24) : i.name;
      return `<tr><td>${n}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${fmtBRL(i.price)}</td><td style="text-align:right">${fmtBRL(i.quantity * i.price)}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cupom</title>
<style>@page{size:80mm auto;margin:0}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:4mm;color:#000;background:#fff}.center{text-align:center}.bold{font-weight:bold}.sep{border-top:1px dashed #000;margin:6px 0}.store{font-size:16px;font-weight:900;letter-spacing:2px}table{width:100%;border-collapse:collapse}th,td{padding:2px 0;font-size:11px}th{border-bottom:1px solid #000}.total-row td{font-size:14px;font-weight:900;padding-top:4px}.footer{font-size:9px;margin-top:10px}</style>
</head><body>
<div class="center"><div class="store">CYBERTECH RP</div><div>CNPJ: 00.000.000/0001-00</div><div>Rua Principal, 100 - Centro</div></div>
<div class="sep"></div>
<div class="center bold">CUPOM NÃO FISCAL</div>
<div>Data: ${dateStr} ${timeStr}</div>
<div>Caixa: ${String(session?.number || 1).padStart(2, '0')} | Op: ${session?.operator || 'Operador'}</div>
<div>Venda: ${saleId.slice(0, 12).toUpperCase()}</div>
<div class="sep"></div>
<table><thead><tr><th style="text-align:left">DESCRIÇÃO</th><th>QTD</th><th style="text-align:right">UNIT</th><th style="text-align:right">TOTAL</th></tr></thead><tbody>${itemRows}</tbody></table>
<div class="sep"></div>
<table><tr><td>Subtotal</td><td style="text-align:right">${fmtBRL(saleSub)}</td></tr>
${saleDiscount > 0 ? `<tr><td>Desconto</td><td style="text-align:right">-${fmtBRL(saleDiscount)}</td></tr>` : ''}
<tr class="total-row"><td>TOTAL</td><td style="text-align:right">R$ ${fmtBRL(saleTotal)}</td></tr></table>
<div class="sep"></div>
<div>Forma Pgto: ${payLabels[salePay] || salePay}</div>
${(salePay === 'CREDIT_CARD' || salePay === 'DEBIT_CARD' || salePay === 'VOUCHER') ? `<div>Adm POS: ${posAcquirer} | Bandeira: ${posBrand}</div><div>Aut/NSU: ${posAuthCode || 'N/I'}${salePay === 'CREDIT_CARD' ? ` | Parc: ${posInstallments}x` : ''}</div>` : ''}
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
<div class="center footer"><div>Obrigado pela preferência!</div><div>Volte sempre!</div><div style="margin-top:6px">Cybertech RP PDV v2.0</div></div>
<div style="height:10mm"></div>
</body></html>`;

    const iframe = receiptFrameRef.current;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error("Erro na impressão do cupom:", e);
          }
        }, 200);
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
      if (modal !== "") return;
      if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        inputRef.current?.focus();
      }
    }, 800);
    return () => clearInterval(interval);
  }, [modal, session]);

  // Gerenciador Centralizado de Teclado e Atalhos do PDV
  useEffect(() => {
    if (!session || !isLoaded) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isInputActive =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      // Se modal de configuração estiver aberto, permite que ele capture teclas sem interferência
      if (isConfigOpen) return;

      // ── 1. PROTEÇÕES DE SISTEMA / NAVEGADOR NO PDV ──
      // F1: Bloquear Ajuda do Navegador
      if (e.key === "F1") {
        e.preventDefault();
        return;
      }

      // F5: Prevenir recarregamento acidental com venda em andamento
      if (e.key === "F5") {
        if (cart.length > 0) {
          e.preventDefault();
          if (confirm("Há uma venda em andamento no caixa. Deseja realmente atualizar a página e cancelar a venda?")) {
            window.location.reload();
          }
          return;
        }
      }

      // F11: Tela Cheia / Kiosk
      if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // F12: Bloquear DevTools no ambiente de PDV
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      // Se modal estiver aberto (exceto para atalhos de saída)
      if (modal !== "") {
        if (e.key === "Escape") {
          e.preventDefault();
          setModal("");
          setTimeout(() => inputRef.current?.focus(), 50);
          return;
        }
        if (e.key === "Enter" && modal === "cpf") {
          e.preventDefault();
          setModal("");
          setTimeout(() => inputRef.current?.focus(), 50);
          return;
        }
        return;
      }

      const keyUpper = e.key.toUpperCase();
      const match = (hk?: string) => String(hk || "").toUpperCase() === keyUpper;

      // ── 2. ATALHOS PRINCIPAIS DO PDV ──
      // F2: Buscar produto (foca input principal de busca)
      if (match(hotkeys.search) || e.key === "F2") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      // F3: Quantidade (Abre modal ou foca multiplicador)
      if (match(hotkeys.quantity) || e.key === "F3") {
        e.preventDefault();
        setQuantityPromptInput(String(multiplier > 1 ? multiplier : 1));
        setModal("quantity");
        return;
      }

      // F4: Consultar preço (Price check)
      if (match(hotkeys.priceCheck) || e.key === "F4") {
        e.preventDefault();
        setPriceCheckQuery("");
        setPriceCheckResult(null);
        setModal("pricecheck");
        return;
      }

      // F6: Desconto
      if (match(hotkeys.discount) || e.key === "F6") {
        e.preventDefault();
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
        return;
      }

      // F7: Imprimir cupom
      if (match(hotkeys.printReceipt) || e.key === "F7") {
        e.preventDefault();
        printReceipt(
          lastSaleId || "preview",
          cart,
          total,
          subtotal,
          parseFloat(discountInput) || 0,
          paymentMethod,
          parseFloat(amountGiven) || 0,
          troco
        );
        return;
      }

      // F8: Cliente (CPF/CNPJ)
      if (match(hotkeys.customer) || match(hotkeys.cpf) || e.key === "F8") {
        e.preventDefault();
        setModal("cpf");
        return;
      }

      // F9: Consultar produto / Catálogo
      if (match(hotkeys.consultProduct) || e.key === "F9") {
        e.preventDefault();
        setViewMode(prev => (prev === "catalog" ? "cart" : "catalog"));
        return;
      }

      // F10: Pagamento / Finalizar Venda
      if (match(hotkeys.payment) || e.key === "F10") {
        e.preventDefault();
        if (cart.length > 0) {
          setModal("payment");
        }
        return;
      }

      // ESC: Cancelar cupom atual
      if (e.key === "Escape" || match(hotkeys.cancel)) {
        e.preventDefault();
        if (cart.length > 0) {
          if (confirm("Deseja realmente cancelar a venda atual e limpar todos os itens?")) {
            setCart([]);
            setDiscountInput("0");
            setMultiplier(1);
            setLinkedOrderId(null);
            setBarcodeInput("");
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }
        return;
      }

      // Multiplicação rápida por '*' no campo de busca de produto
      if (e.key === "*" && isInputActive && document.activeElement === inputRef.current) {
        const val = parseInt(barcodeInput);
        if (!isNaN(val) && val > 0) {
          e.preventDefault();
          setMultiplier(val);
          setBarcodeInput("");
        }
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    session,
    isLoaded,
    hotkeys,
    modal,
    cart,
    barcodeInput,
    multiplier,
    total,
    subtotal,
    discountInput,
    paymentMethod,
    amountGiven,
    troco,
    lastSaleId,
    isConfigOpen,
  ]);

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

    // 1. Banco de dados por código de barras exato (online ou offline)
    const lookupCode = isScaleBarcode ? scaleCode : query;
    let product: any = null;
    try {
      const res = await getProductByBarcode(lookupCode);
      product = res.product;
    } catch {
      product = findInOfflineCatalog(lookupCode).product;
    }

    if (!product) {
      // Fallback para o catálogo offline armazenado localmente
      const off = findInOfflineCatalog(lookupCode);
      if (off.product) {
        product = off.product;
      }
    }

    if (!product && isScaleBarcode) {
      // Find product by matching code directly (short codes)
      try {
        const { products } = await searchProducts(scaleCode);
        if (products && products.length > 0) {
          product = products[0];
        }
      } catch {
        const offScale = findInOfflineCatalog(scaleCode);
        if (offScale.products && offScale.products.length > 0) {
          product = offScale.products[0];
        }
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

    // 2. Banco de dados por nome (com suporte a busca offline)
    let productsList: any[] = [];
    try {
      const res = await searchProducts(query);
      productsList = res.products || [];
    } catch {
      productsList = findInOfflineCatalog(query).products;
    }

    if (productsList.length === 0) {
      productsList = findInOfflineCatalog(query).products;
    }

    if (productsList.length > 0) {
      if (productsList.length === 1) { addToCart(productsList[0], inlineQty); setBarcodeInput(""); }
      else { setSearchResults(productsList); setShowSearchResults(true); }
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
    playScannerBeep();
    const quantityToAdd = qty || multiplier;
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantityToAdd } : i);
      return [...prev, { id: product.id, name: product.name, price: Number(product.price), quantity: quantityToAdd, barcode: product.barcode || "" }];
    });
    setMultiplier(1);
    setSearchResults([]); setShowSearchResults(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  const clearSale = useCallback(() => {
    setCart([]); setDiscountInput("0"); setLinkedOrderId(null);
    setBarcodeInput(""); setErrorMessage(""); setAmountGiven("");
    if (typeof window !== "undefined" && window.location.search) {
      router.replace("/pdv");
    }
    setTimeout(() => inputRef.current?.focus(), 150);
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
    const isPosCard = paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD" || paymentMethod === "VOUCHER";
    if (isPosCard && pdvPayConfig.posModeEnabled) {
      if (posStep === "ACQUIRER") {
        setPosStep(pdvPayConfig.askBrand ? "BRAND" : "AUTH");
        return;
      }
      if (posStep === "BRAND") {
        setPosStep("AUTH");
        return;
      }
      if (pdvPayConfig.requireAuthCode && !posAuthCode.trim()) {
        alert("Por favor, digite o Código de Autenticação (NSU / DOC) impresso no comprovante da maquineta POS.");
        return;
      }
    }
    const disc = parseFloat(discountInput) || 0;
    const saleGiven = parseFloat(amountGiven) || 0;
    const saleChange = paymentMethod === "MONEY" && saleGiven >= total ? saleGiven - total : 0;

    let res: any;
    const isActuallyOffline = isOfflineMode || (typeof navigator !== "undefined" && !navigator.onLine);
    if (isActuallyOffline) {
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
      try {
        const queue = JSON.parse(localStorage.getItem("CYBERTECH_OFFLINE_SALES_QUEUE") || "[]");
        queue.push({
          saleId: mockSaleId,
          items: cart.map(i => ({ productId: i.id, quantity: i.quantity, unitPrice: i.price })),
          paymentMethod,
          discount: disc,
          customerCpf: cpfInput || undefined,
          at: new Date().toISOString()
        });
        localStorage.setItem("CYBERTECH_OFFLINE_SALES_QUEUE", JSON.stringify(queue));
      } catch {}
    } else {
      try {
        res = await createSale({
          items: cart.map(i => ({ productId: i.id, quantity: i.quantity, unitPrice: i.price })),
          paymentMethod,
          discount: disc,
          orderId: linkedOrderId || undefined,
          customerCpf: cpfInput || undefined
        });
      } catch {
        // Fallback instantâneo para contingência offline caso caia a rede na finalização
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
        try {
          const queue = JSON.parse(localStorage.getItem("CYBERTECH_OFFLINE_SALES_QUEUE") || "[]");
          queue.push({
            saleId: mockSaleId,
            items: cart.map(i => ({ productId: i.id, quantity: i.quantity, unitPrice: i.price })),
            paymentMethod,
            discount: disc,
            customerCpf: cpfInput || undefined,
            at: new Date().toISOString()
          });
          localStorage.setItem("CYBERTECH_OFFLINE_SALES_QUEUE", JSON.stringify(queue));
        } catch {}
      }
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

      // Se for venda POS Cartão/Voucher, registra internamente
      if (isPosCard && pdvPayConfig.posModeEnabled) {
        try {
          const rate = paymentMethod === "DEBIT_CARD" ? 0.85 : 1.98;
          const feeValue = Number(((finalTotal * rate) / 100).toFixed(2));
          const netValue = Number((finalTotal - feeValue).toFixed(2));

          const existing = JSON.parse(localStorage.getItem("EMPORIO_POS_CARD_SALES") || "[]");
          existing.unshift({
            id: `pos-${Date.now()}`,
            saleId: res.saleId,
            date: new Date().toLocaleDateString("pt-BR"),
            acquirer: posAcquirer,
            bank: posAcquirer,
            brand: posBrand,
            modality: paymentMethod === "DEBIT_CARD" ? "DEBITO" : "CREDITO",
            authCode: posAuthCode.trim() || "S/N",
            installments: paymentMethod === "CREDIT_CARD" ? parseInt(posInstallments) || 1 : 1,
            grossAmount: finalTotal,
            rate,
            feeAmount: feeValue,
            netAmount: netValue,
          });
          localStorage.setItem("EMPORIO_POS_CARD_SALES", JSON.stringify(existing.slice(0, 50)));
        } catch { }
      }

      setLastSaleId(res.saleId);
      setModal("success");
      setCart([]);
      setDiscountInput("0");
      setLinkedOrderId(null);
      setBarcodeInput("");
      setErrorMessage("");
      setAmountGiven("");
      setPosAuthCode("");
      setPosInstallments("1");
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
    const query = priceCheckQuery.trim();
    if (!query) return;
    setPriceCheckLoading(true); setPriceCheckResult(null);
    let product: any = null;
    try {
      const res = await getProductByBarcode(query);
      product = res?.product;
    } catch {
      product = findInOfflineCatalog(query).product;
    }
    if (!product) {
      product = findInOfflineCatalog(query).product;
    }

    if (product) {
      setPriceCheckResult(product);
    } else {
      let prods: any[] = [];
      try {
        const res = await searchProducts(query);
        prods = res?.products || [];
      } catch {
        prods = findInOfflineCatalog(query).products;
      }
      if (prods.length === 0) {
        prods = findInOfflineCatalog(query).products;
      }
      if (prods && prods.length > 0) setPriceCheckResult(prods[0]);
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

  // ── Render: Splash Screen de Inicialização ─────
  if (showSplash) {
    return <PdvSplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // ── Render: Select screen ─────────────────────
  if (!session) {
    return (
      <SelectCashierScreen
        onSelect={(sess, pausedData) => {
          setSession(sess);
          if (pausedData?.cart) {
            setCart(pausedData.cart);
            if (pausedData.discountInput) setDiscountInput(pausedData.discountInput);
            if (pausedData.linkedOrderId) setLinkedOrderId(pausedData.linkedOrderId);
          }
          setViewMode("cart");
        }}
        autoCaixa={autoCaixa}
      />
    );
  }

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

    <div className="h-screen w-full flex flex-col bg-[#dce7f7] overflow-hidden select-none">

      {/* ── MAIN (Sem a coluna lateral / Sidebar removida) ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── HEADER ── */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex justify-between items-center shrink-0 shadow-sm z-10 relative overflow-hidden">
          {/* Blue diagonal accent */}
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-600 to-blue-400 skew-x-[-12deg] translate-x-8 pointer-events-none opacity-90" />

          <div className="flex items-center gap-4 relative z-10">
            <CybertechBrand size="md" />

            {/* Online status */}
            <button
              type="button"
              onClick={() => {
                if (isOfflineMode) {
                  alert(`Conexão reestabelecida! Transmitindo ${contingencySales.length} NFC-e emitidas em contingência offline para a SEFAZ...`);
                  setContingencySales([]);
                }
                setIsOfflineMode(prev => !prev);
              }}
              className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${isOfflineMode
                ? "bg-red-50 border-red-300 text-red-600"
                : "bg-green-50 border-green-300 text-green-600"
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOfflineMode ? "bg-red-500 animate-pulse" : "bg-green-500"}`}></span>
              {isOfflineMode ? `Contingência (${contingencySales.length})` : "Online (SEFAZ)"}
            </button>

            {linkedOrderId && (
              <div className="flex items-center gap-2 text-amber-600 text-xs font-bold border border-amber-300 bg-amber-50 px-3 py-1.5 rounded-full">
                <FileText size={12} />
                PEDIDO #{linkedOrderId.slice(0, 8).toUpperCase()}
                <button onClick={() => setLinkedOrderId(null)} className="hover:text-amber-800 ml-1"><X size={10} /></button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 relative z-10">
            {/* Pause Button */}
            <button
              type="button"
              onClick={handlePausePDV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Pausar PDV / Bloquear tela do caixa"
            >
              <span>⏸️</span>
              <span>Pausar Caixa</span>
            </button>

            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-800">
              <User size={14} className="text-blue-600" />
              <span>{session.operator}</span>
            </div>

            <div className="flex items-center gap-2 bg-white/80 border border-gray-200 rounded-xl px-3 py-1.5">
              <Monitor size={14} className="text-gray-400" />
              <div className="text-gray-800 font-bold text-sm tabular-nums" suppressHydrationWarning>
                {time.toLocaleTimeString("pt-BR")}
              </div>
            </div>

            {/* Modo Kiosk / Tela Cheia */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${isFullscreen
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white hover:bg-gray-100 text-gray-700 border-gray-200"
                }`}
              title={isFullscreen ? "Sair da Tela Cheia (F11)" : "Ativar Modo Kiosk / Tela Cheia (F11)"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span className="hidden md:inline">{isFullscreen ? "Kiosk Ativo" : "Tela Cheia"}</span>
            </button>

            {/* Central de Configurações Simplificada (5 Módulos) */}
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 hover:text-gray-900 border border-gray-200 transition-colors cursor-pointer"
              title="Central de Configurações do PDV (5 Módulos)"
            >
              <Settings size={17} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── CENTER: Search + Table + Totals ── */}
          <div className="flex-1 flex flex-col bg-[#dce7f7] overflow-hidden">

            {/* Search bar — Único campo principal */}
            <div className="px-5 pt-4 pb-3 flex gap-2 items-center shrink-0">
              <form onSubmit={handleProductSubmit} className="flex-1 relative">
                {multiplier > 1 && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm animate-in zoom-in duration-150">
                    {multiplier} x
                  </div>
                )}
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  placeholder="Digite o código, nome ou código de barras..."
                  className="w-full bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 text-sm pl-10 pr-12 py-3 rounded-2xl outline-none transition-all shadow-xs font-medium"
                  autoFocus
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 flex items-center pointer-events-none" title="Leitor de Código de Barras Pronto">
                  <Barcode size={22} className="opacity-70" />
                </div>
              </form>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="mx-5 mb-2 text-red-600 text-xs font-semibold bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={13} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Catálogo de Produtos / Categorias (Somente visível quando ativado via F9) */}
            {viewMode === "catalog" && (
              <div className="px-5 pb-3 flex gap-2 shrink-0 items-center overflow-x-auto animate-in fade-in">
                {["Todos", "Bebidas", "Alimentos", "Higiene", "Limpeza", "Utilidades"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${selectedCategory === cat
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setViewMode("cart")}
                  className="ml-auto text-xs font-bold text-gray-600 hover:text-blue-600 bg-white border border-gray-200 px-3 py-1.5 rounded-full cursor-pointer shadow-2xs"
                >
                  ✕ Voltar à Venda (ESC)
                </button>
              </div>
            )}

            {/* Product Table or Catalog Grid */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {viewMode === "cart" ? (
                cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 py-16 animate-in fade-in">
                    <div className="w-28 h-28 rounded-full bg-blue-50/80 border-4 border-blue-100 flex items-center justify-center mb-5 shadow-inner">
                      <ShoppingCart size={48} className="text-blue-500" />
                    </div>
                    <div className="text-2xl font-black text-gray-800 tracking-tight mb-2">
                      Nenhum item na venda
                    </div>
                    <div className="text-sm text-gray-500 font-medium max-w-sm text-center">
                      Digite um produto ou passe o código de barras
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        <tr className="text-gray-600 text-[11px] font-bold tracking-widest uppercase">
                          <th className="px-4 py-3 w-12 text-center">#</th>
                          <th className="px-4 py-3">Produto</th>
                          <th className="px-4 py-3 text-center">Código</th>
                          <th className="px-4 py-3 text-center w-28">Qtd</th>
                          <th className="px-4 py-3 text-right w-32">Valor Un.</th>
                          <th className="px-4 py-3 text-right w-36">Valor Total</th>
                          <th className="w-12" />
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item, i) => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors group">
                            <td className="px-4 py-3 text-gray-400 font-medium text-xs text-center">{String(i + 1).padStart(3, "0")}</td>
                            <td className="px-4 py-3">
                              <div className="text-gray-800 font-semibold text-sm leading-tight">{item.name}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-gray-400 text-xs font-mono">{item.barcode}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 p-0.5 w-fit mx-auto">
                                <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-md hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                                  <Minus size={11} />
                                </button>
                                <span className="w-8 text-center text-gray-800 font-bold text-sm">{item.quantity}</span>
                                <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-md hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                                  <Plus size={11} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500 font-mono text-sm">R$ {fmt(item.price)}</td>
                            <td className="px-4 py-3 text-right text-gray-900 font-bold text-sm font-mono">R$ {fmt(item.price * item.quantity)}</td>
                            <td className="px-3 py-3 text-center">
                              <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                        Produtos: {selectedCategory}
                      </span>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {categoryProducts.length} itens com preço
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Toque ou clique no produto para adicionar ao carrinho</span>
                  </div>

                  {loadingCategoryProducts ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <span className="text-xs font-semibold text-gray-600">Carregando catálogo...</span>
                    </div>
                  ) : categoryProducts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
                      <Package size={36} className="text-blue-200 mb-2" />
                      <div className="text-sm font-bold text-gray-700">Nenhum produto cadastrado nesta categoria</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-4">
                      {categoryProducts.map((p) => {
                        const inCart = cart.find(c => c.id === p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              addToCart(p);
                              setViewMode("cart");
                            }}
                            className="bg-white border border-gray-200 hover:border-blue-500 hover:shadow-md rounded-xl p-3 text-left flex flex-col justify-between transition-all group cursor-pointer relative"
                          >
                            {inCart && (
                              <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                                {inCart.quantity}x
                              </span>
                            )}
                            <div>
                              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1 truncate">
                                {p.category?.name || selectedCategory}
                              </div>
                              <div className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                                {p.name}
                              </div>
                              {p.barcode && (
                                <div className="text-[10px] text-gray-400 mt-1 font-mono truncate">
                                  {p.barcode}
                                </div>
                              )}
                            </div>
                            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-sm font-black text-emerald-600 font-mono">
                                R$ {fmt(Number(p.price))}
                              </span>
                              <span className="w-6 h-6 rounded-lg bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                                <Plus size={13} />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Payment & Resumo ── */}
          <div className="w-[280px] bg-white flex flex-col border-l border-gray-200 shrink-0 z-20 shadow-xl">

            {/* Total Block — Estilo Card Azul Profundo */}
            <div className="p-4">
              <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 rounded-2xl p-5 text-white text-center shadow-md">
                <span className="text-blue-200 text-[10px] font-black tracking-widest uppercase block mb-1">
                  TOTAL DA VENDA
                </span>
                <div className="font-black text-4xl font-mono tracking-tight leading-none">
                  R$ {fmt(total)}
                </div>
              </div>
            </div>

            {/* Form & Resumo — Sem duplicidades */}
            <div className="flex-1 px-4 space-y-3.5 overflow-y-auto">
              {/* Desconto (R$) — F6 */}
              <div className="space-y-1.5 bg-gray-50/70 border border-gray-200/80 p-3 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <Tag size={14} className="text-blue-600" /> Desconto (R$)
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">F6</span>
                </div>
                <div className="relative">
                  <input
                    ref={discountInputRef}
                    type="number"
                    value={discountInput}
                    onChange={e => setDiscountInput(e.target.value)}
                    className="w-full bg-white border border-gray-200 focus:border-blue-500 text-gray-800 font-mono px-3 py-2 rounded-xl outline-none text-sm transition-all"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Cliente (CPF/CNPJ) — F8 */}
              <div className="space-y-1.5 bg-gray-50/70 border border-gray-200/80 p-3 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <User size={14} className="text-blue-600" /> Cliente (CPF/CNPJ)
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">F8</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModal("cpf")}
                  className="w-full bg-white border border-gray-200 hover:border-blue-400 text-gray-600 px-3 py-2 rounded-xl outline-none text-xs transition-all flex justify-between items-center cursor-pointer shadow-2xs"
                >
                  {cpfInput ? (
                    <span className="font-mono font-bold text-blue-600 truncate">{cpfInput}</span>
                  ) : (
                    <span className="text-gray-400 text-xs">Não identificado</span>
                  )}
                  <ChevronRight size={14} className="text-gray-400 shrink-0" />
                </button>
              </div>
            </div>

            {/* Action Buttons — Operações Separadas e Enxutas */}
            <div className="p-4 space-y-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { if (cart.length > 0) setModal("payment"); }}
                disabled={cart.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-extrabold py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-blue-500/20 flex flex-col items-center justify-center cursor-pointer active:scale-[0.99]"
              >
                <span>Finalizar Venda</span>
                <span className="text-[10px] font-mono text-blue-200 font-medium">F10</span>
              </button>

              <button
                type="button"
                onClick={() => printReceipt(lastSaleId || "preview", cart, total, subtotal, parseFloat(discountInput) || 0, paymentMethod, parseFloat(amountGiven) || 0, troco)}
                className="w-full bg-white hover:bg-blue-50/60 text-blue-700 font-bold py-2.5 rounded-2xl text-xs transition-all border border-blue-200 flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-[0.99]"
              >
                <FileText size={15} className="text-blue-600" />
                <span>Imprimir Cupom</span>
                <span className="text-[10px] font-mono text-gray-400 font-normal">F7</span>
              </button>

              <div className="pt-2 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={openOrderModal}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold py-1.5 rounded-xl text-[11px] transition-colors border border-gray-200 flex items-center justify-center gap-1 cursor-pointer"
                  title="Importar Pedido"
                >
                  <Download size={12} /> Pedido
                </button>
                <button
                  type="button"
                  onClick={() => setModal("closing")}
                  className="flex-1 bg-gray-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 text-gray-600 font-semibold py-1.5 rounded-xl text-[11px] transition-colors border border-gray-200 flex items-center justify-center gap-1 cursor-pointer"
                  title="Fechar Turno de Caixa"
                >
                  <LogOut size={12} /> Fechar Caixa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RODAPÉ COM ATALHOS ESSENCIAIS (CYBERTECH RP) ── */}
      <div className="bg-[#00245a] text-white px-5 py-2 flex items-center justify-between text-xs font-bold border-t border-blue-900 shrink-0 z-30 select-none">
        <div className="flex items-center gap-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="flex items-center gap-1.5 hover:text-blue-200 transition-colors cursor-pointer shrink-0"
          >
            <span className="w-5 h-5 rounded bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-[10px] font-black">
              F2
            </span>
            <span>Buscar</span>
          </button>
          <span className="text-blue-400/40">|</span>

          <button
            type="button"
            onClick={() => setModal("quantity")}
            className="flex items-center gap-1.5 hover:text-blue-200 transition-colors cursor-pointer shrink-0"
          >
            <span className="w-5 h-5 rounded bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-[10px] font-black">
              F3
            </span>
            <span>Quantidade</span>
          </button>
          <span className="text-blue-400/40">|</span>

          <button
            type="button"
            onClick={() => {
              setPriceCheckQuery("");
              setPriceCheckResult(null);
              setModal("pricecheck");
            }}
            className="flex items-center gap-1.5 hover:text-blue-200 transition-colors cursor-pointer shrink-0"
          >
            <span className="w-5 h-5 rounded bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-[10px] font-black">
              F4
            </span>
            <span>Consultar</span>
          </button>
          <span className="text-blue-400/40">|</span>

          <button
            type="button"
            onClick={() => {
              discountInputRef.current?.focus();
              discountInputRef.current?.select();
            }}
            className="flex items-center gap-1.5 hover:text-blue-200 transition-colors cursor-pointer shrink-0"
          >
            <span className="w-5 h-5 rounded bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-[10px] font-black">
              F6
            </span>
            <span>Desconto</span>
          </button>
          <span className="text-blue-400/40">|</span>

          <button
            type="button"
            onClick={() =>
              printReceipt(
                lastSaleId || "preview",
                cart,
                total,
                subtotal,
                parseFloat(discountInput) || 0,
                paymentMethod,
                parseFloat(amountGiven) || 0,
                troco
              )
            }
            className="flex items-center gap-1.5 hover:text-blue-200 transition-colors cursor-pointer shrink-0"
          >
            <span className="w-5 h-5 rounded bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-[10px] font-black">
              F7
            </span>
            <span>Imprimir Cupom</span>
          </button>
          <span className="text-blue-400/40">|</span>

          <button
            type="button"
            onClick={() => setModal("cpf")}
            className="flex items-center gap-1.5 hover:text-blue-200 transition-colors cursor-pointer shrink-0"
          >
            <span className="w-5 h-5 rounded bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-[10px] font-black">
              F8
            </span>
            <span>Cliente</span>
          </button>
          <span className="text-blue-400/40">|</span>

          <button
            type="button"
            onClick={() => setViewMode((v) => (v === "catalog" ? "cart" : "catalog"))}
            className="flex items-center gap-1.5 hover:text-blue-200 transition-colors cursor-pointer shrink-0"
          >
            <span className="w-5 h-5 rounded bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-[10px] font-black">
              F9
            </span>
            <span>{viewMode === "catalog" ? "Carrinho" : "Catálogo"}</span>
          </button>
          <span className="text-blue-400/40">|</span>

          <button
            type="button"
            onClick={() => {
              if (cart.length > 0) setModal("payment");
            }}
            className="flex items-center gap-1.5 hover:text-blue-200 transition-colors cursor-pointer shrink-0"
          >
            <span className="w-5 h-5 rounded bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-[10px] font-black">
              F10
            </span>
            <span>Pagamento</span>
          </button>
          <span className="text-blue-400/40">|</span>

          <button
            type="button"
            onClick={() => {
              if (cart.length > 0 && confirm("Cancelar cupom atual e limpar itens?")) {
                setCart([]);
                setDiscountInput("0");
                setMultiplier(1);
                setBarcodeInput("");
                setTimeout(() => inputRef.current?.focus(), 50);
              }
            }}
            className="flex items-center gap-1.5 hover:text-rose-300 text-rose-200 transition-colors cursor-pointer shrink-0"
          >
            <span className="w-5 h-5 rounded bg-rose-500/30 border border-rose-400/50 flex items-center justify-center text-[10px] font-black">
              ESC
            </span>
            <span>Cancelar</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-blue-200 text-xs shrink-0 pl-3">
          <div
            className="flex items-center gap-1.5 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800/60"
            title="Conexão com a Nuvem e Catálogo Local"
          >
            <Wifi size={13} className={isOfflineMode ? "text-amber-400" : "text-emerald-400"} />
            <span className="text-[11px] font-medium">
              {isOfflineMode ? "Offline (Local)" : "Nuvem Conectada"}
            </span>
          </div>
          <div className="flex items-center gap-1.5" title="Bip do Leitor Ativo">
            <Volume2 size={14} className="text-blue-300" />
          </div>
          <div className="flex items-center gap-1.5" title="Alimentação / Bateria">
            <Battery size={14} className="text-emerald-400" />
            <span className="text-[11px] font-mono">100%</span>
          </div>
          <div className="text-[11px] font-mono text-white/90 hidden sm:inline">
            {new Date().toLocaleDateString("pt-BR")}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MODALS
      ══════════════════════════════════════ */}

      {/* ── Payment Modal ── */}
      {modal === "payment" && (
        <ModalWrapper title="Pagamento da Venda" icon={<CreditCard size={18} />} onClose={() => setModal("")}>
          <form onSubmit={e => { e.preventDefault(); if (!(paymentMethod === "MONEY" && parseFloat(amountGiven) < total && amountGiven !== "")) handleFinalizeSale(); }} className="p-4 space-y-3.5">
            {/* Total Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-xl p-3.5 text-white shadow-md flex items-center justify-between">
              <div>
                <span className="text-blue-200 text-[10px] font-black tracking-widest uppercase">VALOR TOTAL DA VENDA</span>
                <div className="text-white font-black font-mono text-3xl tracking-tight leading-none mt-1">R$ {fmt(total)}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl px-3 py-1.5 text-right">
                <span className="text-[10px] uppercase font-bold text-blue-100 block">ITENS</span>
                <span className="text-xs font-black text-white">{cart.reduce((a, b) => a + b.quantity, 0)} un</span>
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-800 text-[11px] font-black uppercase tracking-wider">
                  Forma de Pagamento
                </span>
                <button
                  type="button"
                  onClick={() => setShowPosConfig(v => !v)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${showPosConfig
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
                    }`}
                >
                  <Settings size={11} /> {showPosConfig ? "Fechar Config." : "Configurar POS / Cliente"}
                </button>
              </div>

              {/* Painel Rápido de Configuração por Cliente (quando aberto) */}
              {showPosConfig && (
                <div className="mb-3 p-3.5 rounded-2xl bg-slate-50 border border-blue-200 space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-black text-slate-800 uppercase text-[10px] tracking-wider">
                      Configuração de Pagamento do Cliente
                    </span>
                    <label className="flex items-center gap-1.5 font-bold text-[11px] text-blue-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pdvPayConfig.posModeEnabled}
                        onChange={e =>
                          updateClientPayConfig({ ...pdvPayConfig, posModeEnabled: e.target.checked })
                        }
                        className="rounded text-blue-600"
                      />
                      Usar Modo Maquineta POS em Cartões
                    </label>
                  </div>

                  {/* Quais etapas pedir na Maquineta POS */}
                  {pdvPayConfig.posModeEnabled && (
                    <div className="grid grid-cols-2 gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pdvPayConfig.askAcquirer}
                          onChange={e =>
                            updateClientPayConfig({ ...pdvPayConfig, askAcquirer: e.target.checked })
                          }
                        />
                        Pedir Administradora (POS)
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pdvPayConfig.askBrand}
                          onChange={e =>
                            updateClientPayConfig({ ...pdvPayConfig, askBrand: e.target.checked })
                          }
                        />
                        Pedir Bandeira do Cartão
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pdvPayConfig.requireAuthCode}
                          onChange={e =>
                            updateClientPayConfig({ ...pdvPayConfig, requireAuthCode: e.target.checked })
                          }
                        />
                        Exigir Código do Comprovante
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pdvPayConfig.allowInstallments}
                          onChange={e =>
                            updateClientPayConfig({ ...pdvPayConfig, allowInstallments: e.target.checked })
                          }
                        />
                        Permitir Parcelamento Crédito
                      </label>
                    </div>
                  )}

                  {/* Maquinetas que o cliente trabalha */}
                  <div>
                    <div className="text-[10px] font-black text-gray-500 uppercase mb-1">
                      Maquinetas (Administradoras) deste Cliente:
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {Array.from(new Set([...ALL_SUGGESTED_ACQUIRERS, ...pdvPayConfig.acquirers])).map(acq => {
                        const active = pdvPayConfig.acquirers.includes(acq);
                        return (
                          <button
                            key={acq}
                            type="button"
                            onClick={() => {
                              const next = active
                                ? pdvPayConfig.acquirers.filter(a => a !== acq)
                                : [...pdvPayConfig.acquirers, acq];
                              if (next.length > 0) {
                                updateClientPayConfig({ ...pdvPayConfig, acquirers: next });
                              }
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${active
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                              }`}
                          >
                            {active ? "✓ " : "+ "}
                            {acq}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newAcquirerInput}
                        onChange={e => setNewAcquirerInput(e.target.value)}
                        placeholder="Outra maquineta do cliente..."
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const v = newAcquirerInput.trim();
                          if (v && !pdvPayConfig.acquirers.includes(v)) {
                            updateClientPayConfig({
                              ...pdvPayConfig,
                              acquirers: [...pdvPayConfig.acquirers, v],
                            });
                            setNewAcquirerInput("");
                          }
                        }}
                        className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { key: "MONEY", label: "Dinheiro", icon: <Banknote size={18} /> },
                  { key: "PIX", label: "PIX", icon: <QrCode size={18} /> },
                  {
                    key: "CREDIT_CARD",
                    label: pdvPayConfig.posModeEnabled ? "Crédito POS" : "Crédito",
                    icon: <CreditCard size={18} />,
                  },
                  {
                    key: "DEBIT_CARD",
                    label: pdvPayConfig.posModeEnabled ? "Débito POS" : "Débito",
                    icon: <CreditCard size={18} />,
                  },
                  {
                    key: "VOUCHER",
                    label: pdvPayConfig.posModeEnabled ? "Voucher POS" : "Voucher",
                    icon: <Zap size={18} />,
                  },
                ]
                  .filter(p => pdvPayConfig.enabledMethods[p.key as keyof typeof pdvPayConfig.enabledMethods] !== false)
                  .map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(p.key);
                        if (p.key !== "MONEY") setAmountGiven(String(total));
                        if (p.key === "CREDIT_CARD" || p.key === "DEBIT_CARD" || p.key === "VOUCHER") {
                          setPosStep(getInitialPosStep());
                        }
                      }}
                      className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all font-bold cursor-pointer ${paymentMethod === p.key
                          ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                          : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-gray-50"
                        }`}
                    >
                      {p.icon}
                      <span className="text-[11px] leading-tight">{p.label}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* ── PAINEL MAQUINETA POS: UMA INFORMAÇÃO POR VEZ (PASSO A PASSO) ── */}
            {(paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD" || paymentMethod === "VOUCHER") &&
              pdvPayConfig.posModeEnabled && (
                <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* ETAPA 1: SELECIONAR APENAS A ADMINISTRADORA (MAQUINETA POS) */}
                  {posStep === "ACQUIRER" && pdvPayConfig.askAcquirer && (
                    <div className="animate-in fade-in duration-150">
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-gray-700 text-xs font-black uppercase tracking-wider">
                          1. Selecione a Administradora (Maquineta POS)
                        </label>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Passo 1 de {1 + (pdvPayConfig.askBrand ? 1 : 0) + 1}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {pdvPayConfig.acquirers.map(acq => {
                          const active = posAcquirer === acq;
                          return (
                            <button
                              key={acq}
                              type="button"
                              onClick={() => {
                                setPosAcquirer(acq);
                                setPosStep(pdvPayConfig.askBrand ? "BRAND" : "AUTH");
                              }}
                              className={`py-3 px-3.5 rounded-xl border-2 text-sm font-black flex items-center justify-between transition-all cursor-pointer ${active
                                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs"
                                  : "border-gray-200 bg-white text-gray-800 hover:border-blue-400 hover:bg-blue-50/40"
                                }`}
                            >
                              <span className="truncate">{acq}</span>
                              <ChevronRight size={15} className="text-gray-400 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ETAPA 2: SELECIONAR APENAS A BANDEIRA DO CARTÃO */}
                  {posStep === "BRAND" && pdvPayConfig.askBrand && (
                    <div className="animate-in fade-in duration-150">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          {pdvPayConfig.askAcquirer && (
                            <button
                              type="button"
                              onClick={() => setPosStep("ACQUIRER")}
                              className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              ← {posAcquirer}
                            </button>
                          )}
                          <label className="text-gray-700 text-xs font-black uppercase tracking-wider">
                            Selecione a Bandeira do Cartão
                          </label>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Passo {pdvPayConfig.askAcquirer ? 2 : 1} de{" "}
                          {1 + (pdvPayConfig.askAcquirer ? 1 : 0) + 1}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {pdvPayConfig.brands.map(brand => {
                          const active = posBrand === brand;
                          return (
                            <button
                              key={brand}
                              type="button"
                              onClick={() => {
                                setPosBrand(brand);
                                setPosStep("AUTH");
                              }}
                              className={`py-3 px-3.5 rounded-xl border-2 text-sm font-black flex items-center justify-between transition-all cursor-pointer ${active
                                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs"
                                  : "border-gray-200 bg-white text-gray-800 hover:border-blue-400 hover:bg-blue-50/40"
                                }`}
                            >
                              <span className="truncate">{brand}</span>
                              <ChevronRight size={15} className="text-gray-400 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ETAPA 3: DIGITAR APENAS O CÓDIGO DE AUTENTICAÇÃO / NSU (+ PARCELAS) */}
                  {posStep === "AUTH" && (
                    <div className="space-y-3 animate-in fade-in duration-150">
                      {(pdvPayConfig.askAcquirer || pdvPayConfig.askBrand) && (
                        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs">
                          <div className="flex items-center gap-2 font-bold text-gray-700">
                            {pdvPayConfig.askAcquirer && (
                              <button
                                type="button"
                                onClick={() => setPosStep("ACQUIRER")}
                                className="text-blue-700 hover:underline cursor-pointer"
                              >
                                {posAcquirer}
                              </button>
                            )}
                            {pdvPayConfig.askAcquirer && pdvPayConfig.askBrand && (
                              <span className="text-gray-300">•</span>
                            )}
                            {pdvPayConfig.askBrand && (
                              <button
                                type="button"
                                onClick={() => setPosStep("BRAND")}
                                className="text-blue-700 hover:underline cursor-pointer"
                              >
                                {posBrand}
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setPosStep(getInitialPosStep())}
                            className="text-[11px] font-bold text-gray-500 hover:text-blue-600 cursor-pointer"
                          >
                            Trocar
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-12 gap-2">
                        <div
                          className={
                            paymentMethod === "CREDIT_CARD" && pdvPayConfig.allowInstallments
                              ? "col-span-8"
                              : "col-span-12"
                          }
                        >
                          <label className="text-gray-700 text-xs font-black uppercase tracking-wider mb-1.5 block">
                            Código de Autenticação / NSU (Comprovante)
                            {pdvPayConfig.requireAuthCode ? " *" : ""}
                          </label>
                          <input
                            type="text"
                            value={posAuthCode}
                            onChange={e => setPosAuthCode(e.target.value.toUpperCase())}
                            placeholder="Digite o código impresso no comprovante"
                            autoFocus
                            className="w-full bg-white border-2 border-blue-500 focus:border-blue-600 text-gray-900 font-mono font-bold text-base px-3.5 py-2.5 rounded-xl outline-none"
                          />
                        </div>

                        {paymentMethod === "CREDIT_CARD" && pdvPayConfig.allowInstallments && (
                          <div className="col-span-4">
                            <label className="text-gray-700 text-xs font-black uppercase tracking-wider mb-1.5 block">
                              Parcelas
                            </label>
                            <select
                              value={posInstallments}
                              onChange={e => setPosInstallments(e.target.value)}
                              className="w-full bg-white border-2 border-gray-300 focus:border-blue-600 text-gray-900 font-bold text-xs px-2.5 py-3 rounded-xl outline-none"
                            >
                              <option value="1">1x À Vista</option>
                              <option value="2">2x</option>
                              <option value="3">3x</option>
                              <option value="4">4x</option>
                              <option value="5">5x</option>
                              <option value="6">6x</option>
                              <option value="10">10x</option>
                              <option value="12">12x</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Dinheiro Input & Quick Values */}
            {paymentMethod === "MONEY" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex justify-between items-center">
                  <span className="text-gray-800 text-[11px] font-black uppercase tracking-wider">Valor Recebido</span>
                  {parseFloat(amountGiven) >= total && total > 0 && (
                    <span className="text-emerald-700 text-xs font-black font-mono">
                      Troco: R$ {fmt(troco)}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base">R$</span>
                  <input
                    type="number"
                    value={amountGiven}
                    onChange={e => setAmountGiven(e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-gray-900 font-mono font-black text-2xl text-right pl-10 pr-3 py-2 rounded-xl outline-none shadow-2xs transition-all"
                    placeholder="0,00"
                    autoFocus
                    step="0.01"
                  />
                </div>

                {/* Quick cash pills */}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAmountGiven(String(total))}
                    className="flex-1 py-1 px-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-bold rounded-lg border border-gray-200 transition-colors"
                  >
                    Exato
                  </button>
                  {[10, 20, 50, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountGiven(String(val))}
                      className="flex-1 py-1 px-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-bold rounded-lg border border-gray-200 transition-colors"
                    >
                      R$ {val}
                    </button>
                  ))}
                </div>

                {parseFloat(amountGiven) >= total && total > 0 && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3.5 py-2 flex justify-between items-center shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Banknote size={18} className="text-emerald-600 shrink-0" />
                      <span className="text-emerald-900 text-xs font-black uppercase tracking-wider">Troco a Devolver</span>
                    </div>
                    <span className="text-emerald-700 font-black text-xl font-mono">R$ {fmt(troco)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Buttons */}
            <div className="flex gap-2.5 pt-2.5 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setModal("")}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Voltar (ESC)
              </button>
              <button
                type="submit"
                disabled={paymentMethod === "MONEY" && parseFloat(amountGiven) < total && amountGiven !== ""}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check size={16} /> Confirmar Venda (ENTER)
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* ── Success Modal ── */}
      {modal === "success" && (
        <ModalWrapper title="Venda Concluída" icon={<Check size={20} />} onClose={() => { setModal(""); clearSale(); }}>
          <div className="p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-green-50 border-4 border-green-500 rounded-full flex items-center justify-center mx-auto shadow-md animate-in zoom-in duration-300">
              <Check size={48} className="text-green-500" />
            </div>
            <div>
              <div className="text-gray-900 text-2xl font-black tracking-tight">CUPOM EMITIDO</div>
              <div className="text-gray-500 text-sm mt-1">A venda foi registrada com sucesso no sistema.</div>
              <div className="mt-4 inline-block bg-gray-100 border border-gray-200 text-gray-700 font-mono text-xs px-4 py-2 rounded-lg font-bold">
                Cód: {lastSaleId.slice(0, 12).toUpperCase()}
              </div>
            </div>

            {paymentMethod === "MONEY" && troco > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 shadow-sm">
                <div className="text-green-600 text-[10px] font-bold uppercase tracking-widest mb-1">Troco a Devolver</div>
                <div className="text-green-700 font-black text-4xl font-mono">R$ {fmt(troco)}</div>
                <ChangeVisual amount={troco} />
              </div>
            )}

            <button
              onClick={() => { setModal(""); clearSale(); }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-sm tracking-widest transition-all shadow-md shadow-blue-500/20 mt-4"
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
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex gap-3">
                  <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Fechamento às Cegas Ativo</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Conte fisicamente os valores na gaveta e insira-os abaixo. Os valores esperados pelo sistema só serão exibidos após você avançar.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contagem Física: Dinheiro (R$)</label>
                    <input
                      type="number"
                      value={countedMoney}
                      onChange={e => setCountedMoney(e.target.value)}
                      placeholder="Total em Espécie"
                      className="w-full bg-white border border-gray-200 focus:border-blue-600 text-gray-900 font-mono text-lg text-right px-4 py-3 rounded-xl outline-none transition-all shadow-sm"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contagem Física: Cartão (R$)</label>
                    <input
                      type="number"
                      value={countedCard}
                      onChange={e => setCountedCard(e.target.value)}
                      placeholder="Soma das vias de cartão"
                      className="w-full bg-white border border-gray-200 focus:border-blue-600 text-gray-900 font-mono text-lg text-right px-4 py-3 rounded-xl outline-none transition-all shadow-sm"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contagem Física: PIX (R$)</label>
                    <input
                      type="number"
                      value={countedPix}
                      onChange={e => setCountedPix(e.target.value)}
                      placeholder="Relatório de PIX recebidos"
                      className="w-full bg-white border border-gray-200 focus:border-blue-600 text-gray-900 font-mono text-lg text-right px-4 py-3 rounded-xl outline-none transition-all shadow-sm"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Observações do Fechamento</label>
                  <textarea
                    value={closingNote}
                    onChange={e => setClosingNote(e.target.value)}
                    placeholder="Adicione qualquer observação ou detalhe sobre discrepâncias..."
                    className="w-full bg-white border border-gray-200 focus:border-blue-600 text-gray-800 px-4 py-3 rounded-xl outline-none text-xs resize-none transition-all shadow-sm"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <button onClick={() => setModal("")} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-xs transition-all">
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
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs tracking-widest transition-all shadow-md shadow-blue-500/20"
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
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="text-gray-400 text-[9px] uppercase font-bold tracking-widest mb-0.5">Fundo Inicial</div>
                    <div className="text-gray-900 font-bold text-base font-mono">R$ {fmt(session.initialBalance)}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="text-gray-400 text-[9px] uppercase font-bold tracking-widest mb-0.5">Total Vendas</div>
                    <div className="text-gray-900 font-bold text-base font-mono">R$ {fmt(sessionStats.totalSales)}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="text-gray-400 text-[9px] uppercase font-bold tracking-widest mb-0.5">Sangrias</div>
                    <div className="text-red-600 font-bold text-base font-mono">- R$ {fmt(sessionStats.totalWithdrawals)}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="text-gray-400 text-[9px] uppercase font-bold tracking-widest mb-0.5">Suprimentos</div>
                    <div className="text-green-600 font-bold text-base font-mono">+ R$ {fmt(sessionStats.totalSupplements)}</div>
                  </div>
                </div>

                {/* Discrepancies Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3">Meio de Pagamento</th>
                        <th className="px-5 py-3 text-right">Esperado pelo Sistema</th>
                        <th className="px-5 py-3 text-right">Informado pelo Operador</th>
                        <th className="px-5 py-3 text-right">Diferença (Sobra/Falta)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
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
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-5 py-3.5 font-bold text-gray-900">{f.label}</td>
                              <td className="px-5 py-3.5 text-right font-mono text-gray-600">R$ {fmt(f.expected)}</td>
                              <td className="px-5 py-3.5 text-right font-mono text-gray-600">R$ {fmt(f.counted)}</td>
                              <td className={`px-5 py-3.5 text-right font-mono font-black ${Math.abs(diff) < 0.05
                                ? "text-green-600"
                                : diff > 0
                                  ? "text-blue-600"
                                  : "text-red-600"
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

                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <button onClick={() => setClosingStep("input")} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-xs transition-all">
                    CORRIGIR CONTAGEM
                  </button>
                  <button
                    onClick={async () => {
                      const expectedMoney = expectedCash;
                      const expectedCard = session.sales
                        .filter(s => s.paymentMethod === "CREDIT_CARD" || s.paymentMethod === "DEBIT_CARD")
                        .reduce((a, s) => a + s.total, 0);
                      const expectedPix = session.sales
                        .filter(s => s.paymentMethod === "PIX")
                        .reduce((a, s) => a + s.total, 0);

                      const cMoney = parseFloat(countedMoney) || 0;
                      const cCard = parseFloat(countedCard) || 0;
                      const cPix = parseFloat(countedPix) || 0;

                      const totExp = expectedMoney + expectedCard + expectedPix;
                      const totCnt = cMoney + cCard + cPix;
                      const totDiff = totCnt - totExp;

                      await saveCashClosing({
                        cashierNumber: session.number,
                        operator: session.operator,
                        openedAt: session.openedAt,
                        closedAt: new Date().toISOString(),
                        initialBalance: session.initialBalance,
                        totalSales: sessionStats.totalSales,
                        totalWithdrawals: sessionStats.totalWithdrawals,
                        totalSupplements: sessionStats.totalSupplements,
                        expectedMoney,
                        countedMoney: cMoney,
                        diffMoney: cMoney - expectedMoney,
                        expectedCard,
                        countedCard: cCard,
                        diffCard: cCard - expectedCard,
                        expectedPix,
                        countedPix: cPix,
                        diffPix: cPix - expectedPix,
                        totalExpected: totExp,
                        totalCounted: totCnt,
                        totalDiff: totDiff,
                        closingNote,
                        status: Math.abs(totDiff) > 0.05 ? "DIVERGENT" : "PENDING"
                      });

                      alert("Caixa fechado com sucesso! Relatório transmitido para conferência e homologação da Tesouraria.");
                      setSession(null);
                      setModal("");
                      setClosingStep("input");
                      setCountedMoney("");
                      setCountedCard("");
                      setCountedPix("");
                      setClosingNote("");
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl text-xs tracking-widest transition-all shadow-md shadow-green-600/20 cursor-pointer"
                  >
                    CONFIRMAR &amp; FECHAR CAIXA
                  </button>
                </div>
              </div>
            )}

          </div>
        </ModalWrapper>
      )}


      {/* ── Withdrawal / Supplement Modal ── */}
      {modal === "withdrawal" && (
        <ModalWrapper
          title={withdrawalType === "withdrawal" ? "Sangria de Caixa" : "Suprimento de Caixa"}
          icon={withdrawalType === "withdrawal" ? <TrendingDown size={20} /> : <Plus size={20} />}
          onClose={() => setModal("")}
        >
          <div className="p-6 space-y-5">
            <div className={`text-center py-3 rounded-xl border text-sm font-bold tracking-widest uppercase ${withdrawalType === "withdrawal"
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-green-200 bg-green-50 text-green-700"
              }`}>
              {withdrawalType === "withdrawal" ? "Retirada de Dinheiro" : "Adição de Dinheiro"}
            </div>
            <div>
              <label className="text-gray-500 text-xs font-bold uppercase tracking-widest block mb-2">Valor (R$)</label>
              <input
                type="number"
                value={withdrawalAmount}
                onChange={e => setWithdrawalAmount(e.target.value)}
                autoFocus
                className="w-full bg-white border border-gray-200 focus:border-blue-600 text-gray-900 font-black text-3xl text-right px-4 py-4 rounded-xl outline-none font-mono shadow-sm transition-all"
                placeholder="0,00"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-gray-500 text-xs font-bold uppercase tracking-widest block mb-2">Motivo / Observação</label>
              <input
                type="text"
                value={withdrawalReason}
                onChange={e => setWithdrawalReason(e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-blue-600 text-gray-800 px-4 py-3 rounded-xl outline-none text-sm shadow-sm transition-all"
                placeholder="Ex: Pagamento de fornecedor, troco..."
              />
            </div>
            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <button onClick={() => setModal("")} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-sm transition-all">
                CANCELAR
              </button>
              <button
                onClick={handleWithdrawal}
                disabled={!withdrawalAmount || parseFloat(withdrawalAmount) <= 0}
                className={`flex-1 font-bold py-3.5 rounded-xl text-sm tracking-widest transition-all disabled:opacity-40 text-white ${withdrawalType === "withdrawal"
                  ? "bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20"
                  : "bg-green-600 hover:bg-green-700 shadow-md shadow-green-600/20"
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
              (() => {
                const currentAd = promotionalAds[activeAdIndex] || promotionalAds[0];
                const adImg = currentAd.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600";

                return (
                  <div
                    className={`w-full bg-gradient-to-r ${currentAd.color} border border-white/10 rounded-2xl p-8 text-center space-y-4 cursor-pointer transition-all duration-500 shadow-xl relative overflow-hidden`}
                    onClick={() => setPriceCheckIdle(false)}
                  >
                    {adImg && (
                      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
                        <img src={adImg} alt="Backdrop" className="w-full h-full object-cover blur-[5px] scale-105 opacity-[0.45]" />
                        <div className="absolute inset-0 bg-black/60" />
                      </div>
                    )}

                    <div className="relative z-10 text-white">
                      <div className="inline-block text-[9px] bg-white/20 font-black uppercase tracking-widest px-3 py-1 rounded-full mb-1">
                        {currentAd.badge}
                      </div>
                      <h4 className="text-xl font-black uppercase leading-tight">{currentAd.title}</h4>
                      <p className="text-xs text-white/90 font-bold max-w-md mx-auto">{currentAd.desc}</p>
                      <div className="text-[9px] text-white/60 font-bold uppercase tracking-widest pt-4 border-t border-white/10 mt-3">
                        Escaneie o código de barras ou digite para pesquisar o preço
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                <form onSubmit={handlePriceCheck} className="flex gap-3">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={priceCheckQuery}
                      onChange={e => setPriceCheckQuery(e.target.value)}
                      autoFocus
                      placeholder="Código de barras ou nome do produto..."
                      className="w-full bg-white border border-gray-200 focus:border-blue-600 text-gray-800 font-mono px-4 py-3 pl-11 rounded-xl outline-none text-sm shadow-sm transition-all"
                    />
                  </div>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-xs tracking-widest transition-all shadow-md shadow-blue-500/20">
                    BUSCAR
                  </button>
                </form>

                {priceCheckLoading && <div className="text-center text-gray-400 py-8 animate-pulse font-medium">Buscando produto...</div>}

                {priceCheckResult && (
                  <div className={`border rounded-2xl p-8 text-center shadow-sm ${priceCheckResult.price ? "border-blue-200 bg-blue-50/40" : "border-red-200 bg-red-50/40"}`}>
                    <div className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-2">Resultado da Busca</div>
                    <div className="text-gray-900 font-bold text-xl uppercase mb-4 leading-tight">{priceCheckResult.name}</div>

                    {priceCheckResult.price !== null ? (
                      <>
                        <div className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-1">Preço Atual</div>
                        <div className="text-blue-600 font-black font-mono text-5xl tracking-tight mb-6">
                          R$ {fmt(Number(priceCheckResult.price))}
                        </div>
                        <button onClick={() => { addToCart(priceCheckResult); setModal(""); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl text-sm tracking-wide transition-all shadow-md shadow-blue-500/20">
                          + ADICIONAR AO CARRINHO
                        </button>
                      </>
                    ) : (
                      <div className="text-red-500 font-medium py-4">Este produto não possui preço cadastrado ou não foi encontrado.</div>
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
              <div className="text-center text-gray-400 py-8 animate-pulse">Carregando pedidos...</div>
            ) : ordersList.length === 0 ? (
              <div className="text-center text-gray-400 py-8">Nenhum pedido pendente encontrado.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {ordersList.map((o: any) => (
                  <div key={o.id} className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex justify-between items-center hover:border-blue-400 transition-colors">
                    <div>
                      <div className="text-gray-900 font-bold text-sm">Pedido #{o.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-gray-500 text-xs mt-0.5">Cliente: {o.customer?.name || "Não identificado"}</div>
                      <div className="text-blue-600 font-mono font-bold text-xs mt-1">Total: R$ {Number(o.total || 0).toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => handleImportOrder(o.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm"
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
              className="w-full bg-white border border-gray-200 focus:border-blue-600 text-gray-900 font-mono text-lg px-4 py-3 rounded-xl outline-none shadow-sm transition-all text-center"
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/20"
            >
              CONFIRMAR
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* ── Quantity Modal (F3) ── */}
      {modal === "quantity" && (
        <ModalWrapper
          title="Definir Quantidade (F3)"
          icon={<Package size={20} />}
          onClose={() => {
            setModal("");
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = parseInt(quantityPromptInput);
              if (!isNaN(q) && q > 0) {
                setMultiplier(q);
              }
              setModal("");
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="p-6 space-y-5 text-center"
          >
            <div className="text-xs text-gray-500 font-medium">
              Digite a quantidade multiplicadora para os próximos itens registrados no PDV:
            </div>
            <input
              type="number"
              min={1}
              max={999}
              value={quantityPromptInput}
              onChange={(e) => setQuantityPromptInput(e.target.value)}
              autoFocus
              className="w-full text-center text-4xl font-black font-mono py-3 bg-gray-50 border-2 border-blue-500 focus:border-blue-600 rounded-2xl outline-none shadow-inner"
            />
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setMultiplier(num);
                    setModal("");
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="py-2.5 rounded-xl bg-gray-100 hover:bg-blue-50 hover:text-blue-600 font-black text-sm transition-colors border border-gray-200 cursor-pointer"
                >
                  {num}x
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 cursor-pointer uppercase tracking-wider"
            >
              Confirmar Quantidade (ENTER)
            </button>
          </form>
        </ModalWrapper>
      )}

      {/* ── Central de Configurações do PDV (5 Módulos Oficiais) ── */}
      <PdvConfigModal
        isOpen={isConfigOpen}
        onClose={() => {
          setIsConfigOpen(false);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        currentHotkeys={hotkeys}
        onSaveHotkeys={saveHotkeys}
        onTriggerTestPrint={() => {
          printReceipt(
            "TEST-PRINT",
            [{ id: "test", name: "TESTE DE IMPRESSÃO ESC/POS", price: 1.0, quantity: 1, barcode: "7890000000001" }],
            1.0,
            1.0,
            0,
            "MONEY",
            1.0,
            0
          );
        }}
      />

      {/* ── Pause / Lock Overlay ── */}
      {isPaused && (
        <div className="fixed inset-0 bg-[#0a1226]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 text-white select-none">
          <div className="bg-white text-gray-800 border border-gray-200 rounded-3xl p-8 shadow-2xl max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-2xl font-black shadow-xs">
              ⏸️
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Turno em Pausa
              </span>
              <h2 className="text-2xl font-black text-gray-900 mt-2">Caixa Bloqueado</h2>
              <p className="text-xs text-gray-500 mt-1">
                Operador: <strong className="text-gray-900 font-bold">{session?.operator}</strong> (Caixa {String(session?.number).padStart(2, "0")})
              </p>
              {cart.length > 0 && (
                <div className="mt-2 text-xs font-bold text-blue-700 bg-blue-50 py-1.5 px-3 rounded-xl border border-blue-200">
                  🛒 Venda em andamento com {cart.length} itens preservada
                </div>
              )}
            </div>

            <form onSubmit={handleResumePDV} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-gray-600 mb-1.5">
                  Digite seu PIN para Destravar
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pausePin}
                  onChange={e => setPausePin(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  className="w-full text-center tracking-[0.8em] text-3xl font-mono font-black py-2.5 bg-gray-50 border-2 border-gray-300 focus:border-blue-600 rounded-xl outline-none shadow-2xs"
                />
                {pauseError && (
                  <p className="text-xs font-bold text-rose-600 mt-1.5">{pauseError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                🔓 Desbloquear Caixa
              </button>
            </form>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <p className="text-[11px] text-gray-500">Outro operador precisa assumir este terminal?</p>
              <button
                type="button"
                onClick={handleSwitchOperator}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all border border-gray-300 cursor-pointer flex items-center justify-center gap-2"
              >
                <Users size={14} /> Pausar Meu Turno e Trocar de Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden iframe for receipt printing */}
      <iframe
        ref={receiptFrameRef}
        style={{
          position: 'fixed',
          bottom: '0',
          right: '0',
          width: '1px',
          height: '1px',
          opacity: 0.01,
          pointerEvents: 'none',
          border: 'none',
          zIndex: -1
        }}
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className={`bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-h-[92vh] flex flex-col text-gray-800 ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5 text-gray-900 font-extrabold text-sm tracking-wide">
            <div className="text-blue-600">{icon}</div> {title}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 p-1.5 rounded-full transition-colors cursor-pointer shadow-2xs">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
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
