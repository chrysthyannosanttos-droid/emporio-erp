"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { transmitSefazNfe4 } from "@/lib/sefazClient";

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

    // Generate standard 44-digit SEFAZ Access Key with real UF code (27 = AL) and Modulo-11 check digit (cDV)
    const ufMap: Record<string, string> = {
      AC: "12", AL: "27", AM: "13", AP: "16", BA: "29", CE: "23", DF: "53", ES: "32",
      GO: "52", MA: "21", MG: "31", MS: "50", MT: "51", PA: "15", PB: "25", PE: "26",
      PI: "22", PR: "41", RJ: "33", RN: "24", RO: "11", RR: "14", RS: "43", SC: "42",
      SE: "28", SP: "35", TO: "17",
    };
    const stateCode = ufMap[(fiscalConfig.state || "AL").toUpperCase()] || "27";
    const now = new Date();
    const dateCode = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const cnpjClean = fiscalConfig.cnpj.replace(/\D/g, "").padEnd(14, "0");
    const model = isNfce ? "65" : "55";
    const series = (isNfce ? fiscalConfig.nfceeSeries : fiscalConfig.nfeSeries).padStart(3, "0");
    const numberStr = String(invoiceNumber).padStart(9, "0");
    const tpEmis = "1";
    const cNF = String((invoiceNumber * 7919) % 100000000).padStart(8, "0");
    const key43 = `${stateCode}${dateCode}${cnpjClean}${model}${series}${numberStr}${tpEmis}${cNF}`;

    // Cálculo oficial Módulo 11 SEFAZ (cDV)
    let weight = 2;
    let sum = 0;
    for (let i = key43.length - 1; i >= 0; i--) {
      sum += parseInt(key43[i], 10) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const rem = sum % 11;
    const cDV = rem === 0 || rem === 1 ? 0 : 11 - rem;
    const key = `${key43}${cDV}`; // 44 caracteres oficiais SEFAZ

    // Transmissão direta via Certificado A1 mTLS para a SEFAZ-AL (SVRS)
    let sefazErrorMsg: string | null = null;
    try {
      const sefazRes = await transmitSefazNfe4({
        companyId,
        key,
        model: isNfce ? "65" : "55",
        series: isNfce ? fiscalConfig.nfceeSeries : fiscalConfig.nfeSeries,
        number: invoiceNumber,
        total: Number(sale.total),
        discount: Number(sale.discount || 0),
        paymentMethod: "MONEY",
        items: sale.items.map((it) => ({
          name: it.product?.name || "PRODUTO",
          barcode: it.product?.barcode,
          ncm: it.product?.ncm,
          cfop: it.product?.cfop,
          csosn: it.product?.csosn,
          unit: it.product?.unit,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
      });
      if (!sefazRes.authorized && sefazRes.cStat) {
        sefazErrorMsg = `SEFAZ (${sefazRes.cStat}): ${sefazRes.xMotivo}`;
      }
    } catch (sefazErr: any) {
      sefazErrorMsg = sefazErr.message || null;
    }

    // Create transaction to save Invoice and increment next invoice number
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Invoice record
      const invoice = await tx.invoice.create({
        data: {
          type,
          number: String(invoiceNumber),
          series: isNfce ? fiscalConfig!.nfceeSeries : fiscalConfig!.nfeSeries,
          accessKey: key,
          status: sefazErrorMsg ? "REJECTED" : "AUTHORIZED",
          environment: fiscalConfig!.environment,
          xmlUrl: `/api/fiscal/xml/${key}`,
          pdfUrl: `/api/fiscal/pdf/${key}`,
          errorMsg: sefazErrorMsg,
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
