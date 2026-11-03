"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2,
  Upload, KeyRound, Eye, EyeOff, Loader2, Sparkles, Building2,
  Calendar, RefreshCw, FileKey, X
} from "lucide-react";
import {
  getCurrentCertificateStatus,
  validateAndUploadCertificate,
  type CertificateInfo
} from "@/actions/certificate";

interface CertificateCardProps {
  fiscal?: any;
  companyCnpj?: string;
  onRefresh?: () => void;
}

export function CertificateCard({ fiscal, companyCnpj, onRefresh }: CertificateCardProps) {
  const [certInfo, setCertInfo] = useState<CertificateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validating, setValidating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  useEffect(() => {
    loadStatus();
  }, [fiscal?.certExpiration, fiscal?.certUploaded]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const info = await getCurrentCertificateStatus();
      setCertInfo(info);
      if (fiscal?.certPassword && !password) {
        setPassword(fiscal.certPassword);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleValidateNow = async () => {
    if (!password.trim()) {
      setFeedback({
        type: "error",
        text: "Informe a senha do certificado para realizar a validação criptográfica."
      });
      return;
    }

    setValidating(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      if (certFile) {
        formData.set("certFile", certFile);
      }
      formData.set("certPassword", password);

      const res = await validateAndUploadCertificate(formData);

      if (res.success && res.certInfo) {
        setCertInfo(res.certInfo);
        setFeedback({
          type: "success",
          text: `Certificado validado com sucesso! Titular: ${res.certInfo.subjectName || "ICP-Brasil"} (Válido até ${new Date(res.certInfo.validTo!).toLocaleDateString("pt-BR")}).`
        });
        if (onRefresh) onRefresh();
      } else {
        if (res.certInfo) {
          setCertInfo(res.certInfo);
        }
        setFeedback({
          type: "error",
          text: res.error || "Falha na validação do certificado digital."
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Erro de conexão ao validar certificado."
      });
    } finally {
      setValidating(false);
    }
  };

  const fmtDate = (d?: string) => {
    if (!d) return "---";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header do Card com Indicador Visual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
            <FileKey size={22} />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
              Certificado Digital A1 (ICP-Brasil)
            </h3>
            <p className="text-gray-500 text-xs">
              Autenticação criptográfica de NF-e, NFC-e e monitoramento em tempo real do Radar DF-e.
            </p>
          </div>
        </div>

        {/* Badge Indicador de Status */}
        <div>
          {loading ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
              <Loader2 size={13} className="animate-spin" /> Verificando...
            </span>
          ) : certInfo?.status === "VALID" ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              🟢 Certificado Válido &amp; Ativo
            </span>
          ) : certInfo?.status === "EXPIRING_SOON" ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
              <AlertTriangle size={13} className="text-amber-600" />
              🟡 Vence em {certInfo.daysRemaining} dias
            </span>
          ) : certInfo?.status === "EXPIRED" ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300 shadow-xs">
              <AlertCircle size={13} className="text-red-600" />
              🔴 Certificado Expirado
            </span>
          ) : certInfo?.status === "INVALID_PASSWORD" ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-red-50 text-red-700 border border-red-200">
              <AlertTriangle size={13} className="text-red-500" />
              ⚠️ Senha Incorreta
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
              ⚪ Pendente de Configuração
            </span>
          )}
        </div>
      </div>

      {/* Alerta de Feedback Instantâneo */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : feedback.type === "warning"
              ? "bg-amber-50 border border-amber-200 text-amber-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 leading-relaxed">{feedback.text}</div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Detalhes do Certificado (se extraído com sucesso) */}
      {certInfo?.isValid && (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-blue-100 rounded-2xl p-4.5 space-y-3">
          <div className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-blue-600" /> Detalhes Extraídos do Certificado X.509
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-gray-200/80">
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Titular / Razão Social</span>
              <span className="font-black text-gray-900 truncate block mt-0.5" title={certInfo.subjectName}>
                {certInfo.subjectName || "Não identificado"}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-200/80">
              <span className="text-gray-400 block text-[10px] uppercase font-bold">CNPJ do Certificado</span>
              <span className="font-mono font-black text-blue-700 block mt-0.5">
                {certInfo.cnpj || companyCnpj || "65.522.409/0001-13"}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-200/80">
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Autoridade Certificadora (Emissor)</span>
              <span className="font-bold text-gray-800 block mt-0.5 truncate" title={certInfo.issuer}>
                {certInfo.issuer || "ICP-Brasil"}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-200/80">
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Validade / Vencimento</span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-black text-gray-900">
                  {fmtDate(certInfo.validTo)}
                </span>
                {certInfo.daysRemaining !== undefined && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    certInfo.daysRemaining <= 30 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {certInfo.daysRemaining > 0 ? `${certInfo.daysRemaining} dias restantes` : "Expirado"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload de Arquivo .pfx */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
          Arquivo do Certificado Digital (.pfx ou .p12)
        </label>

        <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
          certFile ? "border-blue-500 bg-blue-50/40" : "border-gray-200 bg-gray-50/60 hover:border-blue-400 hover:bg-blue-50/20"
        }`}>
          {certFile ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                  PFX
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-xs">{certFile.name}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{(certFile.size / 1024).toFixed(1)} KB · Arquivo selecionado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCertFile(null)}
                className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
              >
                Remover
              </button>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <input
                type="file"
                name="certFile"
                accept=".pfx,.p12"
                className="hidden"
                onChange={e => setCertFile(e.target.files?.[0] ?? null)}
              />
              <Upload size={28} className="mx-auto text-blue-500 mb-2" />
              <p className="text-gray-900 font-bold text-xs">
                Clique aqui para selecionar seu certificado digital <strong>.pfx</strong>
              </p>
              <p className="text-gray-400 text-[11px] mt-0.5">
                Modelo A1 exportado com chave privada
              </p>
            </label>
          )}
        </div>
      </div>

      {/* Input de Senha + Botão de Validação Instantânea */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Senha do Certificado Digital A1
          </label>
          <span className="text-[11px] text-gray-400">
            Fornecida pela Autoridade Certificadora
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type={showPassword ? "text" : "password"}
              name="certPassword"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Digite a senha exata do arquivo .pfx..."
              className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-xs font-medium transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title={showPassword ? "Ocultar senha" : "Ver senha"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleValidateNow}
            disabled={validating || !password.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap"
          >
            {validating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Validando com SEFAZ/X.509...
              </>
            ) : (
              <>
                <ShieldCheck size={14} />
                Validar Certificado Agora
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-gray-400">
          Ao clicar em <strong>Validar Certificado Agora</strong>, o sistema descriptografa o arquivo com a senha, verifica as datas de validade e o CNPJ da empresa, e ativa as assinaturas fiscais.
        </p>
      </div>
    </div>
  );
}

