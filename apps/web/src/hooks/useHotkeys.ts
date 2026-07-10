"use client";

import { useState, useEffect } from "react";

export interface PDVHotkeys {
  payment: string;
  closing: string;
  importOrder: string;
  priceCheck: string;
  supplement: string;
  withdrawal: string;
  cpf: string;
  cancelItem: string;
  multiply: string;
  discount: string;
}

export const defaultHotkeys: PDVHotkeys = {
  payment: "F12",
  closing: "F9",
  importOrder: "F8",
  priceCheck: "F7",
  supplement: "F6",
  withdrawal: "F5",
  cpf: "F4",
  cancelItem: "F3",
  multiply: "*",
  discount: "F10",
};

export const hotkeyLabels: Record<keyof PDVHotkeys, string> = {
  payment: "Finalizar Venda",
  closing: "Fechar Caixa",
  importOrder: "Importar Pedido",
  priceCheck: "Consulta",
  supplement: "Suprimento",
  withdrawal: "Sangria",
  cpf: "CPF",
  cancelItem: "Cancela Item",
  multiply: "Multiplicar Quant.",
  discount: "Desconto",
};

export function useHotkeys() {
  const [hotkeys, setHotkeys] = useState<PDVHotkeys>(defaultHotkeys);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pdv_hotkeys");
    if (saved) {
      try {
        setHotkeys({ ...defaultHotkeys, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to parse hotkeys from localStorage", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const saveHotkeys = (newHotkeys: PDVHotkeys) => {
    setHotkeys(newHotkeys);
    localStorage.setItem("pdv_hotkeys", JSON.stringify(newHotkeys));
  };

  return { hotkeys, saveHotkeys, isLoaded };
}
