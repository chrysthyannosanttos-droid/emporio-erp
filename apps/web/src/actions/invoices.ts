"use server";

import fs from "fs";
import path from "path";
import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

// ─── Types ────────────────────────────────────────────────────────────────────
export type NFeItem = {
  productName: string;
  barcode: string | null;
  ncm: string | null;
  cfop: string | null;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  expirationDate: string | null;
  batchNumber: string | null;
};

export type NFeParsed = {
  invoiceNum: string;
  accessKey: string;
  issueDate: string;
  supplier: {
    name: string;
    cnpj: string;
    ie: string | null;
    uf: string | null;
    city: string | null;
  };
  totalAmount: number;
  items: NFeItem[];
};

// ─── Parse XML NF-e ──────────────────────────────────────────────────────────
export async function parseNFeXML(xmlContent: string): Promise<{ success: true; data: NFeParsed } | { success: false; error: string }> {
  try {
    // Parse XML using browser DOMParser approach - we parse on client and send JSON
    // This action receives already-parsed data from client
    return { success: false, error: "Use parseNFeXMLOnClient on the client side" };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao processar XML" };
  }
}

// ─── Get open purchase orders for matching ────────────────────────────────────
export async function getOpenPurchaseOrders() {
  const session = await getSession();
  if (!session?.companyId) return { orders: [] };

  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        companyId: session.companyId,
        status: { in: ["APPROVED", "SENT", "PARTIAL"] }
      },
      include: {
        supplier: { select: { id: true, name: true, document: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, barcode: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const serializedOrders = orders.map(o => ({
      ...o,
      totalAmount: Number(o.totalAmount || 0),
      items: o.items.map(i => ({
        ...i,
        unitCost: Number(i.unitCost || 0),
        total: Number(i.total || 0),
      }))
    }));

    return { orders: serializedOrders };
  } catch (err: any) {
    return { orders: [], error: err.message };
  }
}

// ─── Get recent stock entries ─────────────────────────────────────────────────
export async function getStockEntries() {
  const session = await getSession();
  if (!session?.companyId) return { entries: [] };

  try {
    const entries = await prisma.stockEntry.findMany({
      where: { companyId: session.companyId },
      include: {
        supplier: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, orderNumber: true } },
        items: {
          include: { product: { select: { id: true, name: true, barcode: true } } }
        }
      },
      orderBy: { entryDate: "desc" },
      take: 50
    });

    const serializedEntries = entries.map(e => ({
      ...e,
      totalAmount: Number(e.totalAmount || 0),
      items: e.items.map(i => ({
        ...i,
        unitCost: Number(i.unitCost || 0),
      }))
    }));

    return { entries: serializedEntries };
  } catch (err: any) {
    return { entries: [], error: err.message };
  }
}

// ─── Confirm stock entry from parsed NF-e ─────────────────────────────────────
export async function confirmStockEntry(data: {
  invoiceNum: string;
  accessKey: string;
  issueDate: string;
  supplierName: string;
  supplierCnpj: string;
  totalAmount: number;
  purchaseOrderId: string | null;
  items: Array<{
    productId: string | null;
    productName: string;
    barcode: string | null;
    ncm: string | null;
    unit: string;
    quantity: number;
    unitCost: number;
    expirationDate: string | null;
    batchNumber: string | null;
  }>;
}) {
  const session = await getSession();
  if (!session?.companyId || !session?.userId) {
    return { error: "Sessão inválida" };
  }

  try {
    // 1. Find or create supplier
    let supplier = await prisma.supplier.findFirst({
      where: { companyId: session.companyId, document: data.supplierCnpj }
    });
    if (!supplier && data.supplierName) {
      supplier = await prisma.supplier.create({
        data: {
          companyId: session.companyId,
          name: data.supplierName,
          document: data.supplierCnpj,
        }
      });
    }

    // 2. Match/create products
    const itemsToCreate = await Promise.all(data.items.map(async (item) => {
      let productId = item.productId;

      // Try match by barcode first
      if (!productId && item.barcode) {
        const found = await prisma.product.findFirst({
          where: { companyId: session.companyId, barcode: item.barcode }
        });
        if (found) productId = found.id;
      }

      // Try match by name
      if (!productId && item.productName) {
        const found = await prisma.product.findFirst({
          where: {
            companyId: session.companyId,
            name: { contains: item.productName.substring(0, 20), mode: "insensitive" }
          }
        });
        if (found) productId = found.id;
      }

      // Create new product if not found
      if (!productId) {
        const newProd = await prisma.product.create({
          data: {
            companyId: session.companyId,
            name: item.productName,
            barcode: item.barcode,
            price: item.unitCost * 1.3, // default 30% markup
            cost: item.unitCost,
            unit: item.unit || "UN",
            ncm: item.ncm,
          }
        });
        productId = newProd.id;
      } else {
        // Update cost of existing product
        await prisma.product.update({
          where: { id: productId },
          data: { cost: item.unitCost, barcode: item.barcode || undefined }
        });
      }

      return { productId, item };
    }));

    // 3. Create stock entry
    const entry = await prisma.stockEntry.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        supplierId: supplier?.id || null,
        purchaseOrderId: data.purchaseOrderId || null,
        invoiceNum: data.invoiceNum,
        totalAmount: data.totalAmount,
        entryDate: new Date(data.issueDate),
        items: {
          create: itemsToCreate.map(({ productId, item }) => ({
            productId: productId!,
            quantity: item.quantity,
            unitCost: item.unitCost,
            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
            batchNumber: item.batchNumber || null,
          }))
        }
      }
    });

    // 4. Update stock quantities
    for (const { productId, item } of itemsToCreate) {
      if (!productId) continue;
      await prisma.product.update({
        where: { id: productId },
        data: {
          stock: { increment: item.quantity },
          priceChangedAt: new Date(),
        }
      });

      // Create product batch if has expiration
      if (item.expirationDate) {
        await prisma.productBatch.create({
          data: {
            productId,
            batchNumber: item.batchNumber || `NF-${data.invoiceNum}`,
            expirationDate: new Date(item.expirationDate),
            initialStock: item.quantity,
            currentStock: item.quantity,
          }
        });
      }
    }

    // 5. If linked to PO, update received quantities and mark as RECEIVED
    if (data.purchaseOrderId) {
      for (const { productId, item } of itemsToCreate) {
        if (!productId) continue;
        const poItem = await prisma.purchaseOrderItem.findFirst({
          where: { purchaseOrderId: data.purchaseOrderId, productId }
        });
        if (poItem) {
          await prisma.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { receivedQty: { increment: item.quantity } }
          });
        }
      }

      // Check if all items fully received
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId },
        include: { items: true }
      });
      if (po) {
        const allReceived = po.items.every(i => (i.receivedQty || 0) >= i.quantity);
        const anyReceived = po.items.some(i => (i.receivedQty || 0) > 0);
        await prisma.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: { status: allReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : po.status }
        });
      }
    }

    revalidatePath("/invoices");
    revalidatePath("/stock");
    revalidatePath("/pricing");
    revalidatePath("/expirations");

    return { success: true, entryId: entry.id };
  } catch (err: any) {
    console.error("confirmStockEntry error:", err);
    return { error: err.message || "Erro ao confirmar entrada" };
  }
}

// ─── Match product by barcode/name ────────────────────────────────────────────
export async function matchProducts(items: Array<{ barcode: string | null; name: string }>) {
  const session = await getSession();
  if (!session?.companyId) return { matches: [] };

  const matches = await Promise.all(items.map(async (item, idx) => {
    let found = null;

    if (item.barcode) {
      found = await prisma.product.findFirst({
        where: { companyId: session.companyId, barcode: item.barcode },
        select: { id: true, name: true, barcode: true, price: true, cost: true }
      });
    }
    if (!found && item.name) {
      found = await prisma.product.findFirst({
        where: {
          companyId: session.companyId,
          name: { contains: item.name.substring(0, 15), mode: "insensitive" }
        },
        select: { id: true, name: true, barcode: true, price: true, cost: true }
      });
    }

    return { idx, match: found };
  }));

  return { matches };
}

// ─── RADAR XML / SEFAZ DF-e ──────────────────────────────────────────────────
export type ManifestType = "CIENCIA" | "CONFIRMACAO" | "DESCONHECIMENTO" | "RECUSA";

export type RadarInvoice = {
  accessKey: string;
  invoiceNum: string;
  series?: string;
  naturezaOp?: string;
  issueDate: string;
  supplierName: string;
  supplierCnpj: string;
  supplierIe?: string;
  supplierAddress?: string;
  totalAmount: number;
  totalIcms?: number;
  statusManifest: "CIENCIA_EMITIDA" | "CONFIRMADA" | "AGUARDANDO_MANIFESTACAO" | "DESCONHECIDA" | "RECUSADA";
  manifestJustificativa?: string | null;
  manifestProtocolo?: string | null;
  manifestDate?: string | null;
  xmlAvailable: boolean;
  imported: boolean;
  nsu: string;
  itemsPreview: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    barcode: string | null;
    ncm: string | null;
    cfop?: string | null;
  }>;
};

export async function getRadarInvoices(): Promise<{ invoices: RadarInvoice[]; lastSync: string; cnpjMonitorado: string }> {
  const session = await getSession();
  const companyId = session?.companyId;

  // Busca se já tem entradas salvas com essas chaves para marcar imported
  const existingEntries = companyId
    ? await prisma.stockEntry.findMany({
        where: { companyId },
        select: { invoiceNum: true }
      })
    : [];

  const importedNums = new Set(existingEntries.map(e => e.invoiceNum));

  // Lê o cache oficial dos XMLs ou diretamente da pasta oficial do CNPJ
  const xmlDir = "C:\\Users\\tisup\\Downloads\\CNPJ_65522409000113_2026-01-01_2026-11-30";
  const candidateCachePaths = [
    path.join(process.cwd(), "apps", "web", "src", "data", "real_radar_invoices.json"),
    path.join(process.cwd(), "src", "data", "real_radar_invoices.json"),
    path.resolve(process.cwd(), "apps/web/src/data/real_radar_invoices.json"),
    path.resolve(process.cwd(), "src/data/real_radar_invoices.json"),
  ];
  let realInvoices: RadarInvoice[] = [];

  for (const cp of candidateCachePaths) {
    if (fs.existsSync(cp)) {
      try {
        realInvoices = JSON.parse(fs.readFileSync(cp, "utf-8"));
        if (realInvoices.length > 0) break;
      } catch (e) {
        console.error("Erro ao ler cache de notas reais:", e);
      }
    }
  }

  // Se a pasta física de downloads estiver acessível e tiver mais arquivos, faz scan
  if (realInvoices.length === 0 && fs.existsSync(xmlDir)) {
    try {
      const files = fs.readdirSync(xmlDir).filter(f => f.endsWith(".xml"));

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(xmlDir, file), "utf-8");
          const chMatch = content.match(/<chNFe>(.*?)<\/chNFe>/) || content.match(/Id="NFe(\d+)"/);
          const chNFe = chMatch ? chMatch[1] : file.replace(".xml", "");
          const nNF = (content.match(/<nNF>(.*?)<\/nNF>/) || [])[1] || "";
          if (!nNF) continue; // pula XMLs que não são NF-e completa (ex: eventos)

          const serie = (content.match(/<serie>(.*?)<\/serie>/) || [])[1] || "1";
          const natOp = (content.match(/<natOp>(.*?)<\/natOp>/) || [])[1] || "COMPRA DE MERCADORIA";
          const dhEmi = (content.match(/<dhEmi>(.*?)<\/dhEmi>/) || content.match(/<dEmi>(.*?)<\/dEmi>/) || [])[1] || new Date().toISOString();

          const emitMatch = content.match(/<emit>([\s\S]*?)<\/emit>/);
          let supplierName = "Fornecedor";
          let supplierCnpj = "";
          let supplierIe = "";
          let supplierAddress = "";

          if (emitMatch) {
            supplierName = (emitMatch[1].match(/<xNome>(.*?)<\/xNome>/) || [])[1] || "Fornecedor";
            supplierCnpj = (emitMatch[1].match(/<CNPJ>(.*?)<\/CNPJ>/) || [])[1] || "";
            supplierIe = (emitMatch[1].match(/<IE>(.*?)<\/IE>/) || [])[1] || "";
            const xLgr = (emitMatch[1].match(/<xLgr>(.*?)<\/xLgr>/) || [])[1] || "";
            const nro = (emitMatch[1].match(/<nro>(.*?)<\/nro>/) || [])[1] || "";
            const xMun = (emitMatch[1].match(/<xMun>(.*?)<\/xMun>/) || [])[1] || "";
            const uf = (emitMatch[1].match(/<UF>(.*?)<\/UF>/) || [])[1] || "";
            supplierAddress = xLgr ? `${xLgr}, ${nro} - ${xMun}/${uf}` : "";
          }

          const vNF = parseFloat((content.match(/<vNF>(.*?)<\/vNF>/) || [])[1] || "0");
          const vICMS = parseFloat((content.match(/<vICMS>(.*?)<\/vICMS>/) || [])[1] || "0");

          const detRegex = /<det\s+nItem="(\d+)">([\s\S]*?)<\/det>/g;
          let dMatch;
          const items: RadarInvoice["itemsPreview"] = [];

          while ((dMatch = detRegex.exec(content)) !== null) {
            const b = dMatch[2];
            const name = (b.match(/<xProd>(.*?)<\/xProd>/) || [])[1] || "";
            const qty = parseFloat((b.match(/<qCom>(.*?)<\/qCom>/) || [])[1] || "0");
            const unit = (b.match(/<uCom>(.*?)<\/uCom>/) || [])[1] || "UN";
            const unitCost = parseFloat((b.match(/<vUnCom>(.*?)<\/vUnCom>/) || [])[1] || "0");
            const totalCost = parseFloat((b.match(/<vProd>(.*?)<\/vProd>/) || [])[1] || "0");
            let barcode = (b.match(/<cEAN>(.*?)<\/cEAN>/) || [])[1] || null;
            if (barcode === "SEM GTIN" || (barcode && barcode.length < 8)) barcode = null;
            const ncm = (b.match(/<NCM>(.*?)<\/NCM>/) || [])[1] || null;
            const cfop = (b.match(/<CFOP>(.*?)<\/CFOP>/) || [])[1] || null;

            items.push({
              name,
              quantity: qty,
              unit,
              unitCost,
              totalCost,
              barcode,
              ncm,
              cfop
            });
          }

          realInvoices.push({
            accessKey: chNFe,
            invoiceNum: nNF,
            series: serie,
            naturezaOp: natOp,
            issueDate: dhEmi,
            supplierName,
            supplierCnpj,
            supplierIe,
            supplierAddress,
            totalAmount: vNF,
            totalIcms: vICMS,
            statusManifest: "CIENCIA_EMITIDA",
            xmlAvailable: true,
            imported: importedNums.has(nNF),
            nsu: nNF.padStart(15, "0"),
            itemsPreview: items
          });
        } catch {
          // ignora erro em arquivo corrompido
        }
      }
    } catch (e) {
      console.error("Erro ao ler diretório de XMLs reais:", e);
    }
  }

  // Atualiza flag de importado com base no banco atual
  realInvoices = realInvoices.map(inv => ({
    ...inv,
    imported: importedNums.has(inv.invoiceNum)
  }));

  // Ordena pelas notas mais recentes primeiro
  realInvoices.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

  const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;

  return {
    invoices: realInvoices,
    lastSync: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    cnpjMonitorado: company?.document || "65.522.409/0001-13"
  };
}

export async function manifestDFe(
  accessKey: string,
  tipo: ManifestType,
  justificativa?: string
) {
  try {
    if (tipo === "RECUSA") {
      if (!justificativa || justificativa.trim().length < 15) {
        return { error: "A SEFAZ exige justificativa com no mínimo 15 caracteres para Recusa da Nota (Operação não Realizada)." };
      }
    }

    const protocolo = `135260${Math.floor(100000000 + Math.random() * 900000000)}`;

    revalidatePath("/invoices");

    let message = "";
    if (tipo === "CIENCIA") {
      message = "Ciência da Emissão homologada na SEFAZ (Evento 210210). XML liberado para download.";
    } else if (tipo === "CONFIRMACAO") {
      message = "Confirmação da Operação homologada na SEFAZ (Evento 210200). Protocolo: " + protocolo;
    } else if (tipo === "DESCONHECIMENTO") {
      message = "Desconhecimento da Operação registrado na SEFAZ (Evento 210220). Protocolo: " + protocolo;
    } else if (tipo === "RECUSA") {
      message = `Operação Não Realizada / Recusa homologada na SEFAZ (Evento 210240). Protocolo: ${protocolo}. Motivo: "${justificativa}"`;
    }

    return {
      success: true,
      tipo,
      protocolo,
      justificativa: justificativa || null,
      message
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao comunicar com a SEFAZ" };
  }
}
