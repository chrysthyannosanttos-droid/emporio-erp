"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays,
  AlertTriangle,
  ShieldAlert,
  Package,
  CheckCircle2,
  Search,
  Download,
  Plus,
  X,
  Tag,
  Trash2,
  Receipt,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  getExpirationsWorkspace,
  registerExpirationBatch,
  applyExpirationDiscount,
  disposeExpiredBatch,
  type ExpirationBucket,
} from "@/actions/expirations";

function fmtBRL(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ExpirationsPage() {
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<ExpirationBucket | "ALL">("ALL");
  const [includeZeroStock, setIncludeZeroStock] = useState(false);

  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [recentDisposals, setRecentDisposals] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    expiredCount: 0,
    criticalCount: 0,
    attentionCount: 0,
    preventiveCount: 0,
    safeCount: 0,
    totalActiveCount: 0,
    totalCostAtRisk: 0,
    totalSaleAtRisk: 0,
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ text: string; lossId?: string; receiptCode?: string | null } | null>(null);

  // Modal: Lançar Validade / Lote
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchProductId, setBatchProductId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [batchExpirationDate, setBatchExpirationDate] = useState("");
  const [batchQuantity, setBatchQuantity] = useState("10");

  // Modal: Aplicar Queima / Desconto
  const [discountItem, setDiscountItem] = useState<any | null>(null);
  const [newPromoPrice, setNewPromoPrice] = useState("");

  // Modal: Baixar Vencido como Avaria
  const [disposeItem, setDisposeItem] = useState<any | null>(null);
  const [disposeQty, setDisposeQty] = useState("");
  const [disposeNotes, setDisposeNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWorkspace(includeZeroStock);
  }, [includeZeroStock]);

  async function loadWorkspace(showZero = includeZeroStock) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getExpirationsWorkspace({ includeZeroStock: showZero });
      if (res.success) {
        setBatches(res.batches || []);
        setProducts(res.products || []);
        setRecentDisposals(res.recentDisposals || []);
        if (res.summary) setSummary(res.summary);
      } else {
        setErrorMsg(res.error || "Não foi possível carregar os lotes.");
      }
    } finally {
      setLoading(false);
    }
  }

  function openNewBatchModal(preselectedProductId = "") {
    setBatchProductId(preselectedProductId);
    setBatchNumber(`L-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`);
    setBatchExpirationDate(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
    setBatchQuantity("10");
    setIsBatchModalOpen(true);
  }

  function openDiscountModal(item: any) {
    setDiscountItem(item);
    const suggested = Math.max(0.1, Number(item.productPrice || 1) * 0.7).toFixed(2);
    setNewPromoPrice(suggested);
  }

  function openDisposeModal(item: any) {
    setDisposeItem(item);
    setDisposeQty(String(item.currentStock > 0 ? item.currentStock : 1));
    setDisposeNotes(
      item.daysLeft < 0
        ? `Produto vencido em ${item.dateFormatted} (Lote ${item.batchNumber})`
        : `Baixa antecipada por validade próxima (${item.dateFormatted})`
    );
  }

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await registerExpirationBatch({
      productId: batchProductId,
      batchNumber,
      expirationDate: batchExpirationDate,
      quantity: Number(batchQuantity),
    });
    setSubmitting(false);

    if (res.success) {
      setIsBatchModalOpen(false);
      setBanner({ text: "Lote e validade cadastrados com sucesso no banco de dados!" });
      await loadWorkspace();
    } else {
      alert(res.error || "Erro ao cadastrar lote.");
    }
  }

  async function handleApplyDiscount(e: React.FormEvent) {
    e.preventDefault();
    if (!discountItem) return;
    setSubmitting(true);
    const res = await applyExpirationDiscount({
      productId: discountItem.productId,
      newPrice: Number(newPromoPrice),
    });
    setSubmitting(false);

    if (res.success) {
      const prodName = discountItem.productName;
      const priceApplied = Number(newPromoPrice);
      setDiscountItem(null);
      setBanner({
        text: `Preço promocional aplicado! "${prodName}" atualizado para R$ ${fmtBRL(priceApplied)} no PDV e enviado para Etiquetas.`,
      });
      await loadWorkspace();
    } else {
      alert(res.error || "Erro ao aplicar desconto.");
    }
  }

  async function handleDisposeExpired(e: React.FormEvent) {
    e.preventDefault();
    if (!disposeItem) return;
    setSubmitting(true);
    const res = await disposeExpiredBatch({
      batchId: disposeItem.batchId,
      productId: disposeItem.productId,
      quantity: Number(disposeQty),
      notes: disposeNotes,
    });
    setSubmitting(false);

    if (res.success) {
      const prodName = disposeItem.productName;
      setDisposeItem(null);
      setBanner({
        text: `Baixa por vencimento registrada para "${prodName}" (${disposeQty} ${disposeItem.unit})! Recibo: ${res.receiptCode}`,
        lossId: res.lossId,
        receiptCode: res.receiptCode,
      });
      await loadWorkspace();
    } else {
      alert(res.error || "Erro ao baixar lote vencido.");
    }
  }

  const filteredBatches = batches.filter((b) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      b.productName.toLowerCase().includes(q) ||
      b.batchNumber.toLowerCase().includes(q) ||
      (b.barcode && b.barcode.toLowerCase().includes(q)) ||
      (b.internalCode && b.internalCode.toLowerCase().includes(q));

    const matchesBucket = bucketFilter === "ALL" || b.bucket === bucketFilter;
    return matchesSearch && matchesBucket;
  });

  function handleExportCsv() {
    const header =
      "Produto;Lote;Origem;Quantidade;Unidade;Validade;Dias_Restantes;Custo_Risco;Preco_Venda\n";
    const rows = filteredBatches
      .map(
        (b) =>
          `"${b.productName}";"${b.batchNumber}";"${b.source}";${b.currentStock};"${b.unit}";"${b.dateFormatted}";${b.daysLeft};${b.costAtRisk.toFixed(2)};${b.productPrice.toFixed(2)}`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acompanhamento_validades_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full flex flex-col gap-5 select-none pb-16">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Acompanhamento de Vencimentos & Lotes
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Controle por faixas de validade, queima promocional no PDV e baixa real de vencidos como avaria com recibo.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadWorkspace()}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs shadow-2xs"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
          <button
            type="button"
            onClick={() => openNewBatchModal("")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20 text-xs"
          >
            <Plus size={16} /> Lançar Validade / Lote
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 text-xs"
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Error / Success Banners */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {banner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{banner.text}</span>
          </div>
          <div className="flex items-center gap-2">
            {banner.lossId && (
              <Link
                href={`/losses/recibo/${banner.lossId}`}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center gap-1.5 shadow-sm"
              >
                <Receipt size={14} /> Abrir Recibo {banner.receiptCode || ""}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-emerald-700 hover:text-emerald-950 p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 5 Cards de Acompanhamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 shrink-0">
        <BucketCard
          title="Já Vencidos"
          subtitle="Ação imediata (baixa)"
          value={`${summary.expiredCount} lotes`}
          active={bucketFilter === "EXPIRED"}
          onClick={() => setBucketFilter(bucketFilter === "EXPIRED" ? "ALL" : "EXPIRED")}
          tone="expired"
          icon={<ShieldAlert size={20} />}
        />
        <BucketCard
          title="Crítico 0-5d"
          subtitle="Queima urgente / desconto"
          value={`${summary.criticalCount} lotes`}
          active={bucketFilter === "CRITICAL_0_5"}
          onClick={() => setBucketFilter(bucketFilter === "CRITICAL_0_5" ? "ALL" : "CRITICAL_0_5")}
          tone="critical"
          icon={<AlertTriangle size={20} />}
        />
        <BucketCard
          title="Atenção 6-15d"
          subtitle="Programar promoção"
          value={`${summary.attentionCount} lotes`}
          active={bucketFilter === "ATTENTION_6_15"}
          onClick={() => setBucketFilter(bucketFilter === "ATTENTION_6_15" ? "ALL" : "ATTENTION_6_15")}
          tone="attention"
          icon={<Clock size={20} />}
        />
        <BucketCard
          title="Preventivo 16-30d"
          subtitle="Monitoramento ativo"
          value={`${summary.preventiveCount} lotes`}
          active={bucketFilter === "PREVENTIVE_16_30"}
          onClick={() =>
            setBucketFilter(bucketFilter === "PREVENTIVE_16_30" ? "ALL" : "PREVENTIVE_16_30")
          }
          tone="preventive"
          icon={<CalendarDays size={20} />}
        />
        <BucketCard
          title=">30 dias"
          subtitle={`Custo em risco <=30d: R$ ${fmtBRL(summary.totalCostAtRisk)}`}
          value={`${summary.safeCount} lotes`}
          active={bucketFilter === "SAFE_30_PLUS"}
          onClick={() => setBucketFilter(bucketFilter === "SAFE_30_PLUS" ? "ALL" : "SAFE_30_PLUS")}
          tone="safe"
          icon={<CheckCircle2 size={20} />}
        />
      </div>

      {/* Tabela Principal */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <select
              value={bucketFilter}
              onChange={(e) => setBucketFilter(e.target.value as ExpirationBucket | "ALL")}
              className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white font-bold"
            >
              <option value="ALL">Todas as Faixas ({batches.length})</option>
              <option value="EXPIRED">Já Vencidos ({summary.expiredCount})</option>
              <option value="CRITICAL_0_5">Crítico 0-5d ({summary.criticalCount})</option>
              <option value="ATTENTION_6_15">Atenção 6-15d ({summary.attentionCount})</option>
              <option value="PREVENTIVE_16_30">Preventivo 16-30d ({summary.preventiveCount})</option>
              <option value="SAFE_30_PLUS">&gt;30 dias ({summary.safeCount})</option>
            </select>

            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar produto, código ou lote..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 rounded-xl outline-none text-xs font-medium"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeZeroStock}
                onChange={(e) => setIncludeZeroStock(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Incluir lotes zerados</span>
            </label>
          </div>

          <div className="text-xs font-bold text-gray-500">
            Exibindo <strong className="text-gray-900">{filteredBatches.length}</strong> lote(s)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Lote / Origem</th>
                <th className="px-4 py-3 text-right">Saldo Lote</th>
                <th className="px-4 py-3 text-right">Preço / Custo</th>
                <th className="px-4 py-3 text-center">Validade</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações Diretas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-bold">
                    Carregando lotes do banco de dados...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    Nenhum lote encontrado para os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 text-gray-500 flex items-center justify-center shrink-0">
                          <Package size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{b.productName}</div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {b.internalCode ? `PLU ${b.internalCode}` : b.barcode || b.categoryName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-gray-800">{b.batchNumber}</div>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          b.source === "PRODUCAO"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {b.source === "PRODUCAO"
                          ? `Produção${b.producerName ? ` • ${b.producerName}` : ""}`
                          : "Estoque"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono">
                      <div className="font-black text-gray-900">
                        {b.currentStock} {b.unit}
                      </div>
                      {b.costAtRisk > 0 && (
                        <div className="text-[10px] text-gray-500">
                          Risco: R$ {fmtBRL(b.costAtRisk)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono">
                      <div className="font-bold text-emerald-700">R$ {fmtBRL(b.productPrice)}</div>
                      <div className="text-[10px] text-gray-500">Custo: R$ {fmtBRL(b.productCost)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-bold text-gray-700">
                      {b.dateFormatted}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <ExpirationBadge daysLeft={b.daysLeft} bucket={b.bucket} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => openNewBatchModal(b.productId)}
                          title="Lançar nova validade/lote para este produto"
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Plus size={12} /> Lançar Lote
                        </button>
                        <button
                          type="button"
                          onClick={() => openDiscountModal(b)}
                          title="Aplicar preço promocional / queima de estoque"
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Tag size={12} /> Queima/Desconto
                        </button>
                        <button
                          type="button"
                          onClick={() => openDisposeModal(b)}
                          disabled={b.currentStock <= 0}
                          title="Dar baixa por vencimento criando registro de avaria"
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-40 text-red-700 border border-red-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={12} /> Baixar Avaria
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recentes Baixas por Vencimento com link direto ao Recibo */}
      {recentDisposals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-gray-900">
                Baixas por Vencimento Recentes (Recibos de Avaria)
              </h2>
              <p className="text-[11px] text-gray-500">
                Acesse ou reimprima qualquer recibo de avaria gerado por vencimento.
              </p>
            </div>
            <Link
              href="/losses"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Ver todas as avarias →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/60 border-b border-gray-100 text-gray-500 uppercase text-[10px] font-black">
                <tr>
                  <th className="px-4 py-2.5">Recibo</th>
                  <th className="px-4 py-2.5">Data/Hora</th>
                  <th className="px-4 py-2.5">Produto</th>
                  <th className="px-4 py-2.5 text-right">Qtd. Baixada</th>
                  <th className="px-4 py-2.5 text-right">Prejuízo Custo</th>
                  <th className="px-4 py-2.5">Responsável</th>
                  <th className="px-4 py-2.5 text-right">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentDisposals.map((d) => (
                  <tr key={d.id} className="hover:bg-red-50/20">
                    <td className="px-4 py-2.5 font-mono font-black text-red-700">
                      {d.receiptCode}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-500">{d.dateFormatted}</td>
                    <td className="px-4 py-2.5 font-bold text-gray-900">
                      {d.productName}
                      {d.notes && (
                        <span className="block text-[10px] font-normal text-gray-500">
                          {d.notes}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600">
                      -{d.quantity} {d.unit}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-800">
                      R$ {fmtBRL(d.totalLoss)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{d.userName}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/losses/recibo/${d.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200 font-bold text-[11px]"
                      >
                        <Receipt size={12} /> Abrir Recibo
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Lançar Validade / Lote */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base font-black text-gray-900">Lançar Nova Validade / Lote</h3>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateBatch} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                  Produto *
                </label>
                <select
                  value={batchProductId}
                  onChange={(e) => setBatchProductId(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                >
                  <option value="">Selecione um produto cadastrado...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit}) — Estoque: {p.stock}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                    Código do Lote
                  </label>
                  <input
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                    Quantidade no Lote *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={batchQuantity}
                    onChange={(e) => setBatchQuantity(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                  Data de Validade *
                </label>
                <input
                  type="date"
                  required
                  value={batchExpirationDate}
                  onChange={(e) => setBatchExpirationDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs"
                >
                  {submitting ? "Salvando..." : "Salvar Lote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Aplicar Queima / Desconto */}
      {discountItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-amber-50/70">
              <div>
                <h3 className="text-base font-black text-amber-950 flex items-center gap-2">
                  <Tag size={17} className="text-amber-600" /> Aplicar Queima / Desconto
                </h3>
                <p className="text-[11px] text-amber-800">
                  Atualiza o preço de venda no PDV e envia para impressão de etiqueta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDiscountItem(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleApplyDiscount} className="p-5 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex justify-between items-start gap-3">
                <div>
                  <div className="font-black text-gray-900 text-sm">{discountItem.productName}</div>
                  <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                    Lote: {discountItem.batchNumber} • Validade: {discountItem.dateFormatted}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Preço Atual
                  </span>
                  <span className="text-sm font-black font-mono text-gray-900">
                    R$ {fmtBRL(discountItem.productPrice)}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                  Atalhos de Desconto
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 50].map((pct) => {
                    const discounted = Math.max(
                      0.1,
                      Number(discountItem.productPrice || 1) * (1 - pct / 100)
                    ).toFixed(2);
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setNewPromoPrice(discounted)}
                        className="py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-black text-xs transition-colors"
                      >
                        -{pct}% (R$ {discounted.replace(".", ",")})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1 uppercase">
                  Novo Preço Promocional (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={newPromoPrice}
                  onChange={(e) => setNewPromoPrice(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-amber-300 focus:border-amber-500 text-gray-900 font-mono font-black text-2xl px-4 py-3 rounded-xl outline-none"
                />
                {discountItem.productCost > 0 && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Custo unitário cadastrado: <strong>R$ {fmtBRL(discountItem.productCost)}</strong>
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDiscountItem(null)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-2.5 rounded-xl text-xs shadow-md"
                >
                  {submitting ? "Aplicando..." : "Confirmar Novo Preço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Baixar Vencido como Avaria */}
      {disposeItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-red-50/70">
              <div>
                <h3 className="text-base font-black text-red-950 flex items-center gap-2">
                  <Trash2 size={17} className="text-red-600" /> Baixar Vencido como Avaria
                </h3>
                <p className="text-[11px] text-red-800">
                  Reduz o estoque do lote e do produto, gerando recibo AV-.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDisposeItem(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleDisposeExpired} className="p-5 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
                <div className="font-black text-gray-900 text-sm">{disposeItem.productName}</div>
                <div className="text-[11px] text-gray-600 font-mono">
                  Lote: {disposeItem.batchNumber} • Saldo do lote: {disposeItem.currentStock}{" "}
                  {disposeItem.unit}
                </div>
                <div className="text-[11px] text-gray-600 font-mono">
                  Validade: {disposeItem.dateFormatted} • Custo Unit.: R${" "}
                  {fmtBRL(disposeItem.productCost)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                  Quantidade a Baixar ({disposeItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={disposeQty}
                  onChange={(e) => setDisposeQty(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-red-300 focus:border-red-500 text-gray-900 font-mono font-black text-xl px-4 py-2.5 rounded-xl outline-none"
                />
                <p className="text-[11px] text-red-700 font-bold mt-1">
                  Prejuízo estimado a custo: R${" "}
                  {fmtBRL((Number(disposeQty) || 0) * Number(disposeItem.productCost || 0))}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                  Observações da Baixa
                </label>
                <textarea
                  rows={2}
                  value={disposeNotes}
                  onChange={(e) => setDisposeNotes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2 rounded-xl text-xs outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDisposeItem(null)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl text-xs shadow-md"
                >
                  {submitting ? "Baixando..." : "Confirmar Baixa & Gerar Recibo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BucketCard({
  title,
  subtitle,
  value,
  tone,
  active,
  onClick,
  icon,
}: {
  title: string;
  subtitle: string;
  value: string;
  tone: "expired" | "critical" | "attention" | "preventive" | "safe";
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  const styles = {
    expired: {
      icon: "bg-rose-100 text-rose-700 border border-rose-200",
      ring: "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/40",
    },
    critical: {
      icon: "bg-red-50 text-red-600 border border-red-100",
      ring: "border-red-500 ring-2 ring-red-500/20 bg-red-50/30",
    },
    attention: {
      icon: "bg-amber-50 text-amber-600 border border-amber-100",
      ring: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30",
    },
    preventive: {
      icon: "bg-blue-50 text-blue-600 border border-blue-100",
      ring: "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30",
    },
    safe: {
      icon: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      ring: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30",
    },
  };
  const s = styles[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-white border rounded-2xl p-4 shadow-xs transition-all flex items-center gap-3.5 cursor-pointer ${
        active ? s.ring : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.icon}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-gray-600 text-[11px] font-black uppercase tracking-wider truncate">
          {title}
        </p>
        <p className="text-xl font-black text-gray-900 font-mono tracking-tight mt-0.5">{value}</p>
        <p className="text-[10px] text-gray-400 truncate">{subtitle}</p>
      </div>
    </button>
  );
}

function ExpirationBadge({
  daysLeft,
  bucket,
}: {
  daysLeft: number;
  bucket: ExpirationBucket;
}) {
  const badge: Record<ExpirationBucket, string> = {
    EXPIRED: "bg-rose-100 text-rose-800 border border-rose-300",
    CRITICAL_0_5: "bg-red-100 text-red-700 border border-red-200",
    ATTENTION_6_15: "bg-amber-100 text-amber-800 border border-amber-200",
    PREVENTIVE_16_30: "bg-blue-50 text-blue-700 border border-blue-200",
    SAFE_30_PLUS: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  };

  let label = "";
  if (daysLeft < 0) label = `Vencido há ${Math.abs(daysLeft)}d`;
  else if (daysLeft === 0) label = "Vence hoje!";
  else label = `Vence em ${daysLeft}d`;

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-black ${badge[bucket]}`}>
      {label}
    </span>
  );
}
