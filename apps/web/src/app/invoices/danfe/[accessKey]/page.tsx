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
    // Se não encontrou no mock, monta objeto padrão com a chave fornecida
    const cleanKey = accessKey.replace(/\D/g, "");
    const nNF = cleanKey.length >= 34 ? cleanKey.substring(25, 34).replace(/^0+/, "") : "1001";
    invoice = {
      accessKey: cleanKey || "35261007526557000100550010000458921098234712",
      invoiceNum: nNF,
      series: "1",
      naturezaOp: "VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS",
      issueDate: new Date().toISOString(),
      supplierName: "FORNECEDOR DE MERCADORIAS S.A.",
      supplierCnpj: "07.526.557/0001-00",
      supplierIe: "112.345.678.900",
      supplierAddress: "Av. Industrial das Nações, 1500 - Distrito Industrial - São Paulo/SP",
      totalAmount: 1850.00,
      totalIcms: 333.00,
      statusManifest: "CONFIRMADA",
      manifestProtocolo: "135260098412345",
      manifestDate: new Date().toISOString(),
      xmlAvailable: true,
      imported: false,
      nsu: "000000000142981",
      itemsPreview: [
        { name: "PRODUTO COMERCIAL DE TESTE 01", quantity: 10, unit: "UN", unitCost: 85.00, totalCost: 850.00, barcode: "7891000123456", ncm: "22030000", cfop: "5102" },
        { name: "PRODUTO COMERCIAL DE TESTE 02", quantity: 20, unit: "UN", unitCost: 50.00, totalCost: 1000.00, barcode: "7891000123463", ncm: "22021000", cfop: "5102" },
      ]
    };
  }

  return <DanfePrintClient invoice={invoice} />;
}

