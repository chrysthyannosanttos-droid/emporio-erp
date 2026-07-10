"use client";
import { useState, useEffect } from "react";
import { Scale, Search, Plus, X, Download, RefreshCw, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { getProducts } from "@/actions/product";

export default function ScalesPage() {
  const [items, setItems] = useState<{id: string, name: string, desc: string, status: string, ip: string, lastSync: string}[]>([
    { id: "1", name: "Balança Frios 01", desc: "Açougue & Laticínios", status: "Sincronizado", ip: "192.168.1.150", lastSync: "Hoje, 09:30" },
    { id: "2", name: "Balança FLV 01", desc: "Hortifrúti Central", status: "Sincronizado", ip: "192.168.1.151", lastSync: "Hoje, 10:15" },
    { id: "3", name: "Balança Padaria 01", desc: "Padaria & Confeitaria", status: "Pendências", ip: "192.168.1.152", lastSync: "Ontem, 18:00" },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getProducts().then(res => {
      if (res.products) setProducts(res.products);
    });
  }, []);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setItems(prev => [
      { 
        id: Date.now().toString(), 
        name: f.get("name") as string, 
        desc: f.get("desc") as string, 
        ip: f.get("ip") as string,
        lastSync: "Agora",
        status: "Sincronizado" 
      }, 
      ...prev
    ]);
    setIsModalOpen(false);
  };

  // Toledo MGV6 fixed width file generator
  const handleExportToledoMGV6 = () => {
    setGenerating(true);
    setTimeout(() => {
      let txt = "";
      products.forEach((p, idx) => {
        // Line format Toledo MGV6 (itens.txt):
        // Dept (2 chars) + Type (1 char) + Code (6 chars) + Price (6 chars) + Assoc/Days (3 chars) + Description (50 chars)
        const dept = "01"; 
        const type = "1"; // 1 = Weight (pesável)
        const code = String(p.id || idx).padStart(6, "0");
        const price = String(Math.round(p.price * 100)).padStart(6, "0");
        const days = "000";
        const desc = p.name.slice(0, 50).padEnd(50, " ");
        txt += `${dept}${type}${code}${price}${days}${desc}\r\n`;
      });

      const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ITENS.TXT";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setGenerating(false);
    }, 1200);
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Integração com Balanças</h1>
          <p className="text-slate-500 text-sm mt-0.5">Comunica-se com balanças eletrônicas Toledo e Filizola para carga de preços.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportToledoMGV6}
            disabled={generating}
            className="bg-[#111528] border border-indigo-500/15 hover:text-white disabled:opacity-50 text-slate-300 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all text-sm active:scale-95"
          >
            {generating ? (
              <><RefreshCw size={15} className="animate-spin" /> Gerando TXT...</>
            ) : (
              <><Download size={15} /> Exportar Carga (Toledo MGV6)</>
            )}
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 text-sm active:scale-95">
            <Plus size={16} /> Cadastrar Balança
          </button>
        </div>
      </div>

      <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 p-5 shrink-0 flex gap-4 items-center">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
          <FileText size={18} />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Carga de Balança Automática</h3>
          <p className="text-xs text-slate-500">
            Gere o arquivo <strong className="text-indigo-400 font-mono">ITENS.TXT</strong> e importe diretamente no software Toledo MGV6 para atualizar os preços das balanças nos setores de Açougue, FLV e Padaria.
          </p>
        </div>
      </div>

      <div className="bg-[#111528] rounded-2xl border border-indigo-500/10 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-indigo-500/[0.08] shrink-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Buscar balança..." className="w-full pl-9 pr-4 py-2 bg-[#0c0f1a] border border-indigo-500/15 focus:border-indigo-500 text-white rounded-lg outline-none text-sm font-medium placeholder:text-slate-600" />
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
               <Scale size={48} className="mx-auto text-indigo-500/20 mb-4" />
               <p className="text-slate-500 font-medium">Nenhuma balança cadastrada.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0c0f1a]/60 border-b border-indigo-500/[0.08] text-slate-500 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Identificador / Nome</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Setor</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Endereço IP</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Último Envio</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/[0.06]">
                {filtered.map(i => (
                  <tr key={i.id} className="hover:bg-indigo-500/[0.04]">
                    <td className="px-5 py-3 font-bold text-white">{i.name}</td>
                    <td className="px-5 py-3 text-slate-300 font-medium">{i.desc}</td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">{i.ip}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{i.lastSync}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                        i.status === "Sincronizado" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/15"
                      }`}>
                        {i.status === "Sincronizado" ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                        {i.status}
                      </span>
                    </td>
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
            <div className="p-5 border-b border-indigo-500/[0.08] flex justify-between items-center bg-[#0c0f1a]/50">
              <h3 className="text-lg font-bold text-white">Cadastrar Balança na Rede</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:bg-indigo-500/10 p-1 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Identificação / Nome</label>
                <input name="name" required autoFocus placeholder="Ex: Balança Frios 02" className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2.5 rounded-lg outline-none focus:border-indigo-500 text-sm font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Setor / Localização</label>
                <input name="desc" required placeholder="Ex: Frios e Padaria" className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2.5 rounded-lg outline-none focus:border-indigo-500 text-sm font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">IP da Balança na Rede</label>
                <input name="ip" required placeholder="Ex: 192.168.1.155" className="w-full bg-[#0c0f1a] border border-indigo-500/15 text-white px-3 py-2.5 rounded-lg outline-none focus:border-indigo-500 text-sm font-mono" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-[#0c0f1a] hover:bg-[#161b33] text-slate-400 font-semibold py-2.5 rounded-xl border border-indigo-500/10 text-sm">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 text-sm">Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
