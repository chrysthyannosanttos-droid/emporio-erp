"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart2,
  ShoppingBag,
  Package,
  FolderTree,
  Tag,
  Users,
  Settings,
  Plus,
  Search,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Truck,
  Utensils,
  Store,
  Clock,
  AlertTriangle,
  Sparkles,
  X,
  Upload,
  Power,
  Phone,
  MapPin,
  CreditCard,
  ShieldCheck,
  Key,
  Lock,
} from "lucide-react";
import {
  EmporioLogo,
  STORE_RURAL_PRESETS,
  DEFAULT_EMPORIO_BANNER_SLIDES,
  parseStoreBannerSlides,
  StoreBannerSlide,
  resolveCategoryImage,
  resolveProductImage,
  resizeImageFileToDataUrl,
} from "@/components/EmporioStoreBrand";
import {
  getStoreAdminDashboardData,
  upsertStoreProduct,
  deleteStoreProduct,
  upsertStoreCategory,
  reorderStoreCategory,
  deleteStoreCategory,
  upsertStorePromotion,
  clearStorePromotion,
  updateStoreSettings,
} from "@/actions/store";
import {
  saveAndValidatePaymentGateway,
  getCompanyPaymentGateways,
  togglePaymentGatewayActive,
} from "@/actions/paymentGateway";
import {
  approveDigitalMenuOrder,
  rejectDigitalMenuOrder,
  advanceDigitalMenuOrderStatus,
  toggleProductDigitalMenu,
  deleteDigitalMenuOrders,
} from "@/actions/order";

type AdminTab =
  | "dashboard"
  | "orders"
  | "products"
  | "categories"
  | "promotions"
  | "customers"
  | "gateways"
  | "settings";

function fmtBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso?: string | null) {
  if (!iso) return "---";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const ORDER_STATUS_META: Record<string, { label: string; badge: string }> = {
  PENDING_APPROVAL: { label: "Novo", badge: "bg-amber-100 text-amber-800 border-amber-300" },
  CONFIRMED: { label: "Confirmado", badge: "bg-blue-100 text-blue-800 border-blue-300" },
  PREPARING: { label: "Preparando", badge: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  READY: { label: "Pronto p/ Retirada", badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  OUT_FOR_DELIVERY: { label: "Saiu para entrega", badge: "bg-sky-100 text-sky-800 border-sky-300" },
  DELIVERED: { label: "Entregue", badge: "bg-emerald-700 text-white border-emerald-700" },
  REJECTED: { label: "Recusado", badge: "bg-rose-100 text-rose-800 border-rose-300" },
  CANCELED: { label: "Cancelado", badge: "bg-slate-200 text-slate-700 border-slate-300" },
};

const STONE_SANDBOX_CSR = `-----BEGIN CERTIFICATE REQUEST-----
MIIC3jCCAcYCAQAwgZgxCzAJBgNVBAYTAkJSMRAwDgYDVQQIEwdBbGFnb2FzMQ4w
DAYDVQQHEwVCZWxlbTEfMB0GA1UEChMWRU1QT1JJTyBBR1JPQkVMRU0gTFREQTEj
MCEGA1UECxMaU3RvbmUgQmFhUyBUZXN0ZSAoU2FuZGJveCkxITAfBgNVBAMTGDY1
NTIyNDA5MDAwMTEzIC0gU2FuZGJveDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCC
AQoCggEBAKT/XMKGZvX0ddE+3nrEpZXRcUMyZZN+6Csr7y1rewInCYIEn1iW/+3/
2+wLfkTvB+Oh69QwAg+7h39URNPSEFordtle+dSSxCmBZvbFluZr11d9PRkSaFBy
ZQ8B+RLU2EqETfxNLaIkjHYc08DNVr/fNbZ2T1wrX2MtkqWvrH9/Z2Hxna/OUhdP
Fuc1gttkMpNm7hahfezi2MwzOzjV4u8+Bwk++D9Ob3ZiwkpvJC5x9dKoOozw/73+
mpn7zxka+b0XWAdb3EitweuEGmRpzsF+TMXvsA3boJRz1tFIX3scfta7pIImCyvE
SeeCB8w6yHwybpANxbAfKIiqViMiVwMCAwEAAaAAMA0GCSqGSIb3DQEBCwUAA4IB
AQB5XXLMqd7kzxBAWFXLWFMGAM0I2kYXGUVjNufoGh1aa6jt3NDAO3lpT28fvClH
qHp3UhsxhmYJIiOP+nMZKV/Xseip8tBEGlJJoKjqBp+uEZyQW30H2wAiyREVPgD5
tWbPCxdj2RRXOu8qDfafpbNrrZgCitC0Mb727NyuY55NjcBvgielVgsewSBUCX8u
xArAFTwf+4/YgrJLdwyTz3Ja6w60hYvUq9QJWgILcFy41x9IJhzBO6zemGPMrsQI
ulT1w7Irs8OzPB47obvnKUS8mBJ/V/jUbjfGUbN/vIClse8HeKPngI3dN647v/m6
mqhOBQmjTm7I5pHmqpz46+db
-----END CERTIFICATE REQUEST-----`;

const STONE_PROD_CSR = `-----BEGIN CERTIFICATE REQUEST-----
MIICzTCCAbUCAQAwgYcxCzAJBgNVBAYTAkJSMRAwDgYDVQQIEwdBbGFnb2FzMQ4w
DAYDVQQHEwVCZWxlbTEfMB0GA1UEChMWRU1QT1JJTyBBR1JPQkVMRU0gTFREQTEc
MBoGA1UECxMTU3RvbmUgQmFhUyBQcm9kdWNhbzEXMBUGA1UEAxMONjU1MjI0MDkw
MDAxMTMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDb70w89dIiCUoX
j398GVghq8/bn/48V8q8y3oLjkukYtuWOpli68cIUaUC3aGhuhF5z3OvhDroA90h
by5/qiC25xQbX2TuwP0CjmvYolYMwXVUISymbxe5Jj8I2cpgmoLM0yMz7dHYTesn
ASnXW3CNO3DnKddJLh2Fbv8kios1XnHX4nGw9XfjlRl0n9rS5aDC5ci/j+pQKp5V
ntvOt6hj8z9tGkeIjFVqkbXBREAbdLzy1PPHxTDKgsS1pZYerpPtg3Zg58utJtBW
Lvvn925enG4gIWlHCjrNpBF5o/HCFOga6qY6c7SEJzRN7iz0hxVKtLE7NpFRZx+F
gvdP95RtAgMBAAGgADANBgkqhkiG9w0BAQsFAAOCAQEAvhFkXxLmXNcIyvfpfO4A
wTDFRuthpxnUbimLlcpe5QcOsMxAK/vLAWck9VcGAd3THIx83KKUt7jiZqH1VNje
dSuHeLmRR6ZjSkDOY0sMem17DP/CmnC2R0YwwFmJfRvOX5KIOzJu0gejgv6gMnmg
KDz0quiKoU+Wh3lP9AXuFkZg9oVjt5TFC5nwXtTyoAOW14Hf39hAu7sj7cdR4FOn
K1Dlr9S9z0jU1mGYZ6MQgIkQj27uBCs2EhvuFB/PAeaqULEvj81gspIDvfeoienS
41D2X7yquiH60lmawIKZcvz6RsgjoC+31TahWvH5zn0LoE6VcshUW+PZUh6s4GAU
3A==
-----END CERTIFICATE REQUEST-----`;

export default function EcommerceStoreAdminPage() {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [menuPath, setMenuPath] = useState("/loja/emporio");
  const [kpis, setKpis] = useState<any>({
    salesDay: 0,
    salesWeek: 0,
    salesMonth: 0,
    newOrdersCount: 0,
    inProgressOrdersCount: 0,
    totalProductsCount: 0,
    activeMenuProducts: 0,
    promoProductsCount: 0,
    lowStockProductsCount: 0,
  });
  const [chart7Days, setChart7Days] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Filters
  const [orderFilter, setOrderFilter] = useState<string>("ALL");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [deletingOrders, setDeletingOrders] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productCatFilter, setProductCatFilter] = useState("ALL");
  const [productOnlyActive, setProductOnlyActive] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  // Modals: Product
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<any | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodCatId, setProdCatId] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodPromoPrice, setProdPromoPrice] = useState("");
  const [prodStock, setProdStock] = useState("0");
  const [prodUnit, setProdUnit] = useState("UN");
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [prodShowInStore, setProdShowInStore] = useState(true);
  const [prodFeatured, setProdFeatured] = useState(false);

  // Modals: Category
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [catName, setCatName] = useState("");
  const [catImageUrl, setCatImageUrl] = useState("");
  const [catActive, setCatActive] = useState(true);
  const [viewingCatProducts, setViewingCatProducts] = useState<any | null>(null);

  // Modals: Promotion
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoProdId, setPromoProdId] = useState("");
  const [promoOldPrice, setPromoOldPrice] = useState("");
  const [promoNewPrice, setPromoNewPrice] = useState("");
  const [promoStart, setPromoStart] = useState("");
  const [promoEnd, setPromoEnd] = useState("");
  const [promoActive, setPromoActive] = useState(true);

  // Modals: Customer Orders History
  const [historyCustomer, setHistoryCustomer] = useState<any | null>(null);

  // Reject Order Modal
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Settings form state
  const [setStoreName, setSetStoreName] = useState("");
  const [setLogoUrl, setSetLogoUrl] = useState("");
  const [setBannerSlides, setSetBannerSlides] = useState<StoreBannerSlide[]>(DEFAULT_EMPORIO_BANNER_SLIDES);
  const [newBannerUrlInput, setNewBannerUrlInput] = useState("");
  const [setWhatsapp, setSetWhatsapp] = useState("");
  const [setPhone, setSetPhone] = useState("");
  const [setAddress, setSetAddress] = useState("");
  const [setHours, setSetHours] = useState("");
  const [setDeliveryFee, setSetDeliveryFee] = useState("0");
  const [setMinOrder, setSetMinOrder] = useState("0");
  const [setEta, setSetEta] = useState("30 a 50 min");
  const [setPayMethods, setSetPayMethods] = useState<string[]>(["PIX", "DINHEIRO", "CARTAO"]);
  const [setStoreInfo, setSetStoreInfo] = useState("");
  const [setNotes, setSetNotes] = useState("");
  const [setInstagram, setSetInstagram] = useState("");
  const [setFacebook, setSetFacebook] = useState("");
  const [setEnabled, setSetEnabled] = useState(true);

  // Payment Gateways state
  const [gateways, setGateways] = useState<any[]>([]);
  const [gwProvider, setGwProvider] = useState<string>("STONE");
  const [gwApiKey, setGwApiKey] = useState<string>("");
  const [gwPublicKey, setGwPublicKey] = useState<string>("");
  const [gwClientSecret, setGwClientSecret] = useState<string>("");
  const [gwPixKey, setGwPixKey] = useState<string>("65522409000113");
  const [gwSandbox, setGwSandbox] = useState<boolean>(false);
  const [showGwSecret, setShowGwSecret] = useState<boolean>(false);
  const [validatingGw, setValidatingGw] = useState<boolean>(false);
  const [csrTab, setCsrTab] = useState<"sandbox" | "prod">("sandbox");
  const [copiedCsr, setCopiedCsr] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const loadGateways = useCallback(async () => {
    try {
      const res = await getCompanyPaymentGateways();
      if (res.success && res.gateways) {
        setGateways(res.gateways);
        const active = res.gateways.find((g: any) => g.active) || res.gateways[0];
        if (active) {
          setGwProvider(active.provider);
          setGwApiKey(active.apiKeyMasked || "");
          setGwPublicKey(active.publicKey || "");
          setGwClientSecret(active.clientSecretMasked || "");
          setGwPixKey(active.pixKey || "65522409000113");
          setGwSandbox(Boolean(active.isSandbox));
        }
      }
    } catch {}
  }, []);

  const handleSaveAndValidateGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidatingGw(true);
    try {
      const res = await saveAndValidatePaymentGateway({
        provider: gwProvider as any,
        apiKey: gwApiKey.trim(),
        publicKey: gwPublicKey.trim() || undefined,
        clientSecret: gwClientSecret.trim() || undefined,
        pixKey: gwPixKey.trim() || undefined,
        isSandbox: gwSandbox,
        active: true,
      });
      if (res.success) {
        notify(`✓ ${res.message || "Gateway validado e ativado com sucesso!"}`);
      } else {
        notify(`Falha na validação: ${res.error}`);
      }
      await loadGateways();
    } catch (err: any) {
      notify(`Erro: ${err?.message || "Falha ao validar chave"}`);
    } finally {
      setValidatingGw(false);
    }
  };

  const handleToggleGwActive = async (provider: string, currentActive: boolean) => {
    setBusyId(`gw-${provider}`);
    try {
      const res = await togglePaymentGatewayActive(provider as any, !currentActive);
      if (res.success) {
        notify(res.message || "Status do gateway atualizado!");
        await loadGateways();
      } else {
        notify(res.error || "Erro ao atualizar gateway");
      }
    } catch (err: any) {
      notify(`Erro: ${err?.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyCsr = (text: string, label: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedCsr(label);
    notify(`✓ ${label} copiado para a área de transferência!`);
    setTimeout(() => setCopiedCsr(null), 2500);
  };

  const handleSelectGatewayToEdit = (gw: any) => {
    setGwProvider(gw.provider);
    setGwApiKey(gw.apiKeyMasked || gw.apiKey || "");
    setGwPublicKey(gw.publicKey || "");
    setGwClientSecret(gw.clientSecretMasked || gw.clientSecret || "");
    setGwPixKey(gw.pixKey || "65522409000113");
    setGwSandbox(Boolean(gw.isSandbox));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStoreAdminDashboardData();
      if ("error" in res && res.error) {
        notify(res.error);
        return;
      }
      if (res.menuPath) setMenuPath(res.menuPath);
      if (res.kpis) setKpis(res.kpis);
      if (res.chart7Days) setChart7Days(res.chart7Days);
      if (res.products) setProducts(res.products);
      if (res.categories) setCategories(res.categories);
      if (res.orders) setOrders(res.orders);
      if (res.customers) setCustomers(res.customers);
      if (res.company) {
        setCompany(res.company);
        setSetStoreName(res.company.fiscalConfig?.tradeName || res.company.name || "EMPÓRIO AGROBELÉM");
        setSetLogoUrl(res.company.theme?.logoPrincipal || "");
        setSetBannerSlides(parseStoreBannerSlides(res.company.digitalMenuBannerUrl));
        setSetWhatsapp(res.company.whatsapp || "");
        setSetPhone(res.company.phone || "");
        setSetAddress(res.company.address || "");
        setSetHours(res.company.digitalMenuHours || "");
        setSetDeliveryFee(String(res.company.digitalMenuDeliveryFee ?? 0));
        setSetMinOrder(String(res.company.digitalMenuMinOrder ?? 0));
        setSetEta(res.company.digitalMenuDeliveryEta || "30 a 50 min");
        setSetPayMethods(res.company.digitalMenuPaymentMethods || ["PIX", "DINHEIRO", "CARTAO"]);
        setSetStoreInfo(res.company.digitalMenuStoreInfo || "");
        setSetNotes(res.company.digitalMenuNotes || "");
        setSetInstagram(res.company.digitalMenuInstagram || "");
        setSetFacebook(res.company.digitalMenuFacebook || "");
        setSetEnabled(res.company.digitalMenuEnabled !== false);
      }
      await loadGateways();
    } finally {
      setLoading(false);
    }
  }, [loadGateways]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Atualização automática dos pedidos do Cardápio Digital (6s + evento de novo pedido)
  useEffect(() => {
    const onNewOrder = () => {
      void loadData();
    };
    window.addEventListener("digital-menu-new-order", onNewOrder);
    const interval = setInterval(() => {
      if (tab === "orders") {
        void loadData();
      }
    }, 6000);
    return () => {
      window.removeEventListener("digital-menu-new-order", onNewOrder);
      clearInterval(interval);
    };
  }, [tab, loadData]);

  const fullStoreUrl = useMemo(() => {
    if (typeof window === "undefined") return menuPath;
    return `${window.location.origin}${menuPath}`;
  }, [menuPath]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (productOnlyActive && !p.showInDigitalMenu) return false;
      if (productCatFilter !== "ALL" && p.categoryId !== productCatFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q)
      );
    });
  }, [products, productSearch, productCatFilter, productOnlyActive]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "ALL") return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  const promoProducts = useMemo(
    () =>
      products.filter(
        (p) => p.promoPrice !== null && Number(p.promoPrice) > 0 && Number(p.promoPrice) < Number(p.price)
      ),
    [products]
  );

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // Handlers: Product Modal
  const openNewProductModal = () => {
    setEditingProd(null);
    setProdName("");
    setProdDesc("");
    setProdCatId(categories[0]?.id || "");
    setProdPrice("");
    setProdPromoPrice("");
    setProdStock("0");
    setProdUnit("UN");
    setProdImageUrl("");
    setProdShowInStore(true);
    setProdFeatured(false);
    setProdModalOpen(true);
  };

  const openEditProductModal = (p: any) => {
    setEditingProd(p);
    setProdName(p.name || "");
    setProdDesc(p.description || "");
    setProdCatId(p.categoryId || "");
    setProdPrice(String(p.price ?? ""));
    setProdPromoPrice(p.promoPrice ? String(p.promoPrice) : "");
    setProdStock(String(p.stock ?? 0));
    setProdUnit(p.unit || "UN");
    setProdImageUrl(p.imageUrl || "");
    setProdShowInStore(Boolean(p.showInDigitalMenu));
    setProdFeatured(Boolean(p.featured));
    setProdModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId("save-prod");
    const res = await upsertStoreProduct({
      id: editingProd?.id,
      name: prodName,
      description: prodDesc,
      categoryId: prodCatId || null,
      price: parseFloat(prodPrice.replace(",", ".")) || 0,
      promoPrice: prodPromoPrice ? parseFloat(prodPromoPrice.replace(",", ".")) : null,
      stock: parseFloat(prodStock.replace(",", ".")) || 0,
      unit: prodUnit,
      imageUrl: prodImageUrl || null,
      showInDigitalMenu: prodShowInStore,
      featured: prodFeatured,
    });
    setBusyId(null);
    if (res.error) return notify(res.error);
    setProdModalOpen(false);
    notify(editingProd ? "Produto atualizado!" : "Produto adicionado à loja!");
    loadData();
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId("save-cat");
    const res = await upsertStoreCategory({
      id: editingCat?.id,
      name: catName,
      imageUrl: catImageUrl || null,
      active: catActive,
      sortOrder: editingCat?.sortOrder ?? categories.length + 1,
    });
    setBusyId(null);
    if (res.error) return notify(res.error);
    setCatModalOpen(false);
    notify(editingCat ? "Categoria atualizada!" : "Categoria criada!");
    loadData();
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId("save-promo");
    const res = await upsertStorePromotion({
      productId: promoProdId,
      oldPrice: parseFloat(promoOldPrice.replace(",", ".")) || 0,
      promoPrice: parseFloat(promoNewPrice.replace(",", ".")) || 0,
      startDate: promoStart || null,
      endDate: promoEnd || null,
      active: promoActive,
    });
    setBusyId(null);
    if (res.error) return notify(res.error);
    setPromoModalOpen(false);
    notify("Promoção salva com sucesso!");
    loadData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId("save-settings");
    const res = await updateStoreSettings({
      storeName: setStoreName,
      logoUrl: setLogoUrl,
      bannerUrl: JSON.stringify(setBannerSlides),
      whatsapp: setWhatsapp,
      phone: setPhone,
      address: setAddress,
      hours: setHours,
      deliveryFee: parseFloat(setDeliveryFee.replace(",", ".")) || 0,
      minOrder: parseFloat(setMinOrder.replace(",", ".")) || 0,
      deliveryEta: setEta,
      paymentMethods: setPayMethods,
      storeInfo: setStoreInfo,
      notes: setNotes,
      instagram: setInstagram,
      facebook: setFacebook,
      digitalMenuEnabled: setEnabled,
    });
    setBusyId(null);
    if (res.error) return notify(res.error);
    notify("Configurações da loja salvas!");
    loadData();
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFileToDataUrl(file);
      setter(dataUrl);
    } catch (err: any) {
      notify(err.message || "Erro ao carregar imagem.");
    }
  };

  const maxChartRevenue = Math.max(1, ...chart7Days.map((d) => Number(d.revenue || 0)));
  const maxChartOrders = Math.max(1, ...chart7Days.map((d) => Number(d.ordersCount || 0)));

  return (
    <div className="w-full flex flex-col gap-5 pb-16 select-none">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-[#0B5D2E] text-white px-4 py-2.5 rounded-2xl shadow-xl border border-emerald-400/30 text-xs font-bold flex items-center gap-2">
          <Check size={15} className="text-lime-300" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── CABEÇALHO DO PAINEL DA LOJA (IDENTIDADE EMPÓRIO AGROBELÉM) ── */}
      <div className="bg-gradient-to-r from-[#076F3A] to-[#0B5D2E] text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <EmporioLogo
            logoUrl={company?.theme?.logoPrincipal}
            storeName={company?.fiscalConfig?.tradeName || company?.name || "EMPÓRIO AGROBELÉM"}
            variant="light"
          />
          <div className="hidden sm:block border-l border-white/20 pl-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-lime-300 block">
              Painel Administrativo da Loja Online
            </span>
            <p className="text-xs text-emerald-100">
              Gerencie produtos, categorias, promoções, pedidos e aparência no celular.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(fullStoreUrl);
              setCopiedUrl(true);
              setTimeout(() => setCopiedUrl(false), 2000);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {copiedUrl ? <Check size={14} className="text-lime-300" /> : <Copy size={14} />}
            <span>{copiedUrl ? "Link Copiado!" : "Copiar Link da Loja"}</span>
          </button>
          <a
            href={menuPath}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-white hover:bg-lime-50 text-[#0B5D2E] text-xs font-black flex items-center gap-1.5 shadow-sm"
          >
            <ExternalLink size={14} /> Abrir Loja do Cliente
          </a>
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── NAVEGAÇÃO POR ABAS ── */}
      <div className="flex gap-1.5 overflow-x-auto bg-white p-1.5 rounded-2xl border border-emerald-100 shadow-2xs">
        {[
          { key: "dashboard" as AdminTab, label: "Dashboard", icon: <BarChart2 size={15} /> },
          {
            key: "orders" as AdminTab,
            label: `Pedidos (${kpis.newOrdersCount > 0 ? `${kpis.newOrdersCount} novos` : orders.length})`,
            icon: <ShoppingBag size={15} />,
          },
          { key: "products" as AdminTab, label: `Produtos (${kpis.activeMenuProducts}/${products.length})`, icon: <Package size={15} /> },
          { key: "categories" as AdminTab, label: `Categorias (${categories.length})`, icon: <FolderTree size={15} /> },
          { key: "promotions" as AdminTab, label: `Promoções (${promoProducts.length})`, icon: <Tag size={15} /> },
          { key: "customers" as AdminTab, label: `Clientes (${customers.length})`, icon: <Users size={15} /> },
          { key: "gateways" as AdminTab, label: "Pix Stone & Gateways", icon: <CreditCard size={15} /> },
          { key: "settings" as AdminTab, label: "Configurações da Loja", icon: <Settings size={15} /> },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              tab === t.key
                ? "bg-[#0B5D2E] text-white shadow-xs"
                : "text-slate-600 hover:bg-emerald-50 hover:text-[#0B5D2E]"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── ABA 1: DASHBOARD ── */}
      {tab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              { label: "Vendas do Dia", value: `R$ ${fmtBRL(kpis.salesDay)}`, cls: "text-[#0B5D2E]" },
              { label: "Vendas da Semana", value: `R$ ${fmtBRL(kpis.salesWeek)}`, cls: "text-[#0B5D2E]" },
              { label: "Vendas do Mês", value: `R$ ${fmtBRL(kpis.salesMonth)}`, cls: "text-[#0B5D2E]" },
              { label: "Pedidos Novos", value: String(kpis.newOrdersCount), cls: "text-amber-600" },
              { label: "Pedidos em Andamento", value: String(kpis.inProgressOrdersCount), cls: "text-indigo-600" },
              {
                label: "Produtos na Loja",
                value: `${kpis.activeMenuProducts} de ${kpis.totalProductsCount}`,
                cls: "text-slate-900",
              },
              { label: "Produtos em Promoção", value: String(kpis.promoProductsCount), cls: "text-rose-600" },
              { label: "Estoque Baixo", value: String(kpis.lowStockProductsCount), cls: "text-amber-700" },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-2xs"
              >
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {card.label}
                </span>
                <span className={`text-xl sm:text-2xl font-black font-mono mt-1 block ${card.cls}`}>
                  {card.value}
                </span>
              </div>
            ))}
          </div>

          {/* Gráficos simples de Vendas e Pedidos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-[#0B5D2E]">Faturamento — Últimos 7 dias</h3>
                <span className="text-[11px] font-bold text-slate-400">Vendas Loja Online</span>
              </div>
              <div className="h-44 flex items-end gap-2 pt-4">
                {chart7Days.map((d) => {
                  const pct = Math.max(6, Math.round((Number(d.revenue || 0) / maxChartRevenue) * 100));
                  return (
                    <div key={d.iso} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-[#0B5D2E]">
                        {d.revenue > 0 ? `R$${Math.round(d.revenue)}` : "-"}
                      </span>
                      <div className="w-full h-28 bg-emerald-50 rounded-xl flex items-end overflow-hidden p-1">
                        <div
                          style={{ height: `${d.revenue > 0 ? pct : 4}%` }}
                          className={`w-full rounded-lg transition-all ${
                            d.revenue > 0 ? "bg-[#0B5D2E]" : "bg-emerald-200"
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-[#0B5D2E]">Volume de Pedidos — Últimos 7 dias</h3>
                <span className="text-[11px] font-bold text-slate-400">Recebidos na Loja</span>
              </div>
              <div className="h-44 flex items-end gap-2 pt-4">
                {chart7Days.map((d) => {
                  const pct = Math.max(6, Math.round((Number(d.ordersCount || 0) / maxChartOrders) * 100));
                  return (
                    <div key={d.iso} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-emerald-700">
                        {d.ordersCount > 0 ? d.ordersCount : "-"}
                      </span>
                      <div className="w-full h-28 bg-lime-50 rounded-xl flex items-end overflow-hidden p-1">
                        <div
                          style={{ height: `${d.ordersCount > 0 ? pct : 4}%` }}
                          className={`w-full rounded-lg transition-all ${
                            d.ordersCount > 0 ? "bg-lime-600" : "bg-lime-200"
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {kpis.activeMenuProducts === 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-xs text-amber-950">
                  <strong>Sua loja ainda está sem produtos visíveis para os clientes.</strong> Vá na aba{" "}
                  <strong>Produtos</strong> para adicionar novos itens ou ativar os produtos já cadastrados no ERP.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab("products")}
                className="px-4 py-2 rounded-xl bg-[#0B5D2E] text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                Gerenciar Produtos
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ABA 2: PEDIDOS ── */}
      {tab === "orders" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-emerald-100">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "ALL", label: "Todos" },
                { key: "PENDING_APPROVAL", label: "Novos" },
                { key: "CONFIRMED", label: "Confirmados" },
                { key: "PREPARING", label: "Preparando" },
                { key: "OUT_FOR_DELIVERY", label: "Saiu p/ entrega" },
                { key: "DELIVERED", label: "Entregues" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setOrderFilter(f.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    orderFilter === f.key
                      ? "bg-[#0B5D2E] text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-emerald-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filteredOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const visibleIds = filteredOrders.map((o) => o.id);
                    const allSelected = visibleIds.every((id) => selectedOrderIds.includes(id));
                    if (allSelected) {
                      setSelectedOrderIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
                    } else {
                      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  {filteredOrders.every((o) => selectedOrderIds.includes(o.id))
                    ? "Desmarcar Todos"
                    : `Marcar Todos (${filteredOrders.length})`}
                </button>
              )}

              {selectedOrderIds.length > 0 && (
                <button
                  type="button"
                  disabled={deletingOrders}
                  onClick={async () => {
                    if (!confirm(`Deseja apagar ${selectedOrderIds.length} pedido(s) marcado(s)? Se já aprovados, o estoque será devolvido.`)) {
                      return;
                    }
                    setDeletingOrders(true);
                    const r = await deleteDigitalMenuOrders(selectedOrderIds);
                    setDeletingOrders(false);
                    if (r.error) {
                      notify(r.error);
                    } else {
                      notify(`${r.deletedCount || selectedOrderIds.length} pedido(s) apagado(s) com sucesso!`);
                      setSelectedOrderIds([]);
                      loadData();
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 size={13} />
                  {deletingOrders ? "Apagando..." : `Apagar Marcados (${selectedOrderIds.length})`}
                </button>
              )}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-emerald-100 rounded-3xl p-12 text-center text-slate-400">
              Nenhum pedido neste filtro.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredOrders.map((ord) => {
                const stMeta = ORDER_STATUS_META[ord.status] || {
                  label: ord.status,
                  badge: "bg-slate-100 text-slate-700 border-slate-200",
                };
                const isChecked = selectedOrderIds.includes(ord.id);
                return (
                  <div
                    key={ord.id}
                    className={`bg-white border rounded-3xl p-5 shadow-2xs space-y-3 transition-all ${
                      isChecked ? "border-rose-400 ring-2 ring-rose-100" : "border-emerald-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds((prev) => [...prev, ord.id]);
                            } else {
                              setSelectedOrderIds((prev) => prev.filter((id) => id !== ord.id));
                            }
                          }}
                          className="mt-1 h-4 w-4 accent-rose-600 rounded cursor-pointer"
                          title="Marcar para apagar"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-[#0B5D2E]">
                              #{ord.orderNumber || ord.id.slice(0, 6)}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black ${stMeta.badge}`}>
                              {stMeta.label}
                            </span>
                          </div>
                          <div className="text-sm font-black text-slate-900 mt-1">
                            {ord.customerName || ord.customer?.name || "Cliente"}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {ord.customerPhone || ord.customer?.phone || "Sem telefone"} • {fmtDate(ord.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black font-mono text-[#0B5D2E]">
                          R$ {fmtBRL(ord.total)}
                        </span>
                        {ord.paymentMethod && (
                          <div className="text-[10px] font-bold text-slate-500 uppercase">
                            {ord.paymentMethod}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-[#f4f8f4] border border-emerald-100 rounded-2xl p-3 text-xs space-y-1">
                      <div className="font-bold text-[#0B5D2E]">
                        {ord.deliveryType === "ENTREGA"
                          ? "🚚 Entrega em domicílio"
                          : ord.deliveryType === "MESA"
                          ? "🍽️ Mesa / Loja"
                          : "🏪 Retirada no local"}
                      </div>
                      {ord.deliveryLocation && (
                        <div className="text-slate-700">{ord.deliveryLocation}</div>
                      )}
                      {ord.notes && (
                        <div className="text-amber-800 italic">Obs: {ord.notes}</div>
                      )}
                    </div>

                    <div className="border border-slate-100 rounded-2xl p-2.5 space-y-1 text-xs bg-slate-50/70">
                      {(ord.items || []).map((it: any) => (
                        <div key={it.id} className="flex justify-between gap-2">
                          <span className="text-slate-800 truncate">
                            {String(Math.round(Number(it.quantity) * 1000) / 1000).replace(".", ",")} {it.product?.unit || "un"} ×{" "}
                            <strong>{it.product?.name || "Produto"}</strong>
                          </span>
                          <span className="font-mono font-bold shrink-0">R$ {fmtBRL(it.total)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Ações de Status */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ord.status === "PENDING_APPROVAL" && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === ord.id}
                            onClick={async () => {
                              setBusyId(ord.id);
                              const r = await approveDigitalMenuOrder(ord.id);
                              setBusyId(null);
                              if (r.error) notify(r.error);
                              else notify("Pedido confirmado e estoque atualizado!");
                              loadData();
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#0B5D2E] hover:bg-[#084422] text-white text-xs font-bold cursor-pointer"
                          >
                            ✓ Confirmar Pedido
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectOrderId(ord.id);
                              setRejectReason("");
                            }}
                            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                          >
                            Recusar
                          </button>
                        </>
                      )}

                      {["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(ord.status) && (
                        <>
                          {[
                            { st: "PREPARING", label: "Preparando" },
                            { st: "OUT_FOR_DELIVERY", label: "Saiu p/ entrega" },
                            { st: "READY", label: "Pronto Retirada" },
                            { st: "DELIVERED", label: "✓ Entregue" },
                          ].map((btn) => (
                            <button
                              key={btn.st}
                              type="button"
                              disabled={busyId === ord.id || ord.status === btn.st}
                              onClick={async () => {
                                setBusyId(ord.id);
                                const r = await advanceDigitalMenuOrderStatus(ord.id, btn.st);
                                setBusyId(null);
                                if (r.error) notify(r.error);
                                else notify(`Status atualizado para: ${btn.label}`);
                                loadData();
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                                ord.status === btn.st
                                  ? "bg-[#0B5D2E] text-white border-[#0B5D2E]"
                                  : "bg-white hover:bg-emerald-50 text-slate-700 border-slate-200"
                              }`}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </>
                      )}

                      <button
                        type="button"
                        disabled={busyId === ord.id || deletingOrders}
                        onClick={async () => {
                          if (!confirm(`Deseja apagar o pedido #${ord.orderNumber || ord.id.slice(0, 6)}?`)) {
                            return;
                          }
                          setBusyId(ord.id);
                          const r = await deleteDigitalMenuOrders([ord.id]);
                          setBusyId(null);
                          if (r.error) notify(r.error);
                          else notify("Pedido apagado com sucesso!");
                          setSelectedOrderIds((prev) => prev.filter((id) => id !== ord.id));
                          loadData();
                        }}
                        className="ml-auto px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        title="Apagar este pedido"
                      >
                        <Trash2 size={12} /> Apagar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA 3: PRODUTOS ── */}
      {tab === "products" && (
        <div className="space-y-4">
          <div className="bg-white border border-emerald-100 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-1 gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar produto por nome ou código..."
                  className="w-full pl-9 pr-3 py-2 bg-[#f4f8f4] border border-emerald-100 rounded-xl text-xs outline-none focus:border-[#0B5D2E]"
                />
              </div>
              <select
                value={productCatFilter}
                onChange={(e) => setProductCatFilter(e.target.value)}
                className="bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="ALL">Todas Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#0B5D2E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={productOnlyActive}
                  onChange={(e) => setProductOnlyActive(e.target.checked)}
                />
                <span>Só ativos na loja ({kpis.activeMenuProducts})</span>
              </label>
            </div>
            <button
              type="button"
              onClick={openNewProductModal}
              className="px-4 py-2.5 rounded-xl bg-[#0B5D2E] hover:bg-[#084422] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={15} /> + Adicionar Produto
            </button>
          </div>

          <div className="bg-white border border-emerald-100 rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f8f4] border-b border-emerald-100 text-slate-600 uppercase text-[10px] font-black">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 text-right">Preço</th>
                    <th className="px-4 py-3 text-right">Promoção</th>
                    <th className="px-4 py-3 text-right">Estoque</th>
                    <th className="px-4 py-3 text-center">Na Loja</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {filteredProducts.slice(0, 120).map((p) => (
                    <tr key={p.id} className="hover:bg-emerald-50/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveProductImage(p)}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover bg-emerald-50 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate max-w-[260px]">{p.name}</div>
                            {p.description && (
                              <div className="text-[11px] text-slate-500 truncate max-w-[260px]">
                                {p.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {p.category?.name || "Sem categoria"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        R$ {fmtBRL(p.price)} <span className="text-[10px] text-slate-400">/{p.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-rose-600">
                        {p.promoPrice && Number(p.promoPrice) > 0 ? `R$ ${fmtBRL(p.promoPrice)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                        {String(Math.round(Number(p.stock || 0) * 1000) / 1000).replace(".", ",")} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={async () => {
                            await toggleProductDigitalMenu(p.id, !p.showInDigitalMenu);
                            loadData();
                          }}
                          className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer ${
                            p.showInDigitalMenu
                              ? "bg-emerald-100 text-[#0B5D2E] border border-emerald-300"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {p.showInDigitalMenu ? "Ativo na Loja" : "Oculto"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditProductModal(p)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-[#0B5D2E] hover:bg-emerald-100 cursor-pointer"
                            title="Editar produto"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`Remover "${p.name}"?`)) return;
                              const r = await deleteStoreProduct(p.id);
                              if (r.error) notify(r.error);
                              else notify(r.message || "Produto removido!");
                              loadData();
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            title="Excluir / Ocultar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA 4: CATEGORIAS ── */}
      {tab === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white border border-emerald-100 rounded-2xl p-4">
            <div>
              <h2 className="font-black text-slate-900 text-sm">Gerenciamento de Categorias</h2>
              <p className="text-xs text-slate-500">Crie, edite, altere fotos e reordene como aparecem no celular.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingCat(null);
                setCatName("");
                setCatImageUrl("");
                setCatActive(true);
                setCatModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0B5D2E] hover:bg-[#084422] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} /> Nova Categoria
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`bg-white border rounded-3xl p-4 flex flex-col justify-between gap-3 shadow-2xs ${
                  cat.active === false ? "border-slate-200 opacity-65" : "border-emerald-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={resolveCategoryImage(cat.name, cat.imageUrl)}
                    alt={cat.name}
                    className="w-16 h-16 rounded-2xl object-cover bg-emerald-50 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-slate-900 text-sm truncate">{cat.name}</div>
                    <div className="text-xs text-slate-500">
                      {cat._count?.products || 0} produto(s) vinculado(s)
                    </div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                        cat.active !== false
                          ? "bg-emerald-100 text-[#0B5D2E]"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {cat.active !== false ? "Ativa" : "Desativada"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-emerald-50 gap-1.5">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await reorderStoreCategory(cat.id, "UP");
                        loadData();
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Subir na ordem"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await reorderStoreCategory(cat.id, "DOWN");
                        loadData();
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Descer na ordem"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewingCatProducts(cat)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-[#0B5D2E] text-[11px] font-bold cursor-pointer"
                    >
                      Ver Itens
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCat(cat);
                        setCatName(cat.name);
                        setCatImageUrl(cat.imageUrl || "");
                        setCatActive(cat.active !== false);
                        setCatModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-700 cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Excluir a categoria "${cat.name}"?`)) return;
                        await deleteStoreCategory(cat.id);
                        notify("Categoria excluída.");
                        loadData();
                      }}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ABA 5: PROMOÇÕES ── */}
      {tab === "promotions" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white border border-emerald-100 rounded-2xl p-4">
            <div>
              <h2 className="font-black text-slate-900 text-sm">Ofertas Especiais & Promoções</h2>
              <p className="text-xs text-slate-500">
                Defina preço promocional, desconto % e validade para destaque na loja do cliente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const first = products[0];
                setPromoProdId(first?.id || "");
                setPromoOldPrice(first ? String(first.price) : "");
                setPromoNewPrice("");
                setPromoStart("");
                setPromoEnd("");
                setPromoActive(true);
                setPromoModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0B5D2E] hover:bg-[#084422] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} /> + Criar Promoção
            </button>
          </div>

          {promoProducts.length === 0 ? (
            <div className="bg-white border border-emerald-100 rounded-3xl p-12 text-center text-slate-400">
              Nenhuma promoção ativa. Clique em <strong>+ Criar Promoção</strong> para destacar ofertas na loja!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promoProducts.map((p) => {
                const pct = Math.round(((p.price - p.promoPrice) / Math.max(0.01, p.price)) * 100);
                return (
                  <div
                    key={p.id}
                    className="bg-white border-2 border-amber-200 rounded-3xl p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveProductImage(p)}
                        alt={p.name}
                        className="w-16 h-16 rounded-2xl object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                          -{pct}% OFF
                        </span>
                        <h3 className="font-black text-slate-900 text-sm truncate mt-1">{p.name}</h3>
                        <div className="text-xs font-mono">
                          <span className="text-slate-400 line-through mr-1.5">R$ {fmtBRL(p.price)}</span>
                          <span className="text-[#0B5D2E] font-black">R$ {fmtBRL(p.promoPrice)}</span>
                        </div>
                      </div>
                    </div>

                    {(p.promoStartDate || p.promoEndDate) && (
                      <div className="text-[11px] text-slate-500">
                        Validade:{" "}
                        {p.promoStartDate ? new Date(p.promoStartDate).toLocaleDateString("pt-BR") : "Hoje"} até{" "}
                        {p.promoEndDate ? new Date(p.promoEndDate).toLocaleDateString("pt-BR") : "Indeterminado"}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setPromoProdId(p.id);
                          setPromoOldPrice(String(p.price));
                          setPromoNewPrice(String(p.promoPrice));
                          setPromoStart(p.promoStartDate ? String(p.promoStartDate).slice(0, 10) : "");
                          setPromoEnd(p.promoEndDate ? String(p.promoEndDate).slice(0, 10) : "");
                          setPromoActive(true);
                          setPromoModalOpen(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-emerald-50 text-[#0B5D2E] font-bold text-xs cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await clearStorePromotion(p.id);
                          notify("Promoção encerrada.");
                          loadData();
                        }}
                        className="flex-1 py-2 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs cursor-pointer"
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA 6: CLIENTES ── */}
      {tab === "customers" && (
        <div className="space-y-4">
          <div className="bg-white border border-emerald-100 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Buscar cliente por nome, telefone ou e-mail..."
                className="w-full pl-9 pr-3 py-2 bg-[#f4f8f4] border border-emerald-100 rounded-xl text-xs outline-none focus:border-[#0B5D2E]"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">{filteredCustomers.length} cliente(s)</span>
          </div>

          <div className="bg-white border border-emerald-100 rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f8f4] border-b border-emerald-100 text-slate-600 uppercase text-[10px] font-black">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Telefone / E-mail</th>
                    <th className="px-4 py-3">Endereço Cadastrado</th>
                    <th className="px-4 py-3 text-center">Pedidos</th>
                    <th className="px-4 py-3 text-right">Total Comprado</th>
                    <th className="px-4 py-3 text-center">Histórico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                        Nenhum cliente encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const defAddr = c.addresses?.[0];
                      return (
                        <tr key={c.id} className="hover:bg-emerald-50/30">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div>{c.name}</div>
                            {c.hasAccount && (
                              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                Conta Loja Ativa
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="font-mono">{c.phone || "---"}</div>
                            <div className="text-[11px] text-slate-400">{c.email || "---"}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[260px]">
                            {defAddr ? (
                              <span>
                                {defAddr.street}, {defAddr.number} — {defAddr.neighborhood}, {defAddr.city}/{defAddr.state}
                              </span>
                            ) : (
                              <span className="text-slate-400">Sem endereço salvo</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold">{c.ordersCount}</td>
                          <td className="px-4 py-3 text-right font-mono font-black text-[#0B5D2E]">
                            R$ {fmtBRL(c.totalBought)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setHistoryCustomer(c)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0B5D2E] font-bold text-xs cursor-pointer"
                            >
                              Ver Pedidos
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA: PIX STONE & GATEWAYS DE PAGAMENTO ── */}
      {tab === "gateways" && (
        <div className="space-y-6">
          {/* Header da Aba */}
          <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Pix Stone & Gateways de Pagamento</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0B5D2E] text-[10px] font-black border border-emerald-200">
                  Validação Oficial em Tempo Real
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure as credenciais da Stone ou outros bancos para que a loja gere QR Code Pix dinâmico e confirme pagamentos instantaneamente na API oficial.
              </p>
            </div>
            <button
              type="button"
              onClick={loadGateways}
              className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0B5D2E] font-bold text-xs flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Atualizar Status
            </button>
          </div>

          {/* Gateways Configurados */}
          {gateways.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                Gateways Cadastrados na Loja ({gateways.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {gateways.map((gw) => {
                  const isConn = gw.status === "CONNECTED";
                  const isErr = gw.status === "INVALID_KEY";
                  return (
                    <div
                      key={gw.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        gw.active
                          ? "bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-900">{gw.provider}</span>
                            {gw.isSandbox && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                                Sandbox / Teste
                              </span>
                            )}
                            {gw.active && (
                              <span className="px-2 py-0.5 rounded-md bg-[#0B5D2E] text-white text-[10px] font-black">
                                Ativo na Loja
                              </span>
                            )}
                          </div>
                          {gw.merchantName && (
                            <div className="text-xs text-slate-700 font-semibold flex items-center gap-1">
                              <ShieldCheck size={13} className="text-emerald-600" />
                              Titular: {gw.merchantName}
                            </div>
                          )}
                          {gw.pixKey && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              Chave Pix: {gw.pixKey}
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isConn ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-black">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              Validado na API
                            </span>
                          ) : isErr ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-[11px] font-black">
                              <XCircle size={13} className="text-rose-600" />
                              Chave Inválida
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
                              Configurado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Erro da API se houver */}
                      {gw.lastValidationError && (
                        <div className="mt-2.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-mono">
                          {gw.lastValidationError}
                        </div>
                      )}

                      {/* Ações */}
                      <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400">
                          {gw.lastValidatedAt ? `Validado em ${fmtDate(gw.lastValidatedAt)}` : "Ainda não validado"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectGatewayToEdit(gw)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={busyId === `gw-${gw.provider}`}
                            onClick={() => handleToggleGwActive(gw.provider, Boolean(gw.active))}
                            className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1 ${
                              gw.active
                                ? "bg-rose-100 hover:bg-rose-200 text-rose-800"
                                : "bg-[#0B5D2E] hover:bg-[#084522] text-white"
                            }`}
                          >
                            <Power size={12} />
                            {gw.active ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Destaque Oficial: Certificados mTLS da Stone BaaS */}
          <div className="bg-gradient-to-br from-[#0B5D2E] to-[#06381C] text-white rounded-3xl p-6 shadow-md border border-emerald-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-lime-300" />
                  <h3 className="text-base font-black">Certificados de Segurança mTLS — Stone BaaS</h3>
                </div>
                <p className="text-xs text-emerald-100 max-w-2xl">
                  Para utilizar a API de Banking Gateway da Stone com segurança bancária mTLS (Open Banking), geramos as chaves criptográficas RSA 2048-bit e os CSRs para o <strong>EMPORIO AGROBELEM LTDA</strong> (CNPJ 65.522.409/0001-13).
                </p>
              </div>
              <a
                href="https://apidocs.baas.stone.com.br/reference/seguran%C3%A7a"
                target="_blank"
                rel="noreferrer"
                className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-black flex items-center gap-1.5 transition-all"
              >
                Documentação Stone BaaS <ExternalLink size={13} />
              </a>
            </div>

            {/* Abas Sandbox vs Produção */}
            <div className="bg-white/10 p-1 rounded-2xl flex gap-1 w-fit">
              <button
                type="button"
                onClick={() => setCsrTab("sandbox")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  csrTab === "sandbox" ? "bg-white text-[#0B5D2E] shadow-xs" : "text-emerald-100 hover:text-white"
                }`}
              >
                CSR Sandbox (Homologação)
              </button>
              <button
                type="button"
                onClick={() => setCsrTab("prod")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  csrTab === "prod" ? "bg-white text-[#0B5D2E] shadow-xs" : "text-emerald-100 hover:text-white"
                }`}
              >
                CSR Produção (Oficial Stone)
              </button>
            </div>

            {/* Caixa do CSR */}
            <div className="bg-black/30 backdrop-blur-xs rounded-2xl p-4 border border-white/15 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-emerald-200 text-[11px]">
                  {csrTab === "sandbox" ? "stone-sandbox-request.csr (RSA 2048 SHA-256)" : "stone-prod-request.csr (RSA 2048 SHA-256)"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCsr(
                        csrTab === "sandbox" ? STONE_SANDBOX_CSR : STONE_PROD_CSR,
                        csrTab === "sandbox" ? "CSR Stone Sandbox" : "CSR Stone Produção"
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-white text-[#0B5D2E] font-black text-xs hover:bg-emerald-50 cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    {copiedCsr ? <Check size={13} /> : <Copy size={13} />}
                    {copiedCsr ? "Copiado!" : "Copiar CSR"}
                  </button>
                </div>
              </div>

              <pre className="font-mono text-[11px] text-emerald-100 bg-black/40 p-3 rounded-xl overflow-x-auto max-h-36 leading-tight select-all">
                {csrTab === "sandbox" ? STONE_SANDBOX_CSR : STONE_PROD_CSR}
              </pre>

              <div className="text-[11px] text-emerald-200/90 leading-relaxed">
                💡 <strong>Como funciona na Stone:</strong> Copie o CSR acima e envie para o suporte/portal Stone BaaS. Eles assinarão o certificado mTLS oficial do Empório Agrobém. Você também pode utilizar a chave de API (sk_...) do Pagar.me/Stone no formulário abaixo para Pix imediato!
              </div>
            </div>
          </div>

          {/* Formulário de Configuração & Validação Real */}
          <form onSubmit={handleSaveAndValidateGateway} className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Conectar Credencial do Gateway</h3>
                <p className="text-xs text-slate-500">
                  Preencha as chaves fornecidas pelo banco. O sistema fará um teste real na API antes de salvar.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                Provedor selecionado: {gwProvider}
              </span>
            </div>

            {/* Pílulas de Seleção de Provedor */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase">Selecione o Provedor</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "STONE", label: "Stone BaaS / Pagar.me", hint: "Conta Stone do Cliente" },
                  { id: "MERCADOPAGO", label: "Mercado Pago", hint: "Access Token Oficial" },
                  { id: "EFI", label: "Efí Bank", hint: "Gerencianet Pix" },
                  { id: "ASAAS", label: "Asaas", hint: "API Key Asaas" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGwProvider(item.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      gwProvider === item.id
                        ? "bg-emerald-50 border-[#0B5D2E] ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    <div className="font-black text-xs text-slate-900">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Campos de Chave */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chave Secreta / API Key */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>
                    Chave Secreta / API Key / Token{" "}
                    <strong className="text-rose-600">*</strong>
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {gwProvider === "STONE"
                      ? "Ex: sk_test_... ou sk_... (Stone Pagar.me V5) ou Token Stone BaaS"
                      : gwProvider === "MERCADOPAGO"
                      ? "Ex: APP_USR-... (Access Token de Produção ou Teste)"
                      : gwProvider === "ASAAS"
                      ? "Ex: $aact_... (API Key do Asaas)"
                      : "Client Secret do Efí Bank"}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showGwSecret ? "text" : "password"}
                    required
                    placeholder={
                      gwProvider === "STONE"
                        ? "sk_test_... ou sk_..."
                        : gwProvider === "MERCADOPAGO"
                        ? "APP_USR-..."
                        : gwProvider === "ASAAS"
                        ? "$aact_..."
                        : "Client Secret"
                    }
                    value={gwApiKey}
                    onChange={(e) => setGwApiKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#0B5D2E] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGwSecret((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showGwSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Chave Pública / Client ID (se aplicável) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Chave Pública / Client ID (Opcional)
                </label>
                <input
                  type="text"
                  placeholder={
                    gwProvider === "STONE"
                      ? "pk_test_... ou pk_..."
                      : gwProvider === "EFI"
                      ? "Client ID da Efí"
                      : "Public Key do Gateway"
                  }
                  value={gwPublicKey}
                  onChange={(e) => setGwPublicKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#0B5D2E]"
                />
              </div>

              {/* Chave Pix Cadastrada */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Chave Pix Vinculada à Conta
                </label>
                <input
                  type="text"
                  placeholder="65522409000113 (CNPJ Empório Agrobém) ou chave cadastrada"
                  value={gwPixKey}
                  onChange={(e) => setGwPixKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#0B5D2E]"
                />
              </div>
            </div>

            {/* Sandbox toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div>
                <div className="text-xs font-black text-amber-900">Modo Sandbox (Ambiente de Testes)</div>
                <div className="text-[11px] text-amber-700">
                  Ative se as credenciais forem do ambiente de homologação/testes da instituição financeira.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gwSandbox}
                  onChange={(e) => setGwSandbox(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Botão de Validação e Conexão */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-emerald-100">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Lock size={13} className="text-[#0B5D2E]" />
                As credenciais são armazenadas com segurança no banco de dados e checadas via HTTPS oficial.
              </div>
              <button
                type="submit"
                disabled={validatingGw || !gwApiKey.trim()}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#0B5D2E] hover:bg-[#084522] text-white font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {validatingGw ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Validando na API Oficial da {gwProvider}...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    Validar e Conectar Chave na API Oficial
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ABA 7: CONFIGURAÇÕES DA LOJA ── */}
      {tab === "settings" && (
        <form onSubmit={handleSaveSettings} className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Configurações da Loja Online</h2>
              <p className="text-xs text-slate-500">
                Altere identidade visual, entrega, pagamentos, horários e contatos em tempo real.
              </p>
            </div>
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-black text-[#0B5D2E] cursor-pointer">
              <input
                type="checkbox"
                checked={setEnabled}
                onChange={(e) => setSetEnabled(e.target.checked)}
              />
              <span>{setEnabled ? "Loja Aberta para Pedidos" : "Loja Fechada"}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Loja</label>
              <input
                type="text"
                value={setStoreName}
                onChange={(e) => setSetStoreName(e.target.value)}
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:border-[#0B5D2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Horário de Funcionamento</label>
              <input
                type="text"
                value={setHours}
                onChange={(e) => setSetHours(e.target.value)}
                placeholder="Ex: Seg a Sáb 07h às 19h · Dom 07h às 13h"
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#0B5D2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp da Loja (c/ DDD)</label>
              <input
                type="text"
                value={setWhatsapp}
                onChange={(e) => setSetWhatsapp(e.target.value)}
                placeholder="82999999999"
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm font-mono outline-none focus:border-[#0B5D2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telefone de Contato</label>
              <input
                type="text"
                value={setPhone}
                onChange={(e) => setSetPhone(e.target.value)}
                placeholder="(82) 3333-0000"
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm font-mono outline-none focus:border-[#0B5D2E]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Endereço da Loja</label>
              <input
                type="text"
                value={setAddress}
                onChange={(e) => setSetAddress(e.target.value)}
                placeholder="Rua, Número, Bairro, Cidade - UF"
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#0B5D2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Taxa de Entrega (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={setDeliveryFee}
                onChange={(e) => setSetDeliveryFee(e.target.value)}
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold outline-none focus:border-[#0B5D2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valor Mínimo para Compra (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={setMinOrder}
                onChange={(e) => setSetMinOrder(e.target.value)}
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold outline-none focus:border-[#0B5D2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prazo Estimado de Entrega</label>
              <input
                type="text"
                value={setEta}
                onChange={(e) => setSetEta(e.target.value)}
                placeholder="Ex: 30 a 50 min"
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#0B5D2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Formas de Pagamento Aceitas</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { key: "PIX", label: "PIX" },
                  { key: "DINHEIRO", label: "Dinheiro" },
                  { key: "CARTAO", label: "Cartão na Entrega" },
                ].map((pm) => {
                  const checked = setPayMethods.includes(pm.key);
                  return (
                    <button
                      key={pm.key}
                      type="button"
                      onClick={() =>
                        setSetPayMethods((prev) =>
                          checked ? prev.filter((x) => x !== pm.key) : [...prev, pm.key]
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                        checked
                          ? "bg-[#0B5D2E] text-white border-[#0B5D2E]"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {checked ? "✓ " : ""}{pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Logo da Loja (URL ou Upload — vazio usa padrão)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={setLogoUrl}
                  onChange={(e) => setSetLogoUrl(e.target.value)}
                  placeholder="Opcional"
                  className="flex-1 bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3 py-2 text-xs outline-none"
                />
                <label className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[#0B5D2E] text-xs font-bold cursor-pointer flex items-center gap-1">
                  <Upload size={13} /> Foto
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setSetLogoUrl)} />
                </label>
              </div>
            </div>

            <div className="md:col-span-2 bg-[#f4f8f4] border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-black text-[#076F3A] uppercase">
                    Fotos do Banner Carrossel (ficam passando no topo da loja)
                  </label>
                  <p className="text-[11px] text-slate-600">
                    Adicione quantas fotos quiser, altere os textos e reordene a exibição automática.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <label className="px-3 py-2 rounded-xl bg-[#076F3A] hover:bg-[#05572d] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs">
                    <Upload size={13} /> Subir Foto(s)
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        try {
                          const newSlides: StoreBannerSlide[] = [];
                          for (const file of files) {
                            const dataUrl = await resizeImageFileToDataUrl(file, 1400);
                            newSlides.push({
                              id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                              imageUrl: dataUrl,
                              title: "Produtos caseiros com muito sabor e qualidade!",
                              subtitle: "Direto do campo para sua mesa.",
                              buttonText: "Comprar agora →",
                              categoryFilter: "ALL",
                            });
                          }
                          setSetBannerSlides((prev) => [...prev, ...newSlides]);
                          notify(`${newSlides.length} foto(s) adicionada(s) ao carrossel!`);
                        } catch (err: any) {
                          notify(err.message || "Erro ao carregar foto(s).");
                        } finally {
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setSetBannerSlides(DEFAULT_EMPORIO_BANNER_SLIDES)}
                    className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-[#076F3A] text-xs font-bold hover:bg-emerald-50 cursor-pointer"
                  >
                    Restaurar 4 Padrões
                  </button>
                </div>
              </div>

              {/* Adicionar por URL rápida */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBannerUrlInput}
                  onChange={(e) => setNewBannerUrlInput(e.target.value)}
                  placeholder="Ou cole a URL de uma imagem e clique em Adicionar..."
                  className="flex-1 bg-white border border-emerald-100 rounded-xl px-3 py-2 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = newBannerUrlInput.trim();
                    if (!url) return;
                    setSetBannerSlides((prev) => [
                      ...prev,
                      {
                        id: `slide-url-${Date.now()}`,
                        imageUrl: url,
                        title: "Produtos caseiros com muito sabor e qualidade!",
                        subtitle: "Direto do campo para sua mesa.",
                        buttonText: "Comprar agora →",
                        categoryFilter: "ALL",
                      },
                    ]);
                    setNewBannerUrlInput("");
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-100 text-[#076F3A] text-xs font-black cursor-pointer hover:bg-emerald-200"
                >
                  + Adicionar URL
                </button>
              </div>

              {/* Galeria rápida de presets rurais */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">
                  Atalhos rápidos:
                </span>
                {STORE_RURAL_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() =>
                      setSetBannerSlides((prev) => [
                        ...prev,
                        {
                          id: `slide-preset-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                          imageUrl: preset.url,
                          title: preset.label,
                          subtitle: "Direto do campo para sua mesa.",
                          buttonText: "Comprar agora →",
                          categoryFilter: "ALL",
                        },
                      ])
                    }
                    className="px-2 py-1 rounded-lg bg-white border border-emerald-200 text-[10px] font-bold text-[#076F3A] hover:bg-emerald-50 cursor-pointer"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>

              {/* Lista dos slides atuais */}
              <div className="space-y-2.5">
                {setBannerSlides.map((slide, idx) => (
                  <div
                    key={slide.id || idx}
                    className="bg-white border border-emerald-100 rounded-2xl p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                  >
                    {/* Imagem com botão de Trocar Foto interativo */}
                    <div className="relative w-full sm:w-36 h-24 rounded-xl overflow-hidden bg-emerald-50 shrink-0 group border border-emerald-100">
                      <img
                        src={slide.imageUrl}
                        alt={slide.title || `Slide ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <label className="absolute inset-0 bg-black/55 opacity-90 sm:opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold cursor-pointer transition-opacity p-1 text-center">
                        <Upload size={14} className="mb-0.5 text-lime-300" />
                        <span>Trocar Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const dataUrl = await resizeImageFileToDataUrl(file, 1400);
                              setSetBannerSlides((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, imageUrl: dataUrl } : s))
                              );
                              notify(`Foto do Slide ${idx + 1} atualizada!`);
                            } catch (err: any) {
                              notify(err.message || "Erro ao trocar foto.");
                            } finally {
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                      <input
                        type="text"
                        value={slide.title || ""}
                        onChange={(e) =>
                          setSetBannerSlides((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s))
                          )
                        }
                        placeholder="Título do Banner"
                        className="bg-[#f4f8f4] border border-emerald-100 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                      />
                      <input
                        type="text"
                        value={slide.subtitle || ""}
                        onChange={(e) =>
                          setSetBannerSlides((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, subtitle: e.target.value } : s))
                          )
                        }
                        placeholder="Subtítulo (ex: Direto do campo...)"
                        className="bg-[#f4f8f4] border border-emerald-100 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                      />
                      <input
                        type="text"
                        value={slide.buttonText || ""}
                        onChange={(e) =>
                          setSetBannerSlides((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, buttonText: e.target.value } : s))
                          )
                        }
                        placeholder="Texto do botão (ex: Comprar agora →)"
                        className="bg-[#f4f8f4] border border-emerald-100 rounded-lg px-2.5 py-1.5 text-xs outline-none sm:col-span-2"
                      />
                    </div>
                    <div className="flex sm:flex-col gap-1 shrink-0">
                      <label className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#076F3A] cursor-pointer" title="Trocar imagem deste banner">
                        <Upload size={13} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const dataUrl = await resizeImageFileToDataUrl(file, 1400);
                              setSetBannerSlides((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, imageUrl: dataUrl } : s))
                              );
                              notify(`Foto do Slide ${idx + 1} atualizada!`);
                            } catch (err: any) {
                              notify(err.message || "Erro ao trocar foto.");
                            } finally {
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          if (idx === 0) return;
                          setSetBannerSlides((prev) => {
                            const next = [...prev];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            return next;
                          });
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 disabled:opacity-30 cursor-pointer"
                        title="Mover para cima"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === setBannerSlides.length - 1}
                        onClick={() => {
                          if (idx === setBannerSlides.length - 1) return;
                          setSetBannerSlides((prev) => {
                            const next = [...prev];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            return next;
                          });
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 disabled:opacity-30 cursor-pointer"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={setBannerSlides.length <= 1}
                        onClick={() =>
                          setSetBannerSlides((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 disabled:opacity-30 cursor-pointer"
                        title="Remover foto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão de salvar rápido específico dos banners */}
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  disabled={busyId === "save-settings"}
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 rounded-xl bg-[#076F3A] hover:bg-[#05572d] text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check size={14} className="text-lime-300" />
                  <span>Salvar Banners da Loja</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Instagram</label>
              <input
                type="text"
                value={setInstagram}
                onChange={(e) => setSetInstagram(e.target.value)}
                placeholder="@emporioagrobelem"
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Facebook</label>
              <input
                type="text"
                value={setFacebook}
                onChange={(e) => setSetFacebook(e.target.value)}
                placeholder="facebook.com/emporioagrobelem"
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Sobre a Loja / Informações Gerais</label>
              <textarea
                rows={2}
                value={setStoreInfo}
                onChange={(e) => setSetStoreInfo(e.target.value)}
                placeholder="Descrição da história da loja, qualidade rural..."
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Aviso / Recado no Rodapé</label>
              <input
                type="text"
                value={setNotes}
                onChange={(e) => setSetNotes(e.target.value)}
                placeholder="Ex: Entregas todos os dias até 18h."
                className="w-full bg-[#f4f8f4] border border-emerald-100 rounded-xl px-3.5 py-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={busyId === "save-settings"}
              className="px-6 py-3 rounded-xl bg-[#0B5D2E] hover:bg-[#084422] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
            >
              {busyId === "save-settings" ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </form>
      )}

      {/* ── MODAL PRODUTO (CRIAR / EDITAR) ── */}
      {prodModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 bg-[#0B5D2E] text-white flex justify-between items-center">
              <h3 className="font-black text-base">
                {editingProd ? "Editar Produto" : "+ Adicionar Produto"}
              </h3>
              <button type="button" onClick={() => setProdModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Doce de Goiaba Caseiro 500g"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#0B5D2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Produzido artesanalmente com frutas selecionadas..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-[#0B5D2E]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={prodCatId}
                    onChange={(e) => setProdCatId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unidade</label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                  >
                    {["UN", "KG", "POT", "DZ", "LT", "PC", "CX"].map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estoque</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preço (R$) *</label>
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="22,00"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black outline-none focus:border-[#0B5D2E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preço Promocional (Opcional)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={prodPromoPrice}
                    onChange={(e) => setProdPromoPrice(e.target.value)}
                    placeholder="18,00"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-rose-600 outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Foto do Produto</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prodImageUrl}
                    onChange={(e) => setProdImageUrl(e.target.value)}
                    placeholder="URL da foto ou clique em Enviar Foto..."
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <label className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[#0B5D2E] text-xs font-bold cursor-pointer flex items-center gap-1">
                    <Upload size={13} /> Enviar Foto
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setProdImageUrl)} />
                  </label>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {STORE_RURAL_PRESETS.map((pr) => (
                    <button
                      key={pr.url}
                      type="button"
                      onClick={() => setProdImageUrl(pr.url)}
                      className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[10px] font-bold cursor-pointer ${
                        prodImageUrl === pr.url ? "border-[#0B5D2E] bg-emerald-50" : "border-slate-200"
                      }`}
                    >
                      <img src={pr.url} alt={pr.label} className="w-5 h-5 rounded object-cover" />
                      <span>{pr.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodShowInStore}
                    onChange={(e) => setProdShowInStore(e.target.checked)}
                  />
                  <span>Ativo / Visível na Loja Online</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodFeatured}
                    onChange={(e) => setProdFeatured(e.target.checked)}
                  />
                  <span>Destaque na Vitrine</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProdModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busyId === "save-prod"}
                  className="flex-[2] py-2.5 rounded-xl bg-[#0B5D2E] hover:bg-[#084422] text-white text-xs font-black cursor-pointer"
                >
                  {busyId === "save-prod" ? "Salvando..." : "Salvar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CATEGORIA (CRIAR / EDITAR) ── */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 bg-[#0B5D2E] text-white flex justify-between items-center">
              <h3 className="font-black text-base">
                {editingCat ? "Editar Categoria" : "Nova Categoria"}
              </h3>
              <button type="button" onClick={() => setCatModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ex: Doces Caseiros, Queijos, Galinha Caipira..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#0B5D2E]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Imagem da Categoria</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={catImageUrl}
                    onChange={(e) => setCatImageUrl(e.target.value)}
                    placeholder="URL ou escolha uma imagem abaixo"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <label className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[#0B5D2E] text-xs font-bold cursor-pointer flex items-center gap-1">
                    <Upload size={13} /> Foto
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setCatImageUrl)} />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {STORE_RURAL_PRESETS.slice(1).map((pr) => (
                    <button
                      key={pr.url}
                      type="button"
                      onClick={() => setCatImageUrl(pr.url)}
                      className={`p-1 rounded-xl border text-center cursor-pointer ${
                        catImageUrl === pr.url ? "border-[#0B5D2E] bg-emerald-50" : "border-slate-200"
                      }`}
                    >
                      <img src={pr.url} alt={pr.label} className="w-full h-12 rounded-lg object-cover" />
                      <span className="text-[9px] font-bold block truncate mt-0.5">{pr.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={catActive}
                  onChange={(e) => setCatActive(e.target.checked)}
                />
                <span>Categoria Ativa na Loja Online</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busyId === "save-cat"}
                  className="flex-[2] py-2.5 rounded-xl bg-[#0B5D2E] text-white text-xs font-black cursor-pointer"
                >
                  {busyId === "save-cat" ? "Salvando..." : "Salvar Categoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL ITENS DA CATEGORIA ── */}
      {viewingCatProducts && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#0B5D2E] text-white flex justify-between items-center">
              <h3 className="font-black text-base">Produtos em {viewingCatProducts.name}</h3>
              <button type="button" onClick={() => setViewingCatProducts(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {products
                .filter((p) => p.categoryId === viewingCatProducts.id)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-100 bg-[#f4f8f4] text-xs">
                    <div className="flex items-center gap-2.5">
                      <img src={resolveProductImage(p)} alt={p.name} className="w-9 h-9 rounded-lg object-cover" />
                      <div>
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] font-mono text-[#0B5D2E]">R$ {fmtBRL(p.price)}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.showInDigitalMenu ? "bg-emerald-100 text-[#0B5D2E]" : "bg-slate-200 text-slate-600"}`}>
                      {p.showInDigitalMenu ? "Na Loja" : "Oculto"}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PROMOÇÃO ── */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 bg-[#0B5D2E] text-white flex justify-between items-center">
              <h3 className="font-black text-base">Configurar Promoção</h3>
              <button type="button" onClick={() => setPromoModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSavePromo} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Produto *</label>
                <select
                  value={promoProdId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPromoProdId(id);
                    const found = products.find((x) => x.id === id);
                    if (found) setPromoOldPrice(String(found.price));
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (R$ {fmtBRL(p.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preço Antigo (R$)</label>
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    value={promoOldPrice}
                    onChange={(e) => setPromoOldPrice(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preço Promocional (R$) *</label>
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    value={promoNewPrice}
                    onChange={(e) => setPromoNewPrice(e.target.value)}
                    className="w-full border border-rose-300 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-rose-600"
                  />
                </div>
              </div>

              {(() => {
                const oldN = parseFloat(promoOldPrice.replace(",", ".")) || 0;
                const newN = parseFloat(promoNewPrice.replace(",", ".")) || 0;
                if (oldN > 0 && newN > 0 && newN < oldN) {
                  const pct = Math.round(((oldN - newN) / oldN) * 100);
                  return (
                    <div className="text-xs font-black text-[#0B5D2E] bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center">
                      Desconto calculado: {pct}% OFF
                    </div>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={promoStart}
                    onChange={(e) => setPromoStart(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data Encerramento</label>
                  <input
                    type="date"
                    value={promoEnd}
                    onChange={(e) => setPromoEnd(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={promoActive}
                  onChange={(e) => setPromoActive(e.target.checked)}
                />
                <span>Promoção Ativa</span>
              </label>

              <button
                type="submit"
                disabled={busyId === "save-promo"}
                className="w-full py-3 rounded-xl bg-[#0B5D2E] text-white font-black text-xs cursor-pointer"
              >
                {busyId === "save-promo" ? "Salvando..." : "Salvar Promoção"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL HISTÓRICO DE PEDIDOS DO CLIENTE ── */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 bg-[#0B5D2E] text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-base">Histórico — {historyCustomer.name}</h3>
                <p className="text-xs text-emerald-100">
                  {historyCustomer.ordersCount} pedido(s) · Total: R$ {fmtBRL(historyCustomer.totalBought)}
                </p>
              </div>
              <button type="button" onClick={() => setHistoryCustomer(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2.5">
              {(historyCustomer.orders || []).length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Nenhum pedido na loja online.</p>
              ) : (
                historyCustomer.orders.map((ord: any) => (
                  <div key={ord.id} className="border border-emerald-100 rounded-2xl p-3 space-y-1.5 bg-[#f4f8f4]">
                    <div className="flex justify-between text-xs font-black">
                      <span>Pedido #{ord.orderNumber || ord.id.slice(0, 6)}</span>
                      <span className="text-[#0B5D2E] font-mono">R$ {fmtBRL(ord.total)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {fmtDate(ord.createdAt)} • {ORDER_STATUS_META[ord.status]?.label || ord.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RECUSAR PEDIDO ── */}
      {rejectOrderId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="font-black text-base text-slate-900">Recusar Pedido</h3>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo da recusa (ex: Produto esgotado)..."
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejectOrderId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await rejectDigitalMenuOrder(rejectOrderId, rejectReason);
                  setRejectOrderId(null);
                  notify("Pedido recusado.");
                  loadData();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs cursor-pointer"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
