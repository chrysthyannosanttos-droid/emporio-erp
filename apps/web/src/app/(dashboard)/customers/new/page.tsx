"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, User, AlertCircle, Store, UserCheck } from "lucide-react";
import Link from "next/link";
import { createCustomer } from "@/actions/customer";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerType, setCustomerType] = useState<"CONSUMIDOR_FINAL" | "REVENDA">(
    "CONSUMIDOR_FINAL"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("customerType", customerType);
    const result = await createCustomer(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/customers");
    }
  }

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col gap-5 select-none pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/customers"
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 shadow-sm transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Novo Cliente</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Cadastre clientes Consumidor Final ou parceiros de Revenda / Atacado.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
              <User size={28} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Dados e Perfil Comercial</h2>
              <p className="text-xs text-gray-500">
                Defina se o cliente compra para consumo próprio ou para revenda.
              </p>
            </div>
          </div>

          {/* FLAG: CONSUMIDOR FINAL vs CLIENTE REVENDA */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Tipo / Classificação do Cliente *
            </label>
            <input type="hidden" name="customerType" value={customerType} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCustomerType("CONSUMIDOR_FINAL")}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                  customerType === "CONSUMIDOR_FINAL"
                    ? "border-blue-600 bg-blue-50/70 shadow-xs"
                    : "border-gray-200 bg-gray-50/60 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    customerType === "CONSUMIDOR_FINAL"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-500 border border-gray-200"
                  }`}
                >
                  <UserCheck size={20} />
                </div>
                <div>
                  <span className="block text-sm font-black text-gray-900">Consumidor Final</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Compra para uso/consumo próprio no varejo e balcão.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCustomerType("REVENDA")}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                  customerType === "REVENDA"
                    ? "border-indigo-600 bg-indigo-50/70 shadow-xs"
                    : "border-gray-200 bg-gray-50/60 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    customerType === "REVENDA"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-500 border border-gray-200"
                  }`}
                >
                  <Store size={20} />
                </div>
                <div>
                  <span className="block text-sm font-black text-gray-900">
                    Cliente Revenda / Parceiro
                  </span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Compra doces, carnes ou mercadorias para revender (entra no Relatório de Revenda).
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Nome Completo / Razão Social *
              </label>
              <input
                name="name"
                type="text"
                required
                className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-4 py-2.5 rounded-xl outline-none transition-all text-sm font-medium placeholder:text-gray-400"
                placeholder="Ex: João da Silva ou Mercadinho São José LTDA"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Documento (CPF / CNPJ)
                </label>
                <input
                  name="document"
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-4 py-2.5 rounded-xl outline-none transition-all text-sm font-mono placeholder:text-gray-400"
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Telefone / WhatsApp
                </label>
                <input
                  name="phone"
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-4 py-2.5 rounded-xl outline-none transition-all text-sm font-mono placeholder:text-gray-400"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email de Contato
                </label>
                <input
                  name="email"
                  type="email"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-4 py-2.5 rounded-xl outline-none transition-all text-sm font-medium placeholder:text-gray-400"
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Inscrição Estadual (Opcional)
                </label>
                <input
                  name="ie"
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-4 py-2.5 rounded-xl outline-none transition-all text-sm font-mono placeholder:text-gray-400"
                  placeholder="Isento ou Nº IE"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Endereço de Entrega / Ponto Comercial
              </label>
              <input
                name="address"
                type="text"
                className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 px-4 py-2.5 rounded-xl outline-none transition-all text-sm font-medium placeholder:text-gray-400"
                placeholder="Rua, Número, Bairro, Cidade - UF"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <Link
              href="/customers"
              className="px-5 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50 text-sm cursor-pointer"
            >
              <Save size={18} />
              {loading ? "Salvando..." : "Salvar Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
