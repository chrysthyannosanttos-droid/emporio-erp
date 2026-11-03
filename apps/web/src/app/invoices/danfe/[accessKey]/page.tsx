import { getRadarInvoices } from "@/actions/invoices";
import { notFound } from "next/navigation";
import DanfePrintClient from "./DanfePrintClient";

export default async function DanfePage({
  params
}: {
  params: Promise<{ accessKey: string }>;
}) {
  const { accessKey } = await params;
  const { invoices } = await getRadarInvoices();

  // Encontra a nota no radar ou gera dados a partir da chave
  let invoice = invoices.find(i => i.accessKey === accessKey);

  if (!invoice) {
    notFound();
  }

  return <DanfePrintClient invoice={invoice} />;
}

