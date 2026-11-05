"use client";

import { useState, useEffect } from "react";
import {
  Mail, Server, Key, Shield, CheckCircle2, AlertCircle,
  Loader2, Send, Eye, EyeOff, Info, User, Check, Sparkles
} from "lucide-react";
import {
  getEmailConfig,
  saveEmailConfig,
  testEmailConnection,
  SmtpEmailConfig,
} from "@/actions/emailConfig";

const PRESETS = [
  {
    id: "gmail",
    name: "Gmail / Workspace",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    tip: "No Gmail, utilize uma 'Senha de Aplicativo' de 16 dígitos gerada em myaccount.google.com/apppasswords.",
  },
  {
    id: "outlook",
    name: "Outlook / Office 365",
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    tip: "Utilize seu e-mail e senha da conta Microsoft corporativa.",
  },
  {
    id: "titan",
    name: "Titan Mail / Hostinger",
    host: "smtp.titan.email",
    port: 465,
    secure: true,
    tip: "Porta 465 com SSL ativado para envio com domínio próprio.",
  },
  {
    id: "zoho",
    name: "Zoho Mail",
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    tip: "Porta 465 com SSL ativado ou 587 com STARTTLS.",
  },
  {
    id: "custom",
    name: "Personalizado / Outro",
    host: "",
    port: 587,
    secure: false,
    tip: "Preencha com os dados SMTP fornecidos pela sua hospedagem.",
  },
];

export function EmailConfigTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("gmail");

  // Config State
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [senderName, setSenderName] = useState("Empório Agrobelém - Compras");
  const [senderEmail, setSenderEmail] = useState("");
  const [useBuyerReplyTo, setUseBuyerReplyTo] = useState(true);
  const [active, setActive] = useState(true);

  // User info
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [testRecipient, setTestRecipient] = useState("");

  // Feedback states
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    const res = await getEmailConfig();
    if (res.success && res.config) {
      setSmtpHost(res.config.smtpHost || "smtp.gmail.com");
      setSmtpPort(res.config.smtpPort || 587);
      setSmtpSecure(Boolean(res.config.smtpSecure));
      setSmtpUser(res.config.smtpUser || "");
      setSmtpPass(res.config.smtpPass || "");
      setSenderName(res.config.senderName || "Empório Agrobelém - Compras");
      setSenderEmail(res.config.senderEmail || res.config.smtpUser || "");
      setUseBuyerReplyTo(res.config.useBuyerReplyTo ?? true);
      setActive(res.config.active ?? true);

      // Detect preset
      const match = PRESETS.find((p) => p.host === res.config.smtpHost);
      if (match) setSelectedPreset(match.id);
      else setSelectedPreset("custom");
    }

    if (res.userEmail) {
      setUserEmail(res.userEmail);
      setTestRecipient(res.userEmail);
    }
    if (res.userName) {
      setUserName(res.userName);
    }
    setLoading(false);
  }

  function handleSelectPreset(presetId: string) {
    setSelectedPreset(presetId);
    const p = PRESETS.find((item) => item.id === presetId);
    if (!p) return;
    if (p.host) {
      setSmtpHost(p.host);
      setSmtpPort(p.port);
      setSmtpSecure(p.secure);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSaveSuccess(false);

    const res = await saveEmailConfig({
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      senderName,
      senderEmail: senderEmail || smtpUser,
      useBuyerReplyTo,
      active,
    });

    setSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      setErrorMsg(res.error || "Erro ao salvar configurações.");
    }
  }

  async function handleTestEmail() {
    if (!testRecipient.trim()) {
      setErrorMsg("Informe um e-mail de destino para realizar o teste.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    setErrorMsg("");

    const res = await testEmailConnection(testRecipient.trim(), {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      senderName,
      senderEmail: senderEmail || smtpUser,
    });

    setTesting(false);
    if (res.success) {
      setTestResult({ success: true, message: res.message || "E-mail de teste enviado com sucesso!" });
    } else {
      setTestResult({ success: false, message: res.error || "Falha ao testar conexão SMTP." });
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-sm font-semibold">Carregando configurações de e-mail...</p>
      </div>
    );
  }

  const currentPresetTip = PRESETS.find((p) => p.id === selectedPreset)?.tip;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Mail className="text-blue-600" size={24} />
            <span>Configuração de E-mail & Disparo de Cotações</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure o servidor SMTP de envio e vincule o e-mail de cada usuário comprador para recebimento direto de propostas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Disparos Ativos</span>
          </label>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>Configurações de e-mail salvas com sucesso! O sistema está pronto para enviar cotações.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm font-semibold animate-in fade-in">
          <AlertCircle size={20} className="text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulário Principal */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Presets de Provedor */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            <span>Escolha Rápida de Provedor SMTP</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id)}
                className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                  selectedPreset === p.id
                    ? "bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{p.name}</span>
                  {selectedPreset === p.id && <Check size={14} className="text-blue-600" />}
                </div>
              </button>
            ))}
          </div>

          {currentPresetTip && (
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <span>{currentPresetTip}</span>
            </div>
          )}
        </div>

        {/* Credenciais do Servidor SMTP */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Server size={16} className="text-blue-600" />
            <span>Dados de Conexão SMTP</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Servidor SMTP (Host) *
              </label>
              <input
                type="text"
                required
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="Ex: smtp.gmail.com ou smtp.meudominio.com.br"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Porta SMTP *
              </label>
              <input
                type="number"
                required
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
                placeholder="587 ou 465"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Conexão Segura SSL/TLS direta (Porta 465)</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {smtpSecure ? "(Recomendado para porta 465)" : "(Padrão para porta 587 STARTTLS)"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Usuário / E-mail de Autenticação SMTP *
              </label>
              <input
                type="email"
                required
                value={smtpUser}
                onChange={(e) => {
                  setSmtpUser(e.target.value);
                  if (!senderEmail) setSenderEmail(e.target.value);
                }}
                placeholder="compras@agrobelem.com.br"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Senha de Acesso ou Senha de Aplicativo *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required={!smtpPass}
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Remetente Oficial & Resposta do Usuário */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User size={16} className="text-blue-600" />
            <span>Remetente e Identificação de Cada Usuário</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome de Exibição no E-mail
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Empório Agrobelém - Compras"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                E-mail Remetente Padrão (From)
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="compras@agrobelem.com.br"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>
          </div>

          {/* Opção para registrar o e-mail do usuário que disparou */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useBuyerReplyTo}
                onChange={(e) => setUseBuyerReplyTo(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                  Registrar e-mail do usuário comprador no cabeçalho Reply-To (Responder Para)
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Quando ativo, ao disparar uma cotação, o sistema inclui o nome e e-mail do operador/comprador logado. Se o fornecedor clicar em <strong>"Responder"</strong> no e-mail recebido, a mensagem cairá diretamente na caixa do usuário responsável por aquela cotação.
                </p>
              </div>
            </label>

            {userEmail && (
              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold">Seu usuário logado atualmente:</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-blue-700">
                  {userName} ({userEmail})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md shadow-blue-600/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            <span>{saving ? "Salvando..." : "Salvar Configurações de E-mail"}</span>
          </button>
        </div>
      </form>

      {/* Seção de Teste de Envio em Tempo Real */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
            <Send size={16} />
            <span>Testar Conexão e Disparo de E-mail</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Envie um e-mail de teste para validar se o servidor SMTP está autenticando e entregando corretamente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="email"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder="Digite seu e-mail de destino para o teste"
            className="w-full sm:flex-1 px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />

          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testing || !testRecipient.trim()}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>{testing ? "Testando Conexão..." : "Enviar E-mail de Teste"}</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
              testResult.success
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                : "bg-red-950/80 border-red-500/50 text-red-300"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
