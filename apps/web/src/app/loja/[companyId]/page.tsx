import { getPublicCompany } from "@/actions/company";
import { notFound } from "next/navigation";
import { DigitalMenuClient, type DigitalMenuCompany } from "./DigitalMenuClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const { company } = await getPublicCompany(companyId);
  if (!company) return { title: "Loja não encontrada" };
  const tradeName = company.fiscalConfig?.tradeName || company.name;
  return {
    title: `${tradeName} — Cardápio Digital`,
    description: `Faça seu pedido online no cardápio digital de ${tradeName}.`,
  };
}

export default async function PublicStorePage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const { company, licenseIssue, digitalMenuDisabled } = await getPublicCompany(companyId);

  if (licenseIssue) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-sm space-y-3">
          <h1 className="text-xl font-black text-slate-900">Loja Temporariamente Indisponível</h1>
          <p className="text-sm text-slate-500">
            Este catálogo encontra-se temporariamente suspenso. Entre em contato diretamente com o estabelecimento.
          </p>
        </div>
      </div>
    );
  }

  if (!company) notFound();

  return (
    <DigitalMenuClient
      company={company as unknown as DigitalMenuCompany}
      digitalMenuDisabled={Boolean(digitalMenuDisabled)}
    />
  );
}
