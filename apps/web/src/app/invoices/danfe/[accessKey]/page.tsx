import { getRadarInvoices, type RadarInvoice } from "@/actions/invoices";
import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";
import { notFound } from "next/navigation";
import DanfePrintClient from "./DanfePrintClient";

export default async function DanfePage({
  params,
}: {
  params: Promise<{ accessKey: string }>;
}) {
  const { accessKey } = await params;
  const { invoices } = await getRadarInvoices();

  let invoice = invoices.find((i) => i.accessKey === accessKey);

  if (!invoice) {
    const session = await getSession();
    const dbInv = await prisma.invoice.findFirst({
      where: {
        accessKey,
        ...(session?.companyId ? { companyId: session.companyId } : {}),
      },
      include: {
        company: true,
        order: { include: { customer: true, items: { include: { product: true } } } },
      },
    });

    if (dbInv) {
      const fiscal = await prisma.fiscalConfig.findUnique({
        where: { companyId: dbInv.companyId },
      });
      const sale = await prisma.sale.findFirst({
        where: { invoiceId: dbInv.id, companyId: dbInv.companyId },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      const itemsSource = sale?.items || dbInv.order?.items || [];
      const totalAmount = sale
        ? Number(sale.total)
        : dbInv.order
        ? Number(dbInv.order.total)
        : 0;

      const mapped: RadarInvoice = {
        accessKey: dbInv.accessKey || accessKey,
        invoiceNum: dbInv.number || "0",
        series: dbInv.series || "1",
        naturezaOp: "VENDA DE MERCADORIA",
        issueDate: dbInv.createdAt.toISOString(),
        supplierName: fiscal?.companyName || dbInv.company?.name || "EMPORIO AGROBELEM LTDA",
        supplierCnpj: fiscal?.cnpj || dbInv.company?.document || "",
        supplierIe: fiscal?.ie || undefined,
        supplierAddress: [fiscal?.street, fiscal?.number, fiscal?.district, fiscal?.city, fiscal?.state]
          .filter(Boolean)
          .join(", "),
        totalAmount,
        statusManifest:
          dbInv.status === "AUTHORIZED" && !dbInv.errorMsg
            ? "CONFIRMADA"
            : dbInv.status === "CANCELED"
            ? "RECUSADA"
            : "AGUARDANDO_MANIFESTACAO",
        manifestJustificativa: dbInv.errorMsg || null,
        xmlAvailable: true,
        imported: false,
        nsu: dbInv.number || "0",
        itemsPreview: itemsSource.map((it: any) => ({
          name: it.product?.name || "PRODUTO",
          quantity: Number(it.quantity),
          unit: it.product?.unit || "UN",
          unitCost: Number(it.unitPrice),
          totalCost: Number(it.total || Number(it.quantity) * Number(it.unitPrice)),
          barcode: it.product?.barcode || null,
          ncm: it.product?.ncm || "21069090",
          cfop: it.product?.cfop || "5102",
        })),
      };
      invoice = mapped;
    }
  }

  if (!invoice) {
    notFound();
  }

  return <DanfePrintClient invoice={invoice} />;
}
