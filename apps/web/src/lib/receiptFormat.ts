// Funções puras (sem banco de dados) — podem ser usadas no servidor e no navegador.

export interface ReceiptItem {
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  saleId: string;
  number: string; // Código curto do cupom (ex.: A1B2C3D4)
  companyName: string;
  companyDocument: string;
  operatorName: string;
  createdAt: string; // ISO
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountGiven?: number;
  change?: number;
}

export const PAYMENT_LABELS: Record<string, string> = {
  MONEY: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  VOUCHER: "Voucher",
};

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatQty(quantity: number, unit: string): string {
  const isWeight = unit?.toUpperCase() === "KG";
  return isWeight
    ? `${quantity.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`
    : `${quantity.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} un`;
}

export function shortSaleNumber(saleId: string): string {
  return saleId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Mantém apenas dígitos e garante o DDI 55 (Brasil) para o WhatsApp. */
export function normalizeBrazilPhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

/** Texto do cupom pronto para WhatsApp / SMS / e-mail. */
export function buildReceiptText(receipt: ReceiptData, receiptUrl: string): string {
  const date = new Date(receipt.createdAt).toLocaleString("pt-BR");
  const lines: string[] = [];

  lines.push(`🧾 *${receipt.companyName}*`);
  lines.push(`Cupom nº ${receipt.number}`);
  lines.push(date);
  lines.push("");

  for (const item of receipt.items) {
    lines.push(`• ${item.name}`);
    lines.push(`   ${formatQty(item.quantity, item.unit)} x ${formatBRL(item.unitPrice)} = ${formatBRL(item.total)}`);
  }

  lines.push("");
  if (receipt.discount > 0) {
    lines.push(`Subtotal: ${formatBRL(receipt.subtotal)}`);
    lines.push(`Desconto: -${formatBRL(receipt.discount)}`);
  }
  lines.push(`*TOTAL: ${formatBRL(receipt.total)}*`);
  lines.push(`Pagamento: ${PAYMENT_LABELS[receipt.paymentMethod] || receipt.paymentMethod}`);
  lines.push("");
  lines.push(`Ver cupom completo: ${receiptUrl}`);
  lines.push("Obrigado pela preferência! 💙");

  return lines.join("\n");
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  const normalized = normalizeBrazilPhone(phone);
  const base = normalized ? `https://wa.me/${normalized}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function buildSmsUrl(phone: string, text: string): string {
  const normalized = normalizeBrazilPhone(phone);
  // O separador do corpo difere entre iOS (&) e Android (?); "?body=" funciona nos dois na prática.
  return `sms:${normalized ? `+${normalized}` : ""}?body=${encodeURIComponent(text)}`;
}

export function buildMailtoUrl(email: string, companyName: string, number: string, text: string): string {
  const subject = `Seu cupom - ${companyName} (nº ${number})`;
  // Remove os asteriscos de negrito do WhatsApp, que não fazem sentido em e-mail.
  const plain = text.replace(/\*/g, "");
  return `mailto:${encodeURIComponent(email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plain)}`;
}

