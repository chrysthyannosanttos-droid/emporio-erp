/**
 * Driver e Utilitário de Impressão Direta ESC/POS para Epson TM-T20 / TM-T20X (80mm)
 * Suporta tanto o modo WebSerial (USB Direto sem diálogo) quanto Spooler do Windows Kiosk.
 */

// Comandos ESC/POS Padrão Epson
export const ESCPOS = {
  INIT: [0x1B, 0x40], // ESC @ (Inicializa a impressora)
  ALIGN_LEFT: [0x1B, 0x61, 0x00], // ESC a 0
  ALIGN_CENTER: [0x1B, 0x61, 0x01], // ESC a 1
  ALIGN_RIGHT: [0x1B, 0x61, 0x02], // ESC a 2
  BOLD_ON: [0x1B, 0x45, 0x01], // ESC E 1
  BOLD_OFF: [0x1B, 0x45, 0x00], // ESC E 0
  DOUBLE_HEIGHT: [0x1D, 0x21, 0x01], // GS ! 1
  DOUBLE_WIDTH: [0x1D, 0x21, 0x10], // GS ! 16
  DOUBLE_SIZE: [0x1D, 0x21, 0x11], // GS ! 17 (Título grande)
  NORMAL_SIZE: [0x1D, 0x21, 0x00], // GS ! 0
  LINE_FEED: [0x0A], // LF
  FEED_3: [0x1B, 0x64, 0x03], // Avança 3 linhas
  FEED_5: [0x1B, 0x64, 0x05], // Avança 5 linhas
  CUT_FULL: [0x1D, 0x56, 0x00], // GS V 0 (Corte total)
  CUT_PARTIAL: [0x1D, 0x56, 0x41, 0x03], // GS V A 3 (Alimenta e corta guilhotina Epson)
  DRAWER_KICK: [0x1B, 0x70, 0x00, 0x19, 0xFA], // ESC p 0 25 250 (Pulso elétrico para abrir gaveta)
};

export interface EscposReceiptData {
  companyName: string;
  companyCnpj?: string;
  companyAddress?: string;
  saleNumber: string;
  operatorName?: string;
  cashierNumber?: number | string;
  createdAt?: string | Date;
  items: {
    name: string;
    qty: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  amountGiven?: number;
  change?: number;
  cpf?: string;
  autoCut?: boolean;
  openDrawer?: boolean;
}

/**
 * Converte string para bytes com substituição de acentos para compatibilidade com Epson TM-T20
 */
export function stringToEscposBytes(text: string): number[] {
  // Normalizar acentuação para evitar caracteres corrompidos em impressoras térmicas
  const clean = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "");

  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    bytes.push(clean.charCodeAt(i));
  }
  return bytes;
}

/**
 * Formata linha com texto à esquerda e valor à direita (48 colunas padrão 80mm)
 */
function formatLine48(left: string, right: string, maxLen = 48): string {
  const l = left.slice(0, maxLen - right.length - 1);
  const spaces = Math.max(1, maxLen - l.length - right.length);
  return l + " ".repeat(spaces) + right;
}

/**
 * Constrói o buffer binário ESC/POS completo para a Epson TM-T20
 */
export function buildEpsonT20Receipt(data: EscposReceiptData): Uint8Array {
  const bytes: number[] = [];

  const add = (cmd: number[]) => bytes.push(...cmd);
  const print = (text: string) => add(stringToEscposBytes(text));
  const printLine = (text: string) => add(stringToEscposBytes(text + "\n"));

  const fmtBRL = (v: number) => "R$ " + v.toFixed(2).replace(".", ",");
  const now = data.createdAt ? new Date(data.createdAt) : new Date();
  const dateStr = now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR");

  // 1. Inicialização
  add(ESCPOS.INIT);

  // Gaveta no início se configurado
  if (data.openDrawer) {
    add(ESCPOS.DRAWER_KICK);
  }

  // 2. Cabeçalho da Empresa
  add(ESCPOS.ALIGN_CENTER);
  add(ESCPOS.DOUBLE_SIZE);
  add(ESCPOS.BOLD_ON);
  printLine(data.companyName || "CYBERTECH RP");
  add(ESCPOS.NORMAL_SIZE);
  add(ESCPOS.BOLD_OFF);

  if (data.companyCnpj) {
    printLine("CNPJ: " + data.companyCnpj);
  }
  if (data.companyAddress) {
    printLine(data.companyAddress);
  }

  printLine("-".repeat(48));
  add(ESCPOS.BOLD_ON);
  printLine("CUPOM NAO FISCAL DE VENDA");
  add(ESCPOS.BOLD_OFF);
  printLine("Data: " + dateStr);
  printLine(
    `Caixa: ${String(data.cashierNumber || "01").padStart(2, "0")} | Operador: ${data.operatorName || "Caixa"}`
  );
  printLine("Venda: #" + (data.saleNumber || "000000").slice(0, 12).toUpperCase());
  printLine("-".repeat(48));

  // 3. Itens
  add(ESCPOS.ALIGN_LEFT);
  printLine(formatLine48("ITEM / CODIGO / DESCRICAO", "TOTAL (R$)"));
  printLine("-".repeat(48));

  data.items.forEach((it, idx) => {
    const itemNum = String(idx + 1).padStart(2, "0");
    const nameTrunc = it.name.length > 28 ? it.name.slice(0, 28) : it.name;
    const detail = `${it.qty} x ${fmtBRL(it.unitPrice)}`;
    const lineTotal = fmtBRL(it.total);

    printLine(`${itemNum} ${nameTrunc}`);
    printLine(formatLine48(`   ${detail}`, lineTotal));
  });

  printLine("-".repeat(48));

  // 4. Totais
  add(ESCPOS.ALIGN_LEFT);
  printLine(formatLine48("SUBTOTAL:", fmtBRL(data.subtotal)));
  if (data.discount && data.discount > 0) {
    printLine(formatLine48("DESCONTO:", "-" + fmtBRL(data.discount)));
  }

  add(ESCPOS.BOLD_ON);
  add(ESCPOS.DOUBLE_HEIGHT);
  printLine(formatLine48("TOTAL PAGO:", fmtBRL(data.total)));
  add(ESCPOS.NORMAL_SIZE);
  add(ESCPOS.BOLD_OFF);

  printLine("-".repeat(48));

  // 5. Pagamento e Troco
  const payMap: Record<string, string> = {
    MONEY: "Dinheiro",
    PIX: "PIX Dinamico",
    CREDIT_CARD: "Cartao de Credito",
    DEBIT_CARD: "Cartao de Debito",
    VOUCHER: "Voucher / Convenio",
  };
  printLine(formatLine48("FORMA DE PAGAMENTO:", payMap[data.paymentMethod] || data.paymentMethod));

  if (data.amountGiven && data.amountGiven > 0) {
    printLine(formatLine48("VALOR RECEBIDO:", fmtBRL(data.amountGiven)));
  }
  if (data.change && data.change > 0) {
    add(ESCPOS.BOLD_ON);
    printLine(formatLine48("TROCO:", fmtBRL(data.change)));
    add(ESCPOS.BOLD_OFF);
  }

  if (data.cpf) {
    printLine("-".repeat(48));
    printLine("CPF do Consumidor: " + data.cpf);
  }

  // 6. Rodapé
  printLine("-".repeat(48));
  add(ESCPOS.ALIGN_CENTER);
  printLine("Obrigado pela preferencia!");
  printLine("Volte Sempre!");
  printLine("Cybertech RP - www.cybertechapp.com.br");

  // 7. Avanço de papel e Corte com Guilhotina
  add(ESCPOS.FEED_5);
  if (data.autoCut !== false) {
    add(ESCPOS.CUT_PARTIAL);
  }

  return new Uint8Array(bytes);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONEXÃO DIRETA WEBSERIAL (USB)
// ─────────────────────────────────────────────────────────────────────────────

let activeSerialPort: any = null;

/**
 * Conecta diretamente com a Epson TM-T20 via porta USB Serial do navegador
 */
export async function connectEpsonUsbDirect(): Promise<{ success: boolean; message: string }> {
  if (typeof window === "undefined" || !(navigator as any).serial) {
    return {
      success: false,
      message: "Seu navegador não suporta WebSerial. Utilize Google Chrome ou Microsoft Edge no Windows.",
    };
  }

  try {
    const port = await (navigator as any).serial.requestPort({
      filters: [
        { usbVendorId: 0x04b8 }, // Epson Vendor ID
      ],
    }).catch(() => (navigator as any).serial.requestPort()); // Fallback sem filtro se o usuário tiver porta virtual

    if (!port) {
      return { success: false, message: "Nenhuma impressora selecionada." };
    }

    // Taxa padrão da Epson TM-T20 é 38400 ou 115200 (ou 9600)
    await port.open({ baudRate: 38400 }).catch(async () => {
      // Se já estava aberta ou taxa diferente, tenta 115200
      await port.open({ baudRate: 115200 });
    });

    activeSerialPort = port;
    return {
      success: true,
      message: "Epson TM-T20 conectada com sucesso via USB Direto!",
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Erro ao conectar com a Epson TM-T20: " + err.message,
    };
  }
}

/**
 * Verifica se o Agente Local de Impressão Direta Epson (127.0.0.1:18181) está ativo no Windows
 */
export async function checkLocalEpsonBridge(): Promise<{ connected: boolean; printer?: string }> {
  if (typeof window === "undefined") return { connected: false };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("http://127.0.0.1:18181/status", {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ok) {
        return { connected: true, printer: data.printer || "EPSON TM-T20X Receipt" };
      }
    }
  } catch {
    // Agente local não detectado
  }
  return { connected: false };
}

/**
 * Converte Uint8Array para Base64
 */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(bytes).toString("base64");
}

/**
 * Envia comandos ESC/POS diretamente para a Epson TM-T20 (via Agente Local RAW USB ou WebSerial)
 * Sem abrir janela de pré-visualização do navegador!
 */
export async function printDirectToEpson(data: Uint8Array): Promise<boolean> {
  // 1. Tentar primeiro via Agente Local Windows RAW Spooler (127.0.0.1:18181) - Zero Diálogos!
  try {
    const base64Payload = uint8ToBase64(data);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("http://127.0.0.1:18181/print", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: base64Payload,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json().catch(() => ({ ok: true }));
      if (json.ok !== false) {
        return true;
      }
    }
  } catch {
    // Fallback para WebSerial abaixo
  }

  // 2. Tentar via WebSerial se conectado
  if (!activeSerialPort || !activeSerialPort.writable) {
    return false;
  }

  try {
    const writer = activeSerialPort.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
    return true;
  } catch (err) {
    console.error("Erro na transmissão serial para Epson:", err);
    return false;
  }
}

