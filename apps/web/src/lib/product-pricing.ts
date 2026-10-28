export type ProductPricingInput = {
  purchaseCost: number;
  freightOther: number;
  operationalRate: number;
  desiredMargin: number;
  icmsRate: number;
  icmsRedBaseRate: number;
  fecoepRate: number;
  pisRate: number;
  cofinsRate: number;
  ipiRate: number;
  ibsRate: number;
  cbsRate: number;
  isRate: number;
  icmsRateIn: number;
  icmsRedBaseRateIn: number;
  fecoepRateIn: number;
  pisRateIn: number;
  cofinsRateIn: number;
  ipiRateIn: number;
};

export type ProductPricingBreakdown = {
  inboundTaxRate: number;
  inboundTaxAmount: number;
  outboundTaxRate: number;
  operationalRate: number;
  desiredMargin: number;
  landedCost: number;
  totalCost: number;
  suggestedPrice: number;
  markupFactor: number;
  estimatedProfit: number;
  error: string | null;
};

function num(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function effectiveIcmsRate(rate: unknown, reduction: unknown): number {
  return num(rate) * (1 - Math.min(num(reduction), 100) / 100);
}

export function calculateProductPricing(input: ProductPricingInput): ProductPricingBreakdown {
  const purchaseCost = num(input.purchaseCost);
  const freightOther = num(input.freightOther);
  const operationalRate = num(input.operationalRate);
  const desiredMargin = num(input.desiredMargin);

  const inboundTaxRate =
    effectiveIcmsRate(input.icmsRateIn, input.icmsRedBaseRateIn) +
    num(input.fecoepRateIn) +
    num(input.pisRateIn) +
    num(input.cofinsRateIn) +
    num(input.ipiRateIn);

  const outboundTaxRate =
    effectiveIcmsRate(input.icmsRate, input.icmsRedBaseRate) +
    num(input.fecoepRate) +
    num(input.pisRate) +
    num(input.cofinsRate) +
    num(input.ipiRate) +
    num(input.ibsRate) +
    num(input.cbsRate) +
    num(input.isRate);

  const inboundTaxAmount = purchaseCost * (inboundTaxRate / 100);
  const landedCost = purchaseCost + inboundTaxAmount;
  const totalCost = landedCost + freightOther;

  const deductionRate = outboundTaxRate + operationalRate + desiredMargin;
  if (purchaseCost <= 0) {
    return {
      inboundTaxRate,
      inboundTaxAmount: 0,
      outboundTaxRate,
      operationalRate,
      desiredMargin,
      landedCost: 0,
      totalCost: freightOther,
      suggestedPrice: 0,
      markupFactor: 0,
      estimatedProfit: 0,
      error: null,
    };
  }

  if (deductionRate >= 100) {
    return {
      inboundTaxRate,
      inboundTaxAmount,
      outboundTaxRate,
      operationalRate,
      desiredMargin,
      landedCost,
      totalCost,
      suggestedPrice: 0,
      markupFactor: 0,
      estimatedProfit: 0,
      error: "A soma de impostos de saída, custo operacional e margem precisa ser menor que 100%.",
    };
  }

  const suggestedPrice = totalCost / (1 - deductionRate / 100);
  const estimatedProfit = suggestedPrice * (desiredMargin / 100);
  const markupFactor = totalCost > 0 ? suggestedPrice / totalCost : 0;

  return {
    inboundTaxRate,
    inboundTaxAmount,
    outboundTaxRate,
    operationalRate,
    desiredMargin,
    landedCost,
    totalCost,
    suggestedPrice,
    markupFactor,
    estimatedProfit,
    error: null,
  };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPct(value: number): string {
  return `${value.toFixed(2).replace(".", ",")}%`;
}
