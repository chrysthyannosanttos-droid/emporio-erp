"use client";

import { useState } from "react";
import { FileText, Plus, Search, Tag, AlertCircle, Check, X } from "lucide-react";

export default function TaxGridPage() {
  const [rules, setRules] = useState([
    { id: '1', ncm: '2204.*', origin: 'SP', dest: 'AL', cst: '00', icms: 19.0, pis: 1.65, cofins: 7.6, ibs: 0, cbs: 0, is: 0 },
    { id: '2', ncm: '1905.90.90', origin: 'AL', dest: 'AL', cst: '40', icms: 0, pis: 0, cofins: 0, ibs: 0, cbs: 0, is: 0 },
    // Mock Reforma Tributária (Alíquotas de transição teste)
    { id: '3', ncm: '2203.00.00', origin: 'AL', dest: 'AL', cst: '60', icms: 19.0, pis: 0, cofins: 0, ibs: 1.2, cbs: 0.8, is: 5.0 },
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [ncm, setNcm] = useState("");
  const [origin, setOrigin] = useState("AL");
  const [dest, setDest] = useState("AL");
  const [cst, setCst] = useState("00");
  const [icms, setIcms] = useState("");
  const [pis, setPis] = useState("");
  const [cofins, setCofins] = useState("");
  const [ibs, setIbs] = useState("");
  const [cbs, setCbs] = useState("");
  const [isRate, setIsRate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ncm) return;

    const newRule = {
      id: Date.now().toString(),
      ncm,
      origin,
      dest,
      cst,
      icms: parseFloat(icms) || 0,
      pis: parseFloat(pis) || 0,
      cofins: parseFloat(cofins) || 0,
      ibs: parseFloat(ibs) || 0,
      cbs: parseFloat(cbs) || 0,
      is: parseFloat(isRate) || 0
    };

    setRules(prev => [...prev, newRule]);
    
    // Reset fields
    setNcm("");
    setIcms("");
    setPis("");
    setCofins("");
    setIbs("");
    setCbs("");
    setIsRate("");
    setIsOpen(false);
  };

  return (
    <div className="space-y-5 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <FileText className="text-indigo-400" size={28} />
            Grade Tributária (Transição Reforma)
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure regras de ICMS (Ex: Alagoas 19%) e novos impostos (IBS, CBS, IS).</p>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={20} /> Nova Regra
        </button>
      </div>

      <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] p-6 overflow-hidden shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Regras Cadastradas (Simples Nacional / Lucro Presumido)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-400 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-4">NCM (Padrão)</th>
                <th className="px-4 py-4">Origem</th>
                <th className="px-4 py-4">Destino</th>
                <th className="px-4 py-4">CST/CSOSN</th>
                <th className="px-4 py-4 text-right">ICMS (%)</th>
                <th className="px-4 py-4 text-right">PIS/COFINS (%)</th>
                <th className="px-4 py-4 text-right text-indigo-300">IBS (%)</th>
                <th className="px-4 py-4 text-right text-indigo-300">CBS (%)</th>
                <th className="px-4 py-4 text-right text-indigo-300">IS (%)</th>
                <th className="px-4 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/[0.06]">
              {rules.map(r => (
                <tr key={r.id} className="hover:bg-indigo-500/[0.04] transition-colors">
                  <td className="px-4 py-4 text-indigo-400 font-mono font-bold">{r.ncm}</td>
                  <td className="px-4 py-4 text-slate-300 font-mono">{r.origin}</td>
                  <td className="px-4 py-4 text-slate-300 font-mono">{r.dest}</td>
                  <td className="px-4 py-4 text-white font-bold">{r.cst}</td>
                  <td className="px-4 py-4 text-right font-mono text-emerald-400 font-bold">{r.icms}%</td>
                  <td className="px-4 py-4 text-right font-mono">{r.pis} / {r.cofins}</td>
                  <td className="px-4 py-4 text-right font-mono text-indigo-300 font-bold">{r.ibs}%</td>
                  <td className="px-4 py-4 text-right font-mono text-indigo-300 font-bold">{r.cbs}%</td>
                  <td className="px-4 py-4 text-right font-mono text-indigo-300 font-bold">{r.is}%</td>
                  <td className="px-4 py-4 text-center text-slate-500 hover:text-indigo-400 cursor-pointer">Editar</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NEW RULE */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/[0.08] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[#0c0f1a]/60">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="text-indigo-400" />
                Nova Regra Tributária
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-[#161b33] text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">NCM (Filtro)</label>
                  <input 
                    type="text" 
                    value={ncm}
                    onChange={(e) => setNcm(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none transition-all text-sm font-mono"
                    placeholder="Ex: 2203.00.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">CST / CSOSN</label>
                  <input 
                    type="text" 
                    value={cst}
                    onChange={(e) => setCst(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none transition-all text-sm font-mono"
                    placeholder="00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Origem (UF)</label>
                  <input 
                    type="text" 
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none transition-all text-sm uppercase font-mono"
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Destino (UF)</label>
                  <input 
                    type="text" 
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none transition-all text-sm uppercase font-mono"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">ICMS (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={icms}
                    onChange={(e) => setIcms(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 rounded-xl outline-none text-sm font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">PIS (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={pis}
                    onChange={(e) => setPis(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 rounded-xl outline-none text-sm font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">COFINS (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={cofins}
                    onChange={(e) => setCofins(e.target.value)}
                    className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-3 py-2 rounded-xl outline-none text-sm font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="border-t border-indigo-500/[0.08] pt-3">
                <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Reforma Tributária (Transição)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">IBS (%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={ibs}
                      onChange={(e) => setIbs(e.target.value)}
                      className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-2.5 py-2 rounded-xl outline-none text-xs font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">CBS (%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={cbs}
                      onChange={(e) => setCbs(e.target.value)}
                      className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-2.5 py-2 rounded-xl outline-none text-xs font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Seletivo (%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={isRate}
                      onChange={(e) => setIsRate(e.target.value)}
                      className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-2.5 py-2 rounded-xl outline-none text-xs font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-indigo-500/[0.08] flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-[#0c0f1a] hover:bg-[#161b33] text-slate-300 font-bold py-3 rounded-xl border border-indigo-500/[0.08] text-sm transition-colors"
                >
                  Voltar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm"
                >
                  Gravar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
