"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Printer,
  Tag,
  Filter,
  Calendar,
  Clock,
  User,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Eye,
  X,
  DollarSign,
  Barcode,
} from "lucide-react";
import { CybertechBrand } from "@/components/CybertechBrand";
import {
  getLabelsFilterMetadata,
  searchPriceChangedProductsForLabels,
  validateBeforeLabelPrint,
  markLabelsAsPrinted,
  updateProductPrice,
  getAllProducts,
  type LabelProductRow,
} from "@/actions/labels";

type PeriodOption = "TODAY" | "LAST_24H" | "LAST_7D" | "LAST_15D" | "LAST_30D" | "CUSTOM";
type LabelLayoutType = "STANDARD" | "PRODUCAO" | "PROMO" | "REBAIXA";

export default function LabelsPage() {
  const router = useRouter();

  // Relógio em tempo real no topo (igual à imagem)
  const [clockStr, setClockStr] = useState("23:16:04");
  const [operatorName, setOperatorName] = useState("Maria Silva");

  // Metadados do banco (Seções e Fornecedores)
  const [sections, setSections] = useState<string[]>([
    "Bebidas",
    "Alimentos",
    "Mercearia",
    "Higiene",
    "Limpeza",
    "Utilidades",
  ]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);

  // Filtros laterais (idênticos à imagem + regras do prompt)
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("LAST_7D");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("ALL");
  const [barcodeQuery, setBarcodeQuery] = useState<string>("");
  const todayIso = new Date().toISOString().slice(0, 10);
  const [filterDate, setFilterDate] = useState<string>(todayIso);
  const [filterTime, setFilterTime] = useState<string>("00:00:00");
  const [endDate, setEndDate] = useState<string>(todayIso);
  const [endTime, setEndTime] = useState<string>("23:59:59");

  // Resultados e Seleção
  const [products, setProducts] = useState<LabelProductRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiesByProduct, setCopiesByProduct] = useState<Record<string, number>>({});
  const [layoutByProduct, setLayoutByProduct] = useState<Record<string, LabelLayoutType>>({});

  // Opções de Impressão (painel inferior esquerdo da imagem)
  const [defaultQty, setDefaultQty] = useState<number>(1);
  const [globalLayout, setGlobalLayout] = useState<LabelLayoutType>("STANDARD");
  const [selectedPrinter, setSelectedPrinter] = useState<string>("ZDesigner GC420t (Zebra)");
  const [printPrice, setPrintPrice] = useState<boolean>(true);
  const [printBarcode, setPrintBarcode] = useState<boolean>(true);
  const [printExpiration, setPrintExpiration] = useState<boolean>(false);

  // Campos de Validade / Lote quando "Imprimir Validade" está marcado
  const [fabDate, setFabDate] = useState<string>(todayIso);
  const [expDate, setExpDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [batchCode, setBatchCode] = useState<string>(
    `L${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`
  );

  // Modais e Alertas
  const [toast, setToast] = useState<{ type: "success" | "warn" | "error"; text: string } | null>(
    null
  );
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [quickPriceModalOpen, setQuickPriceModalOpen] = useState<boolean>(false);
  const [allCatalogProducts, setAllCatalogProducts] = useState<any[]>([]);
  const [targetProductId, setTargetProductId] = useState<string>("");
  const [newPriceInput, setNewPriceInput] = useState<string>("");

  function showBanner(type: "success" | "warn" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  }

  // Atualiza relógio
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockStr(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Carrega seções e fornecedores do banco
  useEffect(() => {
    async function init() {
      const meta = await getLabelsFilterMetadata();
      if (meta.sections?.length) setSections(meta.sections);
      if (meta.suppliers?.length) setSuppliers(meta.suppliers);
    }
    init();
  }, []);

  // Atualiza campo Data/Horário visualmente quando muda o período
  const handlePeriodChange = (p: PeriodOption) => {
    setSelectedPeriod(p);
    const now = new Date();
    if (p === "TODAY") {
      setFilterDate(now.toISOString().slice(0, 10));
      setFilterTime("00:00:00");
    } else if (p === "LAST_24H") {
      const d = new Date(now.getTime() - 24 * 3600 * 1000);
      setFilterDate(d.toISOString().slice(0, 10));
      setFilterTime(d.toTimeString().slice(0, 8));
    } else if (p === "LAST_7D") {
      const d = new Date(now.getTime() - 7 * 86400 * 1000);
      setFilterDate(d.toISOString().slice(0, 10));
      setFilterTime("00:00:00");
    } else if (p === "LAST_15D") {
      const d = new Date(now.getTime() - 15 * 86400 * 1000);
      setFilterDate(d.toISOString().slice(0, 10));
      setFilterTime("00:00:00");
    } else if (p === "LAST_30D") {
      const d = new Date(now.getTime() - 30 * 86400 * 1000);
      setFilterDate(d.toISOString().slice(0, 10));
      setFilterTime("00:00:00");
    }
  };

  // Busca produtos com alteração de preço (Regra 4)
  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchPriceChangedProductsForLabels({
        section: selectedSection,
        period: selectedPeriod,
        startDate: filterDate,
        startTime: filterTime,
        endDate,
        endTime,
        supplier: selectedSupplier,
        barcodeOrQuery: barcodeQuery,
      });

      const list = res.products || [];
      setProducts(list);

      // Quantidade padrão = 1 etiqueta por produto (Regra 6)
      const nextCopies: Record<string, number> = {};
      const nextLayouts: Record<string, LabelLayoutType> = {};
      list.forEach((item) => {
        nextCopies[item.id] = copiesByProduct[item.id] || defaultQty || 1;
        nextLayouts[item.id] = layoutByProduct[item.id] || globalLayout;
      });
      setCopiesByProduct(nextCopies);
      setLayoutByProduct(nextLayouts);

      // Seleciona automaticamente os resultados encontrados para agilizar a operação
      setSelectedIds(new Set(list.map((p) => p.id)));

      if (list.length === 0) {
        showBanner("warn", "Nenhum produto teve alteração de preço na seção/período selecionados.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    selectedSection,
    selectedPeriod,
    filterDate,
    filterTime,
    endDate,
    endTime,
    selectedSupplier,
    barcodeQuery,
    defaultQty,
    globalLayout,
    copiesByProduct,
    layoutByProduct,
  ]);

  // Limpar filtros (F3)
  const handleClearFilters = useCallback(() => {
    setSelectedSection("ALL");
    setSelectedPeriod("LAST_7D");
    setSelectedSupplier("ALL");
    setBarcodeQuery("");
    const d = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    setFilterDate(d);
    setFilterTime("00:00:00");
    setProducts([]);
    setSelectedIds(new Set());
    showBanner("success", "Filtros limpos (F3). Clique em Filtrar (F2) para buscar.");
  }, []);

  // Selecionar / Desmarcar todos (F8)
  const handleToggleSelectAll = useCallback(() => {
    if (products.length === 0) return;
    const allSelected = products.every((p) => selectedIds.has(p.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }, [products, selectedIds]);

  const toggleSingleProduct = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getCopies = (id: string) => copiesByProduct[id] || defaultQty || 1;

  const setCopiesForProduct = (id: string, qty: number) => {
    const valid = Math.max(1, Math.floor(Number(qty) || 1));
    setCopiesByProduct((prev) => ({ ...prev, [id]: valid }));
  };

  const handleGlobalQtyChange = (val: number) => {
    const valid = Math.max(1, Math.floor(Number(val) || 1));
    setDefaultQty(valid);
    setCopiesByProduct((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        next[id] = valid;
      });
      return next;
    });
  };

  const handleGlobalLayoutChange = (layout: LabelLayoutType) => {
    setGlobalLayout(layout);
    if (layout === "PRODUCAO") setPrintExpiration(true);
    setLayoutByProduct((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        next[p.id] = layout;
      });
      return next;
    });
  };

  const formatBrDate = (iso: string) => {
    if (!iso) return "--/--/----";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return d && m && y ? `${d}/${m}/${y}` : iso;
  };

  // Validação antes da impressão (Regra 8) + Impressão real (Regra 7)
  const executePrint = useCallback(
    async (mode: "SELECTED" | "ALL") => {
      const targetItems =
        mode === "ALL" ? products : products.filter((p) => selectedIds.has(p.id));

      if (targetItems.length === 0) {
        showBanner("warn", "Selecione ao menos um produto na listagem para imprimir.");
        return;
      }

      if (!selectedPrinter) {
        showBanner("error", "Selecione uma impressora disponível antes de imprimir.");
        return;
      }

      // 8. Validação no banco antes de enviar para a impressora
      const validation = await validateBeforeLabelPrint({
        items: targetItems.map((p) => ({
          id: p.id,
          expectedPrice: p.currentPrice,
          copies: getCopies(p.id),
        })),
        requireBarcode: printBarcode,
      });

      if (validation.missingIds && validation.missingIds.length > 0) {
        showBanner(
          "error",
          "Um ou mais produtos selecionados foram removidos do cadastro. Atualizando lista..."
        );
        await handleSearch();
        return;
      }

      if (validation.priceChangedItems && validation.priceChangedItems.length > 0) {
        const changedNames = validation.priceChangedItems
          .map(
            (c) =>
              `${c.name} (de R$ ${c.oldExpectedPrice.toFixed(2)} para R$ ${c.newDbPrice.toFixed(2)})`
          )
          .join(", ");
        await handleSearch();
        showBanner(
          "warn",
          `Atenção: O preço mudou após a busca para: ${changedNames}. Os valores foram atualizados na tela — confira e confirme a impressão novamente.`
        );
        return;
      }

      if (
        printBarcode &&
        validation.missingBarcodeItems &&
        validation.missingBarcodeItems.length > 0
      ) {
        const proceed = window.confirm(
          `Atenção: Os seguintes produtos não possuem código de barras cadastrado:\n• ${validation.missingBarcodeItems.join(
            "\n• "
          )}\n\nDeseja imprimir mesmo assim (usando o código interno)?`
        );
        if (!proceed) return;
      }

      const printWindow = window.open("", "_blank", "width=860,height=660");
      if (!printWindow) {
        showBanner("error", "Pop-up bloqueado pelo navegador. Permita pop-ups para imprimir.");
        return;
      }

      const nowStr = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const fabBr = formatBrDate(fabDate);
      const expBr = formatBrDate(expDate);

      // Regra 7: Não imprimir o preço antigo como preço de venda! Usa apenas currentPrice.
      const labelsHtml = targetItems
        .map((p) => {
          const qty = getCopies(p.id);
          const layout = layoutByProduct[p.id] || globalLayout;
          const barcodeText = p.barcode || p.code;

          return Array(qty)
            .fill(null)
            .map(() => {
              if (layout === "PRODUCAO" || printExpiration) {
                return `
                  <div style="width:60mm;height:35mm;display:inline-block;overflow:hidden;margin:1.5mm;vertical-align:top;border:1px solid #000;padding:2mm;box-sizing:border-box;position:relative;background:#fff;color:#000;font-family:Arial,sans-serif;">
                    <div style="font-size:10px;font-weight:900;text-align:center;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid #000;padding-bottom:0.8mm;">
                      ${p.name}
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:7.5px;font-weight:800;margin-top:1.2mm;line-height:1.3;">
                      <div>
                        <div>FAB: <b>${fabBr}</b></div>
                        <div>VAL: <b>${expBr}</b></div>
                        <div>LOTE: <b>${batchCode}</b></div>
                      </div>
                      ${
                        printPrice
                          ? `<div style="text-align:right;">
                              <div style="font-size:6.5px;font-weight:700;">PREÇO / ${p.unit}</div>
                              <div style="display:flex;align-items:baseline;justify-content:flex-end;">
                                <span style="font-size:8px;font-weight:900;margin-right:0.5mm;">R$</span>
                                <span style="font-size:19px;font-weight:900;line-height:0.9;">${p.currentPrice
                                  .toFixed(2)
                                  .replace(".", ",")}</span>
                              </div>
                            </div>`
                          : ""
                      }
                    </div>
                    ${
                      printBarcode
                        ? `<div style="position:absolute;bottom:1.2mm;left:2mm;right:2mm;text-align:center;">
                            <div style="height:4.5mm;background:repeating-linear-gradient(90deg,#000,#000 1px,transparent 1px,transparent 2.5px);width:100%;"></div>
                            <div style="font-size:6.5px;font-family:monospace;font-weight:bold;">${barcodeText}</div>
                          </div>`
                        : ""
                    }
                  </div>`;
              }

              if (layout === "PROMO") {
                return `
                  <div style="width:60mm;height:32mm;display:inline-block;overflow:hidden;margin:1.5mm;vertical-align:top;border:1px solid #000;padding:2mm;box-sizing:border-box;position:relative;background:#ffe814;color:#000;font-family:Arial,sans-serif;">
                    <div style="font-size:8px;font-weight:900;text-align:center;background:#000;color:#ffe814;padding:0.5mm 0;text-transform:uppercase;">OFERTA ESPECIAL — ${p.section}</div>
                    <div style="font-size:10.5px;font-weight:900;text-align:center;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1mm;">${p.name}</div>
                    <div style="position:absolute;bottom:3.5mm;left:2mm;width:36%;">
                      ${
                        printBarcode
                          ? `<div style="height:7mm;background:repeating-linear-gradient(90deg,#000,#000 1px,transparent 1px,transparent 3px);width:100%;"></div>
                             <div style="font-size:6.5px;font-family:monospace;text-align:center;font-weight:bold;">${barcodeText}</div>`
                          : ""
                      }
                    </div>
                    ${
                      printPrice
                        ? `<div style="position:absolute;bottom:3.5mm;right:2mm;background:#000;color:#ffe814;padding:1mm 2mm;border-radius:1.5mm;display:flex;align-items:baseline;">
                            <span style="font-size:8px;font-weight:900;margin-right:1mm;">R$</span>
                            <span style="font-size:22px;font-weight:900;line-height:0.85;">${p.currentPrice
                              .toFixed(2)
                              .replace(".", ",")}</span>
                            <span style="font-size:6.5px;font-weight:700;margin-left:1mm;">/${p.unit}</span>
                          </div>`
                        : ""
                    }
                    <div style="position:absolute;bottom:0.8mm;right:2mm;font-size:5px;font-weight:bold;">Imp: ${nowStr}</div>
                  </div>`;
              }

              // PADRÃO GÔNDOLA
              return `
                <div style="width:60mm;height:32mm;display:inline-block;overflow:hidden;margin:1.5mm;vertical-align:top;border:1px solid #333;padding:2mm;box-sizing:border-box;position:relative;background:#fff;color:#000;font-family:Arial,sans-serif;">
                  <div style="font-size:11px;font-weight:900;text-align:center;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                  <div style="font-size:6.5px;font-weight:700;text-align:center;color:#444;margin-top:0.5mm;">SEÇÃO: ${p.section.toUpperCase()} • CÓD: ${p.code}</div>
                  <div style="position:absolute;bottom:3.5mm;left:2mm;width:38%;">
                    ${
                      printBarcode
                        ? `<div style="height:7.5mm;background:repeating-linear-gradient(90deg,#000,#000 1px,transparent 1px,transparent 3px);width:100%;"></div>
                           <div style="font-size:6.5px;font-family:monospace;text-align:center;font-weight:bold;">${barcodeText}</div>`
                        : ""
                    }
                  </div>
                  ${
                    printPrice
                      ? `<div style="position:absolute;bottom:3.5mm;right:2mm;display:flex;align-items:baseline;">
                          <span style="font-size:9px;font-weight:900;margin-right:1mm;">R$</span>
                          <span style="font-size:24px;font-weight:900;letter-spacing:-1px;line-height:0.8;">${p.currentPrice
                            .toFixed(2)
                            .replace(".", ",")}</span>
                          <span style="font-size:7px;font-weight:800;margin-left:1mm;">/${p.unit}</span>
                        </div>`
                      : ""
                  }
                  <div style="position:absolute;bottom:0.8mm;right:2mm;font-size:5px;">Imp: ${nowStr}</div>
                </div>`;
            })
            .join("");
        })
        .join("");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Impressão de Etiquetas — ${selectedPrinter}</title>
            <style>@page { margin: 4mm; } body { margin: 0; padding: 0; font-family: Arial, sans-serif; }</style>
          </head>
          <body>
            ${labelsHtml}
            <script>window.onload = () => { window.print(); window.close(); }<\/script>
          </body>
        </html>
      `);
      printWindow.document.close();

      await markLabelsAsPrinted(targetItems.map((i) => i.id));
      showBanner(
        "success",
        `${targetItems.length} produto(s) enviados para a impressora "${selectedPrinter}" com sucesso!`
      );
    },
    [
      products,
      selectedIds,
      selectedPrinter,
      printBarcode,
      printPrice,
      printExpiration,
      fabDate,
      expDate,
      batchCode,
      layoutByProduct,
      globalLayout,
      handleSearch,
    ]
  );

  // 10. ATALHOS DE TECLADO (F2, F3, F5, F8, F12, ESC)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        handleSearch();
      } else if (e.key === "F3") {
        e.preventDefault();
        handleClearFilters();
      } else if (e.key === "F5") {
        e.preventDefault();
        handleSearch();
      } else if (e.key === "F8") {
        e.preventDefault();
        handleToggleSelectAll();
      } else if (e.key === "F12") {
        e.preventDefault();
        executePrint("SELECTED");
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (previewOpen) setPreviewOpen(false);
        else if (quickPriceModalOpen) setQuickPriceModalOpen(false);
        else router.push("/");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handleSearch,
    handleClearFilters,
    handleToggleSelectAll,
    executePrint,
    previewOpen,
    quickPriceModalOpen,
    router,
  ]);

  // Cálculos de rodapé/seleção (Regra 6)
  const selectedProductsList = products.filter((p) => selectedIds.has(p.id));
  const totalSelectedProducts = selectedProductsList.length;
  const totalLabelsToPrint = selectedProductsList.reduce((acc, p) => acc + getCopies(p.id), 0);

  // Abrir modal rápido para alterar o preço real de um produto e testar o histórico
  const handleOpenQuickPriceChange = async () => {
    const res = await getAllProducts();
    setAllCatalogProducts(res.products || []);
    if (res.products?.length) {
      setTargetProductId(res.products[0].id);
      setNewPriceInput(String((Number(res.products[0].price) + 1.5).toFixed(2)));
    }
    setQuickPriceModalOpen(true);
  };

  const handleConfirmQuickPriceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductId || !newPriceInput) return;
    const res = await updateProductPrice(targetProductId, Number(newPriceInput));
    if (res.success) {
      setQuickPriceModalOpen(false);
      await handleSearch();
      showBanner(
        "success",
        "Preço atualizado no cadastro e registrado no histórico de preços! O produto já está disponível para etiqueta."
      );
    } else {
      alert(res.error || "Erro ao alterar preço.");
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 h-full flex flex-col bg-gradient-to-b from-[#e5effc] to-[#d6e4f8] rounded-2xl border border-[#b8cdec] shadow-lg overflow-hidden select-none">
      {/* ─── TOP HEADER BAR COMPACTO ─── */}
      <div className="h-11 px-4 bg-gradient-to-r from-[#eef5ff] via-[#f7faff] to-[#e6f0fe] border-b border-[#c2d5f0] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#0d3b8e]">
            <Printer size={19} className="text-[#1554c0]" />
            <h1 className="text-base font-extrabold tracking-tight text-[#0d2d6c]">
              Impressão de Etiquetas
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenQuickPriceChange}
            title="Simular ou registrar alteração real de preço no banco"
            className="px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <DollarSign size={12} className="text-amber-600" />
            Alterar Preço Produto
          </button>

          {/* Operador Pill */}
          <div className="flex items-center gap-1.5 bg-[#f0f6ff] border border-[#c3d6f2] px-3 py-1 rounded-full shadow-2xs">
            <User size={13} className="text-[#14479c]" />
            <select
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-[#0f2957] outline-none cursor-pointer"
            >
              <option value="Maria Silva">Maria Silva</option>
              <option value="João Santos">João Santos</option>
              <option value="Administrador">Administrador</option>
            </select>
            <ChevronDown size={12} className="text-[#4a6da7]" />
          </div>

          {/* Relógio Pill */}
          <div className="flex items-center gap-1.5 bg-[#f0f6ff] border border-[#c3d6f2] px-3 py-1 rounded-full shadow-2xs">
            <Clock size={13} className="text-[#14479c]" />
            <span className="text-[11px] font-extrabold font-mono text-[#0f2957]">{clockStr}</span>
          </div>
        </div>
      </div>

      {/* Banner de Feedback */}
      {toast && (
        <div
          className={`mx-2.5 mt-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between border shrink-0 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : toast.type === "warn"
              ? "bg-amber-50 border-amber-300 text-amber-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          <span className="flex items-center gap-2">
            {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {toast.text}
          </span>
          <button onClick={() => setToast(null)} className="text-gray-500 hover:text-gray-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── CORPO PRINCIPAL SEM ROLAGEM EXTERNA ─── */}
      <div className="flex-1 min-h-0 p-2.5 flex gap-2.5 overflow-hidden">
        {/* COLUNA ESQUERDA COMPACTA (SEM BARRA DE ROLAGEM) */}
        <div className="w-[300px] shrink-0 flex flex-col gap-2 overflow-hidden">
          {/* CARD 1: FILTROS PARA BUSCA */}
          <div className="bg-[#f3f8ff] border border-[#c3d6f2] rounded-xl p-2.5 shadow-2xs flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-1.5 pb-1.5 border-b border-[#d5e3f7] text-[#0d3b8e]">
              <Filter size={14} className="text-[#1554c0]" />
              <span className="text-xs font-extrabold tracking-tight">Filtros para Busca</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* 2. FILTRO POR SEÇÃO */}
              <div>
                <label className="block text-[10px] font-bold text-[#1e3a6d] mb-0.5">
                  Seção / Produto
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#bfd3f0] rounded-lg text-[11px] font-semibold text-gray-800 outline-none focus:border-[#1554c0]"
                >
                  <option value="ALL">Todas as Seções</option>
                  {sections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. FILTRO DE ALTERAÇÃO DE PREÇO (PERÍODO) */}
              <div>
                <label className="block text-[10px] font-bold text-[#1e3a6d] mb-0.5">
                  Período Alteração
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value as PeriodOption)}
                  className="w-full px-2 py-1 bg-white border border-[#bfd3f0] rounded-lg text-[11px] font-semibold text-gray-800 outline-none focus:border-[#1554c0]"
                >
                  <option value="TODAY">Hoje</option>
                  <option value="LAST_24H">Últimas 24h</option>
                  <option value="LAST_7D">Últimos 7 dias</option>
                  <option value="LAST_15D">Últimos 15 dias</option>
                  <option value="LAST_30D">Últimos 30 dias</option>
                  <option value="CUSTOM">Personalizado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Fornecedor */}
              <div>
                <label className="block text-[10px] font-bold text-[#1e3a6d] mb-0.5">Fornecedor</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#bfd3f0] rounded-lg text-[11px] font-semibold text-gray-800 outline-none focus:border-[#1554c0]"
                >
                  <option value="ALL">Todos</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.name}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cód. Barras */}
              <div>
                <label className="block text-[10px] font-bold text-[#1e3a6d] mb-0.5">Cód. Barras</label>
                <input
                  type="text"
                  value={barcodeQuery}
                  onChange={(e) => setBarcodeQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Digite o código..."
                  className="w-full px-2 py-1 bg-white border border-[#bfd3f0] rounded-lg text-[11px] font-medium text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#1554c0]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Data */}
              <div>
                <label className="block text-[10px] font-bold text-[#1e3a6d] mb-0.5">Data</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setSelectedPeriod("CUSTOM");
                  }}
                  className="w-full px-2 py-1 bg-white border border-[#bfd3f0] rounded-lg text-[11px] font-semibold text-gray-800 outline-none focus:border-[#1554c0]"
                />
              </div>

              {/* Horário */}
              <div>
                <label className="block text-[10px] font-bold text-[#1e3a6d] mb-0.5">Horário</label>
                <input
                  type="time"
                  step="1"
                  value={filterTime}
                  onChange={(e) => {
                    setFilterTime(e.target.value);
                    setSelectedPeriod("CUSTOM");
                  }}
                  className="w-full px-2 py-1 bg-white border border-[#bfd3f0] rounded-lg text-[11px] font-semibold text-gray-800 outline-none focus:border-[#1554c0]"
                />
              </div>
            </div>

            {/* Botão Filtrar / Buscar Produtos */}
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="w-full py-1.5 rounded-lg bg-gradient-to-b from-[#1e64d8] to-[#0b45a8] hover:from-[#1858c4] hover:to-[#093b91] text-white font-extrabold text-xs shadow-sm shadow-blue-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.99]"
            >
              <Search size={14} />
              {loading ? "Buscando..." : "Filtrar (F2)"}
            </button>
          </div>

          {/* CARD 2: OPÇÕES DE IMPRESSÃO */}
          <div className="flex-1 bg-[#f3f8ff] border border-[#c3d6f2] rounded-xl p-2.5 shadow-2xs flex flex-col justify-between min-h-0">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-[#d5e3f7] text-[#0d3b8e]">
                <Printer size={14} className="text-[#1554c0]" />
                <span className="text-xs font-extrabold tracking-tight">Opções de Impressão</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#1e3a6d] mb-0.5">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    value={defaultQty}
                    onChange={(e) => handleGlobalQtyChange(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-white border border-[#bfd3f0] rounded-lg text-[11px] font-bold text-center text-gray-900 outline-none focus:border-[#1554c0]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#1e3a6d] mb-0.5">Layout</label>
                  <select
                    value={globalLayout}
                    onChange={(e) => handleGlobalLayoutChange(e.target.value as LabelLayoutType)}
                    className="w-full px-2 py-1 bg-white border border-[#bfd3f0] rounded-lg text-[11px] font-bold text-gray-800 outline-none focus:border-[#1554c0]"
                  >
                    <option value="STANDARD">Padrão</option>
                    <option value="PRODUCAO">Produção / Val.</option>
                    <option value="PROMO">Oferta / Promo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#1e3a6d] mb-0.5">Impressora</label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#bfd3f0] rounded-lg text-[11px] font-semibold text-gray-800 outline-none focus:border-[#1554c0]"
                >
                  <option>ZDesigner GC420t (Zebra)</option>
                  <option>Elgin L42 Pro</option>
                  <option>Argox OS-214 Plus</option>
                  <option>Padrão do Sistema</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-1 pt-0.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-[#1e3a6d] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printPrice}
                    onChange={(e) => setPrintPrice(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#1554c0]"
                  />
                  Preço
                </label>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-[#1e3a6d] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printBarcode}
                    onChange={(e) => setPrintBarcode(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#1554c0]"
                  />
                  Cód. Barras
                </label>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-[#1e3a6d] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printExpiration}
                    onChange={(e) => setPrintExpiration(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#1554c0]"
                  />
                  Validade
                </label>
              </div>

              {printExpiration && (
                <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-lg bg-white border border-[#bfd3f0] text-[10px]">
                  <div>
                    <span className="font-bold text-gray-600 block">Validade:</span>
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] font-bold"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-gray-600 block">Lote:</span>
                    <input
                      type="text"
                      value={batchCode}
                      onChange={(e) => setBatchCode(e.target.value)}
                      className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => executePrint("SELECTED")}
                className="w-full py-1.5 rounded-lg bg-gradient-to-b from-[#1e64d8] to-[#0b45a8] hover:from-[#1858c4] hover:to-[#093b91] text-white font-extrabold text-xs shadow-sm shadow-blue-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Printer size={14} />
                Imprimir Selecionados (F12)
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="py-1 px-2 rounded-lg bg-white hover:bg-blue-50 border border-[#bfd3f0] text-[#0d3b8e] font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Eye size={12} /> Visualizar
                </button>
                <button
                  type="button"
                  onClick={() => executePrint("ALL")}
                  className="py-1 px-2 rounded-lg bg-white hover:bg-blue-50 border border-[#bfd3f0] text-[#0d3b8e] font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer size={12} /> Imp. Todos
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TABELA PRINCIPAL À DIREITA ─── */}
        <div className="flex-1 bg-[#f7faff] border border-[#c3d6f2] rounded-xl shadow-2xs overflow-hidden flex flex-col min-w-0">
          {/* Barra de Resumo de Seleção (Quando há produtos) */}
          {products.length > 0 && (
            <div className="px-4 py-1.5 bg-[#eaf2fc] border-b border-[#c3d6f2] flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-4">
                <span className="font-bold text-[#0d3b8e]">
                  Encontrados: <strong className="font-black">{products.length}</strong>
                </span>
                <span className="font-bold text-[#0d3b8e]">
                  Selecionados: <strong className="font-black">{totalSelectedProducts}</strong>
                </span>
                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Total de Etiquetas a Imprimir: <strong>{totalLabelsToPrint}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set(products.map((p) => p.id)))}
                  className="px-2.5 py-0.5 rounded-lg bg-white border border-[#bfd3f0] text-[#0d3b8e] font-bold text-[11px] hover:bg-blue-50 cursor-pointer"
                >
                  Selecionar Todos (F8)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2.5 py-0.5 rounded-lg bg-white border border-[#bfd3f0] text-gray-600 font-bold text-[11px] hover:bg-gray-50 cursor-pointer"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>
          )}

          {/* Tabela com Cabeçalho Azul Marinho Real (#0b3b8c) */}
          <div className={`flex-1 min-h-0 relative ${products.length > 0 ? "overflow-auto" : "overflow-hidden"}`}>
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gradient-to-b from-[#1149a6] to-[#0a3278] text-white sticky top-0 z-10 shadow-xs">
                <tr className="divide-x divide-[#245bb5]">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={products.length > 0 && products.every((p) => selectedIds.has(p.id))}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded accent-white cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 font-extrabold text-center w-24">Código</th>
                  <th className="py-2.5 px-4 font-extrabold">Descrição</th>
                  <th className="py-2.5 px-3 font-extrabold text-center w-28">Seção</th>
                  <th className="py-2.5 px-3 font-extrabold text-right w-28">Preço Ant.</th>
                  <th className="py-2.5 px-3 font-extrabold text-right w-28">Preço Atual</th>
                  <th className="py-2.5 px-3 font-extrabold text-center w-36">Data Alteração</th>
                  <th className="py-2.5 px-3 font-extrabold text-center w-20">Qtd.</th>
                  <th className="py-2.5 px-3 font-extrabold text-center w-36">Código Barras</th>
                  <th className="py-2.5 px-3 font-extrabold text-center w-28">Layout</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#d9e6f7]">
                {products.length === 0 ? (
                  Array.from({ length: 12 }).map((_, idx) => (
                    <tr
                      key={idx}
                      className={`h-9 divide-x divide-[#deebfa] ${
                        idx % 2 === 0 ? "bg-[#f8fbff]" : "bg-[#edf4fc]"
                      }`}
                    >
                      <td className="w-10" />
                      <td className="w-24" />
                      <td />
                      <td className="w-28" />
                      <td className="w-28" />
                      <td className="w-28" />
                      <td className="w-36" />
                      <td className="w-20" />
                      <td className="w-36" />
                      <td className="w-28" />
                    </tr>
                  ))
                ) : (
                  products.map((p, idx) => {
                    const isChecked = selectedIds.has(p.id);
                    const rowLayout = layoutByProduct[p.id] || globalLayout;
                    return (
                      <tr
                        key={p.id}
                        className={`divide-x divide-[#deebfa] transition-colors ${
                          isChecked
                            ? "bg-[#dbeafe]/70 hover:bg-[#dbeafe]"
                            : idx % 2 === 0
                            ? "bg-[#f8fbff] hover:bg-blue-50/50"
                            : "bg-[#edf4fc] hover:bg-blue-50/50"
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSingleProduct(p.id)}
                            className="w-4 h-4 rounded accent-[#1554c0] cursor-pointer"
                          />
                        </td>
                        <td
                          onClick={() => toggleSingleProduct(p.id)}
                          className="py-2.5 px-3 text-center font-mono font-bold text-[#1e3a6d] cursor-pointer"
                        >
                          {p.code}
                        </td>
                        <td
                          onClick={() => toggleSingleProduct(p.id)}
                          className="py-2.5 px-4 font-bold text-gray-900 cursor-pointer"
                        >
                          {p.name}
                          <span className="ml-1.5 text-[10px] font-semibold text-gray-500">
                            ({p.unit})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100/80 text-[#0d3b8e] font-bold text-[11px]">
                            {p.section}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-gray-500 line-through">
                          R$ {p.previousPrice.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-sm">
                          R$ {p.currentPrice.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-gray-600">
                          {new Date(p.priceChangedAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={getCopies(p.id)}
                            onChange={(e) => setCopiesForProduct(p.id, Number(e.target.value))}
                            className="w-14 py-1 text-center bg-white border border-[#bfd3f0] rounded-lg font-bold text-gray-900 outline-none focus:border-[#1554c0]"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-xs text-gray-700">
                          {p.barcode || "SEM EAN"}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <select
                            value={rowLayout}
                            onChange={(e) =>
                              setLayoutByProduct((prev) => ({
                                ...prev,
                                [p.id]: e.target.value as LabelLayoutType,
                              }))
                            }
                            className="px-2 py-1 bg-white border border-[#bfd3f0] rounded-lg text-[11px] font-bold text-[#0d3b8e] outline-none"
                          >
                            <option value="STANDARD">Padrão</option>
                            <option value="PRODUCAO">Produção</option>
                            <option value="PROMO">Oferta</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Empty State Overlay (idêntico à imagem enviada) */}
            {products.length === 0 && (
              <div className="absolute inset-0 top-10 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-20 h-20 rounded-full bg-gradient-to-b from-[#e4effe] to-[#d0e2fb] border border-[#b9d2f7] shadow-md flex items-center justify-center mb-3">
                  <Tag size={36} className="text-[#1554c0]" />
                </div>
                <h3 className="text-lg font-extrabold text-[#0d2d6c]">
                  Nenhuma etiqueta para impressão
                </h3>
                <p className="text-xs font-medium text-[#4a6696] mt-1">
                  Utilize os filtros ao lado para localizar os produtos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── BARRA DE STATUS E ATALHOS DE TECLADO NO RODAPÉ ─── */}
      <div className="h-9 px-3.5 bg-gradient-to-r from-[#e3eefc] via-[#edf4fe] to-[#dce9fb] border-t border-[#bfd3f0] flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-[#bfd3f0]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <span className="font-bold text-[11px] text-[#16325c]">Sistema Online</span>
          </div>

          <ShortcutButton kbd="F2" label="Buscar" onClick={handleSearch} />
          <ShortcutButton kbd="F3" label="Limpar" onClick={handleClearFilters} />
          <ShortcutButton kbd="F5" label="Atualizar" onClick={handleSearch} />
          <ShortcutButton kbd="F8" label="Selecionar" onClick={handleToggleSelectAll} />
          <ShortcutButton kbd="F12" label="Imprimir" onClick={() => executePrint("SELECTED")} />
          <ShortcutButton kbd="ESC" label="Voltar" onClick={() => router.push("/")} />
        </div>

        <div className="hidden md:flex items-center gap-2.5 text-[#0d2d6c]">
          <Barcode size={17} className="text-[#16325c]" />
          <div className="h-3.5 w-[1px] bg-[#bfd3f0]" />
          <span className="font-extrabold tracking-tight text-[11px] text-[#0d2d6c]">CyberTech RP</span>
        </div>
      </div>

      {/* ─── MODAL: VISUALIZAR ANTES DE IMPRIMIR ─── */}
      {previewOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#bfd3f0] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#f3f8ff] border-b border-[#c3d6f2] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#0d2d6c] flex items-center gap-2">
                <Eye size={16} className="text-[#1554c0]" /> Pré-visualização das Etiquetas (
                {selectedProductsList.length} produtos / {totalLabelsToPrint} etiquetas)
              </h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-gray-500 hover:text-gray-800 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 max-h-[65vh] overflow-y-auto bg-[#e9f1fc] flex flex-wrap gap-3 justify-center">
              {selectedProductsList.length === 0 ? (
                <p className="text-xs font-bold text-gray-500 py-8">
                  Nenhum produto selecionado para visualizar.
                </p>
              ) : (
                selectedProductsList.map((p) => (
                  <div
                    key={p.id}
                    className="w-[230px] h-[125px] bg-white border-2 border-gray-800 rounded-lg p-2.5 flex flex-col justify-between text-black shadow-md"
                  >
                    <div>
                      <div className="text-[11px] font-black uppercase truncate text-center border-b border-gray-300 pb-0.5">
                        {p.name}
                      </div>
                      <div className="text-[9px] font-bold text-gray-600 text-center mt-0.5">
                        {p.section} • Qtd: {getCopies(p.id)} via(s)
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      {printBarcode ? (
                        <div className="text-center">
                          <div className="font-mono text-base leading-none tracking-tighter">
                            ||||||||||||
                          </div>
                          <div className="text-[8px] font-mono font-bold">
                            {p.barcode || p.code}
                          </div>
                        </div>
                      ) : (
                        <div />
                      )}
                      {printPrice && (
                        <div className="text-right">
                          <span className="text-[10px] font-black mr-0.5">R$</span>
                          <span className="text-2xl font-black leading-none">
                            {p.currentPrice.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-[9px] font-bold ml-0.5">/{p.unit}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 bg-[#f3f8ff] border-t border-[#c3d6f2] flex justify-end gap-2">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-[#bfd3f0] text-gray-700 font-bold text-xs"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setPreviewOpen(false);
                  executePrint("SELECTED");
                }}
                className="px-5 py-2 rounded-xl bg-[#1554c0] hover:bg-[#0d3b8e] text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Printer size={14} /> Confirmar e Imprimir (F12)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ALTERAR PREÇO DE PRODUTO (PARA TESTAR REPOSIÇÃO DE ETIQUETA EM TEMPO REAL) ─── */}
      {quickPriceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#bfd3f0] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#f3f8ff] border-b border-[#c3d6f2] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#0d2d6c] flex items-center gap-2">
                <DollarSign size={16} className="text-[#1554c0]" /> Alterar Preço de Produto no Banco
              </h3>
              <button
                onClick={() => setQuickPriceModalOpen(false)}
                className="text-gray-500 hover:text-gray-800 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmQuickPriceChange} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1e3a6d] mb-1">
                  Selecionar Produto do Cadastro
                </label>
                <select
                  value={targetProductId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setTargetProductId(id);
                    const found = allCatalogProducts.find((x) => x.id === id);
                    if (found) {
                      setNewPriceInput(String((Number(found.price) + 1.0).toFixed(2)));
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#f3f8ff] border border-[#bfd3f0] rounded-xl text-xs font-bold text-gray-900"
                >
                  {allCatalogProducts.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} — [{prod.section}] (Atual: R$ {Number(prod.price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1e3a6d] mb-1">
                  Novo Preço de Venda (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={newPriceInput}
                  onChange={(e) => setNewPriceInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f8ff] border border-[#bfd3f0] rounded-xl text-base font-mono font-black text-gray-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickPriceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1554c0] hover:bg-[#0d3b8e] text-white font-bold text-xs"
                >
                  Salvar Novo Preço e Gerar Histórico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ShortcutButton({
  kbd,
  label,
  onClick,
}: {
  kbd: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f5f9ff] hover:bg-white border border-[#b9d0f0] shadow-2xs transition-all cursor-pointer active:scale-95"
    >
      <span className="px-1.5 py-0.5 rounded bg-[#dce8fa] border border-[#a8c5ec] font-mono font-extrabold text-[10px] text-[#0d3b8e]">
        {kbd}
      </span>
      <span className="font-bold text-[11px] text-[#1e3a6d]">{label}</span>
    </button>
  );
}
