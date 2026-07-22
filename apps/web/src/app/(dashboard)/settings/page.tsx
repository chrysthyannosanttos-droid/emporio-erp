"use client";

import { useState, useEffect } from "react";
import { getFiscalConfig, saveFiscalConfig } from "@/actions/fiscalConfig";
import { getTenantCompanyInfo, updateTenantCompanyInfo } from "@/actions/company";
import { TenantUsersManager } from "./TenantUsersManager";
import {
  Settings as SettingsIcon,
  Shield,
  User,
  CreditCard,
  Save,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  Building2,
  Loader2
} from "lucide-react";

const TABS = [
  { id: "geral", label: "Geral", icon: <SettingsIcon size={18} /> },
  { id: "usuarios", label: "Usuários e Perfis", icon: <User size={18} /> },
  { id: "fiscal", label: "Fiscal & NF-e", icon: <FileText size={18} /> },
  { id: "pagamentos", label: "Pagamentos e PIX", icon: <CreditCard size={18} /> },
  { id: "seguranca", label: "Segurança", icon: <Shield size={18} /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("geral");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [env, setEnv] = useState<"homologacao" | "producao">("homologacao");
  const [companyData, setCompanyData] = useState<any>(null);
  const [fiscalData, setFiscalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [cRes, fRes] = await Promise.all([
        getTenantCompanyInfo(),
        getFiscalConfig(),
      ]);

      if (cRes.company) setCompanyData(cRes.company);
      if (fRes.config) {
        setFiscalData(fRes.config);
        if (fRes.config.environment) {
          setEnv(fRes.config.environment as any);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleGeralSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    const res = await updateTenantCompanyInfo(formData);
    setSaving(false);

    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleFiscalSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    formData.set("environment", env);
    const res = await saveFiscalConfig(formData);
    setSaving(false);

    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Configurações da Empresa</h1>
      </div>

      <div className="bg-[#111528] rounded-2xl border border-indigo-500/[0.08] shadow-xl overflow-hidden flex min-h-[600px]">
        {/* Sidebar */}
        <div className="w-72 border-r border-indigo-500/[0.08] bg-[#0c0f1a]/50 p-5 space-y-1 shrink-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-4">Configurações</p>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:bg-[#161b33] hover:text-slate-100"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "fiscal" && (
                <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/20">!</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {saved && (
            <div className="mb-5 flex items-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 rounded-xl">
              <CheckCircle2 size={18} /> Alterações salvas com sucesso!
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 flex items-center gap-2 text-red-400 text-sm font-bold bg-red-500/10 border border-red-500/30 px-4 py-2.5 rounded-xl">
              <AlertTriangle size={18} /> {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex justify-center text-slate-400">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : (
            <>
              {activeTab === "geral" && (
                <GeralTab
                  company={companyData}
                  fiscal={fiscalData}
                  saving={saving}
                  onSubmit={handleGeralSave}
                />
              )}
              {activeTab === "fiscal" && (
                <FiscalTab
                  fiscal={fiscalData}
                  company={companyData}
                  env={env}
                  setEnv={setEnv}
                  certFile={certFile}
                  setCertFile={setCertFile}
                  saving={saving}
                  onSubmit={handleFiscalSave}
                />
              )}
              {activeTab === "pagamentos" && <PagamentosTab />}
              {activeTab === "usuarios" && <UsuariosTab />}
              {activeTab === "seguranca" && <SegurancaTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GeralTab({ company, fiscal, saving, onSubmit }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="text-indigo-400" size={24} />
        <h2 className="text-lg font-bold text-white">Informações da Empresa</h2>
      </div>
      <div className="space-y-4">
        <Field
          label="Razão Social *"
          name="name"
          required
          defaultValue={company?.name || ""}
          placeholder="Mercado & Empório Modelo LTDA"
        />
        <Field
          label="Nome Fantasia"
          name="tradeName"
          defaultValue={fiscal?.tradeName || ""}
          placeholder="Empório Modelo"
        />
        <Field
          label="CNPJ / CPF *"
          name="document"
          required
          defaultValue={company?.document || ""}
          placeholder="00.000.000/0001-00"
        />
      </div>
      <div className="pt-4 border-t border-indigo-500/[0.08]">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Dados da Empresa
        </button>
      </div>
    </form>
  );
}

function FiscalTab({ fiscal, company, env, setEnv, certFile, setCertFile, saving, onSubmit }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-bold text-white">Configuração Fiscal & NF-e</h2>
          <p className="text-slate-400 text-sm">Dados para emissão de NF-e e NFC-e pela SEFAZ</p>
        </div>
      </div>

      {/* Environment Toggle */}
      <div className="p-5 bg-[#161b33] rounded-2xl border border-indigo-500/15">
        <p className="text-slate-300 font-bold text-sm mb-3">🌐 Ambiente de Emissão</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setEnv("homologacao")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              env === "homologacao"
                ? "bg-amber-500/20 text-amber-400 border-2 border-amber-500/50"
                : "bg-[#111528] text-slate-400 border border-indigo-500/15 hover:border-slate-600"
            }`}
          >
            🧪 Homologação
            <div className="text-xs font-normal mt-0.5 opacity-70">Notas de teste (sem validade fiscal)</div>
          </button>
          <button
            type="button"
            onClick={() => setEnv("producao")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              env === "producao"
                ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50"
                : "bg-[#111528] text-slate-400 border border-indigo-500/15 hover:border-slate-600"
            }`}
          >
            🏭 Produção
            <div className="text-xs font-normal mt-0.5 opacity-70">Notas fiscais com validade jurídica</div>
          </button>
        </div>
      </div>

      {/* Company Data */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <FileText size={16} className="text-indigo-400" /> Dados da Emitente
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="CNPJ *"
            name="cnpj"
            required
            defaultValue={fiscal?.cnpj || company?.document || ""}
            placeholder="00.000.000/0001-00"
          />
          <Field
            label="Razão Social *"
            name="companyName"
            required
            defaultValue={fiscal?.companyName || company?.name || ""}
            placeholder="Empresa LTDA"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Nome Fantasia"
            name="tradeName"
            defaultValue={fiscal?.tradeName || ""}
            placeholder="Empório Modelo"
          />
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1.5">Regime Tributário</label>
            <select
              name="taxRegime"
              defaultValue={fiscal?.taxRegime || "SN"}
              className="w-full px-4 py-3 bg-[#161b33] border border-indigo-500/15 text-slate-100 rounded-xl outline-none focus:border-indigo-500"
            >
              <option value="SN">Simples Nacional</option>
              <option value="LP">Lucro Presumido</option>
              <option value="LR">Lucro Real</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Inscrição Estadual"
            name="ie"
            defaultValue={fiscal?.ie || ""}
            placeholder="000.000.000.000"
          />
          <Field
            label="Inscrição Municipal"
            name="im"
            defaultValue={fiscal?.im || ""}
            placeholder="000000-0"
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <Building2 size={16} className="text-indigo-400" /> Endereço Fiscal
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field
              label="Rua/Logradouro"
              name="street"
              defaultValue={fiscal?.street || ""}
              placeholder="Rua das Flores"
            />
          </div>
          <Field
            label="Número"
            name="number"
            defaultValue={fiscal?.number || ""}
            placeholder="123"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field
            label="Bairro"
            name="district"
            defaultValue={fiscal?.district || ""}
            placeholder="Centro"
          />
          <Field
            label="Cidade"
            name="city"
            defaultValue={fiscal?.city || ""}
            placeholder="São Paulo"
          />
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1.5">Estado</label>
            <select
              name="state"
              defaultValue={fiscal?.state || "SP"}
              className="w-full px-4 py-3 bg-[#161b33] border border-indigo-500/15 text-slate-100 rounded-xl outline-none focus:border-indigo-500 text-sm"
            >
              {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field
            label="CEP"
            name="zipCode"
            defaultValue={fiscal?.zipCode || ""}
            placeholder="00000-000"
          />
        </div>
      </div>

      {/* Series */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm">📋 Numeração</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Série NF-e"
            name="nfeSeries"
            defaultValue={fiscal?.nfeSeries || "1"}
            placeholder="1"
          />
          <Field
            label="Série NFC-e"
            name="nfceeSeries"
            defaultValue={fiscal?.nfceeSeries || "1"}
            placeholder="1"
          />
        </div>
      </div>

      {/* Focus NFe Token */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm">⚡ Integração Focus NFe (Emissor)</h3>
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-300 flex gap-3">
          <Info size={18} className="shrink-0 mt-0.5" />
          <div>
            Para emissão real, crie uma conta em{" "}
            <a href="https://focusnfe.com.br" target="_blank" className="underline font-bold text-blue-200 hover:text-white">focusnfe.com.br</a>
            {" "}e cole seu token abaixo. Em Homologação, a API é gratuita para testes.
          </div>
        </div>
        <Field
          label="Token API Focus NFe"
          name="focusNfeToken"
          defaultValue={fiscal?.focusNfeToken || ""}
          placeholder="seu-token-aqui"
        />
      </div>

      {/* Certificate */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm">🔐 Certificado Digital A1</h3>
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300 flex gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            Seu certificado digital é o arquivo <strong>.pfx</strong> gerado pela sua CA (Serasa, Certisign, Soluti, etc.). Ele é necessário para assinar digitalmente as notas fiscais.
          </div>
        </div>

        <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${certFile || fiscal?.certUploaded ? "border-emerald-500/50 bg-emerald-500/5" : "border-indigo-500/15 bg-[#161b33]/30 hover:border-indigo-500/50 hover:bg-indigo-500/5"}`}>
          {certFile || fiscal?.certUploaded ? (
            <div className="space-y-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
              <p className="text-emerald-400 font-bold">{certFile ? certFile.name : "Certificado Digital A1 Carregado"}</p>
              {fiscal?.certExpiration && (
                <p className="text-slate-400 text-xs">Válido até: {new Date(fiscal.certExpiration).toLocaleDateString("pt-BR")}</p>
              )}
              {certFile && (
                <button type="button" onClick={() => setCertFile(null)} className="text-red-400 text-xs hover:underline">Remover</button>
              )}
            </div>
          ) : (
            <label className="cursor-pointer block">
              <input type="file" accept=".pfx,.p12" className="hidden" onChange={e => setCertFile(e.target.files?.[0] ?? null)} />
              <Upload size={36} className="mx-auto text-slate-500 mb-3" />
              <p className="text-slate-300 font-bold">Clique para carregar o certificado</p>
              <p className="text-slate-500 text-sm mt-1">Arquivos .pfx ou .p12 (certificado A1)</p>
              <div className="mt-3 inline-flex items-center gap-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl text-sm font-bold">
                <Upload size={16} /> Selecionar Arquivo .pfx
              </div>
            </label>
          )}
        </div>

        {(certFile || fiscal?.certUploaded) && (
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1.5">Senha do Certificado</label>
            <input
              type="password"
              name="certPassword"
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#161b33] border border-indigo-500/15 text-white rounded-xl outline-none focus:border-indigo-500 transition-all"
            />
            <p className="text-slate-500 text-xs mt-1.5">A senha é armazenada de forma segura e criptografada.</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-indigo-500/[0.08]">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Configuração Fiscal
        </button>
      </div>
    </form>
  );
}

function PagamentosTab() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-white">Pagamentos e PIX</h2>
      <div className="space-y-4">
        <Field label="Chave PIX" name="pix" placeholder="12.345.678/0001-99 ou email@pix.com" />
        <Field label="Nome Beneficiário PIX" name="pixName" placeholder="Mercado & Empório Modelo LTDA" />
      </div>
      <div className="pt-4">
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors">
          <Save size={18} /> Salvar
        </button>
      </div>
    </div>
  );
}

function UsuariosTab() {
  return <TenantUsersManager />;
}

function SegurancaTab() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-white">Segurança & Senhas</h2>
      <div className="space-y-4">
        <div className="p-5 bg-[#161b33] rounded-2xl border border-indigo-500/15 space-y-4">
          <h3 className="text-white font-bold">Alterar Senha do Usuário</h3>
          <Field label="Senha Atual" name="currentPwd" type="password" placeholder="••••••••" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nova Senha" name="newPwd" type="password" placeholder="••••••••" />
            <Field label="Confirmar Nova Senha" name="confirmPwd" type="password" placeholder="••••••••" />
          </div>
        </div>
      </div>
      <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors">
        <Save size={18} /> Salvar Senha
      </button>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-300 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full px-4 py-3 bg-[#161b33] border border-indigo-500/15 text-white rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-500 text-sm"
      />
    </div>
  );
}
