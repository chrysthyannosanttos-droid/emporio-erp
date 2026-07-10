import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

// ─── Impressão Térmica ───────────────────────────
function buildReceiptHTML(data: {
  storeName: string;
  cnpj: string;
  address: string;
  operator: string;
  cashier: number;
  saleId: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountGiven: number;
  change: number;
  cpf: string;
  date: Date;
}) {
  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dt = data.date;
  const dateStr = `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
  const timeStr = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}:${String(dt.getSeconds()).padStart(2,'0')}`;

  const payLabels: Record<string, string> = { MONEY: 'Dinheiro', PIX: 'PIX', CREDIT_CARD: 'Cartão Crédito', DEBIT_CARD: 'Cartão Débito', VOUCHER: 'Voucher' };

  const itemRows = data.items.map(i => {
    const nameCol = i.name.length > 24 ? i.name.substring(0, 24) : i.name.padEnd(24);
    return `<tr><td style="text-align:left">${nameCol}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${fmtBRL(i.price)}</td><td style="text-align:right">${fmtBRL(i.qty * i.price)}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Cupom</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 4mm; color: #000; background: #fff; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .sep { border-top: 1px dashed #000; margin: 6px 0; }
  .store { font-size: 16px; font-weight: 900; letter-spacing: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 2px 0; font-size: 11px; }
  th { border-bottom: 1px solid #000; }
  .total-row td { font-size: 14px; font-weight: 900; padding-top: 4px; }
  .footer { font-size: 9px; margin-top: 10px; }
</style>
</head><body>
  <div class="center">
    <div class="store">${data.storeName}</div>
    <div>CNPJ: ${data.cnpj}</div>
    <div>${data.address}</div>
  </div>
  <div class="sep"></div>
  <div class="center bold">CUPOM NÃO FISCAL</div>
  <div>Data: ${dateStr} ${timeStr}</div>
  <div>Caixa: ${String(data.cashier).padStart(2, '0')} | Op: ${data.operator}</div>
  <div>Venda: ${data.saleId}</div>
  <div class="sep"></div>
  <table>
    <thead><tr><th style="text-align:left">DESCRIÇÃO</th><th>QTD</th><th style="text-align:right">UNIT</th><th style="text-align:right">TOTAL</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="sep"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">${fmtBRL(data.subtotal)}</td></tr>
    ${data.discount > 0 ? `<tr><td>Desconto</td><td style="text-align:right">-${fmtBRL(data.discount)}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">R$ ${fmtBRL(data.total)}</td></tr>
  </table>
  <div class="sep"></div>
  <div>Forma Pgto: ${payLabels[data.paymentMethod] || data.paymentMethod}</div>
  ${data.paymentMethod === 'MONEY' ? `<div>Recebido: R$ ${fmtBRL(data.amountGiven)}</div><div class="bold">Troco: R$ ${fmtBRL(data.change)}</div>` : ''}
  ${data.cpf ? `<div class="sep"></div><div>CPF na Nota: ${data.cpf}</div>` : ''}
  <div class="sep"></div>
  <div class="center footer">
    <div>Obrigado pela preferência!</div>
    <div>Volte sempre!</div>
    <div style="margin-top:6px">Emporio PDV v2.0</div>
  </div>
  <div style="height:20mm"></div>
</body></html>`;
}

// ─── Interfaces ──────────────────────────────────
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode: string;
}

interface CurrencyPiece {
  value: number;
  label: string;
  type: 'note' | 'coin';
  color: string;
  bg: string;
  border: string;
  symbol: string; // emoji or icon character
}

const CURRENCY_PIECES: CurrencyPiece[] = [
  { value: 200, label: 'R$ 200', type: 'note', color: '#6B7280', bg: '#374151', border: '#6B7280', symbol: '🐺' },
  { value: 100, label: 'R$ 100', type: 'note', color: '#06B6D4', bg: '#083344', border: '#06B6D4', symbol: '🐟' },
  { value: 50,  label: 'R$ 50',  type: 'note', color: '#F97316', bg: '#431407', border: '#F97316', symbol: '🐆' },
  { value: 20,  label: 'R$ 20',  type: 'note', color: '#EAB308', bg: '#422006', border: '#EAB308', symbol: '🐒' },
  { value: 10,  label: 'R$ 10',  type: 'note', color: '#EF4444', bg: '#450A0A', border: '#EF4444', symbol: '🦜' },
  { value: 5,   label: 'R$ 5',   type: 'note', color: '#A855F7', bg: '#2E1065', border: '#A855F7', symbol: '🦅' },
  { value: 2,   label: 'R$ 2',   type: 'note', color: '#3B82F6', bg: '#172554', border: '#3B82F6', symbol: '🐢' },
  { value: 1,    label: 'R$ 1',    type: 'coin', color: '#FBBF24', bg: '#78350F', border: '#FBBF24', symbol: '●' },
  { value: 0.50, label: 'R$ 0,50', type: 'coin', color: '#D4D4D8', bg: '#3F3F46', border: '#A1A1AA', symbol: '●' },
  { value: 0.25, label: 'R$ 0,25', type: 'coin', color: '#D4D4D8', bg: '#3F3F46', border: '#71717A', symbol: '●' },
  { value: 0.10, label: 'R$ 0,10', type: 'coin', color: '#FCD34D', bg: '#451A03', border: '#F59E0B', symbol: '●' },
  { value: 0.05, label: 'R$ 0,05', type: 'coin', color: '#CD7F32', bg: '#3B1A00', border: '#CD7F32', symbol: '●' },
];

function getChangeBreakdown(changeAmount: number): { piece: CurrencyPiece; count: number }[] {
  const result: { piece: CurrencyPiece; count: number }[] = [];
  let remaining = Math.round(changeAmount * 100); // work in centavos to avoid float errors
  for (const piece of CURRENCY_PIECES) {
    const valueCents = Math.round(piece.value * 100);
    const count = Math.floor(remaining / valueCents);
    if (count > 0) {
      result.push({ piece, count });
      remaining -= count * valueCents;
    }
  }
  return result;
}

function ChangeVisual({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  const breakdown = getChangeBreakdown(amount);
  if (breakdown.length === 0) return null;

  const notes = breakdown.filter(b => b.piece.type === 'note');
  const coins = breakdown.filter(b => b.piece.type === 'coin');

  return (
    <div className="mt-3 space-y-3">
      <div className="text-[#00ff41]/40 text-[10px] font-bold tracking-widest text-center">SUGESTÃO DE TROCO</div>
      
      {notes.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {notes.map(({ piece, count }) => (
            <div key={piece.value} className="relative">
              <div
                style={{
                  background: piece.bg,
                  borderColor: piece.border,
                  color: piece.color,
                }}
                className="border-2 rounded-lg px-3 py-2 flex flex-col items-center justify-center min-w-[70px] relative"
              >
                <span className="text-lg leading-none">{piece.symbol}</span>
                <span className="text-xs font-black mt-0.5">{piece.label}</span>
                {/* Stripe pattern for notes */}
                <div style={{ background: `${piece.color}15` }} className="absolute inset-0 rounded-lg pointer-events-none" />
                <div style={{ borderColor: `${piece.color}30` }} className="absolute inset-1 border border-dashed rounded pointer-events-none" />
              </div>
              {count > 1 && (
                <span
                  style={{ background: piece.color }}
                  className="absolute -top-2 -right-2 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                >
                  {count}x
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {coins.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {coins.map(({ piece, count }) => (
            <div key={piece.value} className="relative">
              <div
                style={{
                  background: `radial-gradient(circle, ${piece.bg}, #1a1a1a)`,
                  borderColor: piece.border,
                  color: piece.color,
                  boxShadow: `inset 0 1px 3px ${piece.color}40, 0 2px 4px rgba(0,0,0,0.5)`,
                }}
                className="border-2 rounded-full w-12 h-12 flex flex-col items-center justify-center"
              >
                <span className="text-[8px] font-black leading-none mt-0.5">{piece.label}</span>
              </div>
              {count > 1 && (
                <span
                  style={{ background: piece.color }}
                  className="absolute -top-1 -right-1 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                >
                  {count}x
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CashierSession {
  id: string;
  number: number;
  operator: string;
  openedAt: Date;
  initialBalance: number;
  sales: { id: string; total: number; paymentMethod: string; at: Date }[];
  withdrawals: { id: string; amount: number; reason: string; at: Date }[];
  supplements: { id: string; amount: number; reason: string; at: Date }[];
}

// ─── Helper de Formatação ─────────────────────────
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

const PAYMENT_LABELS: Record<string, string> = {
  MONEY: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Crédito",
  DEBIT_CARD: "Débito",
  VOUCHER: "Voucher",
};

// ─── Componente Principal ───────────────────────────
function App() {
  const [session, setSession] = useState<CashierSession | null>(null);
  const [pin, setPin] = useState("");
  const [selectedCashier, setSelectedCashier] = useState<number | null>(null);
  const [loginError, setLoginError] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [discountInput, setDiscountInput] = useState('0');
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);

  // Modals do Caixa
  const [modal, setModal] = useState<"" | "payment" | "success" | "closing" | "withdrawal" | "pricecheck" | "cpf">("");
  const [paymentMethod, setPaymentMethod] = useState("MONEY");
  const [amountGiven, setAmountGiven] = useState("");
  const [lastSaleId, setLastSaleId] = useState("");

  // Fechamento de Caixa
  const [closingCounted, setClosingCounted] = useState("");
  const [closingNote, setClosingNote] = useState("");

  // Sangria / Suprimento
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [withdrawalType, setWithdrawalType] = useState<"withdrawal" | "supplement">("withdrawal");

  // Consulta de Preço
  const [priceCheckQuery, setPriceCheckQuery] = useState("");
  const [priceCheckResult, setPriceCheckResult] = useState<any>(null);

  // CPF
  const [cpfInput, setCpfInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerCredit, setCustomerCredit] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const receiptFrameRef = useRef<HTMLIFrameElement>(null);
  const time = useClock();

  // Função de impressão automática do cupom
  const printReceipt = useCallback((saleId: string, cartItems: CartItem[], saleTotal: number, saleSub: number, saleDiscount: number, salePay: string, saleGiven: number, saleChange: number) => {
    const html = buildReceiptHTML({
      storeName: 'EMPORIO',
      cnpj: '00.000.000/0001-00',
      address: 'Rua Principal, 100 - Centro',
      operator: session?.operator || 'Operador',
      cashier: session?.number || 1,
      saleId,
      items: cartItems.map(i => ({ name: i.name, qty: i.quantity, price: i.price })),
      subtotal: saleSub,
      discount: saleDiscount,
      total: saleTotal,
      paymentMethod: salePay,
      amountGiven: saleGiven,
      change: saleChange,
      cpf: cpfInput,
      date: new Date()
    });

    const iframe = receiptFrameRef.current;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        // Aguarda o conteúdo carregar e então imprime
        setTimeout(() => {
          iframe.contentWindow?.print();
        }, 300);
      }
    }
  }, [session, cpfInput]);

  // Mock de operadores
  const cashiersMock = [
    { number: 1, operator: "Maria Silva", initialBalance: 200 },
    { number: 2, operator: "João Santos", initialBalance: 200 },
    { number: 3, operator: "Ana Costa", initialBalance: 150 },
    { number: 4, operator: "Carlos Lima", initialBalance: 200 },
    { number: 5, operator: "Livre", initialBalance: 0 },
    { number: 6, operator: "Livre", initialBalance: 0 },
  ];

  // Foco contínuo no leitor
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

  // Atalhos de teclado (F3 - F12)
  useEffect(() => {
    if (!session) return;
    const handler = (e: KeyboardEvent) => {
      if (modal !== "") {
        if (e.key === "Escape") { e.preventDefault(); setModal(""); }
        return;
      }
      if (e.key === "F12") { e.preventDefault(); if (cart.length > 0) setModal("payment"); }
      if (e.key === "F9")  { e.preventDefault(); setModal("closing"); }
      if (e.key === "F5")  { e.preventDefault(); setWithdrawalType("withdrawal"); setModal("withdrawal"); }
      if (e.key === "F6")  { e.preventDefault(); setWithdrawalType("supplement"); setModal("withdrawal"); }
      if (e.key === "F7")  { e.preventDefault(); setPriceCheckQuery(""); setPriceCheckResult(null); setModal("pricecheck"); }
      if (e.key === "F4")  { e.preventDefault(); setCpfInput(""); setModal("cpf"); }
      if (e.key === "F3") {
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
  }, [modal, cart, session]);

  // Cálculos de totais
  useEffect(() => {
    const sub = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const disc = parseFloat(discountInput) || 0;
    setSubtotal(sub);
    setTotal(Math.max(0, sub - disc));
  }, [cart, discountInput]);

  const clearSale = useCallback(() => {
    setCart([]); setDiscountInput("0");
    setBarcodeInput(""); setErrorMessage(""); setAmountGiven("");
    setCpfInput(""); setCustomerName(""); setCustomerCredit(0);
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const query = barcodeInput.trim();
    if (!query) return;

    // Primeiro tenta buscar na internet se parecer código de barras EAN real
    let name = `Produto ${query}`;
    let price = Math.floor(Math.random() * 20) + 1.99;

    if (/^\d{8,14}$/.test(query)) {
      try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${query}.json`);
        const data = await res.json();
        if (data.status === 1 && data.product) {
          name = data.product.product_name || data.product.product_name_pt || name;
        }
      } catch (err) {
        console.log("Erro ao buscar código de barras na internet, usando mock", err);
      }
    }

    setCart(prev => {
      const existing = prev.find(p => p.barcode === query);
      if (existing) {
        return prev.map(p => p.barcode === query ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { id: Math.random().toString(), name, price, barcode: query, quantity: 1 }];
    });

    setBarcodeInput('');
  };

  const handleFinalizeSale = () => {
    if (cart.length === 0) return;
    const saleId = Math.random().toString(36).substr(2, 9).toUpperCase();
    const disc = parseFloat(discountInput) || 0;
    const saleGiven = parseFloat(amountGiven) || 0;
    const saleChange = paymentMethod === "MONEY" && saleGiven >= total ? saleGiven - total : 0;
    
    if (session) {
      setSession(prev => prev ? {
        ...prev,
        sales: [...prev.sales, { id: saleId, total, paymentMethod, at: new Date() }]
      } : prev);
    }
    
    // Imprime o cupom automaticamente
    printReceipt(saleId, cart, total, subtotal, disc, paymentMethod, saleGiven, saleChange);
    
    setLastSaleId(saleId);
    setModal("success");
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
    let name = "Produto não cadastrado";
    let price = 0;

    if (/^\d{8,14}$/.test(priceCheckQuery.trim())) {
      try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${priceCheckQuery.trim()}.json`);
        const data = await res.json();
        if (data.status === 1 && data.product) {
          name = data.product.product_name || data.product.product_name_pt || name;
          price = Math.floor(Math.random() * 20) + 1.99;
        }
      } catch (err) {
        console.log(err);
      }
    }
    setPriceCheckResult({ name, price });
  };

  // Login do Caixa
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setLoginError("PIN deve ter 4 dígitos.");
      return;
    }
    const match = cashiersMock.find(c => c.number === selectedCashier);
    if (match) {
      setSession({
        id: `sess_${Date.now()}`,
        number: match.number,
        operator: match.operator === "Livre" ? "Operador Temporário" : match.operator,
        openedAt: new Date(),
        initialBalance: match.initialBalance,
        sales: [],
        withdrawals: [],
        supplements: [],
      });
      setLoginError("");
    }
  };

  if (!session) {
    return (
      <div className="h-screen flex flex-col bg-black text-white font-mono justify-center items-center p-8 select-none" style={{ fontFamily: "'Courier New', monospace" }}>
        <div className="w-full max-w-4xl">
          <div className="text-center mb-10">
            <h1 className="text-[#00ff41] text-4xl font-black tracking-widest mb-2">EMPORIO PDV</h1>
            <p className="text-[#00ff41]/60 text-sm">SISTEMA PDV DESKTOP v2.0</p>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            {cashiersMock.map(cx => (
              <button
                key={cx.number}
                onClick={() => { setSelectedCashier(cx.number); setPin(""); setLoginError(""); }}
                className={`border-2 p-6 rounded-lg transition-all text-left ${
                  selectedCashier === cx.number
                    ? "border-[#00ff41] bg-[#00ff41]/10"
                    : "border-[#00ff41]/20 bg-[#001a00]/30 hover:border-[#00ff41]/60"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-5xl font-black text-[#00ff41]/70">{String(cx.number).padStart(2, "0")}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-[#00ff41]/40 text-[#00ff41]/80">
                    {cx.operator === "Livre" ? "LIVRE" : "OPERADOR"}
                  </span>
                </div>
                <div className="text-sm font-bold text-[#00ff41]">{cx.operator}</div>
              </button>
            ))}
          </div>

          {selectedCashier !== null && (
            <form onSubmit={handleLogin} className="max-w-sm mx-auto bg-[#001a00] border-2 border-[#00ff41] rounded-lg p-6 shadow-[0_0_30px_rgba(0,255,65,0.1)]">
              <div className="text-center mb-4">
                <div className="text-[#00ff41] font-black text-lg">CAIXA {String(selectedCashier).padStart(2, "0")}</div>
              </div>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value.slice(0, 4))}
                maxLength={4}
                autoFocus
                className="w-full bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] text-center text-4xl font-black tracking-[0.5em] py-3 rounded outline-none"
                placeholder="••••"
              />
              {loginError && <p className="text-red-400 text-xs text-center mt-2">{loginError}</p>}
              <button type="submit" className="w-full mt-4 bg-[#00ff41] text-black font-black py-3 rounded text-sm tracking-widest hover:bg-[#00ff41]/90">
                ABRIR SESSÃO
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Cálculos do fechamento
  const totalSales = session.sales.reduce((a, s) => a + s.total, 0);
  const totalWithdrawals = session.withdrawals.reduce((a, w) => a + w.amount, 0);
  const totalSupplements = session.supplements.reduce((a, s) => a + s.amount, 0);
  const expectedCash = session.initialBalance + session.sales.filter(s => s.paymentMethod === "MONEY").reduce((a, s) => a + s.total, 0) + totalSupplements - totalWithdrawals;
  const troco = paymentMethod === "MONEY" && parseFloat(amountGiven) >= total ? parseFloat(amountGiven) - total : 0;

  return (
    <div className="h-screen flex flex-col bg-black text-white font-mono overflow-hidden select-none" style={{ fontFamily: "'Courier New', monospace" }}>
      {/* ── HEADER ── */}
      <div className="bg-[#001a00] border-b-2 border-[#00ff41] px-6 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-[#00ff41] font-black text-2xl tracking-widest">EMPORIO PDV</span>
          <div className="flex items-center gap-2 bg-[#00ff41]/10 border border-[#00ff41]/30 px-3 py-1 rounded">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff41] shadow-[0_0_8px_#00ff41] animate-pulse" />
            <span className="text-[#00ff41] text-sm font-bold">CAIXA {String(session.number).padStart(2, "0")}</span>
          </div>
          <span className="text-[#00ff41]/70 text-xs">Operador: {session.operator}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-2 text-xs">
            {[
              { key: "F3", label: "Cancela Item" },
              { key: "F4", label: "CPF" },
              { key: "F5", label: "Sangria" },
              { key: "F6", label: "Suprimento" },
              { key: "F7", label: "Consulta" },
              { key: "F9", label: "Fechar Cx" },
              { key: "F12", label: "Pagar" },
            ].map(s => (
              <div key={s.key} className="text-center">
                <span className="text-[10px] text-[#00ff41] font-black bg-[#00ff41]/10 border border-[#00ff41]/30 px-1.5 py-0.5 rounded">{s.key}</span>
                <div className="text-[8px] text-[#00ff41]/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <span className="text-[#00ff41] font-black text-2xl tracking-widest">{time.toLocaleTimeString("pt-BR")}</span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Cart */}
        <div className="flex-1 flex flex-col border-r-2 border-[#00ff41]/20">
          {/* Barcode Form */}
          <div className="bg-[#001a00] border-b border-[#00ff41]/20 p-4">
            <form onSubmit={handleBarcodeSubmit} className="flex gap-4">
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                placeholder="Código de barras..."
                className="flex-1 bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] text-xl font-bold px-4 py-3 rounded outline-none font-mono"
                autoFocus
              />
              <button type="submit" className="bg-[#00ff41] text-black font-black px-8 py-3 rounded text-sm tracking-widest hover:bg-[#00ff41]/90">
                INSERIR ↵
              </button>
            </form>
            {errorMessage && <p className="text-red-400 text-xs mt-2">{errorMessage}</p>}
          </div>

          {/* Cart Table */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#00ff41]/20">
                <span className="text-4xl font-black tracking-widest">CAIXA LIVRE</span>
                <span className="text-xs mt-2">Aguardando código de barras...</span>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-[#001a00] border-b border-[#00ff41]/20 sticky top-0 text-[#00ff41]/50 text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">Nº</th>
                    <th className="px-4 py-3 text-left">DESCRIÇÃO</th>
                    <th className="px-4 py-3 text-center w-28">QTD</th>
                    <th className="px-4 py-3 text-right w-32">VL UNIT</th>
                    <th className="px-4 py-3 text-right w-36">VL TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={item.id} className="border-b border-[#00ff41]/10 hover:bg-[#00ff41]/5 text-sm">
                      <td className="px-4 py-4 text-[#00ff41]/30 font-mono">{String(i + 1).padStart(3, "0")}</td>
                      <td className="px-4 py-4">
                        <div className="text-[#00ff41] font-bold uppercase">{item.name}</div>
                        <div className="text-[#00ff41]/30 text-xs font-mono">{item.barcode}</div>
                      </td>
                      <td className="px-4 py-4 text-center text-[#00ff41] font-black text-base">{item.quantity}</td>
                      <td className="px-4 py-4 text-right text-[#00ff41]/60 font-mono">R$ {fmt(item.price)}</td>
                      <td className="px-4 py-4 text-right text-[#00ff41] font-black text-lg font-mono">R$ {fmt(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT: Display LCD */}
        <div className="w-80 bg-black flex flex-col border-l-2 border-[#00ff41]/20 justify-between p-6">
          <div>
            <div className="bg-[#001200] border-2 border-[#00ff41]/30 rounded p-4 mb-4">
              <span className="text-[#00ff41]/40 text-[10px] font-bold tracking-widest block mb-1">SUBTOTAL</span>
              <div className="text-[#00ff41]/60 text-2xl font-black font-mono text-right">R$ {fmt(subtotal)}</div>
            </div>

            <div className="bg-[#001a00] border-2 border-[#00ff41] rounded p-5 mb-6 shadow-[0_0_20px_rgba(0,255,65,0.1)]">
              <span className="text-[#00ff41]/60 text-[10px] font-bold tracking-widest block mb-1">TOTAL A PAGAR</span>
              <div className="text-[#00ff41] font-black font-mono text-4xl text-right leading-none">R$ {fmt(total)}</div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-[#00ff41]/40 text-xs flex-1">DESCONTO R$</span>
              <input
                type="number"
                value={discountInput}
                onChange={e => setDiscountInput(e.target.value)}
                className="w-24 bg-black border border-[#00ff41]/30 focus:border-[#00ff41] text-[#00ff41] text-right font-mono px-2 py-1 rounded outline-none text-sm"
                min="0" step="0.01"
              />
            </div>

            {customerName && (
              <div className="bg-[#001a00] border border-[#00ff41]/40 rounded p-3 mb-4">
                <span className="text-[#00ff41]/60 text-[10px] font-bold tracking-widest block mb-1">CLIENTE IDENTIFICADO</span>
                <div className="text-[#00ff41] text-sm font-bold truncate">{customerName}</div>
                <div className="text-[#00ff41]/50 text-xs font-mono mt-0.5">CPF: {cpfInput}</div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { if (cart.length > 0) setModal("payment"); }}
              disabled={cart.length === 0}
              className="w-full bg-[#00ff41] text-black font-black py-4 rounded text-base tracking-widest hover:bg-[#00ff41]/90 transition-all disabled:opacity-20 shadow-[0_0_20px_rgba(0,255,65,0.2)]"
            >
              PAGAR [F12]
            </button>
            <button
              onClick={() => setModal("closing")}
              className="w-full border border-amber-500/40 hover:border-amber-500 text-amber-500/60 hover:text-amber-400 font-bold py-2.5 rounded text-xs tracking-widest transition-all"
            >
              FECHAR CAIXA [F9]
            </button>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {modal === "payment" && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41]/60 rounded-lg w-full max-w-lg overflow-hidden">
            <div className="bg-[#001a00] border-b border-[#00ff41]/30 px-6 py-3 flex justify-between items-center text-[#00ff41] font-black text-sm">
              <span>RECEBIMENTO</span>
              <button onClick={() => setModal("")}>X</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-[#001200] border border-[#00ff41]/30 rounded p-4 text-center">
                <span className="text-[#00ff41]/50 text-xs tracking-widest block mb-1">VALOR TOTAL</span>
                <span className="text-[#00ff41] font-black text-4xl">R$ {fmt(total)}</span>
              </div>

              {customerCredit > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/50 rounded p-4 text-center animate-pulse">
                  <span className="text-amber-500 font-black tracking-widest block text-lg mb-1">ATENÇÃO: VALE-CRÉDITO DISPONÍVEL!</span>
                  <span className="text-amber-400 text-sm block">O cliente {customerName} possui um crédito de devolução que pode ser abatido desta compra.</span>
                  <span className="text-amber-500 font-black text-2xl font-mono block mt-2">R$ {fmt(customerCredit)}</span>
                  <button 
                    onClick={() => {
                      setDiscountInput(Math.min(customerCredit, total).toString());
                      setCustomerCredit(prev => Math.max(0, prev - total));
                    }} 
                    className="mt-3 bg-amber-500 text-black font-black px-4 py-2 rounded text-xs hover:bg-amber-400 w-full uppercase"
                  >
                    Usar Crédito como Desconto
                  </button>
                </div>
              )}

              <div>
                <span className="text-[#00ff41]/50 text-xs font-bold block mb-2">FORMA DE PAGAMENTO</span>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setPaymentMethod(key)}
                      className={`py-3 rounded border-2 text-xs font-bold ${
                        paymentMethod === key ? "border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]" : "border-[#00ff41]/20 text-[#00ff41]/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === "MONEY" && (
                <div>
                  <span className="text-[#00ff41]/50 text-xs font-bold block mb-2">VALOR RECEBIDO</span>
                  <input
                    type="number"
                    value={amountGiven}
                    onChange={e => setAmountGiven(e.target.value)}
                    className="w-full bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] font-black text-2xl text-right px-4 py-2 rounded outline-none"
                    placeholder="0,00"
                    autoFocus
                    step="0.01"
                  />
                  {parseFloat(amountGiven) >= total && (
                    <>
                      <div className="mt-2 bg-emerald-500/10 border border-emerald-500/30 rounded p-3 flex justify-between items-center text-emerald-400 font-bold">
                        <span>TROCO</span>
                        <span className="text-2xl">R$ {fmt(troco)}</span>
                      </div>
                      <ChangeVisual amount={troco} />
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setModal("")} className="flex-1 border border-[#00ff41]/30 text-[#00ff41]/50 py-3 rounded text-sm font-bold">
                  VOLTAR
                </button>
                <button onClick={handleFinalizeSale} className="flex-1 bg-[#00ff41] text-black font-black py-3 rounded text-sm tracking-widest">
                  FINALIZAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "success" && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41] rounded-lg w-full max-w-md p-8 text-center space-y-6 shadow-[0_0_40px_rgba(0,255,65,0.2)]">
            <span className="text-[#00ff41] text-2xl font-black block">CUPOM EMITIDO!</span>
            <span className="text-[#00ff41]/50 text-xs block font-mono">COD: {lastSaleId}</span>
            <div className="bg-[#001a00] border border-[#00ff41]/30 rounded p-3 flex items-center gap-3 justify-center">
              <span className="w-3 h-3 rounded-full bg-[#00ff41] shadow-[0_0_10px_#00ff41] animate-pulse" />
              <span className="text-[#00ff41]/80 text-xs font-bold tracking-widest">CUPOM ENVIADO PARA IMPRESSORA</span>
            </div>
            {paymentMethod === "MONEY" && troco > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-4 text-center">
                <span className="text-emerald-400/60 text-xs tracking-widest block">TROCO A DEVOLVER</span>
                <span className="text-emerald-400 font-black text-3xl font-mono block mt-1">R$ {fmt(troco)}</span>
                <ChangeVisual amount={troco} />
              </div>
            )}
            <button onClick={() => { setModal(""); clearSale(); }} className="w-full bg-[#00ff41] text-black font-black py-3 rounded text-sm">
              NOVA VENDA ↵
            </button>
          </div>
        </div>
      )}

      {modal === "closing" && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41]/60 rounded-lg w-full max-w-2xl overflow-hidden">
            <div className="bg-[#001a00] border-b border-[#00ff41]/30 px-6 py-3 flex justify-between items-center text-[#00ff41] font-black text-sm">
              <span>FECHAMENTO DE CAIXA</span>
              <button onClick={() => setModal("")}>X</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#001200] border border-[#00ff41]/20 rounded p-4">
                  <span className="text-[#00ff41]/40 text-[10px] block">SALDO INICIAL</span>
                  <div className="text-[#00ff41] font-black text-xl">R$ {fmt(session.initialBalance)}</div>
                </div>
                <div className="bg-[#001200] border border-[#00ff41]/20 rounded p-4">
                  <span className="text-[#00ff41]/40 text-[10px] block">TOTAL DE VENDAS</span>
                  <div className="text-[#00ff41] font-black text-xl">R$ {fmt(totalSales)}</div>
                </div>
                <div className="bg-[#1a0000] border border-red-500/20 rounded p-4">
                  <span className="text-red-450/40 text-[10px] block">SANGRIAS</span>
                  <div className="text-red-400 font-black text-xl">- R$ {fmt(totalWithdrawals)}</div>
                </div>
                <div className="bg-[#001a00] border border-[#00ff41]/20 rounded p-4">
                  <span className="text-[#00ff41]/40 text-[10px] block">SUPRIMENTOS</span>
                  <div className="text-[#00ff41] font-black text-xl">+ R$ {fmt(totalSupplements)}</div>
                </div>
              </div>

              <div>
                <span className="text-[#00ff41]/40 text-[10px] block mb-2">ESPERADO NO CAIXA (DINHEIRO): <strong className="text-[#00ff41]">R$ {fmt(expectedCash)}</strong></span>
                <input
                  type="number"
                  value={closingCounted}
                  onChange={e => setClosingCounted(e.target.value)}
                  placeholder="Valor contato em dinheiro"
                  className="w-full bg-black border-2 border-[#00ff41]/30 focus:border-[#00ff41] text-[#00ff41] font-mono text-lg text-right px-3 py-2 rounded outline-none"
                  step="0.01"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setModal("")} className="flex-1 border border-[#00ff41]/30 text-[#00ff41]/50 py-3 rounded text-xs font-bold">
                  CANCELAR
                </button>
                <button onClick={() => { alert("Sessão fechada com sucesso!"); setSession(null); setModal(""); }} className="flex-1 bg-amber-500 text-black font-black py-3 rounded text-xs">
                  CONFIRMAR FECHAMENTO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "withdrawal" && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41]/60 rounded-lg w-full max-w-md overflow-hidden">
            <div className="bg-[#001a00] border-b border-[#00ff41]/30 px-6 py-3 flex justify-between items-center text-[#00ff41] font-black text-sm">
              <span>{withdrawalType === "withdrawal" ? "SANGRIA" : "SUPRIMENTO"}</span>
              <button onClick={() => setModal("")}>X</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[#00ff41]/40 text-xs block mb-1">VALOR (R$)</span>
                <input
                  type="number"
                  value={withdrawalAmount}
                  onChange={e => setWithdrawalAmount(e.target.value)}
                  autoFocus
                  className="w-full bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] font-black text-2xl text-right px-4 py-2 rounded outline-none"
                  placeholder="0,00"
                  step="0.01"
                />
              </div>
              <div>
                <span className="text-[#00ff41]/40 text-xs block mb-1">MOTIVO</span>
                <input
                  type="text"
                  value={withdrawalReason}
                  onChange={e => setWithdrawalReason(e.target.value)}
                  className="w-full bg-black border border-[#00ff41]/30 focus:border-[#00ff41]/60 text-[#00ff41] px-4 py-2 rounded outline-none text-sm"
                  placeholder="Motivo do lançamento..."
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModal("")} className="flex-1 border border-[#00ff41]/30 text-[#00ff41]/50 py-3 rounded text-xs font-bold">
                  CANCELAR
                </button>
                <button onClick={handleWithdrawal} className="flex-1 bg-[#00ff41] text-black font-black py-3 rounded text-xs">
                  CONFIRMAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "pricecheck" && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41]/60 rounded-lg w-full max-w-lg overflow-hidden">
            <div className="bg-[#001a00] border-b border-[#00ff41]/30 px-6 py-3 flex justify-between items-center text-[#00ff41] font-black text-sm">
              <span>CONSULTA DE PREÇO</span>
              <button onClick={() => setModal("")}>X</button>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={handlePriceCheck} className="flex gap-2">
                <input
                  type="text"
                  value={priceCheckQuery}
                  onChange={e => setPriceCheckQuery(e.target.value)}
                  autoFocus
                  placeholder="Código de barras..."
                  className="flex-1 bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] px-4 py-2 rounded outline-none text-sm"
                />
                <button type="submit" className="bg-[#00ff41] text-black font-black px-6 py-2 rounded text-xs">
                  BUSCAR
                </button>
              </form>
              {priceCheckResult && (
                <div className="border border-[#00ff41]/30 rounded p-6 text-center bg-[#001200]">
                  <span className="text-[#00ff41]/50 text-xs block mb-1">PRODUTO</span>
                  <div className="text-[#00ff41] font-bold text-lg uppercase mb-3">{priceCheckResult.name}</div>
                  <span className="text-[#00ff41]/40 text-xs block">PREÇO</span>
                  <div className="text-[#00ff41] font-black text-4xl">R$ {fmt(priceCheckResult.price)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modal === "cpf" && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41]/60 rounded-lg w-full max-w-md overflow-hidden">
            <div className="bg-[#001a00] border-b border-[#00ff41]/30 px-6 py-3 flex justify-between items-center text-[#00ff41] font-black text-sm">
              <span>CPF/CNPJ NA NOTA</span>
              <button onClick={() => setModal("")}>X</button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <input
                type="text"
                value={cpfInput}
                onChange={e => setCpfInput(e.target.value)}
                autoFocus
                placeholder="000.000.000-00"
                className="w-full bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] text-center text-3xl font-black py-4 rounded outline-none tracking-wider font-mono"
              />
              <button 
                onClick={() => {
                  // Mock fetching customer data based on CPF
                  if (cpfInput.length > 5) {
                    setCustomerName("Cliente Identificado (Mock)");
                    // Simulando que o cliente sempre tem um crédito de R$ 15,50 caso digite CPF longo
                    setCustomerCredit(15.50);
                  }
                  setModal("");
                }} 
                className="w-full bg-[#00ff41] text-black font-black py-3 rounded text-sm"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
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

export default App;
