"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCompanyMaster } from "@/actions/masterCompany";
import { Edit, X, Check, Save, Loader2, Package, Shield, Calendar, Building2 } from "lucide-react";
import { SYSTEM_MODULES_CATALOG } from "@/lib/modules-catalog";

export function EditCompanyModal({
  company,
  plans,
}: {
  company: any;
  plans: any[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [name, setName] = useState(company.name || "");
  const [document, setDocument] = useState(company.document || "");
  const [planId, setPlanId] = useState(company.planId || "");

  // Format date to YYYY-MM-DD for date input
  const initialDate = company.licenseExpiresAt
    ? new Date(company.licenseExpiresAt).toISOString().split("T")[0]
    : "";
  const [licenseExpiresAt, setLicenseExpiresAt] = useState(initialDate);

  // Parse activeModules safely
  let parsedActiveModules: string[] = [];
  try {
    if (typeof company.activeModules === "string") {
      parsedActiveModules = JSON.parse(company.activeModules || "[]");
    } else if (Array.isArray(company.activeModules)) {
      parsedActiveModules = company.activeModules;
    }
  } catch (e) {
    parsedActiveModules = [];
  }
  const [selectedModules, setSelectedModules] = useState<string[]>(parsedActiveModules);

  const toggleModule = (moduleKey: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((k) => k !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const handleSelectAllModules = () => {
    if (selectedModules.length === SYSTEM_MODULES_CATALOG.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(SYSTEM_MODULES_CATALOG.map((m) => m.key));
    }
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await updateCompanyMaster(company.id, {
      name,
      document,
      planId: planId || null,
      licenseExpiresAt,
      activeModules: selectedModules,
    });

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess("Dados da empresa e módulos atualizados com sucesso!");
      setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 700);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 shadow-sm transition-all"
        title="Editar cadastro e módulos da empresa"
      >
        <Edit size={14} className="text-slate-600" />
        <span>Editar Informações & Módulos</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Editar Cadastro da Empresa</h2>
                  <p className="text-xs text-slate-500">Alterar dados cadastrais, plano vinculado e módulos contratados</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content / Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  1. Dados da Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Razão Social / Nome da Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CNPJ ou CPF *
                    </label>
                    <input
                      type="text"
                      required
                      value={document}
                      onChange={(e) => setDocument(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Plano Vinculado
                    </label>
                    <select
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="">Sem plano definido</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — R$ {Number(p.price).toFixed(2)}/mês
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data de Vencimento da Licença
                    </label>
                    <input
                      type="date"
                      value={licenseExpiresAt}
                      onChange={(e) => setLicenseExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Módulos do Sistema */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      2. Módulos Liberados para este Cliente
                    </h3>
                    <p className="text-xs text-slate-500">
                      Marque apenas as ferramentas que o cliente contratou:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllModules}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    {selectedModules.length === SYSTEM_MODULES_CATALOG.length
                      ? "Desmarcar Todos"
                      : "Marcar Todos"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
                  {SYSTEM_MODULES_CATALOG.map((mod) => {
                    const isChecked = selectedModules.includes(mod.key);
                    return (
                      <label
                        key={mod.key}
                        onClick={() => toggleModule(mod.key)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                          isChecked
                            ? "bg-emerald-50/70 border-emerald-300 text-gray-900"
                            : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 text-white transition-colors ${
                            isChecked ? "bg-emerald-600" : "border border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">{mod.name}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            {mod.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                  {success}
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={14} /> Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

