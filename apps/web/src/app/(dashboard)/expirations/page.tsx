"use client";

import { useState } from "react";
import { CalendarDays, AlertTriangle, ShieldAlert, Package, CheckCircle2, Search } from "lucide-react";

export default function ExpirationsPage() {
  const [search, setSearch] = useState("");
  const [filterTerm, setFilterTerm] = useState("Todos os Prazos");

  const batches = [
    { name: "Leite Integral 1L", batch: "L-1029 (NF: 88392)", qty: 45, date: "17/06/2026", daysLeft: 5, type: "critical" },
    { name: "Queijo Mussarela 1kg", batch: "L-304A (NF: 88301)", qty: 12, date: "21/06/2026", daysLeft: 9, type: "warning" },
    { name: "Iogurte Morango 200g", batch: "L-998 (NF: 88410)", qty: 80, date: "25/06/2026", daysLeft: 13, type: "attention" },
    { name: "Arroz Branco 5kg", batch: "L-001 (NF: 88102)", qty: 200, date: "12/12/2026", daysLeft: 183, type: "safe" }
  ];

  const filteredBatches = batches.filter(b => {
    // Search filter
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.batch.toLowerCase().includes(search.toLowerCase());
    
    // Dropdown filter
    if (filterTerm === "Crítico (Até 5 dias)") {
      return matchesSearch && b.type === "critical";
    }
    if (filterTerm === "Atenção (6 a 15 dias)") {
      return matchesSearch && (b.type === "warning" || b.type === "attention");
    }
    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gestão de Validades</h1>
          <p className="text-slate-400 text-sm mt-1">Evite prejuízos monitorando o vencimento dos lotes de produtos perecíveis.</p>
        </div>
        <button 
          onClick={() => alert("Gerando PDF com relatórios de lotes críticos...")}
          className="bg-[#161b33] border border-indigo-500/15 text-slate-100 hover:bg-[#161b33] px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          Baixar Relatório (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard title="Vence em 5 dias" value="8 lotes" type="critical" icon={<ShieldAlert size={24} />} />
        <StatusCard title="Vence em 10 dias" value="12 lotes" type="warning" icon={<AlertTriangle size={24} />} />
        <StatusCard title="Vence em 15 dias" value="5 lotes" type="attention" icon={<CalendarDays size={24} />} />
        <StatusCard title="Estoque Seguro" value="340 lotes" type="safe" icon={<CheckCircle2 size={24} />} />
      </div>

      <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] shadow-xl overflow-hidden">
        <div className="p-4 border-b border-indigo-500/[0.08] bg-[#0c0f1a]/60 flex gap-4">
          <select 
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="bg-[#0c0f1a] border border-indigo-500/[0.08] text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 flex-1 max-w-[200px]"
          >
            <option>Todos os Prazos</option>
            <option>Crítico (Até 5 dias)</option>
            <option>Atenção (6 a 15 dias)</option>
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Buscar Lote ou Produto..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0c0f1a] pl-10 pr-4 py-2 border border-indigo-500/[0.08] focus:border-indigo-500 text-white rounded-xl outline-none text-sm"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-400">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Produto</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Lote / NF</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Qtd em Estoque</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Data de Validade</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/[0.06]">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Nenhum lote crítico encontrado com os filtros atuais.</td>
                </tr>
              ) : (
                filteredBatches.map((b, idx) => (
                  <BatchRow key={idx} name={b.name} batch={b.batch} qty={b.qty} date={b.date} daysLeft={b.daysLeft} type={b.type as any} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ title, value, type, icon }: { title: string, value: string, type: 'critical' | 'warning' | 'attention' | 'safe', icon: React.ReactNode }) {
  const styles = {
    critical: "bg-red-500/10 text-red-400 border border-red-500/20",
    warning: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    attention: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    safe: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
  };

  return (
    <div className="bg-[#111528] rounded-2xl p-6 border border-indigo-500/[0.08] shadow-xl relative overflow-hidden group">
      <div className={`absolute right-0 top-0 w-32 h-32 rounded-bl-full opacity-30 transition-transform group-hover:scale-110 ${styles[type].split(' ')[0]}`} />
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${styles[type]}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-slate-400 font-medium text-sm">{title}</h3>
          <div className="text-2xl font-black text-white">{value}</div>
        </div>
      </div>
    </div>
  );
}

function BatchRow({ name, batch, qty, date, daysLeft, type }: { name: string, batch: string, qty: number, date: string, daysLeft: number, type: 'critical' | 'warning' | 'attention' | 'safe' }) {
  const styles = {
    critical: "bg-red-500/10 text-red-400 border border-red-500/20",
    warning: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    attention: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    safe: "bg-[#161b33] text-slate-400 border border-indigo-500/15"
  };

  const labels = {
    critical: `Vence em ${daysLeft} dias`,
    warning: `Vence em ${daysLeft} dias`,
    attention: `Vence em ${daysLeft} dias`,
    safe: `No prazo`
  };

  return (
    <tr className="hover:bg-indigo-500/[0.04] transition-colors group cursor-pointer">
      <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0c0f1a] border border-indigo-500/[0.08] text-slate-500 flex items-center justify-center">
          <Package size={16} />
        </div>
        {name}
      </td>
      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{batch}</td>
      <td className="px-6 py-4 font-bold text-slate-300">{qty} UN</td>
      <td className="px-6 py-4 text-slate-400 font-mono text-xs font-semibold">{date}</td>
      <td className="px-6 py-4 text-right">
        <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${styles[type]}`}>
          {labels[type]}
        </span>
      </td>
    </tr>
  );
}
