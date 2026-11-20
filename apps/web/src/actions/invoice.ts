"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  transmitSefazNfe4,
  querySefazProtocolo,
  cancelSefazNfe4,
  sendSefazCartaCorrecao,
  inutilizarSefazNumeracao,
} from "@/lib/sefazClient";

function buildSefazAccessKey(params: {
  state?: string | null;
  cnpj: string;
  model: "65" | "55";
  series: string;
  invoiceNumber: number;
}) {
  const ufMap: Record<string, string> = {
    AC: "12", AL: "27", AM: "13", AP: "16", BA: "29", CE: "23", DF: "53", ES: "32",
    GO: "52", MA: "21", MG: "31", MS: "50", MT: "51", PA: "15", PB: "25", PE: "26",
    PI: "22", PR: "41", RJ: "33", RN: "24", RO: "11", RR: "14", RS: "43", SC: "42",
    SE: "28", SP: "35", TO: "17",
  };
  const stateCode = ufMap[(params.state || "AL").toUpperCase()] || "27";
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const dateCode = `${String(now.getUTCFullYear()).slice(-2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const cnpjClean = params.cnpj.replace(/\D/g, "").padEnd(14, "0").slice(0, 14);
  const seriesStr = String(Number(params.series || "1")).padStart(3, "0");
  const numberStr = String(params.invoiceNumber).padStart(9, "0");
  const tpEmis = "1";
  const cNF = String(((params.invoiceNumber * 7919) + 104729) % 100000000).padStart(8, "0");
  const key43 = `${stateCode}${dateCode}${cnpjClean}${params.model}${seriesStr}${numberStr}${tpEmis}${cNF}`;

  let weight = 2;
  let sum = 0;
  for (let i = key43.length - 1; i >= 0; i--) {
    sum += parseInt(key43[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rem = sum % 11;
  const cDV = rem === 0 || rem === 1 ? 0 : 11 - rem;
  return `${key43}${cDV}`;
}

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
          include: { customer: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const invoiceIds = invoices.map((i) => i.id);
    const sales = await prisma.sale.findMany({
      where: {
        companyId: session.companyId,
        invoiceId: { in: invoiceIds },
      },
      include: {
        customer: true,
        payments: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                ncm: true,
                cfop: true,
                csosn: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    const saleByInvoiceId = new Map(sales.map((s) => [s.invoiceId!, s]));

    const populated = invoices.map((invoice) => {
      const sale = saleByInvoiceId.get(invoice.id);
      let total = 0;
      let discount = 0;
      let customerName = invoice.order?.customer?.name || "Consumidor Final";
      let customerCpf = invoice.order?.customer?.document || "";

      if (sale) {
        total = Number(sale.total);
        discount = Number(sale.discount || 0);
        customerName = sale.customer?.name || customerName;
        customerCpf = sale.customer?.document || customerCpf;
      } else if (invoice.order) {
        total = Number(invoice.order.total);
      }

      const sefazAuthorized = invoice.status === "AUTHORIZED" && !invoice.errorMsg;
      const effectiveStatus =
        invoice.status === "CANCELED"
          ? "CANCELED"
          : sefazAuthorized
          ? "AUTHORIZED"
          : "REJECTED";

      return {
        ...invoice,
        effectiveStatus,
        sefazAuthorized,
        total,
        discount,
        customerName,
        customerCpf,
        saleId: sale?.id || null,
        paymentMethod: sale?.payments?.[0]?.paymentMethod || "MONEY",
        items: (sale?.items || []).map((it) => ({
          id: it.id,
          productId: it.productId,
          name: it.product?.name || "PRODUTO",
          barcode: it.product?.barcode || "",
          ncm: it.product?.ncm || "21069090",
          cfop: it.product?.cfop || "5102",
          csosn: it.product?.csosn || "102",
          unit: it.product?.unit || "UN",
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          total: Number(it.total),
        })),
      };
    });

    return { invoices: populated };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar notas fiscais", invoices: [] };
  }
}

export async function simulateInvoiceEmission(
  saleId: string,
  options?: { forceReissue?: boolean }
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Sessão inválida ou não autorizada." };
    }

    const companyId = session.companyId;
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return { error: "Empresa não encontrada" };

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, companyId },
      include: {
        items: { include: { product: true } },
        payments: true,
        customer: true,
        user: true,
      },
    });
    if (!sale) return { error: "Venda não encontrada" };

    // Proteção contra duplicidade de nota na mesma venda
    if (sale.invoiceId && !options?.forceReissue) {
      const existingInvoice = await prisma.invoice.findFirst({
        where: { id: sale.invoiceId, companyId },
      });
      if (existingInvoice && existingInvoice.status !== "CANCELED") {
        return { success: true, invoice: existingInvoice, deduplicated: true };
      }
    }

    // Reserva atomicamente o número da nota ANTES de chamar a SEFAZ para evitar corrida entre caixas/cliques
    const isNfce = !sale.customerId || Number(sale.total) < 500;
    const reserved = await prisma.$transaction(async (tx) => {
      let cfg = await tx.fiscalConfig.findUnique({ where: { companyId } });
      if (!cfg) {
        cfg = await tx.fiscalConfig.create({
          data: {
            cnpj: company.document,
            companyName: company.name,
            companyId,
            taxRegime: "SN",
            environment: "homologacao",
            nextNfceNumber: 1,
            nextNfeNumber: 1,
          },
        });
      }
      const updatedCfg = await tx.fiscalConfig.update({
        where: { id: cfg.id },
        data: isNfce
          ? { nextNfceNumber: { increment: 1 } }
          : { nextNfeNumber: { increment: 1 } },
      });
      const reservedNumber = isNfce
        ? updatedCfg.nextNfceNumber - 1
        : updatedCfg.nextNfeNumber - 1;
      return { fiscalConfig: updatedCfg, reservedNumber };
    });

    const fiscalConfig = reserved.fiscalConfig;
    const type = isNfce ? "NFCe" : "NFe";
    const model: "65" | "55" = isNfce ? "65" : "55";
    const invoiceNumber = reserved.reservedNumber;
    const series = isNfce ? fiscalConfig.nfceeSeries : fiscalConfig.nfeSeries;

    const key = buildSefazAccessKey({
      state: fiscalConfig.state,
      cnpj: fiscalConfig.cnpj,
      model,
      series,
      invoiceNumber,
    });

    let sefazErrorMsg: string | null = null;
    try {
      const sefazRes = await transmitSefazNfe4({
        companyId,
        key,
        model,
        series,
        number: invoiceNumber,
        total: Number(sale.total),
        discount: Number(sale.discount || 0),
        paymentMethod: sale.payments?.[0]?.paymentMethod || "MONEY",
        customerCpf: sale.customer?.document || null,
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
      if (!sefazRes.authorized) {
        sefazErrorMsg = sefazRes.cStat
          ? `SEFAZ (${sefazRes.cStat}): ${sefazRes.xMotivo}`
          : "SEFAZ não autorizou a nota.";
      }
    } catch (sefazErr: any) {
      sefazErrorMsg = sefazErr.message || "Falha de comunicação com a SEFAZ";
    }

    const result = await prisma.$transaction(async (tx) => {
      const freshSale = await tx.sale.findUnique({
        where: { id: saleId },
        select: { invoiceId: true },
      });
      if (freshSale?.invoiceId && !options?.forceReissue) {
        const already = await tx.invoice.findUnique({
          where: { id: freshSale.invoiceId },
        });
        if (already && already.status !== "CANCELED") {
          return already;
        }
      }

      const invoice = await tx.invoice.create({
        data: {
          type,
          number: String(invoiceNumber),
          series,
          accessKey: key,
          status: sefazErrorMsg ? "REJECTED" : "AUTHORIZED",
          environment: fiscalConfig.environment,
          xmlUrl: `/api/fiscal/xml/${key}`,
          pdfUrl: `/api/fiscal/pdf/${key}`,
          errorMsg: sefazErrorMsg,
          companyId,
          orderId: sale.orderId,
        },
      });

      await tx.sale.update({
        where: { id: saleId },
        data: { invoiceId: invoice.id },
      });

      return invoice;
    });

    revalidatePath("/fiscal");
    return { success: true, invoice: result };
  } catch (err: any) {
    return { error: err.message || "Erro ao emitir nota fiscal" };
  }
}

/**
 * Retransmite uma nota pendente/rejeitada diretamente para a SEFAZ-AL (SVRS) em tempo real.
 */
export async function retransmitInvoiceAction(invoiceId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { ok: false, error: "Não autorizado." };
    }
    const companyId = session.companyId;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
    });
    if (!invoice) return { ok: false, error: "Nota fiscal não encontrada." };
    if (invoice.status === "CANCELED") {
      return { ok: false, error: "Nota já cancelada na SEFAZ." };
    }

    const fiscalConfig = await prisma.fiscalConfig.findUnique({ where: { companyId } });
    if (!fiscalConfig) {
      return { ok: false, error: "Configuração fiscal da empresa não encontrada." };
    }

    const model: "65" | "55" = invoice.type === "NFe" ? "55" : "65";

    // 1. Consulta antes na SEFAZ se essa chave já está autorizada (evita duplicidade)
    if (invoice.accessKey && invoice.accessKey.length === 44) {
      try {
        const existingCheck = await querySefazProtocolo(companyId, invoice.accessKey, model);
        if (existingCheck.authorized) {
          const updated = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              status: "AUTHORIZED",
              errorMsg: null,
              environment: fiscalConfig.environment,
            },
          });
          revalidatePath("/fiscal");
          return {
            ok: true,
            cStat: existingCheck.cStat,
            xMotivo: existingCheck.xMotivo,
            nProt: existingCheck.nProt,
            invoice: updated,
          };
        }
        if (existingCheck.canceled) {
          const updated = await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: "CANCELED", errorMsg: null },
          });
          revalidatePath("/fiscal");
          return {
            ok: false,
            cStat: existingCheck.cStat,
            xMotivo: `Nota já consta como Cancelada na SEFAZ (${existingCheck.xMotivo})`,
            invoice: updated,
          };
        }
      } catch {
        // segue para tentativa de transmissão
      }
    }

    // 2. Busca a venda vinculada com itens e produtos
    const sale = await prisma.sale.findFirst({
      where: { invoiceId: invoice.id, companyId },
      include: {
        items: { include: { product: true } },
        payments: true,
        customer: true,
      },
    });

    if (!sale || sale.items.length === 0) {
      return {
        ok: false,
        error: "Esta nota não possui venda/itens vinculados no sistema para montar o XML oficial.",
      };
    }

    const isNfce = model === "65";
    const series = invoice.series || (isNfce ? fiscalConfig.nfceeSeries : fiscalConfig.nfeSeries);
    let invoiceNumber = Number(invoice.number || (isNfce ? fiscalConfig.nextNfceNumber : fiscalConfig.nextNfeNumber));

    let key = buildSefazAccessKey({
      state: fiscalConfig.state,
      cnpj: fiscalConfig.cnpj,
      model,
      series,
      invoiceNumber,
    });

    const buildTransmitPayload = (num: number, accessKey: string) => ({
      companyId,
      key: accessKey,
      model,
      series,
      number: num,
      total: Number(sale.total),
      discount: Number(sale.discount || 0),
      paymentMethod: sale.payments?.[0]?.paymentMethod || "MONEY",
      customerCpf: sale.customer?.document || null,
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

    let sefazRes = await transmitSefazNfe4(buildTransmitPayload(invoiceNumber, key));

    // Se a SEFAZ acusar Duplicidade (204 ou 539), avança para o próximo número oficial da sequência e reenvia
    if (!sefazRes.authorized && ["204", "539"].includes(sefazRes.cStat)) {
      const nextNum = isNfce ? fiscalConfig.nextNfceNumber : fiscalConfig.nextNfeNumber;
      if (nextNum > invoiceNumber) {
        invoiceNumber = nextNum;
      } else {
        invoiceNumber = invoiceNumber + 1;
      }
      key = buildSefazAccessKey({
        state: fiscalConfig.state,
        cnpj: fiscalConfig.cnpj,
        model,
        series,
        invoiceNumber,
      });
      sefazRes = await transmitSefazNfe4(buildTransmitPayload(invoiceNumber, key));
      await prisma.fiscalConfig.update({
        where: { id: fiscalConfig.id },
        data: isNfce
          ? { nextNfceNumber: invoiceNumber + 1 }
          : { nextNfeNumber: invoiceNumber + 1 },
      });
    }

    const errorMsg = sefazRes.authorized
      ? null
      : sefazRes.cStat
      ? `SEFAZ (${sefazRes.cStat}): ${sefazRes.xMotivo}`
      : sefazRes.xMotivo || "SEFAZ não autorizou a nota.";

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        number: String(invoiceNumber),
        series,
        accessKey: key,
        status: sefazRes.authorized ? "AUTHORIZED" : "REJECTED",
        environment: fiscalConfig.environment,
        xmlUrl: `/api/fiscal/xml/${key}`,
        pdfUrl: `/api/fiscal/pdf/${key}`,
        errorMsg,
      },
    });

    revalidatePath("/fiscal");
    return {
      ok: sefazRes.authorized,
      cStat: sefazRes.cStat,
      xMotivo: sefazRes.xMotivo,
      nProt: sefazRes.nProt,
      error: errorMsg || undefined,
      invoice: updated,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Erro ao retransmitir nota para a SEFAZ." };
  }
}

/**
 * Consulta situação real da chave na SEFAZ-AL e sincroniza com o banco local
 */
export async function consultarSefazInvoiceAction(invoiceId: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { ok: false, error: "Não autorizado." };

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: session.companyId },
    });
    if (!invoice || !invoice.accessKey) {
      return { ok: false, error: "Nota ou chave de acesso não encontrada." };
    }

    const model: "65" | "55" = invoice.type === "NFe" ? "55" : "65";
    const res = await querySefazProtocolo(session.companyId, invoice.accessKey, model);

    let nextStatus = invoice.status;
    let nextError = invoice.errorMsg;

    if (res.authorized) {
      nextStatus = "AUTHORIZED";
      nextError = null;
    } else if (res.canceled) {
      nextStatus = "CANCELED";
      nextError = null;
    } else if (res.notFound) {
      nextStatus = "REJECTED";
      nextError = `SEFAZ (217): ${res.xMotivo}`;
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: nextStatus, errorMsg: nextError },
    });

    revalidatePath("/fiscal");
    return {
      ok: res.ok,
      authorized: res.authorized,
      canceled: res.canceled,
      notFound: res.notFound,
      cStat: res.cStat,
      xMotivo: res.xMotivo,
      nProt: res.nProt,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Erro ao consultar SEFAZ." };
  }
}

/**
 * Edita itens/dados fiscais (NCM, CFOP, CSOSN, nome, qtd, preço) de uma nota NÃO autorizada
 */
export async function updateRejectedInvoiceAction(
  invoiceId: string,
  payload: {
    discount?: number;
    items: Array<{
      saleItemId: string;
      productId: string;
      name: string;
      ncm: string;
      cfop: string;
      csosn: string;
      unit: string;
      quantity: number;
      unitPrice: number;
    }>;
  }
) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { ok: false, error: "Não autorizado." };
    const companyId = session.companyId;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
    });
    if (!invoice) return { ok: false, error: "Nota não encontrada." };

    if (invoice.status === "AUTHORIZED" && !invoice.errorMsg) {
      return {
        ok: false,
        error: "Nota já autorizada pela SEFAZ não pode ter itens ou valores alterados. Use Carta de Correção (NF-e 55) ou Cancelamento.",
      };
    }

    const sale = await prisma.sale.findFirst({
      where: { invoiceId: invoice.id, companyId },
    });
    if (!sale) {
      return { ok: false, error: "Nenhuma venda vinculada para editar os itens." };
    }

    await prisma.$transaction(async (tx) => {
      let newSubtotal = 0;
      for (const item of payload.items) {
        const cleanNcm = item.ncm.replace(/\D/g, "").slice(0, 8) || "21069090";
        const cleanCfop = item.cfop.replace(/\D/g, "").slice(0, 4) || "5102";
        const cleanCsosn = item.csosn.replace(/\D/g, "").slice(0, 3) || "102";
        const itemTotal = Number((item.quantity * item.unitPrice).toFixed(2));
        newSubtotal = Number((newSubtotal + itemTotal).toFixed(2));

        await tx.product.updateMany({
          where: { id: item.productId, companyId },
          data: {
            name: item.name.trim(),
            ncm: cleanNcm,
            cfop: cleanCfop,
            csosn: cleanCsosn,
            unit: (item.unit || "UN").trim().slice(0, 6),
          },
        });

        await tx.saleItem.update({
          where: { id: item.saleItemId },
          data: {
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: itemTotal,
          },
        });
      }

      const discount = Math.max(0, Number((payload.discount ?? Number(sale.discount || 0)).toFixed(2)));
      const newTotal = Math.max(0, Number((newSubtotal - discount).toFixed(2)));

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          subtotal: newSubtotal,
          discount,
          total: newTotal,
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "REJECTED",
          errorMsg: "Editada localmente — aguardando retransmissão para SEFAZ.",
        },
      });
    });

    revalidatePath("/fiscal");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Erro ao salvar edição da nota." };
  }
}

/**
 * Envia Carta de Correção Eletrônica (CC-e 110110) oficial na SEFAZ para NF-e (55) autorizada
 */
export async function sendCartaCorrecaoAction(invoiceId: string, correctionText: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { ok: false, error: "Não autorizado." };

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: session.companyId },
    });
    if (!invoice || !invoice.accessKey) {
      return { ok: false, error: "Nota ou chave de acesso não encontrada." };
    }
    if (invoice.status !== "AUTHORIZED" || invoice.errorMsg) {
      return { ok: false, error: "Apenas notas já autorizadas na SEFAZ podem receber Carta de Correção." };
    }

    const model: "65" | "55" = invoice.type === "NFe" ? "55" : "65";
    const res = await sendSefazCartaCorrecao(session.companyId, {
      accessKey: invoice.accessKey,
      model,
      correctionText,
    });

    if (!res.ok) {
      return { ok: false, error: `SEFAZ (${res.cStat}): ${res.xMotivo}` };
    }

    revalidatePath("/fiscal");
    return { ok: true, cStat: res.cStat, xMotivo: res.xMotivo, nProt: res.nProt };
  } catch (err: any) {
    return { ok: false, error: err.message || "Erro ao enviar Carta de Correção na SEFAZ." };
  }
}

/**
 * Cancela a nota OFICIALMENTE na SEFAZ-AL (Evento 110111). Só grava CANCELED se a SEFAZ homologar.
 */
export async function cancelInvoice(invoiceId: string, justification = "Cancelamento solicitado por erro operacional no caixa.") {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return { error: "Não autorizado" };
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: session.companyId },
    });
    if (!invoice) return { error: "Nota fiscal não encontrada" };
    if (invoice.status === "CANCELED") return { error: "Nota já se encontra cancelada" };
    if (!invoice.accessKey) return { error: "Chave de acesso ausente para cancelamento na SEFAZ." };

    const model: "65" | "55" = invoice.type === "NFe" ? "55" : "65";
    const sefazRes = await cancelSefazNfe4(session.companyId, {
      accessKey: invoice.accessKey,
      model,
      justification,
    });

    if (!sefazRes.ok) {
      return {
        error: `SEFAZ (${sefazRes.cStat}): ${sefazRes.xMotivo}`,
        notFoundOnSefaz: (sefazRes as any).notFoundOnSefaz || false,
      };
    }

    const result = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "CANCELED", errorMsg: null },
    });

    revalidatePath("/fiscal");
    return {
      success: true,
      cStat: sefazRes.cStat,
      xMotivo: sefazRes.xMotivo,
      nProt: sefazRes.nProt,
      invoice: result,
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao cancelar nota fiscal na SEFAZ" };
  }
}

/**
 * Exclui uma nota NÃO autorizada inutilizando oficialmente o número na SEFAZ-AL (NfeInutilizacao4).
 */
export async function inutilizarAndDeleteInvoiceAction(invoiceId: string, justification: string) {
  try {
    const session = await getSession();
    if (!session?.companyId) return { ok: false, error: "Não autorizado." };
    const companyId = session.companyId;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
    });
    if (!invoice) return { ok: false, error: "Nota fiscal não encontrada." };

    const model: "65" | "55" = invoice.type === "NFe" ? "55" : "65";

    // Verifica na SEFAZ se por acaso a nota já está autorizada (se sim, não pode inutilizar!)
    if (invoice.accessKey && invoice.accessKey.length === 44) {
      const check = await querySefazProtocolo(companyId, invoice.accessKey, model).catch(() => null);
      if (check?.authorized) {
        return {
          ok: false,
          error: "Esta nota já está AUTORIZADA na SEFAZ (cStat 100). Pela legislação fiscal ela não pode ser excluída/inutilizada — utilize o Cancelamento Oficial.",
        };
      }
    }

    const num = Number(invoice.number || 0);
    if (!num) {
      return { ok: false, error: "Número da nota inválido para inutilização na SEFAZ." };
    }

    const inutRes = await inutilizarSefazNumeracao(companyId, {
      model,
      series: invoice.series || "1",
      startNumber: num,
      endNumber: num,
      year: String(new Date(invoice.createdAt).getFullYear()),
      justification,
    });

    if (!inutRes.ok) {
      return { ok: false, error: `SEFAZ (${inutRes.cStat}): ${inutRes.xMotivo}` };
    }

    await prisma.$transaction(async (tx) => {
      await tx.sale.updateMany({
        where: { invoiceId: invoice.id, companyId },
        data: { invoiceId: null },
      });
      await tx.invoice.delete({
        where: { id: invoice.id },
      });
    });

    revalidatePath("/fiscal");
    return {
      ok: true,
      cStat: inutRes.cStat,
      xMotivo: inutRes.xMotivo,
      nProt: inutRes.nProt,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Erro ao inutilizar/excluir nota na SEFAZ." };
  }
}

/**
 * Remove notas fiscais duplicadas NÃO autorizadas (preserva 100% das notas AUTHORIZED e CANCELED).
 */
export async function cleanupDuplicateInvoicesAction() {
  try {
    const session = await getSession();
    if (!session?.companyId) return { ok: false, error: "Não autorizado." };
    const companyId = session.companyId;

    const invoices = await prisma.invoice.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    const salesWithInvoice = await prisma.sale.findMany({
      where: { companyId, invoiceId: { not: null } },
      select: { id: true, invoiceId: true },
    });
    const invoiceIdsWithSale = new Set(
      salesWithInvoice.map((s) => s.invoiceId).filter(Boolean) as string[]
    );

    const duplicateIds = new Set<string>();
    const replacementByDeletedId = new Map<string, string>();
    const isProtected = (inv: { status: string; errorMsg: string | null }) =>
      (inv.status === "AUTHORIZED" && !inv.errorMsg) || inv.status === "CANCELED";

    const processGroup = (group: typeof invoices) => {
      if (group.length <= 1) return;
      const protectedInv = group.find(isProtected);
      // Se não há nota autorizada/cancelada, prioriza manter a que tem venda vinculada (e mais recente)
      const keeper =
        protectedInv ||
        group.find((inv) => !duplicateIds.has(inv.id) && invoiceIdsWithSale.has(inv.id)) ||
        group.find((inv) => !duplicateIds.has(inv.id));

      if (!keeper) return;
      for (const inv of group) {
        if (inv.id === keeper.id || isProtected(inv)) continue;
        duplicateIds.add(inv.id);
        replacementByDeletedId.set(inv.id, keeper.id);
      }
    };

    // 1. Duplicadas pelo mesmo orderId
    const byOrder = new Map<string, typeof invoices>();
    for (const inv of invoices) {
      if (!inv.orderId) continue;
      const list = byOrder.get(inv.orderId) || [];
      list.push(inv);
      byOrder.set(inv.orderId, list);
    }
    for (const group of byOrder.values()) processGroup(group);

    // 2. Duplicadas pelo mesmo (type, series, number)
    const byNumber = new Map<string, typeof invoices>();
    for (const inv of invoices) {
      if (duplicateIds.has(inv.id)) continue;
      const num = (inv.number || "").trim();
      if (!num) continue;
      const key = `${inv.type}::${inv.series || "1"}::${num}`;
      const list = byNumber.get(key) || [];
      list.push(inv);
      byNumber.set(key, list);
    }
    for (const group of byNumber.values()) processGroup(group);

    // 3. Notas pendentes/rejeitadas duplicadas pela mesma accessKey
    const byKey = new Map<string, typeof invoices>();
    for (const inv of invoices) {
      if (duplicateIds.has(inv.id)) continue;
      const ak = (inv.accessKey || "").trim();
      if (!ak) continue;
      const list = byKey.get(ak) || [];
      list.push(inv);
      byKey.set(ak, list);
    }
    for (const group of byKey.values()) processGroup(group);

    const idsToDelete = Array.from(duplicateIds);
    if (idsToDelete.length === 0) {
      return { ok: true, removedCount: 0, message: "Nenhuma nota duplicada encontrada." };
    }

    await prisma.$transaction(async (tx) => {
      // Se alguma venda apontava para uma nota removida e a nota que ficou ainda não tem venda, religa
      for (const sale of salesWithInvoice) {
        if (!sale.invoiceId || !duplicateIds.has(sale.invoiceId)) continue;
        const keeperId = replacementByDeletedId.get(sale.invoiceId);
        if (keeperId && !invoiceIdsWithSale.has(keeperId)) {
          await tx.sale.update({
            where: { id: sale.id },
            data: { invoiceId: keeperId },
          });
          invoiceIdsWithSale.add(keeperId);
        } else {
          await tx.sale.update({
            where: { id: sale.id },
            data: { invoiceId: null },
          });
        }
      }
      await tx.return.updateMany({
        where: { invoiceId: { in: idsToDelete } },
        data: { invoiceId: null },
      });
      await tx.invoice.deleteMany({
        where: { companyId, id: { in: idsToDelete } },
      });
    });

    revalidatePath("/fiscal");
    return {
      ok: true,
      removedCount: idsToDelete.length,
      message: `${idsToDelete.length} nota(s) duplicada(s) excluída(s) com segurança.`,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Erro ao excluir notas duplicadas." };
  }
}

/**
 * Cancela / inutiliza na SEFAZ todas as notas pendentes/rejeitadas zeradas (R$ 0,00) ou sem venda/itens vinculados.
 */
export async function cancelZeroValueInvoicesAction() {
  try {
    const session = await getSession();
    if (!session?.companyId) return { ok: false, error: "Não autorizado." };
    const companyId = session.companyId;

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: { notIn: ["AUTHORIZED", "CANCELED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (invoices.length === 0) {
      return { ok: true, resolvedCount: 0, message: "Nenhuma nota pendente/rejeitada encontrada." };
    }

    const invoiceIds = invoices.map((i) => i.id);
    const sales = await prisma.sale.findMany({
      where: { companyId, invoiceId: { in: invoiceIds } },
      include: { items: { select: { id: true } } },
    });
    const saleByInv = new Map(sales.map((s) => [s.invoiceId!, s]));

    const zeroInvoices = invoices.filter((inv) => {
      const s = saleByInv.get(inv.id);
      if (!s) return true;
      if (!s.items || s.items.length === 0) return true;
      return Number(s.total || 0) <= 0;
    });

    if (zeroInvoices.length === 0) {
      return { ok: true, resolvedCount: 0, message: "Nenhuma nota zerada ou sem itens encontrada." };
    }

    let sefazInutilizadas = 0;
    let canceledLocal = 0;

    for (const inv of zeroInvoices) {
      const model: "65" | "55" = inv.type === "NFe" ? "55" : "65";
      const num = Number(inv.number || 0);

      // Se por acaso já foi autorizada na SEFAZ, apenas sincroniza para AUTHORIZED
      if (inv.accessKey && inv.accessKey.length === 44) {
        const check = await querySefazProtocolo(companyId, inv.accessKey, model).catch(() => null);
        if (check?.authorized) {
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { status: "AUTHORIZED", errorMsg: null },
          });
          continue;
        }
      }

      if (num > 0) {
        const inutRes = await inutilizarSefazNumeracao(companyId, {
          model,
          series: inv.series || "1",
          startNumber: num,
          endNumber: num,
          year: String(new Date(inv.createdAt).getFullYear()),
          justification: "Inutilizacao de numeracao de nota zerada ou sem venda vinculada.",
        }).catch(() => null);

        if (inutRes?.ok || ["102", "206", "563"].includes(String(inutRes?.cStat || ""))) {
          sefazInutilizadas++;
        }
      }

      await prisma.invoice.update({
        where: { id: inv.id },
        data: {
          status: "CANCELED",
          errorMsg: null,
        },
      });
      canceledLocal++;
    }

    revalidatePath("/fiscal");
    return {
      ok: true,
      resolvedCount: canceledLocal,
      sefazInutilizadas,
      message: `${canceledLocal} nota(s) zerada(s)/sem itens cancelada(s) (${sefazInutilizadas} inutilizada(s) na SEFAZ).`,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao cancelar notas zeradas." };
  }
}

function inferCorrectNcmFromName(name: string): string {
  const n = (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (n.includes("cafe")) return "09012100";
  if (n.includes("acucar")) return "17019900";
  if (n.includes("arroz")) return "10063021";
  if (n.includes("feijao")) return "07133319";
  if (n.includes("macarrao") || n.includes("espaguete") || n.includes("massa")) return "19021900";
  if (n.includes("farinha") && n.includes("mandioca")) return "11062000";
  if (n.includes("farinha") || n.includes("trigo") || n.includes("fuba") || n.includes("cuscuz") || n.includes("flocao")) return "11010010";
  if (n.includes("leite") && n.includes("po")) return "04022110";
  if (n.includes("leite") && n.includes("condensado")) return "04029900";
  if (n.includes("leite")) return "04012010";
  if (n.includes("creme de leite")) return "04014029";
  if (n.includes("manteiga")) return "04051000";
  if (n.includes("margarina")) return "15171000";
  if (n.includes("queijo") || n.includes("mussarela") || n.includes("coalho") || n.includes("requeijao")) return "04069090";
  if (n.includes("iogurte")) return "04031000";
  if (n.includes("ovo")) return "04072100";
  if (n.includes("bacon") || n.includes("calabresa") || n.includes("linguica") || n.includes("salsicha") || n.includes("mortadela") || n.includes("presunto")) return "16010000";
  if (n.includes("frango") || n.includes("peito") || n.includes("coxa")) return "02071400";
  if (n.includes("carne") || n.includes("picanha") || n.includes("alcatra") || n.includes("charque") || n.includes("boi")) return "02023000";
  if (n.includes("oleo")) return "15079011";
  if (n.includes("azeite")) return "15091000";
  if (n.includes("sal ")) return "25010020";
  if (n.includes("paprica") || n.includes("lemon pepper") || n.includes("chimichurri") || n.includes("acafrao") || n.includes("curcuma") || n.includes("tempero") || n.includes("oregano") || n.includes("pimenta") || n.includes("cominho") || n.includes("colorau")) return "09109900";
  if (n.includes("alho")) return "07032090";
  if (n.includes("cebola")) return "07031019";
  if (n.includes("alface") || n.includes("tomate") || n.includes("batata") || n.includes("verdura")) return "07051100";
  if (n.includes("banana") || n.includes("maca") || n.includes("laranja") || n.includes("limao") || n.includes("fruta")) return "08039000";
  if (n.includes("rapadura") || n.includes("bananada") || n.includes("goiabada") || n.includes("cocada") || n.includes("doce") || n.includes("bala") || n.includes("chiclete") || n.includes("pirulito")) return "17049090";
  if (n.includes("chocolate") || n.includes("cacau") || n.includes("achocolatado")) return "18069000";
  if (n.includes("biscoito") || n.includes("bolacha") || n.includes("wafer") || n.includes("torrada")) return "19053100";
  if (n.includes("pao") || n.includes("bolo") || n.includes("salgado")) return "19059090";
  if (n.includes("agua")) return "22011000";
  if (n.includes("refrigerante") || n.includes("coca") || n.includes("guarana") || n.includes("fanta") || n.includes("sprite") || n.includes("suco") || n.includes("energetico") || n.includes("red bull")) return "22021000";
  if (n.includes("cerveja") || n.includes("heineken") || n.includes("brahma") || n.includes("skol") || n.includes("amstel")) return "22030000";
  if (n.includes("vinho")) return "22042100";
  if (n.includes("cachaca") || n.includes("whisky") || n.includes("vodka") || n.includes("gin")) return "22084000";
  if (n.includes("sabao") || n.includes("detergente") || n.includes("amaciante") || n.includes("desinfetante")) return "34022000";
  if (n.includes("papel higienico") || n.includes("papel toalha") || n.includes("guardanapo")) return "48181000";
  if (n.includes("racao")) return "23099010";
  if (n.includes("barra proteina") || n.includes("whey") || n.includes("suplemento")) return "21069030";
  return "21069090";
}

/**
 * Verifica e corrige NCM, CFOP e CSOSN dos produtos vinculados às notas pendentes/rejeitadas.
 */
export async function autoFixPendingInvoicesNcmAction() {
  try {
    const session = await getSession();
    if (!session?.companyId) return { ok: false, error: "Não autorizado." };
    const companyId = session.companyId;

    const pendingInvoices = await prisma.invoice.findMany({
      where: { companyId, status: { notIn: ["AUTHORIZED", "CANCELED"] } },
      select: { id: true },
    });

    if (pendingInvoices.length === 0) {
      return { ok: true, updatedProducts: 0, message: "Nenhuma nota pendente/rejeitada para revisar NCM." };
    }

    const sales = await prisma.sale.findMany({
      where: { companyId, invoiceId: { in: pendingInvoices.map((i) => i.id) } },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    // Mapa de NCMs reais vindos dos XMLs de fornecedores (por EAN)
    const xmlNcmByBarcode = new Map<string, string>();
    try {
      const { getRadarInvoices } = await import("./invoices");
      const radar = await getRadarInvoices();
      for (const inv of radar.invoices || []) {
        for (const it of inv.itemsPreview || []) {
          const bc = (it.barcode || "").replace(/\D/g, "");
          const ncm = (it.ncm || "").replace(/\D/g, "");
          if (bc.length >= 8 && ncm.length === 8 && ncm !== "00000000") {
            xmlNcmByBarcode.set(bc, ncm);
          }
        }
      }
    } catch {}

    const checkedProductIds = new Set<string>();
    let updatedProducts = 0;

    for (const sale of sales) {
      for (const it of sale.items) {
        const p = it.product;
        if (!p || checkedProductIds.has(p.id)) continue;
        checkedProductIds.add(p.id);

        const currentNcm = (p.ncm || "").replace(/\D/g, "");
        const bcClean = (p.barcode || "").replace(/\D/g, "");
        const xmlNcm = bcClean ? xmlNcmByBarcode.get(bcClean) : undefined;

        let targetNcm = currentNcm;
        if (xmlNcm) {
          targetNcm = xmlNcm;
        } else if (currentNcm.length !== 8 || currentNcm === "00000000" || currentNcm === "21069090") {
          targetNcm = inferCorrectNcmFromName(p.name);
        }

        const currentCfop = (p.cfop || "").replace(/\D/g, "");
        const currentCsosn = (p.csosn || "").replace(/\D/g, "");
        const targetCsosn = ["102", "500"].includes(currentCsosn) ? currentCsosn : "102";
        const targetCfop =
          currentCfop.length === 4 && ["5", "6"].includes(currentCfop[0])
            ? currentCfop
            : targetCsosn === "500"
            ? "5405"
            : "5102";

        if (targetNcm !== p.ncm || targetCfop !== p.cfop || targetCsosn !== p.csosn) {
          await prisma.product.update({
            where: { id: p.id },
            data: {
              ncm: targetNcm,
              cfop: targetCfop,
              csosn: targetCsosn,
            },
          });
          updatedProducts++;
        }
      }
    }

    revalidatePath("/fiscal");
    revalidatePath("/stock");
    return {
      ok: true,
      updatedProducts,
      checkedCount: checkedProductIds.size,
      message: `${checkedProductIds.size} produto(s) verificado(s) e ${updatedProducts} NCM/CFOP/CSOSN corrigido(s) automaticamente!`,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao verificar e corrigir NCMs." };
  }
}
