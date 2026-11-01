"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays,
  AlertTriangle,
  ShieldAlert,
  Package,
  CheckCircle2,
  Search,
  Download,
  Plus,
  X,
} from "lucide-react";
import { getLossesAndExpirationsData, registerProductBatch } from "@/actions/losses";

export default function ExpirationsPage() {
  const [search, setSearch] = useState("");
  const [filterTerm, setFilterTerm] = useState("Todos os Prazos");
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    setLoading(true);
    try {
      const res = await getLossesAndExpirationsData();
      if (res.success) {
        setProducts(res.products || []);
        setBatches(
          (res.expirations || []).map((b: any) => ({
            id: b.id,
            name: b.product,
            unit: b.unit || "UN",
            batch: b.source === "PRODUCAO" ? `${b.batch} (Produção Própria)` : b.batch,
            qty: b.qty,
            date: b.dateFormatted,
            daysLeft: b.daysLeft,
            type:
              b.daysLeft <= 5
                ? "critical"
                : b.daysLeft <= 10
                ? "warning"
                : b.daysLeft <= 15
                ? "attention"
                : "safe",
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    const res = await registerProductBatch({
      productId: f.get("productId") as string,
      batchNumber: f.get("batchNumber") as string,
      expirationDate: f.get("expirationDate") as string,
      quantity: Number(f.get("quantity")),
    });
    setSubmitting(false);
    if (res.success) {
      setIsModalOpen(false);
      await loadBatches();
    } else {
      alert(res.error || "Erro ao salvar lote.");
    }
  }

  function handleExportCsv() {
    const header = "Produto;Lote;Quantidade;Unidade;Data_Validade;Dias_Restantes\n";
    const rows = filteredBatches
      .map((b) => `"${b.name}";"${b.batch}";${b.qty};${b.unit};${b.date};${b.daysLeft}`)
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_validades_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.batch.toLowerCase().includes(search.toLowerCase());
    if (filterTerm === "Crítico (Até 5 dias)") return matchesSearch && b.type === "critical";
    if (filterTerm === "Atenção (6 a 15 dias)")
      return matchesSearch && (b.type === "warning" || b.type === "attention");
    return matchesSearch;
  });

  const criticalCount = batches.filter((b) => b.daysLeft <= 5).length;
  const warningCount = batches.filter((b) => b.daysLeft > 5 && b.daysLeft <= 10).length;
  const attentionCount = batches.filter((b) => b.daysLeft > 10 && b.daysLeft <= 15).length;
  const safeCount = batches.filter((b) => b.daysLeft > 15).length;

  return (
    <div className="w-full flex flex-col gap-5 select-none pb-16">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Controle de Validades e Lotes
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Monitoramento em tempo real dos lotes do estoque e da produção própria (doces e carnes congeladas).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20 text-sm"
          >
            <Plus size={16} /> + Cadastrar Lote
          </button>
          <button
            onClick={handleExportCsv}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 text-sm"
          >
            <Download size={16} /> Baixar Relatório (.CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <StatusCard
          title="Vence em até 5 dias"
          value={`${criticalCount} lotes`}
          type="critical"
          icon={<ShieldAlert size={22} />}
        />
        <StatusCard
          title="Vence em 6 a 10 dias"
          value={`${warningCount} lotes`}
          type="warning"
          icon={<AlertTriangle size={22} />}
        />
        <StatusCard
          title="Vence em 11 a 15 dias"
          value={`${attentionCount} lotes`}
          type="attention"
          icon={<CalendarDays size={22} />}
        />
        <StatusCard
          title="Estoque Seguro (+15d)"
          value={`${safeCount} lotes`}
          type="safe"
          icon={<CheckCircle2 size={22} />}
        />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex gap-3 shrink-0">
          <select
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white max-w-[200px] font-medium"
          >
            <option>Todos os Prazos</option>
            <option>Crítico (Até 5 dias)</option>
            <option>Atenção (6 a 15 dias)</option>
          </select>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar lote ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 rounded-xl outline-none text-sm font-medium placeholder:text-gray-400 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs">Produto</th>
                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs">Lote / Origem</th>
                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs">Qtd Estoque</th>
                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs">Data Validade</th>
                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm font-bold">
                    Carregando lotes do banco de dados...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Nenhum lote encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b, idx) => (
                  <BatchRow
                    key={b.id || idx}
                    name={b.name}
                    batch={b.batch}
                    qty={b.qty}
                    unit={b.unit}
                    date={b.date}
                    daysLeft={b.daysLeft}
                    type={b.type as any}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Cadastrar Lote */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Cadastrar Novo Lote e Validade</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateBatch} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Produto</label>
                <select
                  name="productId"
                  required
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 rounded-xl text-sm font-semibold"
                >
                  <option value="">Selecione um produto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Código do Lote</label>
                  <input
                    name="batchNumber"
                    required
                    defaultValue={`L-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Quantidade</label>
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    defaultValue="10"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Data de Validade</label>
                <input
                  name="expirationDate"
                  type="date"
                  required
                  defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 rounded-xl text-sm font-bold"
                />
              </div>
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm"
                >
                  {submitting ? "Salvando..." : "Salvar Lote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  title,
  value,
  type,
  icon,
}: {
  title: string;
  value: string;
  type: "critical" | "warning" | "attention" | "safe";
  icon: React.ReactNode;
}) {
  const styles = {
    critical: { icon: "bg-red-50 text-red-600 border border-red-100" },
    warning: { icon: "bg-orange-50 text-orange-600 border border-orange-100" },
    attention: { icon: "bg-amber-50 text-amber-600 border border-amber-100" },
    safe: { icon: "bg-emerald-50 text-emerald-600 border border-emerald-100" },
  };
  const s = styles[type];
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-gray-300 transition-all flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.icon}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider truncate">{title}</p>
        <p className="text-2xl font-black text-gray-900 font-mono tracking-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function BatchRow({
  name,
  batch,
  qty,
  unit,
  date,
  daysLeft,
  type,
}: {
  name: string;
  batch: string;
  qty: number;
  unit: string;
  date: string;
  daysLeft: number;
  type: "critical" | "warning" | "attention" | "safe";
}) {
  const badge = {
    critical: "bg-red-100 text-red-700 border border-red-200",
    warning: "bg-orange-100 text-orange-700 border border-orange-200",
    attention: "bg-amber-100 text-amber-700 border border-amber-200",
    safe: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  };
  const labels = {
    critical: daysLeft <= 0 ? "⚠ Vencido" : `⚠ Vence em ${daysLeft} dias`,
    warning: `Vence em ${daysLeft} dias`,
    attention: `Vence em ${daysLeft} dias`,
    safe: `No prazo (${daysLeft}d)`,
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 text-gray-400 flex items-center justify-center shrink-0">
            <Package size={15} />
          </div>
          <span className="font-bold text-gray-900">{name}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{batch}</td>
      <td className="px-6 py-4 font-bold text-gray-700">
        {qty} {unit}
      </td>
      <td className="px-6 py-4 text-gray-600 font-mono text-xs font-semibold">{date}</td>
      <td className="px-6 py-4 text-right">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badge[type]}`}>{labels[type]}</span>
      </td>
    </tr>
  );
}
