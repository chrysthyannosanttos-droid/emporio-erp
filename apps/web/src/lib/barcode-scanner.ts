"use client";

/**
 * Utilitário universal para leitura de códigos de barras (EAN-13, EAN-8, Code 128, QR Code, etc.)
 * Compatível com navegadores móveis (Chrome Android, Safari iOS, Samsung Internet) e desktop.
 * Prioridade 1: BarcodeDetector nativo de hardware.
 * Prioridade 2: Fallback automático via ZXing Library (carregamento sob demanda CDN).
 */

let zxingLoadingPromise: Promise<any> | null = null;

export function loadZXingScript(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).ZXing) return Promise.resolve((window as any).ZXing);

  if (zxingLoadingPromise) return zxingLoadingPromise;

  zxingLoadingPromise = new Promise((resolve) => {
    const existing = document.getElementById("zxing-lib-script");
    if (existing) {
      if ((window as any).ZXing) return resolve((window as any).ZXing);
      existing.addEventListener("load", () => resolve((window as any).ZXing));
      existing.addEventListener("error", () => resolve(null));
      return;
    }

    const script = document.createElement("script");
    script.id = "zxing-lib-script";
    script.src = "https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).ZXing);
    script.onerror = () => {
      // Fallback para jsdelivr caso unpkg falhe
      const alt = document.createElement("script");
      alt.id = "zxing-lib-script-alt";
      alt.src = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
      alt.async = true;
      alt.onload = () => resolve((window as any).ZXing);
      alt.onerror = () => resolve(null);
      document.head.appendChild(alt);
    };

    document.head.appendChild(script);
  });

  return zxingLoadingPromise;
}

/**
 * Decodifica código de barras a partir de uma imagem (HTMLImageElement)
 */
export async function decodeBarcodeFromImage(img: HTMLImageElement): Promise<string | null> {
  // 1. Tentar BarcodeDetector nativo
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
      });
      const detected = await detector.detect(img);
      if (detected && detected.length > 0 && detected[0].rawValue) {
        return detected[0].rawValue.trim();
      }
    } catch {
      // Falha silenciosa no detector nativo, avança para ZXing
    }
  }

  // 2. Tentar ZXing
  try {
    const ZXing = await loadZXingScript();
    if (ZXing) {
      const reader = new ZXing.BrowserMultiFormatReader();
      const result = await reader.decodeFromImageElement(img);
      if (result && result.getText()) {
        return result.getText().trim();
      }
    }
  } catch {
    // Código não encontrado na imagem
  }

  return null;
}

