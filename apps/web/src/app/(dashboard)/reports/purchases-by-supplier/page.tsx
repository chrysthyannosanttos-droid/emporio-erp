import { Metadata } from "next";
import { getPurchasesBySupplierReport } from "@/actions/purchasesReport";
import { PurchasesBySupplierClient } from "./PurchasesBySupplierClient";

export const metadata: Metadata = {
  title: "Relatório de Compras por Fornecedor | Horus ERP",
  description: "Relatório gerencial consolidado de compras por fornecedor com detalhamento de notas fiscais e mercadorias.",
};

export default async function PurchasesBySupplierPage() {
  const initialData = await getPurchasesBySupplierReport();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PurchasesBySupplierClient initialData={initialData} />
    </div>
  );
}

