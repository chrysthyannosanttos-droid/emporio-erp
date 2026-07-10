"use client";
import { useState } from "react";
import { Users, Search, Plus, X, Phone, Mail, Building, Calendar, IdCard } from "lucide-react";

export default function HRPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setItems(prev => [{ 
      id: Date.now().toString(), 
      name: f.get("name") as string, 
      role: f.get("role") as string,
      sector: f.get("sector") as string,
      phone: f.get("phone") as string,
      status: "Ativo" 
    }, ...prev]);
    setIsModalOpen(false);
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Recursos Humanos (RH)</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestão completa de funcionários, cargos, setores e contatos.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 text-sm">
          <Plus size={16} /> Novo Funcionário
        </button>
      </div>

      <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-indigo-500/[0.08] shrink-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Buscar funcionário..." className="w-full pl-9 pr-4 py-2 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium placeholder:text-slate-600" />
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
               <Users size={48} className="mx-auto text-indigo-500/20 mb-4" />
               <p className="text-slate-500 font-medium">Nenhum funcionário cadastrado.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Funcionário</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Cargo / Setor</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Telefone</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {filtered.map(i => (
                  <tr key={i.id} className="hover:bg-indigo-500/[0.04]">
                    <td className="px-5 py-3 font-semibold text-white">{i.name}</td>
                    <td className="px-5 py-3 text-slate-400">{i.role} • <span className="text-indigo-400">{i.sector}</span></td>
                    <td className="px-5 py-3 text-slate-400 font-mono">{i.phone}</td>
                    <td className="px-5 py-3"><span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-bold rounded-md">{i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-indigo-500/[0.08] flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Users className="text-indigo-400" size={18}/> Ficha de Funcionário</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:bg-indigo-500/10 p-1 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                {/* Pessoais */}
                <div className="space-y-4 border-r border-indigo-500/[0.08] pr-5">
                  <h4 className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Dados Pessoais</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Completo</label>
                    <input name="name" required autoFocus className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5"><IdCard size={12}/> CPF</label>
                      <input name="cpf" required className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm font-mono" placeholder="000.000.000-00" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5"><Calendar size={12}/> Data de Nasc.</label>
                      <input name="birthdate" type="date" required className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-slate-300 px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5"><Phone size={12}/> Telefone / Celular</label>
                    <input name="phone" required className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm font-mono" placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5"><Mail size={12}/> E-mail</label>
                    <input name="email" type="email" required className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm" placeholder="email@exemplo.com" />
                  </div>
                </div>

                {/* Corporativos */}
                <div className="space-y-4">
                  <h4 className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Dados Corporativos</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5"><Building size={12}/> Setor / Departamento</label>
                    <select name="sector" required className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm">
                      <option value="Vendas / PDV">Vendas / PDV</option>
                      <option value="Estoque & Logística">Estoque & Logística</option>
                      <option value="Administrativo">Administrativo</option>
                      <option value="Produção">Produção</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Cargo</label>
                    <input name="role" required className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm" placeholder="Ex: Operador de Caixa" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Data de Admissão</label>
                    <input name="hiredate" type="date" required className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-slate-300 px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-indigo-500/[0.08]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-[#0c0f1a] hover:bg-[#161b33] text-slate-400 font-semibold py-2.5 rounded-xl border border-indigo-500/10 text-sm">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 text-sm">Salvar Ficha do Funcionário</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
