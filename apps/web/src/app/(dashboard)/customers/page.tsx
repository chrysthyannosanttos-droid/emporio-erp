"use client";

import { useState, useEffect } from "react";
import { Users, Search, Plus, Store, UserCheck, FileText, Handshake } from "lucide-react";
import Link from "next/link";
import { getCustomers, updateCustomerType } from "@/actions/customer";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "REVENDA" | "CONSUMIDOR_FINAL">("ALL");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const res = await getCustomers();
    if (res.error) setError(res.error);
    else setCustomers(res.customers || []);
    setLoading(false);
  }

  async function handleToggleType(c: any) {
    const nextType = c.customerType === "REVENDA" ? "CONSUMIDOR_FINAL" : "REVENDA";
    await updateCustomerType(c.id, nextType);
    await loadData();
  }

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      (c.document || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase());
    if (typeFilter === "ALL") return matchesSearch;
    return matchesSearch && c.customerType === typeFilter;
  });

  const revendaCount = customers.filter((c) => c.customerType === "REVENDA").length;
  const finalCount = customers.filter((c) => c.customerType !== "REVENDA").length;

  return (
    <div className="w-full flex flex-col gap-5 select-none pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Clientes (Consumidor Final & Revenda)
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Classifique clientes entre Consumidor Final e Revenda e acompanhe suas compras e comodatos.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/reports?tab=resale-sales"
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-xs"
          >
            <FileText size={15} /> Relatório de Vendas Revenda
          </Link>
          <Link
            href="/reports?tab=comodatos"
            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-xs"
          >
            <Handshake size={15} /> Comodatos em Clientes
          </Link>
          <Link
            href="/customers/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 text-xs"
          >
            <Plus size={16} /> Novo Cliente
          </Link>
        </div>
      </div>

      {/* Filtros Rápidos */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ ou email..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-800 rounded-xl outline-none text-sm font-medium placeholder:text-gray-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === "ALL"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Todos ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("REVENDA")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                typeFilter === "REVENDA"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Store size={13} /> Clientes Revenda ({revendaCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("CONSUMIDOR_FINAL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                typeFilter === "CONSUMIDOR_FINAL"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <UserCheck size={13} /> Consumidor Final ({finalCount})
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex-1 flex items-center justify-center text-red-500 text-sm p-8">
            {error}
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px]">
                    Nome / Razão Social
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px]">
                    Tipo de Cliente (Flag)
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px]">
                    CPF / CNPJ
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px]">
                    Contato
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px] text-right">
                    Total Comprado
                  </th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px] text-right">
                    Alternar Tipo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400 font-bold">
                      Carregando clientes do banco...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                      Nenhum cliente encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c: any) => {
                    const isRevenda = c.customerType === "REVENDA";
                    return (
                      <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-gray-900 flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border shrink-0 ${
                              isRevenda
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-blue-50 text-blue-600 border-blue-100"
                            }`}
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          {c.name}
                        </td>
                        <td className="px-5 py-3.5">
                          {isRevenda ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              <Store size={12} /> CLIENTE REVENDA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                              <UserCheck size={12} /> CONSUMIDOR FINAL
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">
                          {c.document || "---"}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs">
                          {c.phone || c.email || "---"}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-700">
                          R$ {Number(c.totalBought || 0).toFixed(2).replace(".", ",")}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleType(c)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Mudar para {isRevenda ? "Consumidor Final" : "Revenda"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
