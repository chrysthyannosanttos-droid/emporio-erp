"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, FileCode, FileText, X, CheckCircle2, AlertCircle, AlertTriangle,
  Package, Search, ChevronRight, GitMerge, Loader2, RefreshCw,
  Receipt, Calendar, Truck, Hash, ArrowRight, Plus, ClipboardCheck,
  Radio, Eye, Download, ShieldCheck, Sparkles, Building2, Printer,
  FileX, Ban, HelpCircle, Check, MessageSquare
} from "lucide-react";
import {
  confirmStockEntry,
  getStockEntries,
  getOpenPurchaseOrders,
  matchProducts,
  getRadarInvoices,
  manifestDFe,
  type RadarInvoice,
  type ManifestType
} from "@/actions/invoices";

// ─── NF-e XML Parser (runs in browser) ───────────────────────────────────────
function parseNFeXMLClient(xmlText: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  const get = (parent: Element | Document, tag: string) =>
    parent.querySelector(tag)?.textContent?.trim() || null;

  const nfeProc = doc.querySelector("nfeProc") || doc.querySelector("NFe") || doc;
  const infNFe = nfeProc.querySelector("infNFe");
  if (!infNFe) throw new Error("XML inválido: não encontrado <infNFe>");

  const emit = infNFe.querySelector("emit");
  const ide = infNFe.querySelector("ide");
  const total = infNFe.querySelector("ICMSTot");

  const items = Array.from(infNFe.querySelectorAll("det")).map((det) => {
    const prod = det.querySelector("prod");
    const rastro = det.querySelector("rastro");
    const qtyStr = get(prod!, "qCom") || get(prod!, "qTrib") || "1";
    const unitCostStr = get(prod!, "vUnCom") || get(prod!, "vUnTrib") || "0";
    const qty = parseFloat(qtyStr.replace(",", "."));
    const unitCost = parseFloat(unitCostStr.replace(",", "."));

    return {
      productName: get(prod!, "xProd") || "Produto",
      barcode: get(prod!, "cEAN") || get(prod!, "cEANTrib") || null,
      ncm: get(prod!, "NCM"),
      cfop: get(prod!, "CFOP"),
      unit: get(prod!, "uCom") || get(prod!, "uTrib") || "UN",
      quantity: isNaN(qty) ? 1 : qty,
      unitCost: isNaN(unitCost) ? 0 : unitCost,
      totalCost: isNaN(qty * unitCost) ? 0 : qty * unitCost,
      expirationDate: rastro ? get(rastro, "dVal") : null,
      batchNumber: rastro ? get(rastro, "nLote") : null,
    };
  });

  const nNF = get(ide, "nNF");
  const dhEmi = get(ide, "dhEmi") || get(ide, "dEmi") || new Date().toISOString();
  const chNFe = get(nfeProc, "chNFe") || infNFe.getAttribute("Id")?.replace("NFe", "") || "";

  return {
    invoiceNum: nNF || chNFe.slice(-9, -2),
    accessKey: chNFe,
    issueDate: dhEmi,
    supplier: {
      name: get(emit, "xNome") || get(emit, "xFant") || "Fornecedor",
      cnpj: (get(emit, "CNPJ") || "").replace(/\D/g, ""),
      ie: get(emit, "IE"),
      uf: get(emit, "UF"),
      city: get(emit, "xMun"),
    },
    totalAmount: parseFloat((get(total, "vNF") || "0").replace(",", ".")) || 0,
    items,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ParsedItem = {
  productName: string; barcode: string | null; ncm: string | null;
  cfop: string | null; unit: string; quantity: number; unitCost: number;
  totalCost: number; expirationDate: string | null; batchNumber: string | null;
  matchedProductId?: string | null; matchedProductName?: string | null; isNew?: boolean;
};

type ParsedNFe = {
  invoiceNum: string; accessKey: string; issueDate: string;
  supplier: { name: string; cnpj: string; ie: string | null; uf: string | null; city: string | null };
  totalAmount: number; items: ParsedItem[];
};

type StepState = "idle" | "parsing" | "reviewing" | "confirming" | "done" | "error";
type TabType = "radar" | "upload" | "history";

const REASONS_REFUSAL = [
  "Mercadoria avariada durante o transporte e recusada no ato da entrega",
  "Preço e condições comerciais divergentes do pedido de compra aprovado",
  "Mercadoria não solicitada ou desacordo comercial com fornecedor",
  "Devolução total de mercadoria por inconformidade de especificação",
  "Nota fiscal emitida indevidamente contra este CNPJ"
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("radar");
  const [step, setStep] = useState<StepState>("idle");
  const [parsed, setParsed] = useState<ParsedNFe | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<string>("");
  const [matchedPO, setMatchedPO] = useState<any | null>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [confirmedEntryId, setConfirmedEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Radar State
  const [radarInvoices, setRadarInvoices] = useState<RadarInvoice[]>([]);
  const [isRadarSyncing, setIsRadarSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [radarKeySearch, setRadarKeySearch] = useState("");
  const [manifestSuccess, setManifestSuccess] = useState<string | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Modal de Visualização da DANFE
  const [viewingDanfe, setViewingDanfe] = useState<RadarInvoice | null>(null);

  // Modal de Manifestação / Recusa
  const [manifestingInv, setManifestingInv] = useState<RadarInvoice | null>(null);
  const [selectedManifestType, setSelectedManifestType] = useState<ManifestType>("CIENCIA");
  const [refusalReason, setRefusalReason] = useState("");
  const [isSubmittingManifest, setIsSubmittingManifest] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    getStockEntries().then(r => setRecentEntries((r as any).entries || []));
    getOpenPurchaseOrders().then(r => setPurchaseOrders((r as any).orders || []));
    loadRadar();
  };

  const loadRadar = async () => {
    try {
      const res = await getRadarInvoices();
      setRadarInvoices(res.invoices);
      setLastSyncTime(res.lastSync);
    } catch (e) {
      console.error("Erro ao carregar radar:", e);
    }
  };

  const syncRadar = async () => {
    setIsRadarSyncing(true);
    try {
      await new Promise(r => setTimeout(r, 900));
      await loadRadar();
    } finally {
      setIsRadarSyncing(false);
    }
  };

  // ── Import from Radar Invoice ──
  const handleImportFromRadar = async (inv: RadarInvoice) => {
    setStep("parsing");
    setErrorMsg("");

    try {
      const rawItems = inv.itemsPreview.map(i => ({
        productName: i.name,
        barcode: i.barcode,
        ncm: i.ncm,
        cfop: i.cfop || "1102",
        unit: i.unit,
        quantity: i.quantity,
        unitCost: i.unitCost,
        totalCost: i.totalCost,
        expirationDate: null,
        batchNumber: null,
      }));

      const matchResult = await matchProducts(
        rawItems.map(i => ({ barcode: i.barcode, name: i.productName }))
      ) as any;

      const itemsWithMatch: ParsedItem[] = rawItems.map((item, idx) => {
        const match = matchResult.matches?.find((m: any) => m.idx === idx)?.match;
        return {
          ...item,
          matchedProductId: match?.id || null,
          matchedProductName: match?.name || null,
          isNew: !match,
        };
      });

      // REGRA DO PEDIDO DE COMPRA:
      const cleanCnpj = inv.supplierCnpj.replace(/\D/g, "");
      const possiblePO = purchaseOrders.find(po => {
        const poCnpj = (po.supplier?.document || "").replace(/\D/g, "");
        const poName = (po.supplier?.name || "").toLowerCase();
        const invName = inv.supplierName.toLowerCase();
        return (poCnpj && cleanCnpj && poCnpj === cleanCnpj) || invName.includes(poName) || poName.includes(invName);
      });

      if (possiblePO) {
        setSelectedPO(possiblePO.id);
        setMatchedPO(possiblePO);
      } else {
        setSelectedPO("");
        setMatchedPO(null);
      }

      setParsed({
        invoiceNum: inv.invoiceNum,
        accessKey: inv.accessKey,
        issueDate: inv.issueDate,
        supplier: {
          name: inv.supplierName,
          cnpj: inv.supplierCnpj,
          ie: inv.supplierIe || null,
          uf: "SP",
          city: "São Paulo",
        },
        totalAmount: inv.totalAmount,
        items: itemsWithMatch,
      });

      setItems(itemsWithMatch);
      setStep("reviewing");
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message || "Erro ao preparar nota do radar");
    }
  };

  // ── Abrir modal de manifestação ──
  const openManifestModal = (inv: RadarInvoice, defaultType: ManifestType = "CIENCIA") => {
    setManifestingInv(inv);
    setSelectedManifestType(defaultType);
    setRefusalReason(inv.manifestJustificativa || "");
    setManifestError(null);
  };

  // ── Enviar Manifestação / Recusa para SEFAZ ──
  const handleSubmitManifest = async () => {
    if (!manifestingInv) return;

    if (selectedManifestType === "RECUSA" && refusalReason.trim().length < 15) {
      setManifestError("A SEFAZ exige justificativa com no mínimo 15 caracteres para Recusa da Nota.");
      return;
    }

    setIsSubmittingManifest(true);
    setManifestError(null);

    try {
      const res = await manifestDFe(
        manifestingInv.accessKey,
        selectedManifestType,
        selectedManifestType === "RECUSA" ? refusalReason : undefined
      );

      if (res.error) {
        setManifestError(res.error);
      } else {
        setManifestSuccess(res.message);
        setTimeout(() => setManifestSuccess(null), 5000);

        // Atualiza estado local
        setRadarInvoices(prev => prev.map(inv => {
          if (inv.accessKey !== manifestingInv.accessKey) return inv;
          const statusMap: Record<ManifestType, any> = {
            CIENCIA: "CIENCIA_EMITIDA",
            CONFIRMACAO: "CONFIRMADA",
            DESCONHECIMENTO: "DESCONHECIDA",
            RECUSA: "RECUSADA"
          };
          return {
            ...inv,
            statusManifest: statusMap[selectedManifestType],
            manifestJustificativa: selectedManifestType === "RECUSA" ? refusalReason : null,
            manifestProtocolo: res.protocolo,
            manifestDate: new Date().toISOString(),
            xmlAvailable: selectedManifestType === "CIENCIA" || selectedManifestType === "CONFIRMACAO"
          };
        }));

        setManifestingInv(null);
      }
    } catch (err: any) {
      setManifestError(err.message || "Erro na comunicação com a SEFAZ");
    } finally {
      setIsSubmittingManifest(false);
    }
  };

  // ── File handler (Upload XML / PDF) ──
  const handleFile = useCallback(async (file: File) => {
    setErrorMsg("");
    setStep("parsing");

    try {
      const isXml = file.name.toLowerCase().endsWith(".xml") || file.type === "application/xml" || file.type === "text/xml";
      const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";

      if (!isXml && !isPdf) {
        throw new Error("Arquivo inválido. Envie um arquivo XML de NF-e ou PDF da DANFE.");
      }

      if (isPdf) {
        setStep("error");
        setErrorMsg("O arquivo PDF da DANFE foi detectado. Para registrar a entrada no estoque com precisão fiscal de lote, NCM e impostos, a SEFAZ exige o arquivo XML. Você também pode importar direto pelo RADAR XML com 1 clique.");
        return;
      }

      const text = await file.text();
      const data = parseNFeXMLClient(text);

      const matchResult = await matchProducts(
        data.items.map(i => ({ barcode: i.barcode, name: i.productName }))
      ) as any;

      const itemsWithMatch: ParsedItem[] = data.items.map((item, idx) => {
        const match = matchResult.matches?.find((m: any) => m.idx === idx)?.match;
        return {
          ...item,
          matchedProductId: match?.id || null,
          matchedProductName: match?.name || null,
          isNew: !match,
        };
      });

      // REGRA DO PEDIDO DE COMPRA:
      const cleanCnpj = data.supplier.cnpj.replace(/\D/g, "");
      const possiblePO = purchaseOrders.find(po => {
        const poCnpj = (po.supplier?.document || "").replace(/\D/g, "");
        return poCnpj && cleanCnpj && poCnpj === cleanCnpj;
      });

      if (possiblePO) {
        setSelectedPO(possiblePO.id);
        setMatchedPO(possiblePO);
      } else {
        setSelectedPO("");
        setMatchedPO(null);
      }

      setParsed(data);
      setItems(itemsWithMatch);
      setStep("reviewing");
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message || "Erro ao processar arquivo");
    }
  }, [purchaseOrders]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Confirm entry ──
  const handleConfirm = async () => {
    if (!parsed) return;
    setStep("confirming");
    try {
      const result = await confirmStockEntry({
        invoiceNum: parsed.invoiceNum,
        accessKey: parsed.accessKey,
        issueDate: parsed.issueDate,
        supplierName: parsed.supplier.name,
        supplierCnpj: parsed.supplier.cnpj,
        totalAmount: parsed.totalAmount,
        purchaseOrderId: selectedPO || null,
        items: items.map(i => ({
          productId: i.matchedProductId || null,
          productName: i.productName,
          barcode: i.barcode,
          ncm: i.ncm,
          unit: i.unit,
          quantity: i.quantity,
          unitCost: i.unitCost,
          expirationDate: i.expirationDate,
          batchNumber: i.batchNumber,
        }))
      }) as any;

      if (result?.error) {
        setStep("error");
        setErrorMsg(result.error);
      } else {
        setConfirmedEntryId(result.entryId);
        setStep("done");
        loadData();
      }
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message || "Erro ao confirmar entrada");
    }
  };

  const reset = () => {
    setParsed(null);
    setItems([]);
    setSelectedPO("");
    setMatchedPO(null);
    setStep("idle");
    setErrorMsg("");
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const filteredRadar = radarInvoices.filter(inv =>
    !radarKeySearch ||
    inv.accessKey.includes(radarKeySearch) ||
    inv.invoiceNum.includes(radarKeySearch) ||
    inv.supplierName.toLowerCase().includes(radarKeySearch.toLowerCase()) ||
    inv.supplierCnpj.includes(radarKeySearch)
  );

  return (
    <div className="w-full flex flex-col gap-4 select-none pb-16">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Radio size={24} className="text-blue-600 animate-pulse" />
            Radar XML &amp; Entrada de Notas
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Monitoramento de NF-e na SEFAZ · Manifestação &amp; Recusa Justificada · Visualização da DANFE · Regra de Pedido de Compra
          </p>
        </div>

        {step !== "idle" && step !== "done" && (
          <button onClick={reset} className="text-gray-600 hover:text-gray-900 flex items-center gap-1.5 text-sm font-bold bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors">
            <X size={15} /> Cancelar / Voltar
          </button>
        )}
      </div>

      {/* Tabs Principais */}
      {(step === "idle" || step === "done") && (
        <div className="flex items-center justify-between border-b border-gray-200 pb-2 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("radar")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === "radar"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <Radio size={16} /> Radar XML (SEFAZ DF-e)
              <span className={`text-xs px-2 py-0.5 rounded-full font-black ${activeTab === "radar" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}>
                {radarInvoices.filter(i => !i.imported && i.statusManifest !== "RECUSADA").length} ativas
              </span>
            </button>

            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === "upload"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <Upload size={16} /> Importar Arquivo (XML / PDF)
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === "history"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <Receipt size={16} /> Histórico de Entradas
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">
                {recentEntries.length}
              </span>
            </button>
          </div>

          {activeTab === "radar" && (
            <button
              onClick={syncRadar}
              disabled={isRadarSyncing}
              className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-60"
            >
              <RefreshCw size={14} className={isRadarSyncing ? "animate-spin" : ""} />
              {isRadarSyncing ? "Varrendo SEFAZ..." : "Sincronizar Radar SEFAZ"}
            </button>
          )}
        </div>
      )}

      {/* Manifest Notification */}
      {manifestSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          {manifestSuccess}
        </div>
      )}

      {/* Content Container com rolagem vertical livre */}
      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto">

        {/* ══════════════════════════════════════════════════════════════════════
            ABA 1: RADAR XML (SEFAZ DF-e)
        ══════════════════════════════════════════════════════════════════════ */}
        {(step === "idle" || step === "done") && activeTab === "radar" && (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Status do Radar */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 shadow-sm shrink-0 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <Radio size={24} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-base">Radar SEFAZ Conectado &amp; Ativo</h2>
                    <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> ONLINE
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Monitoramento contínuo DF-e. Veja as notas capturadas, confira a DANFE ou registre manifestos e recusas na SEFAZ.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs text-blue-200">
                <div>
                  <span className="opacity-70 block text-[10px] uppercase font-bold">Certificado Digital A1</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-400" /> Homologado
                  </span>
                </div>
                <div>
                  <span className="opacity-70 block text-[10px] uppercase font-bold">Última Varredura</span>
                  <span className="font-bold text-white">{lastSyncTime || "Agora"}</span>
                </div>
              </div>
            </div>

            {/* Busca e Indicadores */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 shrink-0 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  value={radarKeySearch}
                  onChange={e => setRadarKeySearch(e.target.value)}
                  placeholder="Filtrar por Chave de 44 dígitos, NF ou Fornecedor..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                />
              </div>

              {purchaseOrders.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                  <ClipboardCheck size={15} />
                  {purchaseOrders.length} Pedido(s) de Compra aguardando recebimento
                </div>
              )}
            </div>

            {/* Tabela do Radar - Sem Caixa/Quadrado e Sem Rolagem Interna */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Notas Fiscais no Radar ({filteredRadar.length})
                </span>
                <span className="text-[11px] text-gray-400">
                  Clique no <Eye size={12} className="inline mx-0.5 text-blue-600" /> para ver a DANFE ou em <strong>Manifestar</strong> para confirmar ou recusar com justificativa
                </span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm border-separate border-spacing-y-1">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">NF / Emissão</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">Fornecedor (Emitente)</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-right">Valor Total</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-center">Status Manifestação</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRadar.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-gray-400">
                          <Radio size={40} className="mx-auto text-gray-200 mb-2" />
                          <p className="font-bold text-sm">Nenhuma nota encontrada no Radar</p>
                          <p className="text-xs mt-1">Clique em "Sincronizar Radar SEFAZ" para consultar novamente</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRadar.map((inv) => (
                        <tr key={inv.accessKey} className="group hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-3 bg-white group-hover:bg-blue-50/40 border-y first:border-l last:border-r first:rounded-l-xl last:rounded-r-xl border-gray-200/80">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-gray-900 text-sm">NF {inv.invoiceNum}</span>
                              <button
                                onClick={() => setViewingDanfe(inv)}
                                title="Abrir espelho da DANFE / Visualizar nota"
                                className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1 rounded-md transition-colors"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={11} /> {new Date(inv.issueDate).toLocaleDateString("pt-BR")}
                            </div>
                            <div className="font-mono text-[9px] text-gray-400 truncate max-w-[200px]" title={inv.accessKey}>
                              {inv.accessKey}
                            </div>
                          </td>

                          <td className="px-4 py-3 bg-white group-hover:bg-blue-50/40 border-y border-gray-200/80">
                            <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                              <Building2 size={13} className="text-gray-400" />
                              {inv.supplierName}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              CNPJ: {inv.supplierCnpj}
                            </div>
                            <div className="text-[10px] text-blue-600 font-semibold mt-1">
                              {inv.itemsPreview.length} produtos na nota
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right font-black text-gray-900 text-sm whitespace-nowrap bg-white group-hover:bg-blue-50/40 border-y border-gray-200/80">
                            {fmt(inv.totalAmount)}
                          </td>

                          <td className="px-4 py-3 text-center bg-white group-hover:bg-blue-50/40 border-y border-gray-200/80">
                            {inv.statusManifest === "CONFIRMADA" ? (
                              <div>
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                                  <Check size={11} /> 210200 - Confirmada
                                </span>
                                {inv.manifestProtocolo && (
                                  <p className="text-[9px] text-gray-400 font-mono mt-0.5">Prot: {inv.manifestProtocolo}</p>
                                )}
                              </div>
                            ) : inv.statusManifest === "CIENCIA_EMITIDA" ? (
                              <div>
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200 inline-flex items-center gap-1">
                                  210210 - Ciência Emitida
                                </span>
                                <p className="text-[9px] text-gray-400 mt-0.5">XML liberado para baixa</p>
                              </div>
                            ) : inv.statusManifest === "RECUSADA" ? (
                              <div>
                                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-200 inline-flex items-center gap-1">
                                  <Ban size={11} /> 210240 - Operação Recusada
                                </span>
                                {inv.manifestJustificativa && (
                                  <p className="text-[9px] text-red-600 font-medium mt-0.5 truncate max-w-[180px] mx-auto" title={inv.manifestJustificativa}>
                                    "{inv.manifestJustificativa}"
                                  </p>
                                )}
                              </div>
                            ) : inv.statusManifest === "DESCONHECIDA" ? (
                              <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200">
                                210220 - Desconhecida
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                                Aguardando Manifestação
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center whitespace-nowrap bg-white group-hover:bg-blue-50/40 border-y first:border-l last:border-r first:rounded-l-xl last:rounded-r-xl border-gray-200/80">
                            {inv.imported ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                                <CheckCircle2 size={13} /> Entrada Realizada
                              </span>
                            ) : inv.statusManifest === "RECUSADA" ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setViewingDanfe(inv)}
                                  className="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
                                >
                                  <Eye size={13} /> Ver Detalhes
                                </button>
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                                  Recusa Homologada
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <a
                                  href={`/invoices/danfe/${inv.accessKey}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-xs"
                                  title="Abrir DANFE original em PDF / Imprimir"
                                >
                                  <FileText size={13} className="text-red-600" /> PDF Original
                                </a>

                                <button
                                  onClick={() => setViewingDanfe(inv)}
                                  className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
                                  title="Visualizar espelho da DANFE com itens e impostos"
                                >
                                  <Eye size={13} /> Visualizar
                                </button>

                                <button
                                  onClick={() => openManifestModal(inv)}
                                  className="text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
                                  title="Manifestar na SEFAZ ou Recusar a Nota Fiscal"
                                >
                                  <MessageSquare size={13} /> Manifestar
                                </button>

                                <button
                                  onClick={() => handleImportFromRadar(inv)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                                >
                                  Dar Entrada <ArrowRight size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ABA 2: IMPORTAR ARQUIVO (XML / PDF DANFE)
        ══════════════════════════════════════════════════════════════════════ */}
        {(step === "idle" || step === "done") && activeTab === "upload" && (
          <div
            className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-20 gap-4 transition-all cursor-pointer bg-white ${
              isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"
            }`}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xml,.pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />

            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Upload size={30} />
            </div>

            <div className="text-center">
              <p className="font-black text-gray-900 text-lg">Arraste ou clique para selecionar</p>
              <p className="text-gray-500 text-sm mt-1">
                Suporta arquivo <strong>XML da NF-e</strong> ou <strong>PDF da DANFE</strong>
              </p>
            </div>

            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                <FileCode size={20} className="text-emerald-600" />
                <div>
                  <p className="font-bold text-gray-900 text-xs">Arquivo XML da NF-e</p>
                  <p className="text-[10px] text-gray-500">Importação com baixa fiscal e estoque</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                <FileText size={20} className="text-red-500" />
                <div>
                  <p className="font-bold text-gray-900 text-xs">PDF da DANFE</p>
                  <p className="text-[10px] text-gray-500">Conferência visual de chave e valores</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ABA 3: HISTÓRICO DE ENTRADAS
        ══════════════════════════════════════════════════════════════════════ */}
        {(step === "idle" || step === "done") && activeTab === "history" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Entradas Registradas no Banco de Dados ({recentEntries.length})
              </span>
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              {recentEntries.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <Receipt size={40} className="mx-auto text-gray-200 mb-2" />
                  <p className="font-bold text-sm">Nenhuma entrada registrada ainda</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">NF / Data</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Fornecedor</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Itens</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Total</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Pedido de Compra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentEntries.map((e: any) => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-black text-gray-900 text-xs">NF {e.invoiceNum || "—"}</p>
                          <p className="text-[10px] text-gray-400">{new Date(e.entryDate).toLocaleDateString("pt-BR")}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-gray-700 text-xs">{e.supplier?.name || "—"}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-bold text-gray-600 text-sm">{e.items?.length || 0}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-gray-900 text-sm whitespace-nowrap">
                          {fmt(Number(e.totalAmount || 0))}
                        </td>
                        <td className="px-4 py-3.5">
                          {e.purchaseOrder ? (
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-full">
                              PC #{e.purchaseOrder.orderNumber}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP: PARSING
        ══════════════════════════════════════════════════════════════════════ */}
        {step === "parsing" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-2xl border border-gray-200">
            <Loader2 size={44} className="text-blue-600 animate-spin" />
            <p className="font-black text-gray-900 text-base">Processando dados da NF-e...</p>
            <p className="text-gray-500 text-sm">Cruzando códigos de barras, fornecedor e pedidos de compra abertos</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP: ERROR
        ══════════════════════════════════════════════════════════════════════ */}
        {step === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-red-700">Atenção</p>
                <p className="text-red-600 text-sm mt-1">{errorMsg}</p>
              </div>
            </div>
            <button onClick={reset} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold text-sm w-fit">
              Voltar ao Radar
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP: DONE
        ══════════════════════════════════════════════════════════════════════ */}
        {step === "done" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-black text-emerald-800 text-xl">Entrada confirmada com sucesso!</p>
              <p className="text-emerald-700 text-sm mt-1">
                NF {parsed?.invoiceNum} de <strong>{parsed?.supplier.name}</strong> registrada.
                {selectedPO && matchedPO && (
                  <><br />Pedido de Compra <strong>#{matchedPO.orderNumber}</strong> liquidado com baixa no estoque.</>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={reset} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm">
                <Plus size={14} className="inline mr-1.5" /> Voltar ao Radar XML
              </button>
              <a href="/pricing" className="bg-white border border-emerald-300 text-emerald-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors">
                Ir para Precificação &amp; Margens →
              </a>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP: REVIEWING (Conferência de Itens + Regra de Pedido de Compra)
        ══════════════════════════════════════════════════════════════════════ */}
        {step === "reviewing" && parsed && (
          <div className="flex flex-col gap-4">
            {/* Cabeçalho da Nota */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                      NF-e {parsed.invoiceNum}
                    </span>
                    <span className="font-black text-gray-900 text-lg">{parsed.supplier.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-gray-500 font-mono text-xs">CNPJ: {parsed.supplier.cnpj}</span>
                    <span className="text-gray-500 flex items-center gap-1 text-xs">
                      <Calendar size={13} /> {new Date(parsed.issueDate).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="font-black text-emerald-700 text-base">{fmt(parsed.totalAmount)}</span>
                  </div>
                  <p className="font-mono text-[10px] text-gray-400 mt-1 break-all">
                    Chave: {parsed.accessKey}
                  </p>
                </div>
              </div>

              {/* REGRA DO PEDIDO DE COMPRA */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardCheck size={14} className="text-blue-600" />
                    Regra do Pedido de Compra (Vínculo &amp; Baixa)
                  </label>
                  {matchedPO && (
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Sugerido automaticamente pelo CNPJ do fornecedor
                    </span>
                  )}
                </div>

                {purchaseOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhum pedido de compra aberto no momento.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setSelectedPO(""); setMatchedPO(null); }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                        !selectedPO
                          ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      Sem vínculo com Pedido
                    </button>

                    {purchaseOrders.map(po => {
                      const isSelected = selectedPO === po.id;
                      return (
                        <button
                          key={po.id}
                          type="button"
                          onClick={() => { setSelectedPO(po.id); setMatchedPO(po); }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                              : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                          }`}
                        >
                          {isSelected && <CheckCircle2 size={12} />}
                          Pedido #{po.orderNumber} — {po.supplier?.name}
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                          }`}>
                            {fmt(Number(po.totalAmount || 0))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Tabela de Produtos da NF */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                  <Package size={15} className="text-blue-600" />
                  Conferência dos Itens da NF-e
                  <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                </h3>
                <div className="flex gap-2 text-[10px] font-bold">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    ✓ {items.filter(i => !i.isNew).length} já cadastrados
                  </span>
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                    + {items.filter(i => i.isNew).length} serão criados
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">Produto da NF-e</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">Correspondência no Sistema</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-center">Qtd</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-right">Custo Unit.</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-right">Total</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-center">Validade / Lote</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-gray-50/70 transition-colors ${item.isNew ? "bg-amber-50/30" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900 text-xs leading-tight">{item.productName}</p>
                          {item.barcode && item.barcode !== "SEM GTIN" && item.barcode !== "0" && (
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.barcode}</p>
                          )}
                          {item.ncm && <p className="text-[10px] text-gray-400">NCM: {item.ncm}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {item.isNew ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <Plus size={9} /> Cadastrar automaticamente
                            </span>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 size={11} /> {item.matchedProductName}
                              </p>
                              <p className="text-[10px] text-gray-400">Item vinculado no cadastro</p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-black text-gray-900 text-sm">{item.quantity}</span>
                          <span className="text-[10px] text-gray-400 ml-1">{item.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-700 text-xs whitespace-nowrap">
                          {fmt(item.unitCost)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 text-xs whitespace-nowrap">
                          {fmt(item.totalCost)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.expirationDate ? (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              {new Date(item.expirationDate).toLocaleDateString("pt-BR")}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-xs font-bold text-gray-500">
                        Total da Nota Fiscal
                      </td>
                      <td colSpan={2} className="px-4 py-3 text-right font-black text-gray-900 text-base">
                        {fmt(parsed.totalAmount)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Rodapé de Confirmação */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 shadow-sm p-4 shrink-0">
              <div className="text-xs text-gray-600">
                <strong>Ao confirmar:</strong> O estoque será incrementado · Os custos serão atualizados
                {selectedPO && " · O Pedido de Compra receberá baixa"}
              </div>
              <button
                onClick={handleConfirm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
              >
                <CheckCircle2 size={16} /> Confirmar Entrada no Estoque
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: VISUALIZAR DANFE (ESPELHO DA NF-E)
      ════════════════════════════════════════════════════════════════════════ */}
      {viewingDanfe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header Modal */}
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <FileText size={22} className="text-blue-400" />
                <div>
                  <h3 className="font-black text-base">Espelho da DANFE / Documento Fiscal Eletrônico</h3>
                  <p className="text-xs text-gray-400">NF-e Nº {viewingDanfe.invoiceNum} · Série {viewingDanfe.series || "1"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/invoices/danfe/${viewingDanfe.accessKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <FileText size={13} /> Abrir PDF Original (DANFE)
                </a>
                <button
                  onClick={() => setViewingDanfe(null)}
                  className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conteúdo DANFE */}
            <div className="flex-1 overflow-auto p-6 space-y-6 text-gray-800 text-xs">
              {/* Box Emitente e Chave */}
              <div className="border border-gray-300 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50/50">
                <div className="md:col-span-2 space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Identificação do Emitente</span>
                  <h4 className="font-black text-sm text-gray-900">{viewingDanfe.supplierName}</h4>
                  <p className="text-gray-600">{viewingDanfe.supplierAddress || "Endereço registrado na SEFAZ"}</p>
                  <div className="flex gap-4 pt-1 text-gray-700 font-mono">
                    <span><strong>CNPJ:</strong> {viewingDanfe.supplierCnpj}</span>
                    <span><strong>IE:</strong> {viewingDanfe.supplierIe || "ISENTO"}</span>
                  </div>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-gray-200 md:pl-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">DANFE</span>
                    <div className="font-black text-base text-gray-900 mt-0.5">NF-e Nº {viewingDanfe.invoiceNum}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Série: {viewingDanfe.series || "1"} · Emissão: {new Date(viewingDanfe.issueDate).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="text-[9px] font-bold text-gray-400 block uppercase">Chave de Acesso</span>
                    <div className="font-mono text-[9px] text-gray-700 bg-white border border-gray-200 p-1.5 rounded-lg select-all break-all">
                      {viewingDanfe.accessKey}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status da Manifestação SEFAZ */}
              <div className="border border-blue-200 bg-blue-50/50 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={24} className="text-blue-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Status do Manifesto na SEFAZ</span>
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      {viewingDanfe.statusManifest === "CONFIRMADA" && <span className="text-emerald-700">✓ Operação Confirmada (Evento 210200)</span>}
                      {viewingDanfe.statusManifest === "CIENCIA_EMITIDA" && <span className="text-blue-700">Ciência da Emissão Registrada (Evento 210210)</span>}
                      {viewingDanfe.statusManifest === "RECUSADA" && <span className="text-red-700">⚠ Operação Não Realizada / Recusada (Evento 210240)</span>}
                      {viewingDanfe.statusManifest === "DESCONHECIDA" && <span className="text-gray-700">Desconhecimento da Operação (Evento 210220)</span>}
                      {viewingDanfe.statusManifest === "AGUARDANDO_MANIFESTACAO" && <span className="text-amber-700">Aguardando Manifestação do Destinatário</span>}
                    </div>
                    {viewingDanfe.manifestJustificativa && (
                      <p className="text-xs text-red-700 mt-1">
                        <strong>Motivo da Recusa:</strong> {viewingDanfe.manifestJustificativa}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const inv = viewingDanfe;
                      setViewingDanfe(null);
                      openManifestModal(inv);
                    }}
                    className="bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <MessageSquare size={13} /> Alterar Manifesto / Recusar
                  </button>
                </div>
              </div>

              {/* Natureza da Operação e Totais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  <span className="text-[10px] text-gray-500 font-bold block">Natureza da Operação</span>
                  <span className="font-bold text-gray-900 truncate block mt-0.5">{viewingDanfe.naturezaOp || "VENDA DE MERCADORIA"}</span>
                </div>
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  <span className="text-[10px] text-gray-500 font-bold block">Base de Cálculo ICMS</span>
                  <span className="font-bold text-gray-900 block mt-0.5 font-mono">{fmt(viewingDanfe.totalAmount * 0.8)}</span>
                </div>
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  <span className="text-[10px] text-gray-500 font-bold block">Valor do ICMS</span>
                  <span className="font-bold text-gray-900 block mt-0.5 font-mono">{fmt(viewingDanfe.totalIcms || viewingDanfe.totalAmount * 0.18)}</span>
                </div>
                <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/50">
                  <span className="text-[10px] text-emerald-800 font-bold block">Valor Total da Nota</span>
                  <span className="font-black text-emerald-800 text-sm block mt-0.5 font-mono">{fmt(viewingDanfe.totalAmount)}</span>
                </div>
              </div>

              {/* Tabela de Itens da DANFE */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 font-bold text-gray-700 text-xs">
                  Dados dos Produtos / Serviços ({viewingDanfe.itemsPreview.length} itens)
                </div>
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Código / Barras</th>
                      <th className="px-3 py-2">Descrição do Produto</th>
                      <th className="px-3 py-2">NCM</th>
                      <th className="px-3 py-2">CFOP</th>
                      <th className="px-3 py-2 text-center">Un.</th>
                      <th className="px-3 py-2 text-center">Qtd.</th>
                      <th className="px-3 py-2 text-right">V. Unitário</th>
                      <th className="px-3 py-2 text-right">V. Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                    {viewingDanfe.itemsPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500 text-[10px]">{item.barcode || `PRD-${idx + 1}`}</td>
                        <td className="px-3 py-2 font-sans font-bold text-gray-900 text-xs">{item.name}</td>
                        <td className="px-3 py-2 text-gray-600">{item.ncm || "22030000"}</td>
                        <td className="px-3 py-2 text-gray-600">{item.cfop || "5102"}</td>
                        <td className="px-3 py-2 text-center font-sans">{item.unit}</td>
                        <td className="px-3 py-2 text-center font-black">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{fmt(item.unitCost)}</td>
                        <td className="px-3 py-2 text-right font-black text-gray-900">{fmt(item.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500">
                Documento auxiliar capturado via SEFAZ Nacional DF-e
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingDanfe(null)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Fechar
                </button>
                {!viewingDanfe.imported && viewingDanfe.statusManifest !== "RECUSADA" && (
                  <button
                    onClick={() => {
                      const inv = viewingDanfe;
                      setViewingDanfe(null);
                      handleImportFromRadar(inv);
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                  >
                    Dar Entrada no Estoque <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: MANIFESTAÇÃO DO DESTINATÁRIO & RECUSA DE NOTAS NA SEFAZ (LISTA VERTICAL COM ROLAGEM)
      ════════════════════════════════════════════════════════════════════════ */}
      {manifestingInv && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-gray-300 rounded-3xl w-full max-w-xl max-h-[88vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col">
            {/* Header Fixo */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-sm leading-tight">Manifestação do Destinatário na SEFAZ</h3>
                  <p className="text-[11px] text-gray-500 truncate max-w-xs sm:max-w-sm">NF-e Nº {manifestingInv.invoiceNum} · {manifestingInv.supplierName}</p>
                </div>
              </div>
              <button
                onClick={() => setManifestingInv(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conteúdo com Rolagem Vertical Livre */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 text-xs uppercase tracking-wider block mb-2.5">
                  Selecione o Evento da Manifestação:
                </label>

                {/* Lista Vertical Compacta */}
                <div className="flex flex-col gap-2">
                  {/* Ciência */}
                  <label
                    onClick={() => setSelectedManifestType("CIENCIA")}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                      selectedManifestType === "CIENCIA"
                        ? "border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="manifestType"
                      checked={selectedManifestType === "CIENCIA"}
                      onChange={() => setSelectedManifestType("CIENCIA")}
                      className="mt-0.5 accent-blue-600 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-gray-900 text-xs">210210 — Ciência da Emissão</span>
                        <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">Libera XML</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                        Declara ciência da operação e solicita à SEFAZ a liberação do arquivo XML completo para importação.
                      </p>
                    </div>
                  </label>

                  {/* Confirmação */}
                  <label
                    onClick={() => setSelectedManifestType("CONFIRMACAO")}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                      selectedManifestType === "CONFIRMACAO"
                        ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="manifestType"
                      checked={selectedManifestType === "CONFIRMACAO"}
                      onChange={() => setSelectedManifestType("CONFIRMACAO")}
                      className="mt-0.5 accent-emerald-600 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-emerald-900 text-xs">210200 — Confirmação da Operação</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">Aceite Definitivo</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                        Confirma que a mercadoria física descrita na NF-e foi recebida e está de acordo com o pedido.
                      </p>
                    </div>
                  </label>

                  {/* Recusa */}
                  <label
                    onClick={() => setSelectedManifestType("RECUSA")}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                      selectedManifestType === "RECUSA"
                        ? "border-red-600 bg-red-50/70 shadow-xs ring-1 ring-red-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="manifestType"
                      checked={selectedManifestType === "RECUSA"}
                      onChange={() => setSelectedManifestType("RECUSA")}
                      className="mt-0.5 accent-red-600 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-red-900 text-xs">210240 — Operação Não Realizada (Recusa da Nota)</span>
                        <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">Rejeição Fiscal</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                        A carga não foi recebida ou foi devolvida ao fornecedor. Exige justificativa obrigatória registrada na SEFAZ.
                      </p>
                    </div>
                  </label>

                  {/* Desconhecimento */}
                  <label
                    onClick={() => setSelectedManifestType("DESCONHECIMENTO")}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                      selectedManifestType === "DESCONHECIMENTO"
                        ? "border-gray-600 bg-gray-100 shadow-xs ring-1 ring-gray-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="manifestType"
                      checked={selectedManifestType === "DESCONHECIMENTO"}
                      onChange={() => setSelectedManifestType("DESCONHECIMENTO")}
                      className="mt-0.5 accent-gray-600 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-gray-900 text-xs">210220 — Desconhecimento da Operação</span>
                        <span className="text-[9px] bg-gray-200 text-gray-700 font-bold px-1.5 py-0.5 rounded-full">Nota Fria</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                        O destinatário declara desconhecer a emissão da NF-e (suspeita de fraude ou uso indevido do CNPJ).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Justificativa Obrigatória para Recusa */}
              {selectedManifestType === "RECUSA" && (
                <div className="space-y-2 p-3 bg-red-50 border border-red-200 rounded-xl animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-red-900 text-[11px] uppercase tracking-wider block">
                      Justificativa da Recusa (Mínimo 15 caracteres): *
                    </label>
                    <span className={`text-[10px] font-bold ${refusalReason.trim().length >= 15 ? "text-emerald-700" : "text-red-600"}`}>
                      {refusalReason.trim().length} / 15 caracteres
                    </span>
                  </div>

                  <textarea
                    rows={2}
                    value={refusalReason}
                    onChange={e => setRefusalReason(e.target.value)}
                    placeholder="Descreva o motivo da recusa para registrar na SEFAZ..."
                    className="w-full p-2.5 bg-white border border-red-300 focus:border-red-500 rounded-xl outline-none text-xs text-gray-900 font-medium placeholder:text-gray-400"
                  />

                  {/* Motivos Rápidos em Tags Compactas */}
                  <div>
                    <span className="text-[9px] font-bold text-red-800 uppercase block mb-1">
                      Motivos Rápidos Sugeridos:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {REASONS_REFUSAL.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRefusalReason(r)}
                          className="bg-white hover:bg-red-100 text-red-800 border border-red-200 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors text-left"
                        >
                          + {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {manifestError && (
                <div className="bg-red-100 border border-red-300 text-red-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  {manifestError}
                </div>
              )}
            </div>

            {/* Footer Fixo */}
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                <ShieldCheck size={13} className="text-emerald-600" /> Certificado Digital A1 ativo
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManifestingInv(null)}
                  disabled={isSubmittingManifest}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmitManifest}
                  disabled={isSubmittingManifest}
                  className={`px-5 py-2 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 ${
                    selectedManifestType === "RECUSA"
                      ? "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                      : selectedManifestType === "CONFIRMACAO"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                  }`}
                >
                  {isSubmittingManifest ? (
                    <><RefreshCw size={13} className="animate-spin" /> Transmitindo à SEFAZ...</>
                  ) : (
                    <><ShieldCheck size={14} /> Salvar &amp; Registrar na SEFAZ</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
