import PricingTable from "./PricingTable";
import { getPricingData, getCategories } from "@/actions/pricing";

export default async function PricingPage() {
  const [pricingResult, { categories }] = await Promise.all([
    getPricingData(),
    getCategories()
  ]);

  const products = (pricingResult as any).products || [];
  const invoices = (pricingResult as any).invoices || [];

  return (
    <div className="h-full flex flex-col gap-4 pb-2">
      <div className="shrink-0">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Precificação &amp; Margens
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Precifique por seção, nota fiscal ou família de produtos. Ajuste markup e preço individual ou em lote.
        </p>
      </div>

      <PricingTable
        initialProducts={products}
        categories={categories || []}
        invoices={invoices}
      />
    </div>
  );
}
