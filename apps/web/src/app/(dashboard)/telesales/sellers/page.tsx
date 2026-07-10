import { getSellers } from "@/actions/seller";
import { createSeller } from "@/actions/seller";
import Link from "next/link";
import { ArrowLeft, Plus, User, TrendingUp, Star } from "lucide-react";

export default async function SellersPage() {
  const { sellers, error } = await getSellers();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/telesales" className="p-2 bg-[#161b33] border border-indigo-500/15 rounded-xl hover:bg-[#161b33] transition-colors">
            <ArrowLeft size={20} className="text-slate-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Equipe de Vendas</h1>
            <p className="text-slate-400 text-sm">Gerencie seus vendedores</p>
          </div>
        </div>
        <Link href="/telesales/sellers/new" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105">
          <Plus size={20} /> Novo Vendedor
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {!sellers || sellers.length === 0 ? (
          <div className="col-span-3 text-center py-16 bg-[#111528] rounded-2xl border border-indigo-500/[0.08]">
            <User size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 font-medium">Nenhum vendedor cadastrado.</p>
            <Link href="/telesales/sellers/new" className="text-indigo-400 text-sm mt-2 block hover:underline">+ Cadastrar agora</Link>
          </div>
        ) : (
          sellers.map((seller: any) => (
            <div key={seller.id} className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] p-6 hover:border-slate-600 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full group-hover:scale-110 transition-transform" />
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/20">
                  {seller.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-white font-bold">{seller.name}</h3>
                  <p className="text-slate-400 text-sm">{seller.email || "—"}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-amber-400 text-xs font-bold">{seller.commission}% comissão</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#161b33] rounded-xl p-3 text-center">
                  <div className="text-indigo-400 font-black text-lg">{seller._count?.sales ?? 0}</div>
                  <div className="text-slate-500 text-xs">Vendas</div>
                </div>
                <div className="bg-[#161b33] rounded-xl p-3 text-center">
                  <div className="text-purple-400 font-black text-lg">{seller._count?.orders ?? 0}</div>
                  <div className="text-slate-500 text-xs">Pedidos</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
