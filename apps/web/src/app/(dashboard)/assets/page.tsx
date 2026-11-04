import { getAssets, getAssetStats } from "@/actions/assets";
import { AssetsClient } from "./AssetsClient";

export const metadata = {
  title: "Ativo Imobilizado & Patrimônio | Empório Agrobelém",
  description: "Gestão patrimonial, tombamento com etiquetas QR Code, cálculo contábil de depreciação e manutenção.",
};

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const [assetsRes, stats] = await Promise.all([
    getAssets(),
    getAssetStats(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
      <AssetsClient
        initialAssets={assetsRes.assets || []}
        initialStats={stats}
      />
    </div>
  );
}

