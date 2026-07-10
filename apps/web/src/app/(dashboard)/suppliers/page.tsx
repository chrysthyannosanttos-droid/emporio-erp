"use client";

import { useState } from "react";
import { Truck, Plus, Search, Phone, Mail, MapPin, X, Save, Building2, Hash, FileText, Star, ChevronRight } from "lucide-react";

const MOCK_SUPPLIERS = [
  { id: "1", name: "Distribuidora Norte LTDA", cnpj: "12.345.678/0001-99", contact: "João Paulo", phone: "(82) 99123-4567", email: "vendas@norte.com.br", city: "Maceió", state: "AL", category: "Alimentos", rating: 5, status: "ACTIVE" },
  { id: "2", name: "Bebidas Premium S.A.", cnpj: "98.765.432/0001-11", contact: "Ana Lima", phone: "(82) 98765-4321", email: "pedidos@bebidaspremium.com", city: "Arapiraca", state: "AL", category: "Bebidas", rating: 4, status: "ACTIVE" },
  { id: "3", name: "Limpeza Total Distribuidora", cnpj: "11.222.333/0001-44", contact: "Carlos Mendes", phone: "(11) 97654-3210", email: "comercial@limpezatotal.com", city: "São Paulo", state: "SP", category: "Limpeza", rating: 3, status: "INACTIVE" },
  { id: "4", name: "Frios & Laticínios Nordeste", cnpj: "55.666.777/0001-88", contact: "Maria Silva", phone: "(81) 96543-2109", email: "msilva@friosnordeste.com", city: "Recife", state: "PE", category: "Frios", rating: 5, status: "ACTIVE" },
];

const CATEGORIES = ["Todos", "Alimentos", "Bebidas", "Frios", "Limpeza", "Higiene", "Outros"];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState(MOCK_SUPPLIERS);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<typeof MOCK_SUPPLIERS[0] | null>(null);

  const filtered = suppliers.filter(s =>
    (catFilter === "Todos" || s.category === catFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.cnpj.includes(search) ||
      s.contact.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newSupplier = {
      id: Date.now().toString(),
      name: f.get("name") as string,
      cnpj: f.get("cnpj") as string,
      contact: f.get("contact") as string,
      phone: f.get("phone") as string,
      email: f.get("email") as string,
      quoteEmail: f.get("quoteEmail") as string || (f.get("email") as string),
      city: f.get("city") as string,
      state: f.get("state") as string,
      category: f.get("category") as string,
      rating: 5,
      status: "ACTIVE",
    };
    setSuppliers(prev => [newSupplier, ...prev]);
    setIsModalOpen(false);
  }

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Fornecedores</h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie seus fornecedores e contatos comerciais.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          <Plus size={18} /> Novo Fornecedor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: suppliers.length, color: "indigo" },
          { label: "Ativos", value: suppliers.filter(s => s.status === "ACTIVE").length, color: "emerald" },
          { label: "Inativos", value: suppliers.filter(s => s.status === "INACTIVE").length, color: "amber" },
          { label: "Categorias", value: [...new Set(suppliers.map(s => s.category))].length, color: "purple" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111528] border border-indigo-500/[0.08] rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
            <p className={`text-3xl font-black mt-1 text-${stat.color}-400`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ ou contato..."
            className="w-full bg-[#111528] border border-indigo-500/[0.08] focus:border-indigo-500 text-white pl-11 pr-4 py-3 rounded-xl outline-none transition-all text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${catFilter === cat
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-[#111528] border-indigo-500/[0.08] text-slate-400 hover:border-indigo-500/15 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-400">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Fornecedor</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">CNPJ</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Contato</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Categoria</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Avaliação</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/[0.06]">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-indigo-500/[0.04] transition-colors cursor-pointer group" onClick={() => setSelected(s)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-lg shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white">{s.name}</p>
                        <p className="text-slate-500 text-xs flex items-center gap-1"><MapPin size={11} />{s.city} - {s.state}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-300 text-xs">{s.cnpj}</td>
                  <td className="px-6 py-4">
                    <p className="text-slate-300 font-bold">{s.contact}</p>
                    <p className="text-slate-500 text-xs flex items-center gap-1"><Phone size={10}/> {s.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-[#161b33] border border-indigo-500/15 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold">{s.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={14} className={i <= s.rating ? "text-amber-400 fill-amber-400" : "text-slate-700"} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {s.status === "ACTIVE"
                      ? <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold">Ativo</span>
                      : <span className="text-slate-400 bg-[#161b33] border border-indigo-500/15 px-2.5 py-1 rounded-full text-xs font-bold">Inativo</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <ChevronRight size={18} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    <Truck size={36} className="mx-auto mb-3 text-slate-700" />
                    <p className="font-bold">Nenhum fornecedor encontrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="bg-[#111528] border-l border-indigo-500/[0.08] w-full max-w-md h-full p-8 overflow-y-auto space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-3xl">
                  {selected.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{selected.name}</h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selected.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-[#161b33] text-slate-400 border border-indigo-500/15"}`}>
                    {selected.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-[#161b33] rounded-xl text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { icon: <Hash size={16}/>, label: "CNPJ", value: selected.cnpj },
                { icon: <Building2 size={16}/>, label: "Categoria", value: selected.category },
                { icon: <Phone size={16}/>, label: "Telefone", value: selected.phone },
                { icon: <Mail size={16}/>, label: "E-mail Geral", value: selected.email },
                { icon: <Mail size={16}/>, label: "E-mail para Cotação", value: selected.quoteEmail || selected.email },
                { icon: <MapPin size={16}/>, label: "Localização", value: `${selected.city} - ${selected.state}` },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 bg-indigo-500/[0.06] border border-indigo-500/[0.08] rounded-xl p-4">
                  <span className="text-indigo-400">{item.icon}</span>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{item.label}</p>
                    <p className="text-white font-bold text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              <button className="flex-1 bg-[#161b33] hover:bg-[#161b33] border border-indigo-500/15 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                Editar
              </button>
              <button className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold py-3 rounded-xl text-sm transition-colors">
                Inativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/[0.08] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[#0c0f1a]/60">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Truck className="text-indigo-400" /> Novo Fornecedor
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-[#161b33] text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Razão Social / Nome *</label>
                  <input name="name" required placeholder="Distribuidora XYZ LTDA" className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">CNPJ</label>
                  <input name="cnpj" placeholder="00.000.000/0001-00" className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Categoria</label>
                  <select name="category" className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm">
                    {["Alimentos","Bebidas","Frios","Limpeza","Higiene","Outros"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nome do Contato</label>
                  <input name="contact" placeholder="João Silva" className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Telefone / WhatsApp</label>
                  <input name="phone" placeholder="(82) 99999-0000" className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">E-mail Principal de Contato</label>
                  <input name="email" type="email" placeholder="vendas@fornecedor.com" className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm" />
                </div>
                <div className="col-span-2 bg-indigo-500/5 p-3.5 rounded-xl border border-indigo-500/10 space-y-1.5">
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">E-mail para Cotações Automáticas</label>
                  <input name="quoteEmail" type="email" placeholder="cotacoes@fornecedor.com" className="w-full bg-[#0c0f1a] border border-indigo-500/[0.15] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm" />
                  <p className="text-[10px] text-slate-500">Este e-mail será usado exclusivamente para o envio de solicitações de cotação de mercadorias.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Cidade</label>
                  <input name="city" placeholder="Maceió" className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Estado</label>
                  <select name="state" className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-2.5 rounded-xl outline-none text-sm">
                    {["AL","SE","PE","BA","CE","RN","PB","PI","MA","PA","AM","AC","RO","RR","AP","TO","GO","MT","MS","MG","ES","RJ","SP","PR","SC","RS","DF"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t border-indigo-500/[0.08] flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-[#161b33] hover:bg-[#161b33] text-slate-300 font-bold py-3 rounded-xl border border-indigo-500/15 text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                  <Save size={16} /> Cadastrar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
