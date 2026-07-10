import { getOrders } from "@/actions/order";
import { getSellers } from "@/actions/seller";
import Link from "next/link";
import { Phone, Plus, Package, User, CheckCircle2, Clock, XCircle, TruckIcon } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: "Rascunho", color: "bg-slate-700 text-slate-300", icon: <Clock size={12} /> },
  CONFIRMED: { label: "Confirmado", color: "bg-blue-500/20 text-blue-400 border border-blue-500/30", icon: <CheckCircle2 size={12} /> },
  INVOICED: { label: "Faturado", color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", icon: <Package size={12} /> },
  DELIVERED: { label: "Entregue", color: "bg-purple-500/20 text-purple-400 border border-purple-500/30", icon: <TruckIcon size={12} /> },
  CANCELED: { label: "Cancelado", color: "bg-red-500/20 text-red-400 border border-red-500/30", icon: <XCircle size={12} /> },
};

export default async function TelesalesPage() {
  const [{ orders }, { sellers }] = await Promise.all([getOrders(), getSellers()]);

  const stats = {
    total: orders?.length ?? 0,
    confirmed: orders?.filter(o => o.status === "CONFIRMED").length ?? 0,
    invoiced: orders?.filter(o => o.status === "INVOICED").length ?? 0,
    totalValue: orders?.reduce((a, o) => a + Number(o.total), 0) ?? 0,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Phone className="text-indigo-400" size={28} />
            Televendas
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie pedidos e tire ordens de venda</p>
        </div>
        <div className="flex gap-3">
          <Link href="/telesales/sellers" className="bg-[#161b33] hover:bg-[#161b33] border border-indigo-500/15 text-slate-100 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors">
            <User size={18} /> Vendedores
          </Link>
          <Link href="/telesales/new" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95">
            <Plus size={20} /> Novo Pedido
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total de Pedidos" value={String(stats.total)} accent="slate" />
        <StatCard label="Confirmados" value={String(stats.confirmed)} accent="blue" />
        <StatCard label="Faturados" value={String(stats.invoiced)} accent="emerald" />
        <StatCard label="Volume Total" value={`R$ ${stats.totalValue.toFixed(2).replace('.', ',')}`} accent="indigo" />
      </div>

      {/* Orders Table */}
      <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] overflow-hidden shadow-xl">
        <div className="p-6 border-b border-indigo-500/[0.08] flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Pedidos</h2>
          <select className="bg-[#161b33] border border-indigo-500/15 text-slate-300 text-sm rounded-xl px-3 py-2 outline-none">
            <option value="">Todos os Status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="INVOICED">Faturado</option>
            <option value="DELIVERED">Entregue</option>
            <option value="CANCELED">Cancelado</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-[#0c0f1a]/50 border-b border-indigo-500/[0.08]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">#Pedido</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Vendedor</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-500/[0.06]">
            {!orders || orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Phone className="text-slate-600" size={40} />
                    <p className="text-slate-400 font-medium">Nenhum pedido registrado ainda.</p>
                    <Link href="/telesales/new" className="text-indigo-400 font-bold text-sm hover:text-indigo-300">
                      + Criar primeiro pedido
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.DRAFT;
                return (
                  <tr key={order.id} className="hover:bg-[#161b33] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-100 font-medium">{order.customer?.name ?? "—"}</td>
                    <td className="px-6 py-4">
                      {order.seller ? (
                        <span className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                            {order.seller.name.charAt(0)}
                          </div>
                          <span className="text-slate-300 text-sm">{order.seller.name}</span>
                        </span>
                      ) : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${st.color}`}>
                        {st.icon} {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      R$ {Number(order.total).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/telesales/${order.id}`} className="text-slate-400 hover:text-indigo-400 text-xs font-bold bg-[#161b33] hover:bg-[#161b33] px-3 py-1.5 rounded-lg transition-colors">
                          Ver
                        </Link>
                        {(order.status === "CONFIRMED" || order.status === "DRAFT") && (
                          <Link href={`/pdv?orderId=${order.id}`} className="text-emerald-400 hover:text-emerald-300 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors">
                            → PDV
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  const accents: Record<string, string> = {
    slate: "from-slate-600/20 text-slate-300",
    blue: "from-blue-600/20 text-blue-400",
    emerald: "from-emerald-600/20 text-emerald-400",
    indigo: "from-indigo-600/20 text-indigo-400",
  };
  return (
    <div className={`bg-[#111528] rounded-2xl p-5 border border-indigo-500/[0.08] relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${accents[accent].split(' ')[0]} rounded-bl-full opacity-50`} />
      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-black ${accents[accent].split(' ')[1]}`}>{value}</p>
    </div>
  );
}
