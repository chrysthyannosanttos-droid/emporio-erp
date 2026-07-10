"use client";
import { useState } from "react";
import { Receipt, Search, Plus, X } from "lucide-react";

export default function InvoicesPage() {
  const [items, setItems] = useState<{id: string, name: string, desc: string, status: string}[]>([
    { id: "1", name: "35231012345678000199550010001234561001234567", desc: "Distribuidora de Bebidas Norte S.A. | R$ 1.450,00", status: "XML Importado" },
    { id: "2", name: "35231098765432000188550010009876541009876543", desc: "Frigorífico Boi Gordo LTDA | R$ 3.200,50", status: "XML Importado" },
    { id: "3", name: "35231011122233000177550010001112221001112223", desc: "Carvão São José Indústria | R$ 540,00", status: "XML Validado" }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setItems(prev => [{ id: Date.now().toString(), name: f.get("name") as string, desc: f.get("desc") as string, status: "Emitida" }, ...prev]);
    setIsModalOpen(false);
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Notas Fiscais</h1>
          <p className="text-slate-500 text-sm mt-0.5">Emite, recebe e importa NF-e/NFC-e, validando documentos fiscais e XMLs.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 text-sm">
          <Plus size={16} /> Emitir NF-e
        </button>
      </div>
      <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-indigo-500/[0.08] shrink-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Buscar chave ou cliente..." className="w-full pl-9 pr-4 py-2 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium placeholder:text-slate-600" />
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
               <Receipt size={48} className="mx-auto text-indigo-500/20 mb-4" />
               <p className="text-slate-500 font-medium">Nenhum registro encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Chave / Número</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Destinatário / Valores</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {filtered.map(i => (
                  <tr key={i.id} className="hover:bg-indigo-500/[0.04]">
                    <td className="px-5 py-3 font-semibold text-white">{i.name}</td>
                    <td className="px-5 py-3 text-slate-400">{i.desc}</td>
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
          <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-indigo-500/[0.08] flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Nova NF-e</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:bg-indigo-500/10 p-1 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Destinatário</label>
                <input name="name" required autoFocus className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Informações Adicionais</label>
                <textarea name="desc" required rows={3} className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2 rounded-lg outline-none focus:border-indigo-500 text-sm resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-[#0c0f1a] hover:bg-[#161b33] text-slate-400 font-semibold py-2.5 rounded-xl border border-indigo-500/10 text-sm">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 text-sm">Emitir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
