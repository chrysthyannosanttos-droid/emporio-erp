import { getCompanyProductsByDecreto } from "@/actions/decretos";
import { DecretosClient } from "./DecretosClient";

export const metadata = {
  title: "Decretos de Alagoas & Consulta de NCM | Empório Agrobelém",
  description: "Consulta tributária atualizada de NCM, CEST e Decretos Estaduais da SEFAZ de Alagoas para produtos alimentícios.",
};

export const dynamic = "force-dynamic";

export default async function DecretosPage() {
  const { products } = await getCompanyProductsByDecreto();

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
      <DecretosClient initialProducts={products || []} />
    </div>
  );
}

