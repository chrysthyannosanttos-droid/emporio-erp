import { getInventoryStats, searchInventoryProducts } from "@/actions/inventory";
import { InventoryClient } from "./InventoryClient";

export const metadata = {
  title: "Lançamento de Balanço & Inventário Físico | Empório Agrobelém",
  description: "Módulo de auditoria, contagem e balanço físico de estoque por código de barras, código interno (PLU), nome ou câmera.",
};

// Forçar dynamic para refletir contagens e saldo em tempo real
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [stats, initialResult] = await Promise.all([
    getInventoryStats(),
    searchInventoryProducts(""),
  ]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
      <InventoryClient
        initialStats={stats}
        initialProducts={initialResult.products || []}
      />
    </div>
  );
}

