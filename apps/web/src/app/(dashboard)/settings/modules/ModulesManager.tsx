"use client";

import { useState } from "react";
import { 
  Building2, Store, Truck, Factory, Utensils, Check, ShieldCheck, 
  Layers, Sliders, AlertCircle, Save, Sparkles, Box, FileText, Search, MapPin
} from "lucide-react";
import { updateCompanyFullProfile } from "@/actions/company";
import { SystemModuleInfo, SEGMENT_PRESETS } from "@/lib/modules-catalog";

export interface CompanyDataProps {
  id?: string;
  name: string;
  document: string;
  tradeName?: string;
  segment?: string;
  ie?: string;
  im?: string;
  taxRegime?: string;
  environment?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface ModulesManagerProps {
  companyData: CompanyDataProps;
  initialOperationTypes: string[];
  initialActiveModules: string[];
  allModules: SystemModuleInfo[];
}

const OPERATION_TYPES_CATALOG = [
  { id: "RETAIL", label: "Varejo / Comércio", desc: "Supermercados, padarias, lojas de conveniência", icon: Store, color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30" },
  { id: "DISTRIBUTOR", label: "Distribuição & Atacado", desc: "Distribuidoras de alimentos, bebidas, frios, atacados", icon: Truck, color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30" },
  { id: "FACTORY", label: "Indústria & Fábrica", desc: "Fábricas, produção própria, transformação de insumos", icon: Factory, color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30" },
  { id: "FOOD", label: "Alimentação & Gastronomia", desc: "Restaurantes, lanchonetes, pizzarias, KDS e comandas", icon: Utensils, color: "from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30" },
];

export function ModulesManager({
  companyData,
  initialOperationTypes,
  initialActiveModules,
  allModules,
}: ModulesManagerProps) {
  // Estado dos Dados Cadastrais da Empresa
  const [name, setName] = useState(companyData.name || "");
  const [document, setDocument] = useState(companyData.document || "");
  const [tradeName, setTradeName] = useState(companyData.tradeName || "");
  const [segment, setSegment] = useState(companyData.segment || "SUPERMARKET");
  const [ie, setIe] = useState(companyData.ie || "");
  const [im, setIm] = useState(companyData.im || "");
  const [taxRegime, setTaxRegime] = useState(companyData.taxRegime || "SN");
  const [environment, setEnvironment] = useState(companyData.environment || "homologacao");
  const [street, setStreet] = useState(companyData.street || "");
  const [number, setNumber] = useState(companyData.number || "");
  const [district, setDistrict] = useState(companyData.district || "");
  const [city, setCity] = useState(companyData.city || "");
  const [state, setState] = useState(companyData.state || "AL");
  const [zipCode, setZipCode] = useState(companyData.zipCode || "");

  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [operationTypes, setOperationTypes] = useState<string[]>(initialOperationTypes);
  const [activeModules, setActiveModules] = useState<string[]>(initialActiveModules);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Consulta CNPJ na Receita via API BrasilAPI
  const handleCnpjLookup = async () => {
    const cleanCnpj = document.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      alert("Por favor, digite um CNPJ válido com 14 dígitos.");
      return;
    }

    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!res.ok) throw new Error("CNPJ não encontrado na Receita");
      const data = await res.json();

      setName(data.razao_social || name);
      setTradeName(data.nome_fantasia || data.razao_social || tradeName);
      setStreet(data.logradouro || street);
      setNumber(data.numero || number);
      setDistrict(data.bairro || district);
      setCity(data.municipio || city);
      setState(data.uf || state);
      setZipCode(data.cep ? String(data.cep) : zipCode);

      setMessage({ type: "success", text: "Dados do CNPJ importados com sucesso da Receita Federal!" });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Erro ao consultar CNPJ na Receita.");
    } finally {
      setCnpjLoading(false);
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = SEGMENT_PRESETS[presetKey];
    if (preset) {
      setSegment(presetKey);
      setOperationTypes(preset.operationTypes);
      setActiveModules(preset.modules);
      setMessage({ type: "success", text: `Versão "${preset.label}" aplicada! Clique em Salvar para confirmar.` });
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const toggleOpType = (id: string) => {
    setOperationTypes((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (!prev.includes(id)) {
        const recommended = allModules
          .filter((m) => m.defaultActiveFor.includes(id))
          .map((m) => m.key);
        setActiveModules((current) => Array.from(new Set([...current, ...recommended])));
      }
      return next.length > 0 ? next : ["RETAIL"];
    });
  };

  const toggleModule = (key: string) => {
    setActiveModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const res = await updateCompanyFullProfile({
      name,
      document,
      tradeName,
      segment,
      ie,
      im,
      taxRegime,
      environment,
      street,
      number,
      district,
      city,
      state,
      zipCode,
      operationTypes,
      activeModules,
    });

    setSaving(false);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "success", text: "Perfil da empresa e módulos salvos com sucesso!" });
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const categoryLabels: Record<string, string> = {
    SALES: "Frente de Loja & Vendas",
    OPERATIONS: "Estoque & Suprimentos",
    FINANCE: "Controladoria & Financeiro",
    LOGISTICS: "Distribuição & Logística",
    PRODUCTION: "Indústria & Produção",
    MANAGEMENT: "Gestão & Controle",
  };

  const categories = ["SALES", "OPERATIONS", "FINANCE", "LOGISTICS", "PRODUCTION", "MANAGEMENT"];

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-2">
              <Sparkles size={13} />
              Configuração Multissetorial
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Perfil da Empresa & Módulos do RP
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Personalize o sistema de <strong className="text-white">{name || "Sua Empresa"}</strong>. Ative múltiplos perfis (ex: Varejo + Distribuição + Indústria) para desbloquear os módulos necessários.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {saving ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Save size={16} />
            )}
            <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {message.type === "success" ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* DADOS CADASTRAIS & FISCAIS DA EMPRESA */}
      <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-indigo-500/10 pb-4">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-indigo-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Dados Cadastrais & Identificação Fiscal</h2>
              <p className="text-xs text-slate-400">Insira o CNPJ para preenchimento automático dos dados via Receita Federal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCnpjLookup}
            disabled={cnpjLoading}
            className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold px-3.5 py-2 rounded-xl border border-indigo-500/20 transition-all text-xs cursor-pointer"
          >
            {cnpjLoading ? <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-indigo-300 border-t-transparent" /> : <Search size={14} />}
            <span>{cnpjLoading ? "Buscando..." : "Consultar Receita"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">CNPJ / CPF *</label>
            <input
              type="text"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Razão Social *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mercado & Empório Modelo LTDA"
              className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Nome Fantasia</label>
            <input
              type="text"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              placeholder="Ex: Empório Modelo"
              className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Versão / Segmento do RP</label>
            <select
              value={segment}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3.5 py-2.5 text-xs text-indigo-300 font-bold outline-none cursor-pointer"
            >
              <option value="SUPERMARKET">RP Supermercado / Varejo</option>
              <option value="BAKERY">RP Padaria & Confeitaria</option>
              <option value="RESTAURANT">RP Restaurante / Pizzaria</option>
              <option value="DISTRIBUTOR">RP Distribuidora & Atacado</option>
              <option value="FACTORY">RP Indústria & Fábrica</option>
              <option value="ENTERPRISE">RP Multissetorial Enterprise</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Inscrição Estadual (IE)</label>
            <input
              type="text"
              value={ie}
              onChange={(e) => setIe(e.target.value)}
              placeholder="Ex: 240.123.456"
              className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Regime Tributário</label>
            <select
              value={taxRegime}
              onChange={(e) => setTaxRegime(e.target.value)}
              className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer"
            >
              <option value="SN">Simples Nacional</option>
              <option value="LP">Lucro Presumido</option>
              <option value="LR">Lucro Real</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Ambiente NF-e/NFC-e</label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer"
            >
              <option value="homologacao">Homologação (Testes)</option>
              <option value="producao">Produção (Validade Jurídica)</option>
            </select>
          </div>
        </div>

        {/* Endereço */}
        <div className="pt-3 border-t border-indigo-500/10">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-3">
            <MapPin size={14} className="text-indigo-400" /> Endereço da Sede / Matriz
          </label>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-1">
              <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="CEP" className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono" />
            </div>
            <div className="md:col-span-2">
              <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Logradouro / Rua / Av." className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
            </div>
            <div className="md:col-span-1">
              <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número" className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
            </div>
            <div className="md:col-span-1">
              <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Bairro" className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
            </div>
            <div className="md:col-span-1">
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade / Estado" className="w-full bg-[#0c0f1a] border border-indigo-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* SELEÇÃO RÁPIDA DE VERSÃO DO RP */}
      <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Box size={18} className="text-indigo-400" />
          <h2 className="text-lg font-bold text-white">Versões Pré-Configuradas do RP (Ativação em 1 Clique)</h2>
        </div>
        <p className="text-slate-400 text-xs mb-4">
          Escolha o segmento da empresa para aplicar automaticamente os módulos ideais do RP:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(SEGMENT_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className="bg-[#0c0f1a] hover:bg-indigo-600/20 border border-indigo-500/15 hover:border-indigo-500/40 p-3 rounded-xl text-left transition-all group"
            >
              <span className="block text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                {preset.label.split(" / ")[0]}
              </span>
              <span className="block text-[10px] text-slate-500 mt-1">
                {preset.modules.length} módulos
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. SELEÇÃO DO PERFIL DA EMPRESA */}
      <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-indigo-400" />
          <h2 className="text-lg font-bold text-white">1. Perfil da Empresa (Tipos de Operação)</h2>
        </div>
        <p className="text-slate-400 text-xs mb-5">
          Sua empresa atua em mais de um segmento? Selecione todos que se aplicam. O menu e os módulos serão ajustados automaticamente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {OPERATION_TYPES_CATALOG.map((op) => {
            const Icon = op.icon;
            const isSelected = operationTypes.includes(op.id);
            return (
              <div
                key={op.id}
                onClick={() => toggleOpType(op.id)}
                className={`cursor-pointer rounded-xl p-4 border transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? `bg-gradient-to-br ${op.color} shadow-lg shadow-black/40 border-2`
                    : "bg-[#0c0f1a] border-indigo-500/10 hover:border-indigo-500/30 text-slate-400"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-lg ${isSelected ? "bg-white/10" : "bg-indigo-500/10 text-indigo-400"}`}>
                    <Icon size={20} />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white">{op.label}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{op.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. MÓDULOS DO SISTEMA */}
      <div className="bg-[#111528] border border-indigo-500/15 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-indigo-400" />
            <h2 className="text-lg font-bold text-white">2. Módulos Ativos do Sistema</h2>
          </div>
          <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            {activeModules.length} de {allModules.length} módulos ativos
          </span>
        </div>
        <p className="text-slate-400 text-xs mb-6">
          Ative ou desative recursos individualmente. Módulos desativados são ocultados do menu lateral.
        </p>

        <div className="space-y-8">
          {categories.map((catKey) => {
            const catModules = allModules.filter((m) => m.category === catKey);
            if (catModules.length === 0) return null;

            return (
              <div key={catKey}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-500/10">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-400/70">
                    {categoryLabels[catKey] || catKey}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catModules.map((mod) => {
                    const isActive = activeModules.includes(mod.key);
                    return (
                      <div
                        key={mod.key}
                        onClick={() => toggleModule(mod.key)}
                        className={`cursor-pointer rounded-xl p-3.5 border transition-all flex items-start gap-3 ${
                          isActive
                            ? "bg-indigo-500/10 border-indigo-500/40 text-white"
                            : "bg-[#0c0f1a]/60 border-indigo-500/[0.06] text-slate-500 hover:text-slate-300 hover:border-indigo-500/20"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                            isActive
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "border-slate-700 bg-slate-900"
                          }`}
                        >
                          {isActive && <Check size={12} strokeWidth={3} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-xs text-white truncate">{mod.name}</h4>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
