"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trophy, Target, TrendingUp, DollarSign, Award, Star, Search } from "lucide-react";
import { getSellers, createSeller, getSellerPerformance } from "@/actions/seller";

export default function SellersPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal Novo Vendedor
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [commission, setCommission] = useState("2.5");
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [sellersRes, perfRes] = await Promise.all([
      getSellers(),
      getSellerPerformance(),
    ]);

    if (sellersRes.sellers) setSellers(sellersRes.sellers);
    if (perfRes.performance) setPerformance(perfRes.performance);
    setLoading(false);
  }

  async function handleCreateSeller(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("commission", commission);
    formData.append("goal", goal);

    const res = await createSeller(formData);
    setSubmitting(false);

    if (res.success) {
      setShowModal(false);
      setName("");
      setPhone("");
      setEmail("");
      setGoal("");
      loadData();
    } else {
      alert(res.error || "Erro ao criar vendedor");
    }
  }

  const sortedPerformance = [...performance].sort((a, b) => b.totalSold - a.totalSold);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="text-indigo-400" />
            Gestão & Ranking de Vendedores B2B
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Comissões, metas mensais, margens e ranking de desempenho da equipe comercial.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-xs"
        >
          <Plus size={16} />
          Cadastrar Vendedor
        </button>
      </div>

      {/* Cards de Desempenho / Ranking */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sortedPerformance.slice(0, 3).map((p, index) => {
          const medalColors = [
            "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400",
            "from-slate-400/20 to-slate-500/10 border-slate-400/30 text-slate-300",
            "from-amber-700/20 to-amber-800/10 border-amber-700/30 text-amber-500",
          ];
          const colorClass = medalColors[index] || "from-indigo-500/10 to-indigo-600/10 border-indigo-500/20 text-indigo-300";
          const percentGoal = p.goal && p.goal > 0 ? Math.min(100, Math.round((p.totalSold / p.goal) * 100)) : 0;

          return (
            <div
              key={p.id}
              className={`bg-gradient-to-br ${colorClass} border rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
                    #{index + 1}
                  </div>
                  <h3 className="font-bold text-base text-white">{p.name}</h3>
                </div>
                <Trophy size={20} />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400">Total Faturado:</span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    R$ {p.totalSold.toFixed(2)}
                  </span>
                </div>

                {p.goal && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Meta: R$ {p.goal.toFixed(2)}</span>
                      <span className="font-bold text-white">{percentGoal}%</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentGoal}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] pt-3 border-t border-white/10 text-slate-300">
                <span>Margem Média: <strong className="text-emerald-400">{p.margin.toFixed(1)}%</strong></span>
                <span>Vendas: <strong className="text-white">{p.salesCount}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de Vendedores Registrados */}
      <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-indigo-500/10 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white">Equipe Comercial ({sellers.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-indigo-400/60 uppercase tracking-wider border-b border-indigo-500/10 text-[10px] bg-[#0c0f1a]/40">
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4 text-center">Comissão Padrão</th>
                <th className="py-3 px-4 text-right">Meta Mensal</th>
                <th className="py-3 px-4 text-center">Clientes Vinculados</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Carregando vendedores...
                  </td>
                </tr>
              ) : sellers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhum vendedor cadastrado.
                  </td>
                </tr>
              ) : (
                sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-indigo-500/[0.03]">
                    <td className="py-3.5 px-4 font-bold text-white">{s.name}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <div>{s.phone || "---"}</div>
                      <div className="text-[10px] text-slate-500">{s.email || "---"}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-300">
                      {s.commission}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      {s.goal ? `R$ ${Number(s.goal).toFixed(2)}` : "Sem Meta"}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-300">
                      {s._count?.customers || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                        Ativo
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Vendedor */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Novo Vendedor B2B</h2>
            <form onSubmit={handleCreateSeller} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@empresa.com"
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Comissão Padrão (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="2.5"
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Meta Mensal (R$)</label>
                  <input
                    type="number"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? "Cadastrando..." : "Salvar Vendedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
