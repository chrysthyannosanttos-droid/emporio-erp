"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-base py-3.5 transition-colors"
    >
      <Printer size={18} />
      Imprimir / Salvar em PDF
    </button>
  );
}

