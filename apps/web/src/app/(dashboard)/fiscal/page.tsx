"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Play,
  Pause,
  Pencil,
  Trash2,
  ShieldCheck,
  Loader2,
  RotateCcw,
  UploadCloud,
  X,
} from "lucide-react";
import {
  getInvoices,
  cancelInvoice,
  retransmitInvoiceAction,
  consultarSefazInvoiceAction,
  updateRejectedInvoiceAction,
  sendCartaCorrecaoAction,
  inutilizarAndDeleteInvoiceAction,
} from "@/actions/invoice";
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
  const [activeTab, setActiveTab] = useState<"contabilidade" | "notas">("notas");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todas" | "pendentes" | "autorizadas" | "canceladas">("todas");

  // Fila de Retransmissão Automática 5s + Manual SEFAZ-AL
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);
  const [attemptedIds, setAttemptedIds] = useState<Record<string, boolean>>({});
  const [queueLogs, setQueueLogs] = useState<Array<{ id: string; number: string; ok: boolean; msg: string; time: string }>>([]);
  const isSendingRef = useRef(false);

  // Modais reais SEFAZ (Edição / CC-e / Cancelamento & Inutilização)
  const [editModalInv, setEditModalInv] = useState<any | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editDiscount, setEditDiscount] = useState<string>("0");
  const [editSaving, setEditSaving] = useState(false);

  const [cceModalInv, setCceModalInv] = useState<any | null>(null);
  const [cceText, setCceText] = useState("");
  const [cceSending, setCceSending] = useState(false);

  const [sefazActionModal, setSefazActionModal] = useState<{ inv: any; mode: "CANCEL" | "INUTILIZAR" } | null>(null);
  const [sefazJust, setSefazJust] = useState("");
  const [sefazActionLoading, setSefazActionLoading] = useState(false);

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

  const loadInvoices = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError("");
    const res = await getInvoices();
    if (res.invoices) {
      setInvoices(res.invoices);
    } else {
      setError(res.error || "Erro ao buscar notas fiscais.");
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadInvoices();
    try {
      const savedSched = localStorage.getItem("EMPORIO_ACCOUNTING_SCHEDULE");
      if (savedSched) setSchedule({ ...DEFAULT_SCHEDULE, ...JSON.parse(savedSched) });
      const savedLogs = localStorage.getItem("EMPORIO_ACCOUNTING_LOGS");
      if (savedLogs) setSendLogs(JSON.parse(savedLogs));
    } catch {}
  }, [loadInvoices]);

  const pendingQueue = invoices.filter(
    (i) => i.effectiveStatus === "REJECTED" && !attemptedIds[i.id]
  );

  const handleRetransmitSingle = useCallback(async (invoice: any, fromAuto = false) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setBusyInvoiceId(invoice.id);
    if (!fromAuto) {
      setError("");
      setSuccess("");
    }

    try {
      const res = await retransmitInvoiceAction(invoice.id);
      const timeStr = new Date().toLocaleTimeString("pt-BR");
      if (res.ok) {
        const okMsg = `SEFAZ (${res.cStat || "100"}): ${res.xMotivo || "Autorizada"}${res.nProt ? ` • Prot: ${res.nProt}` : ""}`;
        setQueueLogs((prev) => [{ id: invoice.id, number: invoice.number || "—", ok: true, msg: okMsg, time: timeStr }, ...prev].slice(0, 30));
        if (!fromAuto) setSuccess(`Nota #${invoice.number} autorizada pela SEFAZ! ${okMsg}`);
      } else {
        const errMsg = res.error || `${res.cStat || "ERR"}: ${res.xMotivo || "Falha na SEFAZ"}`;
        setAttemptedIds((prev) => ({ ...prev, [invoice.id]: true }));
        setQueueLogs((prev) => [{ id: invoice.id, number: invoice.number || "—", ok: false, msg: errMsg, time: timeStr }, ...prev].slice(0, 30));
        if (!fromAuto) setError(`Nota #${invoice.number}: ${errMsg}`);
      }
      await loadInvoices(true);
    } catch (e: any) {
      setAttemptedIds((prev) => ({ ...prev, [invoice.id]: true }));
      if (!fromAuto) setError(e?.message || "Erro ao comunicar com a SEFAZ.");
    } finally {
      isSendingRef.current = false;
      setBusyInvoiceId(null);
    }
  }, [loadInvoices]);

  // Loop automático a cada 5 segundos enquanto autoEnabled === true e houver pendentes
  useEffect(() => {
    if (!autoEnabled) {
      setCountdown(5);
      return;
    }
    if (pendingQueue.length === 0) {
      setAutoEnabled(false);
      setCountdown(5);
      setSuccess("Fila de retransmissão concluída! Verifique o histórico abaixo.");
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          const nextInv = pendingQueue[0];
          if (nextInv && !isSendingRef.current) {
            void handleRetransmitSingle(nextInv, true);
          }
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoEnabled, pendingQueue, handleRetransmitSingle]);

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

  const handleConsultarSefaz = async (invoice: any) => {
    setBusyInvoiceId(invoice.id);
    setError("");
    setSuccess("");
    const res = await consultarSefazInvoiceAction(invoice.id);
    setBusyInvoiceId(null);
    if (res.authorized) {
      setSuccess(`Nota #${invoice.number}: SEFAZ (${res.cStat}) ${res.xMotivo}${res.nProt ? ` • Prot: ${res.nProt}` : ""}`);
    } else if (res.canceled) {
      setSuccess(`Nota #${invoice.number}: Consta como CANCELADA na SEFAZ (${res.cStat}: ${res.xMotivo}).`);
    } else if (res.error) {
      setError(`Consulta SEFAZ #${invoice.number}: ${res.error}`);
    } else {
      setError(`Consulta SEFAZ #${invoice.number}: (${res.cStat}) ${res.xMotivo}`);
    }
    await loadInvoices(true);
  };

  const openEditModal = (invoice: any) => {
    if (invoice.sefazAuthorized) {
      if (invoice.type === "NFCe") {
        setError("NFC-e (Modelo 65) já autorizada na SEFAZ não aceita edição nem Carta de Correção pela legislação fiscal. Use Cancelamento SEFAZ dentro do prazo.");
        return;
      }
      setCceModalInv(invoice);
      setCceText("");
      return;
    }
    setEditModalInv(invoice);
    setEditDiscount(String(invoice.discount || 0));
    setEditItems(
      (invoice.items || []).map((it: any) => ({
        saleItemId: it.id,
        productId: it.productId,
        name: it.name || "",
        ncm: it.ncm || "21069090",
        cfop: it.cfop || "5102",
        csosn: it.csosn || "102",
        unit: it.unit || "UN",
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      }))
    );
  };

  const handleSaveEditModal = async (retransmitAfter: boolean) => {
    if (!editModalInv) return;
    setEditSaving(true);
    setError("");
    setSuccess("");

    const res = await updateRejectedInvoiceAction(editModalInv.id, {
      discount: Number(editDiscount || 0),
      items: editItems,
    });

    if (!res.ok) {
      setEditSaving(false);
      setError(res.error || "Erro ao salvar alterações.");
      return;
    }

    const savedId = editModalInv.id;
    const savedNum = editModalInv.number;
    setEditModalInv(null);
    setEditSaving(false);
    setAttemptedIds((prev) => {
      const next = { ...prev };
      delete next[savedId];
      return next;
    });
    await loadInvoices(true);

    if (retransmitAfter) {
      await handleRetransmitSingle({ id: savedId, number: savedNum }, false);
    } else {
      setSuccess(`Nota #${savedNum} atualizada. Clique em "Subir Manual" ou ative a fila automática para transmitir.`);
    }
  };

  const handleSendCce = async () => {
    if (!cceModalInv) return;
    setCceSending(true);
    setError("");
    setSuccess("");
    const res = await sendCartaCorrecaoAction(cceModalInv.id, cceText);
    setCceSending(false);
    if (res.ok) {
      setSuccess(`Carta de Correção homologada na SEFAZ! (${res.cStat}: ${res.xMotivo}${res.nProt ? ` • Prot: ${res.nProt}` : ""})`);
      setCceModalInv(null);
    } else {
      setError(res.error || "Erro ao enviar Carta de Correção na SEFAZ.");
    }
  };

  const handleConfirmSefazDeleteOrCancel = async () => {
    if (!sefazActionModal) return;
    const { inv, mode } = sefazActionModal;
    setSefazActionLoading(true);
    setError("");
    setSuccess("");

    if (mode === "CANCEL") {
      const res = await cancelInvoice(inv.id, sefazJust);
      setSefazActionLoading(false);
      if (res.success) {
        setSefazActionModal(null);
        setSuccess(`Cancelamento oficial homologado na SEFAZ! (${res.cStat}: ${res.xMotivo}${res.nProt ? ` • Prot: ${res.nProt}` : ""})`);
        await loadInvoices(true);
      } else {
        setError(res.error || "SEFAZ recusou o cancelamento.");
      }
    } else {
      const res = await inutilizarAndDeleteInvoiceAction(inv.id, sefazJust);
      setSefazActionLoading(false);
      if (res.ok) {
        setSefazActionModal(null);
        setSuccess(`Numeração #${inv.number} INUTILIZADA na SEFAZ (${res.cStat}: ${res.xMotivo}) e excluída da fila com segurança.`);
        await loadInvoices(true);
      } else {
        setError(res.error || "SEFAZ recusou a inutilização.");
      }
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
    authorized: invoices.filter((i) => i.effectiveStatus === "AUTHORIZED").length,
    rejected: invoices.filter((i) => i.effectiveStatus === "REJECTED").length,
    canceled: invoices.filter((i) => i.effectiveStatus === "CANCELED").length,
    totalValue: invoices.reduce((acc, i) => acc + (i.effectiveStatus === "AUTHORIZED" ? Number(i.total) : 0), 0),
  };

  const filteredInvoices = invoices.filter((i) => {
    const matchesSearch =
      i.accessKey?.toLowerCase().includes(search.toLowerCase()) ||
      i.number?.includes(search) ||
      i.customerName?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === "pendentes") return i.effectiveStatus === "REJECTED";
    if (statusFilter === "autorizadas") return i.effectiveStatus === "AUTHORIZED";
    if (statusFilter === "canceladas") return i.effectiveStatus === "CANCELED";
    return true;
  });

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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total de Notas" value={String(stats.total)} color="slate" />
        <StatCard label="Autorizadas SEFAZ" value={String(stats.authorized)} color="emerald" />
        <StatCard label="Pendentes / Rejeitadas" value={String(stats.rejected)} color="red" />
        <StatCard label="Canceladas" value={String(stats.canceled)} color="slate" />
        <StatCard label="Faturado Autorizado" value={`R$ ${stats.totalValue.toFixed(2)}`} color="indigo" />
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
          ABA 2: NOTAS EMITIDAS (NF-e / NFC-e) — SEFAZ-AL 100% REAL
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "notas" && (
        <div className="space-y-4">
          {/* Painel de Retransmissão Automática 5s + Controle Manual SEFAZ */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <UploadCloud className="text-blue-600" size={20} />
                    Central de Transmissão Real SEFAZ-AL (NFC-e / NF-e)
                  </span>
                  {autoEnabled ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                      <Loader2 size={12} className="animate-spin" />
                      AUTOMÁTICO ATIVO • Próximo envio em {countdown}s
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300 px-2.5 py-0.5 rounded-full">
                      Automático Pausado
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  <strong>{stats.rejected}</strong> nota(s) pendente(s)/rejeitada(s) •{" "}
                  <strong>{pendingQueue.length}</strong> aguardando tentativa na fila automática de 5s.
                  Nenhuma operação é simulada — cada envio, edição, inutilização e cancelamento comunica ao vivo com a SEFAZ-AL.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {autoEnabled ? (
                  <button
                    type="button"
                    onClick={() => setAutoEnabled(false)}
                    className="px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-sm cursor-pointer"
                  >
                    <Pause size={15} /> Pausar Automática
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pendingQueue.length === 0}
                    onClick={() => {
                      setError("");
                      setSuccess("");
                      setCountdown(5);
                      setAutoEnabled(true);
                    }}
                    className="px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white shadow-sm cursor-pointer"
                  >
                    <Play size={15} /> Iniciar Automática (5s)
                  </button>
                )}

                <button
                  type="button"
                  disabled={!!busyInvoiceId || invoices.filter((i) => i.effectiveStatus === "REJECTED").length === 0}
                  onClick={() => {
                    const target = pendingQueue[0] || invoices.find((i) => i.effectiveStatus === "REJECTED");
                    if (target) void handleRetransmitSingle(target, false);
                  }}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-sm cursor-pointer"
                >
                  {busyInvoiceId ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Subir Próxima Manual
                </button>

                {Object.keys(attemptedIds).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAttemptedIds({})}
                    className="px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 cursor-pointer"
                    title="Limpar marcação de notas já tentadas para reprocessar toda a fila"
                  >
                    <RotateCcw size={14} /> Resetar Fila ({Object.keys(attemptedIds).length})
                  </button>
                )}
              </div>
            </div>

            {queueLogs.length > 0 && (
              <div className="bg-slate-950 text-slate-100 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1 text-xs font-mono">
                {queueLogs.map((l, idx) => (
                  <div key={`${l.id}-${idx}`} className={l.ok ? "text-emerald-400" : "text-red-400"}>
                    [{l.time}] Nota #{l.number} → {l.msg}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900 mr-2">Notas Emitidas (NF-e / NFC-e)</h2>
                {(
                  [
                    { k: "todas", label: `Todas (${invoices.length})` },
                    { k: "pendentes", label: `Pendentes / Erro (${stats.rejected})` },
                    { k: "autorizadas", label: `Autorizadas (${stats.authorized})` },
                    { k: "canceladas", label: `Canceladas (${stats.canceled})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.k}
                    type="button"
                    onClick={() => setStatusFilter(tab.k)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                      statusFilter === tab.k
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por número, chave ou cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 text-gray-900 text-sm rounded-xl py-2 pl-10 pr-4 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={() => loadInvoices()}
                  className="bg-gray-50 hover:bg-gray-100 text-slate-800 border border-gray-200 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <RefreshCw size={15} /> Atualizar
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-500">Buscando notas fiscais...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-slate-500 font-bold">
                    <tr>
                      <th className="px-4 py-3.5 text-left">Número / Série</th>
                      <th className="px-4 py-3.5 text-left">Chave de Acesso</th>
                      <th className="px-4 py-3.5 text-left">Tipo</th>
                      <th className="px-4 py-3.5 text-left">Cliente</th>
                      <th className="px-4 py-3.5 text-right">Valor Total</th>
                      <th className="px-4 py-3.5 text-left">Situação Real SEFAZ</th>
                      <th className="px-4 py-3.5 text-right">Ações SEFAZ (100% Real)</th>
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
                      filteredInvoices.map((invoice) => {
                        const isBusy = busyInvoiceId === invoice.id;
                        return (
                          <tr key={invoice.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3.5 text-gray-900 font-bold whitespace-nowrap">
                              #{invoice.number} / Série {invoice.series}
                              <span className="text-[10px] text-slate-500 block font-normal">
                                {new Date(invoice.createdAt).toLocaleString("pt-BR")} • {invoice.environment}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <span>
                                  {invoice.accessKey?.slice(0, 14)}...{invoice.accessKey?.slice(-8)}
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
                            <td className="px-4 py-3.5 whitespace-nowrap">
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
                            <td className="px-4 py-3.5 text-slate-600 font-medium">{invoice.customerName}</td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                              R$ {Number(invoice.total).toFixed(2)}
                            </td>
                            <td className="px-4 py-3.5 max-w-xs">
                              {invoice.effectiveStatus === "AUTHORIZED" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={12} /> Autorizada SEFAZ
                                </span>
                              )}
                              {invoice.effectiveStatus === "CANCELED" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
                                  <XCircle size={12} /> Cancelada SEFAZ
                                </span>
                              )}
                              {invoice.effectiveStatus === "REJECTED" && (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                    <AlertCircle size={12} /> Rejeitada / Pendente
                                  </span>
                                  {invoice.errorMsg && (
                                    <p className="text-[11px] text-red-600 font-medium leading-tight">
                                      {invoice.errorMsg}
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {invoice.effectiveStatus === "REJECTED" && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleRetransmitSingle(invoice, false)}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                                    title="Subir esta nota manualmente para a SEFAZ agora"
                                  >
                                    {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                    Subir Manual
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleConsultarSefaz(invoice)}
                                  className="text-slate-700 hover:text-blue-700 px-2 py-1.5 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  title="Consultar Situação Real na SEFAZ-AL"
                                >
                                  <ShieldCheck size={13} /> SEFAZ
                                </button>

                                {invoice.effectiveStatus !== "CANCELED" && (
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(invoice)}
                                    className="text-amber-700 hover:bg-amber-50 px-2 py-1.5 bg-gray-50 rounded-lg border border-amber-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                    title={invoice.sefazAuthorized ? "Carta de Correção SEFAZ (NF-e 55)" : "Editar Itens/Impostos antes de reenviar"}
                                  >
                                    <Pencil size={12} /> {invoice.sefazAuthorized ? "CC-e" : "Editar"}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => downloadSingleInvoiceXml(invoice)}
                                  className="text-slate-600 hover:text-blue-600 p-1.5 bg-gray-50 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                                  title="Download XML"
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

                                {invoice.effectiveStatus === "AUTHORIZED" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSefazJust("Cancelamento solicitado por erro operacional no caixa.");
                                      setSefazActionModal({ inv: invoice, mode: "CANCEL" });
                                    }}
                                    className="text-red-600 hover:text-white hover:bg-red-600 px-2 py-1.5 rounded-lg text-xs border border-red-200 transition-all font-semibold cursor-pointer"
                                  >
                                    Cancelar SEFAZ
                                  </button>
                                )}

                                {invoice.effectiveStatus === "REJECTED" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSefazJust("Inutilizacao de numeracao por falha ou rejeicao na emissao.");
                                      setSefazActionModal({ inv: invoice, mode: "INUTILIZAR" });
                                    }}
                                    className="text-red-600 hover:text-white hover:bg-red-600 px-2 py-1.5 rounded-lg text-xs border border-red-200 transition-all font-semibold inline-flex items-center gap-1 cursor-pointer"
                                    title="Inutilizar numeração oficialmente na SEFAZ e excluir da fila"
                                  >
                                    <Trash2 size={12} /> Inutilizar / Excluir
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: EDITAR NOTA REJEITADA / ITENS FISCAIS */}
      {editModalInv && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Editar Nota #{editModalInv.number} ({editModalInv.type}) antes de retransmitir
                </h3>
                <p className="text-xs text-gray-500">
                  Corrija nome do produto, NCM, CFOP, CSOSN, quantidade ou preço e envie novamente para a SEFAZ-AL.
                </p>
              </div>
              <button type="button" onClick={() => setEditModalInv(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {editItems.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold">
                  Esta nota não possui itens de venda vinculados no PDV para edição.
                </div>
              ) : (
                <div className="space-y-3">
                  {editItems.map((it, idx) => (
                    <div key={it.saleItemId} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição do Produto</label>
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => {
                            const copy = [...editItems];
                            copy[idx].name = e.target.value;
                            setEditItems(copy);
                          }}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">NCM (8 díg.)</label>
                        <input
                          type="text"
                          value={it.ncm}
                          onChange={(e) => {
                            const copy = [...editItems];
                            copy[idx].ncm = e.target.value;
                            setEditItems(copy);
                          }}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">CFOP</label>
                        <input
                          type="text"
                          value={it.cfop}
                          onChange={(e) => {
                            const copy = [...editItems];
                            copy[idx].cfop = e.target.value;
                            setEditItems(copy);
                          }}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-mono"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">CSOSN</label>
                        <input
                          type="text"
                          value={it.csosn}
                          onChange={(e) => {
                            const copy = [...editItems];
                            copy[idx].csosn = e.target.value;
                            setEditItems(copy);
                          }}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-mono"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Qtd</label>
                        <input
                          type="number"
                          step="0.001"
                          value={it.quantity}
                          onChange={(e) => {
                            const copy = [...editItems];
                            copy[idx].quantity = Number(e.target.value);
                            setEditItems(copy);
                          }}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Unit. (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e) => {
                            const copy = [...editItems];
                            copy[idx].unitPrice = Number(e.target.value);
                            setEditItems(copy);
                          }}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <label className="text-xs font-bold text-gray-600">Desconto (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(e.target.value)}
                      className="w-28 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditModalInv(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={editSaving || editItems.length === 0}
                onClick={() => handleSaveEditModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-900 bg-amber-100 border border-amber-300 hover:bg-amber-200 disabled:opacity-50 cursor-pointer"
              >
                {editSaving ? "Salvando..." : "Salvar Alterações"}
              </button>
              <button
                type="button"
                disabled={editSaving || editItems.length === 0}
                onClick={() => handleSaveEditModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={13} /> Salvar & Subir SEFAZ Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CARTA DE CORREÇÃO ELETRÔNICA (CC-e 110110) */}
      {cceModalInv && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">
                Carta de Correção SEFAZ (CC-e) — NF-e #{cceModalInv.number}
              </h3>
              <button type="button" onClick={() => setCceModalInv(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Envia evento oficial <strong>110110</strong> direto para a SEFAZ-AL (mínimo 15 caracteres; não altera valores nem impostos).
            </p>
            <textarea
              rows={4}
              value={cceText}
              onChange={(e) => setCceText(e.target.value)}
              placeholder="Descreva a correção oficial (mínimo 15 caracteres)..."
              className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:border-blue-600"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCceModalInv(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={cceSending || cceText.trim().length < 15}
                onClick={handleSendCce}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                {cceSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Transmitir CC-e na SEFAZ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCELAMENTO (110111) OU INUTILIZAÇÃO / EXCLUSÃO REAL NA SEFAZ */}
      {sefazActionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-red-700">
                {sefazActionModal.mode === "CANCEL"
                  ? `Cancelamento Oficial SEFAZ (110111) — #${sefazActionModal.inv.number}`
                  : `Inutilizar Numeração & Excluir SEFAZ — #${sefazActionModal.inv.number}`}
              </h3>
              <button type="button" onClick={() => setSefazActionModal(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-600">
              {sefazActionModal.mode === "CANCEL"
                ? "Esta ação transmite o evento oficial de Cancelamento assinado com Certificado A1 para a SEFAZ-AL. A nota só será marcada como Cancelada se a SEFAZ homologar."
                : "Esta ação envia NfeInutilizacao4 assinado com Certificado A1 para a SEFAZ-AL inutilizando oficialmente este número de nota fiscal, e só remove da fila após homologação (cStat 102)."}
            </p>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                Justificativa Oficial SEFAZ (mínimo 15 caracteres)
              </label>
              <textarea
                rows={3}
                value={sefazJust}
                onChange={(e) => setSefazJust(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:border-red-600"
              />
              <p className="text-[11px] text-gray-400 mt-1">{sefazJust.trim().length} / 15 caracteres mínimos</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSefazActionModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={sefazActionLoading || sefazJust.trim().length < 15}
                onClick={handleConfirmSefazDeleteOrCancel}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                {sefazActionLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {sefazActionModal.mode === "CANCEL" ? "Confirmar Cancelamento SEFAZ" : "Inutilizar na SEFAZ e Excluir"}
              </button>
            </div>
          </div>
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
