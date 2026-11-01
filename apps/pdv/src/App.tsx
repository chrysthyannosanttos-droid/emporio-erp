import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import { TerminalActivation } from './components/TerminalActivation';
import type { PdvTerminalConfig } from './types/terminal';
import { parseScaleBarcode, CheckoutScaleReader } from './services/ScaleParser';
import { OfflineStorage } from './services/OfflineStorage';
import type { OfflineSale, CashShift } from './services/OfflineStorage';
import { SyncService } from './services/SyncService';
import type { SyncStatus } from './services/SyncService';
import { TefService } from './services/TefService';
import type { TefStep } from './services/TefService';

// ─── Helpers de Formatação e Impressão Térmica ───────────────────
function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PAYMENT_LABELS: Record<string, string> = {
  MONEY: 'Dinheiro',
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão Crédito',
  DEBIT_CARD: 'Cartão Débito',
  VOUCHER: 'Voucher',
  TEF: 'Cartão TEF (PinPad)',
};

function buildReceiptHeader(storeName: string, cnpj: string, address: string) {
  return `
  <div class="center">
    <div class="store">${storeName}</div>
    <div>CNPJ: ${cnpj}</div>
    <div>${address}</div>
  </div>
  <div class="sep"></div>`;
}

function buildReceiptHTML(data: {
  storeName: string;
  cnpj: string;
  address: string;
  operator: string;
  cashier: number;
  saleId: string;
  items: { name: string; qty: number; unit: string; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
  payments: { method: string; amount: number }[];
  amountGiven: number;
  change: number;
  cpf: string;
  date: Date;
}) {
  const dt = data.date;
  const dateStr = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`;

  const itemRows = data.items
    .map(i => {
      const nameCol = i.name.length > 22 ? i.name.substring(0, 22) : i.name;
      const qtyStr = i.unit === 'KG' ? `${i.qty.toFixed(3)}kg` : `${i.qty}un`;
      return `<tr><td style="text-align:left">${nameCol}</td><td style="text-align:center">${qtyStr}</td><td style="text-align:right">${fmt(i.price)}</td><td style="text-align:right">${fmt(i.qty * i.price)}</td></tr>`;
    })
    .join('');

  const paymentRows = data.payments
    .map(p => `<tr><td>${PAYMENT_LABELS[p.method] || p.method}</td><td style="text-align:right">R$ ${fmt(p.amount)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Cupom de Venda</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 4mm; color: #000; background: #fff; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .sep { border-top: 1px dashed #000; margin: 6px 0; }
  .store { font-size: 15px; font-weight: 900; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 2px 0; font-size: 11px; }
  th { border-bottom: 1px solid #000; }
  .total-row td { font-size: 14px; font-weight: 900; padding-top: 4px; }
  .footer { font-size: 9px; margin-top: 10px; }
</style>
</head><body>
  ${buildReceiptHeader(data.storeName, data.cnpj, data.address)}
  <div class="center bold">CUPOM NÃO FISCAL</div>
  <div>Data: ${dateStr} ${timeStr}</div>
  <div>Caixa: ${String(data.cashier).padStart(2, '0')} | Op: ${data.operator}</div>
  <div>Venda: #${data.saleId}</div>
  <div class="sep"></div>
  <table>
    <thead><tr><th style="text-align:left">DESCRIÇÃO</th><th>QTD</th><th style="text-align:right">UNIT</th><th style="text-align:right">TOTAL</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="sep"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">R$ ${fmt(data.subtotal)}</td></tr>
    ${data.discount > 0 ? `<tr><td>Desconto</td><td style="text-align:right">-R$ ${fmt(data.discount)}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">R$ ${fmt(data.total)}</td></tr>
  </table>
  <div class="sep"></div>
  <div class="bold" style="margin-bottom:3px">PAGAMENTO:</div>
  <table>${paymentRows}</table>
  ${data.change > 0 ? `<div class="bold" style="margin-top:4px">Troco: R$ ${fmt(data.change)}</div>` : ''}
  ${data.cpf ? `<div class="sep"></div><div>CPF na Nota: ${data.cpf}</div>` : ''}
  <div class="sep"></div>
  <div class="center footer">
    <div>Obrigado pela preferência! Volte sempre!</div>
    <div style="margin-top:4px">Cybertech RP • PDV Híbrido</div>
  </div>
  <div style="height:15mm"></div>
</body></html>`;
}

function buildShiftReceiptHTML(data: {
  storeName: string;
  cnpj: string;
  address: string;
  title: string;
  cashier: number;
  operator: string;
  date: Date;
  lines: { label: string; value: string; isBold?: boolean }[];
}) {
  const dt = data.date;
  const dateStr = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

  const rowHtml = data.lines
    .map(
      l =>
        `<tr><td style="padding:2px 0;${l.isBold ? 'font-weight:bold' : ''}">${l.label}</td><td style="text-align:right;padding:2px 0;${l.isBold ? 'font-weight:bold' : ''}">${l.value}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${data.title}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 4mm; color: #000; background: #fff; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .sep { border-top: 1px dashed #000; margin: 6px 0; }
  .store { font-size: 15px; font-weight: 900; }
  table { width: 100%; border-collapse: collapse; }
</style>
</head><body>
  ${buildReceiptHeader(data.storeName, data.cnpj, data.address)}
  <div class="center bold" style="font-size:13px">${data.title}</div>
  <div class="center" style="font-size:10px">${dateStr}</div>
  <div class="sep"></div>
  <div>Caixa: ${String(data.cashier).padStart(2, '0')} | Operador: ${data.operator}</div>
  <div class="sep"></div>
  <table>${rowHtml}</table>
  <div class="sep"></div>
  <div class="center" style="font-size:10px; margin-top:15px">
    <div>_________________________________</div>
    <div>Assinatura do Operador</div>
  </div>
  <div style="height:15mm"></div>
</body></html>`;
}

// ─── Interfaces ──────────────────────────────────────────────────
interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  barcode: string;
}

interface CurrencyPiece {
  value: number;
  label: string;
  type: 'note' | 'coin';
  color: string;
  bg: string;
  border: string;
  symbol: string;
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
  let remaining = Math.round(changeAmount * 100);
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
                style={{ background: piece.bg, borderColor: piece.border, color: piece.color }}
                className="border-2 rounded-lg px-3 py-2 flex flex-col items-center justify-center min-w-[70px] relative"
              >
                <span className="text-lg leading-none">{piece.symbol}</span>
                <span className="text-xs font-black mt-0.5">{piece.label}</span>
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

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

// ─── Componente Principal PDV ──────────────────────────────────
export default function App() {
  const [terminalConfig, setTerminalConfig] = useState<PdvTerminalConfig | null>(() => {
    try {
      const saved = localStorage.getItem('emporio_pdv_terminal');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Turno de Caixa Ativo
  const [currentShift, setCurrentShift] = useState<CashShift | null>(() => OfflineStorage.getCurrentShift());
  const [openShiftInitialBalance, setOpenShiftInitialBalance] = useState('200.00');

  // Operadores disponíveis
  const cashiersMock = [
    { number: 1, operator: 'Maria Silva' },
    { number: 2, operator: 'João Santos' },
    { number: 3, operator: 'Ana Costa' },
    { number: 4, operator: 'Carlos Lima' },
  ];
  const [selectedCashier, setSelectedCashier] = useState<number>(terminalConfig?.cashierNumber || 1);
  const [selectedOperator, setSelectedOperator] = useState<string>('Maria Silva');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Carrinho e Venda Atual
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [discountInput, setDiscountInput] = useState('0');
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);

  // Modais
  const [modal, setModal] = useState<
    | ''
    | 'open_shift'
    | 'payment'
    | 'success'
    | 'closing'
    | 'withdrawal'
    | 'pricecheck'
    | 'scale_reader'
    | 'tef_modal'
    | 'cpf'
  >('');

  // Pagamentos (Múltiplas Formas)
  const [activePaymentMethod, setActivePaymentMethod] = useState<'MONEY' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'VOUCHER'>('MONEY');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [appliedPayments, setAppliedPayments] = useState<{ method: string; amount: number }[]>([]);
  const [lastSaleId, setLastSaleId] = useState('');

  // TEF State
  const [_tefStep, setTefStep] = useState<TefStep>('IDLE');
  const [tefMessage, setTefMessage] = useState('');

  // Balança de Checkout direta
  const scaleReaderRef = useRef<CheckoutScaleReader>(new CheckoutScaleReader());
  const [scaleWeight, setScaleWeight] = useState<number>(0);
  const [scaleReading, setScaleReading] = useState(false);
  const [weighedProductName, setWeighedProductName] = useState('');
  const [weighedProductPrice, setWeighedProductPrice] = useState(0);

  // Sangria / Suprimento
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [withdrawalType, setWithdrawalType] = useState<'WITHDRAWAL' | 'SUPPLEMENT'>('WITHDRAWAL');

  // Fechamento de Caixa
  const [closingCashCounted, setClosingCashCounted] = useState('');
  const [closingCardsCounted, setClosingCardsCounted] = useState('');
  const [closingPixCounted, setClosingPixCounted] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Consulta de Preço
  const [priceCheckQuery, setPriceCheckQuery] = useState('');
  const [priceCheckResult, setPriceCheckResult] = useState<any>(null);

  // Cliente / CPF
  const [cpfInput, setCpfInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sincronização e Status da Rede
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingSalesCount: 0,
    lastSyncedAt: null,
    lastError: null,
  });
  const syncServiceRef = useRef<SyncService | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const receiptFrameRef = useRef<HTMLIFrameElement>(null);
  const time = useClock();

  // Inicializa o SyncService
  useEffect(() => {
    const s = new SyncService(terminalConfig);
    syncServiceRef.current = s;
    const unsub = s.subscribe(st => setSyncStatus({ ...st }));
    s.startAutoSync(20);

    return () => {
      unsub();
      s.stopAutoSync();
    };
  }, [terminalConfig]);

  // Função genérica de impressão térmica no iframe invisível
  const triggerPrint = useCallback((html: string) => {
    const iframe = receiptFrameRef.current;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
        }, 250);
      }
    }
  }, []);

  // Foco contínuo no input do leitor de código de barras
  useEffect(() => {
    if (!currentShift) return;
    const interval = setInterval(() => {
      if (modal !== '') return;
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        inputRef.current?.focus();
      }
    }, 800);
    return () => clearInterval(interval);
  }, [modal, currentShift]);

  // Atalhos de Teclado Globais (F1 a F12)
  useEffect(() => {
    if (!currentShift) return;
    const handler = (e: KeyboardEvent) => {
      if (modal !== '') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setModal('');
        }
        return;
      }
      if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0) openPaymentModal();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        openScaleModal();
      }
      if (e.key === 'F3') {
        e.preventDefault();
        if (cart.length > 0 && confirm('Cancelar último item lançado?')) {
          setCart(prev => prev.slice(0, -1));
        }
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setModal('cpf');
      }
      if (e.key === 'F5') {
        e.preventDefault();
        setWithdrawalType('WITHDRAWAL');
        setWithdrawalAmount('');
        setWithdrawalReason('');
        setModal('withdrawal');
      }
      if (e.key === 'F6') {
        e.preventDefault();
        setWithdrawalType('SUPPLEMENT');
        setWithdrawalAmount('');
        setWithdrawalReason('');
        setModal('withdrawal');
      }
      if (e.key === 'F7') {
        e.preventDefault();
        setPriceCheckQuery('');
        setPriceCheckResult(null);
        setModal('pricecheck');
      }
      if (e.key === 'F8') {
        e.preventDefault();
        syncServiceRef.current?.syncNow();
      }
      if (e.key === 'F9') {
        e.preventDefault();
        setModal('closing');
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (cart.length > 0 && confirm('Deseja cancelar o cupom atual e limpar os itens?')) {
          clearSale();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modal, cart, currentShift]);

  // Totais calculados
  useEffect(() => {
    const sub = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const disc = parseFloat(discountInput) || 0;
    setSubtotal(sub);
    setTotal(Math.max(0, sub - disc));
  }, [cart, discountInput]);

  const clearSale = useCallback(() => {
    setCart([]);
    setDiscountInput('0');
    setBarcodeInput('');
    setErrorMessage('');
    setAppliedPayments([]);
    setPaymentAmountInput('');
    setCpfInput('');
    setCustomerName('');
  }, []);

  // ─── Desvincular Terminal ───────────────────────────────────────
  const handleUnpairTerminal = () => {
    if (confirm('Deseja realmente desvincular este PDV da loja? O terminal voltará à tela de pareamento.')) {
      localStorage.removeItem('emporio_pdv_terminal');
      setTerminalConfig(null);
      setCurrentShift(null);
    }
  };

  // ─── LOGIN & ABERTURA DE TURNO ──────────────────────────────────
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setLoginError('Digite o PIN de 4 dígitos do operador.');
      return;
    }
    setLoginError('');
    setModal('open_shift');
  };

  const handleConfirmOpenShift = () => {
    const initial = parseFloat(openShiftInitialBalance) || 0;
    const shift = OfflineStorage.openShift(
      selectedCashier,
      `op_${Date.now()}`,
      selectedOperator,
      initial
    );
    setCurrentShift(shift);
    setModal('');

    // Imprime comprovante térmico de abertura
    const receiptHtml = buildShiftReceiptHTML({
      storeName: terminalConfig?.store?.tradeName || terminalConfig?.store?.name || 'EMPORIO',
      cnpj: terminalConfig?.company?.document || '00.000.000/0001-00',
      address: `${terminalConfig?.store?.city || 'Centro'} - ${terminalConfig?.store?.state || 'UF'}`,
      title: 'ABERTURA DE CAIXA',
      cashier: selectedCashier,
      operator: selectedOperator,
      date: new Date(),
      lines: [
        { label: 'STATUS', value: 'CAIXA ABERTO', isBold: true },
        { label: 'FUNDO DE TROCO INICIAL', value: `R$ ${fmt(initial)}`, isBold: true },
        { label: 'TERMINAL', value: terminalConfig?.code || 'PDV-01' },
      ],
    });
    triggerPrint(receiptHtml);

    // Sincroniza abertura com o servidor se online
    syncServiceRef.current?.syncNow();
  };

  // ─── SANGRIA E SUPRIMENTO ───────────────────────────────────────
  const handleConfirmMovement = () => {
    const amt = parseFloat(withdrawalAmount);
    if (!amt || amt <= 0) return;

    const shift = OfflineStorage.addMovementToShift(
      withdrawalType,
      amt,
      withdrawalReason || (withdrawalType === 'WITHDRAWAL' ? 'Sangria de Caixa' : 'Suprimento de Troco'),
      currentShift?.operatorName || 'Operador'
    );
    if (shift) setCurrentShift({ ...shift });

    // Imprime comprovante de sangria / suprimento
    const receiptHtml = buildShiftReceiptHTML({
      storeName: terminalConfig?.store?.tradeName || terminalConfig?.store?.name || 'EMPORIO',
      cnpj: terminalConfig?.company?.document || '00.000.000/0001-00',
      address: `${terminalConfig?.store?.city || 'Centro'} - ${terminalConfig?.store?.state || 'UF'}`,
      title: withdrawalType === 'WITHDRAWAL' ? 'COMPROVANTE DE SANGRIA' : 'COMPROVANTE DE SUPRIMENTO',
      cashier: currentShift?.cashierNumber || 1,
      operator: currentShift?.operatorName || 'Operador',
      date: new Date(),
      lines: [
        { label: 'TIPO DE OPERAÇÃO', value: withdrawalType === 'WITHDRAWAL' ? 'SANGRIA (RETIRADA)' : 'SUPRIMENTO (REFORÇO)', isBold: true },
        { label: 'VALOR DA OPERAÇÃO', value: `R$ ${fmt(amt)}`, isBold: true },
        { label: 'MOTIVO / JUSTIFICATIVA', value: withdrawalReason || 'Sem observações' },
      ],
    });
    triggerPrint(receiptHtml);

    setWithdrawalAmount('');
    setWithdrawalReason('');
    setModal('');
    syncServiceRef.current?.syncNow();
  };

  // ─── FECHAMENTO DE CAIXA ────────────────────────────────────────
  const handleConfirmCloseShift = () => {
    const cashCounted = parseFloat(closingCashCounted) || 0;
    const cardsCounted = parseFloat(closingCardsCounted) || 0;
    const pixCounted = parseFloat(closingPixCounted) || 0;
    const totalCounted = cashCounted + cardsCounted + pixCounted;

    // Calcula saldo esperado de dinheiro
    const initial = currentShift?.initialBalance || 0;
    const pendingSales = OfflineStorage.getPendingSales();
    const moneySales = pendingSales
      .flatMap(s => s.payments)
      .filter(p => p.method === 'MONEY')
      .reduce((a, b) => a + b.amount, 0);

    const withdrawals = (currentShift?.movements || [])
      .filter(m => m.type === 'WITHDRAWAL')
      .reduce((a, b) => a + b.amount, 0);

    const supplements = (currentShift?.movements || [])
      .filter(m => m.type === 'SUPPLEMENT')
      .reduce((a, b) => a + b.amount, 0);

    const expectedCash = initial + moneySales + supplements - withdrawals;
    const diff = +(cashCounted - expectedCash).toFixed(2);

    OfflineStorage.closeShift(
      {
        money: cashCounted,
        creditCard: cardsCounted,
        debitCard: 0,
        pix: pixCounted,
        voucher: 0,
        total: totalCounted,
      },
      expectedCash,
      closingNotes
    );

    // Imprime Redução Z / Fechamento
    const receiptHtml = buildShiftReceiptHTML({
      storeName: terminalConfig?.store?.tradeName || terminalConfig?.store?.name || 'EMPORIO',
      cnpj: terminalConfig?.company?.document || '00.000.000/0001-00',
      address: `${terminalConfig?.store?.city || 'Centro'} - ${terminalConfig?.store?.state || 'UF'}`,
      title: 'FECHAMENTO DE CAIXA (REDUÇÃO Z)',
      cashier: currentShift?.cashierNumber || 1,
      operator: currentShift?.operatorName || 'Operador',
      date: new Date(),
      lines: [
        { label: 'FUNDO DE TROCO INICIAL', value: `R$ ${fmt(initial)}` },
        { label: 'TOTAL VENDAS DINHEIRO', value: `R$ ${fmt(moneySales)}` },
        { label: 'SUPRIMENTOS (+)', value: `R$ ${fmt(supplements)}` },
        { label: 'SANGRIAS (-)', value: `R$ ${fmt(withdrawals)}` },
        { label: 'VALOR ESPERADO (DINHEIRO)', value: `R$ ${fmt(expectedCash)}`, isBold: true },
        { label: 'VALOR INFORMADO (DINHEIRO)', value: `R$ ${fmt(cashCounted)}`, isBold: true },
        {
          label: diff >= 0 ? 'SOBRA DE CAIXA (+)' : 'FALTA DE CAIXA (-)',
          value: `R$ ${fmt(Math.abs(diff))}`,
          isBold: true,
        },
        { label: 'CARTÕES INFORMADOS', value: `R$ ${fmt(cardsCounted)}` },
        { label: 'PIX INFORMADO', value: `R$ ${fmt(pixCounted)}` },
        { label: 'TOTAL GERAL APURADO', value: `R$ ${fmt(totalCounted)}`, isBold: true },
      ],
    });
    triggerPrint(receiptHtml);

    alert(`Caixa fechado com sucesso!\n${diff >= 0 ? `Sobra: R$ ${fmt(diff)}` : `Falta: R$ ${fmt(Math.abs(diff))}`}`);
    setCurrentShift(null);
    setModal('');
    setPin('');
    syncServiceRef.current?.syncNow();
  };

  // ─── MOTOR DE BALANÇA E CÓDIGO DE BARRAS ───────────────────────
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const query = barcodeInput.trim();
    if (!query) return;

    // 1. Checa se é etiqueta de balança nacional (prefixo 2)
    const scaleCheck = parseScaleBarcode(query);
    if (scaleCheck.isScaleBarcode) {
      // Procura produto correspondente no banco local pelo código PLU
      const localProd = OfflineStorage.findProductByBarcodeOrCode(scaleCheck.productCode);
      const name = localProd ? localProd.name : `Item Pesável #${scaleCheck.productCode}`;
      const pricePerKg = localProd ? localProd.price : 29.90;

      let qty = 1;
      let finalPrice = pricePerKg;

      if (scaleCheck.weight) {
        qty = scaleCheck.weight;
        finalPrice = pricePerKg;
      } else if (scaleCheck.totalPrice) {
        qty = +(scaleCheck.totalPrice / pricePerKg).toFixed(3);
        finalPrice = pricePerKg;
      }

      setCart(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          productId: localProd?.id || scaleCheck.productCode,
          name,
          price: finalPrice,
          quantity: qty,
          unit: 'KG',
          barcode: query,
        },
      ]);
      setBarcodeInput('');
      return;
    }

    // 2. Procura no catálogo offline local
    const local = OfflineStorage.findProductByBarcodeOrCode(query);
    if (local) {
      setCart(prev => {
        const exist = prev.find(p => p.productId === local.id);
        if (exist && local.unit !== 'KG') {
          return prev.map(p => (p.productId === local.id ? { ...p, quantity: p.quantity + 1 } : p));
        }
        return [
          ...prev,
          {
            id: Math.random().toString(),
            productId: local.id,
            name: local.name,
            price: local.price,
            quantity: 1,
            unit: local.unit || 'UN',
            barcode: local.barcode || query,
          },
        ];
      });
      setBarcodeInput('');
      return;
    }

    // 3. Fallback online (OpenFoodFacts) ou item avulso
    let name = `Produto ${query}`;
    let price = 5.99;
    if (/^\d{8,14}$/.test(query) && navigator.onLine) {
      try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${query}.json`);
        const data = await res.json();
        if (data.status === 1 && data.product) {
          name = data.product.product_name || data.product.product_name_pt || name;
        }
      } catch {}
    }

    setCart(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        productId: query,
        name,
        price,
        quantity: 1,
        unit: 'UN',
        barcode: query,
      },
    ]);
    setBarcodeInput('');
  };

  // ─── LEITURA DE BALANÇA CHECKOUT DIRETA ─────────────────────────
  const openScaleModal = () => {
    setWeighedProductName('Produto Pesável');
    setWeighedProductPrice(19.90);
    handleReadScaleWeight();
    setModal('scale_reader');
  };

  const handleReadScaleWeight = async () => {
    setScaleReading(true);
    try {
      const weight = await scaleReaderRef.current.readWeight('TOLEDO');
      setScaleWeight(weight > 0 ? weight : 0.85);
    } catch {
      setScaleWeight(0.75);
    } finally {
      setScaleReading(false);
    }
  };

  const handleConfirmWeighedItem = () => {
    if (scaleWeight <= 0) return;
    setCart(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        productId: `weighed_${Date.now()}`,
        name: weighedProductName,
        price: weighedProductPrice,
        quantity: scaleWeight,
        unit: 'KG',
        barcode: 'BALANCA-CHECKOUT',
      },
    ]);
    setModal('');
  };

  // ─── MÚLTIPLOS PAGAMENTOS E TEF ─────────────────────────────────
  const openPaymentModal = () => {
    const paidSoFar = appliedPayments.reduce((a, b) => a + b.amount, 0);
    const remaining = Math.max(0, +(total - paidSoFar).toFixed(2));
    setPaymentAmountInput(remaining.toString());
    setModal('payment');
  };

  const handleAddPayment = () => {
    const amt = parseFloat(paymentAmountInput);
    if (!amt || amt <= 0) return;

    const paidSoFar = appliedPayments.reduce((a, b) => a + b.amount, 0);
    const remaining = +(total - paidSoFar).toFixed(2);

    // Se for Cartão e usuário escolher TEF
    if ((activePaymentMethod === 'CREDIT_CARD' || activePaymentMethod === 'DEBIT_CARD') && amt > 0) {
      triggerTefTransaction(amt, activePaymentMethod === 'CREDIT_CARD' ? 'CREDIT' : 'DEBIT');
      return;
    }

    setAppliedPayments(prev => [...prev, { method: activePaymentMethod, amount: amt }]);
    const newRemaining = Math.max(0, +(remaining - amt).toFixed(2));
    setPaymentAmountInput(newRemaining.toString());
  };

  const triggerTefTransaction = async (amount: number, type: 'CREDIT' | 'DEBIT') => {
    setModal('tef_modal');
    setTefStep('INITIALIZING');
    setTefMessage('Conectando ao PinPad...');

    const res = await TefService.processPayment(amount, type, (step, msg) => {
      setTefStep(step);
      setTefMessage(msg);
    });

    if (res.success) {
      setAppliedPayments(prev => [...prev, { method: 'TEF', amount }]);
      setTimeout(() => {
        setModal('payment');
        const paidSoFar = appliedPayments.reduce((a, b) => a + b.amount, 0) + amount;
        const remaining = Math.max(0, +(total - paidSoFar).toFixed(2));
        setPaymentAmountInput(remaining.toString());
      }, 1200);
    }
  };

  // Finalizar a venda
  const handleFinalizeSale = () => {
    if (cart.length === 0) return;
    const paidSoFar = appliedPayments.reduce((a, b) => a + b.amount, 0);
    if (paidSoFar < total) {
      alert(`Valor insuficiente! Falta receber R$ ${fmt(total - paidSoFar)}`);
      return;
    }

    const saleId = Math.random().toString(36).substr(2, 9).toUpperCase();
    const disc = parseFloat(discountInput) || 0;
    const moneyPayment = appliedPayments.find(p => p.method === 'MONEY')?.amount || 0;
    const change = moneyPayment > total ? +(moneyPayment - total).toFixed(2) : 0;

    const offlineSale: OfflineSale = {
      localId: `sale_${Date.now()}_${saleId}`,
      saleNumber: saleId,
      cashierNumber: currentShift?.cashierNumber || 1,
      operator: currentShift?.operatorName || 'Operador',
      shiftId: currentShift?.id || 'default_shift',
      subtotal,
      discount: disc,
      total,
      amountGiven: paidSoFar,
      change,
      cpf: cpfInput || undefined,
      items: cart.map(it => ({
        id: it.id,
        productId: it.productId,
        name: it.name,
        barcode: it.barcode,
        quantity: it.quantity,
        unitPrice: it.price,
        total: +(it.price * it.quantity).toFixed(2),
        unit: it.unit,
      })),
      payments: appliedPayments.map(p => ({
        method: p.method as any,
        amount: p.amount,
      })),
      createdAt: new Date().toISOString(),
      synced: false,
    };

    // 1. Salva no banco local (Offline-First)
    OfflineStorage.saveSale(offlineSale);

    // 2. Imprime o cupom de venda
    const receiptHtml = buildReceiptHTML({
      storeName: terminalConfig?.store?.tradeName || terminalConfig?.store?.name || 'EMPORIO',
      cnpj: terminalConfig?.company?.document || '00.000.000/0001-00',
      address: `${terminalConfig?.store?.city || 'Centro'} - ${terminalConfig?.store?.state || 'UF'}`,
      operator: currentShift?.operatorName || 'Operador',
      cashier: currentShift?.cashierNumber || 1,
      saleId,
      items: cart.map(i => ({ name: i.name, qty: i.quantity, unit: i.unit, price: i.price })),
      subtotal,
      discount: disc,
      total,
      payments: appliedPayments,
      amountGiven: paidSoFar,
      change,
      cpf: cpfInput,
      date: new Date(),
    });
    triggerPrint(receiptHtml);

    // 3. Dispara sincronização em nuvem
    syncServiceRef.current?.syncNow();

    setLastSaleId(saleId);
    setModal('success');
  };

  // ─── CONSULTA DE PREÇO (F7) ────────────────────────────────────
  const handlePriceCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceCheckQuery.trim()) return;
    const local = OfflineStorage.findProductByBarcodeOrCode(priceCheckQuery.trim());
    if (local) {
      setPriceCheckResult({ name: local.name, price: local.price, unit: local.unit });
      return;
    }
    setPriceCheckResult({ name: 'Produto não cadastrado localmente', price: 0, unit: 'UN' });
  };

  // Se o terminal não estiver pareado com a nuvem
  if (!terminalConfig || !terminalConfig.paired) {
    return (
      <TerminalActivation
        onActivated={cfg => {
          setTerminalConfig(cfg);
          if (cfg.cashierNumber) setSelectedCashier(cfg.cashierNumber);
        }}
      />
    );
  }

  // Se não houver turno aberto pelo operador
  if (!currentShift) {
    return (
      <div
        className="h-screen flex flex-col bg-black text-white font-mono justify-center items-center p-8 select-none"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <div className="text-xs uppercase text-[#00ff41]/80 font-bold tracking-widest mb-1">
              🏢 {terminalConfig.company?.name || 'EMPRESA'} — 🏬 {terminalConfig.store?.name || 'LOJA MATRIZ'} ({terminalConfig.store?.code || 'LJ01'})
            </div>
            <h1 className="text-[#00ff41] text-4xl font-black tracking-widest mb-1">
              {terminalConfig.terminalName || `CAIXA ${String(selectedCashier).padStart(2, '0')}`}
            </h1>
            <p className="text-[#00ff41]/60 text-xs">
              TERMINAL: <strong className="text-white">{terminalConfig.code}</strong> • PDV HÍBRIDO OFFLINE-FIRST
            </p>
            <button
              onClick={handleUnpairTerminal}
              className="mt-2 text-[11px] text-red-400/70 hover:text-red-400 underline cursor-pointer"
            >
              [Desvincular / Alterar Loja]
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {cashiersMock.map(cx => (
              <button
                key={cx.number}
                onClick={() => {
                  setSelectedCashier(cx.number);
                  setSelectedOperator(cx.operator);
                  setPin('');
                  setLoginError('');
                }}
                className={`border-2 p-5 rounded-lg transition-all text-left ${
                  selectedCashier === cx.number
                    ? 'border-[#00ff41] bg-[#00ff41]/10'
                    : 'border-[#00ff41]/20 bg-[#001a00]/30 hover:border-[#00ff41]/60'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-4xl font-black text-[#00ff41]/70">{String(cx.number).padStart(2, '0')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-[#00ff41]/40 text-[#00ff41]/80">
                    OPERADOR
                  </span>
                </div>
                <div className="text-sm font-bold text-[#00ff41]">{cx.operator}</div>
              </button>
            ))}
          </div>

          <form
            onSubmit={handleLoginSubmit}
            className="max-w-sm mx-auto bg-[#001a00] border-2 border-[#00ff41] rounded-lg p-6 shadow-[0_0_30px_rgba(0,255,65,0.1)]"
          >
            <div className="text-center mb-4">
              <div className="text-[#00ff41] font-black text-lg">OPERADOR: {selectedOperator}</div>
              <div className="text-[#00ff41]/60 text-xs mt-1">Digite o PIN do caixa para abrir turno</div>
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
            <button
              type="submit"
              className="w-full mt-4 bg-[#00ff41] text-black font-black py-3 rounded text-sm tracking-widest hover:bg-[#00ff41]/90"
            >
              ABRIR TURNO DO CAIXA ↵
            </button>
          </form>
        </div>

        {/* Modal de Abertura de Turno com Fundo de Troco */}
        {modal === 'open_shift' && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
            <div className="bg-[#030f03] border-2 border-[#00ff41] rounded-lg w-full max-w-md p-6 space-y-4 shadow-[0_0_40px_rgba(0,255,65,0.2)]">
              <div className="text-center">
                <span className="text-[#00ff41] text-xl font-black block">ABERTURA DE TURNO</span>
                <span className="text-[#00ff41]/60 text-xs">Caixa {selectedCashier} • {selectedOperator}</span>
              </div>
              <div className="bg-[#001a00] border border-[#00ff41]/30 rounded p-4">
                <label className="text-[#00ff41]/60 text-xs font-bold block mb-2">FUNDO DE TROCO INICIAL (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={openShiftInitialBalance}
                  onChange={e => setOpenShiftInitialBalance(e.target.value)}
                  autoFocus
                  className="w-full bg-black border-2 border-[#00ff41]/50 focus:border-[#00ff41] text-[#00ff41] font-black text-3xl text-right p-3 rounded outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setModal('')}
                  className="flex-1 border border-[#00ff41]/40 text-[#00ff41]/60 py-3 rounded text-xs font-bold hover:bg-[#00ff41]/10"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleConfirmOpenShift}
                  className="flex-1 bg-[#00ff41] text-black font-black py-3 rounded text-xs tracking-widest hover:bg-[#00ff41]/90"
                >
                  CONFIRMAR & IMPRIMIR ↵
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const paidTotal = appliedPayments.reduce((a, b) => a + b.amount, 0);
  const remainingTotal = Math.max(0, +(total - paidTotal).toFixed(2));
  const moneyGiven = appliedPayments.find(p => p.method === 'MONEY')?.amount || 0;
  const changeAmount = moneyGiven > total ? +(moneyGiven - total).toFixed(2) : 0;

  return (
    <div
      className="h-screen flex flex-col bg-black text-white font-mono overflow-hidden select-none"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      {/* ── BARRA SUPERIOR (HEADER) ── */}
      <div className="bg-[#001a00] border-b-2 border-[#00ff41] px-6 py-2.5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[#00ff41] font-black text-lg tracking-widest">
            {terminalConfig.store?.tradeName || terminalConfig.store?.name || 'EMPORIO'}
          </span>
          <div className="flex items-center gap-2 bg-[#00ff41]/10 border border-[#00ff41]/30 px-3 py-1 rounded">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff41] shadow-[0_0_8px_#00ff41] animate-pulse" />
            <span className="text-[#00ff41] text-xs font-bold">
              CAIXA {String(currentShift.cashierNumber).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[#00ff41]/70 text-xs">
            Op: <strong className="text-white">{currentShift.operatorName}</strong>
          </span>

          {/* Indicador de Status Híbrido (Online / Offline / Fila de Sincronização) */}
          <div className="flex items-center gap-2 text-xs">
            {syncStatus.isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                ONLINE (NUVEM)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                OFFLINE (LOCAL)
              </span>
            )}

            {syncStatus.pendingSalesCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/40 text-blue-300 text-[11px] font-bold">
                {syncStatus.pendingSalesCount} {syncStatus.pendingSalesCount === 1 ? 'venda pendente' : 'vendas pendentes'}
              </span>
            )}

            <button
              onClick={() => syncServiceRef.current?.syncNow()}
              title="Sincronizar dados agora"
              disabled={syncStatus.isSyncing}
              className="px-2 py-0.5 rounded border border-[#00ff41]/30 text-[#00ff41] text-[10px] hover:bg-[#00ff41]/10 disabled:opacity-40"
            >
              {syncStatus.isSyncing ? 'Sincronizando...' : 'Sincronizar [F8]'}
            </button>
          </div>
        </div>

        {/* Atalhos de Teclado */}
        <div className="flex items-center gap-4">
          <div className="flex gap-2 text-xs">
            {[
              { key: 'F2', label: 'Balança' },
              { key: 'F3', label: 'Cancela' },
              { key: 'F4', label: 'CPF' },
              { key: 'F5', label: 'Sangria' },
              { key: 'F6', label: 'Suprim.' },
              { key: 'F7', label: 'Consulta' },
              { key: 'F9', label: 'Fechar' },
              { key: 'F12', label: 'Pagar' },
            ].map(s => (
              <div key={s.key} className="text-center">
                <span className="text-[10px] text-[#00ff41] font-black bg-[#00ff41]/10 border border-[#00ff41]/30 px-1.5 py-0.5 rounded">
                  {s.key}
                </span>
                <div className="text-[8px] text-[#00ff41]/50 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <span className="text-[#00ff41] font-black text-xl tracking-widest">{time.toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>

      {/* ── CORPO PRINCIPAL ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ESQUERDA: Grade de Produtos e Leitor */}
        <div className="flex-1 flex flex-col border-r-2 border-[#00ff41]/20">
          {/* Input do Leitor de Código de Barras / Balança */}
          <div className="bg-[#001a00] border-b border-[#00ff41]/20 p-3">
            <form onSubmit={handleBarcodeSubmit} className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                placeholder="Passe o leitor, bipe a etiqueta de balança ou digite o código..."
                className="flex-1 bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] text-lg font-bold px-4 py-2.5 rounded outline-none font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={openScaleModal}
                className="bg-[#003300] border border-[#00ff41]/60 text-[#00ff41] font-black px-4 py-2 rounded text-xs tracking-wider hover:bg-[#004400]"
                title="Pesar produto na balança de checkout"
              >
                ⚖️ PESAR [F2]
              </button>
              <button
                type="submit"
                className="bg-[#00ff41] text-black font-black px-6 py-2.5 rounded text-xs tracking-widest hover:bg-[#00ff41]/90"
              >
                INSERIR ↵
              </button>
            </form>
            {errorMessage && <p className="text-red-400 text-xs mt-1.5">{errorMessage}</p>}
          </div>

          {/* Tabela de Itens do Cupom */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#00ff41]/25">
                <span className="text-3xl font-black tracking-widest">CAIXA LIVRE</span>
                <span className="text-xs mt-1">Aguardando leitura de produtos ou pesagem...</span>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-[#001a00] border-b border-[#00ff41]/20 sticky top-0 text-[#00ff41]/50 text-xs">
                  <tr>
                    <th className="px-4 py-2.5 text-left w-12">Nº</th>
                    <th className="px-4 py-2.5 text-left">DESCRIÇÃO</th>
                    <th className="px-4 py-2.5 text-center w-28">QTD / PESO</th>
                    <th className="px-4 py-2.5 text-right w-32">VL UNIT</th>
                    <th className="px-4 py-2.5 text-right w-36">VL TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={item.id} className="border-b border-[#00ff41]/10 hover:bg-[#00ff41]/5 text-sm">
                      <td className="px-4 py-3 text-[#00ff41]/30 font-mono">{String(i + 1).padStart(3, '0')}</td>
                      <td className="px-4 py-3">
                        <div className="text-[#00ff41] font-bold uppercase">{item.name}</div>
                        <div className="text-[#00ff41]/40 text-xs font-mono">{item.barcode}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-[#00ff41] font-black text-base">
                        {item.unit === 'KG' ? `${item.quantity.toFixed(3)} kg` : `${item.quantity} un`}
                      </td>
                      <td className="px-4 py-3 text-right text-[#00ff41]/60 font-mono">R$ {fmt(item.price)}</td>
                      <td className="px-4 py-3 text-right text-[#00ff41] font-black text-lg font-mono">
                        R$ {fmt(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* DIREITA: Painel de Totais & Display */}
        <div className="w-84 bg-black flex flex-col border-l-2 border-[#00ff41]/20 justify-between p-5">
          <div>
            <div className="bg-[#001200] border-2 border-[#00ff41]/30 rounded p-3.5 mb-3">
              <span className="text-[#00ff41]/40 text-[10px] font-bold tracking-widest block mb-0.5">SUBTOTAL</span>
              <div className="text-[#00ff41]/60 text-xl font-black font-mono text-right">R$ {fmt(subtotal)}</div>
            </div>

            <div className="bg-[#001a00] border-2 border-[#00ff41] rounded p-4 mb-4 shadow-[0_0_20px_rgba(0,255,65,0.1)]">
              <span className="text-[#00ff41]/60 text-[10px] font-bold tracking-widest block mb-1">TOTAL A PAGAR</span>
              <div className="text-[#00ff41] font-black font-mono text-4xl text-right leading-none">
                R$ {fmt(total)}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <span className="text-[#00ff41]/40 text-xs flex-1">DESCONTO R$</span>
              <input
                type="number"
                value={discountInput}
                onChange={e => setDiscountInput(e.target.value)}
                className="w-24 bg-black border border-[#00ff41]/30 focus:border-[#00ff41] text-[#00ff41] text-right font-mono px-2 py-1 rounded outline-none text-sm"
                min="0"
                step="0.01"
              />
            </div>

            {customerName && (
              <div className="bg-[#001a00] border border-[#00ff41]/40 rounded p-3 mb-3">
                <span className="text-[#00ff41]/60 text-[9px] font-bold tracking-widest block mb-0.5">
                  CLIENTE IDENTIFICADO
                </span>
                <div className="text-[#00ff41] text-xs font-bold truncate">{customerName}</div>
                <div className="text-[#00ff41]/50 text-[10px] font-mono">CPF: {cpfInput}</div>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <button
              onClick={openPaymentModal}
              disabled={cart.length === 0}
              className="w-full bg-[#00ff41] text-black font-black py-3.5 rounded text-sm tracking-widest hover:bg-[#00ff41]/90 transition-all disabled:opacity-20 shadow-[0_0_20px_rgba(0,255,65,0.2)]"
            >
              PAGAR [F12] ↵
            </button>
            <button
              onClick={() => setModal('closing')}
              className="w-full border border-amber-500/40 hover:border-amber-500 text-amber-500/70 hover:text-amber-400 font-bold py-2 rounded text-xs tracking-widest transition-all"
            >
              FECHAR CAIXA [F9]
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAIS DO SISTEMA ── */}

      {/* MODAL 1: BALANÇA DE CHECKOUT (F2) */}
      {modal === 'scale_reader' && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41] rounded-lg w-full max-w-lg p-6 space-y-5 shadow-[0_0_40px_rgba(0,255,65,0.2)]">
            <div className="flex justify-between items-center border-b border-[#00ff41]/30 pb-3">
              <span className="text-[#00ff41] font-black text-base">⚖️ BALANÇA DE CHECKOUT (SERIAL/USB)</span>
              <button onClick={() => setModal('')} className="text-[#00ff41]/60 hover:text-[#00ff41]">
                ✕
              </button>
            </div>

            <div className="bg-[#001200] border-2 border-[#00ff41]/40 rounded-lg p-6 text-center">
              <span className="text-[#00ff41]/50 text-xs font-bold block mb-1">PESO CAPTURADO</span>
              <div className="text-[#00ff41] font-black text-5xl font-mono tracking-widest">
                {scaleReading ? 'LENDO...' : `${scaleWeight.toFixed(3)} kg`}
              </div>
              <button
                type="button"
                onClick={handleReadScaleWeight}
                className="mt-3 text-[11px] text-[#00ff41]/80 hover:text-[#00ff41] underline cursor-pointer"
              >
                [Repetir Leitura da Balança]
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[#00ff41]/60 text-xs block mb-1">PRODUTO PESADO</label>
                <input
                  type="text"
                  value={weighedProductName}
                  onChange={e => setWeighedProductName(e.target.value)}
                  placeholder="Ex: Maçã Fuji, Tomate, Pão Francês..."
                  className="w-full bg-black border border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] p-2.5 rounded outline-none text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#00ff41]/60 text-xs block mb-1">PREÇO / KG (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={weighedProductPrice}
                    onChange={e => setWeighedProductPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-black border border-[#00ff41]/40 text-[#00ff41] p-2.5 rounded outline-none text-sm font-mono text-right"
                  />
                </div>
                <div>
                  <label className="text-[#00ff41]/60 text-xs block mb-1">TOTAL DO ITEM</label>
                  <div className="bg-[#001a00] border border-[#00ff41]/30 text-[#00ff41] p-2.5 rounded text-sm font-mono font-bold text-right">
                    R$ {fmt(scaleWeight * weighedProductPrice)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModal('')}
                className="flex-1 border border-[#00ff41]/30 text-[#00ff41]/50 py-3 rounded text-xs font-bold"
              >
                CANCELAR
              </button>
              <button
                onClick={handleConfirmWeighedItem}
                disabled={scaleWeight <= 0}
                className="flex-1 bg-[#00ff41] text-black font-black py-3 rounded text-xs tracking-widest disabled:opacity-30"
              >
                CONFIRMAR & LANÇAR NO CUPOM ↵
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RECEBIMENTO & MÚLTIPLOS PAGAMENTOS (F12) */}
      {modal === 'payment' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41]/60 rounded-lg w-full max-w-xl overflow-hidden">
            <div className="bg-[#001a00] border-b border-[#00ff41]/30 px-6 py-3 flex justify-between items-center text-[#00ff41] font-black text-sm">
              <span>RECEBIMENTO (MÚLTIPLOS PAGAMENTOS)</span>
              <button onClick={() => setModal('')}>✕</button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#001200] border border-[#00ff41]/30 rounded p-3 text-center">
                  <span className="text-[#00ff41]/50 text-xs tracking-widest block">TOTAL DA VENDA</span>
                  <span className="text-[#00ff41] font-black text-2xl">R$ {fmt(total)}</span>
                </div>
                <div className="bg-[#001200] border border-[#00ff41]/30 rounded p-3 text-center">
                  <span className="text-[#00ff41]/50 text-xs tracking-widest block">SALDO RESTANTE</span>
                  <span className={`font-black text-2xl ${remainingTotal === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    R$ {fmt(remainingTotal)}
                  </span>
                </div>
              </div>

              {/* Pagamentos Já Lançados */}
              {appliedPayments.length > 0 && (
                <div className="bg-[#001a00] border border-[#00ff41]/20 rounded p-3 space-y-1.5">
                  <span className="text-[#00ff41]/50 text-[10px] font-bold tracking-widest block">PAGAMENTOS EFETUADOS</span>
                  {appliedPayments.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-[#00ff41]">
                      <span>{PAYMENT_LABELS[p.method] || p.method}</span>
                      <span className="font-mono font-bold">R$ {fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Seleção de Forma de Pagamento */}
              <div>
                <span className="text-[#00ff41]/50 text-xs font-bold block mb-2">ESCOLHA A FORMA DE PAGAMENTO</span>
                <div className="grid grid-cols-5 gap-2">
                  {(['MONEY', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'VOUCHER'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setActivePaymentMethod(m)}
                      className={`py-2.5 rounded border-2 text-[11px] font-bold ${
                        activePaymentMethod === m
                          ? 'border-[#00ff41] bg-[#00ff41]/15 text-[#00ff41]'
                          : 'border-[#00ff41]/20 text-[#00ff41]/50 hover:border-[#00ff41]/40'
                      }`}
                    >
                      {PAYMENT_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor a Receber nesta Forma */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-[#00ff41]/60">
                  <span>VALOR A LANÇAR</span>
                  {activePaymentMethod === 'CREDIT_CARD' || activePaymentMethod === 'DEBIT_CARD' ? (
                    <span className="text-emerald-400 font-bold">TEF / PinPad Integrado Disponível</span>
                  ) : null}
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmountInput}
                    onChange={e => setPaymentAmountInput(e.target.value)}
                    className="flex-1 bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] font-black text-2xl text-right px-4 py-2 rounded outline-none font-mono"
                    placeholder="0,00"
                    autoFocus
                  />
                  <button
                    onClick={handleAddPayment}
                    className="bg-[#003300] border-2 border-[#00ff41] text-[#00ff41] font-black px-6 py-2 rounded text-xs hover:bg-[#004400]"
                  >
                    LANÇAR ↵
                  </button>
                </div>
              </div>

              {/* Troco em Dinheiro */}
              {changeAmount > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/40 rounded p-3 text-center">
                  <span className="text-emerald-400/70 text-xs block">TROCO A DEVOLVER</span>
                  <span className="text-emerald-400 font-black text-3xl font-mono">R$ {fmt(changeAmount)}</span>
                  <ChangeVisual amount={changeAmount} />
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModal('')}
                  className="flex-1 border border-[#00ff41]/30 text-[#00ff41]/50 py-3 rounded text-xs font-bold"
                >
                  VOLTAR
                </button>
                <button
                  onClick={handleFinalizeSale}
                  disabled={paidTotal < total}
                  className="flex-1 bg-[#00ff41] text-black font-black py-3 rounded text-xs tracking-widest disabled:opacity-20"
                >
                  FINALIZAR VENDA ↵
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TRANSAÇÃO TEF / PINPAD */}
      {modal === 'tef_modal' && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41] rounded-lg w-full max-w-md p-8 text-center space-y-6 shadow-[0_0_40px_rgba(0,255,65,0.3)]">
            <span className="text-[#00ff41] text-xl font-black block tracking-widest">PINPAD / TEF INTEGRADO</span>
            <div className="bg-[#001a00] border-2 border-[#00ff41]/40 rounded-lg p-6 space-y-3">
              <span className="w-4 h-4 rounded-full bg-[#00ff41] shadow-[0_0_12px_#00ff41] animate-pulse inline-block" />
              <div className="text-[#00ff41] font-black text-lg font-mono whitespace-pre-line leading-relaxed">
                {tefMessage}
              </div>
            </div>
            <p className="text-[#00ff41]/50 text-xs">Aguardando autorização da adquirente...</p>
          </div>
        </div>
      )}

      {/* MODAL 4: CUPOM EMITIDO COM SUCESSO */}
      {modal === 'success' && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41] rounded-lg w-full max-w-md p-8 text-center space-y-5 shadow-[0_0_40px_rgba(0,255,65,0.2)]">
            <span className="text-[#00ff41] text-2xl font-black block">CUPOM EMITIDO!</span>
            <span className="text-[#00ff41]/50 text-xs block font-mono">VENDA #{lastSaleId}</span>
            <div className="bg-[#001a00] border border-[#00ff41]/30 rounded p-3 flex items-center gap-3 justify-center">
              <span className="w-3 h-3 rounded-full bg-[#00ff41] shadow-[0_0_10px_#00ff41] animate-pulse" />
              <span className="text-[#00ff41]/80 text-xs font-bold tracking-widest">
                CUPOM ENVIADO PARA A IMPRESSORA TÉRMICA
              </span>
            </div>
            {changeAmount > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-center">
                <span className="text-emerald-400/60 text-xs block">TROCO</span>
                <span className="text-emerald-400 font-black text-2xl font-mono">R$ {fmt(changeAmount)}</span>
              </div>
            )}
            <button
              onClick={() => {
                setModal('');
                clearSale();
              }}
              className="w-full bg-[#00ff41] text-black font-black py-3.5 rounded text-sm tracking-widest hover:bg-[#00ff41]/90"
            >
              PRÓXIMA VENDA [ENTER] ↵
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: FECHAMENTO DE CAIXA (F9) */}
      {modal === 'closing' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41]/60 rounded-lg w-full max-w-2xl overflow-hidden">
            <div className="bg-[#001a00] border-b border-[#00ff41]/30 px-6 py-3 flex justify-between items-center text-[#00ff41] font-black text-sm">
              <span>FECHAMENTO DE CAIXA (CONFERÊNCIA)</span>
              <button onClick={() => setModal('')}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#001200] border border-[#00ff41]/20 rounded p-3">
                  <span className="text-[#00ff41]/40 text-[10px] block">FUNDO INICIAL</span>
                  <div className="text-[#00ff41] font-black text-lg">R$ {fmt(currentShift.initialBalance)}</div>
                </div>
                <div className="bg-[#001200] border border-[#00ff41]/20 rounded p-3">
                  <span className="text-[#00ff41]/40 text-[10px] block">MOVIMENTAÇÕES</span>
                  <div className="text-[#00ff41] font-bold text-sm">
                    {currentShift.movements.length} sangrias/suprimentos
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[#00ff41]/60 text-xs font-bold block">CONFERÊNCIA DOS VALORES NA GAVETA</span>
                <div>
                  <label className="text-[#00ff41]/40 text-xs block mb-1">TOTAL CONTADO EM DINHEIRO (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closingCashCounted}
                    onChange={e => setClosingCashCounted(e.target.value)}
                    placeholder="0,00"
                    autoFocus
                    className="w-full bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] font-mono text-xl text-right px-4 py-2 rounded outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#00ff41]/40 text-xs block mb-1">CARTÕES (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={closingCardsCounted}
                      onChange={e => setClosingCardsCounted(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-black border border-[#00ff41]/30 text-[#00ff41] font-mono text-sm text-right px-3 py-1.5 rounded outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#00ff41]/40 text-xs block mb-1">PIX (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={closingPixCounted}
                      onChange={e => setClosingPixCounted(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-black border border-[#00ff41]/30 text-[#00ff41] font-mono text-sm text-right px-3 py-1.5 rounded outline-none"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                  placeholder="Observações do fechamento (opcional)"
                  className="w-full bg-black border border-[#00ff41]/30 text-[#00ff41] text-xs px-3 py-2 rounded outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModal('')}
                  className="flex-1 border border-[#00ff41]/30 text-[#00ff41]/50 py-3 rounded text-xs font-bold"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleConfirmCloseShift}
                  className="flex-1 bg-amber-500 text-black font-black py-3 rounded text-xs tracking-widest hover:bg-amber-400"
                >
                  CONFIRMAR FECHAMENTO & IMPRIMIR REDUÇÃO Z ↵
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: SANGRIA E SUPRIMENTO (F5 / F6) */}
      {modal === 'withdrawal' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41]/60 rounded-lg w-full max-w-md overflow-hidden">
            <div className="bg-[#001a00] border-b border-[#00ff41]/30 px-6 py-3 flex justify-between items-center text-[#00ff41] font-black text-sm">
              <span>{withdrawalType === 'WITHDRAWAL' ? 'SANGRIA DE CAIXA (RETIRADA)' : 'SUPRIMENTO (REFORÇO)'}</span>
              <button onClick={() => setModal('')}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[#00ff41]/40 text-xs block mb-1">VALOR (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  value={withdrawalAmount}
                  onChange={e => setWithdrawalAmount(e.target.value)}
                  autoFocus
                  className="w-full bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] font-black text-2xl text-right px-4 py-2 rounded outline-none font-mono"
                  placeholder="0,00"
                />
              </div>
              <div>
                <span className="text-[#00ff41]/40 text-xs block mb-1">MOTIVO / OBSERVAÇÃO</span>
                <input
                  type="text"
                  value={withdrawalReason}
                  onChange={e => setWithdrawalReason(e.target.value)}
                  className="w-full bg-black border border-[#00ff41]/30 text-[#00ff41] px-4 py-2 rounded outline-none text-sm"
                  placeholder="Ex: Pagamento de fornecedor, excesso para cofre..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setModal('')}
                  className="flex-1 border border-[#00ff41]/30 text-[#00ff41]/50 py-3 rounded text-xs font-bold"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleConfirmMovement}
                  className="flex-1 bg-[#00ff41] text-black font-black py-3 rounded text-xs tracking-widest hover:bg-[#00ff41]/90"
                >
                  CONFIRMAR & IMPRIMIR ↵
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: CONSULTA DE PREÇO (F7) */}
      {modal === 'pricecheck' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41]/60 rounded-lg w-full max-w-lg overflow-hidden">
            <div className="bg-[#001a00] border-b border-[#00ff41]/30 px-6 py-3 flex justify-between items-center text-[#00ff41] font-black text-sm">
              <span>CONSULTA DE PREÇO</span>
              <button onClick={() => setModal('')}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={handlePriceCheck} className="flex gap-2">
                <input
                  type="text"
                  value={priceCheckQuery}
                  onChange={e => setPriceCheckQuery(e.target.value)}
                  autoFocus
                  placeholder="Código de barras..."
                  className="flex-1 bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] px-4 py-2 rounded outline-none text-sm font-mono"
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

      {/* MODAL 8: CPF NA NOTA (F4) */}
      {modal === 'cpf' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030f03] border-2 border-[#00ff41]/60 rounded-lg w-full max-w-md overflow-hidden">
            <div className="bg-[#001a00] border-b border-[#00ff41]/30 px-6 py-3 flex justify-between items-center text-[#00ff41] font-black text-sm">
              <span>CPF / CNPJ NA NOTA</span>
              <button onClick={() => setModal('')}>✕</button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <input
                type="text"
                value={cpfInput}
                onChange={e => setCpfInput(e.target.value)}
                autoFocus
                placeholder="000.000.000-00"
                className="w-full bg-black border-2 border-[#00ff41]/40 focus:border-[#00ff41] text-[#00ff41] text-center text-2xl font-black py-3 rounded outline-none font-mono"
              />
              <button
                onClick={() => {
                  if (cpfInput.length > 5) setCustomerName('Cliente Identificado');
                  setModal('');
                }}
                className="w-full bg-[#00ff41] text-black font-black py-3 rounded text-sm hover:bg-[#00ff41]/90"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Iframe invisível para disparar impressões térmicas reais */}
      <iframe
        ref={receiptFrameRef}
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '80mm', height: '0', border: 'none' }}
        title="receipt-printer"
      />
    </div>
  );
}
