import PricingTable from "./PricingTable";
import { getPricingData, getCategories } from "@/actions/pricing";

export default async function PricingPage() {
  const [{ products }, { categories }] = await Promise.all([
    getPricingData(),
    getCategories()
  ]);

  return (
    <div className="h-full flex flex-col gap-5 pb-2">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            Precificação Baseada em Notas de Entrada
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Analise o custo real da última nota de entrada e ajuste a margem ou o preço final manualmente de forma rápida.</p>
        </div>
      </div>

      <PricingTable initialProducts={products || []} categories={categories || []} />
    </div>
  );
}
