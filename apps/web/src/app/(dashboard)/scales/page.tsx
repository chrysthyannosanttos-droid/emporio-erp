"use client";

import { useState, useEffect } from "react";
import {
  Scale,
  Search,
  Plus,
  X,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Eye,
  SlidersHorizontal,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  Edit2,
  Save,
  Check
} from "lucide-react";
import Link from "next/link";
import {
  DEFAULT_SCALE_SECTORS,
  ScaleSectorConfig
} from "@/lib/scaleConfig";
import {
  getScaleProducts,
  generateToledoMGV6File,
  toggleProductScale,
  updateProductScaleInfo,
  getNextScaleCode
} from "@/actions/scale";
import { getProducts } from "@/actions/product";

export default function ScalesPage() {
  const [activeTab, setActiveTab] = useState<"products" | "devices">("products");

  // Balanças físicas na rede
  const [devices, setDevices] = useState<{ id: string; name: string; desc: string; status: string; ip: string; lastSync: string }[]>([
    { id: "1", name: "Balança Frios 01", desc: "Açougue & Laticínios", status: "Sincronizado", ip: "192.168.1.150", lastSync: "Hoje, 09:30" },
    { id: "2", name: "Balança FLV 01", desc: "Hortifrúti Central", status: "Sincronizado", ip: "192.168.1.151", lastSync: "Hoje, 10:15" },
    { id: "3", name: "Balança Padaria 01", desc: "Padaria & Confeitaria", status: "Pendências", ip: "192.168.1.152", lastSync: "Ontem, 18:00" },
  ]);

  // Produtos pesáveis de balança
  const [scaleProducts, setScaleProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal de Preview do arquivo TXT MGV6
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTxt, setPreviewTxt] = useState("");
  const [previewCount, setPreviewCount] = useState(0);

  // Modal para Adicionar Produto Existente à Balança
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchAdd, setSearchAdd] = useState("");
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<any>(null);
  const [addSectorId, setAddSectorId] = useState("carnes");
  const [addDigits, setAddDigits] = useState<4 | 5>(5);
  const [addGeneratedCode, setAddGeneratedCode] = useState("");
  const [addDays, setAddDays] = useState("3");
  const [addingToScale, setAddingToScale] = useState(false);

  // Modal de edição rápida de PLU/Validade
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editPlu, setEditPlu] = useState("");
  const [editDays, setEditDays] = useState("0");
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal cadastrar dispositivo IP
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);

  useEffect(() => {
    loadScaleProducts();
  }, [selectedSector]);

  const loadScaleProducts = async () => {
    setLoading(true);
    const res = await getScaleProducts({ sectorId: selectedSector });
    if (res.products) {
      setScaleProducts(res.products);
    }
    setLoading(false);
  };

  const handleOpenAddModal = async () => {
    setIsAddProductModalOpen(true);
    setSelectedProductToAdd(null);
    setSearchAdd("");
    const res = await getProducts();
    if (res.products) {
      setAllProducts(res.products);
    }
    // Gera código inicial
    const codeRes = await getNextScaleCode(addSectorId, addDigits);
    if (codeRes.success) {
      setAddGeneratedCode(codeRes.code);
    }
  };

  const handleSectorChangeInAdd = async (newSectorId: string) => {
    setAddSectorId(newSectorId);
    const sectorObj = DEFAULT_SCALE_SECTORS.find((s) => s.id === newSectorId);
    if (sectorObj) setAddDays(String(sectorObj.defaultDays));
    const codeRes = await getNextScaleCode(newSectorId, addDigits);
    if (codeRes.success) {
      setAddGeneratedCode(codeRes.code);
    }
  };

  const handleDigitsChangeInAdd = async (newDigits: 4 | 5) => {
    setAddDigits(newDigits);
    const codeRes = await getNextScaleCode(addSectorId, newDigits);
    if (codeRes.success) {
      setAddGeneratedCode(codeRes.code);
    }
  };

  const handleConfirmAddToScale = async () => {
    if (!selectedProductToAdd || !addGeneratedCode.trim()) return;
    setAddingToScale(true);
    const sectorObj = DEFAULT_SCALE_SECTORS.find((s) => s.id === addSectorId);
    const res = await updateProductScaleInfo({
      productId: selectedProductToAdd.id,
      internalCode: addGeneratedCode.trim(),
      scaleDays: parseInt(addDays, 10) || 0,
      scaleDept: sectorObj?.deptCode || 1,
      sendToScale: true,
    });
    setAddingToScale(false);

    if (res.error) {
      setFeedback({ type: "error", message: res.error });
    } else {
      setFeedback({ type: "success", message: `Produto "${selectedProductToAdd.name}" adicionado à balança com PLU ${addGeneratedCode}!` });
      setIsAddProductModalOpen(false);
      loadScaleProducts();
    }
  };

  const handleToggleScale = async (productId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setScaleProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, sendToScale: newVal } : p))
    );
    await toggleProductScale(productId, newVal);
  };

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setEditPlu(product.internalCode || "");
    setEditDays(String(product.scaleDays || 0));
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setSavingEdit(true);
    const res = await updateProductScaleInfo({
      productId: editingProduct.id,
      internalCode: editPlu.trim(),
      scaleDays: parseInt(editDays, 10) || 0,
      sendToScale: true,
    });
    setSavingEdit(false);

    if (res.error) {
      setFeedback({ type: "error", message: res.error });
    } else {
      setFeedback({ type: "success", message: `Dados de balança atualizados com sucesso!` });
      setEditingProduct(null);
      loadScaleProducts();
    }
  };

  // Exportar Carga Toledo MGV6
  const handleExportMGV6 = async (format: "STANDARD_MGV6" | "COMPACT" = "STANDARD_MGV6") => {
    setGenerating(true);
    setFeedback(null);

    const res = await generateToledoMGV6File({
      sectorId: selectedSector === "ALL" ? undefined : selectedSector,
      format,
    });

    setGenerating(false);

    if (res.error || !res.txt) {
      setFeedback({ type: "error", message: res.error || "Erro ao gerar arquivo de carga MGV6." });
      return;
    }

    // Download do arquivo TXT
    const blob = new Blob([res.txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = format === "STANDARD_MGV6" ? "ITENSMGV.TXT" : "ITENS.TXT";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setFeedback({
      type: "success",
      message: `Arquivo ${link.download} gerado com sucesso contendo ${res.count} produtos pesáveis! Pronto para importar no MGV6 da Toledo.`,
    });
  };

  // Pré-visualizar arquivo TXT
  const handlePreviewMGV6 = async () => {
    setGenerating(true);
    const res = await generateToledoMGV6File({
      sectorId: selectedSector === "ALL" ? undefined : selectedSector,
      format: "STANDARD_MGV6",
    });
    setGenerating(false);

    if (res.error || !res.txt) {
      setFeedback({ type: "error", message: res.error || "Nenhum produto pesável localizado para visualização." });
      return;
    }

    setPreviewTxt(res.txt);
    setPreviewCount(res.count || 0);
    setIsPreviewOpen(true);
  };

  const filteredProducts = scaleProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.internalCode.includes(search) ||
      (p.barcode && p.barcode.includes(search))
  );

  const carnesCount = scaleProducts.filter((p) => p.sectorPrefix === 5).length;
  const hortiCount = scaleProducts.filter((p) => p.sectorPrefix === 6).length;
  const outrosCount = scaleProducts.filter((p) => p.sectorPrefix !== 5 && p.sectorPrefix !== 6).length;

  return (
    <div className="h-full flex flex-col gap-5 select-none pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-600 shadow-xs">
              <Scale size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Integração Toledo MGV6
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Carga em Balanças
                </span>
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Gere e importe arquivos <strong className="text-amber-800 font-mono">ITENS.TXT / ITENSMGV.TXT</strong> para balanças Toledo Prix (Açougue, Hortifrúti, Padaria e Frios).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePreviewMGV6}
            disabled={generating}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-xs shadow-2xs active:scale-95 disabled:opacity-50"
            title="Visualizar a estrutura posicional do arquivo TXT do MGV6"
          >
            <Eye size={15} className="text-amber-600" />
            <span>Visualizar TXT</span>
          </button>

          <button
            onClick={() => handleExportMGV6("STANDARD_MGV6")}
            disabled={generating}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-xs shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            title="Exportar arquivo oficial ITENSMGV.TXT com campos completos para Toledo MGV6"
          >
            {generating ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Gerando Carga...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Exportar TXT (MGV6)</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs shadow-md shadow-blue-500/20 active:scale-95"
          >
            <Plus size={15} />
            <span>Adicionar Produto à Balança</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-150 ${feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
            }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-black/5 rounded-lg">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards / Setores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 shrink-0">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total na Carga</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-gray-900 font-mono">{scaleProducts.length}</span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Pesáveis / MGV6
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Carnes & Açougue</span>
            <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
              Prefixo 5
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-700 font-mono">{carnesCount}</span>
            <span className="text-[11px] text-gray-400 font-semibold">Ex: 50001</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Hortifrúti / FLV</span>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              Prefixo 6
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-700 font-mono">{hortiCount}</span>
            <span className="text-[11px] text-gray-400 font-semibold">Ex: 60001</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Padaria / Frios / Outros</span>
            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
              Pref. 7 / 4 / 3
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-indigo-700 font-mono">{outrosCount}</span>
            <span className="text-[11px] text-gray-400 font-semibold">Ex: 70001, 40001</span>
          </div>
        </div>
      </div>

      {/* Tabs Principais */}
      <div className="flex border-b border-gray-200 bg-gray-50/70 rounded-2xl p-1 gap-1 w-fit shadow-2xs shrink-0">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "products"
              ? "bg-white text-gray-900 shadow-sm border border-gray-200/80"
              : "text-gray-500 hover:text-gray-900"
            }`}
        >
          <FileText size={14} className="text-amber-600" />
          <span>Produtos para Balança ({scaleProducts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("devices")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "devices"
              ? "bg-white text-gray-900 shadow-sm border border-gray-200/80"
              : "text-gray-500 hover:text-gray-900"
            }`}
        >
          <Scale size={14} className="text-blue-600" />
          <span>Balanças Conectadas ({devices.length})</span>
        </button>
      </div>

      {/* Conteúdo da Aba Produtos */}
      {activeTab === "products" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          {/* Subheader: Busca e Filtro de Setor */}
          <div className="p-4 border-b border-gray-100 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por nome ou código PLU (ex: 50001)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white text-gray-800 rounded-xl outline-none text-xs font-medium placeholder:text-gray-400 transition-all"
              />
            </div>

            {/* Filtros de Setor */}
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Setor:</span>
              <button
                onClick={() => setSelectedSector("ALL")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${selectedSector === "ALL"
                    ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                Todos
              </button>
              {DEFAULT_SCALE_SECTORS.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSector(sec.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 ${selectedSector === sec.id
                      ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  <span>{sec.name.split("/")[0].trim()}</span>
                  <span className="text-[9px] opacity-75 font-mono">({sec.prefix})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tabela de Produtos */}
          <div className="flex-1 overflow-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-xs font-semibold gap-2">
                <RefreshCw size={16} className="animate-spin text-amber-500" /> Carregando produtos de balança...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <Scale size={24} />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Nenhum produto de balança encontrado</h3>
                <p className="text-xs text-gray-500 max-w-md mt-1">
                  Marque a flag &quot;Produto de Balança&quot; no cadastro de produtos ou clique no botão acima para adicionar itens existentes.
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Adicionar Item à Balança
                </button>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 font-bold uppercase tracking-wider text-[10px]">Carga MGV6</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wider text-[10px]">Cód. Balança (PLU)</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wider text-[10px]">Setor</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wider text-[10px]">Produto</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wider text-[10px] text-right">Preço / Unidade</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wider text-[10px] text-center">Validade (Dias)</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wider text-[10px] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Switch de Carga */}
                      <td className="px-5 py-3.5">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={p.sendToScale !== false}
                            onChange={() => handleToggleScale(p.id, p.sendToScale !== false)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                      </td>

                      {/* Código PLU de 4 ou 5 dígitos */}
                      <td className="px-5 py-3.5 font-mono font-black text-sm text-gray-900">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 border border-gray-200 text-amber-900">
                          {p.internalCode || "---"}
                        </span>
                      </td>

                      {/* Setor */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${p.sectorPrefix === 5
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : p.sectorPrefix === 6
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : p.sectorPrefix === 7
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                        >
                          {p.sectorName}
                        </span>
                      </td>

                      {/* Nome do Produto */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-xs">{p.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            EAN: {p.barcode || "Não informado"}
                          </span>
                        </div>
                      </td>

                      {/* Preço e Unidade */}
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900">
                        R$ {Number(p.price).toFixed(2).replace(".", ",")}
                        <span className="text-[10px] text-gray-500 ml-1">/ {p.unit || "KG"}</span>
                      </td>

                      {/* Validade */}
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-gray-700">
                        {p.scaleDays ? `${p.scaleDays} dias` : "0 dias"}
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:text-amber-800 bg-gray-50 hover:bg-amber-100/50 border border-gray-200 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          <span>Ajustar PLU</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Balanças / Dispositivos IP */}
      {activeTab === "devices" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-0 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Balanças Eletrônicas em Rede (Toledo Prix / Filizola)
              </h3>
              <p className="text-[11px] text-gray-400">
                Endereçamento IP das balanças conectadas no roteador para sincronização direta via MGV6.
              </p>
            </div>
            <button
              onClick={() => setIsDeviceModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-sm"
            >
              <Plus size={14} /> Cadastrar Balança IP
            </button>
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Identificador</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Setor</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Endereço IP</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Última Carga</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {devices.map((i) => (
                  <tr key={i.id} className="hover:bg-blue-50/30">
                    <td className="px-5 py-3.5 font-bold text-gray-900">{i.name}</td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">{i.desc}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{i.ip}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{i.lastSync}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md font-bold border ${i.status === "Sincronizado"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/15"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/15"
                          }`}
                      >
                        {i.status === "Sincronizado" ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                        {i.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Preview do TXT Toledo MGV6 */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    Pré-visualização da Carga MGV6 (ITENSMGV.TXT)
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono font-bold">
                      {previewCount} itens pesáveis
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Layout posicional padronizado Toledo Prix com departamento, tipo de venda, código de balança de 4/5 dígitos e preço.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-auto flex-1 font-mono text-[11px] bg-slate-950 text-emerald-400 rounded-xl m-4 p-4 shadow-inner leading-relaxed whitespace-pre">
              {previewTxt}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="text-xs text-gray-500">
                Final de linha padrão Toledo: <strong className="font-mono text-gray-700">CR+LF (\r\n)</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    handleExportMGV6("STANDARD_MGV6");
                    setIsPreviewOpen(false);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Download size={13} />
                  <span>Baixar Arquivo TXT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Produto Existente à Balança */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Adicionar Produto do Estoque à Balança
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Selecione o produto e o sistema gerará o próximo código sequencial do setor selecionado.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Escolha do Setor e Dígitos */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
                <div>
                  <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Setor da Balança
                  </label>
                  <select
                    value={addSectorId}
                    onChange={(e) => handleSectorChangeInAdd(e.target.value)}
                    className="w-full bg-white border border-amber-300 text-gray-900 px-3 py-2 text-xs rounded-xl outline-none font-bold"
                  >
                    {DEFAULT_SCALE_SECTORS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Prefixo {s.prefix})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Padrão de Dígitos
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDigitsChangeInAdd(4)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${addDigits === 4
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-white border-amber-300 text-amber-800"
                        }`}
                    >
                      4 Dígitos (5001)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigitsChangeInAdd(5)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${addDigits === 5
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-white border-amber-300 text-amber-800"
                        }`}
                    >
                      5 Dígitos (50001)
                    </button>
                  </div>
                </div>

                <div className="col-span-2 flex items-center justify-between pt-1 border-t border-amber-200/60">
                  <span className="text-xs text-amber-900 font-bold">
                    Código PLU Sugerido na Sequência:
                  </span>
                  <span className="font-mono font-black text-sm text-amber-950 bg-white px-3 py-1 rounded-lg border border-amber-300">
                    {addGeneratedCode || "Calculando..."}
                  </span>
                </div>
              </div>

              {/* Busca de Produtos do Estoque */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Selecione o Produto para Balança
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={searchAdd}
                    onChange={(e) => setSearchAdd(e.target.value)}
                    placeholder="Digite o nome ou código de barras do produto..."
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 text-xs rounded-xl outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {allProducts
                    .filter((p) => p.name.toLowerCase().includes(searchAdd.toLowerCase()))
                    .slice(0, 15)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProductToAdd(p)}
                        className={`w-full p-2.5 text-left text-xs flex items-center justify-between transition-colors ${selectedProductToAdd?.id === p.id
                            ? "bg-blue-50 text-blue-900 font-bold"
                            : "hover:bg-gray-50 text-gray-700"
                          }`}
                      >
                        <div className="flex flex-col">
                          <span>{p.name}</span>
                          <span className="text-[10px] text-gray-400">
                            Preço: R$ {Number(p.price).toFixed(2)} | Unid: {p.unit || "UN"}
                          </span>
                        </div>
                        {selectedProductToAdd?.id === p.id && (
                          <Check size={16} className="text-blue-600" />
                        )}
                      </button>
                    ))}
                </div>
              </div>

              {selectedProductToAdd && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold text-blue-800 uppercase">Item Selecionado:</span>
                  <p className="font-bold text-gray-900">{selectedProductToAdd.name}</p>
                  <p className="text-gray-600 text-[11px]">
                    Será cadastrado com Código Balança: <strong className="font-mono text-blue-800">{addGeneratedCode}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAddToScale}
                disabled={addingToScale || !selectedProductToAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20"
              >
                {addingToScale ? "Salvando..." : "Confirmar e Enviar para Balança"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar PLU / Validade */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Editar Código de Balança (PLU)</h3>
              <button onClick={() => setEditingProduct(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Produto
                </label>
                <p className="text-xs font-bold text-gray-900 bg-gray-50 p-2 rounded-xl border border-gray-200">
                  {editingProduct.name}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Código Balança / PLU (4 ou 5 dígitos)
                </label>
                <input
                  type="text"
                  value={editPlu}
                  onChange={(e) => setEditPlu(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 text-sm rounded-xl font-mono font-bold outline-none focus:border-amber-500"
                  placeholder="Ex: 50001 ou 60001"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Validade na Etiqueta (Dias)
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={editDays}
                  onChange={(e) => setEditDays(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 text-sm rounded-xl font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl text-xs shadow-md shadow-amber-500/20"
                >
                  {savingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Balança na Rede */}
      {isDeviceModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Cadastrar Balança na Rede</h3>
              <button onClick={() => setIsDeviceModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setDevices((prev) => [
                  {
                    id: Date.now().toString(),
                    name: f.get("name") as string,
                    desc: f.get("desc") as string,
                    ip: f.get("ip") as string,
                    lastSync: "Agora",
                    status: "Sincronizado",
                  },
                  ...prev,
                ]);
                setIsDeviceModalOpen(false);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Identificação / Nome
                </label>
                <input
                  name="name"
                  required
                  autoFocus
                  placeholder="Ex: Balança Açougue 02"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Setor / Localização
                </label>
                <input
                  name="desc"
                  required
                  placeholder="Ex: Carnes & Açougue"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  IP da Balança na Rede
                </label>
                <input
                  name="ip"
                  required
                  placeholder="Ex: 192.168.1.155"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 text-xs font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl shadow-md shadow-indigo-600/20 text-xs"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
