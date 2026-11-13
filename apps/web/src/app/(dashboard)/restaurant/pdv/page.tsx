"use client";

import { useState, useEffect } from "react";
import {
  Store, Users, Utensils, Clock, CheckCircle2, AlertCircle, Plus, Minus, X,
  Search, RefreshCw, ShoppingCart, CreditCard, DollarSign, Receipt, Printer,
  ChefHat, ArrowRight, ShieldCheck, Tag, Trash2, ArrowLeftRight, Coffee,
  Pizza, Flame, Wine, IceCream, Slice, Filter, Check, Bell, Award, Bike,
  MapPin, Phone, Send, FileText, CheckSquare, Sparkles, Navigation, Layers, Briefcase
} from "lucide-react";

// ─── Types & Mock Interfaces ────────────────────────────────────────────────
type OrderMode = "TABLES" | "COMMANDS" | "COUNTER" | "DELIVERY";
type TableStatus = "FREE" | "OCCUPIED" | "BILL_REQUESTED" | "RESERVED";
type ProductionSector = "KITCHEN" | "GRILL" | "PIZZERIA" | "BAR";
type DeliveryStatus = "RECEIVED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED";

interface AdditionItem {
  id: string;
  name: string;
  price: number;
}

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  unit?: string;
  image?: string;
  sector: ProductionSector;
  isPizza?: boolean;
  additionGroups?: { name: string; required: boolean; items: AdditionItem[] }[];
}

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
  sector: ProductionSector;
  notes?: string;
  selectedAdditions?: AdditionItem[];
  pizzaFlavors?: string[];
  status: "DRAFT" | "SENT" | "PREPARING" | "READY" | "SERVED";
  timestamp: string;
}

interface Table {
  id: number;
  name: string;
  status: TableStatus;
  capacity: number;
  peopleCount: number;
  waiter?: string;
  openTime?: string;
  items: OrderItem[];
}

interface CommandOrder {
  id: string;
  code: string; // Ex: #101
  customerName: string;
  phone?: string;
  waiter: string;
  openTime: string;
  status: "OPEN" | "BILL_REQUESTED" | "CLOSED";
  items: OrderItem[];
}

interface DeliveryOrder {
  id: string;
  code: string; // Ex: DEL-402
  customerName: string;
  customerPhone: string;
  address: string;
  neighborhood: string;
  deliveryFee: number;
  courier?: string;
  status: DeliveryStatus;
  paymentMethod: string;
  items: OrderItem[];
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isFractionalRestProduct(unit?: string, name?: string) {
  const u = (unit || "").trim().toUpperCase();
  if (u === "KG" || u === "L" || u === "LT" || u === "G" || u === "GR" || u === "ML" || u === "M" || u === "MT") {
    return true;
  }
  return Boolean(name && /\b(KG|GR|GRAMA|GRAMAS|LITRO|LITROS|ML|METRO|METROS|MT)\b|\/KG|\(KG\)/i.test(name));
}

function roundRestQty(n: number) {
  return Math.round(Number(n || 0) * 1000) / 1000;
}

function formatRestQty(q: number, unit?: string, name?: string) {
  const rounded = roundRestQty(q);
  if (isFractionalRestProduct(unit, name) && rounded % 1 !== 0) {
    return rounded.toFixed(3).replace(".", ",");
  }
  return String(rounded).replace(".", ",");
}

function parseRestDecimal(raw: string): number {
  const n = parseFloat(String(raw || "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? roundRestQty(n) : 0;
}

import { getProducts } from "@/actions/product";
import { getCustomers } from "@/actions/customer";
import { createSale } from "@/actions/sale";
import { verifySupervisorPin } from "@/actions/users";

// ─── Initial Data ───────────────────────────────────────────────────────────
const MOCK_WAITERS = ["Atendente Principal", "Caixa Balcão"];
const MOCK_COURIERS = ["Entregador Próprio", "Motoboy"];

const DEFAULT_CATEGORIES = [
  { id: "ALL", name: "Todos os Itens", icon: <Utensils size={16} /> },
];

const INITIAL_TABLES: Table[] = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  name: `Mesa ${i + 1}`,
  status: "FREE",
  capacity: 4,
  peopleCount: 0,
  items: []
}));

const INITIAL_COMMANDS: CommandOrder[] = [];
const INITIAL_DELIVERIES: DeliveryOrder[] = [];

// ─── Main Component ─────────────────────────────────────────────────────────
export default function RestaurantPdvPage() {
  const [mode, setMode] = useState<OrderMode>("TABLES");
  
  // Real Products, Categories & Customers from Database
  const [productsList, setProductsList] = useState<ProductItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string; icon?: React.ReactNode }[]>(DEFAULT_CATEGORIES);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [restSelectedCustomer, setRestSelectedCustomer] = useState<any | null>(null);
  const [restCustomerSearch, setRestCustomerSearch] = useState("");
  const [restCrediarioPin, setRestCrediarioPin] = useState("");
  const [restCrediarioError, setRestCrediarioError] = useState("");
  const [restCheckoutBusy, setRestCheckoutBusy] = useState(false);

  const loadRestCustomers = async () => {
    try {
      const res = await getCustomers();
      if (Array.isArray(res.customers)) {
        setCustomersList(res.customers);
      }
    } catch {}
  };

  useEffect(() => {
    loadRestCustomers();
    async function loadRealProducts() {
      try {
        const res = await getProducts();
        if (res.products && res.products.length > 0) {
          const mapped: ProductItem[] = res.products.map((p: any) => {
            const catName = p.category?.name || "Geral";
            let sector: ProductionSector = "KITCHEN";
            const catLower = catName.toLowerCase();
            if (catLower.includes("bebida") || catLower.includes("refrigerante") || catLower.includes("suco") || catLower.includes("café")) {
              sector = "BAR";
            } else if (catLower.includes("chapa") || catLower.includes("carne") || catLower.includes("sanduíche") || catLower.includes("lanche")) {
              sector = "GRILL";
            }
            return {
              id: p.id,
              name: p.name,
              category: catName,
              price: Number(p.price || 0),
              unit: p.unit || "UN",
              sector,
              isPizza: false,
            };
          });
          setProductsList(mapped);

          const cats = Array.from(new Set(mapped.map(m => m.category))).sort();
          setCategoriesList([
            { id: "ALL", name: "Todos os Itens", icon: <Utensils size={16} /> },
            ...cats.map(c => ({ id: c, name: c, icon: <Tag size={16} /> }))
          ]);
        }
      } catch (e) {
        console.error("Erro ao carregar produtos:", e);
      }
    }
    loadRealProducts();
  }, []);

  // Data States
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [commands, setCommands] = useState<CommandOrder[]>(INITIAL_COMMANDS);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>(INITIAL_DELIVERIES);

  // Active Selections
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<CommandOrder | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOrder | null>(null);

  // Filters & Search
  const [tableFilter, setTableFilter] = useState<string>("ALL");
  const [commandFilter, setCommandFilter] = useState<string>("ALL");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [productSearch, setProductSearch] = useState("");

  // Counter Cart Items (For direct fast-food checkout)
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [selectedWaiter, setSelectedWaiter] = useState(MOCK_WAITERS[0]);

  // Toast / Notification banner state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Product Customization Modal States
  const [modalProduct, setModalProduct] = useState<ProductItem | null>(null);
  const [itemNotes, setItemNotes] = useState("");
  const [modalQtyInput, setModalQtyInput] = useState("1");
  const [modalBrlInput, setModalBrlInput] = useState("");
  const [restQtyDraft, setRestQtyDraft] = useState<Record<string, string>>({});
  const [selectedAdditions, setSelectedAdditions] = useState<AdditionItem[]>([]);
  const [pizzaSecondaryFlavor, setPizzaSecondaryFlavor] = useState<string>("");

  // Modals & Action Controls
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [includeServiceFee, setIncludeServiceFee] = useState(true);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("CARTAO_CREDITO");
  
  // Split Bill Modal
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
  const [splitPeopleCount, setSplitPeopleCount] = useState<number>(2);

  // Transfer Table Modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferTargetTableId, setTransferTargetTableId] = useState<number>(1);

  // Open Table Modal
  const [isOpenTableModalOpen, setIsOpenTableModalOpen] = useState(false);
  const [openTablePeople, setOpenTablePeople] = useState(2);
  const [targetTableToOpen, setTargetTableToOpen] = useState<Table | null>(null);

  // Open Command Modal
  const [isOpenCommandModalOpen, setIsOpenCommandModalOpen] = useState(false);
  const [newCommandCode, setNewCommandCode] = useState("");
  const [newCommandCustomer, setNewCommandCustomer] = useState("");
  const [newCommandPhone, setNewCommandPhone] = useState("");

  // New Delivery Order Modal
  const [isNewDeliveryModalOpen, setIsNewDeliveryModalOpen] = useState(false);
  const [newDeliveryName, setNewDeliveryName] = useState("");
  const [newDeliveryPhone, setNewDeliveryPhone] = useState("");
  const [newDeliveryAddress, setNewDeliveryAddress] = useState("");
  const [newDeliveryBairro, setNewDeliveryBairro] = useState("");
  const [newDeliveryFee, setNewDeliveryFee] = useState(10.00);

  // Printable Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Determine current active order items
  const getCurrentItems = (): OrderItem[] => {
    if (selectedTable) return selectedTable.items;
    if (selectedCommand) return selectedCommand.items;
    if (selectedDelivery) return selectedDelivery.items;
    return cartItems;
  };

  const currentItems = getCurrentItems();
  const subtotal = currentItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const deliveryExtra = selectedDelivery ? selectedDelivery.deliveryFee : 0;
  const serviceFee = (includeServiceFee && mode === "TABLES") ? subtotal * 0.10 : 0;
  const grandTotal = subtotal + serviceFee + tipAmount + deliveryExtra;

  // Handlers for Tables
  const handleOpenTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableToOpen) return;
    setTables(prev => prev.map(t => {
      if (t.id === targetTableToOpen.id) {
        const updated = {
          ...t,
          status: "OCCUPIED" as TableStatus,
          peopleCount: openTablePeople,
          waiter: selectedWaiter,
          openTime: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        };
        setSelectedTable(updated);
        return updated;
      }
      return t;
    }));
    setIsOpenTableModalOpen(false);
    showNotification(`Mesa ${targetTableToOpen.id} aberta com sucesso!`);
  };

  // Handlers for Commands
  const handleOpenCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommandCode.trim() || !newCommandCustomer.trim()) return;

    const newCmd: CommandOrder = {
      id: `cmd-${Date.now()}`,
      code: newCommandCode.trim(),
      customerName: newCommandCustomer.trim(),
      phone: newCommandPhone.trim() || undefined,
      waiter: selectedWaiter,
      openTime: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      status: "OPEN",
      items: []
    };

    setCommands(prev => [newCmd, ...prev]);
    setSelectedCommand(newCmd);
    setIsOpenCommandModalOpen(false);
    setNewCommandCode("");
    setNewCommandCustomer("");
    setNewCommandPhone("");
    showNotification(`Comanda #${newCmd.code} (${newCmd.customerName}) aberta!`);
  };

  // Handlers for Delivery
  const handleNewDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeliveryName.trim() || !newDeliveryAddress.trim()) return;

    const newDel: DeliveryOrder = {
      id: `del-${Date.now()}`,
      code: `DEL-${Math.floor(100 + Math.random() * 900)}`,
      customerName: newDeliveryName.trim(),
      customerPhone: newDeliveryPhone.trim(),
      address: newDeliveryAddress.trim(),
      neighborhood: newDeliveryBairro.trim(),
      deliveryFee: newDeliveryFee,
      status: "RECEIVED",
      paymentMethod: "PIX",
      items: [],
      createdAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    setDeliveries(prev => [newDel, ...prev]);
    setSelectedDelivery(newDel);
    setIsNewDeliveryModalOpen(false);
    setNewDeliveryName("");
    setNewDeliveryPhone("");
    setNewDeliveryAddress("");
    setNewDeliveryBairro("");
    showNotification(`Pedido de Delivery ${newDel.code} criado!`);
  };

  // Add Product Modal Confirmation
  const handleAddProductClick = (product: ProductItem) => {
    setModalProduct(product);
    setItemNotes("");
    setModalQtyInput("1");
    setModalBrlInput("");
    setSelectedAdditions([]);
    setPizzaSecondaryFlavor("");
  };

  const handleConfirmAddProductModal = () => {
    if (!modalProduct) return;

    let finalPrice = modalProduct.price;
    let finalName = modalProduct.name;
    const flavorList: string[] = [modalProduct.name];

    // Handle Pizza Multisabor
    if (modalProduct.isPizza && pizzaSecondaryFlavor) {
      const secProd = productsList.find(p => p.id === pizzaSecondaryFlavor);
      if (secProd) {
        finalPrice = Math.max(modalProduct.price, secProd.price);
        finalName = `1/2 ${modalProduct.name} + 1/2 ${secProd.name}`;
        flavorList.push(secProd.name);
      }
    }

    // Additions Cost
    const additionsTotal = selectedAdditions.reduce((acc, a) => acc + a.price, 0);
    const unitPrice = finalPrice + additionsTotal;
    const parsedQty = parseRestDecimal(modalQtyInput);
    const quantity = parsedQty > 0 ? parsedQty : 1;

    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      productId: modalProduct.id,
      name: finalName,
      quantity,
      unit: modalProduct.unit || "UN",
      unitPrice,
      totalPrice: Math.round(quantity * unitPrice * 100) / 100,
      sector: modalProduct.sector,
      notes: itemNotes,
      selectedAdditions: [...selectedAdditions],
      pizzaFlavors: flavorList,
      status: "DRAFT",
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    if (selectedTable) {
      setTables(prev => prev.map(t => {
        if (t.id === selectedTable.id) {
          const updatedItems = [...t.items, newItem];
          const updatedTable = { ...t, items: updatedItems, status: "OCCUPIED" as TableStatus };
          setSelectedTable(updatedTable);
          return updatedTable;
        }
        return t;
      }));
    } else if (selectedCommand) {
      setCommands(prev => prev.map(c => {
        if (c.id === selectedCommand.id) {
          const updatedItems = [...c.items, newItem];
          const updatedCmd = { ...c, items: updatedItems };
          setSelectedCommand(updatedCmd);
          return updatedCmd;
        }
        return c;
      }));
    } else if (selectedDelivery) {
      setDeliveries(prev => prev.map(d => {
        if (d.id === selectedDelivery.id) {
          const updatedItems = [...d.items, newItem];
          const updatedDel = { ...d, items: updatedItems };
          setSelectedDelivery(updatedDel);
          return updatedDel;
        }
        return d;
      }));
    } else {
      setCartItems(prev => [...prev, newItem]);
    }

    setModalProduct(null);
  };

  const applyActiveItemsTransform = (transform: (items: OrderItem[]) => OrderItem[]) => {
    if (selectedTable) {
      setTables(prev => prev.map(t => {
        if (t.id === selectedTable.id) {
          const updatedTable = { ...t, items: transform(t.items) };
          setSelectedTable(updatedTable);
          return updatedTable;
        }
        return t;
      }));
    } else if (selectedCommand) {
      setCommands(prev => prev.map(c => {
        if (c.id === selectedCommand.id) {
          const updatedCmd = { ...c, items: transform(c.items) };
          setSelectedCommand(updatedCmd);
          return updatedCmd;
        }
        return c;
      }));
    } else if (selectedDelivery) {
      setDeliveries(prev => prev.map(d => {
        if (d.id === selectedDelivery.id) {
          const updatedDel = { ...d, items: transform(d.items) };
          setSelectedDelivery(updatedDel);
          return updatedDel;
        }
        return d;
      }));
    } else {
      setCartItems(transform);
    }
  };

  const handleUpdateOrderItemQty = (itemId: string, rawInput: string, commit = false) => {
    const sanitized = rawInput.replace(/[^0-9.,]/g, "");
    if (!commit) {
      setRestQtyDraft(prev => ({ ...prev, [itemId]: sanitized }));
      const parsed = parseRestDecimal(sanitized);
      if (parsed > 0) {
        applyActiveItemsTransform(items =>
          items.map(i =>
            i.id === itemId
              ? { ...i, quantity: parsed, totalPrice: Math.round(parsed * i.unitPrice * 100) / 100 }
              : i
          )
        );
      }
      return;
    }
    setRestQtyDraft(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
    const parsed = parseRestDecimal(sanitized);
    if (parsed <= 0) {
      applyActiveItemsTransform(items => items.filter(i => i.id !== itemId));
    } else {
      applyActiveItemsTransform(items =>
        items.map(i =>
          i.id === itemId
            ? { ...i, quantity: parsed, totalPrice: Math.round(parsed * i.unitPrice * 100) / 100 }
            : i
        )
      );
    }
  };

  const handleStepOrderItemQty = (itemId: string, delta: number) => {
    setRestQtyDraft(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
    applyActiveItemsTransform(items =>
      items
        .map(i => {
          if (i.id !== itemId) return i;
          const next = roundRestQty(Math.max(0, i.quantity + delta));
          return {
            ...i,
            quantity: next,
            totalPrice: Math.round(next * i.unitPrice * 100) / 100,
          };
        })
        .filter(i => i.quantity > 0)
    );
  };

  const handleRemoveOrderItem = (itemId: string) => {
    applyActiveItemsTransform(items => items.filter(i => i.id !== itemId));
  };

  // Dispatch Draft Items to Kitchen / Production (KDS)
  const handleSendToKdsProduction = () => {
    if (!currentItems.length) return;

    const updateItemsStatus = (items: OrderItem[]): OrderItem[] => {
      return items.map(i => (i.status === "DRAFT" ? { ...i, status: "SENT" as const } : i));
    };

    if (selectedTable) {
      setTables(prev => prev.map(t => {
        if (t.id === selectedTable.id) {
          const updatedItems = updateItemsStatus(t.items);
          const updatedTable = { ...t, items: updatedItems };
          setSelectedTable(updatedTable);
          return updatedTable;
        }
        return t;
      }));
    } else if (selectedCommand) {
      setCommands(prev => prev.map(c => {
        if (c.id === selectedCommand.id) {
          const updatedItems = updateItemsStatus(c.items);
          const updatedCmd = { ...c, items: updatedItems };
          setSelectedCommand(updatedCmd);
          return updatedCmd;
        }
        return c;
      }));
    } else if (selectedDelivery) {
      setDeliveries(prev => prev.map(d => {
        if (d.id === selectedDelivery.id) {
          const updatedItems = updateItemsStatus(d.items);
          const updatedDel = { ...d, items: updatedItems, status: "PREPARING" as DeliveryStatus };
          setSelectedDelivery(updatedDel);
          return updatedDel;
        }
        return d;
      }));
    }

    showNotification("🚀 Pedidos enviados com sucesso para a Cozinha / KDS!");
  };

  const handleTransferTableSubmit = () => {
    if (!selectedTable) return;
    const targetTable = tables.find(t => t.id === transferTargetTableId);
    if (!targetTable) return;

    setTables(prev => prev.map(t => {
      if (t.id === targetTable.id) {
        return {
          ...t,
          status: "OCCUPIED" as TableStatus,
          items: [...t.items, ...selectedTable.items],
          peopleCount: Math.max(t.peopleCount, selectedTable.peopleCount),
          waiter: selectedTable.waiter || t.waiter
        };
      }
      if (t.id === selectedTable.id) {
        return { ...t, status: "FREE" as TableStatus, items: [], peopleCount: 0, waiter: undefined };
      }
      return t;
    }));

    setIsTransferOpen(false);
    setSelectedTable(null);
    showNotification(`Itens transferidos para a Mesa ${transferTargetTableId}!`);
  };

  const handleCheckoutCloseTable = async () => {
    if (paymentMethod === "CREDIARIO") {
      if (!restSelectedCustomer || restSelectedCustomer.customerType !== "FUNCIONARIO") {
        setRestCrediarioError("Selecione um cliente cadastrado como Funcionário para pagar com Crediário.");
        return;
      }
      if (!restCrediarioPin.trim()) {
        setRestCrediarioError("Informe o PIN/Senha de autorização para confirmar o Crediário.");
        return;
      }
      setRestCheckoutBusy(true);
      setRestCrediarioError("");
      const pinRes = await verifySupervisorPin(restCrediarioPin);
      if (!pinRes.success) {
        setRestCheckoutBusy(false);
        setRestCrediarioError(pinRes.error || "PIN/Senha inválido.");
        return;
      }

      const saleRes = await createSale({
        items: currentItems.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        paymentMethod: "CREDIARIO",
        discount: 0,
        customerId: restSelectedCustomer.id,
        creditAuthorizedBy: pinRes.userName || "Supervisor",
      });
      setRestCheckoutBusy(false);

      if (saleRes?.error) {
        setRestCrediarioError(saleRes.error);
        return;
      }
      loadRestCustomers();
    }

    if (selectedTable) {
      setTables(prev => prev.map(t => {
        if (t.id === selectedTable.id) {
          return { ...t, status: "FREE" as TableStatus, items: [], peopleCount: 0, waiter: undefined };
        }
        return t;
      }));
      setSelectedTable(null);
    } else if (selectedCommand) {
      setCommands(prev => prev.filter(c => c.id !== selectedCommand.id));
      setSelectedCommand(null);
    } else if (selectedDelivery) {
      setDeliveries(prev => prev.map(d => d.id === selectedDelivery.id ? { ...d, status: "DELIVERED" as DeliveryStatus } : d));
      setSelectedDelivery(null);
    } else {
      setCartItems([]);
    }

    setIsCheckoutOpen(false);
    setRestCrediarioPin("");
    setRestCrediarioError("");
    setIsReceiptModalOpen(true);
    showNotification(
      paymentMethod === "CREDIARIO"
        ? `✅ Venda registrada em Crediário em aberto para ${restSelectedCustomer?.name}!`
        : "✅ Venda finalizada e pagamento recebido!"
    );
  };

  const filteredProducts = productsList.filter(p => {
    const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredTables = tables.filter(t => {
    if (tableFilter === "ALL") return true;
    return t.status === tableFilter;
  });

  const filteredCommands = commands.filter(c => {
    if (commandFilter === "ALL") return true;
    return c.status === commandFilter;
  });

  const filteredDeliveries = deliveries.filter(d => {
    if (deliveryFilter === "ALL") return true;
    return d.status === deliveryFilter;
  });

  return (
    <div className="h-full flex flex-col bg-[#e8f0fc] text-gray-900 overflow-hidden animate-in fade-in duration-200 relative">
      
      {/* ── Toast Notification Banner ────────────────────────────────────────── */}
      {toastMessage && (
        <div className="absolute top-16 right-6 z-50 bg-indigo-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-400/30 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <Sparkles size={18} className="text-amber-300" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-indigo-200 hover:text-white ml-2"><X size={14}/></button>
        </div>
      )}

      {/* ── Header Principal do PDV Touch ──────────────────────────────────────── */}
      <header className="px-6 py-3 bg-[#fbfdff] border-b border-[#c4d5ee] flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Utensils size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-gray-900">PDV Restaurante & Gastronomia</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 border border-indigo-200 uppercase tracking-widest">
                Touch ERP
              </span>
            </div>
            <p className="text-xs text-slate-500">Gestão de mesas, comandas, KDS, balcão e delivery integrado.</p>
          </div>
        </div>

        {/* Seleção de Modos de Operação */}
        <div className="flex bg-[#e8f0fc] p-1 rounded-2xl border border-indigo-200 gap-1">
          {[
            { key: "TABLES", label: "Mapa de Mesas", icon: <Store size={15} /> },
            { key: "COMMANDS", label: "Comandas", icon: <Tag size={15} /> },
            { key: "COUNTER", label: "Balcão Rápido", icon: <ShoppingCart size={15} /> },
            { key: "DELIVERY", label: "Delivery", icon: <Bike size={15} /> },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => {
                setMode(item.key as OrderMode);
                if (item.key === "COUNTER") {
                  setSelectedTable(null);
                  setSelectedCommand(null);
                  setSelectedDelivery(null);
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                mode === item.key
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-500 hover:text-gray-900 hover:bg-indigo-500/10"
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {/* Status de Garçom Selecionado */}
        <div className="flex items-center gap-3">
          <div className="bg-[#fbfdff] border border-[#c4d5ee] px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Users size={14} className="text-indigo-600" />
            <div className="text-left">
              <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none">Garçom Ativo</span>
              <select
                value={selectedWaiter}
                onChange={e => setSelectedWaiter(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-gray-900 outline-none cursor-pointer"
              >
                {MOCK_WAITERS.map(w => <option key={w} value={w} className="bg-[#fbfdff] text-gray-900">{w}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* ── Conteúdo Principal ─────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">
        
        {/* ── Coluna Esquerda: Visão de Operação / Produtos Touch (8 Colunas) ────── */}
        <div className="col-span-12 lg:col-span-8 flex flex-col min-h-0 border-r border-[#c4d5ee] p-5 space-y-4 overflow-hidden">
          
          {/* MODO 1: MAPA DE MESAS */}
          {mode === "TABLES" && !selectedTable && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-gray-900 tracking-wider uppercase flex items-center gap-2">
                    <Store size={16} className="text-indigo-600" /> Selecione uma Mesa
                  </h3>
                  <span className="text-xs text-slate-500">({tables.filter(t => t.status === "OCCUPIED").length} ocupadas)</span>
                </div>
                
                <div className="flex gap-1.5">
                  {[
                    { key: "ALL", label: "Todas" },
                    { key: "FREE", label: "LIVRE" },
                    { key: "OCCUPIED", label: "OCUPADA" },
                    { key: "BILL_REQUESTED", label: "PAGAMENTO" },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setTableFilter(f.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        tableFilter === f.key
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
                          : "bg-[#fbfdff] border-[#c4d5ee] text-slate-500 hover:text-gray-900"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grade de Mesas Touch */}
              <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-4 gap-4 p-1">
                {filteredTables.map(t => {
                  const totalMesa = t.items.reduce((acc, i) => acc + i.totalPrice, 0);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (t.status === "FREE") {
                          setTargetTableToOpen(t);
                          setIsOpenTableModalOpen(true);
                        } else {
                          setSelectedTable(t);
                          setSelectedCommand(null);
                          setSelectedDelivery(null);
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-36 relative overflow-hidden shadow-lg group hover:scale-[1.02] ${
                        t.status === "FREE"
                          ? "bg-emerald-50/60 border-emerald-500/30 hover:border-emerald-500/60"
                          : t.status === "OCCUPIED"
                          ? "bg-[#eaf1fc]/80 border-indigo-500/40 hover:border-indigo-500/70"
                          : t.status === "BILL_REQUESTED"
                          ? "bg-amber-50/80 border-amber-500/40 hover:border-amber-500/70 animate-pulse"
                          : "bg-purple-50/80 border-purple-500/30 hover:border-purple-500/60"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-lg font-black text-gray-900">{t.name}</span>
                          <span className="text-[10px] text-slate-500 block font-medium">Capacidade: {t.capacity} p.</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          t.status === "FREE" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                          t.status === "OCCUPIED" ? "bg-indigo-500/10 text-indigo-600 border-indigo-200" :
                          t.status === "BILL_REQUESTED" ? "bg-amber-500/15 text-amber-700 border-amber-500/30" :
                          "bg-purple-500/10 text-purple-600 border-purple-500/20"
                        }`}>
                          {t.status === "FREE" ? "LIVRE" : t.status === "OCCUPIED" ? "OCUPADA" : t.status === "BILL_REQUESTED" ? "CONTA" : "RESERVADA"}
                        </span>
                      </div>

                      {t.status !== "FREE" ? (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 flex items-center gap-1"><Users size={11}/> {t.peopleCount} p.</span>
                            <span className="text-indigo-600 font-mono font-bold text-sm">R$ {fmt(totalMesa)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">Garçom: {t.waiter || "—"}</p>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <span className="text-xs text-emerald-600 font-bold flex items-center justify-center gap-1 group-hover:scale-105 transition-transform">
                            <Plus size={14} /> Abrir Mesa
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO 2: GESTÃO DE COMANDAS */}
          {mode === "COMMANDS" && !selectedCommand && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 tracking-wider uppercase flex items-center gap-2">
                    <Tag size={16} className="text-amber-600" /> Comandas Individuais
                  </h3>
                  <p className="text-xs text-slate-500">Gerencie comandas por cartão ou nome de cliente.</p>
                </div>

                <button
                  onClick={() => setIsOpenCommandModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-4 py-2 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <Plus size={16} /> Abrir Nova Comanda
                </button>
              </div>

              {/* Grade de Comandas */}
              <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-3 gap-4 p-1">
                {filteredCommands.map(cmd => {
                  const cmdTotal = cmd.items.reduce((acc, i) => acc + i.totalPrice, 0);
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => {
                        setSelectedCommand(cmd);
                        setSelectedTable(null);
                        setSelectedDelivery(null);
                      }}
                      className="p-4 rounded-2xl bg-[#fbfdff] border border-amber-500/20 hover:border-amber-500/60 cursor-pointer flex flex-col justify-between h-40 transition-all shadow-lg hover:scale-[1.02] group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-mono font-black text-sm">
                            #{cmd.code}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors">{cmd.customerName}</h4>
                            <p className="text-[10px] text-slate-500">{cmd.phone || "Sem telefone"}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {cmd.status === "OPEN" ? "ABERTA" : "PAGAMENTO"}
                        </span>
                      </div>

                      <div className="space-y-1.5 border-t border-amber-500/10 pt-2.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">{cmd.items.length} item(s)</span>
                          <span className="font-mono font-black text-emerald-600 text-sm">R$ {fmt(cmdTotal)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 flex justify-between">
                          <span>Garçom: {cmd.waiter}</span>
                          <span>Entrada: {cmd.openTime}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}

                {!filteredCommands.length && (
                  <div className="col-span-3 text-center py-20 text-slate-500 space-y-2">
                    <Tag size={36} className="mx-auto opacity-30 text-amber-600" />
                    <p className="text-xs">Nenhuma comanda aberta no momento.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODO 3: GESTÃO DE DELIVERY */}
          {mode === "DELIVERY" && !selectedDelivery && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 tracking-wider uppercase flex items-center gap-2">
                    <Bike size={16} className="text-cyan-600" /> Painel de Pedidos & Delivery
                  </h3>
                  <p className="text-xs text-slate-500">Acompanhamento e expedição de pedidos para entrega.</p>
                </div>

                <button
                  onClick={() => setIsNewDeliveryModalOpen(true)}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-4 py-2 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                >
                  <Plus size={16} /> Novo Pedido Delivery
                </button>
              </div>

              {/* Board Delivery */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 p-1">
                {filteredDeliveries.map(del => {
                  const delTotal = del.items.reduce((acc, i) => acc + i.totalPrice, 0) + del.deliveryFee;
                  return (
                    <div
                      key={del.id}
                      onClick={() => {
                        setSelectedDelivery(del);
                        setSelectedTable(null);
                        setSelectedCommand(null);
                      }}
                      className="p-4 rounded-2xl bg-[#fbfdff] border border-cyan-500/20 hover:border-cyan-500/50 cursor-pointer flex justify-between items-center transition-all shadow-lg hover:scale-[1.01]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 flex items-center justify-center font-mono font-black text-sm">
                          {del.code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-gray-900">{del.customerName}</h4>
                            <span className="text-[10px] text-cyan-700 font-mono">({del.customerPhone})</span>
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={12} className="text-slate-500" /> {del.address} - {del.neighborhood}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Total c/ Taxa</span>
                          <span className="font-mono font-black text-emerald-600 text-base">R$ {fmt(delTotal)}</span>
                        </div>

                        <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                          del.status === "RECEIVED" ? "bg-amber-500/10 text-amber-700 border-amber-500/20" :
                          del.status === "PREPARING" ? "bg-indigo-500/10 text-indigo-600 border-indigo-200" :
                          del.status === "OUT_FOR_DELIVERY" ? "bg-cyan-500/15 text-cyan-700 border-cyan-500/30 animate-pulse" :
                          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        }`}>
                          {del.status === "RECEIVED" ? "RECEBIDO" : del.status === "PREPARING" ? "EM PREPARO" : del.status === "OUT_FOR_DELIVERY" ? "EM ROTA" : "ENTREGUE"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO CATÁLOGO TOUCH (Exibido quando uma Mesa / Comanda / Delivery é selecionada ou Balcão Rápido) */}
          {(selectedTable || selectedCommand || selectedDelivery || mode === "COUNTER") && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              
              {/* Header Contextual da Ordem Ativa */}
              <div className="bg-[#fbfdff] p-3 rounded-2xl border border-[#c4d5ee] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedTable(null);
                      setSelectedCommand(null);
                      setSelectedDelivery(null);
                    }}
                    className="p-2 bg-[#e8f0fc] text-slate-500 hover:text-gray-900 rounded-xl border border-[#c4d5ee] transition-all text-xs font-bold flex items-center gap-1"
                  >
                    ← Voltar à Lista
                  </button>
                  <div>
                    <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                      {selectedTable ? selectedTable.name : selectedCommand ? `Comanda #${selectedCommand.code} (${selectedCommand.customerName})` : selectedDelivery ? `Delivery ${selectedDelivery.code}` : "Venda Direta / Balcão"}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTable && (
                    <>
                      <button
                        onClick={() => setIsTransferOpen(true)}
                        className="px-3 py-1.5 bg-[#e8f0fc] hover:bg-indigo-600/20 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <ArrowLeftRight size={13} /> Transferir Mesa
                      </button>
                      <button
                        onClick={() => setIsSplitBillOpen(true)}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Users size={13} /> Dividir Conta
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setIsCheckoutOpen(true)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Receipt size={13} /> Fechar / Pagar
                  </button>
                </div>
              </div>

              {/* Categorias Touch */}
              <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 custom-scrollbar">
                {categoriesList.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border ${
                      selectedCategory === cat.id
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/25"
                        : "bg-[#fbfdff] text-slate-500 border-[#c4d5ee] hover:text-gray-900 hover:bg-indigo-500/10"
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>

              {/* Barra de Busca de Produtos */}
              <div className="relative shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Buscar prato, bebida ou pizza..."
                  className="w-full bg-[#fbfdff] border border-[#c4d5ee] text-gray-900 pl-10 pr-4 py-2.5 rounded-2xl outline-none text-xs focus:border-indigo-500 font-semibold transition-all"
                />
              </div>

              {/* Grade de Produtos Touch */}
              <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-3 gap-3 p-1">
                {filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleAddProductClick(p)}
                    className="bg-[#fbfdff] border border-[#c4d5ee] hover:border-indigo-500/40 rounded-2xl p-3.5 cursor-pointer flex flex-col justify-between transition-all group hover:scale-[1.02] shadow-md"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-black text-gray-900 group-hover:text-indigo-700 transition-colors leading-tight">
                          {p.name}
                        </span>
                        {p.isPizza && (
                          <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                            PIZZA
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                        Setor: {p.sector}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#c4d5ee]">
                      <span className="text-emerald-600 font-mono font-black text-sm">
                        R$ {fmt(p.price)}
                      </span>
                      <span className="w-7 h-7 rounded-xl bg-indigo-600/20 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-gray-900 flex items-center justify-center transition-all">
                        <Plus size={14} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Coluna Direita: Comanda / Carrinho / Resumo Financeiro (4 Colunas) ──── */}
        <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0 bg-[#fbfdff] p-5 space-y-4 shadow-2xl">
          <div className="flex justify-between items-center border-b border-[#c4d5ee] pb-3 shrink-0">
            <div>
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Receipt className="text-indigo-600" size={16} /> Extrato de Comanda
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {selectedTable ? `Mesa: ${selectedTable.name}` : selectedCommand ? `Comanda #${selectedCommand.code}` : selectedDelivery ? `Delivery ${selectedDelivery.code}` : "Venda Rápida / Balcão"}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-500/10 border border-indigo-200 px-2.5 py-1 rounded-xl">
              {currentItems.length} item(s)
            </span>
          </div>

          {/* Lista de Itens Lançados */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
            {currentItems.map((item, idx) => {
              const frac = isFractionalRestProduct(item.unit, item.name);
              const step = frac ? 0.1 : 1;
              return (
              <div key={item.id || idx} className="p-3 bg-[#e8f0fc] rounded-2xl border border-[#c4d5ee] flex justify-between items-start gap-2 shadow-md">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                    <button
                      onClick={() => handleRemoveOrderItem(item.id)}
                      className="text-slate-500 hover:text-red-600 p-0.5 transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {item.notes && (
                    <p className="text-[10px] text-amber-700/80 italic mt-0.5">Obs: {item.notes}</p>
                  )}

                  {item.selectedAdditions && item.selectedAdditions.length > 0 && (
                    <div className="text-[10px] text-indigo-700/80 mt-0.5">
                      + {item.selectedAdditions.map(a => a.name).join(", ")}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    {(frac
                      ? [
                          { label: "100g", val: 0.1 },
                          { label: "250g", val: 0.25 },
                          { label: "500g", val: 0.5 },
                          { label: "1kg", val: 1 },
                        ]
                      : [
                          { label: "0,5x", val: 0.5 },
                          { label: "1x", val: 1 },
                        ]
                    ).map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handleUpdateOrderItemQty(item.id, String(p.val), true)}
                        className="px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mt-2 text-[11px] gap-2">
                    <div className="flex items-center bg-white border border-indigo-200 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => handleStepOrderItemQty(item.id, -step)}
                        className="w-5 h-5 rounded hover:bg-indigo-50 flex items-center justify-center text-gray-600"
                      >
                        <Minus size={11} />
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={restQtyDraft[item.id] ?? formatRestQty(item.quantity, item.unit, item.name)}
                        onChange={(e) => handleUpdateOrderItemQty(item.id, e.target.value, false)}
                        onBlur={(e) => handleUpdateOrderItemQty(item.id, e.target.value, true)}
                        className="w-14 text-center text-[11px] font-mono font-black text-gray-900 bg-transparent outline-none"
                      />
                      <span className="text-[9px] font-bold text-slate-400 pr-1">
                        {(item.unit || (frac ? "KG" : "UN")).toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStepOrderItemQty(item.id, step)}
                        className="w-5 h-5 rounded hover:bg-indigo-50 flex items-center justify-center text-gray-600"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        item.status === "DRAFT" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      }`}>
                        {item.status === "DRAFT" ? "Pendente" : "Enviado"}
                      </span>
                      <span className="text-emerald-600 font-mono font-bold">R$ {fmt(item.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );})}

            {!currentItems.length && (
              <div className="text-center py-20 text-slate-500 italic space-y-2">
                <Utensils size={36} className="mx-auto opacity-30" />
                <p className="text-xs">Nenhum item adicionado à comanda.</p>
                <p className="text-[10px] text-slate-600">Selecione uma mesa ou itens no catálogo ao lado.</p>
              </div>
            )}
          </div>

          {/* Resumo de Totais e Botões de Fechamento */}
          <div className="border-t border-[#c4d5ee] pt-4 space-y-3 shrink-0">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-700">R$ {fmt(subtotal)}</span>
              </div>

              {mode === "TABLES" && (
                <div className="flex justify-between text-slate-500 items-center">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeServiceFee}
                      onChange={e => setIncludeServiceFee(e.target.checked)}
                      className="rounded text-indigo-600 bg-[#e8f0fc] border-indigo-200"
                    />
                    <span>Taxa de Serviço (10%)</span>
                  </label>
                  <span className="font-mono font-semibold text-amber-600">R$ {fmt(serviceFee)}</span>
                </div>
              )}

              {selectedDelivery && (
                <div className="flex justify-between text-slate-500">
                  <span>Taxa de Entrega</span>
                  <span className="font-mono font-semibold text-cyan-600">R$ {fmt(deliveryExtra)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-[#c4d5ee]">
                <span>Total Geral</span>
                <span className="font-mono text-emerald-600 text-lg">R$ {fmt(grandTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleSendToKdsProduction}
                disabled={!currentItems.length || !currentItems.some(i => i.status === "DRAFT")}
                className="bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-200 text-indigo-700 hover:text-gray-900 disabled:opacity-30 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Send size={15} /> KDS Cozinha
              </button>

              <button
                onClick={() => setIsCheckoutOpen(true)}
                disabled={!currentItems.length}
                className="bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-40 text-white font-extrabold py-3 rounded-2xl text-xs shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <CreditCard size={15} /> Pagar / Finalizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: CUSTOMIZAÇÃO DO PRODUTO ──────────────────────────────────── */}
      {modalProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-indigo-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[#c4d5ee] flex justify-between items-center bg-[#f3f7fe]/50">
              <div>
                <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                  <ChefHat className="text-indigo-600" size={18} /> {modalProduct.name}
                </h3>
                <p className="text-[10px] text-slate-500">Setor: <strong className="text-indigo-700">{modalProduct.sector}</strong></p>
              </div>
              <button onClick={() => setModalProduct(null)} className="p-1 text-slate-500 hover:text-gray-900"><X size={18}/></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Quantidade / Peso Fracionado */}
              <div className="p-3.5 bg-[#e8f0fc] border border-indigo-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">
                    Quantidade / Peso ({(modalProduct.unit || (isFractionalRestProduct(modalProduct.unit, modalProduct.name) ? "KG" : "UN")).toUpperCase()})
                  </label>
                  <span className="text-xs font-mono font-black text-emerald-700">
                    Unit: R$ {fmt(modalProduct.price)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-indigo-200 rounded-xl p-1 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseRestDecimal(modalQtyInput) || 1;
                        const step = isFractionalRestProduct(modalProduct.unit, modalProduct.name) ? 0.1 : 1;
                        const next = Math.max(0.05, roundRestQty(cur - step));
                        setModalQtyInput(String(next).replace(".", ","));
                        setModalBrlInput("");
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-indigo-50 flex items-center justify-center text-gray-700"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={modalQtyInput}
                      onChange={e => {
                        setModalQtyInput(e.target.value.replace(/[^0-9.,]/g, ""));
                        setModalBrlInput("");
                      }}
                      placeholder="Ex: 0,350"
                      className="flex-1 text-center text-base font-mono font-black text-gray-900 outline-none bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseRestDecimal(modalQtyInput) || 0;
                        const step = isFractionalRestProduct(modalProduct.unit, modalProduct.name) ? 0.1 : 1;
                        const next = roundRestQty(cur + step);
                        setModalQtyInput(String(next).replace(".", ","));
                        setModalBrlInput("");
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-indigo-50 flex items-center justify-center text-gray-700"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-white border border-emerald-300 rounded-xl px-2.5 py-2">
                    <span className="text-[11px] font-bold text-emerald-700">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={modalBrlInput}
                      onChange={e => {
                        const s = e.target.value.replace(/[^0-9.,]/g, "");
                        setModalBrlInput(s);
                        const brl = parseRestDecimal(s);
                        if (brl > 0 && modalProduct.price > 0) {
                          const q = Math.max(0.001, roundRestQty(brl / modalProduct.price));
                          setModalQtyInput(String(q).replace(".", ","));
                        }
                      }}
                      placeholder="Valor"
                      className="w-16 text-right text-xs font-mono font-bold text-emerald-800 outline-none bg-transparent"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "100g (0,1)", val: "0,100" },
                    { label: "250g (0,25)", val: "0,250" },
                    { label: "500g (0,5)", val: "0,500" },
                    { label: "1kg / 1x", val: "1" },
                    { label: "2x", val: "2" },
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setModalQtyInput(p.val);
                        setModalBrlInput("");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 text-[10px] font-bold transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                  <span className="ml-auto text-xs font-mono font-black text-emerald-700 self-center">
                    Subtotal: R$ {fmt((parseRestDecimal(modalQtyInput) || 1) * (modalProduct.price + selectedAdditions.reduce((a, b) => a + b.price, 0)))}
                  </span>
                </div>
              </div>

              {modalProduct.isPizza && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                  <label className="block text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">
                    🍕 Combinar 2º Sabor (Meio a Meio)
                  </label>
                  <select
                    value={pizzaSecondaryFlavor}
                    onChange={e => setPizzaSecondaryFlavor(e.target.value)}
                    className="w-full bg-[#e8f0fc] border border-amber-500/30 text-gray-900 px-3 py-2 rounded-xl text-xs outline-none font-semibold"
                  >
                    <option value="">Apenas Sabor Inteiro ({modalProduct.name})</option>
                    {productsList.filter(p => p.isPizza && p.id !== modalProduct.id).map(p => (
                      <option key={p.id} value={p.id}>+ 1/2 {p.name} (R$ {fmt(p.price)})</option>
                    ))}
                  </select>
                </div>
              )}

              {modalProduct.additionGroups?.map((group, gIdx) => (
                <div key={gIdx} className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {group.name}
                  </label>
                  <div className="space-y-1.5">
                    {group.items.map(add => {
                      const isSelected = selectedAdditions.some(a => a.id === add.id);
                      return (
                        <label
                          key={add.id}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            isSelected ? "bg-indigo-600/20 text-indigo-700 border-indigo-500/40" : "bg-[#e8f0fc] text-slate-600 border-[#c4d5ee]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedAdditions(prev => prev.filter(a => a.id !== add.id));
                                } else {
                                  setSelectedAdditions(prev => [...prev, add]);
                                }
                              }}
                              className="rounded text-indigo-600 bg-[#e8f0fc]"
                            />
                            <span>{add.name}</span>
                          </div>
                          <span className="font-mono text-emerald-600">+ R$ {fmt(add.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Observações para a Cozinha / Bar
                </label>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={e => setItemNotes(e.target.value)}
                  placeholder="Ex: Sem pimenta, carne bem passada, molho à parte..."
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#c4d5ee] bg-[#f3f7fe]/50 flex justify-end gap-2 shrink-0">
              <button onClick={() => setModalProduct(null)} className="px-4 py-2 bg-[#e8f0fc] text-slate-500 rounded-xl text-xs font-semibold">
                Cancelar
              </button>
              <button onClick={handleConfirmAddProductModal} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-1.5">
                <Check size={14} /> Confirmar & Adicionar à Comanda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ABRIR MESA ────────────────────────────────────────────────── */}
      {isOpenTableModalOpen && targetTableToOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-indigo-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Store className="text-emerald-600" size={18} /> Abrir {targetTableToOpen.name}
            </h3>
            <form onSubmit={handleOpenTableSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantidade de Pessoas</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={openTablePeople}
                  onChange={e => setOpenTablePeople(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-bold text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Garçom Atendente</label>
                <select
                  value={selectedWaiter}
                  onChange={e => setSelectedWaiter(e.target.value)}
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-bold"
                >
                  {MOCK_WAITERS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsOpenTableModalOpen(false)} className="flex-1 bg-[#e8f0fc] text-slate-500 py-2.5 rounded-xl text-xs font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20">Confirmar & Abrir Mesa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ABRIR NOVA COMANDA ────────────────────────────────────────── */}
      {isOpenCommandModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-amber-500/20 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Tag className="text-amber-600" size={18} /> Abrir Nova Comanda
            </h3>
            <form onSubmit={handleOpenCommandSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Número da Comanda / Cartão *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 104"
                  value={newCommandCode}
                  onChange={e => setNewCommandCode(e.target.value)}
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Pereira"
                  value={newCommandCustomer}
                  onChange={e => setNewCommandCustomer(e.target.value)}
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3.5 py-2.5 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone (Opcional)</label>
                <input
                  type="text"
                  placeholder="(11) 90000-0000"
                  value={newCommandPhone}
                  onChange={e => setNewCommandPhone(e.target.value)}
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3.5 py-2.5 rounded-xl text-xs font-medium"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsOpenCommandModalOpen(false)} className="flex-1 bg-[#e8f0fc] text-slate-500 py-2.5 rounded-xl text-xs font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-2.5 rounded-xl text-xs font-bold shadow-lg">Criar Comanda</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVO PEDIDO DELIVERY ──────────────────────────────────────── */}
      {isNewDeliveryModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-cyan-500/20 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Bike className="text-cyan-600" size={18} /> Novo Pedido de Delivery
            </h3>
            <form onSubmit={handleNewDeliverySubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Beatriz Souza"
                  value={newDeliveryName}
                  onChange={e => setNewDeliveryName(e.target.value)}
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 98888-7777"
                  value={newDeliveryPhone}
                  onChange={e => setNewDeliveryPhone(e.target.value)}
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Endereço de Entrega *</label>
                <input
                  type="text"
                  required
                  placeholder="Rua, número e complemento"
                  value={newDeliveryAddress}
                  onChange={e => setNewDeliveryAddress(e.target.value)}
                  className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={newDeliveryBairro}
                    onChange={e => setNewDeliveryBairro(e.target.value)}
                    className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Taxa Entrega (R$)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={newDeliveryFee}
                    onChange={e => setNewDeliveryFee(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsNewDeliveryModalOpen(false)} className="flex-1 bg-[#e8f0fc] text-slate-500 py-2.5 rounded-xl text-xs font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black py-2.5 rounded-xl text-xs font-bold shadow-lg">Cadastrar Delivery</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: FECHAR CONTA & CHECKOUT ───────────────────────────────────── */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-indigo-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#c4d5ee] flex justify-between items-center bg-[#f3f7fe]/50">
              <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="text-emerald-600" size={18} /> Fechamento de Conta & Pagamento
              </h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 text-slate-500 hover:text-gray-900"><X size={18}/></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-[#e8f0fc] p-4 rounded-2xl border border-[#c4d5ee] space-y-2">
                <div className="flex justify-between text-xs text-slate-500"><span>Subtotal</span><span className="font-mono">R$ {fmt(subtotal)}</span></div>
                {mode === "TABLES" && <div className="flex justify-between text-xs text-slate-500"><span>Taxa de Serviço (10%)</span><span className="font-mono text-amber-600">R$ {fmt(serviceFee)}</span></div>}
                {selectedDelivery && <div className="flex justify-between text-xs text-slate-500"><span>Taxa de Entrega</span><span className="font-mono text-cyan-600">R$ {fmt(deliveryExtra)}</span></div>}
                <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-[#c4d5ee]">
                  <span>Total Final a Pagar</span>
                  <span className="font-mono text-emerald-600 text-xl">R$ {fmt(grandTotal)}</span>
                </div>
              </div>

              {/* Seleção de Cliente / Funcionário */}
              <div className="bg-[#e8f0fc] p-3.5 rounded-2xl border border-[#c4d5ee] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Cliente / Funcionário (Opcional — libera Crediário)
                  </label>
                  {restSelectedCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setRestSelectedCustomer(null);
                        setRestCrediarioError("");
                        if (paymentMethod === "CREDIARIO") setPaymentMethod("CARTAO_CREDITO");
                      }}
                      className="text-[10px] font-bold text-red-600 hover:underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                {restSelectedCustomer ? (
                  <div className="flex items-center justify-between bg-white border border-indigo-200 rounded-xl px-3 py-2">
                    <div>
                      <div className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                        <span>{restSelectedCustomer.name}</span>
                        {restSelectedCustomer.customerType === "FUNCIONARIO" && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            FUNCIONÁRIO
                          </span>
                        )}
                      </div>
                      {restSelectedCustomer.customerType === "FUNCIONARIO" && (
                        <div className="text-[10px] font-mono text-amber-700 font-bold">
                          Em aberto: R$ {fmt(Number(restSelectedCustomer.creditUsed || 0))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={restCustomerSearch}
                      onChange={e => setRestCustomerSearch(e.target.value)}
                      placeholder="Buscar cliente ou funcionário..."
                      className="w-full bg-white border border-[#c4d5ee] text-gray-900 px-3 py-2 rounded-xl text-xs outline-none focus:border-indigo-500"
                    />
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {customersList
                        .filter(c => {
                          const q = restCustomerSearch.trim().toLowerCase();
                          if (!q) return c.customerType === "FUNCIONARIO";
                          return (
                            (c.name || "").toLowerCase().includes(q) ||
                            (c.document || "").toLowerCase().includes(q)
                          );
                        })
                        .slice(0, 8)
                        .map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setRestSelectedCustomer(c);
                              setRestCrediarioError("");
                              setRestCustomerSearch("");
                            }}
                            className="w-full flex items-center justify-between px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-100 rounded-lg text-left text-xs"
                          >
                            <span className="font-bold text-gray-800 truncate">{c.name}</span>
                            {c.customerType === "FUNCIONARIO" && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-black shrink-0">
                                FUNC • R$ {fmt(Number(c.creditUsed || 0))}
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "CARTAO_CREDITO", label: "Crédito" },
                    { key: "CARTAO_DEBITO", label: "Débito" },
                    { key: "PIX", label: "PIX QrCode" },
                    { key: "DINHEIRO", label: "Dinheiro" },
                    { key: "FATURADO", label: "Faturado / Fiado" },
                    ...(restSelectedCustomer?.customerType === "FUNCIONARIO"
                      ? [{ key: "CREDIARIO", label: "Crediário (Func.)" }]
                      : []),
                  ].map(m => (
                    <button
                      key={m.key}
                      onClick={() => {
                        setPaymentMethod(m.key);
                        setRestCrediarioError("");
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        paymentMethod === m.key
                          ? m.key === "CREDIARIO"
                            ? "bg-amber-600 text-white border-amber-500 shadow-md"
                            : "bg-indigo-600 text-white border-indigo-500 shadow-md"
                          : m.key === "CREDIARIO"
                          ? "bg-amber-50 text-amber-900 border-amber-300"
                          : "bg-[#e8f0fc] text-slate-500 border-[#c4d5ee]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === "CREDIARIO" && restSelectedCustomer?.customerType === "FUNCIONARIO" && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl space-y-2.5">
                  <div className="flex justify-between text-xs font-bold text-amber-900">
                    <span>Novo saldo em aberto após esta conta:</span>
                    <span className="font-mono font-black">
                      R$ {fmt(Number(restSelectedCustomer.creditUsed || 0) + grandTotal)}
                    </span>
                  </div>
                  <input
                    type="password"
                    value={restCrediarioPin}
                    onChange={e => {
                      setRestCrediarioPin(e.target.value);
                      setRestCrediarioError("");
                    }}
                    placeholder="Digite o PIN / Senha de autorização *"
                    className="w-full bg-white border border-amber-300 text-gray-900 px-3 py-2 rounded-xl text-xs font-mono font-bold outline-none focus:border-amber-600"
                  />
                  {restCrediarioError && (
                    <div className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                      {restCrediarioError}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsCheckoutOpen(false)} className="flex-1 bg-[#e8f0fc] text-slate-500 py-3 rounded-xl text-xs font-bold border border-[#c4d5ee]">Cancelar</button>
                <button
                  onClick={handleCheckoutCloseTable}
                  disabled={restCheckoutBusy}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={15} /> {restCheckoutBusy ? "Registrando..." : "Confirmar & Emitir Cupom"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DIVIDIR CONTA ─────────────────────────────────────────────── */}
      {isSplitBillOpen && selectedTable && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-indigo-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-amber-600" size={18} /> Dividir Conta — {selectedTable.name}
            </h3>
            <div className="bg-[#e8f0fc] p-4 rounded-2xl border border-[#c4d5ee] space-y-2 text-xs">
              <div className="flex justify-between text-slate-500"><span>Total da Mesa</span><span className="font-mono font-bold text-gray-900">R$ {fmt(grandTotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Número de Pessoas</span>
                <input
                  type="number"
                  min="1"
                  value={splitPeopleCount}
                  onChange={e => setSplitPeopleCount(parseInt(e.target.value) || 1)}
                  className="w-16 bg-[#fbfdff] border border-indigo-200 text-gray-900 text-center font-mono font-bold py-1 rounded-lg"
                />
              </div>
              <div className="flex justify-between text-sm font-black text-emerald-600 pt-2 border-t border-[#c4d5ee]">
                <span>Valor por Pessoa</span>
                <span className="font-mono">R$ {fmt(grandTotal / Math.max(1, splitPeopleCount))}</span>
              </div>
            </div>
            <button onClick={() => setIsSplitBillOpen(false)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg">
              Fechar Visualização de Divisão
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: TRANSFERIR MESA ───────────────────────────────────────────── */}
      {isTransferOpen && selectedTable && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fbfdff] border border-indigo-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
              <ArrowLeftRight className="text-indigo-600" size={18} /> Transferir Itens da {selectedTable.name}
            </h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Mesa de Destino</label>
              <select
                value={transferTargetTableId}
                onChange={e => setTransferTargetTableId(parseInt(e.target.value))}
                className="w-full bg-[#e8f0fc] border border-indigo-200 text-gray-900 px-3 py-2.5 rounded-xl text-xs font-bold outline-none"
              >
                {tables.filter(t => t.id !== selectedTable.id).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.status === "FREE" ? "LIVRE" : "OCUPADA"})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsTransferOpen(false)} className="flex-1 bg-[#e8f0fc] text-slate-500 py-2.5 rounded-xl text-xs font-bold">Cancelar</button>
              <button onClick={handleTransferTableSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg">Confirmar Transferência</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CUPOM FISCAL / RECIBO IMPRESSO ───────────────────────────── */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 font-mono text-xs">
            <div className="text-center border-b border-dashed border-gray-400 pb-3">
              <h2 className="text-base font-black uppercase tracking-wider">CYBERTECH RESTAURANTE</h2>
              <p className="text-[10px]">CNPJ: 12.345.678/0001-90</p>
              <p className="text-[10px]">Av. Paulista, 1000 - São Paulo, SP</p>
              <p className="text-[10px] mt-1">CUPOM NÃO FISCAL / CONFERÊNCIA DE MESA</p>
            </div>

            <div className="space-y-1 py-1 text-[11px]">
              {currentItems.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span>{item.quantity}x {item.name.substring(0, 22)}</span>
                  <span>R$ {fmt(item.totalPrice)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
              <div className="flex justify-between font-bold">
                <span>TOTAL GERAL:</span>
                <span>R$ {fmt(grandTotal)}</span>
              </div>
              <p className="text-[10px] text-gray-600">Forma Pagto: {paymentMethod}</p>
              <p className="text-[10px] text-gray-600">Garçom: {selectedWaiter}</p>
            </div>

            <div className="text-center pt-3 border-t border-dashed border-gray-400">
              <p className="text-[10px] text-gray-500">Obrigado pela preferência!</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="flex-1 bg-[#fbfdff] text-gray-900 font-sans text-xs py-2.5 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-1"
                >
                  <Printer size={14} /> Imprimir Cupom
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
