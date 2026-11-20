"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  ShoppingCart,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Store,
  Truck,
  X,
  Home,
  LayoutGrid,
  Heart,
  User,
  Menu,
  ShieldCheck,
  Leaf,
  Handshake,
  Tag,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Package,
  AlertCircle,
  Utensils,
  Sparkles,
  Check,
  Globe,
  Share2,
  Edit3,
  Upload,
  ArrowUp,
  ArrowDown,
  QrCode,
  Copy,
} from "lucide-react";
import {
  EmporioLogo,
  parseStoreBannerSlides,
  DEFAULT_EMPORIO_BANNER_SLIDES,
  StoreBannerSlide,
  resizeImageFileToDataUrl,
  resolveCategoryImage,
  resolveProductImage,
} from "@/components/EmporioStoreBrand";
import { getPublicOrderStatus } from "@/actions/order";
import {
  generateOrderLivePix,
  checkLiveOrderPixStatus,
} from "@/actions/paymentGateway";
import {
  registerStoreCustomer,
  loginStoreCustomer,
  logoutStoreCustomer,
  getStoreCustomerAccount,
  updateStoreCustomerProfile,
  saveStoreDeliveryAddress,
  deleteStoreDeliveryAddress,
  setDefaultStoreDeliveryAddress,
  toggleStoreFavorite,
  submitStoreOrder,
} from "@/actions/store";

export interface DigitalMenuProduct {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  promoPrice?: number | null;
  effectivePrice?: number;
  discountPercent?: number;
  featured?: boolean;
  stock: number;
  unit: string;
  barcode?: string | null;
  internalCode?: string | null;
  brand?: string | null;
  isSelfProduced?: boolean;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    imageUrl?: string | null;
    active?: boolean;
    sortOrder?: number;
  } | null;
}

export interface DigitalMenuCategory {
  id: string;
  name: string;
  imageUrl?: string | null;
  sortOrder?: number;
}

export interface DigitalMenuCompany {
  id: string;
  slug?: string | null;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  digitalMenuEnabled: boolean;
  digitalMenuBannerUrl?: string | null;
  digitalMenuNotes?: string | null;
  digitalMenuDeliveryFee?: number;
  digitalMenuMinOrder?: number;
  digitalMenuDeliveryEta?: string | null;
  digitalMenuHours?: string | null;
  digitalMenuPaymentMethods?: string[];
  digitalMenuInstagram?: string | null;
  digitalMenuFacebook?: string | null;
  digitalMenuStoreInfo?: string | null;
  hasDynamicPix?: boolean;
  pixProvider?: string | null;
  pixMerchantName?: string | null;
  fiscalConfig?: {
    city?: string | null;
    state?: string | null;
    street?: string | null;
    tradeName?: string | null;
  } | null;
  theme?: {
    logoPrincipal?: string | null;
    primaryColor?: string | null;
    corPrimaria?: string | null;
  } | null;
  products: DigitalMenuProduct[];
  categories: DigitalMenuCategory[];
}

interface CartItem {
  product: DigitalMenuProduct;
  quantity: number;
  notes: string;
}

interface SubmittedOrder {
  id: string;
  orderNumber?: string | null;
  status: string;
  rejectionReason?: string | null;
  deliveryType?: string | null;
  deliveryLocation?: string | null;
  deliveryFee?: number;
  paymentMethod?: string | null;
  paymentGateway?: string | null;
  paymentTransactionId?: string | null;
  paymentStatus?: string | null;
  pixQrCodeUrl?: string | null;
  pixQrCodeText?: string | null;
  pixExpiresAt?: string | null;
  pixPaidAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt?: string;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    notes?: string | null;
    product: { id: string; name: string; unit: string; imageUrl?: string | null };
  }[];
}

interface CustomerAddress {
  id: string;
  label: string;
  zipCode: string;
  street: string;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  reference?: string | null;
  isDefault: boolean;
}

function fmtBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isFractionalProduct(unit?: string | null, name?: string | null) {
  const u = (unit || "").trim().toUpperCase();
  if (u === "KG" || u === "L" || u === "LT" || u === "G" || u === "GR" || u === "ML") return true;
  return Boolean(name && /\b(KG|LITRO|LITROS|ML)\b|\/KG|\(KG\)/i.test(name));
}

function roundQty(n: number) {
  return Math.round(Number(n || 0) * 1000) / 1000;
}

function fmtQty(qty: number, unit?: string | null, name?: string | null) {
  const r = roundQty(qty);
  if (isFractionalProduct(unit, name) && r % 1 !== 0) {
    return `${r.toFixed(3).replace(".", ",")} ${(unit || "KG").toLowerCase()}`;
  }
  return `${String(r).replace(".", ",")} ${(unit || "un").toLowerCase()}`;
}

function getEffectiveUnitPrice(p: DigitalMenuProduct) {
  if (p.effectivePrice !== undefined) return Number(p.effectivePrice);
  if (p.promoPrice && Number(p.promoPrice) > 0 && Number(p.promoPrice) < Number(p.price)) {
    return Number(p.promoPrice);
  }
  return Number(p.price || 0);
}

const ORDER_STEPS = [
  { key: "RECEIVED", label: "Pedido recebido" },
  { key: "PREPARING", label: "Preparando" },
  { key: "OUT_FOR_DELIVERY", label: "Saiu para entrega" },
  { key: "DELIVERED", label: "Entregue" },
];

function getStepIndex(status: string) {
  if (status === "PENDING_APPROVAL" || status === "CONFIRMED") return 0;
  if (status === "PREPARING" || status === "READY") return 1;
  if (status === "OUT_FOR_DELIVERY") return 2;
  if (status === "DELIVERED") return 3;
  return -1;
}

function getOrderStatusMeta(status: string) {
  switch (status) {
    case "PENDING_APPROVAL":
      return {
        label: "Pedido recebido",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
        description: "Aguardando confirmação da loja.",
      };
    case "CONFIRMED":
      return {
        label: "Pedido confirmado",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
        description: "Confirmado pelo Empório e entrando em separação.",
      };
    case "PREPARING":
      return {
        label: "Preparando",
        badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
        description: "Estamos separando e embalando seus produtos com carinho.",
      };
    case "READY":
      return {
        label: "Pronto para retirada / entrega",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
        description: "Seu pedido já está pronto!",
      };
    case "OUT_FOR_DELIVERY":
      return {
        label: "Saiu para entrega",
        badgeClass: "bg-sky-100 text-sky-800 border-sky-300",
        description: "O entregador já está a caminho do seu endereço.",
      };
    case "DELIVERED":
      return {
        label: "Entregue",
        badgeClass: "bg-emerald-700 text-white border-emerald-700",
        description: "Pedido entregue. Obrigado pela preferência!",
      };
    case "REJECTED":
      return {
        label: "Recusado pela loja",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
        description: "Entre em contato pelo WhatsApp para mais detalhes.",
      };
    case "CANCELED":
      return {
        label: "Cancelado",
        badgeClass: "bg-slate-200 text-slate-700 border-slate-300",
        description: "Este pedido foi cancelado.",
      };
    default:
      return {
        label: status,
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
        description: "",
      };
  }
}

const PAYMENT_OPTION_LABELS: Record<string, string> = {
  PIX: "PIX",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão na Entrega / Balcão",
  CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO: "Cartão de Débito",
};

export function DigitalMenuClient({
  company,
  digitalMenuDisabled,
}: {
  company: DigitalMenuCompany;
  digitalMenuDisabled?: boolean;
}) {
  const companyKey = company.slug || company.id;
  const tradeName = company.fiscalConfig?.tradeName || company.name || "EMPÓRIO AGROBELÉM";
  const displayStoreName = tradeName.toUpperCase().includes("EMPORIO") || tradeName.toUpperCase().includes("EMPÓRIO")
    ? "EMPÓRIO AGROBELÉM"
    : tradeName;
  const logo = company.theme?.logoPrincipal;
  const initialSlides = useMemo(
    () => parseStoreBannerSlides(company.digitalMenuBannerUrl),
    [company.digitalMenuBannerUrl]
  );
  const [bannerSlides, setBannerSlides] = useState<StoreBannerSlide[]>(initialSlides);

  useEffect(() => {
    setBannerSlides(parseStoreBannerSlides(company.digitalMenuBannerUrl));
  }, [company.digitalMenuBannerUrl]);

  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentSlideIdx >= bannerSlides.length) {
      setCurrentSlideIdx(0);
    }
  }, [bannerSlides.length, currentSlideIdx]);

  useEffect(() => {
    if (bannerSlides.length <= 1 || isCarouselPaused) return;
    const timer = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % bannerSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [bannerSlides.length, isCarouselPaused]);

  const activeSlide = bannerSlides[currentSlideIdx] || bannerSlides[0];
  const whatsappDigits = (company.whatsapp || company.phone || "").replace(/\D/g, "");
  const whatsappLink = whatsappDigits
    ? `https://wa.me/${whatsappDigits.startsWith("55") ? whatsappDigits : `55${whatsappDigits}`}?text=${encodeURIComponent(
        `Olá! Estou no catálogo online do ${displayStoreName} e gostaria de tirar uma dúvida.`
      )}`
    : null;

  const deliveryFeeBase = Number(company.digitalMenuDeliveryFee || 0);
  const minOrderValue = Number(company.digitalMenuMinOrder || 0);
  const deliveryEta = company.digitalMenuDeliveryEta || "30 a 50 min";
  const paymentOptions =
    company.digitalMenuPaymentMethods && company.digitalMenuPaymentMethods.length > 0
      ? company.digitalMenuPaymentMethods
      : ["PIX", "DINHEIRO", "CARTAO"];

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const categoriesSectionRef = useRef<HTMLElement | null>(null);

  // Navigation & Search
  const [activeBottomTab, setActiveBottomTab] = useState<"home" | "categories" | "favorites" | "contact" | "account">("home");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [visibleCount, setVisibleCount] = useState(36);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Cart & Product Detail
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productQtyDraft, setProductQtyDraft] = useState<Record<string, number>>({});
  const [detailProduct, setDetailProduct] = useState<DigitalMenuProduct | null>(null);
  const [detailQty, setDetailQty] = useState<number>(1);
  const [detailNote, setDetailNote] = useState<string>("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Favorites (synced with customer account if logged in, plus local fallback)
  const [favorites, setFavorites] = useState<string[]>([]);

  // Customer Account & Addresses
  const [accountLoading, setAccountLoading] = useState(true);
  const [loggedCustomer, setLoggedCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string;
  } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [customerOrders, setCustomerOrders] = useState<SubmittedOrder[]>([]);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountTab, setAccountTab] = useState<"profile" | "addresses" | "orders">("profile");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Auth / Profile Form
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // Checkout fields
  const [checkoutCustomerName, setCheckoutCustomerName] = useState("");
  const [checkoutCustomerPhone, setCheckoutCustomerPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"ENTREGA" | "RETIRADA" | "MESA">("ENTREGA");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [useNewAddress, setUseNewAddress] = useState(true);
  const [addrLabel, setAddrLabel] = useState("Casa");
  const [addrCep, setAddrCep] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrNumber, setAddrNumber] = useState("");
  const [addrComplement, setAddrComplement] = useState("");
  const [addrNeighborhood, setAddrNeighborhood] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("AL");
  const [addrReference, setAddrReference] = useState("");
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  const [mesaOrNotesLoc, setMesaOrNotesLoc] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentOptions[0] || "PIX");
  const [orderNotes, setOrderNotes] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // New Address inside "Minha Conta"
  const [accountAddrFormOpen, setAccountAddrFormOpen] = useState(false);

  // Order detail & live tracking
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<SubmittedOrder | null>(null);
  const [refreshingOrder, setRefreshingOrder] = useState(false);
  const [copiedPixCode, setCopiedPixCode] = useState(false);
  const [generatingPix, setGeneratingPix] = useState(false);

  // Auto-polling para pagamento PIX em tempo real
  useEffect(() => {
    if (
      !selectedOrderDetail ||
      selectedOrderDetail.paymentMethod !== "PIX" ||
      selectedOrderDetail.paymentStatus === "PAID"
    ) {
      return;
    }

    const orderId = selectedOrderDetail.id;
    let active = true;

    const interval = setInterval(async () => {
      try {
        const res = await checkLiveOrderPixStatus(orderId);
        if (active && res.paid) {
          setSelectedOrderDetail((prev) =>
            prev && prev.id === orderId
              ? {
                  ...prev,
                  paymentStatus: "PAID",
                  status: prev.status === "PENDING_APPROVAL" ? "CONFIRMED" : prev.status,
                  pixPaidAt: new Date().toISOString(),
                }
              : prev
          );
          setCustomerOrders((prev) =>
            prev.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    paymentStatus: "PAID",
                    status: o.status === "PENDING_APPROVAL" ? "CONFIRMED" : o.status,
                    pixPaidAt: new Date().toISOString(),
                  }
                : o
            )
          );
          showToast("✓ Pagamento via PIX confirmado com sucesso!");
        }
      } catch {}
    }, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedOrderDetail?.id, selectedOrderDetail?.paymentMethod, selectedOrderDetail?.paymentStatus]);

  const storageCartKey = `EMPORIO_STORE_CART_${company.id}`;
  const storageFavKey = `EMPORIO_STORE_FAVS_${company.id}`;
  const storageLastOrderKey = `DIGITAL_MENU_LAST_ORDER_${company.id}`;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // Load initial local cart, favorites, and customer account
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(storageCartKey);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) setCart(parsed);
      }
      const savedFavs = localStorage.getItem(storageFavKey);
      if (savedFavs) {
        const parsedFavs = JSON.parse(savedFavs);
        if (Array.isArray(parsedFavs)) setFavorites(parsedFavs);
      }
    } catch {}
  }, [storageCartKey, storageFavKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageCartKey, JSON.stringify(cart));
    } catch {}
  }, [cart, storageCartKey]);

  const refreshAccount = async () => {
    setAccountLoading(true);
    try {
      const res = await getStoreCustomerAccount(companyKey);
      if (res.customer) {
        setLoggedCustomer(res.customer);
        setCheckoutCustomerName((prev) => prev || res.customer.name);
        setCheckoutCustomerPhone((prev) => prev || res.customer.phone);
        setAuthName(res.customer.name);
        setAuthPhone(res.customer.phone);
        setAuthEmail(res.customer.email);
        const addrs = (res.addresses || []) as CustomerAddress[];
        setSavedAddresses(addrs);
        if (addrs.length > 0) {
          const def = addrs.find((a) => a.isDefault) || addrs[0];
          setSelectedAddressId(def.id);
          setUseNewAddress(false);
        } else {
          setUseNewAddress(true);
        }
        setCustomerOrders((res.orders || []) as unknown as SubmittedOrder[]);
        if (Array.isArray(res.favorites)) setFavorites(res.favorites);
      } else {
        setLoggedCustomer(null);
        setSavedAddresses([]);
        setCustomerOrders([]);
      }
    } finally {
      setAccountLoading(false);
    }
  };

  useEffect(() => {
    refreshAccount();
    try {
      const lastId = sessionStorage.getItem(storageLastOrderKey);
      if (lastId) {
        getPublicOrderStatus(lastId).then((res) => {
          if (res.success && res.order) {
            // mantém acessível se clicar em acompanhar
            setCustomerOrders((prev) =>
              prev.some((o) => o.id === res.order!.id)
                ? prev
                : [res.order as unknown as SubmittedOrder, ...prev]
            );
          }
        });
      }
    } catch {}
  }, [companyKey]);

  const lookupCep = async (rawCep: string) => {
    const clean = rawCep.replace(/\D/g, "");
    setAddrCep(rawCep);
    if (clean.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await r.json();
      if (!data.erro) {
        if (data.logradouro) setAddrStreet(data.logradouro);
        if (data.bairro) setAddrNeighborhood(data.bairro);
        if (data.localidade) setAddrCity(data.localidade);
        if (data.uf) setAddrState(data.uf);
      }
    } catch {}
  };

  const categories = useMemo(() => {
    if (company.categories && company.categories.length > 0) return company.categories;
    const map = new Map<string, DigitalMenuCategory>();
    for (const p of company.products) {
      if (p.category) {
        map.set(p.category.id, {
          id: p.category.id,
          name: p.category.name,
          imageUrl: p.category.imageUrl,
          sortOrder: p.category.sortOrder,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [company.categories, company.products]);

  const promoProducts = useMemo(
    () =>
      company.products.filter(
        (p) =>
          (p.promoPrice !== null &&
            p.promoPrice !== undefined &&
            Number(p.promoPrice) > 0 &&
            Number(p.promoPrice) < Number(p.price)) ||
          Number(p.discountPercent || 0) > 0
      ),
    [company.products]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return company.products.filter((p) => {
      if (activeBottomTab === "favorites" && !favorites.includes(p.id)) {
        return false;
      }
      const matchesCat =
        selectedCategory === "ALL" || p.categoryId === selectedCategory;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.category?.name || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [company.products, search, selectedCategory, activeBottomTab, favorites]);

  useEffect(() => {
    setVisibleCount(36);
  }, [selectedCategory, search, activeBottomTab]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );

  const cartItemsCount = cart.length;
  const cartSubtotal = useMemo(
    () => cart.reduce((acc, item) => acc + getEffectiveUnitPrice(item.product) * item.quantity, 0),
    [cart]
  );
  const appliedDeliveryFee = deliveryType === "ENTREGA" && cart.length > 0 ? deliveryFeeBase : 0;
  const cartTotal = Number((cartSubtotal + appliedDeliveryFee).toFixed(2));

  const addProductToCart = (product: DigitalMenuProduct, qty?: number, note?: string) => {
    const step = isFractionalProduct(product.unit, product.name) ? 0.5 : 1;
    const chosenQty = roundQty(qty ?? productQtyDraft[product.id] ?? (step === 0.5 ? 0.5 : 1));
    if (chosenQty <= 0) return;

    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx
            ? {
                ...item,
                quantity: roundQty(item.quantity + chosenQty),
                notes: note !== undefined ? note : item.notes,
              }
            : item
        );
      }
      return [...prev, { product, quantity: chosenQty, notes: note || "" }];
    });
    showToast(`Adicionado: ${product.name}`);
  };

  const updateCartItemQty = (productId: string, nextQty: number) => {
    const clean = roundQty(Math.max(0, nextQty));
    setCart((prev) =>
      prev
        .map((item) => (item.product.id === productId ? { ...item, quantity: clean } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleToggleFavorite = async (productId: string) => {
    const isFav = favorites.includes(productId);
    const localNext = isFav ? favorites.filter((id) => id !== productId) : [...favorites, productId];
    setFavorites(localNext);
    try {
      localStorage.setItem(storageFavKey, JSON.stringify(localNext));
    } catch {}

    if (loggedCustomer) {
      const res = await toggleStoreFavorite(companyKey, productId);
      if (res.success && Array.isArray(res.favorites)) {
        setFavorites(res.favorites);
      }
    }
    showToast(isFav ? "Removido dos favoritos" : "Salvo nos favoritos ❤️");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthBusy(true);
    try {
      const res =
        authMode === "register"
          ? await registerStoreCustomer({
              companyIdOrSlug: companyKey,
              name: authName,
              phone: authPhone,
              email: authEmail,
              password: authPassword,
            })
          : await loginStoreCustomer({
              companyIdOrSlug: companyKey,
              emailOrPhone: authEmail,
              password: authPassword,
            });
      if ("error" in res && res.error) {
        setAuthError(res.error);
        return;
      }
      setAuthPassword("");
      await refreshAccount();
      showToast(authMode === "register" ? "Conta criada com sucesso!" : "Bem-vindo(a) de volta!");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSaveAddressInAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthBusy(true);
    try {
      const res = await saveStoreDeliveryAddress({
        companyIdOrSlug: companyKey,
        label: addrLabel,
        zipCode: addrCep,
        street: addrStreet,
        number: addrNumber,
        complement: addrComplement,
        neighborhood: addrNeighborhood,
        city: addrCity,
        state: addrState,
        reference: addrReference,
        isDefault: true,
      });
      if (res.error) {
        setAuthError(res.error);
        return;
      }
      setAccountAddrFormOpen(false);
      await refreshAccount();
      showToast("Endereço salvo para entregas!");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");

    if (cart.length === 0) {
      setCheckoutError("Seu carrinho está vazio.");
      return;
    }
    if (minOrderValue > 0 && cartSubtotal < minOrderValue) {
      setCheckoutError(`Pedido mínimo para finalizar: R$ ${fmtBRL(minOrderValue)}.`);
      return;
    }
    if (checkoutCustomerName.trim().length < 2) {
      setCheckoutError("Informe seu nome completo.");
      return;
    }
    if (checkoutCustomerPhone.replace(/\D/g, "").length < 8) {
      setCheckoutError("Informe um telefone/WhatsApp válido.");
      return;
    }

    setSubmittingOrder(true);
    try {
      const res = await submitStoreOrder({
        companyIdOrSlug: companyKey,
        customerName: checkoutCustomerName.trim(),
        customerPhone: checkoutCustomerPhone.trim(),
        deliveryType,
        deliveryLocation: deliveryType === "MESA" ? mesaOrNotesLoc : undefined,
        deliveryAddressId:
          deliveryType === "ENTREGA" && !useNewAddress ? selectedAddressId : undefined,
        addressData:
          deliveryType === "ENTREGA" && useNewAddress
            ? {
                label: addrLabel,
                zipCode: addrCep,
                street: addrStreet,
                number: addrNumber,
                complement: addrComplement,
                neighborhood: addrNeighborhood,
                city: addrCity,
                state: addrState,
                reference: addrReference,
              }
            : undefined,
        saveAddress: Boolean(loggedCustomer && deliveryType === "ENTREGA" && useNewAddress && saveAddressForFuture),
        paymentMethod,
        notes: orderNotes.trim() || undefined,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          notes: i.notes.trim() || undefined,
        })),
      });

      if (res.error || !res.order) {
        setCheckoutError(res.error || "Não foi possível enviar o pedido.");
        return;
      }

      const created = res.order as unknown as SubmittedOrder;
      try {
        sessionStorage.setItem(storageLastOrderKey, created.id);
      } catch {}

      // Se for pagamento PIX, gera cobrança dinâmica caso gateway esteja ativo
      if (paymentMethod === "PIX") {
        try {
          const pixRes = await generateOrderLivePix(created.id);
          if (pixRes.success && "isDynamic" in pixRes && pixRes.isDynamic) {
            created.pixQrCodeUrl = pixRes.qrCodeUrl;
            created.pixQrCodeText = pixRes.qrCodeText;
            created.paymentGateway = pixRes.provider;
            created.paymentStatus = "PENDING";
            created.paymentTransactionId = pixRes.transactionId;
          }
        } catch {}
      }

      setCart([]);
      setIsCartOpen(false);
      setCustomerOrders((prev) => [created, ...prev.filter((o) => o.id !== created.id)]);
      setSelectedOrderDetail(created);
      if (loggedCustomer) refreshAccount();
      showToast("Pedido enviado com sucesso!");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleRefreshOrderStatus = async (orderId: string) => {
    setRefreshingOrder(true);
    try {
      const res = await getPublicOrderStatus(orderId);
      if (res.success && res.order) {
        const ord = res.order as unknown as SubmittedOrder;
        setSelectedOrderDetail(ord);
        setCustomerOrders((prev) => prev.map((o) => (o.id === ord.id ? ord : o)));
      }
    } finally {
      setRefreshingOrder(false);
    }
  };

  // Atualização automática do status do pedido na tela do cliente (polling a cada 6s)
  useEffect(() => {
    const activeIds = new Set<string>();
    const terminalStatuses = new Set(["DELIVERED", "REJECTED", "CANCELED"]);
    if (selectedOrderDetail && !terminalStatuses.has(selectedOrderDetail.status)) {
      activeIds.add(selectedOrderDetail.id);
    }
    for (const o of customerOrders) {
      if (!terminalStatuses.has(o.status)) {
        activeIds.add(o.id);
      }
    }
    if (activeIds.size === 0) return;

    const interval = setInterval(async () => {
      for (const orderId of activeIds) {
        try {
          const res = await getPublicOrderStatus(orderId);
          if (res.success && res.order) {
            const updated = res.order as unknown as SubmittedOrder;
            setSelectedOrderDetail((prev) => (prev && prev.id === updated.id ? updated : prev));
            setCustomerOrders((prev) => {
              const prevOrder = prev.find((o) => o.id === updated.id);
              if (prevOrder && prevOrder.status !== updated.status) {
                showToast("Status do seu pedido foi atualizado!");
              }
              return prev.map((o) => (o.id === updated.id ? updated : o));
            });
          }
        } catch {}
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [selectedOrderDetail?.id, selectedOrderDetail?.status, customerOrders.length]);

  const handleGeneratePixForOrder = async (orderId: string) => {
    setGeneratingPix(true);
    try {
      const pixRes = await generateOrderLivePix(orderId);
      if (pixRes.success && "isDynamic" in pixRes && pixRes.isDynamic) {
        setSelectedOrderDetail((prev) =>
          prev && prev.id === orderId
            ? {
                ...prev,
                pixQrCodeUrl: pixRes.qrCodeUrl,
                pixQrCodeText: pixRes.qrCodeText,
                paymentGateway: pixRes.provider,
                paymentStatus: "PENDING",
                paymentTransactionId: pixRes.transactionId,
              }
            : prev
        );
        showToast("Código Pix gerado!");
      } else {
        showToast("error" in pixRes && pixRes.error ? pixRes.error : "Não foi possível gerar o Pix dinâmico.");
      }
    } finally {
      setGeneratingPix(false);
    }
  };

  if (digitalMenuDisabled || company.digitalMenuEnabled === false) {
    return (
      <div className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-[#f5faf6] flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-emerald-200 rounded-3xl p-8 max-w-md w-full text-center shadow-sm space-y-4">
          <div className="flex justify-center">
            <EmporioLogo logoUrl={logo} storeName={displayStoreName} variant="dark" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Loja Temporariamente Fechada</h1>
          <p className="text-sm text-slate-600">
            Nosso catálogo online está pausado no momento. {company.digitalMenuHours ? `Horário: ${company.digitalMenuHours}.` : ""}
          </p>
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#0B5D2E] text-white px-5 py-3 rounded-2xl text-sm font-bold"
            >
              <MessageCircle size={18} /> Falar no WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden [touch-action:pan-y] bg-[#f4f8f4] text-slate-900 pb-24 sm:pb-12 font-sans selection:bg-emerald-200"
    >
      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-[#0B5D2E] text-white px-4 py-2.5 rounded-full shadow-xl border border-emerald-400/30 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Check size={14} className="text-lime-300" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── TOPO VERDE CURVO EMPÓRIO AGROBELÉM ── */}
      <header className="sticky top-0 z-30 bg-[#076F3A] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 pt-2.5 pb-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveBottomTab("home");
                setSelectedCategory("ALL");
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="text-left cursor-pointer"
            >
              <EmporioLogo logoUrl={logo} storeName={displayStoreName} variant="light" compact />
            </button>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar queijo, doce caseiro, galinha, mel..."
                className="w-full bg-white text-slate-900 pl-10 pr-4 py-2 rounded-full text-xs font-medium outline-none focus:ring-2 focus:ring-lime-300"
              />
            </div>

            {/* Ações Topo */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className="md:hidden w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Pesquisar"
              >
                <Search size={18} />
              </button>

              {whatsappLink ? (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-emerald-500 flex items-center justify-center transition-colors"
                  title="Falar no WhatsApp"
                >
                  <MessageCircle size={18} />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  title="Contato"
                >
                  <MessageCircle size={18} />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveBottomTab((prev) => (prev === "favorites" ? "home" : "favorites"));
                  catalogSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  activeBottomTab === "favorites"
                    ? "bg-lime-300 text-[#0B5D2E]"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
                title="Meus Favoritos"
              >
                <Heart size={15} className={activeBottomTab === "favorites" ? "fill-[#0B5D2E]" : ""} />
                <span className="hidden lg:inline">Favoritos</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                title="Minha Conta e Pedidos"
              >
                <User size={15} />
                <span className="max-w-[95px] truncate">
                  {loggedCustomer ? loggedCustomer.name.split(" ")[0] : "Minha Conta"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative px-3 h-9 rounded-full bg-[#15803D] hover:bg-lime-600 border border-white/20 flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer"
                aria-label="Carrinho"
              >
                <ShoppingCart size={16} />
                <span className="hidden sm:inline">Carrinho</span>
                {cartItemsCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-lime-300 text-[#0B5D2E] text-[10px] font-black flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Menu"
              >
                <Menu size={19} />
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          {searchOpen && (
            <div className="mt-2.5 md:hidden relative animate-in fade-in duration-150">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                placeholder="Buscar produto caseiro, queijo, doce..."
                className="w-full bg-white text-slate-900 pl-10 pr-9 py-2.5 rounded-full text-sm font-medium outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>
        {/* Onda curva sutil na base do cabeçalho */}
        <div className="h-3 bg-[#f4f8f4] rounded-t-[24px] -mb-px" />
      </header>

      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 space-y-6 pt-1">
        {/* ── BANNER PRINCIPAL RURAL (CARROSSEL AUTOMÁTICO) ── */}
        {activeBottomTab === "home" && !search && selectedCategory === "ALL" && activeSlide && (
          <div
            className="relative group"
            onMouseEnter={() => setIsCarouselPaused(true)}
            onMouseLeave={() => setIsCarouselPaused(false)}
            onTouchStart={(e) => {
              setIsCarouselPaused(true);
              touchStartXRef.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              setIsCarouselPaused(false);
              const startX = touchStartXRef.current;
              const endX = e.changedTouches[0]?.clientX;
              if (startX !== null && endX !== undefined && bannerSlides.length > 1) {
                const diff = startX - endX;
                if (diff > 40) {
                  setCurrentSlideIdx((prev) => (prev + 1) % bannerSlides.length);
                } else if (diff < -40) {
                  setCurrentSlideIdx((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);
                }
              }
              touchStartXRef.current = null;
            }}
          >
            <section className="relative rounded-[28px] overflow-hidden shadow-md border border-emerald-900/10 min-h-[215px] sm:min-h-[300px] flex items-center bg-[#073B1C]">
              {bannerSlides.map((slide, idx) => (
                <div
                  key={slide.id || idx}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    idx === currentSlideIdx ? "opacity-100 z-0" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <img
                    src={slide.imageUrl}
                    alt={slide.title || "Produtos caseiros Empório Agrobelém"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#073B1C]/85 via-[#076F3A]/55 to-transparent" />
                </div>
              ))}

              <div className="relative z-10 p-5 sm:p-10 max-w-lg space-y-3 text-white">
                <h1 className="text-xl sm:text-3xl font-black leading-tight drop-shadow-sm">
                  {activeSlide.title || "Produtos caseiros com muito sabor e qualidade!"}
                </h1>
                {activeSlide.subtitle && (
                  <div className="inline-flex items-center gap-2 bg-[#076F3A]/95 border border-lime-400/40 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-sm">
                    <Leaf size={14} className="text-lime-300 shrink-0" />
                    <span>{activeSlide.subtitle}</span>
                  </div>
                )}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeSlide.categoryFilter && activeSlide.categoryFilter !== "ALL") {
                        const matchCat = categories.find(
                          (c) =>
                            c.id === activeSlide.categoryFilter ||
                            c.name.toLowerCase().includes(activeSlide.categoryFilter!.toLowerCase())
                        );
                        if (matchCat) setSelectedCategory(matchCat.id);
                      }
                      catalogSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="bg-white hover:bg-lime-50 text-[#076F3A] font-black text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    {activeSlide.buttonText || "Comprar agora →"}
                  </button>
                </div>
              </div>

              {bannerSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlideIdx((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length)
                    }
                    className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/35 hover:bg-[#076F3A] text-white items-center justify-center backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 cursor-pointer border border-white/25"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlideIdx((prev) => (prev + 1) % bannerSlides.length)
                    }
                    className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/35 hover:bg-[#076F3A] text-white items-center justify-center backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 cursor-pointer border border-white/25"
                    aria-label="Próxima foto"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </section>

            {/* Indicadores de slides (bolinhas clicáveis) */}
            {bannerSlides.length > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2.5">
                {bannerSlides.map((slide, idx) => (
                  <button
                    key={slide.id || idx}
                    type="button"
                    onClick={() => setCurrentSlideIdx(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      idx === currentSlideIdx
                        ? "w-7 h-2.5 bg-[#076F3A]"
                        : "w-2.5 h-2.5 bg-slate-300 hover:bg-emerald-400"
                    }`}
                    aria-label={`Ver foto ${idx + 1} de ${bannerSlides.length}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CATEGORIAS COM IMAGENS ── */}
        <section ref={categoriesSectionRef} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-[#0B5D2E] flex items-center gap-2">
              <Leaf size={18} className="text-[#15803D]" />
              <span>Categorias</span>
            </h2>
            {selectedCategory !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className="text-xs font-bold text-[#0B5D2E] bg-white border border-emerald-200 px-3 py-1 rounded-full hover:bg-emerald-50 cursor-pointer"
              >
                Ver Todos &gt;
              </button>
            )}
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("ALL");
                setActiveBottomTab("home");
              }}
              className={`snap-start shrink-0 w-[88px] sm:w-[106px] rounded-2xl p-2 border-2 transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                selectedCategory === "ALL" && activeBottomTab !== "favorites"
                  ? "bg-emerald-50 border-[#0B5D2E] shadow-xs"
                  : "bg-white border-emerald-100 hover:border-emerald-300"
              }`}
            >
              <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-xl overflow-hidden bg-emerald-100">
                <img
                  src="/emporio-store/hero-banner.jpg"
                  alt="Todos"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[11px] font-extrabold text-center text-[#0B5D2E] leading-tight">
                Todos
              </span>
            </button>

            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setActiveBottomTab("home");
                  }}
                  className={`snap-start shrink-0 w-[94px] sm:w-[112px] rounded-2xl p-2 border-2 transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-emerald-50 border-[#0B5D2E] shadow-xs"
                      : "bg-white border-emerald-100 hover:border-emerald-300"
                  }`}
                >
                  <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-xl overflow-hidden bg-emerald-50">
                    <img
                      src={resolveCategoryImage(cat.name, cat.imageUrl)}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-extrabold text-center text-slate-800 line-clamp-2 leading-tight">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── ÁREA EXCLUSIVA: OFERTAS ESPECIAIS ── */}
        {promoProducts.length > 0 && activeBottomTab === "home" && !search && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-[#0B5D2E] flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <span>Ofertas Especiais</span>
              </h2>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                {promoProducts.length} em promoção
              </span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
              {promoProducts.map((p) => {
                const eff = getEffectiveUnitPrice(p);
                const disc =
                  p.discountPercent && p.discountPercent > 0
                    ? p.discountPercent
                    : Math.round(((p.price - eff) / Math.max(0.01, p.price)) * 100);
                return (
                  <div
                    key={p.id}
                    className="snap-start shrink-0 w-[205px] sm:w-[230px] bg-white border-2 border-amber-200 rounded-3xl p-3 shadow-xs flex flex-col justify-between relative"
                  >
                    <span className="absolute top-3 left-3 z-10 bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                      -{disc}% OFF
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(p.id)}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center shadow-2xs"
                    >
                      <Heart
                        size={15}
                        className={
                          favorites.includes(p.id)
                            ? "fill-rose-500 text-rose-500"
                            : "text-slate-400"
                        }
                      />
                    </button>

                    <div
                      onClick={() => {
                        setDetailProduct(p);
                        setDetailQty(isFractionalProduct(p.unit, p.name) ? 0.5 : 1);
                        setDetailNote("");
                      }}
                      className="cursor-pointer"
                    >
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-emerald-50 mb-2.5">
                        <img
                          src={resolveProductImage(p)}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">
                        {p.name}
                      </h3>
                      <div className="mt-1.5">
                        <span className="text-[11px] text-slate-400 line-through block">
                          De R$ {fmtBRL(p.price)}
                        </span>
                        <span className="text-base font-black text-[#0B5D2E] font-mono">
                          por R$ {fmtBRL(eff)}{" "}
                          <span className="text-[10px] font-bold text-slate-500">
                            /{(p.unit || "un").toLowerCase()}
                          </span>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => addProductToCart(p)}
                      className="mt-3 w-full py-2.5 rounded-full bg-[#0B5D2E] hover:bg-[#084422] text-white font-black text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Comprar
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── NOSSOS PRODUTOS ── */}
        <section ref={catalogSectionRef} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-black text-[#0B5D2E] flex items-center gap-2">
              <Leaf size={18} className="text-[#15803D]" />
              <span>
                {activeBottomTab === "favorites"
                  ? "Meus Favoritos"
                  : selectedCategory === "ALL"
                  ? "Nossos Produtos"
                  : categories.find((c) => c.id === selectedCategory)?.name || "Produtos"}
              </span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {filteredProducts.length} item(ns)
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-emerald-100 rounded-3xl p-10 text-center space-y-2 shadow-2xs">
              <Package size={36} className="mx-auto text-emerald-300" />
              <p className="font-bold text-slate-700 text-sm">
                {activeBottomTab === "favorites"
                  ? "Você ainda não favoritou nenhum produto."
                  : "Nenhum produto encontrado nesta seleção."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("ALL");
                  setActiveBottomTab("home");
                }}
                className="mt-2 px-4 py-2 rounded-full bg-[#0B5D2E] text-white text-xs font-bold cursor-pointer"
              >
                Ver catálogo completo
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {visibleProducts.map((p) => {
                const eff = getEffectiveUnitPrice(p);
                const hasPromo = eff < Number(p.price);
                const frac = isFractionalProduct(p.unit, p.name);
                const step = frac ? 0.1 : 1;
                const qtyVal = productQtyDraft[p.id] ?? (frac ? 0.5 : 1);
                const isFav = favorites.includes(p.id);
                const inCart = cart.find((c) => c.product.id === p.id);

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-emerald-100 rounded-3xl p-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative"
                  >
                    {hasPromo && (
                      <span className="absolute top-3 left-3 z-10 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        OFERTA
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(p.id)}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center shadow-2xs cursor-pointer"
                      aria-label="Favoritar"
                    >
                      <Heart
                        size={15}
                        className={isFav ? "fill-rose-500 text-rose-500" : "text-slate-400"}
                      />
                    </button>

                    <div>
                      <div
                        onClick={() => {
                          setDetailProduct(p);
                          setDetailQty(frac ? 0.5 : 1);
                          setDetailNote("");
                        }}
                        className="aspect-[4/3] rounded-2xl overflow-hidden bg-emerald-50 mb-2.5 cursor-pointer"
                      >
                        <img
                          src={resolveProductImage(p)}
                          alt={p.name}
                          loading="lazy"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {p.category?.name && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-0.5 truncate">
                          {p.category.name}
                        </span>
                      )}

                      <h3
                        onClick={() => {
                          setDetailProduct(p);
                          setDetailQty(frac ? 0.5 : 1);
                          setDetailNote("");
                        }}
                        className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug cursor-pointer hover:text-[#0B5D2E]"
                      >
                        {p.name}
                      </h3>

                      {p.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-tight">
                          {p.description}
                        </p>
                      )}

                      <div className="mt-2">
                        {hasPromo && (
                          <span className="text-[11px] text-slate-400 line-through block">
                            De R$ {fmtBRL(p.price)}
                          </span>
                        )}
                        <div className="text-sm sm:text-base font-black text-[#0B5D2E] font-mono">
                          {hasPromo ? "Por " : ""}R$ {fmtBRL(eff)}
                          <span className="text-[10px] font-bold text-slate-500 ml-1">
                            / {(p.unit || "UN").toLowerCase()}
                          </span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                          {p.stock > 0 ? `Disponível (${String(roundQty(p.stock)).replace(".", ",")} ${(p.unit || "un").toLowerCase()})` : "Sob encomenda"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-emerald-50 space-y-2">
                      {/* Seletor de quantidade / fração */}
                      <div className="flex items-center justify-between bg-[#f4f8f4] border border-emerald-100 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() =>
                            setProductQtyDraft((prev) => ({
                              ...prev,
                              [p.id]: Math.max(frac ? 0.1 : 1, roundQty(qtyVal - step)),
                            }))
                          }
                          className="w-7 h-7 rounded-lg bg-white text-[#0B5D2E] flex items-center justify-center shadow-2xs"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-mono font-black text-slate-800 px-1">
                          {fmtQty(qtyVal, p.unit, p.name)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setProductQtyDraft((prev) => ({
                              ...prev,
                              [p.id]: roundQty(qtyVal + step),
                            }))
                          }
                          className="w-7 h-7 rounded-lg bg-white text-[#0B5D2E] flex items-center justify-center shadow-2xs"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {frac && (
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { label: "250g", v: 0.25 },
                            { label: "500g", v: 0.5 },
                            { label: "1kg", v: 1 },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() =>
                                setProductQtyDraft((prev) => ({ ...prev, [p.id]: preset.v }))
                              }
                              className={`py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                qtyVal === preset.v
                                  ? "bg-[#0B5D2E] text-white border-[#0B5D2E]"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => addProductToCart(p, qtyVal)}
                        className="w-full py-2 rounded-full bg-[#0B5D2E] hover:bg-[#084422] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <ShoppingBag size={13} />
                        <span>Adicionar ao carrinho</span>
                      </button>

                      {inCart && (
                        <div className="text-center text-[10px] font-black text-emerald-700">
                          ✓ No carrinho: {fmtQty(inCart.quantity, p.unit, p.name)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>

              {filteredProducts.length > visibleProducts.length && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 36)}
                    className="px-6 py-3 rounded-full bg-white hover:bg-emerald-50 text-[#0B5D2E] border-2 border-[#0B5D2E] font-black text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Mostrar mais produtos ({filteredProducts.length - visibleProducts.length} restantes)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCount(filteredProducts.length)}
                    className="px-5 py-3 rounded-full bg-emerald-100/70 hover:bg-emerald-100 text-[#0B5D2E] font-bold text-xs transition-all cursor-pointer"
                  >
                    Ver todos ({filteredProducts.length})
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── BARRA DE CONFIANÇA RURAL ── */}
        <section className="bg-white border border-emerald-100 rounded-3xl p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-2xs">
          {[
            { icon: <ShieldCheck size={20} />, label: "Compra Segura" },
            { icon: <Leaf size={20} />, label: "Produtos Naturais" },
            { icon: <Handshake size={20} />, label: "Apoie o Produtor Local" },
            { icon: <Truck size={20} />, label: "Entrega com Carinho" },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2.5 text-[#0B5D2E]">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                {b.icon}
              </div>
              <span className="text-xs font-extrabold leading-tight">{b.label}</span>
            </div>
          ))}
        </section>

        {/* ── INFORMAÇÕES DA LOJA ── */}
        {(company.address || company.digitalMenuHours || company.digitalMenuStoreInfo || company.digitalMenuNotes) && (
          <footer className="bg-white border border-emerald-100 rounded-3xl p-5 space-y-2 text-xs text-slate-600 shadow-2xs">
            <div className="font-black text-[#0B5D2E] text-sm">{displayStoreName}</div>
            {company.digitalMenuStoreInfo && <p>{company.digitalMenuStoreInfo}</p>}
            {company.digitalMenuNotes && (
              <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-medium">
                {company.digitalMenuNotes}
              </p>
            )}
            <div className="flex flex-wrap gap-4 pt-1 text-[11px] font-semibold">
              {company.address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} className="text-[#0B5D2E]" /> {company.address}
                </span>
              )}
              {company.digitalMenuHours && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} className="text-[#0B5D2E]" /> {company.digitalMenuHours}
                </span>
              )}
              {company.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={13} className="text-[#0B5D2E]" /> {company.phone}
                </span>
              )}
              {company.digitalMenuInstagram && (
                <span className="inline-flex items-center gap-1 text-pink-700">
                  <Globe size={13} /> Instagram: {company.digitalMenuInstagram}
                </span>
              )}
              {company.digitalMenuFacebook && (
                <span className="inline-flex items-center gap-1 text-blue-700">
                  <Share2 size={13} /> Facebook: {company.digitalMenuFacebook}
                </span>
              )}
            </div>
          </footer>
        )}
      </main>

      {/* ── BARRA INFERIOR FIXA MOBILE (IGUAL REFERÊNCIA) ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#076F3A] text-white border-t border-emerald-800 px-2 py-1.5 grid grid-cols-5 items-center shadow-[0_-6px_20px_rgba(0,0,0,0.12)]">
        <button
          type="button"
          onClick={() => {
            setActiveBottomTab("home");
            setSelectedCategory("ALL");
            scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold ${
            activeBottomTab === "home" ? "text-lime-300" : "text-emerald-100"
          }`}
        >
          <Home size={18} />
          <span>Início</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveBottomTab("categories");
            categoriesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
          className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold ${
            activeBottomTab === "categories" ? "text-lime-300" : "text-emerald-100"
          }`}
        >
          <LayoutGrid size={18} />
          <span>Categorias</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveBottomTab("favorites");
            catalogSectionRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
          className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold ${
            activeBottomTab === "favorites" ? "text-lime-300" : "text-emerald-100"
          }`}
        >
          <Heart size={18} />
          <span>Favoritos</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (whatsappLink) window.open(whatsappLink, "_blank", "noopener,noreferrer");
            else setDrawerOpen(true);
          }}
          className="flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold text-emerald-100"
        >
          <MessageCircle size={18} />
          <span>Contato</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveBottomTab("account");
            setAccountModalOpen(true);
          }}
          className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold ${
            activeBottomTab === "account" ? "text-lime-300" : "text-emerald-100"
          }`}
        >
          <User size={18} />
          <span>Minha Conta</span>
        </button>
      </nav>

      {/* ── BARRA FLUTUANTE DO CARRINHO ── */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-16 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#0B5D2E] hover:bg-[#084422] text-white rounded-full px-5 py-3 shadow-2xl border border-lime-400/30 flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2 text-xs font-black">
              <ShoppingCart size={16} className="text-lime-300" />
              Ver Carrinho ({cartItemsCount})
            </span>
            <span className="font-mono font-black text-sm">
              R$ {fmtBRL(cartSubtotal)} →
            </span>
          </button>
        </div>
      )}

      {/* ── MENU LATERAL (DRAWER) ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xs bg-white h-full p-5 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <EmporioLogo logoUrl={logo} storeName={displayStoreName} variant="dark" compact />
                <button type="button" onClick={() => setDrawerOpen(false)} className="p-1 text-slate-500">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-1.5">
                {[
                  {
                    label: "Início & Ofertas",
                    icon: <Home size={16} />,
                    onClick: () => {
                      setActiveBottomTab("home");
                      setSelectedCategory("ALL");
                      setDrawerOpen(false);
                    },
                  },
                  {
                    label: "Minha Conta",
                    icon: <User size={16} />,
                    onClick: () => {
                      setDrawerOpen(false);
                      setAccountTab("profile");
                      setAccountModalOpen(true);
                    },
                  },
                  {
                    label: "Meus Endereços",
                    icon: <MapPin size={16} />,
                    onClick: () => {
                      setDrawerOpen(false);
                      setAccountTab("addresses");
                      setAccountModalOpen(true);
                    },
                  },
                  {
                    label: "Meus Pedidos",
                    icon: <Package size={16} />,
                    onClick: () => {
                      setDrawerOpen(false);
                      setAccountTab("orders");
                      setAccountModalOpen(true);
                    },
                  },
                  {
                    label: `Favoritos (${favorites.length})`,
                    icon: <Heart size={16} />,
                    onClick: () => {
                      setDrawerOpen(false);
                      setActiveBottomTab("favorites");
                    },
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl hover:bg-emerald-50 text-slate-800 font-bold text-sm cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 text-[#0B5D2E]">
                      {item.icon} <span className="text-slate-800">{item.label}</span>
                    </span>
                    <ChevronRight size={15} className="text-slate-400" />
                  </button>
                ))}
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs space-y-1.5 text-emerald-950">
                <div className="font-black text-[#0B5D2E] uppercase text-[10px]">
                  Entrega & Funcionamento
                </div>
                {company.digitalMenuHours && <div>🕒 {company.digitalMenuHours}</div>}
                <div>
                  🚚 Taxa de entrega:{" "}
                  <strong>{deliveryFeeBase > 0 ? `R$ ${fmtBRL(deliveryFeeBase)}` : "Grátis"}</strong>
                </div>
                <div>⏱️ Prazo estimado: {deliveryEta}</div>
                {minOrderValue > 0 && <div>🛒 Pedido mínimo: R$ {fmtBRL(minOrderValue)}</div>}
                {company.address && <div>📍 {company.address}</div>}
              </div>
            </div>

            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full py-3 rounded-2xl bg-[#0B5D2E] text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} /> Chamar no WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DETALHES DO PRODUTO ── */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="relative aspect-[16/10] bg-emerald-50">
              <img
                src={resolveProductImage(detailProduct)}
                alt={detailProduct.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 text-slate-700 flex items-center justify-center shadow"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                {detailProduct.category?.name && (
                  <span className="text-[11px] font-extrabold uppercase text-[#0B5D2E] bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    {detailProduct.category.name}
                  </span>
                )}
                <h3 className="text-xl font-black text-slate-900 mt-2">{detailProduct.name}</h3>
                {detailProduct.description && (
                  <p className="text-sm text-slate-600 mt-1">{detailProduct.description}</p>
                )}
              </div>

              <div className="flex items-baseline justify-between bg-[#f4f8f4] p-3.5 rounded-2xl">
                <div>
                  {getEffectiveUnitPrice(detailProduct) < detailProduct.price && (
                    <span className="text-xs text-slate-400 line-through block">
                      De R$ {fmtBRL(detailProduct.price)}
                    </span>
                  )}
                  <span className="text-2xl font-black text-[#0B5D2E] font-mono">
                    R$ {fmtBRL(getEffectiveUnitPrice(detailProduct))}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">
                    / {(detailProduct.unit || "UN").toLowerCase()}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {detailProduct.stock > 0
                    ? `Estoque: ${String(roundQty(detailProduct.stock)).replace(".", ",")} ${(detailProduct.unit || "un").toLowerCase()}`
                    : "Disponível sob encomenda"}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Quantidade / Peso
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const step = isFractionalProduct(detailProduct.unit, detailProduct.name) ? 0.1 : 1;
                      setDetailQty((q) => Math.max(step, roundQty(q - step)));
                    }}
                    className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0B5D2E] flex items-center justify-center border border-emerald-200"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    step={isFractionalProduct(detailProduct.unit, detailProduct.name) ? "0.05" : "1"}
                    min="0.05"
                    value={detailQty}
                    onChange={(e) => setDetailQty(Math.max(0.05, parseFloat(e.target.value) || 0.5))}
                    className="flex-1 text-center font-mono font-black text-lg border border-emerald-200 rounded-xl py-2 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const step = isFractionalProduct(detailProduct.unit, detailProduct.name) ? 0.1 : 1;
                      setDetailQty((q) => roundQty(q + step));
                    }}
                    className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0B5D2E] flex items-center justify-center border border-emerald-200"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {isFractionalProduct(detailProduct.unit, detailProduct.name) && (
                  <div className="flex gap-1.5">
                    {[
                      { l: "100g", v: 0.1 },
                      { l: "250g", v: 0.25 },
                      { l: "500g", v: 0.5 },
                      { l: "1kg", v: 1 },
                    ].map((p) => (
                      <button
                        key={p.l}
                        type="button"
                        onClick={() => setDetailQty(p.v)}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0B5D2E] text-xs font-bold border border-emerald-200"
                      >
                        {p.l}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Observação (opcional)
                </label>
                <input
                  type="text"
                  value={detailNote}
                  onChange={(e) => setDetailNote(e.target.value)}
                  placeholder="Ex: Bem curado, fatiado fino..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#0B5D2E]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  addProductToCart(detailProduct, detailQty, detailNote);
                  setDetailProduct(null);
                }}
                className="w-full py-3.5 rounded-full bg-[#0B5D2E] hover:bg-[#084422] text-white font-black text-sm shadow-lg cursor-pointer"
              >
                Adicionar ao carrinho · R$ {fmtBRL(getEffectiveUnitPrice(detailProduct) * detailQty)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CARRINHO & FINALIZAR PEDIDO ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl">
            <div className="p-4 sm:p-5 bg-[#0B5D2E] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <ShoppingCart size={20} className="text-lime-300" />
                <div>
                  <h2 className="font-black text-base">Meu Carrinho</h2>
                  <p className="text-[11px] text-emerald-100">{displayStoreName}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-full hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <ShoppingBag size={44} className="mx-auto text-emerald-200" />
                  <p className="font-bold text-slate-700">Seu carrinho está vazio</p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="px-5 py-2.5 rounded-full bg-[#0B5D2E] text-white text-xs font-bold"
                  >
                    Escolher Produtos
                  </button>
                </div>
              ) : (
                <form id="store-checkout-form" onSubmit={handleSubmitCheckout} className="space-y-5">
                  {/* Itens do Carrinho */}
                  <div className="space-y-2.5">
                    {cart.map((item) => {
                      const eff = getEffectiveUnitPrice(item.product);
                      const frac = isFractionalProduct(item.product.unit, item.product.name);
                      const step = frac ? 0.1 : 1;
                      return (
                        <div
                          key={item.product.id}
                          className="bg-[#f4f8f4] border border-emerald-100 rounded-2xl p-3 flex gap-3 items-center"
                        >
                          <img
                            src={resolveProductImage(item.product)}
                            alt={item.product.name}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 bg-white"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                {item.product.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartItemQty(item.product.id, 0)}
                                className="text-slate-400 hover:text-rose-600 shrink-0"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Unit: R$ {fmtBRL(eff)} / {(item.product.unit || "un").toLowerCase()}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-xl p-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQty(item.product.id, item.quantity - step)}
                                  className="w-6 h-6 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-[#0B5D2E]"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="px-2 text-xs font-mono font-black text-slate-900">
                                  {fmtQty(item.quantity, item.product.unit, item.product.name)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQty(item.product.id, item.quantity + step)}
                                  className="w-6 h-6 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-[#0B5D2E]"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              <span className="font-mono font-black text-sm text-[#0B5D2E]">
                                R$ {fmtBRL(eff * item.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Identificação / Conta */}
                  <div className="bg-white border border-emerald-200 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#0B5D2E] uppercase">
                        Seus Dados
                      </span>
                      {!loggedCustomer && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCartOpen(false);
                            setAccountModalOpen(true);
                          }}
                          className="text-[11px] font-bold text-emerald-700 underline cursor-pointer"
                        >
                          Já tenho conta / Cadastrar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={checkoutCustomerName}
                        onChange={(e) => setCheckoutCustomerName(e.target.value)}
                        placeholder="Nome completo *"
                        className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#0B5D2E]"
                      />
                      <input
                        type="tel"
                        required
                        value={checkoutCustomerPhone}
                        onChange={(e) => setCheckoutCustomerPhone(e.target.value)}
                        placeholder="WhatsApp / Telefone *"
                        className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-[#0B5D2E]"
                      />
                    </div>
                  </div>

                  {/* Forma de Entrega */}
                  <div className="space-y-2">
                    <span className="text-xs font-black text-[#0B5D2E] uppercase block">
                      Forma de entrega
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "ENTREGA" as const, label: "Entrega em domicílio", icon: <Truck size={15} /> },
                        { key: "RETIRADA" as const, label: "Retirada no local", icon: <Store size={15} /> },
                        { key: "MESA" as const, label: "Estou na loja / Mesa", icon: <Utensils size={15} /> },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setDeliveryType(opt.key)}
                          className={`p-2.5 rounded-2xl border-2 text-center flex flex-col items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
                            deliveryType === opt.key
                              ? "border-[#0B5D2E] bg-emerald-50 text-[#0B5D2E]"
                              : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {opt.icon}
                          <span className="leading-tight">{opt.label}</span>
                        </button>
                      ))}
                    </div>

                    {deliveryType === "ENTREGA" && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between font-semibold">
                        <span>Prazo estimado: {deliveryEta}</span>
                        <span>
                          Taxa: <strong>{deliveryFeeBase > 0 ? `R$ ${fmtBRL(deliveryFeeBase)}` : "Grátis"}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Endereço de Entrega */}
                  {deliveryType === "ENTREGA" && (
                    <div className="bg-[#f4f8f4] border border-emerald-200 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#0B5D2E] uppercase">
                          Endereço de entrega
                        </span>
                        {savedAddresses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setUseNewAddress((v) => !v)}
                            className="text-[11px] font-bold text-[#0B5D2E] underline cursor-pointer"
                          >
                            {useNewAddress ? "Escolher endereço salvo" : "+ Novo endereço"}
                          </button>
                        )}
                      </div>

                      {!useNewAddress && savedAddresses.length > 0 ? (
                        <div className="space-y-1.5">
                          {savedAddresses.map((addr) => (
                            <label
                              key={addr.id}
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer ${
                                selectedAddressId === addr.id
                                  ? "bg-white border-[#0B5D2E]"
                                  : "bg-white/60 border-slate-200"
                              }`}
                            >
                              <input
                                type="radio"
                                name="savedAddr"
                                checked={selectedAddressId === addr.id}
                                onChange={() => setSelectedAddressId(addr.id)}
                                className="mt-1 text-[#0B5D2E]"
                              />
                              <div className="text-xs">
                                <div className="font-black text-slate-900">
                                  {addr.label} {addr.isDefault && <span className="text-[10px] text-emerald-700">(Padrão)</span>}
                                </div>
                                <div className="text-slate-600">
                                  {addr.street}, {addr.number}
                                  {addr.complement ? ` · ${addr.complement}` : ""} — {addr.neighborhood}, {addr.city}/{addr.state}
                                </div>
                                {addr.reference && (
                                  <div className="text-[10px] text-slate-500">Ref: {addr.reference}</div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={addrCep}
                              onChange={(e) => lookupCep(e.target.value)}
                              placeholder="CEP"
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-[#0B5D2E]"
                            />
                            <input
                              type="text"
                              required
                              value={addrStreet}
                              onChange={(e) => setAddrStreet(e.target.value)}
                              placeholder="Rua / Logradouro *"
                              className="col-span-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0B5D2E]"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              required
                              value={addrNumber}
                              onChange={(e) => setAddrNumber(e.target.value)}
                              placeholder="Número *"
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0B5D2E]"
                            />
                            <input
                              type="text"
                              value={addrComplement}
                              onChange={(e) => setAddrComplement(e.target.value)}
                              placeholder="Complemento"
                              className="col-span-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0B5D2E]"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              required
                              value={addrNeighborhood}
                              onChange={(e) => setAddrNeighborhood(e.target.value)}
                              placeholder="Bairro *"
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0B5D2E]"
                            />
                            <input
                              type="text"
                              required
                              value={addrCity}
                              onChange={(e) => setAddrCity(e.target.value)}
                              placeholder="Cidade *"
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0B5D2E]"
                            />
                            <input
                              type="text"
                              required
                              maxLength={2}
                              value={addrState}
                              onChange={(e) => setAddrState(e.target.value.toUpperCase())}
                              placeholder="UF *"
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono uppercase outline-none focus:border-[#0B5D2E]"
                            />
                          </div>
                          <input
                            type="text"
                            value={addrReference}
                            onChange={(e) => setAddrReference(e.target.value)}
                            placeholder="Ponto de referência (ex: próximo à praça)"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0B5D2E]"
                          />
                          {loggedCustomer && (
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                checked={saveAddressForFuture}
                                onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                                className="rounded text-[#0B5D2E]"
                              />
                              <span>Usar este endereço para entrega e salvar na minha conta</span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {deliveryType === "MESA" && (
                    <input
                      type="text"
                      required
                      value={mesaOrNotesLoc}
                      onChange={(e) => setMesaOrNotesLoc(e.target.value)}
                      placeholder="Informe o número da Mesa ou local na loja *"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#0B5D2E]"
                    />
                  )}

                  {/* Forma de Pagamento */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-[#0B5D2E] uppercase block">
                      Forma de pagamento
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {paymentOptions.map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setPaymentMethod(pm)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                            paymentMethod === pm
                              ? "border-[#0B5D2E] bg-emerald-50 text-[#0B5D2E]"
                              : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {PAYMENT_OPTION_LABELS[pm] || pm}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Observações do pedido (troco, horário, recado...)"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#0B5D2E]"
                    />
                  </div>

                  {checkoutError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{checkoutError}</span>
                    </div>
                  )}
                </form>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2.5 shrink-0">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold">R$ {fmtBRL(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxa de entrega</span>
                    <span className="font-mono font-bold">
                      {deliveryType === "ENTREGA"
                        ? appliedDeliveryFee > 0
                          ? `R$ ${fmtBRL(appliedDeliveryFee)}`
                          : "Grátis"
                        : "Retirada (R$ 0,00)"}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total da compra</span>
                    <span className="font-mono text-[#0B5D2E]">R$ {fmtBRL(cartTotal)}</span>
                  </div>
                </div>
                <button
                  type="submit"
                  form="store-checkout-form"
                  disabled={submittingOrder}
                  className="w-full py-3.5 rounded-full bg-[#0B5D2E] hover:bg-[#084422] disabled:opacity-50 text-white font-black text-sm shadow-lg cursor-pointer"
                >
                  {submittingOrder ? "Enviando pedido..." : "Finalizar pedido"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MINHA CONTA (LOGIN / CADASTRO / PERFIL / ENDEREÇOS / PEDIDOS) ── */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 sm:p-5 bg-[#0B5D2E] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <User size={20} className="text-lime-300" />
                <h2 className="font-black text-base">
                  {loggedCustomer ? `Olá, ${loggedCustomer.name.split(" ")[0]}` : "Minha Conta"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {!loggedCustomer ? (
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 bg-emerald-50 p-1 rounded-2xl border border-emerald-200">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                    }}
                    className={`py-2 rounded-xl text-xs font-black cursor-pointer ${
                      authMode === "login" ? "bg-[#0B5D2E] text-white" : "text-[#0B5D2E]"
                    }`}
                  >
                    Já tenho conta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError("");
                    }}
                    className={`py-2 rounded-xl text-xs font-black cursor-pointer ${
                      authMode === "register" ? "bg-[#0B5D2E] text-white" : "text-[#0B5D2E]"
                    }`}
                  >
                    Criar minha conta
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  {authMode === "register" && (
                    <>
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Nome completo *"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B5D2E]"
                      />
                      <input
                        type="tel"
                        required
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        placeholder="Telefone / WhatsApp *"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-[#0B5D2E]"
                      />
                    </>
                  )}

                  <input
                    type="text"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder={authMode === "register" ? "E-mail *" : "E-mail ou WhatsApp *"}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B5D2E]"
                  />

                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Senha *"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B5D2E]"
                  />

                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full py-3.5 rounded-full bg-[#0B5D2E] hover:bg-[#084422] disabled:opacity-50 text-white font-black text-sm cursor-pointer"
                  >
                    {authBusy
                      ? "Aguarde..."
                      : authMode === "register"
                      ? "Criar conta e entrar"
                      : "Entrar na minha conta"}
                  </button>
                </form>

                {customerOrders.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="text-xs font-black text-slate-600 uppercase">
                      Último pedido neste aparelho
                    </div>
                    {customerOrders.slice(0, 2).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => {
                          setAccountModalOpen(false);
                          setSelectedOrderDetail(o);
                        }}
                        className="w-full text-left p-3 rounded-2xl border border-emerald-200 bg-emerald-50 flex justify-between items-center"
                      >
                        <div>
                          <div className="text-xs font-black text-slate-900">
                            Pedido #{o.orderNumber || o.id.slice(0, 6)}
                          </div>
                          <div className="text-[11px] text-emerald-800">
                            {getOrderStatusMeta(o.status).label}
                          </div>
                        </div>
                        <span className="font-mono font-black text-sm text-[#0B5D2E]">
                          R$ {fmtBRL(o.total)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex border-b border-slate-200 px-4 pt-2 gap-2 bg-slate-50 shrink-0">
                  {[
                    { key: "profile" as const, label: "Dados Pessoais" },
                    { key: "addresses" as const, label: `Endereços (${savedAddresses.length})` },
                    { key: "orders" as const, label: `Meus Pedidos (${customerOrders.length})` },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setAccountTab(t.key)}
                      className={`px-3 py-2.5 text-xs font-black border-b-2 transition-colors cursor-pointer ${
                        accountTab === t.key
                          ? "border-[#0B5D2E] text-[#0B5D2E]"
                          : "border-transparent text-slate-500"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                  {accountTab === "profile" && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Nome completo"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                      <input
                        type="tel"
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        placeholder="Telefone / WhatsApp"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono"
                      />
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="E-mail"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await updateStoreCustomerProfile({
                              companyIdOrSlug: companyKey,
                              name: authName,
                              phone: authPhone,
                              email: authEmail,
                            });
                            await refreshAccount();
                            showToast("Dados atualizados!");
                          }}
                          className="flex-1 py-2.5 rounded-full bg-[#0B5D2E] text-white font-bold text-xs cursor-pointer"
                        >
                          Salvar alterações
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await logoutStoreCustomer();
                            await refreshAccount();
                          }}
                          className="px-4 py-2.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <LogOut size={13} /> Sair
                        </button>
                      </div>
                    </div>
                  )}

                  {accountTab === "addresses" && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setAccountAddrFormOpen((v) => !v)}
                        className="w-full py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#0B5D2E] border border-emerald-200 font-black text-xs cursor-pointer"
                      >
                        {accountAddrFormOpen ? "Fechar formulário" : "+ Cadastrar novo endereço"}
                      </button>

                      {accountAddrFormOpen && (
                        <form onSubmit={handleSaveAddressInAccount} className="bg-[#f4f8f4] border border-emerald-200 rounded-2xl p-3.5 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={addrLabel}
                              onChange={(e) => setAddrLabel(e.target.value)}
                              placeholder="Apelido (ex: Casa, Trabalho)"
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                            />
                            <input
                              type="text"
                              value={addrCep}
                              onChange={(e) => lookupCep(e.target.value)}
                              placeholder="CEP"
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              required
                              value={addrStreet}
                              onChange={(e) => setAddrStreet(e.target.value)}
                              placeholder="Rua *"
                              className="col-span-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                            />
                            <input
                              type="text"
                              required
                              value={addrNumber}
                              onChange={(e) => setAddrNumber(e.target.value)}
                              placeholder="Número *"
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                            />
                          </div>
                          <input
                            type="text"
                            value={addrComplement}
                            onChange={(e) => setAddrComplement(e.target.value)}
                            placeholder="Complemento"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              required
                              value={addrNeighborhood}
                              onChange={(e) => setAddrNeighborhood(e.target.value)}
                              placeholder="Bairro *"
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                            />
                            <input
                              type="text"
                              required
                              value={addrCity}
                              onChange={(e) => setAddrCity(e.target.value)}
                              placeholder="Cidade *"
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                            />
                            <input
                              type="text"
                              required
                              maxLength={2}
                              value={addrState}
                              onChange={(e) => setAddrState(e.target.value.toUpperCase())}
                              placeholder="UF *"
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono uppercase"
                            />
                          </div>
                          <input
                            type="text"
                            value={addrReference}
                            onChange={(e) => setAddrReference(e.target.value)}
                            placeholder="Ponto de referência"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={authBusy}
                            className="w-full py-2.5 rounded-full bg-[#0B5D2E] text-white font-bold text-xs"
                          >
                            Salvar endereço
                          </button>
                        </form>
                      )}

                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          className="border border-slate-200 rounded-2xl p-3.5 space-y-2 bg-white"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-black text-xs text-slate-900">
                                {addr.label}{" "}
                                {addr.isDefault && (
                                  <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                                    Principal
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 mt-0.5">
                                {addr.street}, {addr.number}
                                {addr.complement ? ` (${addr.complement})` : ""} — {addr.neighborhood}, {addr.city}/{addr.state} • CEP {addr.zipCode}
                              </div>
                              {addr.reference && (
                                <div className="text-[11px] text-slate-500">Ref: {addr.reference}</div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteStoreDeliveryAddress(companyKey, addr.id);
                                refreshAccount();
                              }}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={async () => {
                                await setDefaultStoreDeliveryAddress(companyKey, addr.id);
                                refreshAccount();
                                showToast("Endereço definido para entrega!");
                              }}
                              className="text-[11px] font-bold text-[#0B5D2E] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full cursor-pointer"
                            >
                              Usar este endereço para entrega
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {accountTab === "orders" && (
                    <div className="space-y-2.5">
                      {customerOrders.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-8">
                          Você ainda não fez nenhum pedido.
                        </p>
                      ) : (
                        customerOrders.map((ord) => {
                          const meta = getOrderStatusMeta(ord.status);
                          return (
                            <button
                              key={ord.id}
                              type="button"
                              onClick={() => {
                                setAccountModalOpen(false);
                                setSelectedOrderDetail(ord);
                              }}
                              className="w-full text-left border border-slate-200 hover:border-[#0B5D2E] rounded-2xl p-3.5 space-y-1.5 transition-all cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs text-slate-900">
                                  Pedido #{ord.orderNumber || ord.id.slice(0, 6)}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${meta.badgeClass}`}>
                                  {meta.label}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>{new Date(ord.createdAt).toLocaleString("pt-BR")}</span>
                                <span className="font-mono font-black text-[#0B5D2E]">
                                  R$ {fmtBRL(ord.total)}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DETALHES & ACOMPANHAMENTO DO PEDIDO ── */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="p-5 bg-[#0B5D2E] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-lime-300 block">
                  Acompanhamento do Pedido
                </span>
                <h3 className="font-black text-lg">
                  Pedido #{selectedOrderDetail.orderNumber || selectedOrderDetail.id.slice(0, 6)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="p-1.5 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Barra de Progresso */}
              {(() => {
                const idx = getStepIndex(selectedOrderDetail.status);
                const meta = getOrderStatusMeta(selectedOrderDetail.status);
                return (
                  <div className="space-y-3">
                    <div className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold ${meta.badgeClass}`}>
                      <div>{meta.label}</div>
                      {meta.description && (
                        <div className="font-normal text-[11px] opacity-90 mt-0.5">
                          {meta.description}
                        </div>
                      )}
                    </div>

                    {idx >= 0 && (
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {ORDER_STEPS.map((st, sIdx) => {
                          const done = sIdx <= idx;
                          return (
                            <div key={st.key} className="text-center space-y-1">
                              <div
                                className={`h-2 rounded-full ${
                                  done ? "bg-[#0B5D2E]" : "bg-slate-200"
                                }`}
                              />
                              <span
                                className={`text-[10px] font-bold block leading-tight ${
                                  done ? "text-[#0B5D2E]" : "text-slate-400"
                                }`}
                              >
                                {st.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Endereço & Forma de Entrega */}
              <div className="bg-[#f4f8f4] border border-emerald-100 rounded-2xl p-3.5 space-y-1.5 text-xs">
                <div>
                  <span className="font-bold text-slate-500">Forma de entrega:</span>{" "}
                  <strong className="text-slate-900">
                    {selectedOrderDetail.deliveryType === "ENTREGA"
                      ? "Entrega em domicílio"
                      : selectedOrderDetail.deliveryType === "MESA"
                      ? "Mesa / Na loja"
                      : "Retirada no local"}
                  </strong>
                </div>
                {selectedOrderDetail.deliveryLocation && (
                  <div>
                    <span className="font-bold text-slate-500">Endereço / Local:</span>{" "}
                    <span className="text-slate-800">{selectedOrderDetail.deliveryLocation}</span>
                  </div>
                )}
                {selectedOrderDetail.paymentMethod && (
                  <div>
                    <span className="font-bold text-slate-500">Pagamento:</span>{" "}
                    <span className="text-slate-800">
                      {PAYMENT_OPTION_LABELS[selectedOrderDetail.paymentMethod] ||
                        selectedOrderDetail.paymentMethod}
                    </span>
                  </div>
                )}
              </div>

              {/* ── SEÇÃO PIX DINÂMICO STONE / GATEWAYS ── */}
              {selectedOrderDetail.paymentMethod === "PIX" && (
                <div className="space-y-3">
                  {selectedOrderDetail.paymentStatus === "PAID" ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check size={20} />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          ✓ Pagamento PIX Confirmado!
                          {selectedOrderDetail.paymentGateway && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-200 text-emerald-800 font-bold">
                              {selectedOrderDetail.paymentGateway}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-emerald-700">
                          Seu pedido já foi confirmado e está em preparação.
                        </div>
                      </div>
                    </div>
                  ) : selectedOrderDetail.pixQrCodeText ? (
                    <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500/40 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <QrCode size={18} className="text-[#0B5D2E]" />
                          <span className="text-xs font-black text-slate-900 uppercase">
                            Pagamento via PIX Dinâmico
                          </span>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-[#0B5D2E] border border-emerald-200">
                          Aprovação Automática
                        </span>
                      </div>

                      {/* QR Code Imagem */}
                      <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <img
                          src={
                            selectedOrderDetail.pixQrCodeUrl ||
                            `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                              selectedOrderDetail.pixQrCodeText
                            )}`
                          }
                          alt="QR Code Pix"
                          className="w-44 h-44 rounded-xl bg-white p-2 shadow-xs border border-slate-200"
                        />
                        <span className="text-[11px] text-slate-500 mt-2 font-medium">
                          Abra o app do seu banco e escaneie o código
                        </span>
                      </div>

                      {/* Pix Copia e Cola */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                          <span>Pix Copia e Cola:</span>
                          <span className="text-slate-400 font-normal">Toque no botão para copiar</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={selectedOrderDetail.pixQrCodeText}
                            className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700 select-all focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedOrderDetail.pixQrCodeText || "");
                              setCopiedPixCode(true);
                              showToast("✓ Código Pix copiado para a área de transferência!");
                              setTimeout(() => setCopiedPixCode(false), 2500);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#0B5D2E] hover:bg-[#084522] text-white font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-all"
                          >
                            {copiedPixCode ? <Check size={14} /> : <Copy size={14} />}
                            {copiedPixCode ? "Copiado!" : "Copiar"}
                          </button>
                        </div>
                      </div>

                      {/* Aguardando confirmação */}
                      <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-[#0B5D2E] text-[11px] font-bold">
                        <RefreshCw size={12} className="animate-spin text-[#0B5D2E]" />
                        <span>Aguardando confirmação bancária em tempo real...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                      <div className="text-xs font-black text-amber-900">
                        Chave PIX da Loja
                      </div>
                      <div className="text-[11px] text-amber-800">
                        Efetue a transferência no valor de <strong>R$ {fmtBRL(selectedOrderDetail.total)}</strong> para a chave:{" "}
                        <strong className="font-mono">{company.phone || company.whatsapp || "65522409000113"}</strong>
                      </div>
                      <button
                        type="button"
                        disabled={generatingPix}
                        onClick={() => handleGeneratePixForOrder(selectedOrderDetail.id)}
                        className="mt-1 w-full py-2 rounded-xl bg-[#0B5D2E] hover:bg-[#084522] text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <QrCode size={14} className={generatingPix ? "animate-spin" : ""} />
                        {generatingPix ? "Gerando QR Code..." : "Gerar QR Code Pix Dinâmico"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Itens */}
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-700 uppercase">Produtos do pedido</div>
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100">
                  {selectedOrderDetail.items.map((it) => (
                    <div key={it.id} className="p-3 flex justify-between items-center text-xs gap-2">
                      <div>
                        <div className="font-bold text-slate-900">{it.product?.name || "Produto"}</div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          {fmtQty(it.quantity, it.product?.unit, it.product?.name)} × R$ {fmtBRL(it.unitPrice)}
                        </div>
                      </div>
                      <span className="font-mono font-black text-slate-900">R$ {fmtBRL(it.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais */}
              <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono">R$ {fmtBRL(selectedOrderDetail.subtotal)}</span>
                </div>
                {Number(selectedOrderDetail.deliveryFee || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Taxa de entrega</span>
                    <span className="font-mono">R$ {fmtBRL(Number(selectedOrderDetail.deliveryFee))}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-[#0B5D2E] pt-1 border-t border-slate-200">
                  <span>Total</span>
                  <span className="font-mono">R$ {fmtBRL(selectedOrderDetail.total)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={refreshingOrder}
                  onClick={() => handleRefreshOrderStatus(selectedOrderDetail.id)}
                  className="flex-1 py-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#0B5D2E] border border-emerald-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={14} className={refreshingOrder ? "animate-spin" : ""} />
                  Atualizar Status
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetail(null)}
                  className="flex-1 py-3 rounded-full bg-[#0B5D2E] text-white font-black text-xs cursor-pointer"
                >
                  Voltar à loja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
