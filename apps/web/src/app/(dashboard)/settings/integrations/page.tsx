"use client";

import { useState, useEffect } from "react";
import {
  Globe, Shield, Key, Copy, Check, RefreshCw, Smartphone, 
  ExternalLink, Server, Wifi, Terminal, ShoppingBag, Utensils, 
  Layers, CheckCircle2, AlertCircle, Save, Send, Database
} from "lucide-react";
import { 
  getCompanyIntegrationCredentials, 
  regenerateApiToken, 
  saveIntegrationSettings,
  IntegrationCredentials 
} from "@/actions/integrations";

export default function IntegrationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<IntegrationCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form states
  const [cloudIp, setCloudIp] = useState("");
  const [cloudHost, setCloudHost] = useState("");
  const [clientSlug, setClientSlug] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  
  // Test endpoint state
  const [testingApi, setTestingApi] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  async function loadCredentials() {
    setLoading(true);
    try {
      const res = await getCompanyIntegrationCredentials();
      if (res.success && res.credentials) {
        setCredentials(res.credentials);
        setCloudIp(res.credentials.cloudIp || "");
        setCloudHost(res.credentials.cloudHost || "");
        setClientSlug(res.credentials.clientSlug || "");
        setWebhookUrl(res.credentials.webhookUrl || "");
      } else {
        setFeedback({ type: "error", message: res.error || "Erro ao carregar credenciais." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Falha de comunicação." });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string, fieldName: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  }

  async function handleSaveSettings() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await saveIntegrationSettings({
        cloudIp,
        cloudHost,
        clientSlug,
        webhookUrl,
      });
      if (res.success) {
        setFeedback({ type: "success", message: "Configurações de integração salvas com sucesso!" });
        loadCredentials();
      } else {
        setFeedback({ type: "error", message: res.error || "Erro ao salvar configurações." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erro inesperado." });
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateToken() {
    if (!confirm("ATENÇÃO: Regenerar a chave invalidará a conexão de todos os aplicativos externos conectados atualmente. Deseja continuar?")) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await regenerateApiToken();
      if (res.success && res.newToken) {
        setFeedback({ type: "success", message: "Nova chave de API gerada com sucesso!" });
        loadCredentials();
      } else {
        setFeedback({ type: "error", message: res.error || "Erro ao regenerar chave." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Falha ao gerar nova chave." });
    } finally {
      setRegenerating(false);
    }
  }

  async function runQuickApiTest() {
    if (!credentials) return;
    setTestingApi(true);
    setApiResponse(null);
    try {
      const res = await fetch("/api/v1/integrations", {
        headers: {
          "Authorization": `Bearer ${credentials.apiToken}`,
          "X-Client-Slug": credentials.clientSlug,
        },
      });
      const data = await res.json();
      setApiResponse(data);
    } catch (err: any) {
      setApiResponse({ error: err.message });
    } finally {
      setTestingApi(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-gray-600">Carregando credenciais de conexão e nuvem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl shadow-xl text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              API Gateway Ativo
            </span>
            <span className="text-xs text-blue-200">Multi-tenant Cloud v2.0</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Globe className="text-blue-400" size={26} />
            Integrações & Conexão Externa (IP Nuvem)
          </h1>
          <p className="text-sm text-blue-100/80 max-w-2xl">
            Conecte aplicativos externos (iFood, Anota AI, comanda mobile de garçom, cardápio QR code e balanças Toledo) com IP estático e token seguro para cada cliente.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={runQuickApiTest}
            disabled={testingApi}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-sm active:scale-95"
          >
            <Send size={14} className={testingApi ? "animate-spin" : ""} />
            {testingApi ? "Testando..." : "Testar Conexão"}
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-md active:scale-95"
          >
            <Save size={14} className={saving ? "animate-spin" : ""} />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Credenciais + IPs de Conexão */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: IP Nuvem & Endereços de Conexão */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Server className="text-blue-600" size={18} />
              <h2 className="text-base font-bold text-gray-900">Endereço de Conexão (IP)</h2>
            </div>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Público & Local
            </span>
          </div>

          {/* IP Público / Nuvem */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>IP Dedicado da Nuvem (VPS)</span>
              <span className="text-[10px] text-gray-400 font-normal">Para apps de terceiros</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={cloudIp}
                onChange={(e) => setCloudIp(e.target.value)}
                placeholder="Ex: 164.92.215.80"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleCopy(cloudIp, "cloudIp")}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition-colors"
                title="Copiar IP Nuvem"
              >
                {copiedField === "cloudIp" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* URL Base / Domínio */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">URL / Domínio Base da API</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={cloudHost}
                onChange={(e) => setCloudHost(e.target.value)}
                placeholder="Ex: https://meusistema.com.br"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleCopy(cloudHost, "cloudHost")}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition-colors"
                title="Copiar Host"
              >
                {copiedField === "cloudHost" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Gateway Local Wi-Fi */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Wifi size={14} className="text-blue-600" />
                IP Local na Loja (Wi-Fi Interno)
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                Sem latência
              </span>
            </div>
            <p className="text-[11px] text-gray-600">
              Para garçons usarem comanda pelo celular e comunicação de balança Toledo:
            </p>
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-200 text-xs font-mono font-bold text-gray-800">
              <span>{credentials?.localGatewayIp || "192.168.1.100"}:3000</span>
              <button
                type="button"
                onClick={() => handleCopy(`${credentials?.localGatewayIp || "192.168.1.100"}:3000`, "localIp")}
                className="text-blue-600 hover:text-blue-800"
              >
                {copiedField === "localIp" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Autenticação & Chave do Cliente */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Shield className="text-indigo-600" size={18} />
              <h2 className="text-base font-bold text-gray-900">Credenciais Exclusivas</h2>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              Por Cliente
            </span>
          </div>

          {/* Client Slug */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>Identificador do Cliente (Slug)</span>
              <span className="text-[10px] text-gray-400">Header: X-Client-Slug</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={clientSlug}
                onChange={(e) => setClientSlug(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleCopy(clientSlug, "clientSlug")}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-indigo-600 transition-colors"
                title="Copiar Slug"
              >
                {copiedField === "clientSlug" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* API Token */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Key size={14} className="text-amber-500" />
                Chave de API / Token Secreto
              </label>
              <button
                type="button"
                onClick={handleRegenerateToken}
                disabled={regenerating}
                className="text-[11px] text-red-600 hover:text-red-700 font-bold hover:underline flex items-center gap-1"
              >
                <RefreshCw size={11} className={regenerating ? "animate-spin" : ""} />
                Regenerar
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                readOnly
                value={credentials?.apiToken || ""}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono text-gray-800 select-all"
              />
              <button
                type="button"
                onClick={() => handleCopy(credentials?.apiToken || "", "apiToken")}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-indigo-600 transition-colors"
                title="Copiar Chave de API"
              >
                {copiedField === "apiToken" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400">
              Nunca compartilhe esta chave publicamente. Ela dá acesso aos dados deste cliente.
            </p>
          </div>

          {/* Webhook URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Webhook de Notificação (Opcional)</label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://seuapp.com/api/cybertech-webhook"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Card 3: Status & Exemplo de Conexão Rápida */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Exemplo de Requisição (cURL)</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                REST API v1
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto space-y-1 custom-scrollbar">
              <p className="text-slate-500"># 1. Obter catálogo de produtos:</p>
              <p className="text-blue-300">curl -X GET \</p>
              <p className="pl-4">'{cloudHost || "http://localhost:3000"}/api/v1/integrations/products' \</p>
              <p className="pl-4 text-emerald-300">-H 'Authorization: Bearer {credentials?.apiToken?.slice(0, 15)}...' \</p>
              <p className="pl-4 text-emerald-300">-H 'X-Client-Slug: {clientSlug}'</p>
            </div>

            <div className="text-xs text-slate-400 space-y-1.5">
              <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                Isolamento estrito por empresa (Multi-Tenant).
              </p>
              <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                Pedidos injetados caem direto na tela do PDV e KDS.
              </p>
            </div>
          </div>

          {/* Test Response Drawer */}
          {apiResponse && (
            <div className="mt-2 bg-slate-950 p-3 rounded-xl border border-emerald-500/30 text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-32">
              <p className="text-slate-400 font-bold mb-1">Resposta do Teste (HTTP 200):</p>
              <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Seção: Aplicativos Conectáveis */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Layers className="text-blue-600" size={20} />
          Como Conectar os Aplicativos Principais
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card: iFood / Delivery */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-sm hover:border-red-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">iFood & Delivery</h3>
              <p className="text-xs text-gray-500 mt-1">
                Conecte o iFood com a URL base do seu servidor e o Token de API para sincronizar pedidos na fila do caixa.
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
              <span className="font-semibold">Rota:</span>
              <span className="font-mono text-red-600">/api/v1/integrations/orders</span>
            </div>
          </div>

          {/* Card: App Garçom / Mesas */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">App Comanda Garçom</h3>
              <p className="text-xs text-gray-500 mt-1">
                Garçons acessam pelo celular no Wi-Fi da loja conectando direto no IP local do servidor PDV.
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
              <span className="font-semibold">URL Garçom:</span>
              <span className="font-mono text-blue-600">/restaurant/pdv</span>
            </div>
          </div>

          {/* Card: Cardápio Digital / Anota AI */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-sm hover:border-purple-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Utensils size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Anota AI & Cardápio QR</h3>
              <p className="text-xs text-gray-500 mt-1">
                Importe os produtos em tempo real com preços atualizados e receba os pedidos diretamente no KDS da cozinha.
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
              <span className="font-semibold">Catálogo:</span>
              <span className="font-mono text-purple-600">/api/v1/integrations/products</span>
            </div>
          </div>

          {/* Card: Balanças Toledo MGV6 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Balanças Toledo MGV6</h3>
              <p className="text-xs text-gray-500 mt-1">
                Exportação de carga PLU (TXITENS.TXT) para Toledo Prix 4, 5 e 6 com código de barras padrão 2.
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
              <span className="font-semibold">Painel Carga:</span>
              <span className="font-mono text-emerald-600">/scales</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

