"use client";

import { Landmark, FileSpreadsheet } from "lucide-react";
import { BankReconciliationView } from "../_components/BankReconciliationView";

export default function BankReconciliationPage() {
  return (
    <div className="w-full flex flex-col gap-5 select-none pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Landmark size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Conciliação Bancária</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              Importe o arquivo fornecido pelo banco (.OFX, .CNAB ou .CSV) e concilie automaticamente com os lançamentos do sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Main Reconciliation Workspace */}
      <BankReconciliationView />
    </div>
  );
}

