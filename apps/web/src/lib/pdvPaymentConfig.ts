export interface PdvPaymentConfig {
  // Se ativo, pagamentos em cartão/voucher operam no modo Maquineta POS
  posModeEnabled: boolean;
  // Quais campos solicitar ao operador no modo Maquineta POS
  askAcquirer: boolean;
  askBrand: boolean;
  requireAuthCode: boolean;
  allowInstallments: boolean;
  // Formas de pagamento habilitadas para este cliente no PDV
  enabledMethods: {
    MONEY: boolean;
    PIX: boolean;
    CREDIT_CARD: boolean;
    DEBIT_CARD: boolean;
    VOUCHER: boolean;
  };
  // Maquinetas (Administradoras) que este cliente utiliza
  acquirers: string[];
  // Bandeiras que este cliente aceita
  brands: string[];
}

export const DEFAULT_PDV_PAYMENT_CONFIG: PdvPaymentConfig = {
  posModeEnabled: true,
  askAcquirer: true,
  askBrand: true,
  requireAuthCode: true,
  allowInstallments: true,
  enabledMethods: {
    MONEY: true,
    PIX: true,
    CREDIT_CARD: true,
    DEBIT_CARD: true,
    VOUCHER: true,
  },
  acquirers: ["Stone", "Rede", "Cielo", "PagBank", "Getnet"],
  brands: ["Visa", "Mastercard", "Elo", "Hipercard", "Amex", "Alelo / VR"],
};

export const ALL_SUGGESTED_ACQUIRERS = [
  "Stone",
  "Rede",
  "Cielo",
  "PagBank",
  "Getnet",
  "SafraPay",
  "InfinitePay",
  "Mercado Pago",
  "SumUp",
  "Sicredi / Sicoob",
  "Alelo / Ticket",
];

export const ALL_SUGGESTED_BRANDS = [
  "Visa",
  "Mastercard",
  "Elo",
  "Hipercard",
  "Amex",
  "Alelo / VR",
  "Sodexo / Pluxee",
  "Ticket",
  "Cabal",
];

const STORAGE_KEY = "EMPORIO_PDV_PAYMENT_CONFIG";

export function loadPdvPaymentConfig(): PdvPaymentConfig {
  if (typeof window === "undefined") return DEFAULT_PDV_PAYMENT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PDV_PAYMENT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PDV_PAYMENT_CONFIG,
      ...parsed,
      enabledMethods: {
        ...DEFAULT_PDV_PAYMENT_CONFIG.enabledMethods,
        ...(parsed.enabledMethods || {}),
      },
      acquirers:
        Array.isArray(parsed.acquirers) && parsed.acquirers.length > 0
          ? parsed.acquirers
          : DEFAULT_PDV_PAYMENT_CONFIG.acquirers,
      brands:
        Array.isArray(parsed.brands) && parsed.brands.length > 0
          ? parsed.brands
          : DEFAULT_PDV_PAYMENT_CONFIG.brands,
    };
  } catch {
    return DEFAULT_PDV_PAYMENT_CONFIG;
  }
}

export function savePdvPaymentConfig(config: PdvPaymentConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event("pdv-payment-config-updated"));
  } catch {}
}

