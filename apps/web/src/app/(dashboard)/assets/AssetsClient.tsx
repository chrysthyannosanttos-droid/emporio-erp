"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Shield, Package, Search, Plus, Filter, QrCode, Camera, Printer,
  Wrench, CheckCircle2, AlertTriangle, Clock, RefreshCw, X, Check,
  ChevronRight, ArrowUpDown, Trash2, Edit2, History, MapPin, Zap,
  DollarSign, FileText, ArrowLeft, Smartphone, PackagePlus
} from "lucide-react";
import Link from "next/link";
import {
  AssetDTO, AssetStats, createAsset, updateAsset,
  registerAssetAudit, addAssetMaintenance, getAssetDetails,
  searchProductsForAsset, convertProductToAsset
} from "@/actions/assets";

interface Props {
  initialAssets: AssetDTO[];
  initialStats: AssetStats;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  COMODATO: { label: "Equipamento em Comodato", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  AUTOMATION_IT: { label: "Balanças & PDV / TI", color: "bg-blue-50 text-blue-700 border-blue-200" },
  REFRIGERATION: { label: "Refrigeração & Frio", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  FOOD_PRODUCTION: { label: "Gastronomia & Cozinha", color: "bg-amber-50 text-amber-700 border-amber-200" },
  FURNITURE: { label: "Mobiliário & Gôndolas", color: "bg-purple-50 text-purple-700 border-purple-200" },
  VEHICLE: { label: "Veículos & Logística", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  BUILDING: { label: "Predial & Estrutura", color: "bg-slate-50 text-slate-700 border-slate-200" },
  OTHER: { label: "Outros", color: "bg-gray-50 text-gray-700 border-gray-200" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Em Operação", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  MAINTENANCE: { label: "Em Manutenção", color: "bg-rose-50 text-rose-700 border-rose-200" },
  STANDBY: { label: "Reserva Técnica", color: "bg-amber-50 text-amber-700 border-amber-200" },
  DISPOSED: { label: "Baixado / Sucata", color: "bg-gray-100 text-gray-600 border-gray-300" },
  LOST: { label: "Extraviado", color: "bg-red-100 text-red-800 border-red-300" },
};

const COMMON_LOCATIONS = [
  "SALÃO DE VENDAS",
  "FRENTE DE CAIXA",
  "AÇOUGUE",
  "PADARIA",
  "HORTIFRÚTI",
  "CÂMARA FRIA",
  "DEPÓSITO CENTRAL",
  "ADMINISTRAÇÃO",
  "RESTAURANTE / COZINHA",
];

export function AssetsClient({ initialAssets, initialStats }: Props) {
  const [assets, setAssets] = useState<AssetDTO[]>(initialAssets);
  const [stats, setStats] = useState<AssetStats>(initialStats);

  // Filtros
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedLocation, setSelectedLocation] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetDTO | null>(null);
  const [detailAsset, setDetailAsset] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [maintenanceAsset, setMaintenanceAsset] = useState<AssetDTO | null>(null);

  // Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form de cadastro / edição
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    category: "AUTOMATION_IT",
    serialNumber: "",
    brand: "",
    model: "",
    location: "SALÃO DE VENDAS",
    condition: "GOOD",
    acquisitionDate: new Date().toISOString().split("T")[0],
    acquisitionValue: "",
    depreciationRate: "10",
    supplier: "",
    invoiceNumber: "",
    warrantyExpiresAt: "",
    nextMaintenanceDate: "",
    responsibleName: "",
    notes: "",
  });
  const [savingAsset, setSavingAsset] = useState(false);

  // Form de Manutenção
  const [maintenanceForm, setMaintenanceForm] = useState({
    type: "PREVENTIVE",
    description: "",
    cost: "",
    provider: "",
    nextDueDate: "",
    notes: "",
    setAssetStatusActive: true,
  });
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  // Puxar do Catálogo de Produtos
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<any | null>(null);
  const [importForm, setImportForm] = useState({
    location: "SALÃO DE VENDAS",
    category: "AUTOMATION_IT",
    condition: "GOOD",
    depreciationRate: "10",
    removeFromStock: false,
  });
  const [savingImport, setSavingImport] = useState(false);

  // Busca produtos no catálogo ao abrir modal
  useEffect(() => {
    if (!isImportModalOpen) return;
    let cancelled = false;
    setLoadingCatalog(true);
    const timer = setTimeout(async () => {
      const res = await searchProductsForAsset(importSearch);
      if (!cancelled) {
        setCatalogProducts(res.products || []);
        setLoadingCatalog(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [importSearch, isImportModalOpen]);

  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogProduct) return;

    setSavingImport(true);
    const res = await convertProductToAsset({
      productId: selectedCatalogProduct.id,
      location: importForm.location,
      category: importForm.category,
      condition: importForm.condition,
      depreciationRate: parseFloat(importForm.depreciationRate) || 10,
      removeFromStock: importForm.removeFromStock,
    });

    setSavingImport(false);
    if (res.success && res.asset) {
      setAssets((prev) => [res.asset!, ...prev]);
      setStats((prev) => ({
        ...prev,
        totalAssets: prev.totalAssets + 1,
        totalAcquisitionValue: prev.totalAcquisitionValue + (res.asset?.acquisitionValue || 0),
        totalCurrentValue: prev.totalCurrentValue + (res.asset?.currentValue || 0),
      }));
      setIsImportModalOpen(false);
      setSelectedCatalogProduct(null);
      setFeedback({
        type: "success",
        message: `Item "${selectedCatalogProduct.name}" tombado com sucesso na plaqueta ${res.asset.code}!`,
      });
    } else {
      setFeedback({ type: "error", message: res.error || "Erro ao importar item." });
    }
  };

  // Auditoria móvel
  const [scannedLocation, setScannedLocation] = useState("SALÃO DE VENDAS");
  const [auditFeedback, setAuditFeedback] = useState<string | null>(null);

  // Filtragem dos ativos
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (selectedCategory !== "ALL" && a.category !== selectedCategory) return false;
      if (selectedLocation !== "ALL" && a.location !== selectedLocation) return false;
      if (selectedStatus !== "ALL" && a.status !== selectedStatus) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesCode = a.code.toLowerCase().includes(q);
        const matchesName = a.name.toLowerCase().includes(q);
        const matchesSerial = a.serialNumber?.toLowerCase().includes(q) ?? false;
        const matchesBrand = a.brand?.toLowerCase().includes(q) ?? false;
        const matchesLocation = a.location.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesSerial && !matchesBrand && !matchesLocation) {
          return false;
        }
      }

      return true;
    });
  }, [assets, search, selectedCategory, selectedLocation, selectedStatus]);

  // Abre detalhes
  const handleOpenDetails = async (a: AssetDTO) => {
    setLoadingDetail(true);
    setDetailAsset(null);
    const res = await getAssetDetails(a.id);
    setLoadingDetail(false);
    if (res.asset) {
      setDetailAsset(res.asset);
    }
  };

  // Salvar novo ativo
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSavingAsset(true);
    const val = parseFloat(formData.acquisitionValue.replace(",", ".")) || 0;
    const rate = parseFloat(formData.depreciationRate) || 10;

    if (editingAsset) {
      const res = await updateAsset(editingAsset.id, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        serialNumber: formData.serialNumber,
        brand: formData.brand,
        model: formData.model,
        location: formData.location,
        condition: formData.condition,
        acquisitionValue: val,
        depreciationRate: rate,
        supplier: formData.supplier,
        invoiceNumber: formData.invoiceNumber,
        warrantyExpiresAt: formData.warrantyExpiresAt || undefined,
        nextMaintenanceDate: formData.nextMaintenanceDate || undefined,
        responsibleName: formData.responsibleName,
        notes: formData.notes,
      });

      setSavingAsset(false);
      if (res.success) {
        setAssets((prev) =>
          prev.map((item) => (item.id === editingAsset.id ? { ...item, ...formData, acquisitionValue: val, depreciationRate: rate } : item))
        );
        setIsCreateModalOpen(false);
        setEditingAsset(null);
        setFeedback({ type: "success", message: `Ativo "${formData.name}" atualizado!` });
      } else {
        setFeedback({ type: "error", message: res.error || "Erro ao atualizar." });
      }
    } else {
      const res = await createAsset({
        code: formData.code.trim() || undefined,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        serialNumber: formData.serialNumber,
        brand: formData.brand,
        model: formData.model,
        location: formData.location,
        condition: formData.condition,
        acquisitionDate: formData.acquisitionDate,
        acquisitionValue: val,
        depreciationRate: rate,
        supplier: formData.supplier,
        invoiceNumber: formData.invoiceNumber,
        warrantyExpiresAt: formData.warrantyExpiresAt || undefined,
        nextMaintenanceDate: formData.nextMaintenanceDate || undefined,
        responsibleName: formData.responsibleName,
        notes: formData.notes,
      });

      setSavingAsset(false);
      if (res.success && res.asset) {
        setAssets((prev) => [res.asset!, ...prev]);
        setStats((prev) => ({
          ...prev,
          totalAssets: prev.totalAssets + 1,
          totalAcquisitionValue: prev.totalAcquisitionValue + val,
          totalCurrentValue: prev.totalCurrentValue + (res.asset?.currentValue || val),
        }));
        setIsCreateModalOpen(false);
        setFeedback({ type: "success", message: `Ativo tombado com sucesso! Plaqueta: ${res.asset.code}` });
      } else {
        setFeedback({ type: "error", message: res.error || "Erro ao cadastrar bem." });
      }
    }
  };

  // Salvar manutenção
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceAsset || !maintenanceForm.description.trim()) return;

    setSavingMaintenance(true);
    const cost = parseFloat(maintenanceForm.cost.replace(",", ".")) || 0;

    const res = await addAssetMaintenance({
      assetId: maintenanceAsset.id,
      type: maintenanceForm.type,
      description: maintenanceForm.description,
      cost,
      provider: maintenanceForm.provider,
      nextDueDate: maintenanceForm.nextDueDate || undefined,
      notes: maintenanceForm.notes,
      setAssetStatusActive: maintenanceForm.setAssetStatusActive,
    });

    setSavingMaintenance(false);
    if (res.success) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === maintenanceAsset.id
            ? {
                ...a,
                status: maintenanceForm.setAssetStatusActive ? "ACTIVE" : a.status,
                nextMaintenanceDate: maintenanceForm.nextDueDate || a.nextMaintenanceDate,
                maintenancesCount: (a.maintenancesCount || 0) + 1,
              }
            : a
        )
      );
      setMaintenanceAsset(null);
      setFeedback({ type: "success", message: "Manutenção registrada com sucesso!" });
    } else {
      setFeedback({ type: "error", message: res.error || "Erro ao registrar manutenção." });
    }
  };

  // Callback de leitura do Scanner na Auditoria Móvel
  const handleScanAudit = async (code: string) => {
    const res = await registerAssetAudit({
      codeOrQr: code,
      scannedLocation,
    });

    if (res.success && res.asset) {
      setAuditFeedback(res.message);
      setAssets((prev) =>
        prev.map((a) => (a.id === res.asset!.id ? { ...a, location: scannedLocation, lastInventoryDate: new Date().toISOString().split("T")[0] } : a))
      );
      setTimeout(() => setAuditFeedback(null), 3000);
    } else {
      setAuditFeedback(res.message);
      setTimeout(() => setAuditFeedback(null), 3500);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-16 max-w-7xl mx-auto px-2 sm:px-4 md:px-0 select-none animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/stock"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Voltar ao Estoque"
            >
              <ArrowLeft size={18} />
            </Link>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Gestão Patrimonial & Ativo Fixo
            </span>
            <span className="inline-flex md:hidden items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              <Smartphone size={10} /> Mobile Scanner
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Controle de Ativo Imobilizado
          </h1>
          <p className="text-xs text-slate-400">
            Tombamento, etiquetas QR Code, cálculo contábil de depreciação, manutenções IPEM e auditoria por celular.
          </p>
        </div>

        {/* Botões de Ação Principal */}
        <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
          {/* Botão de Auditoria Móvel */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Bipar plaqueta pelo celular para conferir o setor"
          >
            <Camera size={16} />
            <span>Auditoria Móvel</span>
          </button>

          {/* Imprimir Etiquetas QR Code */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Gerar etiquetas patrimoniais com QR Code para impressão"
          >
            <Printer size={16} />
            <span>Etiquetas QR</span>
          </button>

          {/* Puxar do Catálogo de Produtos */}
          <button
            type="button"
            onClick={() => {
              setIsImportModalOpen(true);
              setImportSearch("");
              setSelectedCatalogProduct(null);
            }}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Selecionar um item cadastrado nos produtos para tombar como Ativo Imobilizado"
          >
            <PackagePlus size={16} />
            <span>Puxar do Catálogo</span>
          </button>

          {/* Novo Bem */}
          <button
            type="button"
            onClick={() => {
              setEditingAsset(null);
              setFormData({
                code: "",
                name: "",
                description: "",
                category: "AUTOMATION_IT",
                serialNumber: "",
                brand: "",
                model: "",
                location: "SALÃO DE VENDAS",
                condition: "GOOD",
                acquisitionDate: new Date().toISOString().split("T")[0],
                acquisitionValue: "",
                depreciationRate: "10",
                supplier: "",
                invoiceNumber: "",
                warrantyExpiresAt: "",
                nextMaintenanceDate: "",
                responsibleName: "",
                notes: "",
              });
              setIsCreateModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Novo Ativo</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Financeiras & Patrimoniais */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total de Bens</span>
            <Shield size={16} className="text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.totalAssets}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Ativos cadastrados</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Custo de Aquisição</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <div className="text-base sm:text-xl font-black text-slate-900 truncate">
            R$ {stats.totalAcquisitionValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Valor histórico investido</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Valor Atual (Residual)</span>
            <FileText size={16} className="text-indigo-600" />
          </div>
          <div className="text-base sm:text-xl font-black text-indigo-700 truncate">
            R$ {stats.totalCurrentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Pós-depreciação contábil</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Depreciação Acum.</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-base sm:text-xl font-black text-amber-700 truncate">
            -R$ {stats.totalDepreciated.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Desgaste apurado no DRE</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Manutenção & Vistoria</span>
            <Wrench size={16} className="text-rose-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black text-rose-600">{stats.inMaintenanceCount}</span>
            <span className="text-xs text-slate-400">em reparo /</span>
            <span className="text-xl sm:text-2xl font-black text-amber-600">{stats.pendingAuditCount}</span>
            <span className="text-xs text-slate-400">pendentes</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Revisões preventivas</p>
        </div>
      </div>

      {/* Alerta de feedback */}
      {feedback && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between animate-in slide-in-from-top-2 border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por plaqueta (PAT-0001), nome, marca, serial ou setor..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Categoria */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-3 py-2.5 rounded-xl outline-none"
            >
              <option value="ALL">Todas as Categorias</option>
              <option value="AUTOMATION_IT">Balanças & PDV / TI</option>
              <option value="REFRIGERATION">Refrigeração & Frio</option>
              <option value="FOOD_PRODUCTION">Gastronomia & Cozinha</option>
              <option value="FURNITURE">Mobiliário & Gôndolas</option>
              <option value="VEHICLE">Veículos & Logística</option>
              <option value="BUILDING">Predial & Outros</option>
            </select>

            {/* Setor */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-3 py-2.5 rounded-xl outline-none"
            >
              <option value="ALL">Todos os Setores</option>
              {COMMON_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-3 py-2.5 rounded-xl outline-none"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Em Operação</option>
              <option value="MAINTENANCE">Em Manutenção</option>
              <option value="STANDBY">Reserva Técnica</option>
              <option value="DISPOSED">Baixado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Ativos */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
            Bens Patrimoniais
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {filteredAssets.length} de {assets.length}
            </span>
          </h2>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Shield size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-700">Nenhum bem patrimonial encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cadastre novos equipamentos ou ajuste os filtros de busca para visualizar os ativos do Empório.
            </p>
          </div>
        ) : (
          <>
            {/* 1. CARDS TÁTEIS PARA SMARTPHONES (md:hidden) */}
            <div className="block md:hidden divide-y divide-slate-100 p-2 sm:p-3 space-y-2">
              {filteredAssets.map((a) => {
                const cat = CATEGORY_LABELS[a.category] || CATEGORY_LABELS.OTHER;
                const st = STATUS_LABELS[a.status] || STATUS_LABELS.ACTIVE;

                return (
                  <div key={a.id} className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-black px-2 py-0.5 bg-slate-900 text-amber-400 rounded-md">
                            {a.code}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cat.color}`}>
                            {cat.label}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${st.color}`}>
                            {st.label}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1 leading-snug">
                          {a.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{a.location}</span>
                          {a.brand && <span className="text-slate-400">• {a.brand} {a.model || ""}</span>}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenDetails(a)}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl"
                        title="Ver detalhes"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    {/* Valores de Aquisição e Residual */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Compra Original</span>
                        <span className="font-bold text-slate-700">R$ {a.acquisitionValue.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Contábil Atual</span>
                        <span className="font-black text-indigo-700">R$ {a.currentValue.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Ações Rápidas no Smartphone */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMaintenanceAsset(a);
                          setMaintenanceForm({
                            type: "PREVENTIVE",
                            description: "",
                            cost: "",
                            provider: "",
                            nextDueDate: "",
                            notes: "",
                            setAssetStatusActive: true,
                          });
                        }}
                        className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                      >
                        <Wrench size={14} />
                        <span>Manutenção</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingAsset(a);
                          setFormData({
                            code: a.code,
                            name: a.name,
                            description: a.description || "",
                            category: a.category,
                            serialNumber: a.serialNumber || "",
                            brand: a.brand || "",
                            model: a.model || "",
                            location: a.location,
                            condition: a.condition,
                            acquisitionDate: a.acquisitionDate,
                            acquisitionValue: String(a.acquisitionValue),
                            depreciationRate: String(a.depreciationRate),
                            supplier: a.supplier || "",
                            invoiceNumber: a.invoiceNumber || "",
                            warrantyExpiresAt: a.warrantyExpiresAt || "",
                            nextMaintenanceDate: a.nextMaintenanceDate || "",
                            responsibleName: a.responsibleName || "",
                            notes: a.notes || "",
                          });
                          setIsCreateModalOpen(true);
                        }}
                        className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                        title="Editar Ativo"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. TABELA COMPLETA PARA COMPUTADOR / DESKTOP (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Plaqueta / QR</th>
                    <th className="py-3 px-4">Equipamento / Bem</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Setor Alocado</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Valor Compra</th>
                    <th className="py-3 px-4 text-right">Valor Atual</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAssets.map((a) => {
                    const cat = CATEGORY_LABELS[a.category] || CATEGORY_LABELS.OTHER;
                    const st = STATUS_LABELS[a.status] || STATUS_LABELS.ACTIVE;

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-black px-2 py-0.5 bg-slate-900 text-amber-400 rounded-md">
                            {a.code}
                          </span>
                          {a.serialNumber && (
                            <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                              S/N: {a.serialNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{a.name}</span>
                          <span className="text-xs text-slate-400">
                            {a.brand ? `${a.brand} ` : ""}{a.model || ""}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${cat.color}`}>
                            {cat.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <MapPin size={13} className="text-slate-400 shrink-0" />
                            {a.location}
                          </span>
                          {a.responsibleName && (
                            <span className="text-[11px] text-slate-400 block">
                              Resp: {a.responsibleName}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          R$ {a.acquisitionValue.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                          R$ {a.currentValue.toFixed(2).replace(".", ",")}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            (-{Math.round((a.accumulatedDepreciation / (a.acquisitionValue || 1)) * 100)}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(a)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Histórico e Auditorias"
                            >
                              <History size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMaintenanceAsset(a);
                                setMaintenanceForm({
                                  type: "PREVENTIVE",
                                  description: "",
                                  cost: "",
                                  provider: "",
                                  nextDueDate: "",
                                  notes: "",
                                  setAssetStatusActive: true,
                                });
                              }}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Registrar Manutenção"
                            >
                              <Wrench size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAsset(a);
                                setFormData({
                                  code: a.code,
                                  name: a.name,
                                  description: a.description || "",
                                  category: a.category,
                                  serialNumber: a.serialNumber || "",
                                  brand: a.brand || "",
                                  model: a.model || "",
                                  location: a.location,
                                  condition: a.condition,
                                  acquisitionDate: a.acquisitionDate,
                                  acquisitionValue: String(a.acquisitionValue),
                                  depreciationRate: String(a.depreciationRate),
                                  supplier: a.supplier || "",
                                  invoiceNumber: a.invoiceNumber || "",
                                  warrantyExpiresAt: a.warrantyExpiresAt || "",
                                  nextMaintenanceDate: a.nextMaintenanceDate || "",
                                  responsibleName: a.responsibleName || "",
                                  notes: a.notes || "",
                                });
                                setIsCreateModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL 1: CADASTRO / EDIÇÃO DE ATIVO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingAsset ? `Editar Ativo (${editingAsset.code})` : "Tombamento de Novo Bem Patrimonial"}
                </h3>
                <p className="text-xs text-slate-400">
                  Identificação física, alocação de setor e parâmetros contábeis.
                </p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Plaqueta / Código
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Auto (ex: PAT-0001)"
                    disabled={!!editingAsset}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold uppercase disabled:bg-slate-100"
                  />
                  <span className="text-[10px] text-slate-400">Deixe vazio para gerar auto</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nome do Bem / Equipamento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Balança Computadora Toledo Prix 5 Plus"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    <option value="AUTOMATION_IT">Balanças & PDV / TI</option>
                    <option value="REFRIGERATION">Refrigeração & Frio</option>
                    <option value="FOOD_PRODUCTION">Gastronomia & Cozinha</option>
                    <option value="FURNITURE">Mobiliário & Gôndolas</option>
                    <option value="VEHICLE">Veículos & Logística</option>
                    <option value="BUILDING">Predial & Outros</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Setor Alocado *</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    {COMMON_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Estado de Conservação</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    <option value="NEW">Novo / Excelente</option>
                    <option value="GOOD">Bom Estado</option>
                    <option value="FAIR">Regular / Desgaste Natural</option>
                    <option value="POOR">Ruim / Requer Reparo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Marca</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ex: Toledo, Gelopar, Hobart"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Modelo</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Ex: Prix 5 Plus"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Número de Série (Serial)</label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="Chassi / Serial"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Informações Financeiras & Depreciação */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                  Financeiro & Depreciação Contábil
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Valor de Aquisição (R$)</label>
                    <input
                      type="text"
                      value={formData.acquisitionValue}
                      onChange={(e) => setFormData({ ...formData, acquisitionValue: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Data de Aquisição</label>
                    <input
                      type="date"
                      value={formData.acquisitionDate}
                      onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Taxa Depreciação (%/ano)</label>
                    <select
                      value={formData.depreciationRate}
                      onChange={(e) => setFormData({ ...formData, depreciationRate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                    >
                      <option value="10">10% / ano (10 anos - Máquinas e Móveis)</option>
                      <option value="20">20% / ano (5 anos - Balanças / TI / Veículos)</option>
                      <option value="4">4% / ano (25 anos - Instalações Prediais)</option>
                      <option value="0">0% (Sem depreciação)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Fornecedor</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Empresa fornecedora"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nota Fiscal de Entrada</label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      placeholder="Número da NF-e"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAsset}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  {savingAsset ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{editingAsset ? "Atualizar Ativo" : "Gravar Tombamento"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AUDITORIA MÓVEL COM CÂMERA (Mobile Scanner de Patrimônio) */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-3 sm:p-4 text-white border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base">Auditoria Móvel de Patrimônio</h3>
                <p className="text-[11px] text-slate-400">Bipe a plaqueta ou QR Code colado no bem</p>
              </div>
            </div>
            <button
              onClick={() => setIsScannerOpen(false)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Seletor de Setor da Vistoria */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs flex items-center gap-2">
            <span className="text-slate-400 font-bold shrink-0">Setor sendo vistoriado:</span>
            <select
              value={scannedLocation}
              onChange={(e) => setScannedLocation(e.target.value)}
              className="bg-slate-800 text-amber-400 font-bold border border-slate-700 rounded-lg px-2.5 py-1.5 outline-none flex-1"
            >
              {COMMON_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Scanner Câmera & Input Rápido */}
          <AssetCameraScanner
            scannedLocation={scannedLocation}
            onDetected={handleScanAudit}
          />

          {auditFeedback && (
            <div className="p-3 bg-emerald-600 text-white text-xs font-bold text-center animate-in slide-in-from-bottom-2">
              {auditFeedback}
            </div>
          )}
        </div>
      )}

      {/* MODAL 3: REGISTRO DE MANUTENÇÃO & IPEM */}
      {maintenanceAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Manutenção & Calibração
                </h3>
                <p className="text-xs text-slate-400">
                  {maintenanceAsset.name} ({maintenanceAsset.code})
                </p>
              </div>
              <button onClick={() => setMaintenanceAsset(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tipo de Serviço</label>
                <select
                  value={maintenanceForm.type}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                >
                  <option value="PREVENTIVE">Manutenção Preventiva (Revisão Periódica)</option>
                  <option value="CORRECTIVE">Manutenção Corretiva (Conserto / Peças)</option>
                  <option value="CALIBRATION_IPEM">Calibração & Aferição Oficial (IPEM / Inmetro)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Descrição do Serviço Realizado *</label>
                <textarea
                  required
                  rows={2}
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  placeholder="Ex: Troca da célula de carga e lacre do IPEM / Carga de gás da câmara fria..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Custo do Serviço (R$)</label>
                  <input
                    type="text"
                    value={maintenanceForm.cost}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prestador / Técnico</label>
                  <input
                    type="text"
                    value={maintenanceForm.provider}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, provider: e.target.value })}
                    placeholder="Ex: Toledo do Brasil / Refrigeração Silva"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Próxima Revisão / Vencimento IPEM</label>
                <input
                  type="date"
                  value={maintenanceForm.nextDueDate}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, nextDueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceForm.setAssetStatusActive}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, setAssetStatusActive: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span>Definir status do ativo como &quot;Em Operação&quot;</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMaintenanceAsset(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMaintenance}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  {savingMaintenance ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Salvar Manutenção</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DETALHES COMPLETOS & HISTÓRICO */}
      {detailAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-black px-2 py-0.5 bg-slate-900 text-amber-400 rounded-md">
                  {detailAsset.code}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {detailAsset.name}
                </h3>
              </div>
              <button onClick={() => setDetailAsset(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            {/* Ficha Resumida */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Setor</span>
                <span className="font-bold text-slate-800">{detailAsset.location}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor Histórico</span>
                <span className="font-bold text-slate-800">R$ {detailAsset.acquisitionValue.toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor Atual</span>
                <span className="font-black text-indigo-700">R$ {detailAsset.currentValue.toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Depreciação</span>
                <span className="font-bold text-amber-700">{detailAsset.depreciationRate}% ao ano</span>
              </div>
            </div>

            {/* Histórico de Manutenções */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Histórico de Manutenções ({detailAsset.maintenances?.length || 0})
              </h4>
              {detailAsset.maintenances && detailAsset.maintenances.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {detailAsset.maintenances.map((m: any) => (
                    <div key={m.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-800 block">{m.description}</span>
                        <span className="text-[10px] text-slate-500">
                          {m.type === "CALIBRATION_IPEM" ? "IPEM/Inmetro" : m.type} • {m.performedAt} • {m.provider || "Interno"}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-700">R$ {m.cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhuma manutenção registrada para este ativo.</p>
              )}
            </div>

            {/* Histórico de Auditorias Móveis */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Auditorias / Vistorias Físicas ({detailAsset.audits?.length || 0})
              </h4>
              {detailAsset.audits && detailAsset.audits.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {detailAsset.audits.map((au: any) => (
                    <div key={au.id} className="p-2 bg-slate-50 rounded-xl border border-slate-200/60 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800 block">Vistoriado em: {au.scannedLocation}</span>
                        <span className="text-[10px] text-slate-400">Por {au.operatorName} em {au.createdAt}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        {au.condition}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhuma auditoria móvel realizada ainda.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: IMPRESSÃO DE ETIQUETAS PATRIMONIAIS COM QR CODE */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Impressão de Plaquetas & Etiquetas Patrimoniais
                </h3>
                <p className="text-xs text-slate-400">
                  Gere etiquetas para colar nos equipamentos com QR Code escaneável.
                </p>
              </div>
              <button onClick={() => setIsPrintModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
              {filteredAssets.map((a) => (
                <div key={a.id} className="border-2 border-slate-800 rounded-xl p-3 bg-white text-slate-900 space-y-1 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      EMPÓRIO AGROBELÉM
                    </span>
                    <span className="font-mono text-xs font-black bg-slate-900 text-amber-400 px-2 py-0.5 rounded">
                      {a.code}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    {/* QR Code Simulado / Renderizado */}
                    <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded-lg flex flex-col items-center justify-center shrink-0">
                      <QrCode size={40} className="text-slate-800" />
                      <span className="text-[8px] font-mono font-bold text-slate-500">SCAN ME</span>
                    </div>

                    <div className="space-y-0.5 overflow-hidden">
                      <h4 className="font-black text-xs text-slate-900 truncate">{a.name}</h4>
                      <p className="text-[10px] text-slate-500 truncate">
                        Setor: <strong>{a.location}</strong>
                      </p>
                      {a.serialNumber && (
                        <p className="text-[10px] font-mono text-slate-400 truncate">
                          S/N: {a.serialNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Pronto para imprimir {filteredAssets.length} etiquetas.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  <Printer size={16} />
                  <span>Imprimir Agora</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: PUXAR DO CATÁLOGO DE PRODUTOS / ESTOQUE */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <PackagePlus size={20} className="text-indigo-600" />
                  <span>Puxar Item do Catálogo / Estoque</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Selecione um produto cadastrado para tombar como Ativo Imobilizado.
                </p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmImport} className="space-y-4">
              {/* Barra de Busca de Produtos */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  1. Localizar Produto no Catálogo
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    value={importSearch}
                    onChange={(e) => setImportSearch(e.target.value)}
                    placeholder="Buscar por nome, código interno (PLU) ou código de barras..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-600 outline-none"
                  />
                  {loadingCatalog && (
                    <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" />
                  )}
                </div>
              </div>

              {/* Lista de Seleção de Produtos */}
              <div className="border border-slate-200 rounded-2xl max-h-52 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                {catalogProducts.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">
                    {loadingCatalog ? "Carregando catálogo..." : "Nenhum produto encontrado com esse nome."}
                  </p>
                ) : (
                  catalogProducts.map((p) => {
                    const isSelected = selectedCatalogProduct?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedCatalogProduct(p)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                          isSelected ? "bg-indigo-50 border-l-4 border-indigo-600" : "hover:bg-white"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                              PLU #{p.internalCode || "SEM PLU"}
                            </span>
                            <span className="font-bold text-slate-900">{p.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            Cat: {p.categoryName} • Estoque Atual: {p.stock} {p.unit}
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="font-bold text-slate-800 block">
                            R$ {p.cost.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-slate-400">custo</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Item Selecionado e Configurações de Tombamento */}
              {selectedCatalogProduct && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-900">
                      Item Selecionado: {selectedCatalogProduct.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-indigo-700">
                      R$ {selectedCatalogProduct.cost.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Setor Destino *</label>
                      <select
                        value={importForm.location}
                        onChange={(e) => setImportForm({ ...importForm, location: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                      >
                        {COMMON_LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Categoria Patrimonial</label>
                      <select
                        value={importForm.category}
                        onChange={(e) => setImportForm({ ...importForm, category: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                      >
                        <option value="AUTOMATION_IT">Balanças & PDV / TI</option>
                        <option value="REFRIGERATION">Refrigeração & Frio</option>
                        <option value="FOOD_PRODUCTION">Gastronomia & Cozinha</option>
                        <option value="FURNITURE">Mobiliário & Gôndolas</option>
                        <option value="VEHICLE">Veículos & Logística</option>
                        <option value="BUILDING">Predial & Outros</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importForm.removeFromStock}
                        onChange={(e) => setImportForm({ ...importForm, removeFromStock: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      <span>Dar baixa de 1 unidade no estoque de revenda</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedCatalogProduct || savingImport}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {savingImport ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Confirmar Tombamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Scanner de Câmera de Patrimônio ───────────────────────── */
function AssetCameraScanner({
  scannedLocation,
  onDetected,
}: {
  scannedLocation: string;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualCode, setManualCode] = useState("");
  const [hasCamera, setHasCamera] = useState(false);
  const [lastBip, setLastBip] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const startCamera = async () => {
      try {
        const Detector = (window as any).BarcodeDetector;
        if (!Detector) {
          setHasCamera(false);
          return;
        }

        setHasCamera(true);
        const detector = new Detector({
          formats: ["qr_code", "code_128", "code_39", "ean_13"],
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        let cooldown = false;
        timer = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2 || cooldown) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              const detected = codes[0].rawValue;
              setLastBip(detected);
              cooldown = true;
              onDetected(detected);
              setTimeout(() => {
                cooldown = false;
              }, 1200);
            }
          } catch {}
        }, 200);
      } catch {
        setHasCamera(false);
      }
    };

    startCamera();

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onDetected(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 max-w-md mx-auto w-full">
      {hasCamera ? (
        <div className="relative h-64 w-full bg-black rounded-3xl overflow-hidden flex items-center justify-center border-2 border-slate-700">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <div className="relative w-48 h-48 border-4 border-amber-400 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]">
            <div className="w-full h-0.5 bg-red-500 animate-pulse" />
            {lastBip && (
              <span className="absolute -top-9 bg-amber-500 text-slate-950 font-bold text-xs px-2.5 py-0.5 rounded-full animate-bounce">
                Bipado: {lastBip}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400 space-y-1">
          <QrCode size={48} className="mx-auto text-amber-400" />
          <h4 className="font-bold text-white text-sm">Leitor Manual de Plaqueta</h4>
          <p className="text-xs text-slate-500">Digite a plaqueta (ex: PAT-0001)</p>
        </div>
      )}

      {/* Entrada manual por código */}
      <form onSubmit={handleManualSubmit} className="space-y-2 mt-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Digite a plaqueta (ex: PAT-0001)..."
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 text-white font-mono font-bold rounded-xl text-sm focus:border-amber-400 outline-none"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl"
          >
            Vistoriar
          </button>
        </div>
        <p className="text-[10px] text-slate-500 text-center">
          O bem será confirmado ou transferido automaticamente para: <strong>{scannedLocation}</strong>
        </p>
      </form>
    </div>
  );
}

