"use client";

import { useState, useEffect } from "react";
import {
  Store, Users, Utensils, Clock, CheckCircle2, AlertCircle, Plus, Minus, X,
  Search, RefreshCw, ShoppingCart, CreditCard, DollarSign, Receipt, Printer,
  ChefHat, ArrowRight, ShieldCheck, Tag, Trash2, ArrowLeftRight, Coffee,
  Pizza, Flame, Wine, IceCream, Slice, Filter, Check, Bell, Award, Bike,
  MapPin, Phone, Send, FileText, CheckSquare, Sparkles, Navigation, Layers
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

// ─── Initial Mock Data ──────────────────────────────────────────────────────
const MOCK_WAITERS = ["Carlos Silva", "Ana Oliveira", "Mateus Santos", "Juliana Costa"];
const MOCK_COURIERS = ["Marcos Motoboy", "Lucas Entrega Express", "Roberto iFood", "Felipe Flash"];

const CATEGORIES = [
  { id: "ALL", name: "Todos os Itens", icon: <Utensils size={16} /> },
  { id: "PIZZA", name: "Pizzas Gourmet", icon: <Pizza size={16} /> },
  { id: "BURGER", name: "Lanches & Chapa", icon: <Flame size={16} /> },
  { id: "EXECUTIVE", name: "Pratos Executivos", icon: <ChefHat size={16} /> },
  { id: "PORTIONS", name: "Porções & Petiscos", icon: <Utensils size={16} /> },
  { id: "DRINKS", name: "Bebidas & Coquetéis", icon: <Wine size={16} /> },
  { id: "DESSERT", name: "Sobremesas", icon: <IceCream size={16} /> },
];

const PRODUCTS: ProductItem[] = [
  {
    id: "p1",
    name: "Pizza Calabresa Especial",
    category: "PIZZA",
    price: 58.00,
    sector: "PIZZERIA",
    isPizza: true,
    additionGroups: [
      {
        name: "Borda Recheada",
        required: false,
        items: [
          { id: "a1", name: "Borda Catupiry Original", price: 12.00 },
          { id: "a2", name: "Borda Cheddar Cremoso", price: 10.00 },
          { id: "a3", name: "Borda Chocolate", price: 14.00 }
        ]
      }
    ]
  },
  {
    id: "p2",
    name: "Pizza 4 Queijos Suprema",
    category: "PIZZA",
    price: 64.00,
    sector: "PIZZERIA",
    isPizza: true,
  },
  {
    id: "p3",
    name: "Pizza Frango c/ Catupiry",
    category: "PIZZA",
    price: 62.00,
    sector: "PIZZERIA",
    isPizza: true,
  },
  {
    id: "p4",
    name: "Hambúrguer Smash Bacon Double",
    category: "BURGER",
    price: 36.90,
    sector: "GRILL",
    additionGroups: [
      {
        name: "Adicionais no Lanche",
        required: false,
        items: [
          { id: "a4", name: "Queijo Cheddar Extra", price: 5.00 },
          { id: "a5", name: "Bacon Crocante Extra", price: 6.00 },
          { id: "a6", name: "Maionese Verde Artesanal", price: 3.50 }
        ]
      }
    ]
  },
  {
    id: "p5",
    name: "Picanha na Chapa 500g (Acompanha Fritas)",
    category: "EXECUTIVE",
    price: 119.00,
    sector: "KITCHEN"
  },
  {
    id: "p6",
    name: "Filé de Mignon ao Molho Madeira",
    category: "EXECUTIVE",
    price: 78.50,
    sector: "KITCHEN"
  },
  {
    id: "p7",
    name: "Porção Batata Frita c/ Cheddar e Bacon",
    category: "PORTIONS",
    price: 42.00,
    sector: "KITCHEN"
  },
  {
    id: "p8",
    name: "Iscas de Peixe Empanadas",
    category: "PORTIONS",
    price: 54.00,
    sector: "KITCHEN"
  },
  {
    id: "p9",
    name: "Chopp Artesanal IPA 500ml",
    category: "DRINKS",
    price: 16.00,
    sector: "BAR"
  },
  {
    id: "p10",
    name: "Refrigerante Coca-Cola 350ml",
    category: "DRINKS",
    price: 7.50,
    sector: "BAR"
  },
  {
    id: "p11",
    name: "Suco Natural de Laranja 500ml",
    category: "DRINKS",
    price: 12.00,
    sector: "BAR"
  },
  {
    id: "p12",
    name: "Petit Gâteau c/ Sorvete de Creme",
    category: "DESSERT",
    price: 28.00,
    sector: "KITCHEN"
  }
];

const INITIAL_TABLES: Table[] = Array.from({ length: 16 }, (_, i) => {
  const tableNum = i + 1;
  if (tableNum === 2) {
    return {
      id: tableNum,
      name: `Mesa ${tableNum}`,
      status: "OCCUPIED",
      capacity: 4,
      peopleCount: 3,
      waiter: "Carlos Silva",
      openTime: "12:15",
      items: [
        { id: "i1", productId: "p4", name: "Hambúrguer Smash Bacon Double", quantity: 2, unitPrice: 36.90, totalPrice: 73.80, sector: "GRILL", notes: "Sem cebola", status: "SERVED", timestamp: "12:18" },
        { id: "i2", productId: "p9", name: "Chopp Artesanal IPA 500ml", quantity: 3, unitPrice: 16.00, totalPrice: 48.00, sector: "BAR", status: "SERVED", timestamp: "12:16" }
      ]
    };
  }
  if (tableNum === 5) {
    return {
      id: tableNum,
      name: `Mesa ${tableNum}`,
      status: "BILL_REQUESTED",
      capacity: 6,
      peopleCount: 4,
      waiter: "Ana Oliveira",
      openTime: "11:45",
      items: [
        { id: "i3", productId: "p5", name: "Picanha na Chapa 500g", quantity: 1, unitPrice: 119.00, totalPrice: 119.00, sector: "KITCHEN", status: "SERVED", timestamp: "11:50" },
        { id: "i4", productId: "p10", name: "Refrigerante Coca-Cola 350ml", quantity: 4, unitPrice: 7.50, totalPrice: 30.00, sector: "BAR", status: "SERVED", timestamp: "11:48" }
      ]
    };
  }
  if (tableNum === 8) {
    return {
      id: tableNum,
      name: `Mesa ${tableNum}`,
      status: "RESERVED",
      capacity: 2,
      peopleCount: 0,
      items: []
    };
  }
  return {
    id: tableNum,
    name: `Mesa ${tableNum}`,
    status: "FREE",
    capacity: 4,
    peopleCount: 0,
    items: []
  };
});

const INITIAL_COMMANDS: CommandOrder[] = [
  {
    id: "cmd-101",
    code: "101",
    customerName: "Bruno Henrique",
    phone: "(11) 98822-1144",
    waiter: "Carlos Silva",
    openTime: "12:30",
    status: "OPEN",
    items: [
      { id: "ci-1", productId: "p9", name: "Chopp Artesanal IPA 500ml", quantity: 2, unitPrice: 16.00, totalPrice: 32.00, sector: "BAR", status: "SERVED", timestamp: "12:32" },
      { id: "ci-2", productId: "p7", name: "Porção Batata Frita c/ Cheddar e Bacon", quantity: 1, unitPrice: 42.00, totalPrice: 42.00, sector: "KITCHEN", status: "SENT", timestamp: "12:35" }
    ]
  },
  {
    id: "cmd-102",
    code: "102",
    customerName: "Mariana Costa",
    phone: "(11) 97711-3322",
    waiter: "Ana Oliveira",
    openTime: "12:40",
    status: "OPEN",
    items: [
      { id: "ci-3", productId: "p1", name: "Pizza Calabresa Especial", quantity: 1, unitPrice: 58.00, totalPrice: 58.00, sector: "PIZZERIA", status: "PREPARING", timestamp: "12:42" }
    ]
  },
  {
    id: "cmd-105",
    code: "105",
    customerName: "Fernanda Lima",
    waiter: "Mateus Santos",
    openTime: "12:10",
    status: "BILL_REQUESTED",
    items: [
      { id: "ci-4", productId: "p6", name: "Filé de Mignon ao Molho Madeira", quantity: 1, unitPrice: 78.50, totalPrice: 78.50, sector: "KITCHEN", status: "SERVED", timestamp: "12:15" },
      { id: "ci-5", productId: "p11", name: "Suco Natural de Laranja 500ml", quantity: 1, unitPrice: 12.00, totalPrice: 12.00, sector: "BAR", status: "SERVED", timestamp: "12:12" }
    ]
  }
];

const INITIAL_DELIVERIES: DeliveryOrder[] = [
  {
    id: "del-401",
    code: "DEL-401",
    customerName: "Rodrigo Mendonça",
    customerPhone: "(11) 99123-4567",
    address: "Rua Augusta, 1420 - Apt 82",
    neighborhood: "Consolação",
    deliveryFee: 10.00,
    courier: "Marcos Motoboy",
    status: "OUT_FOR_DELIVERY",
    paymentMethod: "PIX",
    createdAt: "12:20",
    items: [
      { id: "di-1", productId: "p1", name: "Pizza Calabresa Especial", quantity: 1, unitPrice: 58.00, totalPrice: 58.00, sector: "PIZZERIA", status: "SERVED", timestamp: "12:22" },
      { id: "di-2", productId: "p10", name: "Refrigerante Coca-Cola 350ml", quantity: 2, unitPrice: 7.50, totalPrice: 15.00, sector: "BAR", status: "SERVED", timestamp: "12:22" }
    ]
  },
  {
    id: "del-402",
    code: "DEL-402",
    customerName: "Camila Ribeiro",
    customerPhone: "(11) 98221-9988",
    address: "Av. Paulista, 900 - Conj 41",
    neighborhood: "Bela Vista",
    deliveryFee: 12.00,
    status: "PREPARING",
    paymentMethod: "CARTAO_CREDITO",
    createdAt: "12:45",
    items: [
      { id: "di-3", productId: "p4", name: "Hambúrguer Smash Bacon Double", quantity: 2, unitPrice: 36.90, totalPrice: 73.80, sector: "GRILL", status: "PREPARING", timestamp: "12:46" }
    ]
  }
];

// ─── Main Component ─────────────────────────────────────────────────────────
export default function RestaurantPdvPage() {
  const [mode, setMode] = useState<OrderMode>("TABLES");
  
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
      const secProd = PRODUCTS.find(p => p.id === pizzaSecondaryFlavor);
      if (secProd) {
        finalPrice = Math.max(modalProduct.price, secProd.price);
        finalName = `1/2 ${modalProduct.name} + 1/2 ${secProd.name}`;
        flavorList.push(secProd.name);
      }
    }

    // Additions Cost
    const additionsTotal = selectedAdditions.reduce((acc, a) => acc + a.price, 0);
    const unitPrice = finalPrice + additionsTotal;

    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      productId: modalProduct.id,
      name: finalName,
      quantity: 1,
      unitPrice,
      totalPrice: unitPrice,
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

  const handleRemoveOrderItem = (itemId: string) => {
    if (selectedTable) {
      setTables(prev => prev.map(t => {
        if (t.id === selectedTable.id) {
          const updatedItems = t.items.filter(i => i.id !== itemId);
          const updatedTable = { ...t, items: updatedItems };
          setSelectedTable(updatedTable);
          return updatedTable;
        }
        return t;
      }));
    } else if (selectedCommand) {
      setCommands(prev => prev.map(c => {
        if (c.id === selectedCommand.id) {
          const updatedItems = c.items.filter(i => i.id !== itemId);
          const updatedCmd = { ...c, items: updatedItems };
          setSelectedCommand(updatedCmd);
          return updatedCmd;
        }
        return c;
      }));
    } else if (selectedDelivery) {
      setDeliveries(prev => prev.map(d => {
        if (d.id === selectedDelivery.id) {
          const updatedItems = d.items.filter(i => i.id !== itemId);
          const updatedDel = { ...d, items: updatedItems };
          setSelectedDelivery(updatedDel);
          return updatedDel;
        }
        return d;
      }));
    } else {
      setCartItems(prev => prev.filter(i => i.id !== itemId));
    }
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

  const handleCheckoutCloseTable = () => {
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
    setIsReceiptModalOpen(true);
    showNotification("✅ Venda finalizada e pagamento recebido!");
  };

  const filteredProducts = PRODUCTS.filter(p => {
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
    <div className="h-full flex flex-col bg-[#070914] text-white overflow-hidden animate-in fade-in duration-200 relative">
      
      {/* ── Toast Notification Banner ────────────────────────────────────────── */}
      {toastMessage && (
        <div className="absolute top-16 right-6 z-50 bg-indigo-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-400/30 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <Sparkles size={18} className="text-amber-300" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-indigo-200 hover:text-white ml-2"><X size={14}/></button>
        </div>
      )}

      {/* ── Header Principal do PDV Touch ──────────────────────────────────────── */}
      <header className="px-6 py-3 bg-[#0f1324] border-b border-indigo-500/15 flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Utensils size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">PDV Restaurante & Gastronomia</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                Touch ERP
              </span>
            </div>
            <p className="text-xs text-slate-400">Gestão de mesas, comandas, KDS, balcão e delivery integrado.</p>
          </div>
        </div>

        {/* Seleção de Modos de Operação */}
        <div className="flex bg-[#070914] p-1 rounded-2xl border border-indigo-500/20 gap-1">
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
                  : "text-slate-400 hover:text-white hover:bg-indigo-500/10"
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {/* Status de Garçom Selecionado */}
        <div className="flex items-center gap-3">
          <div className="bg-[#111528] border border-indigo-500/15 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Users size={14} className="text-indigo-400" />
            <div className="text-left">
              <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none">Garçom Ativo</span>
              <select
                value={selectedWaiter}
                onChange={e => setSelectedWaiter(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-white outline-none cursor-pointer"
              >
                {MOCK_WAITERS.map(w => <option key={w} value={w} className="bg-[#111528] text-white">{w}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* ── Conteúdo Principal ─────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">
        
        {/* ── Coluna Esquerda: Visão de Operação / Produtos Touch (8 Colunas) ────── */}
        <div className="col-span-12 lg:col-span-8 flex flex-col min-h-0 border-r border-indigo-500/10 p-5 space-y-4 overflow-hidden">
          
          {/* MODO 1: MAPA DE MESAS */}
          {mode === "TABLES" && !selectedTable && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white tracking-wider uppercase flex items-center gap-2">
                    <Store size={16} className="text-indigo-400" /> Selecione uma Mesa
                  </h3>
                  <span className="text-xs text-slate-400">({tables.filter(t => t.status === "OCCUPIED").length} ocupadas)</span>
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
                          : "bg-[#111528] border-indigo-500/10 text-slate-400 hover:text-white"
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
                          ? "bg-[#091512]/60 border-emerald-500/30 hover:border-emerald-500/60"
                          : t.status === "OCCUPIED"
                          ? "bg-[#0d1730]/80 border-indigo-500/40 hover:border-indigo-500/70"
                          : t.status === "BILL_REQUESTED"
                          ? "bg-[#241a08]/80 border-amber-500/40 hover:border-amber-500/70 animate-pulse"
                          : "bg-[#1d1228]/80 border-purple-500/30 hover:border-purple-500/60"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-lg font-black text-white">{t.name}</span>
                          <span className="text-[10px] text-slate-400 block font-medium">Capacidade: {t.capacity} p.</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          t.status === "FREE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          t.status === "OCCUPIED" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                          t.status === "BILL_REQUESTED" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                          "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        }`}>
                          {t.status === "FREE" ? "LIVRE" : t.status === "OCCUPIED" ? "OCUPADA" : t.status === "BILL_REQUESTED" ? "CONTA" : "RESERVADA"}
                        </span>
                      </div>

                      {t.status !== "FREE" ? (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 flex items-center gap-1"><Users size={11}/> {t.peopleCount} p.</span>
                            <span className="text-indigo-400 font-mono font-bold text-sm">R$ {fmt(totalMesa)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">Garçom: {t.waiter || "—"}</p>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <span className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1 group-hover:scale-105 transition-transform">
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
                  <h3 className="text-sm font-extrabold text-white tracking-wider uppercase flex items-center gap-2">
                    <Tag size={16} className="text-amber-400" /> Comandas Individuais
                  </h3>
                  <p className="text-xs text-slate-400">Gerencie comandas por cartão ou nome de cliente.</p>
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
                      className="p-4 rounded-2xl bg-[#0f1324] border border-amber-500/20 hover:border-amber-500/60 cursor-pointer flex flex-col justify-between h-40 transition-all shadow-lg hover:scale-[1.02] group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-black text-sm">
                            #{cmd.code}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">{cmd.customerName}</h4>
                            <p className="text-[10px] text-slate-400">{cmd.phone || "Sem telefone"}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {cmd.status === "OPEN" ? "ABERTA" : "PAGAMENTO"}
                        </span>
                      </div>

                      <div className="space-y-1.5 border-t border-amber-500/10 pt-2.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">{cmd.items.length} item(s)</span>
                          <span className="font-mono font-black text-emerald-400 text-sm">R$ {fmt(cmdTotal)}</span>
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
                    <Tag size={36} className="mx-auto opacity-30 text-amber-400" />
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
                  <h3 className="text-sm font-extrabold text-white tracking-wider uppercase flex items-center gap-2">
                    <Bike size={16} className="text-cyan-400" /> Painel de Pedidos & Delivery
                  </h3>
                  <p className="text-xs text-slate-400">Acompanhamento e expedição de pedidos para entrega.</p>
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
                      className="p-4 rounded-2xl bg-[#0f1324] border border-cyan-500/20 hover:border-cyan-500/50 cursor-pointer flex justify-between items-center transition-all shadow-lg hover:scale-[1.01]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-mono font-black text-sm">
                          {del.code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{del.customerName}</h4>
                            <span className="text-[10px] text-cyan-300 font-mono">({del.customerPhone})</span>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={12} className="text-slate-500" /> {del.address} - {del.neighborhood}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Total c/ Taxa</span>
                          <span className="font-mono font-black text-emerald-400 text-base">R$ {fmt(delTotal)}</span>
                        </div>

                        <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                          del.status === "RECEIVED" ? "bg-amber-500/10 text-amber-300 border-amber-500/20" :
                          del.status === "PREPARING" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                          del.status === "OUT_FOR_DELIVERY" ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30 animate-pulse" :
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
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
              <div className="bg-[#111528] p-3 rounded-2xl border border-indigo-500/15 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedTable(null);
                      setSelectedCommand(null);
                      setSelectedDelivery(null);
                    }}
                    className="p-2 bg-[#070914] text-slate-400 hover:text-white rounded-xl border border-indigo-500/15 transition-all text-xs font-bold flex items-center gap-1"
                  >
                    ← Voltar à Lista
                  </button>
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      {selectedTable ? selectedTable.name : selectedCommand ? `Comanda #${selectedCommand.code} (${selectedCommand.customerName})` : selectedDelivery ? `Delivery ${selectedDelivery.code}` : "Venda Direta / Balcão"}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTable && (
                    <>
                      <button
                        onClick={() => setIsTransferOpen(true)}
                        className="px-3 py-1.5 bg-[#070914] hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <ArrowLeftRight size={13} /> Transferir Mesa
                      </button>
                      <button
                        onClick={() => setIsSplitBillOpen(true)}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
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
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border ${
                      selectedCategory === cat.id
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/25"
                        : "bg-[#111528] text-slate-400 border-indigo-500/10 hover:text-white hover:bg-indigo-500/10"
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
                  className="w-full bg-[#111528] border border-indigo-500/15 text-white pl-10 pr-4 py-2.5 rounded-2xl outline-none text-xs focus:border-indigo-500 font-semibold transition-all"
                />
              </div>

              {/* Grade de Produtos Touch */}
              <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-3 gap-3 p-1">
                {filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleAddProductClick(p)}
                    className="bg-[#111528] border border-indigo-500/10 hover:border-indigo-500/40 rounded-2xl p-3.5 cursor-pointer flex flex-col justify-between transition-all group hover:scale-[1.02] shadow-md"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors leading-tight">
                          {p.name}
                        </span>
                        {p.isPizza && (
                          <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                            PIZZA
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                        Setor: {p.sector}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-indigo-500/10">
                      <span className="text-emerald-400 font-mono font-black text-sm">
                        R$ {fmt(p.price)}
                      </span>
                      <span className="w-7 h-7 rounded-xl bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all">
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
        <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0 bg-[#0f1324] p-5 space-y-4 shadow-2xl">
          <div className="flex justify-between items-center border-b border-indigo-500/10 pb-3 shrink-0">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Receipt className="text-indigo-400" size={16} /> Extrato de Comanda
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {selectedTable ? `Mesa: ${selectedTable.name}` : selectedCommand ? `Comanda #${selectedCommand.code}` : selectedDelivery ? `Delivery ${selectedDelivery.code}` : "Venda Rápida / Balcão"}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-xl">
              {currentItems.length} item(s)
            </span>
          </div>

          {/* Lista de Itens Lançados */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
            {currentItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-[#070914] rounded-2xl border border-indigo-500/10 flex justify-between items-start gap-2 shadow-md">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-white truncate">{item.name}</p>
                    <button
                      onClick={() => handleRemoveOrderItem(item.id)}
                      className="text-slate-500 hover:text-red-400 p-0.5 transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {item.notes && (
                    <p className="text-[10px] text-amber-300/80 italic mt-0.5">Obs: {item.notes}</p>
                  )}

                  {item.selectedAdditions && item.selectedAdditions.length > 0 && (
                    <div className="text-[10px] text-indigo-300/80 mt-0.5">
                      + {item.selectedAdditions.map(a => a.name).join(", ")}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-2 text-[11px]">
                    <span className="text-slate-400 font-mono">{item.quantity}x R$ {fmt(item.unitPrice)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        item.status === "DRAFT" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {item.status === "DRAFT" ? "Pendente" : "Enviado"}
                      </span>
                      <span className="text-emerald-400 font-mono font-bold">R$ {fmt(item.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!currentItems.length && (
              <div className="text-center py-20 text-slate-500 italic space-y-2">
                <Utensils size={36} className="mx-auto opacity-30" />
                <p className="text-xs">Nenhum item adicionado à comanda.</p>
                <p className="text-[10px] text-slate-600">Selecione uma mesa ou itens no catálogo ao lado.</p>
              </div>
            )}
          </div>

          {/* Resumo de Totais e Botões de Fechamento */}
          <div className="border-t border-indigo-500/10 pt-4 space-y-3 shrink-0">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-200">R$ {fmt(subtotal)}</span>
              </div>

              {mode === "TABLES" && (
                <div className="flex justify-between text-slate-400 items-center">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeServiceFee}
                      onChange={e => setIncludeServiceFee(e.target.checked)}
                      className="rounded text-indigo-600 bg-[#070914] border-indigo-500/20"
                    />
                    <span>Taxa de Serviço (10%)</span>
                  </label>
                  <span className="font-mono font-semibold text-amber-400">R$ {fmt(serviceFee)}</span>
                </div>
              )}

              {selectedDelivery && (
                <div className="flex justify-between text-slate-400">
                  <span>Taxa de Entrega</span>
                  <span className="font-mono font-semibold text-cyan-400">R$ {fmt(deliveryExtra)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-indigo-500/10">
                <span>Total Geral</span>
                <span className="font-mono text-emerald-400 text-lg">R$ {fmt(grandTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleSendToKdsProduction}
                disabled={!currentItems.length || !currentItems.some(i => i.status === "DRAFT")}
                className="bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white disabled:opacity-30 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
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
          <div className="bg-[#111528] border border-indigo-500/20 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-indigo-500/10 flex justify-between items-center bg-[#0c0f1a]/50">
              <div>
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <ChefHat className="text-indigo-400" size={18} /> {modalProduct.name}
                </h3>
                <p className="text-[10px] text-slate-400">Setor: <strong className="text-indigo-300">{modalProduct.sector}</strong></p>
              </div>
              <button onClick={() => setModalProduct(null)} className="p-1 text-slate-500 hover:text-white"><X size={18}/></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {modalProduct.isPizza && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                  <label className="block text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                    🍕 Combinar 2º Sabor (Meio a Meio)
                  </label>
                  <select
                    value={pizzaSecondaryFlavor}
                    onChange={e => setPizzaSecondaryFlavor(e.target.value)}
                    className="w-full bg-[#070914] border border-amber-500/30 text-white px-3 py-2 rounded-xl text-xs outline-none font-semibold"
                  >
                    <option value="">Apenas Sabor Inteiro ({modalProduct.name})</option>
                    {PRODUCTS.filter(p => p.isPizza && p.id !== modalProduct.id).map(p => (
                      <option key={p.id} value={p.id}>+ 1/2 {p.name} (R$ {fmt(p.price)})</option>
                    ))}
                  </select>
                </div>
              )}

              {modalProduct.additionGroups?.map((group, gIdx) => (
                <div key={gIdx} className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {group.name}
                  </label>
                  <div className="space-y-1.5">
                    {group.items.map(add => {
                      const isSelected = selectedAdditions.some(a => a.id === add.id);
                      return (
                        <label
                          key={add.id}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            isSelected ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40" : "bg-[#070914] text-slate-300 border-indigo-500/10"
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
                              className="rounded text-indigo-600 bg-[#070914]"
                            />
                            <span>{add.name}</span>
                          </div>
                          <span className="font-mono text-emerald-400">+ R$ {fmt(add.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Observações para a Cozinha / Bar
                </label>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={e => setItemNotes(e.target.value)}
                  placeholder="Ex: Sem pimenta, carne bem passada, molho à parte..."
                  className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="p-4 border-t border-indigo-500/10 bg-[#0c0f1a]/50 flex justify-end gap-2 shrink-0">
              <button onClick={() => setModalProduct(null)} className="px-4 py-2 bg-[#070914] text-slate-400 rounded-xl text-xs font-semibold">
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
          <div className="bg-[#111528] border border-indigo-500/20 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Store className="text-emerald-400" size={18} /> Abrir {targetTableToOpen.name}
            </h3>
            <form onSubmit={handleOpenTableSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantidade de Pessoas</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={openTablePeople}
                  onChange={e => setOpenTablePeople(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3 py-2.5 rounded-xl text-xs font-bold text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Garçom Atendente</label>
                <select
                  value={selectedWaiter}
                  onChange={e => setSelectedWaiter(e.target.value)}
                  className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3 py-2.5 rounded-xl text-xs font-bold"
                >
                  {MOCK_WAITERS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsOpenTableModalOpen(false)} className="flex-1 bg-[#070914] text-slate-400 py-2.5 rounded-xl text-xs font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20">Confirmar & Abrir Mesa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ABRIR NOVA COMANDA ────────────────────────────────────────── */}
      {isOpenCommandModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-amber-500/20 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Tag className="text-amber-400" size={18} /> Abrir Nova Comanda
            </h3>
            <form onSubmit={handleOpenCommandSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Número da Comanda / Cartão *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 104"
                  value={newCommandCode}
                  onChange={e => setNewCommandCode(e.target.value)}
                  className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Pereira"
                  value={newCommandCustomer}
                  onChange={e => setNewCommandCustomer(e.target.value)}
                  className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Telefone (Opcional)</label>
                <input
                  type="text"
                  placeholder="(11) 90000-0000"
                  value={newCommandPhone}
                  onChange={e => setNewCommandPhone(e.target.value)}
                  className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3.5 py-2.5 rounded-xl text-xs font-medium"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsOpenCommandModalOpen(false)} className="flex-1 bg-[#070914] text-slate-400 py-2.5 rounded-xl text-xs font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-2.5 rounded-xl text-xs font-bold shadow-lg">Criar Comanda</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVO PEDIDO DELIVERY ──────────────────────────────────────── */}
      {isNewDeliveryModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-cyan-500/20 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bike className="text-cyan-400" size={18} /> Novo Pedido de Delivery
            </h3>
            <form onSubmit={handleNewDeliverySubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Beatriz Souza"
                  value={newDeliveryName}
                  onChange={e => setNewDeliveryName(e.target.value)}
                  className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3 py-2 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Telefone WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 98888-7777"
                  value={newDeliveryPhone}
                  onChange={e => setNewDeliveryPhone(e.target.value)}
                  className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Endereço de Entrega *</label>
                <input
                  type="text"
                  required
                  placeholder="Rua, número e complemento"
                  value={newDeliveryAddress}
                  onChange={e => setNewDeliveryAddress(e.target.value)}
                  className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={newDeliveryBairro}
                    onChange={e => setNewDeliveryBairro(e.target.value)}
                    className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Taxa Entrega (R$)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={newDeliveryFee}
                    onChange={e => setNewDeliveryFee(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3 py-2 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsNewDeliveryModalOpen(false)} className="flex-1 bg-[#070914] text-slate-400 py-2.5 rounded-xl text-xs font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black py-2.5 rounded-xl text-xs font-bold shadow-lg">Cadastrar Delivery</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: FECHAR CONTA & CHECKOUT ───────────────────────────────────── */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-indigo-500/10 flex justify-between items-center bg-[#0c0f1a]/50">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Receipt className="text-emerald-400" size={18} /> Fechamento de Conta & Pagamento
              </h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 text-slate-500 hover:text-white"><X size={18}/></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-[#070914] p-4 rounded-2xl border border-indigo-500/10 space-y-2">
                <div className="flex justify-between text-xs text-slate-400"><span>Subtotal</span><span className="font-mono">R$ {fmt(subtotal)}</span></div>
                {mode === "TABLES" && <div className="flex justify-between text-xs text-slate-400"><span>Taxa de Serviço (10%)</span><span className="font-mono text-amber-400">R$ {fmt(serviceFee)}</span></div>}
                {selectedDelivery && <div className="flex justify-between text-xs text-slate-400"><span>Taxa de Entrega</span><span className="font-mono text-cyan-400">R$ {fmt(deliveryExtra)}</span></div>}
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-indigo-500/10">
                  <span>Total Final a Pagar</span>
                  <span className="font-mono text-emerald-400 text-xl">R$ {fmt(grandTotal)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "CARTAO_CREDITO", label: "Crédito" },
                    { key: "CARTAO_DEBITO", label: "Débito" },
                    { key: "PIX", label: "PIX QrCode" },
                    { key: "DINHEIRO", label: "Dinheiro" },
                    { key: "FATURADO", label: "Faturado / Fiado" },
                  ].map(m => (
                    <button
                      key={m.key}
                      onClick={() => setPaymentMethod(m.key)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        paymentMethod === m.key
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                          : "bg-[#070914] text-slate-400 border-indigo-500/10"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsCheckoutOpen(false)} className="flex-1 bg-[#070914] text-slate-400 py-3 rounded-xl text-xs font-bold border border-indigo-500/10">Cancelar</button>
                <button onClick={handleCheckoutCloseTable} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={15} /> Confirmar & Emitir Cupom
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DIVIDIR CONTA ─────────────────────────────────────────────── */}
      {isSplitBillOpen && selectedTable && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111528] border border-indigo-500/20 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Users className="text-amber-400" size={18} /> Dividir Conta — {selectedTable.name}
            </h3>
            <div className="bg-[#070914] p-4 rounded-2xl border border-indigo-500/10 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400"><span>Total da Mesa</span><span className="font-mono font-bold text-white">R$ {fmt(grandTotal)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Número de Pessoas</span>
                <input
                  type="number"
                  min="1"
                  value={splitPeopleCount}
                  onChange={e => setSplitPeopleCount(parseInt(e.target.value) || 1)}
                  className="w-16 bg-[#111528] border border-indigo-500/20 text-white text-center font-mono font-bold py-1 rounded-lg"
                />
              </div>
              <div className="flex justify-between text-sm font-black text-emerald-400 pt-2 border-t border-indigo-500/10">
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
          <div className="bg-[#111528] border border-indigo-500/20 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <ArrowLeftRight className="text-indigo-400" size={18} /> Transferir Itens da {selectedTable.name}
            </h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Mesa de Destino</label>
              <select
                value={transferTargetTableId}
                onChange={e => setTransferTargetTableId(parseInt(e.target.value))}
                className="w-full bg-[#070914] border border-indigo-500/20 text-white px-3 py-2.5 rounded-xl text-xs font-bold outline-none"
              >
                {tables.filter(t => t.id !== selectedTable.id).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.status === "FREE" ? "LIVRE" : "OCUPADA"})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsTransferOpen(false)} className="flex-1 bg-[#070914] text-slate-400 py-2.5 rounded-xl text-xs font-bold">Cancelar</button>
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
                  className="flex-1 bg-gray-900 text-white font-sans text-xs py-2.5 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-1"
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
