"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, User, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createCustomer } from "@/actions/customer";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createCustomer(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/customers");
    }
  }

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/customers" className="p-2 bg-[#161b33] border border-indigo-500/15 rounded-lg hover:bg-[#161b33] transition-colors">
            <ArrowLeft size={20} className="text-slate-300" />
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Novo Cliente</h1>
        </div>
      </div>

      <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] shadow-xl p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <User size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dados Principais</h2>
              <p className="text-sm text-slate-400">Informações de contato e identificação.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">Nome Completo</label>
              <input 
                name="name"
                type="text" 
                required
                className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-3 rounded-xl outline-none transition-all"
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Documento (CPF/CNPJ)</label>
                <input 
                  name="document"
                  type="text" 
                  className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-3 rounded-xl outline-none transition-all font-mono"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Telefone</label>
                <input 
                  name="phone"
                  type="text" 
                  className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-3 rounded-xl outline-none transition-all font-mono"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">Email</label>
              <input 
                name="email"
                type="email" 
                className="w-full bg-[#0c0f1a] border border-indigo-500/[0.08] focus:border-indigo-500 text-white px-4 py-3 rounded-xl outline-none transition-all"
                placeholder="joao@email.com"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-indigo-500/[0.08] flex justify-end gap-3">
            <Link href="/customers" className="px-6 py-3 rounded-xl font-bold text-slate-300 bg-[#161b33] border border-indigo-500/15 hover:bg-[#161b33] transition-colors">
              Cancelar
            </Link>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? "Salvando..." : "Salvar Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
