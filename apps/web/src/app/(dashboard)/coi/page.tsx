import { getCois, getCoiStats } from "@/actions/coi";
import { CoiClient } from "./CoiClient";

export const metadata = {
  title: "Códigos de Operação Interna (COI) | Empório Agrobelém",
  description: "Padronização de entradas e saídas de estoque com regras contábeis, financeiras e fiscais (CFOP).",
};

export const dynamic = "force-dynamic";

export default async function CoiPage() {
  const [coisRes, stats] = await Promise.all([
    getCois(),
    getCoiStats(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
      <CoiClient
        initialCois={coisRes.cois || []}
        initialStats={stats}
      />
    </div>
  );
}

