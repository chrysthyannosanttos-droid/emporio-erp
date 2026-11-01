// apps/pdv/src/services/OfflineStorage.ts

export interface LocalProduct {
  id: string;
  name: string;
  barcode: string;
  price: number;
  costPrice?: number;
  unit: string; // UN, KG, LT, CX, etc.
  isWeighable?: boolean; // Se exige balança
  stock?: number;
  category?: string;
}

export interface OfflineSaleItem {
  id: string;
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit: string;
}

export interface OfflinePayment {
  method: 'MONEY' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'VOUCHER' | 'TEF';
  amount: number;
  cardBrand?: string;
  installments?: number;
  authCode?: string;
}

export interface OfflineSale {
  localId: string;
  saleNumber: string;
  cashierNumber: number;
  operator: string;
  shiftId: string;
  subtotal: number;
  discount: number;
  total: number;
  amountGiven: number;
  change: number;
  cpf?: string;
  items: OfflineSaleItem[];
  payments: OfflinePayment[];
  createdAt: string;
  synced: boolean;
  syncedAt?: string;
}

export interface CashShift {
  id: string;
  shiftNumber: number;
  cashierNumber: number;
  operatorId: string;
  operatorName: string;
  openedAt: string;
  closedAt?: string;
  status: 'OPEN' | 'CLOSED';
  initialBalance: number; // Fundo de troco
  finalCounted?: {
    money: number;
    creditCard: number;
    debitCard: number;
    pix: number;
    voucher: number;
    total: number;
  };
  expectedCash?: number;
  cashDifference?: number; // Quebra (sobra ou falta)
  notes?: string;
  movements: {
    id: string;
    type: 'WITHDRAWAL' | 'SUPPLEMENT'; // Sangria ou Suprimento
    amount: number;
    reason: string;
    operator: string;
    createdAt: string;
  }[];
  synced: boolean;
}

const STORAGE_KEYS = {
  PRODUCTS: 'emporio_pdv_cache_products',
  PENDING_SALES: 'emporio_pdv_pending_sales',
  CURRENT_SHIFT: 'emporio_pdv_current_shift',
  SHIFT_HISTORY: 'emporio_pdv_shift_history',
  CONFIG: 'emporio_pdv_terminal',
};

export class OfflineStorage {
  // ─── PRODUTOS EM CACHE ──────────────────────────────
  static saveProducts(products: LocalProduct[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Erro ao salvar produtos no cache local:', e);
    }
  }

  static getProducts(): LocalProduct[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static findProductByBarcodeOrCode(code: string): LocalProduct | null {
    const products = this.getProducts();
    const clean = code.trim();
    return (
      products.find(
        p => p.barcode === clean || p.id === clean || p.barcode.endsWith(clean)
      ) || null
    );
  }

  // ─── TURNO / SESSÃO DE CAIXA ─────────────────────────
  static getCurrentShift(): CashShift | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_SHIFT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static openShift(
    cashierNumber: number,
    operatorId: string,
    operatorName: string,
    initialBalance: number
  ): CashShift {
    const newShift: CashShift = {
      id: `shift_${Date.now()}_cx${cashierNumber}`,
      shiftNumber: Date.now(),
      cashierNumber,
      operatorId,
      operatorName,
      openedAt: new Date().toISOString(),
      status: 'OPEN',
      initialBalance,
      movements: [],
      synced: false,
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_SHIFT, JSON.stringify(newShift));
    return newShift;
  }

  static addMovementToShift(
    type: 'WITHDRAWAL' | 'SUPPLEMENT',
    amount: number,
    reason: string,
    operator: string
  ): CashShift | null {
    const shift = this.getCurrentShift();
    if (!shift || shift.status !== 'OPEN') return null;

    const movement = {
      id: `mov_${Date.now()}`,
      type,
      amount,
      reason,
      operator,
      createdAt: new Date().toISOString(),
    };

    shift.movements.push(movement);
    shift.synced = false;
    localStorage.setItem(STORAGE_KEYS.CURRENT_SHIFT, JSON.stringify(shift));
    return shift;
  }

  static closeShift(
    finalCounted: {
      money: number;
      creditCard: number;
      debitCard: number;
      pix: number;
      voucher: number;
      total: number;
    },
    expectedCash: number,
    notes?: string
  ): CashShift | null {
    const shift = this.getCurrentShift();
    if (!shift || shift.status !== 'OPEN') return null;

    shift.status = 'CLOSED';
    shift.closedAt = new Date().toISOString();
    shift.finalCounted = finalCounted;
    shift.expectedCash = expectedCash;
    shift.cashDifference = +(finalCounted.money - expectedCash).toFixed(2);
    shift.notes = notes || '';
    shift.synced = false;

    // Salva no histórico de turnos
    const history = this.getShiftHistory();
    history.unshift(shift);
    localStorage.setItem(STORAGE_KEYS.SHIFT_HISTORY, JSON.stringify(history.slice(0, 50)));

    // Remove do turno ativo
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SHIFT);
    return shift;
  }

  static getShiftHistory(): CashShift[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHIFT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // ─── VENDAS OFFLINE ──────────────────────────────────
  static saveSale(sale: OfflineSale) {
    try {
      const sales = this.getPendingSales();
      sales.push(sale);
      localStorage.setItem(STORAGE_KEYS.PENDING_SALES, JSON.stringify(sales));
    } catch (e) {
      console.error('Erro ao salvar venda offline:', e);
    }
  }

  static getPendingSales(): OfflineSale[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_SALES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static markSalesSynced(syncedIds: string[]) {
    try {
      const sales = this.getPendingSales();
      const updated = sales.filter(s => !syncedIds.includes(s.localId));
      localStorage.setItem(STORAGE_KEYS.PENDING_SALES, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao atualizar vendas sincronizadas:', e);
    }
  }
}

