"use client";

import { useState, useEffect, useCallback } from "react";

export interface PDVHotkeys {
  search: string;         // F2 - Buscar produto
  quantity: string;       // F3 - Quantidade
  priceCheck: string;     // F4 - Consultar preço
  discount: string;       // F6 - Desconto
  printReceipt: string;   // F7 - Imprimir cupom
  customer: string;       // F8 - Cliente (CPF/CNPJ)
  consultProduct: string; // F9 - Consultar produto
  payment: string;        // F10 - Pagamento
  confirm: string;        // Enter - Confirmar
  cancel: string;         // Escape - Voltar ou cancelar

  // Legados / Compatibilidade mantida
  closing?: string;
  importOrder?: string;
  supplement?: string;
  withdrawal?: string;
  cancelItem?: string;
  multiply?: string;
  cpf?: string;
}

export const defaultHotkeys: PDVHotkeys = {
  search: "F2",
  quantity: "F3",
  priceCheck: "F4",
  discount: "F6",
  printReceipt: "F7",
  customer: "F8",
  consultProduct: "F9",
  payment: "F10",
  confirm: "Enter",
  cancel: "Escape",

  // Compatibilidade
  multiply: "*",
  cpf: "F8",
  closing: "F9",
  importOrder: "F8",
  supplement: "F6",
  withdrawal: "F5",
  cancelItem: "F3",
};

export const hotkeyLabels: Record<string, string> = {
  search: "F2 — Buscar produto",
  quantity: "F3 — Quantidade",
  priceCheck: "F4 — Consultar preço",
  discount: "F6 — Desconto",
  printReceipt: "F7 — Imprimir cupom",
  customer: "F8 — Identificar Cliente (CPF/CNPJ)",
  consultProduct: "F9 — Consultar produto / Catálogo",
  payment: "F10 — Pagamento da venda",
  confirm: "ENTER — Confirmar",
  cancel: "ESC — Voltar ou cancelar",
};

// Chaves principais ativas no PDV
export const PRIMARY_HOTKEY_KEYS: (keyof PDVHotkeys)[] = [
  "search",
  "quantity",
  "priceCheck",
  "discount",
  "printReceipt",
  "customer",
  "consultProduct",
  "payment",
  "confirm",
  "cancel",
];

// Identifica se há atalhos duplicados/em conflito
export function findHotkeyConflicts(keys: PDVHotkeys): Record<string, string[]> {
  const usageMap: Record<string, string[]> = {};
  PRIMARY_HOTKEY_KEYS.forEach((actionKey) => {
    const assignedKey = String(keys[actionKey] || "").trim().toUpperCase();
    if (assignedKey) {
      if (!usageMap[assignedKey]) usageMap[assignedKey] = [];
      usageMap[assignedKey].push(actionKey);
    }
  });

  const conflicts: Record<string, string[]> = {};
  Object.entries(usageMap).forEach(([assignedKey, actions]) => {
    if (actions.length > 1) {
      conflicts[assignedKey] = actions;
    }
  });
  return conflicts;
}

export function useHotkeys() {
  const [hotkeys, setHotkeys] = useState<PDVHotkeys>(defaultHotkeys);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("CYBERTECH_PDV_HOTKEYS") || localStorage.getItem("pdv_hotkeys");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migra atalhos antigos se necessário mantendo os padrões novos de F2..F10
        setHotkeys({ ...defaultHotkeys, ...parsed });
      }
    } catch (e) {
      console.error("Falha ao ler atalhos do localStorage", e);
    }
    setIsLoaded(true);
  }, []);

  const saveHotkeys = useCallback((newHotkeys: PDVHotkeys) => {
    setHotkeys(newHotkeys);
    try {
      localStorage.setItem("CYBERTECH_PDV_HOTKEYS", JSON.stringify(newHotkeys));
      // Manter chave legada sincronizada
      localStorage.setItem("pdv_hotkeys", JSON.stringify(newHotkeys));
      window.dispatchEvent(new CustomEvent("cybertech-hotkeys-updated", { detail: newHotkeys }));
    } catch (e) {
      console.error("Falha ao salvar atalhos", e);
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    saveHotkeys(defaultHotkeys);
  }, [saveHotkeys]);

  return {
    hotkeys,
    saveHotkeys,
    resetToDefaults,
    isLoaded,
    conflicts: findHotkeyConflicts(hotkeys),
  };
}
