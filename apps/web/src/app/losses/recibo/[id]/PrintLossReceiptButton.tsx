"use client";

import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";

export function PrintLossReceiptButton() {
  return (
    <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/losses"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-[#ffffff] hover:bg-slate-50 text-slate-800 font-bold text-sm px-4 py-3 transition-colors shadow-xs"
      >
        <ArrowLeft size={16} />
        Voltar para Perdas &amp; Avarias
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-3 transition-colors shadow-md cursor-pointer"
      >
        <Printer size={16} />
        Imprimir / Salvar em PDF
      </button>
    </div>
  );
}
