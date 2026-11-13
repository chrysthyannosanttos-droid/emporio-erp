"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Search,
  Plus,
  X,
  Package,
  FileText,
  Hash,
  Calendar,
  Tag,
  ArrowRight,
  CheckCircle2,
  Camera,
  Image as ImageIcon,
  Printer,
  Truck,
  User as UserIcon,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  getLossesAndExpirationsData,
  registerLossRecord,
  registerProductBatch,
  applyBatchMarkdownPrice,
  type LossTypeValue,
} from "@/actions/losses";

const LOSS_TYPE_LABELS: Record<LossTypeValue, { label: string; badgeClass: string }> = {
  DISCARD: {
    label: "Descarte",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  SUPPLIER_EXCHANGE: {
    label: "Troca Fornecedor",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  EXPIRED: {
    label: "Vencido",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  OTHER: {
    label: "Outros",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

function compressImageToJpeg(file: File, maxSize = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Formato de imagem inválido."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Falha ao processar imagem no navegador."));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function LossesAndExpirationsPage() {
  const [activeTab, setActiveTab] = useState<"LOSSES" | "EXPIRATIONS">("LOSSES");
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [expirations, setExpirations] = useState<any[]>([]);
  const [losses, setLosses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [selectedPromoItem, setSelectedPromoItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estados do formulário de Avaria
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [lossQuantity, setLossQuantity] = useState("1");
  const [lossType, setLossType] = useState<LossTypeValue>("DISCARD");
  const [lossReason, setLossReason] = useState("Avaria / Embalagem Danificada");
  const [lossSupplierId, setLossSupplierId] = useState("");
  const [lossResponsibleUserId, setLossResponsibleUserId] = useState("");
  const [lossNfe, setLossNfe] = useState("");
  const [lossNotes, setLossNotes] = useState("");
  const [lossPhotoData, setLossPhotoData] = useState<string | null>(null);
  const [compressingPhoto, setCompressingPhoto] = useState(false);

  // Lightbox & Recibo recém-criado
  const [lightboxLoss, setLightboxLoss] = useState<any | null>(null);
  const [createdReceipt, setCreatedReceipt] = useState<{ id: string; receiptCode: string } | null>(null);

  const [search, setSearch] = useState("");
  const [lossTypeFilter, setLossTypeFilter] = useState<"ALL" | LossTypeValue>("ALL");
  const [daysFilter, setDaysFilter] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await getLossesAndExpirationsData();
      if (res.success) {
        setProducts(res.products || []);
        setSuppliers(res.suppliers || []);
        setUsers(res.users || []);
        const defaultUid = res.currentUserId || res.users?.[0]?.id || "";
        setCurrentUserId(defaultUid);
        setLossResponsibleUserId((prev) => prev || defaultUid);
        setExpirations(res.expirations || []);
        setLosses(res.losses || []);
      }
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(null), 5000);
  }

  function openNewLossModal() {
    setProductSearch("");
    setSelectedProductId("");
    setLossQuantity("1");
    setLossType("DISCARD");
    setLossReason("Avaria / Embalagem Danificada");
    setLossSupplierId("");
    setLossResponsibleUserId(currentUserId || users?.[0]?.id || "");
    setLossNfe("");
    setLossNotes("");
    setLossPhotoData(null);
    setIsLossModalOpen(true);
  }

  async function handlePhotoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setCompressingPhoto(true);
    try {
      const compressed = await compressImageToJpeg(file, 900, 0.72);
      setLossPhotoData(compressed);
    } catch (err: any) {
      alert(err?.message || "Erro ao processar a foto.");
    } finally {
      setCompressingPhoto(false);
    }
  }

  async function handleAddLoss(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProductId) {
      alert("Selecione o produto da avaria.");
      return;
    }
    if (lossType === "SUPPLIER_EXCHANGE" && !lossSupplierId) {
      alert("Selecione o fornecedor para Troca com Fornecedor.");
      return;
    }

    setSubmitting(true);
    const res = await registerLossRecord({
      productId: selectedProductId,
      quantity: Number(lossQuantity),
      lossType,
      reason: lossReason,
      supplierId: lossSupplierId || undefined,
      photoData: lossPhotoData || undefined,
      nfe: lossNfe || undefined,
      notes: lossNotes || undefined,
      responsibleUserId: lossResponsibleUserId || undefined,
    });
    setSubmitting(false);

    if (res.success && res.loss) {
      setIsLossModalOpen(false);
      setActiveTab("LOSSES");
      await loadData();
      setCreatedReceipt({
        id: res.loss.id,
        receiptCode: res.loss.receiptCode || "",
      });
      showToast(
        `Avaria ${res.loss.receiptCode || ""} registrada e estoque baixado automaticamente!`
      );
    } else {
      alert(res.error || "Erro ao registrar perda/avaria.");
    }
  }

  async function handleAddBatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    const productId = f.get("productId") as string;
    const batchNumber = f.get("batchNumber") as string;
    const expirationDate = f.get("expirationDate") as string;
    const quantity = Number(f.get("quantity"));

    const res = await registerProductBatch({
      productId,
      batchNumber,
      expirationDate,
      quantity,
    });
    setSubmitting(false);

    if (res.success) {
      setIsBatchModalOpen(false);
      await loadData();
      showToast("Novo lote e validade salvos no banco de dados!");
    } else {
      alert(res.error || "Erro ao cadastrar lote.");
    }
  }

  async function handleApplyPromo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPromoItem) return;
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    const newPrice = Number(f.get("newPrice"));

    const res = await applyBatchMarkdownPrice({
      productId: selectedPromoItem.productId,
      newPrice,
    });
    setSubmitting(false);

    if (res.success) {
      setIsPromoModalOpen(false);
      setSelectedPromoItem(null);
      await loadData();
      showToast(
        `Preço de "${selectedPromoItem.product}" atualizado para R$ ${newPrice.toFixed(2)} no PDV e enviado para a fila de Etiquetas!`
      );
    } else {
      alert(res.error || "Erro ao aplicar rebaixa de preço.");
    }
  }

  const filteredModalProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode && String(p.barcode).toLowerCase().includes(q))
    );
  });

  const selectedProductObj = products.find((p) => p.id === selectedProductId) || null;

  const filteredLosses = losses.filter((i) => {
    const matchesType = lossTypeFilter === "ALL" || i.lossType === lossTypeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      i.product.toLowerCase().includes(q) ||
      (i.reason && i.reason.toLowerCase().includes(q)) ||
      (i.receiptCode && i.receiptCode.toLowerCase().includes(q)) ||
      (i.supplierName && i.supplierName.toLowerCase().includes(q)) ||
      (i.userName && i.userName.toLowerCase().includes(q));
    return matchesType && matchesSearch;
  });

  const filteredExpirations = expirations.filter((i) => {
    const matchesSearch =
      i.product.toLowerCase().includes(search.toLowerCase()) ||
      i.batch.toLowerCase().includes(search.toLowerCase());
    if (!daysFilter) return matchesSearch;
    if (daysFilter === 5) return matchesSearch && i.daysLeft <= 5;
    if (daysFilter === 10) return matchesSearch && i.daysLeft > 5 && i.daysLeft <= 10;
    if (daysFilter === 15) return matchesSearch && i.daysLeft > 10 && i.daysLeft <= 15;
    return matchesSearch && i.daysLeft > 15;
  });

  return (
    <div className="h-full flex flex-col gap-5 pb-12">
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <AlertTriangle className="text-amber-600" size={28} />
            Perdas & Validades (Integrado ao Estoque Real)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitoramento de lotes perecíveis (doces, carnes, laticínios) e baixa automática de perdas no banco de dados.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 text-xs"
          >
            <Calendar size={15} /> + Novo Lote / Validade
          </button>
          <button
            onClick={openNewLossModal}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-red-600/20 text-xs cursor-pointer"
          >
            <Plus size={15} /> Lançar Avaria / Perda
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          {bannerMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#c4d5ee] pb-px shrink-0">
        <button
          onClick={() => setActiveTab("EXPIRATIONS")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "EXPIRATIONS"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Calendar size={16} /> Validades e Lotes ({expirations.length})
        </button>
        <button
          onClick={() => setActiveTab("LOSSES")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "LOSSES"
              ? "border-red-500 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <AlertTriangle size={16} /> Histórico de Perdas ({losses.length})
        </button>
      </div>

      {/* EXPIRATIONS TAB */}
      {activeTab === "EXPIRATIONS" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            {[
              { days: 5, label: "Crítico (Até 5 dias)", color: "text-red-600", count: expirations.filter((i) => i.daysLeft <= 5).length },
              { days: 10, label: "6 a 10 Dias", color: "text-amber-600", count: expirations.filter((i) => i.daysLeft > 5 && i.daysLeft <= 10).length },
              { days: 15, label: "11 a 15 Dias", color: "text-yellow-600", count: expirations.filter((i) => i.daysLeft > 10 && i.daysLeft <= 15).length },
              { days: 30, label: "Acima de 15 Dias", color: "text-emerald-600", count: expirations.filter((i) => i.daysLeft > 15).length },
            ].map((card) => (
              <button
                key={card.days}
                onClick={() => setDaysFilter(daysFilter === card.days ? null : card.days)}
                className={`bg-[#fbfdff] border rounded-2xl p-4 flex flex-col items-center justify-center gap-1 transition-all ${
                  daysFilter === card.days
                    ? "border-blue-600 ring-2 ring-blue-500/20"
                    : "border-[#c4d5ee] hover:border-blue-300"
                }`}
              >
                <div className={`text-3xl font-black ${card.color}`}>{card.count}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</div>
              </button>
            ))}
          </div>

          <div className="bg-[#fbfdff] rounded-2xl border border-[#c4d5ee] overflow-hidden flex-1 flex flex-col min-h-0 shadow-sm">
            <div className="p-4 border-b border-[#c4d5ee] shrink-0 flex gap-4 items-center justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder="Buscar produto ou código do lote..."
                  className="w-full pl-9 pr-4 py-2 bg-[#f3f7fe] border border-[#c4d5ee] focus:border-blue-500 text-gray-900 rounded-lg outline-none text-sm font-medium"
                />
              </div>
              {daysFilter && (
                <button
                  onClick={() => setDaysFilter(null)}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Limpar filtro de prazo
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#f3f7fe] border-b border-[#c4d5ee] text-slate-600 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Produto</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Lote / Origem</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Qtd. Lote</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Validade</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">Prazo</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px] text-right">Ação Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dce7f7]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-semibold">
                        Carregando lotes e validades do banco...
                      </td>
                    </tr>
                  ) : filteredExpirations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        Nenhum lote encontrado para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredExpirations.map((i) => (
                      <tr key={i.id} className="hover:bg-blue-50/40">
                        <td className="px-6 py-3.5 font-bold text-gray-900">{i.product}</td>
                        <td className="px-6 py-3.5 text-slate-600 font-mono text-xs">
                          {i.batch}{" "}
                          {i.source === "PRODUCAO" && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                              Produção Própria
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-slate-700 font-bold">
                          {i.qty} {i.unit}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 font-mono text-xs font-bold">
                          {i.dateFormatted}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black ${
                              i.daysLeft <= 5
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : i.daysLeft <= 15
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {i.daysLeft <= 0 ? "Vencido" : `${i.daysLeft} dias`}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {i.productId && (
                            <button
                              onClick={() => {
                                setSelectedPromoItem(i);
                                setIsPromoModalOpen(true);
                              }}
                              className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5"
                            >
                              <Tag size={12} /> Precificar Rebaixa <ArrowRight size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* LOSSES TAB */}
      {activeTab === "LOSSES" && (
        <div className="bg-[#fbfdff] rounded-2xl border border-[#c4d5ee] overflow-hidden flex-1 flex flex-col min-h-0 shadow-sm">
          <div className="p-4 border-b border-[#c4d5ee] shrink-0 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
              <div className="relative max-w-sm flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder="Buscar por produto, recibo, fornecedor ou motivo..."
                  className="w-full pl-9 pr-4 py-2 bg-[#f3f7fe] border border-[#c4d5ee] focus:border-blue-500 text-gray-900 rounded-lg outline-none text-sm font-medium"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: "ALL" as const, label: "Todos" },
                  { key: "DISCARD" as const, label: "Descarte" },
                  { key: "SUPPLIER_EXCHANGE" as const, label: "Troca Fornecedor" },
                  { key: "EXPIRED" as const, label: "Vencido" },
                  { key: "OTHER" as const, label: "Outros" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setLossTypeFilter(opt.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      lossTypeFilter === opt.key
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-[#c4d5ee] text-slate-600 hover:bg-[#f3f7fe]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs font-bold text-slate-600">
              Total de registros: <span className="text-red-600 font-black">{filteredLosses.length}</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            {filteredLosses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertTriangle size={42} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium text-sm">Nenhum registro de perda ou avaria encontrado.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-[#f3f7fe] border-b border-[#c4d5ee] text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Foto</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Recibo / Data</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Produto</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Qtd. / Custo</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Tipo / Motivo</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Responsável</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px] text-right">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dce7f7]">
                  {filteredLosses.map((i) => {
                    const typeInfo = LOSS_TYPE_LABELS[i.lossType as LossTypeValue] || LOSS_TYPE_LABELS.DISCARD;
                    return (
                      <tr key={i.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-4 py-3">
                          {i.photoData ? (
                            <button
                              type="button"
                              onClick={() => setLightboxLoss(i)}
                              className="w-12 h-12 rounded-xl overflow-hidden border border-[#c4d5ee] hover:border-blue-500 transition-all shadow-xs cursor-pointer block"
                              title="Clique para ampliar foto da avaria"
                            >
                              <img
                                src={i.photoData}
                                alt={`Avaria ${i.product}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400" title="Sem foto anexada">
                              <ImageIcon size={16} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {i.receiptCode && (
                            <span className="inline-block font-mono text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md mb-1">
                              {i.receiptCode}
                            </span>
                          )}
                          <div className="text-slate-500 font-mono text-xs">{i.dateFormatted}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{i.product}</div>
                          {i.barcode && (
                            <div className="text-[11px] font-mono text-slate-500">EAN: {i.barcode}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-red-600 font-black">
                            -{i.qty} {i.unit}
                          </div>
                          {Number(i.totalLossValue) > 0 && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              R$ {Number(i.totalLossValue).toFixed(2).replace(".", ",")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className={`text-[10px] px-2 py-0.5 border font-extrabold rounded-full uppercase ${typeInfo.badgeClass}`}>
                              {typeInfo.label}
                            </span>
                            {i.supplierName && (
                              <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full font-bold inline-flex items-center gap-1">
                                <Truck size={10} /> {i.supplierName}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-700 text-xs font-medium">{i.reason}</div>
                          {i.notes && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                              Obs: {i.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-xs font-semibold">{i.userName}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/losses/recibo/${i.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <Printer size={13} />
                            <span>Imprimir Recibo</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal: Registrar Avaria / Perda (com foto pela câmera e baixa real no estoque) */}
      {isLossModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-[#c4d5ee] flex justify-between items-center shrink-0 bg-red-50/40">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={18} /> Lançar Avaria / Perda (Com Foto e Recibo)
              </h3>
              <button
                type="button"
                onClick={() => setIsLossModalOpen(false)}
                className="text-slate-500 hover:bg-[#eaf1fc] p-1.5 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddLoss} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Produto (Busca + Select) */}
              <div className="space-y-2 bg-[#f3f7fe] border border-[#c4d5ee] rounded-2xl p-3.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={13} className="text-blue-600" /> Produto do Estoque *
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProductSearch(val);
                      const exactBarcode = products.find(
                        (p) => p.barcode && String(p.barcode).trim() === val.trim()
                      );
                      if (exactBarcode) {
                        setSelectedProductId(exactBarcode.id);
                      }
                    }}
                    placeholder="Filtrar por nome ou código de barras..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#c4d5ee] text-gray-900 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                  />
                </div>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full bg-white border border-[#c4d5ee] text-gray-900 px-3.5 py-2.5 rounded-xl outline-none focus:border-red-500 text-sm font-semibold"
                >
                  <option value="">
                    {filteredModalProducts.length === 0
                      ? "Nenhum produto encontrado para essa busca..."
                      : `Selecione um produto (${filteredModalProducts.length} disponíveis)...`}
                  </option>
                  {filteredModalProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.barcode ? `[${p.barcode}]` : ""} — Estoque: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
                {selectedProductObj && (
                  <div className="flex items-center justify-between text-[11px] text-slate-600 px-1 pt-0.5">
                    <span>
                      Estoque atual: <strong className="text-gray-900">{selectedProductObj.stock} {selectedProductObj.unit}</strong>
                    </span>
                    <span>
                      Custo unitário cadastrado: <strong className="text-gray-900 font-mono">R$ {Number(selectedProductObj.cost || 0).toFixed(2).replace(".", ",")}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Tipo da Avaria (Descarte vs Troca Fornecedor) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Destino / Tipo da Avaria *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "DISCARD" as const, label: "Descarte", desc: "Lixo / Inutilização" },
                    { key: "SUPPLIER_EXCHANGE" as const, label: "Troca Fornecedor", desc: "Devolver p/ troca" },
                    { key: "EXPIRED" as const, label: "Vencimento", desc: "Prazo vencido" },
                    { key: "OTHER" as const, label: "Outros", desc: "Quebra / Diversos" },
                  ].map((opt) => {
                    const isSelected = lossType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setLossType(opt.key);
                          if (opt.key === "SUPPLIER_EXCHANGE") {
                            setLossReason("Troca com Fornecedor (Mercadoria Avariada)");
                          } else if (opt.key === "EXPIRED") {
                            setLossReason("Vencimento de Validade");
                          } else if (opt.key === "DISCARD") {
                            setLossReason("Avaria / Embalagem Danificada (Descarte)");
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? opt.key === "SUPPLIER_EXCHANGE"
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                              : "bg-red-600 border-red-600 text-white shadow-sm"
                            : "bg-[#f3f7fe] border-[#c4d5ee] text-gray-800 hover:border-blue-300"
                        }`}
                      >
                        <div className="text-xs font-extrabold">{opt.label}</div>
                        <div className={`text-[10px] ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fornecedor (obrigatório quando Troca com Fornecedor) */}
              {(lossType === "SUPPLIER_EXCHANGE" || suppliers.length > 0) && (
                <div
                  className={`p-3.5 rounded-2xl border ${
                    lossType === "SUPPLIER_EXCHANGE"
                      ? "bg-blue-50/70 border-blue-300"
                      : "bg-[#f3f7fe] border-[#c4d5ee]"
                  }`}
                >
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck size={13} className="text-blue-600" />
                    <span>
                      Fornecedor {lossType === "SUPPLIER_EXCHANGE" ? "* (Obrigatório para Troca)" : "(Opcional)"}
                    </span>
                  </label>
                  <select
                    value={lossSupplierId}
                    onChange={(e) => setLossSupplierId(e.target.value)}
                    required={lossType === "SUPPLIER_EXCHANGE"}
                    className="w-full bg-white border border-[#c4d5ee] text-gray-900 px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500 text-sm font-semibold"
                  >
                    <option value="">
                      {lossType === "SUPPLIER_EXCHANGE"
                        ? "Selecione o fornecedor para troca..."
                        : "Nenhum fornecedor vinculado (opcional)"}
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.tradeName ? `${s.tradeName} (${s.name})` : s.name}
                        {s.document ? ` — ${s.document}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash size={12} /> Quantidade *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={lossQuantity}
                    onChange={(e) => setLossQuantity(e.target.value)}
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-red-500 font-mono text-base font-bold"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon size={12} /> Usuário Responsável *
                  </label>
                  <select
                    value={lossResponsibleUserId}
                    onChange={(e) => setLossResponsibleUserId(e.target.value)}
                    required
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-3 py-2.5 rounded-xl outline-none focus:border-red-500 text-sm font-semibold"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={12} /> Motivo Detalhado *
                  </label>
                  <input
                    type="text"
                    required
                    value={lossReason}
                    onChange={(e) => setLossReason(e.target.value)}
                    placeholder="Ex: Embalagem rasgada no recebimento / Produto impróprio"
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-red-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Nota Fiscal / Lote (Opcional)
                  </label>
                  <input
                    value={lossNfe}
                    onChange={(e) => setLossNfe(e.target.value)}
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-red-500 text-sm"
                    placeholder="Ex: Lote L-204 ou NF 8841"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Observações Adicionais
                  </label>
                  <input
                    value={lossNotes}
                    onChange={(e) => setLossNotes(e.target.value)}
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-red-500 text-sm"
                    placeholder="Ex: Acordo com vendedor Carlos p/ troca na terça"
                  />
                </div>
              </div>

              {/* Foto da Avaria (Câmera do Celular ou Galeria) */}
              <div className="p-3.5 rounded-2xl border border-[#c4d5ee] bg-[#f3f7fe] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Foto da Avaria (Opcional / Recomendado)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      A foto é comprimida automaticamente e anexada ao recibo oficial.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs">
                      <Camera size={14} />
                      <span>Câmera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoInputChange}
                        className="hidden"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold cursor-pointer transition-all">
                      <ImageIcon size={14} />
                      <span>Galeria</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoInputChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {compressingPhoto && (
                  <p className="text-xs font-bold text-blue-600">Comprimindo imagem...</p>
                )}

                {lossPhotoData && (
                  <div className="relative rounded-xl overflow-hidden border border-[#c4d5ee] bg-white p-2 flex items-center gap-3">
                    <img
                      src={lossPhotoData}
                      alt="Pré-visualização da avaria"
                      className="w-24 h-24 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-700">Foto anexada com sucesso!</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tamanho comprimido: ~{Math.round((lossPhotoData.length * 3) / 4 / 1024)} KB (JPEG)
                      </p>
                      <button
                        type="button"
                        onClick={() => setLossPhotoData(null)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline cursor-pointer"
                      >
                        <Trash2 size={12} /> Remover foto
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#c4d5ee]">
                <button
                  type="button"
                  onClick={() => setIsLossModalOpen(false)}
                  className="flex-1 bg-[#eaf1fc] hover:bg-[#dce7f7] text-gray-800 font-bold py-3 rounded-xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || compressingPhoto}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl shadow-md shadow-red-600/20 text-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Salvando..." : "CONFIRMAR BAIXA & GERAR RECIBO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmação Imediata para Abrir Recibo após Salvar Avaria */}
      {createdReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-200 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={30} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Avaria Registrada com Sucesso!</h3>
              {createdReceipt.receiptCode && (
                <p className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 inline-block px-3 py-1 rounded-full mt-2">
                  Recibo nº {createdReceipt.receiptCode}
                </p>
              )}
              <p className="text-xs text-slate-600 mt-2">
                O estoque foi baixado e o comprovante oficial com foto, data/hora e assinaturas já está pronto.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCreatedReceipt(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
              <Link
                href={`/losses/recibo/${createdReceipt.id}`}
                target="_blank"
                onClick={() => setCreatedReceipt(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer size={14} />
                <span>Abrir Recibo da Avaria</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lightbox da Foto da Avaria */}
      {lightboxLoss && lightboxLoss.photoData && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxLoss(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{lightboxLoss.product}</h4>
                <p className="text-xs text-slate-500 font-mono">
                  {lightboxLoss.receiptCode || "Sem código"} • {lightboxLoss.dateFormatted}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/losses/recibo/${lightboxLoss.id}`}
                  target="_blank"
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Printer size={13} /> Abrir Recibo
                </Link>
                <button
                  type="button"
                  onClick={() => setLightboxLoss(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-100 flex justify-center">
              <img
                src={lightboxLoss.photoData}
                alt={`Foto da avaria de ${lightboxLoss.product}`}
                className="max-h-[70vh] w-auto rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Novo Lote / Validade */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#c4d5ee] flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="text-blue-600" size={18} /> Cadastrar Lote e Data de Validade
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-500 hover:bg-[#eaf1fc] p-1.5 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddBatch} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Produto
                  </label>
                  <select
                    name="productId"
                    required
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-3 rounded-xl outline-none focus:border-blue-500 text-sm font-semibold"
                  >
                    <option value="">Selecione um produto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Código do Lote
                  </label>
                  <input
                    name="batchNumber"
                    required
                    defaultValue={`L-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`}
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-blue-500 font-mono text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Quantidade no Lote
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    defaultValue="10"
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-blue-500 font-mono text-sm font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Data de Vencimento
                  </label>
                  <input
                    name="expirationDate"
                    type="date"
                    required
                    defaultValue={new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]}
                    className="w-full bg-[#f3f7fe] border border-[#c4d5ee] text-gray-900 px-4 py-2.5 rounded-xl outline-none focus:border-blue-500 text-sm font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-[#c4d5ee]">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="flex-1 bg-[#eaf1fc] hover:bg-[#dce7f7] text-gray-800 font-bold py-3 rounded-xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-md shadow-blue-500/20 text-sm transition-all disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : "SALVAR LOTE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Precificar Rebaixa */}
      {isPromoModalOpen && selectedPromoItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-[#c4d5ee] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#c4d5ee] flex justify-between items-center bg-blue-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Tag className="text-blue-600" size={18} /> Precificar Rebaixa de Validade
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Atualiza o preço no PDV e envia para impressão de etiqueta
                </p>
              </div>
              <button
                onClick={() => setIsPromoModalOpen(false)}
                className="text-slate-500 hover:text-gray-900 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleApplyPromo} className="p-5 space-y-4">
              <div className="bg-[#f3f7fe] border border-[#c4d5ee] rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-900 text-base">{selectedPromoItem.product}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Lote: {selectedPromoItem.batch} • Vence em {selectedPromoItem.daysLeft} dias
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Preço Atual</span>
                    <span className="block text-sm font-black text-slate-700">
                      R$ {Number(selectedPromoItem.currentPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-blue-700 mb-1.5 uppercase tracking-wider">
                  Novo Preço Promocional (R$)
                </label>
                <input
                  name="newPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  defaultValue={Math.max(0.5, Number(selectedPromoItem.currentPrice || 1) * 0.75).toFixed(2)}
                  className="w-full bg-[#f3f7fe] border-2 border-blue-300 text-gray-900 font-black text-2xl px-4 py-3 rounded-xl outline-none focus:border-blue-600"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="flex-1 bg-[#eaf1fc] text-gray-800 font-bold py-3 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-sm shadow-md shadow-blue-500/20"
                >
                  {submitting ? "Aplicando..." : "APLICAR PREÇO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
