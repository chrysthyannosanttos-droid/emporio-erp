"use client";

import { useState, useEffect } from "react";
import { 
  Receipt, FileText, CheckCircle2, XCircle, AlertCircle, 
  Download, Copy, RefreshCw, Eye, Search, Printer 
} from "lucide-react";
import { getInvoices, cancelInvoice } from "@/actions/invoice";

export default function FiscalPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    setError("");
    const res = await getInvoices();
    if (res.invoices) {
      setInvoices(res.invoices);
    } else {
      setError(res.error || "Erro ao buscar notas fiscais.");
    }
    setLoading(false);
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm("Deseja realmente solicitar o cancelamento desta nota fiscal na SEFAZ?")) return;
    setError("");
    setSuccess("");

    const res = await cancelInvoice(invoiceId);
    if (res.success) {
      setSuccess("Nota fiscal cancelada com sucesso na SEFAZ.");
      loadInvoices();
    } else {
      setError(res.error || "Erro ao cancelar nota.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Chave de acesso copiada para a área de transferência!");
  };

  // Stats calculation
  const stats = {
    total: invoices.length,
    authorized: invoices.filter(i => i.status === "AUTHORIZED").length,
    canceled: invoices.filter(i => i.status === "CANCELED").length,
    totalValue: invoices.reduce((acc, i) => acc + (i.status === "AUTHORIZED" ? Number(i.total) : 0), 0)
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter(i => 
    i.accessKey?.toLowerCase().includes(search.toLowerCase()) ||
    i.number?.includes(search) ||
    i.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Receipt className="text-indigo-400" size={28} />
            Fiscal & Emissão de XML Radar
          </h1>
          <p className="text-slate-400 text-sm mt-1">Monitore notas fiscais eletrônicas (NF-e/NFC-e) geradas no ponto de venda e televendas.</p>
        </div>
        <button 
          onClick={loadInvoices}
          className="bg-[#161b33] hover:bg-[#161b33] text-slate-100 border border-indigo-500/15 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
        >
          <RefreshCw size={18} /> Atualizar
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-2 text-sm font-semibold">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 size={20} />
          {success}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total de Notas" value={String(stats.total)} color="slate" />
        <StatCard label="Autorizadas" value={String(stats.authorized)} color="emerald" />
        <StatCard label="Canceladas" value={String(stats.canceled)} color="red" />
        <StatCard label="Faturado Fiscal" value={`R$ ${stats.totalValue.toFixed(2)}`} color="indigo" />
      </div>

      {/* Main invoices table card */}
      <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] overflow-hidden shadow-xl">
        <div className="p-6 border-b border-indigo-500/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white">Notas Emitidas</h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por número, chave ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white text-sm rounded-xl py-2 pl-10 pr-4 outline-none transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500">Buscando notas fiscais...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 font-bold">
              <tr>
                <th className="px-6 py-4 text-left">Número / Série</th>
                <th className="px-6 py-4 text-left">Chave de Acesso</th>
                <th className="px-6 py-4 text-left">Tipo</th>
                <th className="px-6 py-4 text-left">Cliente</th>
                <th className="px-6 py-4 text-right">Valor Total</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/[0.06]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma nota fiscal encontrada.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[#0c0f1a]/20 transition-colors">
                    <td className="px-6 py-4 text-white font-bold">
                      #{invoice.number} / Série {invoice.series}
                      <span className="text-[10px] text-slate-500 block">{new Date(invoice.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span>{invoice.accessKey.slice(0, 16)}...{invoice.accessKey.slice(-8)}</span>
                        <button 
                          onClick={() => copyToClipboard(invoice.accessKey)} 
                          className="hover:text-indigo-400 p-1" 
                          title="Copiar Chave Completa"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        invoice.type === "NFe" 
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                          : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      }`}>
                        {invoice.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{invoice.customerName}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-100">
                      R$ {Number(invoice.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
                        invoice.status === "AUTHORIZED" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {invoice.status === "AUTHORIZED" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {invoice.status === "AUTHORIZED" ? "Autorizada" : "Cancelada"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); alert("Fazendo download do XML fiscal (fictício)..."); }}
                          className="text-slate-400 hover:text-indigo-400 p-1.5 bg-[#161b33] rounded-lg border border-indigo-500/[0.06] transition-colors"
                          title="Download XML"
                        >
                          <Download size={14} />
                        </a>
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); alert("Visualizando espelho PDF Danfe (fictício)..."); }}
                          className="text-slate-400 hover:text-indigo-400 p-1.5 bg-[#161b33] rounded-lg border border-indigo-500/[0.06] transition-colors"
                          title="Imprimir Danfe"
                        >
                          <Printer size={14} />
                        </a>
                        {invoice.status === "AUTHORIZED" && (
                          <button
                            onClick={() => handleCancelInvoice(invoice.id)}
                            className="text-red-400 hover:text-white hover:bg-red-600 px-2 py-1 rounded-lg text-xs border border-red-500/20 hover:border-transparent transition-all font-semibold"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: "slate" | "emerald" | "red" | "indigo" }) {
  const colorMaps = {
    slate: "from-slate-600/20 text-slate-300",
    emerald: "from-emerald-600/20 text-emerald-400",
    red: "from-red-600/20 text-red-400",
    indigo: "from-indigo-600/20 text-indigo-400",
  };
  return (
    <div className="bg-[#111528] rounded-2xl p-5 border border-indigo-500/[0.08] relative overflow-hidden shadow-md">
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${colorMaps[color].split(" ")[0]} rounded-bl-full opacity-40`} />
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-black font-mono ${colorMaps[color].split(" ")[1]}`}>{value}</p>
    </div>
  );
}
