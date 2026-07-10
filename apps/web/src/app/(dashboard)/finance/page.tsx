"use client";

import { useState } from "react";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Filter, Plus, X,
  DollarSign, BarChart2, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, CreditCard, QrCode, Banknote,
  Receipt, Calendar, ChevronRight, Download
} from "lucide-react";

// ─── Types ───────────────────────────────────────
type TabKey = "cashflow" | "closings" | "payable" | "receivable";

interface Transaction {
  id: string; date: string; desc: string; cat: string;
  status: "PAID" | "PENDING" | "OVERDUE"; amount: number; method?: string;
}

interface CashClosing {
  id: string; date: string; cashier: number; operator: string;
  totalSales: number; money: number; pix: number; credit: number;
  debit: number; withdrawals: number; expected: number; counted: number;
  status: "OK" | "DIFF";
}

interface Payable {
  id: string; desc: string; supplier: string; due: string;
  amount: number; status: "PENDING" | "PAID" | "OVERDUE"; category: string;
}

interface Receivable {
  id: string; desc: string; customer: string; due: string;
  amount: number; status: "PENDING" | "RECEIVED" | "OVERDUE"; daysLeft: number;
}

// ─── Mock Data ────────────────────────────────────
const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "1", date: "13/06/2026", desc: "Vendas PDV Caixa 01 — Turno Manhã", cat: "Vendas", status: "PAID", amount: 4820.50, method: "Múltiplos" },
  { id: "2", date: "13/06/2026", desc: "Vendas PDV Caixa 02 — Turno Manhã", cat: "Vendas", status: "PAID", amount: 3210.00, method: "Múltiplos" },
  { id: "3", date: "12/06/2026", desc: "Pagamento Fornecedor Distribuidora XYZ", cat: "Fornecedores", status: "PAID", amount: -3500.00 },
  { id: "4", date: "12/06/2026", desc: "Conta de Energia Elétrica", cat: "Despesas Fixas", status: "PAID", amount: -780.00 },
  { id: "5", date: "15/06/2026", desc: "Internet + Telefone", cat: "Despesas Fixas", status: "PENDING", amount: -250.00 },
  { id: "6", date: "20/06/2026", desc: "Aluguel do Imóvel", cat: "Despesas Fixas", status: "PENDING", amount: -3200.00 },
  { id: "7", date: "10/06/2026", desc: "Devolução de Mercadoria — Cliente Ana", cat: "Devoluções", status: "PAID", amount: -120.00 },
  { id: "8", date: "11/06/2026", desc: "Venda de Sucata / Papelão", cat: "Outros", status: "PAID", amount: 85.00 },
];

const MOCK_CLOSINGS: CashClosing[] = [
  { id: "1", date: "13/06/2026 12:00", cashier: 1, operator: "Maria Silva", totalSales: 4820.50, money: 1200, pix: 1820.50, credit: 1200, debit: 600, withdrawals: 200, expected: 1200, counted: 1200, status: "OK" },
  { id: "2", date: "13/06/2026 12:05", cashier: 2, operator: "João Santos", totalSales: 3210.00, money: 850, pix: 1100, credit: 860, debit: 400, withdrawals: 0, expected: 850, counted: 850, status: "OK" },
  { id: "3", date: "12/06/2026 18:00", cashier: 1, operator: "Carlos Lima", totalSales: 5120.00, money: 1500, pix: 2000, credit: 1020, debit: 600, withdrawals: 300, expected: 1350, counted: 1320, status: "DIFF" },
  { id: "4", date: "12/06/2026 18:10", cashier: 3, operator: "Ana Costa", totalSales: 2800.00, money: 700, pix: 1200, credit: 600, debit: 300, withdrawals: 100, expected: 700, counted: 700, status: "OK" },
];

const MOCK_PAYABLE: Payable[] = [
  { id: "1", desc: "Nota Fiscal #45892 — Distribuidora ABC", supplier: "Distribuidora ABC", due: "15/06/2026", amount: 8500.00, status: "PENDING", category: "Fornecedores" },
  { id: "2", desc: "Conta de Energia — CPFL", supplier: "CPFL Energia", due: "10/06/2026", amount: 780.00, status: "OVERDUE", category: "Utilidades" },
  { id: "3", desc: "Aluguel Junho 2026", supplier: "Imobiliária Central", due: "20/06/2026", amount: 3200.00, status: "PENDING", category: "Aluguel" },
  { id: "4", desc: "Internet — Vivo Fibra", supplier: "Vivo", due: "18/06/2026", amount: 250.00, status: "PENDING", category: "Utilidades" },
  { id: "5", desc: "Folha de Pagamento — Jun/2026", supplier: "Colaboradores", due: "05/07/2026", amount: 12500.00, status: "PENDING", category: "Pessoal" },
  { id: "6", desc: "NF #22110 — Fornecedor Beta", supplier: "Fornecedor Beta", due: "01/06/2026", amount: 2200.00, status: "PAID", category: "Fornecedores" },
];

const MOCK_RECEIVABLE: Receivable[] = [
  { id: "1", desc: "Crédito no caixa — Venda #10291", customer: "Cliente Avulso", due: "13/06/2026", amount: 450.00, status: "RECEIVED", daysLeft: 0 },
  { id: "2", desc: "Crediário parcela 2/6 — Pedro Alves", customer: "Pedro Alves", due: "20/06/2026", amount: 200.00, status: "PENDING", daysLeft: 7 },
  { id: "3", desc: "Crediário parcela 3/6 — Loja Norte", customer: "Loja Norte", due: "25/06/2026", amount: 850.00, status: "PENDING", daysLeft: 12 },
  { id: "4", desc: "Boleto vencido — Empresa Sul", customer: "Empresa Sul", due: "05/06/2026", amount: 1200.00, status: "OVERDUE", daysLeft: -8 },
  { id: "5", desc: "Venda a prazo — Ana Oliveira", customer: "Ana Oliveira", due: "30/06/2026", amount: 320.00, status: "PENDING", daysLeft: 17 },
];

// ─── Helpers ──────────────────────────────────────
function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    OVERDUE: "text-red-400 bg-red-500/10 border-red-500/20",
    OK: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    DIFF: "text-red-400 bg-red-500/10 border-red-500/20",
    RECEIVED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };
  const labels: Record<string, string> = {
    PAID: "Pago", PENDING: "Pendente", OVERDUE: "Vencido",
    OK: "Conferido", DIFF: "Divergência", RECEIVED: "Recebido",
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[status] || "text-slate-400 bg-slate-500/10 border-slate-500/20"}`}>
      {labels[status] || status}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────
export default function FinancePage() {
  const [tab, setTab] = useState<TabKey>("cashflow");
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [payables, setPayables] = useState(MOCK_PAYABLE);
  const [receivables] = useState(MOCK_RECEIVABLE);

  // New transaction modal
  const [isOpen, setIsOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("Vendas");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INFLOW" | "OUTFLOW">("INFLOW");

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;
    const parsedAmount = parseFloat(amount) * (type === "OUTFLOW" ? -1 : 1);
    setTransactions(prev => [{
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("pt-BR"),
      desc, cat, status: "PENDING",
      amount: parsedAmount
    }, ...prev]);
    setDesc(""); setAmount(""); setIsOpen(false);
  };

  const markPayablePaid = (id: string) => {
    setPayables(prev => prev.map(p => p.id === id ? { ...p, status: "PAID" } : p));
  };

  // KPIs
  const inflow = transactions.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const outflow = Math.abs(transactions.filter(t => t.amount < 0).reduce((a, t) => a + t.amount, 0));
  const balance = inflow - outflow;
  const todaySales = MOCK_CLOSINGS.filter(c => c.date.startsWith("13/06")).reduce((a, c) => a + c.totalSales, 0);
  const totalDue = payables.filter(p => p.status === "PENDING" || p.status === "OVERDUE").reduce((a, p) => a + p.amount, 0);
  const totalReceivable = receivables.filter(r => r.status === "PENDING" || r.status === "OVERDUE").reduce((a, r) => a + r.amount, 0);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "cashflow", label: "Fluxo de Caixa", icon: <BarChart2 size={16} /> },
    { key: "closings", label: "Fechamentos", icon: <Receipt size={16} /> },
    { key: "payable", label: "Contas a Pagar", icon: <TrendingDown size={16} /> },
    { key: "receivable", label: "Contas a Receber", icon: <TrendingUp size={16} /> },
  ];

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Financeiro</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão financeira completa — fluxo de caixa, fechamentos e contas</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-[#161b33] border border-indigo-500/15 text-slate-300 hover:bg-[#161b33] px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm">
            <Download size={16} /> Exportar
          </button>
          <button onClick={() => setIsOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-sm">
            <Plus size={16} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Vendas Hoje", value: todaySales, icon: <DollarSign size={20} />, color: "emerald", sub: `${MOCK_CLOSINGS.filter(c=>c.date.startsWith("13/06")).length} fechamentos` },
          { label: "Saldo do Mês", value: balance, icon: <Wallet size={20} />, color: balance >= 0 ? "emerald" : "red", sub: `Entradas - Saídas` },
          { label: "A Pagar", value: totalDue, icon: <TrendingDown size={20} />, color: "red", sub: `${payables.filter(p=>p.status!=="PAID").length} títulos pendentes` },
          { label: "A Receber", value: totalReceivable, icon: <TrendingUp size={20} />, color: "sky", sub: `${receivables.filter(r=>r.status!=="RECEIVED").length} títulos em aberto` },
        ].map(k => (
          <div key={k.label} className="bg-[#111528] rounded-2xl p-5 border border-indigo-500/[0.08] shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                k.color === "emerald" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                k.color === "red" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                "bg-sky-500/10 text-sky-400 border-sky-500/20"
              }`}>{k.icon}</div>
              <span className="text-slate-400 text-xs font-semibold">{k.label}</span>
            </div>
            <div className={`text-xl font-black font-mono ${
              k.color === "emerald" ? "text-emerald-400" :
              k.color === "red" ? "text-red-400" : "text-sky-400"
            }`}>
              R$ {fmt(Math.abs(k.value))}
            </div>
            <div className="text-slate-600 text-xs mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] shadow-xl overflow-hidden">
        <div className="flex border-b border-indigo-500/[0.08]">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                tab === t.key
                  ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-indigo-500/[0.06]"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Fluxo de Caixa ── */}
        {tab === "cashflow" && (
          <div>
            <div className="p-4 border-b border-indigo-500/[0.08] flex gap-3">
              {["Hoje", "Esta Semana", "Este Mês", "Personalizado"].map(f => (
                <button key={f} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-500/15 text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors">
                  {f}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-400">
                  <tr>
                    {["Data", "Descrição", "Categoria", "Status", "Valor"].map(h => (
                      <th key={h} className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right last:text-right first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/[0.06]">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-indigo-500/[0.04] transition-colors cursor-pointer">
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{t.date}</td>
                      <td className="px-6 py-4 font-semibold text-white">{t.desc}</td>
                      <td className="px-6 py-4">
                        <span className="bg-[#161b33] border border-indigo-500/15 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold">{t.cat}</span>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                      <td className={`px-6 py-4 text-right font-black text-lg font-mono ${t.amount < 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {t.amount < 0 ? "- " : "+ "}R$ {fmt(Math.abs(t.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: Fechamentos ── */}
        {tab === "closings" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-400">
                <tr>
                  {["Data/Hora", "Caixa", "Operador", "Vendas", "Dinheiro", "PIX", "Crédito", "Débito", "Sangrias", "Esperado", "Contado", "Status"].map(h => (
                    <th key={h} className="px-4 py-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {MOCK_CLOSINGS.map(c => (
                  <tr key={c.id} className="hover:bg-indigo-500/[0.04] transition-colors cursor-pointer group">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{c.date}</td>
                    <td className="px-4 py-3"><span className="font-black text-slate-100">CX {String(c.cashier).padStart(2,"0")}</span></td>
                    <td className="px-4 py-3 text-slate-300 font-semibold whitespace-nowrap">{c.operator}</td>
                    <td className="px-4 py-3 font-black font-mono text-emerald-400">R$ {fmt(c.totalSales)}</td>
                    <td className="px-4 py-3 font-mono text-slate-300 text-xs">R$ {fmt(c.money)}</td>
                    <td className="px-4 py-3 font-mono text-sky-400 text-xs">R$ {fmt(c.pix)}</td>
                    <td className="px-4 py-3 font-mono text-violet-400 text-xs">R$ {fmt(c.credit)}</td>
                    <td className="px-4 py-3 font-mono text-blue-400 text-xs">R$ {fmt(c.debit)}</td>
                    <td className="px-4 py-3 font-mono text-red-400 text-xs">- R$ {fmt(c.withdrawals)}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">R$ {fmt(c.expected)}</td>
                    <td className="px-4 py-3 font-mono text-slate-100 text-xs font-bold">R$ {fmt(c.counted)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={c.status} />
                        {c.status === "DIFF" && (
                          <span className="text-red-400 text-xs font-mono">({fmt(c.counted - c.expected)})</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab: Contas a Pagar ── */}
        {tab === "payable" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-400">
                <tr>
                  {["Descrição", "Fornecedor", "Categoria", "Vencimento", "Status", "Valor", "Ação"].map(h => (
                    <th key={h} className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {payables.map(p => (
                  <tr key={p.id} className="hover:bg-indigo-500/[0.04] transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{p.desc}</td>
                    <td className="px-6 py-4 text-slate-400">{p.supplier}</td>
                    <td className="px-6 py-4">
                      <span className="bg-[#161b33] border border-indigo-500/15 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold">{p.category}</span>
                    </td>
                    <td className={`px-6 py-4 font-mono text-sm ${p.status === "OVERDUE" ? "text-red-400 font-bold" : "text-slate-400"}`}>
                      {p.status === "OVERDUE" && <AlertTriangle size={12} className="inline mr-1" />}
                      {p.due}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                    <td className="px-6 py-4 font-black font-mono text-red-400 text-lg">R$ {fmt(p.amount)}</td>
                    <td className="px-6 py-4">
                      {p.status !== "PAID" && (
                        <button
                          onClick={() => markPayablePaid(p.id)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} /> Marcar Pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab: Contas a Receber ── */}
        {tab === "receivable" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-400">
                <tr>
                  {["Descrição", "Cliente", "Vencimento", "Aging", "Status", "Valor"].map(h => (
                    <th key={h} className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {receivables.map(r => (
                  <tr key={r.id} className="hover:bg-indigo-500/[0.04] transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{r.desc}</td>
                    <td className="px-6 py-4 text-slate-400">{r.customer}</td>
                    <td className="px-6 py-4 font-mono text-slate-400 text-sm">{r.due}</td>
                    <td className="px-6 py-4">
                      {r.status === "RECEIVED" ? (
                        <span className="text-slate-500 text-xs">—</span>
                      ) : (
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          r.daysLeft < 0 ? "bg-red-500/10 text-red-400" :
                          r.daysLeft <= 3 ? "bg-amber-500/10 text-amber-400" :
                          "bg-[#161b33] text-slate-400"
                        }`}>
                          {r.daysLeft < 0 ? `${Math.abs(r.daysLeft)}d vencido` : `${r.daysLeft}d restantes`}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-4 font-black font-mono text-sky-400 text-lg">R$ {fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── New Transaction Modal ── */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/[0.08] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[#0c0f1a]/60">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet className="text-indigo-400" /> Nova Transação
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-[#161b33] text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["INFLOW", "OUTFLOW"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                        type === t
                          ? t === "INFLOW" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-red-500 bg-red-500/10 text-red-400"
                          : "border-indigo-500/[0.08] bg-[#0c0f1a]/60 text-slate-400 hover:border-indigo-500/15"
                      }`}
                    >
                      {t === "INFLOW" ? "Entrada / Receita" : "Saída / Despesa"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Descrição</label>
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
                  className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none transition-all text-sm"
                  placeholder="Ex: Conta de internet, Venda de Mercadoria..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Categoria</label>
                  <select value={cat} onChange={e => setCat(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2.5 rounded-xl outline-none text-sm">
                    {["Vendas", "Despesas Fixas", "Fornecedores", "Pessoal", "Utilidades", "Outros"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm font-mono text-right"
                    placeholder="0,00" required />
                </div>
              </div>
              <div className="pt-4 border-t border-indigo-500/[0.08] flex gap-3">
                <button type="button" onClick={() => setIsOpen(false)}
                  className="flex-1 bg-[#0c0f1a] hover:bg-[#161b33] text-slate-300 font-bold py-3 rounded-xl border border-indigo-500/[0.08] text-sm transition-colors">
                  Voltar
                </button>
                <button type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm">
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
