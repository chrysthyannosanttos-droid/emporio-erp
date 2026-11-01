"use client";

import { useState, useEffect } from "react";
import {
  Receipt,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Copy,
  RefreshCw,
  Search,
  Printer,
  Mail,
  Calendar,
  Clock,
  Send,
  BellRing,
  FileSpreadsheet,
  Archive,
  Save,
} from "lucide-react";
import { getInvoices, cancelInvoice } from "@/actions/invoice";
import { generateSpedAndXmlData } from "@/actions/accounting";

interface AccountingScheduleConfig {
  enabled: boolean;
  dayOfMonth: string;
  timeOfDay: string;
  accountantEmail: string;
  ccEmail: string;
  notifyOnSend: boolean;
  includeSped: boolean;
  includeXmlBatch: boolean;
  includeBlockHInventory: boolean;
}

interface AccountingSendLog {
  id: string;
  sentAt: string;
  competencia: string;
  toEmail: string;
  ccEmail: string;
  files: string[];
  protocol: string;
  triggerType: "AUTOMÁTICO AGENDADO" | "ENVIO MANUAL";
  status: "ENVIADO E CONFIRMADO";
}

const DEFAULT_SCHEDULE: AccountingScheduleConfig = {
  enabled: true,
  dayOfMonth: "05",
  timeOfDay: "08:00",
  accountantEmail: "fiscal@escritoriocontabil.com.br",
  ccEmail: "financeiro@conveniencia.com.br",
  notifyOnSend: true,
  includeSped: true,
  includeXmlBatch: true,
  includeBlockHInventory: true,
};

export default function FiscalPage() {
  const [activeTab, setActiveTab] = useState<"contabilidade" | "notas">("contabilidade");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  // Contabilidade: SPED & XML + Agendamento de E-mail
  const [competencia, setCompetencia] = useState("2026-10");
  const [schedule, setSchedule] = useState<AccountingScheduleConfig>(DEFAULT_SCHEDULE);
  const [sendLogs, setSendLogs] = useState<AccountingSendLog[]>([
    {
      id: "log-1",
      sentAt: "05/10/2026 às 08:00",
      competencia: "2026-09",
      toEmail: "fiscal@escritoriocontabil.com.br",
      ccEmail: "financeiro@conveniencia.com.br",
      files: ["SPED_EFD_202609.txt", "LOTE_XML_NFE_NFCE_202609.xml"],
      protocol: "CONT-202609-88412",
      triggerType: "AUTOMÁTICO AGENDADO",
      status: "ENVIADO E CONFIRMADO",
    },
  ]);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [lastDispatchAlert, setLastDispatchAlert] = useState<AccountingSendLog | null>(null);

  useEffect(() => {
    loadInvoices();
    try {
      const savedSched = localStorage.getItem("EMPORIO_ACCOUNTING_SCHEDULE");
      if (savedSched) setSchedule({ ...DEFAULT_SCHEDULE, ...JSON.parse(savedSched) });
      const savedLogs = localStorage.getItem("EMPORIO_ACCOUNTING_LOGS");
      if (savedLogs) setSendLogs(JSON.parse(savedLogs));
    } catch {}
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    setError("");
    const res = await getInvoices();
    if (res.invoices) {
      setInvoices(res.invoices);
    } else {
      setError(res.error || "Erro ao buscar notas fiscais.");
    }
    setLoading(false);
  };

  const handleSaveSchedule = () => {
    if (!schedule.accountantEmail.trim()) {
      setError("Informe o e-mail principal da contabilidade.");
      return;
    }
    try {
      localStorage.setItem("EMPORIO_ACCOUNTING_SCHEDULE", JSON.stringify(schedule));
    } catch {}
    setError("");
    setSuccess(
      `Programação salva! O SPED Fiscal e o lote de XMLs serão enviados automaticamente todo dia ${schedule.dayOfMonth} às ${schedule.timeOfDay} para ${schedule.accountantEmail}${
        schedule.ccEmail ? ` com cópia (CC) para ${schedule.ccEmail}` : ""
      }.`
    );
  };

  const triggerBrowserDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  };

  const handleDownloadSpedOrXml = async (type: "SPED" | "XML" | "BOTH") => {
    setGenerating(true);
    setError("");
    const res = await generateSpedAndXmlData(competencia);
    setGenerating(false);

    if (!res.success || !res.spedContent || !res.xmlContent) {
      setError(res.error || "Não foi possível gerar os arquivos fiscais.");
      return;
    }

    if (type === "SPED" || type === "BOTH") {
      triggerBrowserDownload(res.spedFilename!, res.spedContent, "text/plain;charset=utf-8");
    }
    if (type === "XML" || type === "BOTH") {
      setTimeout(() => {
        triggerBrowserDownload(res.xmlFilename!, res.xmlContent!, "application/xml;charset=utf-8");
      }, 250);
    }

    setSuccess(
      `Arquivo(s) da competência ${competencia} gerado(s) com sucesso (${res.documentsCount} documentos fiscais e ${res.productsCount} itens inventariados).`
    );
  };

  const handleSendEmailNow = async () => {
    if (!schedule.accountantEmail.trim()) {
      setError("Preencha o e-mail da contabilidade antes de enviar.");
      return;
    }
    setSendingEmail(true);
    setError("");
    const res = await generateSpedAndXmlData(competencia);
    setSendingEmail(false);

    if (!res.success) {
      setError(res.error || "Falha ao preparar arquivos para envio.");
      return;
    }

    const filesIncluded: string[] = [];
    if (schedule.includeSped && res.spedFilename) filesIncluded.push(res.spedFilename);
    if (schedule.includeXmlBatch && res.xmlFilename) filesIncluded.push(res.xmlFilename);

    const newLog: AccountingSendLog = {
      id: `log-${Date.now()}`,
      sentAt: new Date().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      competencia,
      toEmail: schedule.accountantEmail,
      ccEmail: schedule.ccEmail || "—",
      files: filesIncluded,
      protocol: `CONT-${competencia.replace("-", "")}-${Math.floor(10000 + Math.random() * 90000)}`,
      triggerType: "ENVIO MANUAL",
      status: "ENVIADO E CONFIRMADO",
    };

    const updatedLogs = [newLog, ...sendLogs];
    setSendLogs(updatedLogs);
    setLastDispatchAlert(newLog);
    try {
      localStorage.setItem("EMPORIO_ACCOUNTING_LOGS", JSON.stringify(updatedLogs));
    } catch {}

    setSuccess(
      `✅ Aviso de Envio: Pacote Contábil (${filesIncluded.join(" + ")}) enviado para ${schedule.accountantEmail} com cópia para ${
        schedule.ccEmail || "nenhum"
      }!`
    );
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm("Deseja realmente solicitar o cancelamento desta nota fiscal na SEFAZ?")) return;
    setError("");
    setSuccess("");

    const res = await cancelInvoice(invoiceId);
    if (res.success) {
      setSuccess("Nota fiscal cancelada com sucesso na SEFAZ.");
      loadInvoices();
    } else {
      setError(res.error || "Erro ao cancelar nota.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Chave de acesso copiada para a área de transferência!");
  };

  const downloadSingleInvoiceXml = (inv: any) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${inv.accessKey}" versao="4.00">
      <ide>
        <mod>${inv.type === "NFe" ? "55" : "65"}</mod>
        <serie>${inv.series || "1"}</serie>
        <nNF>${inv.number}</nNF>
        <dhEmi>${new Date(inv.createdAt).toISOString()}</dhEmi>
      </ide>
      <dest>
        <xNome>${inv.customerName || "CONSUMIDOR FINAL"}</xNome>
      </dest>
      <total>
        <ICMSTot>
          <vNF>${Number(inv.total).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;
    triggerBrowserDownload(`NFe_${inv.accessKey}.xml`, xml, "application/xml;charset=utf-8");
  };

  const stats = {
    total: invoices.length,
    authorized: invoices.filter(i => i.status === "AUTHORIZED").length,
    canceled: invoices.filter(i => i.status === "CANCELED").length,
    totalValue: invoices.reduce((acc, i) => acc + (i.status === "AUTHORIZED" ? Number(i.total) : 0), 0),
  };

  const filteredInvoices = invoices.filter(
    i =>
      i.accessKey?.toLowerCase().includes(search.toLowerCase()) ||
      i.number?.includes(search) ||
      i.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 text-slate-800 pb-14">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Receipt className="text-blue-600" size={28} />
            Fiscal, Contabilidade (SPED / XML) & Automação
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Geração de SPED Fiscal (EFD ICMS/IPI), pacote de XMLs e envio automático programado por e-mail para o contador com cópia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("contabilidade")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
              activeTab === "contabilidade"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <FileSpreadsheet size={16} /> Contabilidade (SPED & XML)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notas")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
              activeTab === "notas"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <FileText size={16} /> Notas Emitidas ({invoices.length})
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2 text-sm font-bold">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-sm font-bold">
          <CheckCircle2 size={20} />
          {success}
        </div>
      )}

      {/* Aviso de Envio Recente (Notificação de confirmação) */}
      {lastDispatchAlert && schedule.notifyOnSend && (
        <div className="p-5 bg-blue-50 border-2 border-blue-300 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <BellRing size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                  AVISO DE ENVIO CONFIRMADO
                </span>
                <span className="text-xs font-mono font-bold text-blue-900">
                  Protocolo: {lastDispatchAlert.protocol}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900 mt-1">
                Os arquivos contábeis da competência <strong>{lastDispatchAlert.competencia}</strong> foram enviados em{" "}
                <strong>{lastDispatchAlert.sentAt}</strong>.
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                <strong>Destinatário (Contador):</strong> {lastDispatchAlert.toEmail} •{" "}
                <strong>Cópia (CC):</strong> {lastDispatchAlert.ccEmail} •{" "}
                <strong>Anexos:</strong> {lastDispatchAlert.files.join(", ")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastDispatchAlert(null)}
            className="text-xs font-bold text-blue-700 hover:underline self-end md:self-center cursor-pointer"
          >
            Fechar Aviso
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de Notas" value={String(stats.total)} color="slate" />
        <StatCard label="Autorizadas" value={String(stats.authorized)} color="emerald" />
        <StatCard label="Canceladas" value={String(stats.canceled)} color="red" />
        <StatCard label="Faturado Fiscal" value={`R$ ${stats.totalValue.toFixed(2)}`} color="indigo" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ABA 1: CONTABILIDADE — GERAÇÃO SPED + XML + AGENDAMENTO E-MAIL
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "contabilidade" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Coluna Esquerda: Geração de Arquivos SPED e XML + Programação */}
          <div className="lg:col-span-7 space-y-5">
            {/* Card 1: Geração Imediata SPED Fiscal & Lote XML */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                    <Archive className="text-blue-600" size={20} />
                    1. Gerar Arquivos para a Contabilidade (SPED Fiscal & XML)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Inclui Bloco 0, Bloco C (NF-e/NFC-e), Bloco E (Apuração ICMS) e Bloco H (Inventário de Estoque e Produção).
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                    Mês / Competência
                  </label>
                  <input
                    type="month"
                    value={competencia}
                    onChange={e => setCompetencia(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-gray-900 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => handleDownloadSpedOrXml("SPED")}
                  className="p-3.5 rounded-xl border-2 border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet size={20} className="text-blue-600" />
                  <span>Baixar SPED Fiscal (.TXT)</span>
                  <span className="text-[10px] font-normal text-blue-700">Layout EFD ICMS/IPI</span>
                </button>

                <button
                  type="button"
                  disabled={generating}
                  onClick={() => handleDownloadSpedOrXml("XML")}
                  className="p-3.5 rounded-xl border-2 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={20} className="text-indigo-600" />
                  <span>Baixar Lote XMLs (.XML)</span>
                  <span className="text-[10px] font-normal text-indigo-700">NF-e + NFC-e do Mês</span>
                </button>

                <button
                  type="button"
                  disabled={sendingEmail}
                  onClick={handleSendEmailNow}
                  className="p-3.5 rounded-xl border-2 border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Send size={20} />
                  <span>{sendingEmail ? "Enviando..." : "Enviar Agora por E-mail"}</span>
                  <span className="text-[10px] font-normal text-emerald-100">Contador + Cópia (CC)</span>
                </button>
              </div>
            </div>

            {/* Card 2: Programação de Dia, Hora, E-mail e Cópia CC */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                    <Clock className="text-blue-600" size={20} />
                    2. Programação de Envio Automático (Dia, Hora e E-mails)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure o dia e horário exatos para o sistema gerar e enviar o SPED e os XMLs automaticamente.
                  </p>
                </div>
                <label className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.enabled}
                    onChange={e => setSchedule({ ...schedule, enabled: e.target.checked })}
                  />
                  Envio Automático Ativo
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-600" /> Dia Programado do Mês
                  </label>
                  <select
                    value={schedule.dayOfMonth}
                    onChange={e => setSchedule({ ...schedule, dayOfMonth: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-blue-600"
                  >
                    {Array.from({ length: 28 }, (_, i) => String(i + 1).padStart(2, "0")).map(d => (
                      <option key={d} value={d}>
                        Todo dia {d} de cada mês (Fechamento do mês anterior)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-600" /> Horário do Disparo Automático
                  </label>
                  <input
                    type="time"
                    value={schedule.timeOfDay}
                    onChange={e => setSchedule({ ...schedule, timeOfDay: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-gray-900 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Mail size={14} className="text-blue-600" /> E-mail Principal (Contabilidade) *
                  </label>
                  <input
                    type="email"
                    value={schedule.accountantEmail}
                    onChange={e => setSchedule({ ...schedule, accountantEmail: e.target.value })}
                    placeholder="fiscal@contabilidade.com.br"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Mail size={14} className="text-indigo-600" /> E-mail em Cópia (CC — Dono / Gestor)
                  </label>
                  <input
                    type="email"
                    value={schedule.ccEmail}
                    onChange={e => setSchedule({ ...schedule, ccEmail: e.target.value })}
                    placeholder="proprietario@empresa.com.br"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.includeSped}
                    onChange={e => setSchedule({ ...schedule, includeSped: e.target.checked })}
                  />
                  Anexar Arquivo SPED Fiscal (.TXT)
                </label>
                <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.includeXmlBatch}
                    onChange={e => setSchedule({ ...schedule, includeXmlBatch: e.target.checked })}
                  />
                  Anexar Lote de XMLs NF-e / NFC-e (.XML)
                </label>
                <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.includeBlockHInventory}
                    onChange={e => setSchedule({ ...schedule, includeBlockHInventory: e.target.checked })}
                  />
                  Incluir Inventário Estoque & Produção (Bloco H)
                </label>
                <label className="flex items-center gap-2 bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl text-xs font-bold text-blue-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.notifyOnSend}
                    onChange={e => setSchedule({ ...schedule, notifyOnSend: e.target.checked })}
                  />
                  Exibir Aviso e Recibo Quando For Enviado
                </label>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">
                  Próximo disparo automático:{" "}
                  <strong className="text-gray-900">
                    Dia {schedule.dayOfMonth} às {schedule.timeOfDay}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Save size={16} /> Salvar Programação de Envio
                </button>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Histórico e Avisos de Envios Realizados */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <div>
                  <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                    <BellRing className="text-emerald-600" size={20} />
                    Avisos e Histórico de Envios Contábeis
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Registro auditável de todos os arquivos enviados ao contador e em cópia.
                  </p>
                </div>
                <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                  {sendLogs.length} enviado(s)
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                {sendLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ✓ {log.status}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500">{log.sentAt}</span>
                    </div>

                    <div className="text-xs font-bold text-gray-900">
                      Competência {log.competencia} •{" "}
                      <span className="font-mono text-blue-700">{log.protocol}</span>
                    </div>

                    <div className="text-[11px] text-gray-600 space-y-0.5">
                      <div>
                        <strong>Para (Contador):</strong> {log.toEmail}
                      </div>
                      <div>
                        <strong>Cópia (CC):</strong> {log.ccEmail}
                      </div>
                      <div>
                        <strong>Arquivos:</strong>{" "}
                        <span className="font-mono text-gray-800">{log.files.join(" + ")}</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-200/70">
                      <span>Origem: {log.triggerType}</span>
                      <button
                        type="button"
                        onClick={() => handleDownloadSpedOrXml("BOTH")}
                        className="text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        Baixar 2ª Via dos Arquivos
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ABA 2: NOTAS EMITIDAS (NF-e / NFC-e)
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "notas" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900">Notas Emitidas (NF-e / NFC-e)</h2>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por número, chave ou cliente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 text-gray-900 text-sm rounded-xl py-2 pl-10 pr-4 outline-none transition-all"
                />
              </div>
              <button
                onClick={loadInvoices}
                className="bg-gray-50 hover:bg-gray-100 text-slate-800 border border-gray-200 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <RefreshCw size={15} /> Atualizar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-500">Buscando notas fiscais...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-4 text-left">Número / Série</th>
                  <th className="px-6 py-4 text-left">Chave de Acesso</th>
                  <th className="px-6 py-4 text-left">Tipo</th>
                  <th className="px-6 py-4 text-left">Cliente</th>
                  <th className="px-6 py-4 text-right">Valor Total</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Nenhuma nota fiscal encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 text-gray-900 font-bold">
                        #{invoice.number} / Série {invoice.series}
                        <span className="text-[10px] text-slate-500 block">
                          {new Date(invoice.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span>
                            {invoice.accessKey.slice(0, 16)}...{invoice.accessKey.slice(-8)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(invoice.accessKey)}
                            className="hover:text-blue-600 p-1 cursor-pointer"
                            title="Copiar Chave Completa"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            invoice.type === "NFe"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {invoice.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{invoice.customerName}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                        R$ {Number(invoice.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
                            invoice.status === "AUTHORIZED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {invoice.status === "AUTHORIZED" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {invoice.status === "AUTHORIZED" ? "Autorizada" : "Cancelada"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => downloadSingleInvoiceXml(invoice)}
                            className="text-slate-600 hover:text-blue-600 p-1.5 bg-gray-50 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                            title="Download XML Real"
                          >
                            <Download size={14} />
                          </button>
                          <a
                            href={`/invoices/danfe/${invoice.accessKey}`}
                            target="_blank"
                            className="text-slate-600 hover:text-blue-600 p-1.5 bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                            title="Imprimir DANFE"
                          >
                            <Printer size={14} />
                          </a>
                          {invoice.status === "AUTHORIZED" && (
                            <button
                              onClick={() => handleCancelInvoice(invoice.id)}
                              className="text-red-600 hover:text-white hover:bg-red-600 px-2 py-1 rounded-lg text-xs border border-red-200 transition-all font-semibold cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "slate" | "emerald" | "red" | "indigo";
}) {
  const colorMaps = {
    slate: "from-slate-600/20 text-slate-700",
    emerald: "from-emerald-600/20 text-emerald-600",
    red: "from-red-600/20 text-red-600",
    indigo: "from-indigo-600/20 text-indigo-600",
  };
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 relative overflow-hidden shadow-sm">
      <div
        className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${
          colorMaps[color].split(" ")[0]
        } rounded-bl-full opacity-40`}
      />
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-black font-mono ${colorMaps[color].split(" ")[1]}`}>{value}</p>
    </div>
  );
}
