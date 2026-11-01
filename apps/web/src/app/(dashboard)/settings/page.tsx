"use client";

import { useState, useEffect } from "react";
import { getFiscalConfig, saveFiscalConfig } from "@/actions/fiscalConfig";
import { getTenantCompanyInfo, updateTenantCompanyInfo } from "@/actions/company";
import { setupDemonstrativoAndCleanReal } from "@/actions/maintenance";
import { TenantUsersManager } from "./TenantUsersManager";
import { CustoOperacionalTab } from "./CustoOperacionalTab";
import {
  loadPdvPaymentConfig,
  savePdvPaymentConfig,
  PdvPaymentConfig,
  DEFAULT_PDV_PAYMENT_CONFIG,
  ALL_SUGGESTED_ACQUIRERS,
  ALL_SUGGESTED_BRANDS,
} from "@/lib/pdvPaymentConfig";
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
  Loader2,
  Calculator,
} from "lucide-react";

const TABS = [
  { id: "geral", label: "Geral", icon: <SettingsIcon size={18} /> },
  { id: "custo-operacional", label: "Custo Operacional", icon: <Calculator size={18} /> },
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
    <div className="space-y-5 max-w-5xl pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configurações da Empresa</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex min-h-[600px]">
        {/* Sidebar */}
        <div className="w-72 border-r border-gray-100 bg-gray-50 p-5 space-y-1 shrink-0">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-4">Configurações</p>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
              }`}
            >
              <span className={activeTab === tab.id ? "text-white" : "text-gray-400"}>{tab.icon}</span>
              {tab.label}
              {tab.id === "fiscal" && (
                <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md border border-amber-200">!</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-8">
          {saved && (
            <div className="mb-5 flex items-center gap-2 text-emerald-700 text-sm font-bold bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl">
              <CheckCircle2 size={18} /> Alterações salvas com sucesso!
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
              <AlertTriangle size={18} /> {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex justify-center text-gray-400">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : (
            <>
              {activeTab === "geral" && (
                <GeralTab
                  company={companyData}
                  fiscal={fiscalData}
                  certFile={certFile}
                  setCertFile={setCertFile}
                  setActiveTab={setActiveTab}
                  saving={saving}
                  onSubmit={handleGeralSave}
                />
              )}
              {activeTab === "custo-operacional" && <CustoOperacionalTab />}
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

function GeralTab({ company, fiscal, certFile, setCertFile, setActiveTab, saving, onSubmit }: any) {
  const [runningClean, setRunningClean] = useState(false);

  const handleRunDemoAndClean = async () => {
    const msg = "CONFIRMAÇÃO:\n\n" +
      "1. Será criado o usuário 'demonstrativo' (senha: 1234) com todos os produtos fictícios preservados para vitrine.\n" +
      "2. Todos os produtos e vendas fake da sua conta atual serão apagados para você começar a subir a base real do cliente.\n\n" +
      "Deseja prosseguir?";
    if (!window.confirm(msg)) return;

    setRunningClean(true);
    try {
      const res = await setupDemonstrativoAndCleanReal();
      if (res.success) {
        alert(res.message);
        window.location.reload();
      } else {
        alert("Erro: " + (res.error || "Falha ao processar."));
      }
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setRunningClean(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Building2 className="text-blue-600" size={24} />
        <div>
          <h2 className="text-lg font-bold text-gray-900">Informações da Empresa</h2>
          <p className="text-gray-500 text-xs">Identificação comercial e credenciais fiscais da matriz</p>
        </div>
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

      {/* 🔐 Seção de Importação do Certificado Digital A1 direto na Aba Geral */}
      <div className="pt-5 border-t border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-600" size={20} />
            <h3 className="text-base font-bold text-gray-900">Certificado Digital A1 (.pfx / .p12)</h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("fiscal")}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-1"
          >
            Ver aba Fiscal &amp; NF-e &rarr;
          </button>
        </div>

        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-800 flex gap-3">
          <Info size={18} className="shrink-0 mt-0.5 text-blue-600" />
          <div className="leading-relaxed">
            O certificado digital A1 é obrigatório para assinar <strong>NF-e, NFC-e</strong> e para a busca automática de notas no <strong>Radar SEFAZ DF-e</strong>. Você pode carregá-lo diretamente aqui ou na aba lateral <strong>Fiscal &amp; NF-e</strong>.
          </div>
        </div>

        {/* Upload Box */}
        <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${certFile || fiscal?.certUploaded ? "border-emerald-400 bg-emerald-50/50" : "border-gray-300 bg-gray-50/60 hover:border-blue-400 hover:bg-blue-50/30"}`}>
          {certFile || fiscal?.certUploaded ? (
            <div className="space-y-2">
              <CheckCircle2 size={34} className="mx-auto text-emerald-600" />
              <p className="text-emerald-800 font-bold text-sm">
                {certFile ? certFile.name : "Certificado Digital A1 Instalado e Ativo"}
              </p>
              {fiscal?.certExpiration && (
                <p className="text-gray-500 text-xs">Válido até: {new Date(fiscal.certExpiration).toLocaleDateString("pt-BR")}</p>
              )}
              <div className="flex items-center justify-center gap-3 pt-1">
                <label className="text-blue-600 text-xs font-bold hover:underline cursor-pointer">
                  Substituir Arquivo .pfx
                  <input type="file" accept=".pfx,.p12" className="hidden" onChange={e => setCertFile(e.target.files?.[0] ?? null)} />
                </label>
                {certFile && (
                  <button type="button" onClick={() => setCertFile(null)} className="text-red-500 text-xs hover:underline font-bold">
                    Cancelar novo arquivo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <input type="file" accept=".pfx,.p12" className="hidden" onChange={e => setCertFile(e.target.files?.[0] ?? null)} />
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-800 font-bold text-sm">Clique ou arraste seu arquivo .pfx ou .p12</p>
              <p className="text-gray-500 text-xs mt-0.5">Certificado Digital modelo A1 (Serasa, Certisign, Soluti, etc.)</p>
              <div className="mt-3 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors">
                <Upload size={14} /> Selecionar Certificado (.pfx)
              </div>
            </label>
          )}
        </div>

        {/* Senha do Certificado */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Senha do Certificado Digital A1
          </label>
          <input
            type="password"
            name="certPassword"
            placeholder={fiscal?.certUploaded ? "•••••••• (Senha já configurada. Digite apenas se desejar alterar)" : "Digite a senha do arquivo .pfx"}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-sm transition-all placeholder:text-gray-400"
          />
          <p className="text-gray-400 text-[11px] mt-1">A senha é armazenada de forma segura com criptografia.</p>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-colors disabled:opacity-50 text-sm"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Dados da Empresa &amp; Certificado
        </button>
      </div>

      {/* SEÇÃO: AMBIENTE DEMONSTRATIVO & LIMPEZA PARA CLIENTE REAL */}
      <div className="mt-8 p-6 bg-gradient-to-r from-indigo-900/5 via-purple-900/5 to-transparent border-2 border-dashed border-indigo-200 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              <span>Modo Demonstração vs Produção Real</span>
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Isolar Dados Fake para Usuário Demonstrativo &amp; Limpar Base Real
            </h3>
            <p className="text-xs text-gray-600 mt-1 max-w-xl leading-relaxed">
              Cria o usuário <strong>demonstrativo</strong> com senha <strong>1234</strong> para apresentar o sistema a novos clientes (com todos os dados de teste preservados) e limpa os produtos e vendas fictícias da sua conta principal para você subir os dados reais do cliente.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunDemoAndClean}
            disabled={runningClean}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 shrink-0 cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {runningClean ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processando Limpeza...</span>
              </>
            ) : (
              <span>Ativar Demonstrativo &amp; Limpar Base</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

function FiscalTab({ fiscal, company, env, setEnv, certFile, setCertFile, saving, onSubmit }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Configuração Fiscal & NF-e</h2>
          <p className="text-gray-500 text-sm">Dados para emissão de NF-e e NFC-e pela SEFAZ</p>
        </div>
      </div>

      {/* Environment Toggle */}
      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200">
        <p className="text-gray-700 font-bold text-sm mb-3">🌐 Ambiente de Emissão</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setEnv("homologacao")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              env === "homologacao"
                ? "bg-amber-50 text-amber-700 border-2 border-amber-400"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
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
                ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-400"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            🏭 Produção
            <div className="text-xs font-normal mt-0.5 opacity-70">Notas fiscais com validade jurídica</div>
          </button>
        </div>
      </div>

      {/* Company Data */}
      <div className="space-y-4">
        <h3 className="text-gray-900 font-bold text-sm flex items-center gap-2">
          <FileText size={16} className="text-blue-600" /> Dados da Emitente
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
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Regime Tributário</label>
            <select
              name="taxRegime"
              defaultValue={fiscal?.taxRegime || "SN"}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all"
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
        <h3 className="text-gray-900 font-bold text-sm flex items-center gap-2">
          <Building2 size={16} className="text-blue-600" /> Endereço Fiscal
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
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Estado</label>
            <select
              name="state"
              defaultValue={fiscal?.state || "SP"}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm"
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
        <h3 className="text-gray-900 font-bold text-sm">📋 Numeração</h3>
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
        <h3 className="text-gray-900 font-bold text-sm">⚡ Integração Focus NFe (Emissor)</h3>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 flex gap-3">
          <Info size={18} className="shrink-0 mt-0.5 text-blue-500" />
          <div>
            Para emissão real, crie uma conta em{" "}
            <a href="https://focusnfe.com.br" target="_blank" className="underline font-bold text-blue-600 hover:text-blue-800">focusnfe.com.br</a>
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
        <h3 className="text-gray-900 font-bold text-sm">🔐 Certificado Digital A1</h3>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            Seu certificado digital é o arquivo <strong>.pfx</strong> gerado pela sua CA (Serasa, Certisign, Soluti, etc.). Ele é necessário para assinar digitalmente as notas fiscais.
          </div>
        </div>

        <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${certFile || fiscal?.certUploaded ? "border-emerald-400 bg-emerald-50" : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"}`}>
          {certFile || fiscal?.certUploaded ? (
            <div className="space-y-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
              <p className="text-emerald-700 font-bold">{certFile ? certFile.name : "Certificado Digital A1 Carregado"}</p>
              {fiscal?.certExpiration && (
                <p className="text-gray-500 text-xs">Válido até: {new Date(fiscal.certExpiration).toLocaleDateString("pt-BR")}</p>
              )}
              {certFile && (
                <button type="button" onClick={() => setCertFile(null)} className="text-red-500 text-xs hover:underline">Remover</button>
              )}
            </div>
          ) : (
            <label className="cursor-pointer block">
              <input type="file" accept=".pfx,.p12" className="hidden" onChange={e => setCertFile(e.target.files?.[0] ?? null)} />
              <Upload size={36} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-700 font-bold">Clique para carregar o certificado</p>
              <p className="text-gray-500 text-sm mt-1">Arquivos .pfx ou .p12 (certificado A1)</p>
              <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-xl text-sm font-bold">
                <Upload size={16} /> Selecionar Arquivo .pfx
              </div>
            </label>
          )}
        </div>

        {(certFile || fiscal?.certUploaded) && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Senha do Certificado</label>
            <input
              type="password"
              name="certPassword"
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
            <p className="text-gray-400 text-xs mt-1.5">A senha é armazenada de forma segura e criptografada.</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Configuração Fiscal
        </button>
      </div>
    </form>
  );
}

function PagamentosTab() {
  const [cfg, setCfg] = useState<PdvPaymentConfig>(DEFAULT_PDV_PAYMENT_CONFIG);
  const [newAcq, setNewAcq] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setCfg(loadPdvPaymentConfig());
  }, []);

  const updateCfg = (next: PdvPaymentConfig) => {
    setCfg(next);
    savePdvPaymentConfig(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Formas de Pagamento, PIX e Maquinetas POS (PDV)</h2>
        <p className="text-gray-500 text-sm">
          Personalize como as formas de pagamento e maquinetas POS funcionam no PDV de acordo com a operação deste cliente.
        </p>
      </div>

      {savedToast && (
        <div className="flex items-center gap-2 text-emerald-700 text-sm font-bold bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl">
          <CheckCircle2 size={18} /> Configurações de pagamento do PDV salvas!
        </div>
      )}

      {/* 1. Formas de Pagamento Ativas no PDV */}
      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
          1. Formas de Pagamento Ativas no PDV
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {([
            { key: "MONEY", label: "Dinheiro" },
            { key: "PIX", label: "PIX" },
            { key: "CREDIT_CARD", label: "Cartão Crédito" },
            { key: "DEBIT_CARD", label: "Cartão Débito" },
            { key: "VOUCHER", label: "Voucher / Vale" },
          ] as const).map(m => {
            const active = cfg.enabledMethods[m.key] !== false;
            return (
              <label
                key={m.key}
                className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                  active
                    ? "bg-blue-50 border-blue-500 text-blue-800"
                    : "bg-white border-gray-200 text-gray-500"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={e =>
                    updateCfg({
                      ...cfg,
                      enabledMethods: { ...cfg.enabledMethods, [m.key]: e.target.checked },
                    })
                  }
                />
                {m.label}
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. Modo de Operação Cartão (Maquineta POS vs Direto) */}
      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              2. Pagamento em Cartão — Modo Maquineta POS
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Quando ativo, solicita ao operador do caixa a Administradora, Bandeira e o Código de Autenticação impresso no comprovante da maquineta POS.
            </p>
          </div>
          <label className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-200 font-bold text-xs text-blue-700 cursor-pointer">
            <input
              type="checkbox"
              checked={cfg.posModeEnabled}
              onChange={e => updateCfg({ ...cfg, posModeEnabled: e.target.checked })}
            />
            Ativar Modo Maquineta POS
          </label>
        </div>

        {cfg.posModeEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
            <label className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.askAcquirer}
                onChange={e => updateCfg({ ...cfg, askAcquirer: e.target.checked })}
              />
              Solicitar seleção da Administradora (Maquineta POS)
            </label>
            <label className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.askBrand}
                onChange={e => updateCfg({ ...cfg, askBrand: e.target.checked })}
              />
              Solicitar seleção da Bandeira do Cartão
            </label>
            <label className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.requireAuthCode}
                onChange={e => updateCfg({ ...cfg, requireAuthCode: e.target.checked })}
              />
              Exigir digitação do Código de Autenticação / NSU do comprovante
            </label>
            <label className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.allowInstallments}
                onChange={e => updateCfg({ ...cfg, allowInstallments: e.target.checked })}
              />
              Habilitar seleção de Parcelas no Crédito
            </label>
          </div>
        )}
      </div>

      {/* 3. Maquinetas (Administradoras) e Bandeiras deste Cliente */}
      {cfg.posModeEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Maquinetas (Administradoras) do Cliente
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...ALL_SUGGESTED_ACQUIRERS, ...cfg.acquirers])).map(acq => {
                const active = cfg.acquirers.includes(acq);
                return (
                  <button
                    key={acq}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? cfg.acquirers.filter(a => a !== acq)
                        : [...cfg.acquirers, acq];
                      if (next.length > 0) updateCfg({ ...cfg, acquirers: next });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {active ? "✓ " : "+ "}
                    {acq}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newAcq}
                onChange={e => setNewAcq(e.target.value)}
                placeholder="Adicionar outra maquineta..."
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  const v = newAcq.trim();
                  if (v && !cfg.acquirers.includes(v)) {
                    updateCfg({ ...cfg, acquirers: [...cfg.acquirers, v] });
                    setNewAcq("");
                  }
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Adicionar
              </button>
            </div>
          </div>

          <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Bandeiras Aceitas pelo Cliente
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...ALL_SUGGESTED_BRANDS, ...cfg.brands])).map(brand => {
                const active = cfg.brands.includes(brand);
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? cfg.brands.filter(b => b !== brand)
                        : [...cfg.brands, brand];
                      if (next.length > 0) updateCfg({ ...cfg, brands: next });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {active ? "✓ " : "+ "}
                    {brand}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newBrand}
                onChange={e => setNewBrand(e.target.value)}
                placeholder="Adicionar outra bandeira..."
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  const v = newBrand.trim();
                  if (v && !cfg.brands.includes(v)) {
                    updateCfg({ ...cfg, brands: [...cfg.brands, v] });
                    setNewBrand("");
                  }
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Dados PIX */}
      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Configuração de Chave PIX</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Chave PIX" name="pix" placeholder="12.345.678/0001-99 ou email@pix.com" />
          <Field label="Nome Beneficiário PIX" name="pixName" placeholder="Mercado & Empório Modelo LTDA" />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            savePdvPaymentConfig(cfg);
            setSavedToast(true);
            setTimeout(() => setSavedToast(false), 3000);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
        >
          <Save size={18} /> Salvar Configurações de Pagamento
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
      <h2 className="text-lg font-bold text-gray-900">Segurança & Senhas</h2>
      <div className="space-y-4">
        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
          <h3 className="text-gray-900 font-bold">Alterar Senha do Usuário</h3>
          <Field label="Senha Atual" name="currentPwd" type="password" placeholder="••••••••" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nova Senha" name="newPwd" type="password" placeholder="••••••••" />
            <Field label="Confirmar Nova Senha" name="confirmPwd" type="password" placeholder="••••••••" />
          </div>
        </div>
      </div>
      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-colors">
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
      <label className="block text-sm font-bold text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-400 text-sm"
      />
    </div>
  );
}
