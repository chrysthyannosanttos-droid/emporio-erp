"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  Plus,
  X,
  DollarSign,
  BarChart2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Receipt,
  Download,
  Landmark,
} from "lucide-react";
import { BankReconciliationView } from "./_components/BankReconciliationView";
import {
  getFinanceData,
  createFinanceTransaction,
  updateFinanceTransactionStatus,
} from "@/actions/finance";

// ─── Types ───────────────────────────────────────
type TabKey = "cashflow" | "reconciliation" | "closings" | "payable" | "receivable";

interface Transaction {
  id: string;
  date: string;
  desc: string;
  cat: string;
  status: "PAID" | "PENDING" | "OVERDUE";
  amount: number;
  method?: string;
}

interface CashClosing {
  id: string;
  date: string;
  cashier: number;
  operator: string;
  totalSales: number;
  money: number;
  pix: number;
  credit: number;
  debit: number;
  withdrawals: number;
  expected: number;
  counted: number;
  status: "OK" | "DIFF";
}

interface Payable {
  id: string;
  desc: string;
  supplier: string;
  due: string;
  dueDate: string;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  category: string;
  daysLeft: number;
}

interface Receivable {
  id: string;
  desc: string;
  customer: string;
  due: string;
  dueDate: string;
  amount: number;
  status: "PENDING" | "RECEIVED" | "OVERDUE";
  daysLeft: number;
}

function addDaysIso(offset: number): { iso: string; br: string } {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return { iso: `${y}-${m}-${day}`, br: `${day}/${m}/${y}` };
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "text-emerald-700 bg-emerald-50 border-emerald-200",
    PENDING: "text-amber-700 bg-amber-50 border-amber-200",
    OVERDUE: "text-red-700 bg-red-50 border-red-200",
    OK: "text-emerald-700 bg-emerald-50 border-emerald-200",
    DIFF: "text-red-700 bg-red-50 border-red-200",
    RECEIVED: "text-emerald-700 bg-emerald-50 border-emerald-200",
  };
  const labels: Record<string, string> = {
    PAID: "Pago",
    PENDING: "Pendente",
    OVERDUE: "Vencido",
    OK: "Conferido",
    DIFF: "Divergência",
    RECEIVED: "Recebido",
  };
  return (
    <span
      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
        map[status] || "text-gray-600 bg-gray-100 border-gray-200"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────
export default function FinancePage() {
  const [tab, setTab] = useState<TabKey>("cashflow");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro de Data Definida pelo Usuário (De / Até) para A Pagar e A Receber
  const [payableStart, setPayableStart] = useState<string>(addDaysIso(0).iso);
  const [payableEnd, setPayableEnd] = useState<string>(addDaysIso(3).iso);
  const [receivableStart, setReceivableStart] = useState<string>(addDaysIso(0).iso);
  const [receivableEnd, setReceivableEnd] = useState<string>(addDaysIso(3).iso);

  // New transaction modal
  const [isOpen, setIsOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [provider, setProvider] = useState("");
  const [cat, setCat] = useState("Vendas");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(addDaysIso(0).iso);
  const [type, setType] = useState<"INFLOW" | "OUTFLOW" | "PAYABLE" | "RECEIVABLE">("INFLOW");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFinance();
  }, []);

  async function loadFinance() {
    setLoading(true);
    try {
      const res = await getFinanceData();
      if (res.success) {
        setTransactions(res.transactions || []);
        setPayables(res.payables || []);
        setReceivables(res.receivables || []);
        setClosings(res.closings || []);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;
    setSubmitting(true);
    const res = await createFinanceTransaction({
      type,
      description: desc,
      category: cat,
      amount: parseFloat(amount),
      dueDate,
      provider: provider.trim() || undefined,
    });
    setSubmitting(false);

    if (res.success) {
      setDesc("");
      setProvider("");
      setAmount("");
      setIsOpen(false);
      await loadFinance();
    } else {
      alert(res.error || "Erro ao salvar lançamento.");
    }
  };

  const markPayablePaid = async (id: string) => {
    await updateFinanceTransactionStatus({ id, status: "PAID" });
    await loadFinance();
  };

  const markReceivableReceived = async (id: string) => {
    await updateFinanceTransactionStatus({ id, status: "RECEIVED" });
    await loadFinance();
  };

  const handleExportCsv = () => {
    const header = "Data;Descricao;Categoria;Status;Valor\n";
    const rows = transactions
      .map((t) => `"${t.date}";"${t.desc}";"${t.cat}";"${t.status}";${t.amount.toFixed(2).replace(".", ",")}`)
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxo_caixa_${addDaysIso(0).iso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // KPIs
  const inflow = transactions.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const outflow = Math.abs(transactions.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0));
  const balance = inflow - outflow;
  const todayBr = addDaysIso(0).br;
  const todaySales = transactions
    .filter((t) => t.date === todayBr && t.amount > 0)
    .reduce((a, t) => a + t.amount, 0);

  // Cálculos de A Pagar filtrados pela data definida pelo usuário
  const openPayables = payables.filter((p) => p.status !== "PAID");
  const filteredPayablesByDate = openPayables.filter((p) => {
    const afterStart = !payableStart || p.dueDate >= payableStart;
    const beforeEnd = !payableEnd || p.dueDate <= payableEnd;
    return afterStart && beforeEnd;
  });
  const displayedPayableAmount = filteredPayablesByDate.reduce((a, p) => a + p.amount, 0);

  // Cálculos de A Receber filtrados pela data definida pelo usuário
  const openReceivables = receivables.filter((r) => r.status !== "RECEIVED");
  const filteredReceivablesByDate = openReceivables.filter((r) => {
    const afterStart = !receivableStart || r.dueDate >= receivableStart;
    const beforeEnd = !receivableEnd || r.dueDate <= receivableEnd;
    return afterStart && beforeEnd;
  });
  const displayedReceivableAmount = filteredReceivablesByDate.reduce((a, r) => a + r.amount, 0);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "cashflow", label: "Fluxo de Caixa", icon: <BarChart2 size={16} /> },
    { key: "reconciliation", label: "Conciliação Bancária (OFX)", icon: <Landmark size={16} /> },
    { key: "closings", label: "Fechamentos PDV", icon: <Receipt size={16} /> },
    { key: "payable", label: `Contas a Pagar (${openPayables.length})`, icon: <TrendingDown size={16} /> },
    { key: "receivable", label: `Contas a Receber (${openReceivables.length})`, icon: <TrendingUp size={16} /> },
  ];

  return (
    <div className="w-full flex flex-col gap-5 select-none pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Financeiro Integrado</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Conectado ao banco de dados — fluxo de caixa, vendas PDV, fechamentos e contas a pagar/receber
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <a
            href="/reports"
            className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-xs"
          >
            <BarChart2 size={16} /> Relatórios Financeiros
          </a>
          <button
            onClick={handleExportCsv}
            className="bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-sm cursor-pointer"
          >
            <Download size={16} /> Exportar (.CSV)
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-95 text-sm cursor-pointer"
          >
            <Plus size={16} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Entradas / Vendas Hoje */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-emerald-50 text-emerald-600 border-emerald-100">
                <DollarSign size={20} />
              </div>
              <span className="text-gray-500 text-xs font-bold">Entradas / Vendas Hoje</span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600">
              R$ {fmt(Math.abs(todaySales))}
            </div>
          </div>
          <div className="text-gray-400 text-xs mt-2 font-medium">
            Sincronizado com o PDV e Caixa
          </div>
        </div>

        {/* Card 2: Saldo do Mês */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  balance >= 0
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-red-50 text-red-600 border-red-100"
                }`}
              >
                <Wallet size={20} />
              </div>
              <span className="text-gray-500 text-xs font-bold">Saldo Realizado</span>
            </div>
            <div
              className={`text-2xl font-black font-mono ${
                balance >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              R$ {fmt(Math.abs(balance))}
            </div>
          </div>
          <div className="text-gray-400 text-xs mt-2 font-medium">Entradas - Saídas realizadas</div>
        </div>

        {/* Card 3: A Pagar (Filtro por Data Definida pelo Usuário) */}
        <div
          onClick={() => setTab("payable")}
          className="bg-white rounded-2xl p-4 border border-red-200/80 hover:border-red-400 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border bg-red-50 text-red-600 border-red-100 shrink-0">
                  <TrendingDown size={18} />
                </div>
                <div>
                  <span className="text-gray-800 text-xs font-black block leading-tight">A Pagar</span>
                  <span className="text-[10px] font-bold text-red-600">
                    {filteredPayablesByDate.length} título(s) no período
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPayableStart("");
                  setPayableEnd("");
                }}
                className="text-[10px] font-bold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-2 py-0.5 rounded-md border border-gray-200 transition-colors cursor-pointer"
                title="Mostrar todos os títulos em aberto"
              >
                Ver Tudo
              </button>
            </div>

            <div className="text-2xl font-black font-mono text-red-600 my-1">
              R$ {fmt(displayedPayableAmount)}
            </div>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-1.5"
          >
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5">De (Início)</label>
              <input
                type="date"
                value={payableStart}
                onChange={(e) => setPayableStart(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-red-500 rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-gray-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5">Até (Fim)</label>
              <input
                type="date"
                value={payableEnd}
                onChange={(e) => setPayableEnd(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-red-500 rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-gray-800 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 4: A Receber (Filtro por Data Definida pelo Usuário) */}
        <div
          onClick={() => setTab("receivable")}
          className="bg-white rounded-2xl p-4 border border-blue-200/80 hover:border-blue-400 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border bg-blue-50 text-blue-600 border-blue-100 shrink-0">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <span className="text-gray-800 text-xs font-black block leading-tight">A Receber</span>
                  <span className="text-[10px] font-bold text-blue-600">
                    {filteredReceivablesByDate.length} título(s) no período
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReceivableStart("");
                  setReceivableEnd("");
                }}
                className="text-[10px] font-bold text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-2 py-0.5 rounded-md border border-gray-200 transition-colors cursor-pointer"
                title="Mostrar todos os recebíveis em aberto"
              >
                Ver Tudo
              </button>
            </div>

            <div className="text-2xl font-black font-mono text-blue-600 my-1">
              R$ {fmt(displayedReceivableAmount)}
            </div>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-1.5"
          >
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5">De (Início)</label>
              <input
                type="date"
                value={receivableStart}
                onChange={(e) => setReceivableStart(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-gray-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5">Até (Fim)</label>
              <input
                type="date"
                value={receivableEnd}
                onChange={(e) => setReceivableEnd(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-gray-800 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex border-b border-gray-200 bg-gray-50/70 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                tab === t.key
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Fluxo de Caixa ── */}
        {tab === "cashflow" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 sticky top-0">
                  <tr>
                    {["Data", "Descrição", "Categoria", "Status", "Valor"].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 font-bold uppercase tracking-wider text-[11px] text-right last:text-right first:text-left"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold">
                        Carregando movimentações financeiras...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        Nenhuma movimentação registrada.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">{t.date}</td>
                        <td className="px-6 py-3.5 font-bold text-gray-900">{t.desc}</td>
                        <td className="px-6 py-3.5 text-right">
                          <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                            {t.cat}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <StatusBadge status={t.status} />
                        </td>
                        <td
                          className={`px-6 py-3.5 text-right font-black text-base font-mono ${
                            t.amount < 0 ? "text-red-600" : "text-emerald-600"
                          }`}
                        >
                          {t.amount < 0 ? "- " : "+ "}R$ {fmt(Math.abs(t.amount))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: Conciliação Bancária ── */}
        {tab === "reconciliation" && (
          <div className="p-5 flex-1 overflow-auto min-h-0 bg-gray-50/40">
            <BankReconciliationView />
          </div>
        )}

        {/* ── Tab: Fechamentos ── */}
        {tab === "closings" && (
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 sticky top-0">
                <tr>
                  {[
                    "Data/Hora",
                    "Caixa",
                    "Operador",
                    "Vendas",
                    "Dinheiro",
                    "PIX",
                    "Crédito",
                    "Débito",
                    "Sangrias",
                    "Esperado",
                    "Contado",
                    "Status",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {closings.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center text-gray-400">
                      Nenhum fechamento de caixa registrado ainda.
                    </td>
                  </tr>
                ) : (
                  closings.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{c.date}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-blue-600">CX {String(c.cashier).padStart(2, "0")}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-semibold whitespace-nowrap">{c.operator}</td>
                      <td className="px-4 py-3 font-black font-mono text-emerald-600">R$ {fmt(c.totalSales)}</td>
                      <td className="px-4 py-3 font-mono text-gray-700 text-xs">R$ {fmt(c.money)}</td>
                      <td className="px-4 py-3 font-mono text-blue-600 text-xs">R$ {fmt(c.pix)}</td>
                      <td className="px-4 py-3 font-mono text-purple-600 text-xs">R$ {fmt(c.credit)}</td>
                      <td className="px-4 py-3 font-mono text-sky-600 text-xs">R$ {fmt(c.debit)}</td>
                      <td className="px-4 py-3 font-mono text-red-600 text-xs">- R$ {fmt(c.withdrawals)}</td>
                      <td className="px-4 py-3 font-mono text-gray-500 text-xs">R$ {fmt(c.expected)}</td>
                      <td className="px-4 py-3 font-mono text-gray-900 text-xs font-bold">R$ {fmt(c.counted)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={c.status} />
                          {c.status === "DIFF" && (
                            <span className="text-red-600 text-xs font-mono">({fmt(c.counted - c.expected)})</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab: Contas a Pagar ── */}
        {tab === "payable" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-gray-50/30">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-gray-600 uppercase">Filtrar Vencimento:</span>
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
                  <span className="text-[11px] font-bold text-gray-400">De:</span>
                  <input
                    type="date"
                    value={payableStart}
                    onChange={(e) => setPayableStart(e.target.value)}
                    className="text-xs font-mono font-bold text-gray-800 outline-none"
                  />
                  <span className="text-[11px] font-bold text-gray-400 ml-1">Até:</span>
                  <input
                    type="date"
                    value={payableEnd}
                    onChange={(e) => setPayableEnd(e.target.value)}
                    className="text-xs font-mono font-bold text-gray-800 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPayableStart("");
                    setPayableEnd("");
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Limpar Filtro (Todos)
                </button>
              </div>
              <span className="text-xs font-bold text-gray-500">
                Total em aberto filtrado:{" "}
                <strong className="text-red-600 font-mono">R$ {fmt(displayedPayableAmount)}</strong>
              </span>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 sticky top-0">
                  <tr>
                    {[
                      "Descrição",
                      "Fornecedor",
                      "Categoria",
                      "Vencimento",
                      "Prazo",
                      "Status",
                      "Valor",
                      "Ação",
                    ].map((h) => (
                      <th key={h} className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payables
                    .filter((p) => {
                      const afterStart = !payableStart || p.dueDate >= payableStart;
                      const beforeEnd = !payableEnd || p.dueDate <= payableEnd;
                      return afterStart && beforeEnd;
                    })
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-gray-900">{p.desc}</td>
                        <td className="px-6 py-3.5 text-gray-500">{p.supplier}</td>
                        <td className="px-6 py-3.5">
                          <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                            {p.category}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-3.5 font-mono text-xs ${
                            p.daysLeft <= 0 && p.status !== "PAID" ? "text-red-600 font-bold" : "text-gray-500"
                          }`}
                        >
                          {p.due}
                        </td>
                        <td className="px-6 py-3.5">
                          {p.status === "PAID" ? (
                            <span className="text-gray-400 text-xs">—</span>
                          ) : (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                p.daysLeft <= 0
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : p.daysLeft <= 3
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {p.daysLeft === 0
                                ? "Vence Hoje"
                                : p.daysLeft < 0
                                ? `Atrasado ${Math.abs(p.daysLeft)}d`
                                : `${p.daysLeft}d restantes`}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-6 py-3.5 font-black font-mono text-red-600 text-base">
                          R$ {fmt(p.amount)}
                        </td>
                        <td className="px-6 py-3.5">
                          {p.status !== "PAID" && (
                            <button
                              onClick={() => markPayablePaid(p.id)}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 size={12} /> Dar Baixa (Pago)
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: Contas a Receber ── */}
        {tab === "receivable" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-gray-50/30">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-gray-600 uppercase">Filtrar Recebimento:</span>
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
                  <span className="text-[11px] font-bold text-gray-400">De:</span>
                  <input
                    type="date"
                    value={receivableStart}
                    onChange={(e) => setReceivableStart(e.target.value)}
                    className="text-xs font-mono font-bold text-gray-800 outline-none"
                  />
                  <span className="text-[11px] font-bold text-gray-400 ml-1">Até:</span>
                  <input
                    type="date"
                    value={receivableEnd}
                    onChange={(e) => setReceivableEnd(e.target.value)}
                    className="text-xs font-mono font-bold text-gray-800 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReceivableStart("");
                    setReceivableEnd("");
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Limpar Filtro (Todos)
                </button>
              </div>
              <span className="text-xs font-bold text-gray-500">
                Total a receber filtrado:{" "}
                <strong className="text-blue-600 font-mono">R$ {fmt(displayedReceivableAmount)}</strong>
              </span>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 sticky top-0">
                  <tr>
                    {[
                      "Descrição",
                      "Cliente / Adquirente",
                      "Vencimento",
                      "Prazo",
                      "Status",
                      "Valor",
                      "Ação",
                    ].map((h) => (
                      <th key={h} className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {receivables
                    .filter((r) => {
                      const afterStart = !receivableStart || r.dueDate >= receivableStart;
                      const beforeEnd = !receivableEnd || r.dueDate <= receivableEnd;
                      return afterStart && beforeEnd;
                    })
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-gray-900">{r.desc}</td>
                        <td className="px-6 py-3.5 text-gray-500">{r.customer}</td>
                        <td className="px-6 py-3.5 font-mono text-gray-500 text-xs">{r.due}</td>
                        <td className="px-6 py-3.5">
                          {r.status === "RECEIVED" ? (
                            <span className="text-gray-400 text-xs">—</span>
                          ) : (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                r.daysLeft <= 0
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : r.daysLeft <= 3
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {r.daysLeft === 0 ? "Recebe Hoje" : `${r.daysLeft}d restantes`}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-6 py-3.5 font-black font-mono text-blue-600 text-base">
                          R$ {fmt(r.amount)}
                        </td>
                        <td className="px-6 py-3.5">
                          {r.status !== "RECEIVED" && (
                            <button
                              onClick={() => markReceivableReceived(r.id)}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 size={12} /> Confirmar Recebimento
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── New Transaction Modal ── */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Wallet className="text-blue-600" /> Novo Lançamento Financeiro
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Tipo de Lançamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "INFLOW", label: "Entrada no Caixa", activeClass: "border-emerald-500 bg-emerald-50 text-emerald-700" },
                    { key: "OUTFLOW", label: "Saída do Caixa", activeClass: "border-red-500 bg-red-50 text-red-700" },
                    { key: "PAYABLE", label: "Conta a Pagar", activeClass: "border-amber-500 bg-amber-50 text-amber-800" },
                    { key: "RECEIVABLE", label: "Conta a Receber", activeClass: "border-blue-500 bg-blue-50 text-blue-700" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setType(opt.key as any)}
                      className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                        type === opt.key
                          ? opt.activeClass
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Descrição</label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-4 py-2.5 rounded-xl outline-none transition-all text-xs font-medium"
                  placeholder="Ex: Compra de insumos para doces, Conta de Energia..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Fornecedor / Cliente
                  </label>
                  <input
                    type="text"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-3 py-2.5 rounded-xl outline-none text-xs font-medium"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Data / Vencimento
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-3 py-2.5 rounded-xl outline-none text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Categoria</label>
                  <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-3 py-2.5 rounded-xl outline-none text-xs font-medium"
                  >
                    {["Vendas", "Despesas Fixas", "Fornecedores", "Pessoal", "Utilidades", "Aluguel", "Cartões", "Outros"].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-4 py-2.5 rounded-xl outline-none text-xs font-mono font-bold text-right"
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all text-xs disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : "Confirmar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
