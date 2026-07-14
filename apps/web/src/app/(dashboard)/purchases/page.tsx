"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart, Plus, Search, X, Save, FileText, Truck, Calendar,
  BarChart2, CheckCircle2, Clock, AlertTriangle, Building, Mail,
  Send, Loader2, Tag, TrendingDown, Star, ChevronRight, Bell, CreditCard, Receipt
} from "lucide-react";
import { getProducts } from "@/actions/product";

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmt(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ─── ReceiveModal sub-component (must have its own hooks) ───────────────────
function ReceiveModal({ order, onClose, onConfirm }: {
  order: { id: string; storeName: string; supplier: string; total: number; paymentCondition?: string; paymentDueDate?: string };
  onClose: () => void;
  onConfirm: (id: string, invoice: string) => void;
}) {
  const [invoiceNum, setInvoiceNum] = useState("");
  const hasDueDate = !!order.paymentDueDate;
  const dueDateStr = hasDueDate ? new Date(order.paymentDueDate!).toLocaleDateString("pt-BR") : null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[#0c0f1a]/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Receipt className="text-emerald-400" size={18}/> Recebimento de NF</h3>
          <button onClick={onClose} className="p-1 hover:bg-indigo-500/10 rounded-lg text-slate-500"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-[#0c0f1a] border border-indigo-500/10 rounded-xl p-4 space-y-2">
            <div className="flex justify-between"><span className="text-slate-500 text-xs">Pedido</span><span className="text-white font-bold font-mono">{order.id}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 text-xs">Loja</span><span className="text-indigo-400 font-bold text-xs">{order.storeName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 text-xs">Fornecedor</span><span className="text-white font-semibold text-xs">{order.supplier}</span></div>
            <div className="flex justify-between border-t border-indigo-500/10 pt-2"><span className="text-slate-300 font-semibold text-xs">Total</span><span className="text-emerald-400 font-bold text-lg font-mono">R$ {fmt(order.total)}</span></div>
          </div>
          {hasDueDate && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl flex gap-3">
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 font-black text-sm">Atenção — Verificar Boleto!</p>
                <p className="text-amber-200/80 text-xs mt-0.5">
                  A data de pagamento negociada neste pedido é <strong>{dueDateStr}</strong>. Confira se a data do boleto/NF coincide com o acordado.
                </p>
                <p className="text-amber-400/60 text-[10px] mt-1">Condição: {order.paymentCondition}</p>
              </div>
            </div>
          )}
          <div className="p-3 bg-slate-500/5 border border-slate-500/10 rounded-xl text-slate-400 text-xs flex gap-2 items-start">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-slate-500" />
            <span>O estoque será atualizado automaticamente ao confirmar o recebimento.</span>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Número da NF-e</label>
            <input value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} placeholder="000.000.000"
              className="w-full bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white px-3 py-2 rounded-lg outline-none text-sm font-mono" />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 bg-[#0c0f1a] hover:bg-[#161b33] text-slate-400 font-semibold py-2.5 rounded-xl border border-indigo-500/10 text-sm">Cancelar</button>
            <button onClick={() => onConfirm(order.id, invoiceNum)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl shadow-lg text-sm flex items-center justify-center gap-1.5">
              <CheckCircle2 size={14}/> Confirmar Recebimento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Constants ──────────────────────────────────────────────────────────────
const STORES = [
  { id: "store-1", name: "Loja 1 - Matriz Centro" },
  { id: "store-2", name: "Loja 2 - Filial Zona Sul" }
];

const SUPPLIERS = [
  { id: "1", name: "Distribuidora Norte LTDA",   quoteEmail: "cotacao@norte.com.br",         cnpj: "12.345.678/0001-99" },
  { id: "2", name: "Bebidas Premium S.A.",         quoteEmail: "cotacao@bebidaspremium.com",   cnpj: "98.765.432/0001-11" },
  { id: "3", name: "Limpeza Total Distribuidora",  quoteEmail: "cotacoes@limpezatotal.com",    cnpj: "11.222.333/0001-44" },
  { id: "4", name: "Frios & Laticínios Nordeste",  quoteEmail: "compras@friosnordeste.com",    cnpj: "55.666.777/0001-88" },
];

type OrderStatus = "RECEIVED" | "PENDING" | "IN_TRANSIT" | "CANCELLED";
interface Order {
  id: string;
  storeName: string;
  supplier: string;
  date: string;
  items: number;
  total: number;
  status: OrderStatus;
  paymentCondition?: string;
  paymentDueDate?: string;
  invoiceNumber?: string;
}

interface QuoteResponse {
  supplierId: string;
  supplierName: string;
  paymentProposal: string;
  prices: Record<string, number>; // productId → unit price
}

interface ActiveQuote {
  id: string;
  token: string;
  products: { id: string; name: string; qty: number; unit: string }[];
  supplierIds: string[];
  deadline: string;
  status: "AWAITING" | "PARTIAL" | "COMPLETE" | "CLOSED";
  responses: QuoteResponse[];
}

const INITIAL_ORDERS: Order[] = [
  { id: "PC-001", storeName: "Loja 1 - Matriz Centro",  supplier: "Distribuidora Norte LTDA",   date: "10/06/2026", items: 12, total: 3450.00, status: "RECEIVED",    paymentCondition: "30 dias",       paymentDueDate: "2026-07-10" },
  { id: "PC-002", storeName: "Loja 2 - Filial Zona Sul", supplier: "Bebidas Premium S.A.",       date: "12/06/2026", items: 6,  total: 1890.50, status: "PENDING",     paymentCondition: "À Vista" },
  { id: "PC-003", storeName: "Loja 1 - Matriz Centro",  supplier: "Frios & Laticínios Nordeste", date: "14/06/2026", items: 8,  total: 2200.00, status: "IN_TRANSIT",  paymentCondition: "30/60 dias",    paymentDueDate: "2026-07-14" },
];

// Mock of a quote already with responses for demo
const DEMO_QUOTE: ActiveQuote = {
  id: "COTA-2026-001",
  token: "COTA-2026-001",
  deadline: addDays(5),
  status: "COMPLETE",
  products: [
    { id: "p1", name: "Heineken Long Neck 330ml", qty: 24, unit: "UN" },
    { id: "p2", name: "Skol Pilsen Lata 350ml",   qty: 48, unit: "UN" },
    { id: "p3", name: "Coca-Cola 2L",             qty: 12, unit: "UN" },
    { id: "p4", name: "Óleo de Soja Liza 900ml",  qty: 36, unit: "UN" },
  ],
  supplierIds: ["1", "2", "4"],
  responses: [
    { supplierId: "1", supplierName: "Distribuidora Norte LTDA",   paymentProposal: "30 dias",  prices: { p1: 4.50, p2: 2.80, p3: 8.90, p4: 6.20 } },
    { supplierId: "2", supplierName: "Bebidas Premium S.A.",       paymentProposal: "À Vista",  prices: { p1: 4.20, p2: 2.95, p3: 8.60, p4: 6.50 } },
    { supplierId: "4", supplierName: "Frios & Laticínios Nordeste", paymentProposal: "28 dias", prices: { p1: 4.60, p2: 2.75, p3: 9.10, p4: 5.90 } },
  ]
};

const STATUS_CFG: Record<OrderStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  RECEIVED:   { label: "Recebido",    cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15", icon: <CheckCircle2 size={12} /> },
  PENDING:    { label: "Pendente",    cls: "bg-amber-500/10 text-amber-400 border-amber-500/15",       icon: <Clock size={12} /> },
  IN_TRANSIT: { label: "Em Trânsito", cls: "bg-blue-500/10 text-blue-400 border-blue-500/15",         icon: <Truck size={12} /> },
  CANCELLED:  { label: "Cancelado",   cls: "bg-red-500/10 text-red-400 border-red-500/15",            icon: <X size={12} /> },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS_CFG[status];
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border w-fit ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function PurchasesPage() {
  const [tab, setTab] = useState<"orders" | "quotes" | "analysis">("orders");
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiveModal, setReceiveModal] = useState<Order | null>(null);
  const [activeQuotes, setActiveQuotes] = useState<ActiveQuote[]>([DEMO_QUOTE]);
  const [selectedAnalysisQuote, setSelectedAnalysisQuote] = useState<ActiveQuote>(DEMO_QUOTE);

  // Fornecedores locais para cadastro rápido
  const [localSuppliers, setLocalSuppliers] = useState(SUPPLIERS);
  const [isQuickSupplierModalOpen, setIsQuickSupplierModalOpen] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState("");
  const [quickSupplierCnpj, setQuickSupplierCnpj] = useState("");
  const [quickSupplierEmail, setQuickSupplierEmail] = useState("");

  // New Order States
  const [selectedSupplier, setSelectedSupplier] = useState(SUPPLIERS[0].name);
  const [expectedDate, setExpectedDate] = useState("");
  const [paymentCondition, setPaymentCondition] = useState("À Vista");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [installments, setInstallments] = useState("1");
  const [selectedStores, setSelectedStores] = useState<string[]>(["store-1"]);
  const [orderItems, setOrderItems] = useState<{ id: string; name: string; qty: number; unitCost: number; total: number }[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [itemQty, setItemQty] = useState("");
  const [itemCost, setItemCost] = useState("");

  // Quotation creation states
  const [quoteProducts, setQuoteProducts] = useState<any[]>([]);
  const [quoteSearch, setQuoteSearch] = useState("");
  const [selectedQuoteSuppliers, setSelectedQuoteSuppliers] = useState<string[]>([]);
  const [quoteDeadline, setQuoteDeadline] = useState(addDays(5));
  const [sendingQuote, setSendingQuote] = useState(false);
  const [quoteSentStatus, setQuoteSentStatus] = useState<string | null>(null);

  useEffect(() => {
    getProducts().then(res => { if (res.products) setProducts(res.products); });
  }, []);

  const handleQuickSupplierSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplierName.trim()) return;
    const newSupp = {
      id: `QUICK-${Date.now()}`,
      name: quickSupplierName,
      cnpj: quickSupplierCnpj || "---",
      quoteEmail: quickSupplierEmail || "---"
    };
    setLocalSuppliers(prev => [...prev, newSupp]);
    setSelectedSupplier(newSupp.name);
    setIsQuickSupplierModalOpen(false);
    setQuickSupplierName("");
    setQuickSupplierCnpj("");
    setQuickSupplierEmail("");
  };

  const handleResendQuote = async (quoteId: string) => {
    alert(`Cotação ${quoteId} reenviada com sucesso para todos os fornecedores pendentes!`);
  };

  // ─── Calculate quote totals for each supplier ────────────
  function calcSupplierTotal(quote: ActiveQuote, resp: QuoteResponse) {
    return quote.products.reduce((acc, p) => acc + ((resp.prices[p.id] || 0) * p.qty), 0);
  }

  function getBestPricePerProduct(quote: ActiveQuote): Record<string, { price: number; supplierId: string }> {
    const best: Record<string, { price: number; supplierId: string }> = {};
    quote.products.forEach(p => {
      quote.responses.forEach(r => {
        const price = r.prices[p.id] || Infinity;
        if (!best[p.id] || price < best[p.id].price) {
          best[p.id] = { price, supplierId: r.supplierId };
        }
      });
    });
    return best;
  }

  function getBestSupplier(quote: ActiveQuote): QuoteResponse | null {
    if (!quote.responses.length) return null;
    let best: QuoteResponse | null = null;
    let bestTotal = Infinity;
    quote.responses.forEach(r => {
      const t = calcSupplierTotal(quote, r);
      if (t < bestTotal) { bestTotal = t; best = r; }
    });
    return best;
  }

  // ─── Handlers ────────────────────────────────────────────
  const handleAddOrderItem = () => {
    if (!selectedProduct || !itemQty || !itemCost) return;
    const qty = parseFloat(itemQty);
    const cost = parseFloat(itemCost);
    setOrderItems(prev => [...prev, { id: selectedProduct.id, name: selectedProduct.name, qty, unitCost: cost, total: qty * cost }]);
    setSelectedProduct(null);
    setProductSearch("");
    setItemQty("");
    setItemCost("");
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderItems.length || !selectedStores.length) {
      alert("Adicione itens e selecione ao menos uma loja.");
      return;
    }
    const newOrders: Order[] = selectedStores.map((storeId, idx) => {
      const storeObj = STORES.find(s => s.id === storeId);
      return {
        id: `PC-${Date.now().toString().slice(-4)}-${idx + 1}`,
        storeName: storeObj?.name ?? "Matriz",
        supplier: selectedSupplier,
        date: new Date().toLocaleDateString("pt-BR"),
        items: orderItems.length,
        total: orderItems.reduce((a, i) => a + i.total, 0),
        status: "PENDING",
        paymentCondition,
        paymentDueDate: paymentDueDate || undefined,
      };
    });
    setOrders(prev => [...newOrders, ...prev]);
    setIsModalOpen(false);
    setOrderItems([]);
    setSelectedStores(["store-1"]);
    setPaymentDueDate("");
  };

  const handleMarkReceived = (orderId: string, invoiceNum: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "RECEIVED", invoiceNumber: invoiceNum } : o));
    setReceiveModal(null);
  };

  const handleSendQuotation = async () => {
    if (!quoteProducts.length || !selectedQuoteSuppliers.length) {
      alert("Selecione produtos e fornecedores.");
      return;
    }
    setSendingQuote(true);
    setQuoteSentStatus("Gerando links únicos por fornecedor...");
    await new Promise(r => setTimeout(r, 1200));
    setQuoteSentStatus("Formatando e-mails personalizados...");
    await new Promise(r => setTimeout(r, 1300));
    
    const suppNames = selectedQuoteSuppliers.map(id => SUPPLIERS.find(s => s.id === id)?.name ?? id);
    const newQuote: ActiveQuote = {
      id: `COTA-${Date.now().toString().slice(-6)}`,
      token: `COTA-${Date.now().toString().slice(-6)}`,
      deadline: quoteDeadline,
      status: "AWAITING",
      products: quoteProducts.map(p => ({ id: p.id, name: p.name, qty: 1, unit: "UN" })),
      supplierIds: selectedQuoteSuppliers,
      responses: [],
    };
    setActiveQuotes(prev => [newQuote, ...prev]);
    setQuoteSentStatus(`✅ Cotação disparada para: ${suppNames.join(", ")}! Aguardando respostas...`);
    setSendingQuote(false);

    setTimeout(() => {
      setQuoteProducts([]);
      setSelectedQuoteSuppliers([]);
      setQuoteSentStatus(null);
    }, 5000);
  };

  const handleCreateOrderFromBestQuote = (quote: ActiveQuote) => {
    const best = getBestSupplier(quote);
    if (!best) return;
    const supplier = SUPPLIERS.find(s => s.id === best.supplierId);
    const newOrder: Order = {
      id: `PC-${Date.now().toString().slice(-4)}-1`,
      storeName: "Loja 1 - Matriz Centro",
      supplier: best.supplierName,
      date: new Date().toLocaleDateString("pt-BR"),
      items: quote.products.length,
      total: calcSupplierTotal(quote, best),
      status: "PENDING",
      paymentCondition: best.paymentProposal,
    };
    setOrders(prev => [newOrder, ...prev]);
    setTab("orders");
  };

  const filteredOrders = orders.filter(o =>
    (statusFilter === "ALL" || o.status === statusFilter) &&
    (o.id.toLowerCase().includes(search.toLowerCase()) ||
     o.supplier.toLowerCase().includes(search.toLowerCase()) ||
     o.storeName.toLowerCase().includes(search.toLowerCase()))
  );

  const totalMonth = orders.reduce((acc, o) => acc + o.total, 0);
  const pendingCount = orders.filter(o => o.status === "PENDING").length;
  const receivedCount = orders.filter(o => o.status === "RECEIVED").length;

  // Upcoming payment alert (within 5 days)
  const upcomingPayments = orders.filter(o => {
    if (!o.paymentDueDate || o.status === "RECEIVED") return false;
    const diff = (new Date(o.paymentDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 5;
  });

  // ─── New Order Form ──────────────────────────────────────
  if (isModalOpen) {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Novo Pedido de Compra</h1>
            <p className="text-slate-500 text-sm mt-0.5">Preencha os dados, itens e condições de pagamento.</p>
          </div>
          <button onClick={() => setIsModalOpen(false)} className="bg-[#111528] border border-indigo-500/15 text-slate-400 hover:text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">← Voltar</button>
        </div>

        <form onSubmit={handleSaveOrder} className="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-hidden">
          {/* Left Column */}
          <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">

            {/* 1. Lojas */}
            <div className="bg-[#111528] p-4 rounded-2xl border border-indigo-500/10 space-y-3">
              <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><Building size={12}/> 1. Loja de Destino</h4>
              <p className="text-[10px] text-slate-500">Marque mais de uma loja para replicar o pedido.</p>
              <div className="space-y-2">
                {STORES.map(store => (
                  <label key={store.id} className="flex items-center gap-2 text-xs text-white cursor-pointer">
                    <input type="checkbox" checked={selectedStores.includes(store.id)}
                      onChange={() => setSelectedStores(prev => prev.includes(store.id) ? prev.filter(id => id !== store.id) : [...prev, store.id])}
                      className="rounded" />
                    {store.name}
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Geral */}
            <div className="bg-[#111528] p-4 rounded-2xl border border-indigo-500/10 space-y-3">
              <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12}/> 2. Informações Gerais</h4>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Fornecedor *</label>
                <div className="flex gap-1.5">
                  <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}
                    className="flex-1 bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none text-xs font-semibold">
                    {localSuppliers.map(s => <option key={s.id}>{s.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setIsQuickSupplierModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm transition-all" title="Cadastro Rápido">+</button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Previsão de Entrega</label>
                <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none text-xs" />
              </div>
            </div>

            {/* 3. Pagamento */}
            <div className="bg-[#111528] p-4 rounded-2xl border border-amber-500/10 space-y-3">
              <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5"><CreditCard size={12}/> 3. Condições de Pagamento</h4>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Condição Negociada</label>
                <select value={paymentCondition} onChange={e => setPaymentCondition(e.target.value)}
                  className="w-full bg-[#0c0f1a] border border-amber-500/10 focus:border-amber-500 text-white px-3 py-2 rounded-lg outline-none text-xs font-semibold">
                  {["À Vista","7 dias","14 dias","28 dias","30 dias","30/60 dias","30/60/90 dias","45 dias","60 dias"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Vencimento do Boleto (negociado)</label>
                <input type="date" value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)}
                  className="w-full bg-[#0c0f1a] border border-amber-500/10 focus:border-amber-500 text-white px-3 py-2 rounded-lg outline-none text-xs" />
              </div>
              {paymentDueDate && (
                <div className="p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[10px] text-amber-300 flex items-center gap-1.5">
                  <Bell size={11} /> O financeiro e o recebimento de NF serão alertados desta data.
                </div>
              )}
            </div>

            {/* 4. Inserir Item */}
            <div className="bg-[#111528] p-4 rounded-2xl border border-indigo-500/10 space-y-3">
              <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><Tag size={12}/> 4. Inserir Item</h4>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Buscar Produto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={12} />
                  <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Nome ou código de barras..."
                    className="w-full pl-8 pr-3 py-2 bg-[#0c0f1a] border border-indigo-500/15 text-white rounded-lg outline-none text-xs font-semibold" />
                </div>
                {productSearch.trim().length >= 1 && (
                  <div className="bg-[#0c0f1a] border border-indigo-500/15 rounded-lg max-h-32 overflow-y-auto divide-y divide-indigo-500/[0.06]">
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.barcode?.includes(productSearch)).slice(0, 10).map(p => (
                      <div key={p.id} onClick={() => { setSelectedProduct(p); setItemCost(p.cost?.toString() ?? ""); setProductSearch(p.name); }}
                        className="p-2 cursor-pointer hover:bg-indigo-500/10 text-xs text-white font-medium">{p.name}</div>
                    ))}
                  </div>
                )}
              </div>

              {selectedProduct && (
                <div className="p-2.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Último Preço de Compra</p>
                  <p className="text-sm text-indigo-300 font-black font-mono">R$ {selectedProduct.cost ? selectedProduct.cost.toFixed(2) : "0,00"}</p>
                  <p className="text-[9px] text-slate-600">Custo preenchido automaticamente abaixo.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Quantidade</label>
                  <input type="number" min="1" value={itemQty} onChange={e => setItemQty(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none text-xs text-right font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Custo Unit. (R$)</label>
                  <input type="number" step="0.01" value={itemCost} onChange={e => setItemCost(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none text-xs text-right font-mono font-bold" />
                </div>
              </div>
              <button type="button" onClick={handleAddOrderItem}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-bold transition-all">+ Adicionar Item</button>
            </div>
          </div>

          {/* Right Column - Items Table */}
          <div className="col-span-2 flex flex-col min-h-0 overflow-hidden">
            <div className="bg-[#111528] border border-indigo-500/10 rounded-2xl flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-auto min-h-0">
                <table className="w-full text-xs">
                  <thead className="bg-[#0c0f1a]/60 text-slate-500 border-b border-indigo-500/[0.08] sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Produto</th>
                      <th className="px-4 py-3 text-right font-semibold w-20">Qtd</th>
                      <th className="px-4 py-3 text-right font-semibold w-28">Custo Unit.</th>
                      <th className="px-4 py-3 text-right font-semibold w-32">Total</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/[0.06]">
                    {orderItems.map((item, i) => (
                      <tr key={i} className="hover:bg-indigo-500/[0.04]">
                        <td className="px-4 py-2.5 text-white font-medium">{item.name}</td>
                        <td className="px-4 py-2.5 text-right text-slate-400">{item.qty}</td>
                        <td className="px-4 py-2.5 text-right text-slate-400 font-mono">R$ {fmt(item.unitCost)}</td>
                        <td className="px-4 py-2.5 text-right text-white font-bold font-mono">R$ {fmt(item.total)}</td>
                        <td className="px-4 py-2.5"><button type="button" onClick={() => setOrderItems(p => p.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-red-400"><X size={12}/></button></td>
                      </tr>
                    ))}
                    {!orderItems.length && <tr><td colSpan={5} className="text-center p-8 text-slate-500 italic">Adicione produtos usando o formulário ao lado.</td></tr>}
                  </tbody>
                  {orderItems.length > 0 && (
                    <tfoot className="border-t border-indigo-500/[0.08] bg-[#0c0f1a]/40">
                      <tr><td colSpan={3} className="px-4 py-3 text-right text-slate-500 font-semibold text-xs uppercase">Total:</td><td className="px-4 py-3 text-right text-indigo-400 font-bold font-mono">R$ {fmt(orderItems.reduce((a, i) => a + i.total, 0))}</td><td /></tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
            <div className="flex gap-2 pt-3 justify-end shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-[#111528] border border-indigo-500/15 text-slate-400 font-semibold rounded-xl text-xs hover:bg-[#161b33] transition-colors">Cancelar</button>
              <button type="submit" disabled={!orderItems.length}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition-all active:scale-95">
                <Save size={13}/> Gravar Pedido{selectedStores.length > 1 ? `s (${selectedStores.length} lojas)` : ""}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ─── Main Page ───────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Compras, Pedidos & Cotações</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie pedidos, dispare cotações e compare propostas de fornecedores.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 text-sm active:scale-95">
          <Plus size={16}/> Novo Pedido
        </button>
      </div>

      {/* Payment alert banner */}
      {upcomingPayments.length > 0 && (
        <div className="shrink-0 flex items-center gap-3 p-3.5 bg-amber-500/8 border border-amber-500/20 rounded-2xl">
          <Bell size={16} className="text-amber-400 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-300">⚠️ Pagamentos vencendo em breve</p>
            <p className="text-[10px] text-amber-400/80">
              {upcomingPayments.map(o => `${o.id} (${new Date(o.paymentDueDate!).toLocaleDateString("pt-BR")})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-indigo-500/[0.08] px-1 shrink-0">
        {[
          { key: "orders",   label: "Pedidos & Recebimentos" },
          { key: "quotes",   label: "Cotações por E-mail" },
          { key: "analysis", label: "Análise de Propostas" + (activeQuotes.some(q => q.status === "COMPLETE") ? " 🔴" : "") },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`pb-3 pt-1 text-xs font-semibold border-b-2 px-1 transition-all ${tab === t.key ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: ORDERS ──────────────────────────────────────── */}
      {tab === "orders" && (
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          <div className="grid grid-cols-4 gap-4 shrink-0">
            {[
              { label: "Total do Mês",   value: `R$ ${fmt(totalMonth)}`, icon: <BarChart2 size={16} /> },
              { label: "Pendentes",      value: pendingCount,           icon: <Clock size={16} /> },
              { label: "Recebidos",      value: receivedCount,          icon: <CheckCircle2 size={16} /> },
              { label: "Total Pedidos",  value: orders.length,          icon: <ShoppingCart size={16} /> },
            ].map(stat => (
              <div key={stat.label} className="bg-[#111528] border border-indigo-500/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/15 shrink-0">{stat.icon}</div>
                <div><p className="text-slate-500 text-[10px] font-semibold uppercase">{stat.label}</p><p className="text-lg font-bold text-white">{stat.value}</p></div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido, fornecedor ou loja..."
                className="w-full bg-[#111528] border border-indigo-500/15 text-white pl-9 pr-4 py-2 rounded-lg outline-none text-sm" />
            </div>
            <div className="flex gap-1.5">
              {(["ALL","PENDING","IN_TRANSIT","RECEIVED"] as const).map(val => (
                <button key={val} onClick={() => setStatusFilter(val)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${statusFilter === val ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#111528] border-indigo-500/10 text-slate-500 hover:text-white"}`}>
                  {val === "ALL" ? "Todos" : STATUS_CFG[val].label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Nº Pedido</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Loja</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Fornecedor</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Data</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Pagamento</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Vencimento</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Valor</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/[0.06]">
                  {filteredOrders.map(o => {
                    const isNearDue = o.paymentDueDate && (new Date(o.paymentDueDate).getTime() - Date.now()) / (1000*60*60*24) <= 3 && o.status !== "RECEIVED";
                    return (
                      <tr key={o.id} className="hover:bg-indigo-500/[0.04] transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-indigo-400 text-xs">{o.id}</td>
                        <td className="px-5 py-3 text-slate-300 text-xs font-medium">{o.storeName}</td>
                        <td className="px-5 py-3 font-bold text-white text-xs">{o.supplier}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs"><span className="inline-flex items-center gap-1"><Calendar size={11}/> {o.date}</span></td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{o.paymentCondition ?? "—"}</td>
                        <td className="px-5 py-3 text-xs">
                          {o.paymentDueDate ? (
                            <span className={`flex items-center gap-1 font-mono font-bold ${isNearDue ? "text-amber-400" : "text-slate-400"}`}>
                              {isNearDue && <AlertTriangle size={11} />}
                              {new Date(o.paymentDueDate).toLocaleDateString("pt-BR")}
                            </span>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-5 py-3 font-bold text-white font-mono text-xs">R$ {fmt(o.total)}</td>
                        <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-5 py-3 text-right">
                          {o.status === "PENDING" && (
                            <button onClick={() => setReceiveModal(o)} className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2.5 py-1 rounded-lg hover:bg-emerald-500/15 transition-colors">Receber NF</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: QUOTES ──────────────────────────────────────── */}
      {tab === "quotes" && (
        <div className="flex-1 grid grid-cols-3 gap-5 min-h-0 overflow-hidden">
          <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">

            {/* Active Quotes list */}
            {activeQuotes.length > 0 && (
              <div className="bg-[#111528] p-4 rounded-2xl border border-indigo-500/10 space-y-2">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><Mail size={12}/> Cotações Ativas</h3>
                {activeQuotes.map(q => (
                  <div key={q.id} className="p-2.5 bg-[#0c0f1a] rounded-xl border border-indigo-500/[0.08] space-y-1">
                    <div className="flex justify-between items-start">
                      <p className="text-xs text-white font-mono font-bold">{q.id}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                        q.status === "COMPLETE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" :
                        q.status === "PARTIAL"  ? "bg-amber-500/10 text-amber-400 border-amber-500/15" :
                        "bg-slate-500/10 text-slate-400 border-slate-500/15"
                      }`}>
                        {q.status === "COMPLETE" ? "Completa" : q.status === "PARTIAL" ? "Parcial" : "Aguardando"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{q.products.length} produtos · {q.responses.length}/{q.supplierIds.length} respostas</p>
                    <p className="text-[10px] text-slate-600">Prazo: {new Date(q.deadline).toLocaleDateString("pt-BR")}</p>
                    <div className="flex gap-2 mt-1">
                      {q.status === "COMPLETE" && (
                        <button onClick={() => { setSelectedAnalysisQuote(q); setTab("analysis"); }}
                          className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5">
                          Ver Análise <ChevronRight size={10}/>
                        </button>
                      )}
                      <button onClick={() => handleResendQuote(q.id)}
                        className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5">
                        Reenviar Cotação 🔄
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Select Suppliers */}
            <div className="bg-[#111528] p-4 rounded-2xl border border-indigo-500/10 space-y-3">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><Truck size={12}/> 1. Fornecedores</h3>
              <div className="space-y-2">
                {SUPPLIERS.map(s => (
                  <label key={s.id} className="flex items-start gap-2.5 text-xs text-white cursor-pointer">
                    <input type="checkbox" checked={selectedQuoteSuppliers.includes(s.id)}
                      onChange={() => setSelectedQuoteSuppliers(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                      className="rounded mt-0.5" />
                    <div><p className="font-semibold">{s.name}</p><p className="text-[9px] text-slate-500">{s.quoteEmail}</p></div>
                  </label>
                ))}
              </div>
            </div>

            {/* Quote deadline */}
            <div className="bg-[#111528] p-4 rounded-2xl border border-indigo-500/10 space-y-2">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> 2. Prazo para Resposta</h3>
              <input type="date" value={quoteDeadline} onChange={e => setQuoteDeadline(e.target.value)}
                className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none text-xs" />
            </div>
          </div>

          {/* Right: Products & Dispatch */}
          <div className="col-span-2 flex flex-col min-h-0 bg-[#111528] rounded-2xl border border-indigo-500/10 p-5 overflow-hidden">
            <div className="flex justify-between items-center shrink-0 border-b border-indigo-500/[0.08] pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Mail size={15}/> Produtos na Cotação</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Busque e adicione os itens que deseja cotar.</p>
              </div>
              <button onClick={handleSendQuotation} disabled={!quoteProducts.length || !selectedQuoteSuppliers.length || sendingQuote}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                {sendingQuote ? <><Loader2 size={12} className="animate-spin"/> Enviando...</> : <><Send size={12}/> Disparar Cotação por E-mail</>}
              </button>
            </div>

            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
              <input type="text" value={quoteSearch} onChange={e => setQuoteSearch(e.target.value)} placeholder="Buscar produto por nome..."
                className="w-full pl-9 pr-3 py-2 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-xs text-white rounded-lg outline-none font-semibold" />
              {quoteSearch.trim().length >= 1 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0c0f1a] border border-indigo-500/15 rounded-lg z-10 max-h-36 overflow-y-auto divide-y divide-indigo-500/[0.06] shadow-xl">
                  {products.filter(p => p.name.toLowerCase().includes(quoteSearch.toLowerCase())).slice(0, 10).map(p => (
                    <div key={p.id} onClick={() => { if (!quoteProducts.some(x => x.id === p.id)) setQuoteProducts(prev => [...prev, p]); setQuoteSearch(""); }}
                      className="p-2 cursor-pointer hover:bg-indigo-500/10 text-xs text-white font-medium flex justify-between items-center">
                      <span>{p.name}</span><span className="text-[9px] text-indigo-400 font-bold">+ Incluir</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {quoteSentStatus && (
              <div className="mb-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-xs font-semibold flex items-center gap-2 shrink-0">
                <Loader2 size={13} className="animate-spin shrink-0" /><span>{quoteSentStatus}</span>
              </div>
            )}

            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-xs">
                <thead className="bg-[#0c0f1a]/60 text-slate-500 border-b border-indigo-500/[0.08] sticky top-0">
                  <tr><th className="px-4 py-2 text-left">Produto</th><th className="px-4 py-2 text-right w-24">Último Custo</th><th className="px-4 py-2 w-10"></th></tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/[0.06]">
                  {quoteProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-indigo-500/[0.04]">
                      <td className="px-4 py-2.5 text-white font-semibold">{p.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">R$ {p.cost?.toFixed(2) ?? "0,00"}</td>
                      <td className="px-4 py-2.5 text-center"><button onClick={() => setQuoteProducts(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-red-400"><X size={12}/></button></td>
                    </tr>
                  ))}
                  {!quoteProducts.length && <tr><td colSpan={3} className="text-center p-10 text-slate-500 italic">Busque produtos acima para adicionar à cotação.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: ANALYSIS ────────────────────────────────────── */}
      {tab === "analysis" && (
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-hidden">
          {/* Quote selector */}
          <div className="flex items-center gap-3 shrink-0">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cotação:</label>
            <select value={selectedAnalysisQuote?.id}
              onChange={e => { const q = activeQuotes.find(x => x.id === e.target.value); if (q) setSelectedAnalysisQuote(q); }}
              className="bg-[#111528] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none text-sm font-semibold">
              {activeQuotes.map(q => <option key={q.id} value={q.id}>{q.id} ({q.responses.length} respostas)</option>)}
            </select>
          </div>

          {selectedAnalysisQuote && selectedAnalysisQuote.responses.length > 0 && (() => {
            const bestPrices = getBestPricePerProduct(selectedAnalysisQuote);
            const bestSupplier = getBestSupplier(selectedAnalysisQuote);
            return (
              <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-hidden">
                {/* Best supplier card */}
                {bestSupplier && (
                  <div className="shrink-0 flex items-center gap-4 p-4 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Star size={18} className="text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">🏆 Proposta Recomendada — Melhor Preço Total</p>
                      <p className="text-white font-black text-base">{bestSupplier.supplierName}</p>
                      <p className="text-xs text-emerald-300">Total: <strong className="font-mono">R$ {fmt(calcSupplierTotal(selectedAnalysisQuote, bestSupplier))}</strong> · Pagamento: {bestSupplier.paymentProposal}</p>
                    </div>
                    <button onClick={() => handleCreateOrderFromBestQuote(selectedAnalysisQuote)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition-all">
                      <ShoppingCart size={12}/> Criar Pedido com Este Fornecedor
                    </button>
                  </div>
                )}

                {/* Comparison table */}
                <div className="flex-1 bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex flex-col min-h-0">
                  <div className="overflow-auto flex-1 min-h-0">
                    <table className="w-full text-xs">
                      <thead className="bg-[#0c0f1a]/70 text-slate-500 border-b border-indigo-500/[0.08] sticky top-0 z-10">
                        <tr>
                          <th className="px-5 py-3 text-left font-bold uppercase tracking-wider w-48">Produto</th>
                          <th className="px-5 py-3 text-right font-bold uppercase text-slate-600">Qtd</th>
                          {selectedAnalysisQuote.responses.map(r => (
                            <th key={r.supplierId} className="px-5 py-3 text-center font-bold uppercase tracking-wider min-w-36">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={bestSupplier?.supplierId === r.supplierId ? "text-emerald-400" : ""}>{r.supplierName.split(" ")[0]}</span>
                                {bestSupplier?.supplierId === r.supplierId && <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold">MENOR PREÇO</span>}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-500/[0.06]">
                        {selectedAnalysisQuote.products.map(p => (
                          <tr key={p.id} className="hover:bg-indigo-500/[0.04] transition-colors">
                            <td className="px-5 py-3 text-white font-semibold">{p.name}</td>
                            <td className="px-5 py-3 text-right text-slate-500 font-mono">{p.qty}</td>
                            {selectedAnalysisQuote.responses.map(r => {
                              const price = r.prices[p.id] ?? 0;
                              const isBest = bestPrices[p.id]?.supplierId === r.supplierId;
                              return (
                                <td key={r.supplierId} className={`px-5 py-3 text-center ${isBest ? "bg-emerald-500/5" : ""}`}>
                                  <div className="flex flex-col items-center">
                                    <span className={`font-mono font-bold ${isBest ? "text-emerald-400" : "text-slate-300"}`}>
                                      R$ {price.toFixed(2)}
                                    </span>
                                    {isBest && <TrendingDown size={10} className="text-emerald-500 mt-0.5" />}
                                    <span className="text-[9px] text-slate-600">un.</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-indigo-500/15 bg-[#0c0f1a]/60 sticky bottom-0">
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px]">Total Geral</td>
                          <td />
                          {selectedAnalysisQuote.responses.map(r => {
                            const t = calcSupplierTotal(selectedAnalysisQuote, r);
                            const isBest = bestSupplier?.supplierId === r.supplierId;
                            return (
                              <td key={r.supplierId} className={`px-5 py-3 text-center ${isBest ? "bg-emerald-500/5" : ""}`}>
                                <div className="flex flex-col items-center">
                                  <span className={`font-mono font-black text-sm ${isBest ? "text-emerald-400" : "text-slate-300"}`}>R$ {fmt(t)}</span>
                                  <span className="text-[9px] text-slate-500">{r.paymentProposal}</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {selectedAnalysisQuote && !selectedAnalysisQuote.responses.length && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Clock size={40} className="mx-auto text-slate-600" />
                <p className="text-slate-400 font-semibold">Aguardando respostas dos fornecedores...</p>
                <p className="text-slate-600 text-xs">Os fornecedores foram notificados. A análise aparecerá aqui quando responderem.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Receive NF Modal ─────────────────────────────────── */}
      {receiveModal && (
        <ReceiveModal
          order={receiveModal}
          onClose={() => setReceiveModal(null)}
          onConfirm={handleMarkReceived}
        />
      )}

      {/* ── Cadastro Rápido Fornecedor Modal ─────────────────── */}
      {isQuickSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[#0c0f1a]/50">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Truck className="text-indigo-400" size={16} /> Cadastro Rápido de Fornecedor
              </h3>
              <button type="button" onClick={() => setIsQuickSupplierModalOpen(false)} className="p-1 hover:bg-indigo-500/10 rounded-lg text-slate-500"><X size={18}/></button>
            </div>
            <form onSubmit={handleQuickSupplierSave} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">Razão Social / Nome *</label>
                <input required value={quickSupplierName} onChange={e => setQuickSupplierName(e.target.value)} placeholder="Distribuidora de Alimentos..." className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">CNPJ</label>
                <input value={quickSupplierCnpj} onChange={e => setQuickSupplierCnpj(e.target.value)} placeholder="00.000.000/0001-00" className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">E-mail de Cotação</label>
                <input type="email" value={quickSupplierEmail} onChange={e => setQuickSupplierEmail(e.target.value)} placeholder="cotacao@fornecedor.com" className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none text-xs" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsQuickSupplierModalOpen(false)} className="flex-1 bg-[#0c0f1a] hover:bg-[#161b33] text-slate-400 font-semibold py-2.5 rounded-xl border border-indigo-500/10 text-xs">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl shadow-lg text-xs">Salvar Fornecedor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
