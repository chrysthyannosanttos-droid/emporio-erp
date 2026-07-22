"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function getInvoices() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado", invoices: [] };
    }

    const invoices = await prisma.invoice.findMany({
      where: { companyId: session.companyId },
      include: {
        order: {
          include: { customer: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Populate total and customer name from sale if order is null
    const populated = await Promise.all(invoices.map(async (invoice) => {
      let total = 0;
      let customerName = invoice.order?.customer?.name || "Consumidor Final";

      if (invoice.order) {
        total = Number(invoice.order.total);
      } else {
        const sale = await prisma.sale.findFirst({
          where: { invoiceId: invoice.id, companyId: session.companyId },
          include: { customer: true }
        });
        if (sale) {
          total = Number(sale.total);
          customerName = sale.customer?.name || "Consumidor Final";
        }
      }

      return {
        ...invoice,
        total,
        customerName
      };
    }));

    return { invoices: populated };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar notas fiscais", invoices: [] };
  }
}

export async function simulateInvoiceEmission(saleId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou não autorizada." };
    }

    const companyId = session.companyId;

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) return { error: "Empresa não encontrada" };

    // Fetch sale details
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, companyId: companyId },
      include: {
        items: { include: { product: true } },
        user: true
      }
    });

    if (!sale) return { error: "Venda não encontrada" };

    // Fetch or create fiscal configuration
    let fiscalConfig = await prisma.fiscalConfig.findUnique({
      where: { companyId: companyId }
    });

    if (!fiscalConfig) {
      fiscalConfig = await prisma.fiscalConfig.create({
        data: {
          cnpj: company.document,
          companyName: company.name,
          companyId: companyId,
          taxRegime: "SN",
          environment: "homologacao",
          nextNfceNumber: 1,
          nextNfeNumber: 1
        }
      });
    }

    // Determine type: if sale has no customer or total is small, make it NFC-e, else NF-e
    const isNfce = !sale.customerId || Number(sale.total) < 500;
    const type = isNfce ? "NFCe" : "NFe";
    
    const invoiceNumber = isNfce 
      ? fiscalConfig.nextNfceNumber 
      : fiscalConfig.nextNfeNumber;

    // Generate standard 44-digit mock SEFAZ Access Key
    const stateCode = "35"; // SP
    const dateCode = "2607"; // July 2026
    const cnpjClean = fiscalConfig.cnpj.replace(/\D/g, "").padEnd(14, "0");
    const model = isNfce ? "65" : "55";
    const series = isNfce ? fiscalConfig.nfceeSeries.padStart(3, "0") : fiscalConfig.nfeSeries.padStart(3, "0");
    const numberStr = String(invoiceNumber).padStart(9, "0");
    const key = `${stateCode}${dateCode}${cnpjClean}${model}${series}${numberStr}1000000001`; // 44 characters

    // Create transaction to save Invoice and increment next invoice number
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Invoice record
      const invoice = await tx.invoice.create({
        data: {
          type,
          number: String(invoiceNumber),
          series: isNfce ? fiscalConfig!.nfceeSeries : fiscalConfig!.nfeSeries,
          accessKey: key,
          status: "AUTHORIZED", // Mock authorized
          environment: fiscalConfig!.environment,
          xmlUrl: `/api/fiscal/xml/${key}`,
          pdfUrl: `/api/fiscal/pdf/${key}`,
          companyId: companyId,
          orderId: sale.orderId
        }
      });

      // 2. Link invoice to the sale
      await tx.sale.update({
        where: { id: saleId },
        data: { invoiceId: invoice.id }
      });

      // 3. Increment sequence number
      await tx.fiscalConfig.update({
        where: { id: fiscalConfig!.id },
        data: isNfce 
          ? { nextNfceNumber: { increment: 1 } }
          : { nextNfeNumber: { increment: 1 } }
      });

      return invoice;
    });

    revalidatePath("/fiscal");
    return { success: true, invoice: result };
  } catch (err: any) {
    return { error: err.message || "Erro ao emitir nota fiscal" };
  }
}

export async function cancelInvoice(invoiceId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: session.companyId }
    });
    if (!invoice) return { error: "Nota fiscal não encontrada" };

    if (invoice.status === "CANCELED") return { error: "Nota já se encontra cancelada" };

    const result = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "CANCELED" }
    });

    revalidatePath("/fiscal");
    return { success: true, invoice: result };
  } catch (err: any) {
    return { error: err.message || "Erro ao cancelar nota fiscal" };
  }
}
