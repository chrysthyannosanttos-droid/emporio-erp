"use client";

// ==============================================================================
// CYBERTECH RP - CONFIGURAÇÕES DE HARDWARE E PERIFÉRICOS DO PDV
// ==============================================================================

export interface PrinterGavetaConfig {
  printerModel: string; // "Termica 80mm (ESC/POS)" | "Termica 58mm" | "A4 Padrão"
  connectionType: "USB" | "TCP_IP" | "SERIAL" | "BROWSER";
  ipAddress?: string;
  tcpPort?: number;
  autoCut: boolean;
  openDrawerOnSale: boolean;
  feedLines: number;
  printCopies: number;
}

export const DEFAULT_PRINTER_CONFIG: PrinterGavetaConfig = {
  printerModel: "Termica 80mm (ESC/POS)",
  connectionType: "BROWSER",
  ipAddress: "192.168.1.200",
  tcpPort: 9100,
  autoCut: true,
  openDrawerOnSale: true,
  feedLines: 3,
  printCopies: 1,
};

export interface TefPaymentsConfig {
  tefType: "POS_MANUAL" | "PAYGO" | "SITEF" | "STONE_TEF";
  serverIp: string;
  serverPort: number;
  terminalId: string;
  requireAuthCode: boolean;
  allowInstallments: boolean;
  askAcquirer: boolean;
  askBrand: boolean;
}

export const DEFAULT_TEF_CONFIG: TefPaymentsConfig = {
  tefType: "POS_MANUAL",
  serverIp: "127.0.0.1",
  serverPort: 4096,
  terminalId: "TERM01",
  requireAuthCode: true,
  allowInstallments: true,
  askAcquirer: true,
  askBrand: true,
};

export interface BarcodeScannerConfig {
  scannerType: "USB_HID" | "SERIAL";
  suffix: "ENTER" | "TAB" | "NONE";
  enableAudioBeep: boolean;
  minBarcodeLength: number;
  scalePrefixEnabled: boolean; // Balança Toledo/Filizola (prefixo 2)
}

export const DEFAULT_SCANNER_CONFIG: BarcodeScannerConfig = {
  scannerType: "USB_HID",
  suffix: "ENTER",
  enableAudioBeep: true,
  minBarcodeLength: 4,
  scalePrefixEnabled: true,
};

export interface FiscalNfceConfig {
  environment: "HOMOLOGATION" | "PRODUCTION";
  series: number;
  nextNumber: number;
  cscId: string;
  cscToken: string;
  certificateName: string;
  certificateExpiry: string;
  autoEmitOnSale: boolean;
  timeoutSeconds: number;
}

export const DEFAULT_FISCAL_CONFIG: FiscalNfceConfig = {
  environment: "HOMOLOGATION",
  series: 1,
  nextNumber: 1042,
  cscId: "000001",
  cscToken: "A1B2C3D4E5F678901234567890ABCDEF",
  certificateName: "CERTIFICADO_A1_EMPORIO_2026.pfx",
  certificateExpiry: "31/12/2026",
  autoEmitOnSale: true,
  timeoutSeconds: 8,
};

// ── Funções de Armazenamento Local ─────────────────────────────

export function loadPrinterConfig(): PrinterGavetaConfig {
  if (typeof window === "undefined") return DEFAULT_PRINTER_CONFIG;
  try {
    const raw = localStorage.getItem("CYBERTECH_PDV_PRINTER");
    return raw ? { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(raw) } : DEFAULT_PRINTER_CONFIG;
  } catch {
    return DEFAULT_PRINTER_CONFIG;
  }
}

export function savePrinterConfig(cfg: PrinterGavetaConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("CYBERTECH_PDV_PRINTER", JSON.stringify(cfg));
}

export function loadTefConfig(): TefPaymentsConfig {
  if (typeof window === "undefined") return DEFAULT_TEF_CONFIG;
  try {
    const raw = localStorage.getItem("CYBERTECH_PDV_TEF");
    return raw ? { ...DEFAULT_TEF_CONFIG, ...JSON.parse(raw) } : DEFAULT_TEF_CONFIG;
  } catch {
    return DEFAULT_TEF_CONFIG;
  }
}

export function saveTefConfig(cfg: TefPaymentsConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("CYBERTECH_PDV_TEF", JSON.stringify(cfg));
}

export function loadScannerConfig(): BarcodeScannerConfig {
  if (typeof window === "undefined") return DEFAULT_SCANNER_CONFIG;
  try {
    const raw = localStorage.getItem("CYBERTECH_PDV_SCANNER");
    return raw ? { ...DEFAULT_SCANNER_CONFIG, ...JSON.parse(raw) } : DEFAULT_SCANNER_CONFIG;
  } catch {
    return DEFAULT_SCANNER_CONFIG;
  }
}

export function saveScannerConfig(cfg: BarcodeScannerConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("CYBERTECH_PDV_SCANNER", JSON.stringify(cfg));
}

export function loadFiscalConfig(): FiscalNfceConfig {
  if (typeof window === "undefined") return DEFAULT_FISCAL_CONFIG;
  try {
    const raw = localStorage.getItem("CYBERTECH_PDV_FISCAL");
    return raw ? { ...DEFAULT_FISCAL_CONFIG, ...JSON.parse(raw) } : DEFAULT_FISCAL_CONFIG;
  } catch {
    return DEFAULT_FISCAL_CONFIG;
  }
}

export function saveFiscalConfig(cfg: FiscalNfceConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("CYBERTECH_PDV_FISCAL", JSON.stringify(cfg));
}

// ── Utilitário Sonoro de Bip do Leitor ──────────────────────────
export function playScannerBeep(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2400, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Silently ignore audio restrictions
  }
}

