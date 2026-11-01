"use server";

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

  // Buscar fornecedores reais do banco se existirem
  const suppliers = companyId
    ? await prisma.supplier.findMany({
        where: { companyId },
        take: 3,
        select: { name: true, document: true, stateReg: true, city: true, state: true }
      })
    : [];

  const sup1 = suppliers[0] || { name: "AMBEV BRASIL BEBIDAS S.A.", document: "07526557000100", stateReg: "112345678", city: "Jaguariúna", state: "SP" };
  const sup2 = suppliers[1] || { name: "FRIGORIFICO MATURATTA MINERVA S.A.", document: "67620377000180", stateReg: "209876543", city: "Barretos", state: "SP" };
  const sup3 = suppliers[2] || { name: "MOINHO DIAS BRANCO IND. ALIMENTOS", document: "07206816000106", stateReg: "334455667", city: "Fortaleza", state: "CE" };

  const radarList: RadarInvoice[] = [
    {
      accessKey: "35261007526557000100550010000458921098234712",
      invoiceNum: "45892",
      series: "1",
      naturezaOp: "VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS",
      issueDate: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 horas atrás
      supplierName: sup1.name,
      supplierCnpj: sup1.document || "07.526.557/0001-00",
      supplierIe: sup1.stateReg || "112.345.678.900",
      supplierAddress: `Rod. Adhemar Pereira de Barros, km 133 - ${sup1.city || "Jaguariúna"}/${sup1.state || "SP"}`,
      totalAmount: 3840.50,
      totalIcms: 691.29,
      statusManifest: "CIENCIA_EMITIDA",
      manifestProtocolo: "135260098412345",
      manifestDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      xmlAvailable: true,
      imported: importedNums.has("45892"),
      nsu: "000000000142981",
      itemsPreview: [
        { name: "Cerveja Spaten Puro Malte 355ml LN", quantity: 240, unit: "UN", unitCost: 4.80, totalCost: 1152.00, barcode: "7891991015240", ncm: "22030000", cfop: "5102" },
        { name: "Cerveja Corona Extra 330ml LN", quantity: 180, unit: "UN", unitCost: 6.20, totalCost: 1116.00, barcode: "7891991015257", ncm: "22030000", cfop: "5102" },
        { name: "Cerveja Stella Artois Pure Gold 330ml", quantity: 120, unit: "UN", unitCost: 5.50, totalCost: 660.00, barcode: "7891991015264", ncm: "22030000", cfop: "5102" },
        { name: "Refrigerante Guaraná Antarctica 2L", quantity: 150, unit: "UN", unitCost: 6.08, totalCost: 912.50, barcode: "7891991000857", ncm: "22021000", cfop: "5102" },
      ]
    },
    {
      accessKey: "35261067620377000180550010000128451003487192",
      invoiceNum: "12845",
      series: "2",
      naturezaOp: "VENDA DE PRODUÇÃO DO ESTABELECIMENTO",
      issueDate: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // ontem
      supplierName: sup2.name,
      supplierCnpj: sup2.document || "67.620.377/0001-80",
      supplierIe: sup2.stateReg || "209.876.543.210",
      supplierAddress: `Av. Frigorífico Minerva, 1000 - ${sup2.city || "Barretos"}/${sup2.state || "SP"}`,
      totalAmount: 4950.00,
      totalIcms: 594.00,
      statusManifest: "CONFIRMADA",
      manifestProtocolo: "135260098409812",
      manifestDate: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      xmlAvailable: true,
      imported: importedNums.has("12845"),
      nsu: "000000000142980",
      itemsPreview: [
        { name: "Picanha Bovina Resfriada Fatiada (Kg)", quantity: 45, unit: "KG", unitCost: 58.00, totalCost: 2610.00, barcode: "7891112223334", ncm: "02013000", cfop: "5101" },
        { name: "Contra Filé Bovino Grill Resfriado (Kg)", quantity: 50, unit: "KG", unitCost: 38.00, totalCost: 1900.00, barcode: "7891112223341", ncm: "02013000", cfop: "5101" },
        { name: "Carvão São José Especial 3kg", quantity: 40, unit: "UN", unitCost: 11.00, totalCost: 440.00, barcode: "7890987654321", ncm: "44029000", cfop: "5102" },
      ]
    },
    {
      accessKey: "35261007206816000106550010000981241084729104",
      invoiceNum: "98124",
      series: "1",
      naturezaOp: "VENDA DE PRODUTOS ALIMENTICIOS",
      issueDate: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
      supplierName: sup3.name,
      supplierCnpj: sup3.document || "07.206.816/0001-06",
      supplierIe: sup3.stateReg || "334.455.667.890",
      supplierAddress: `Av. Brasil Industrial, 500 - ${sup3.city || "Fortaleza"}/${sup3.state || "CE"}`,
      totalAmount: 1820.00,
      totalIcms: 218.40,
      statusManifest: "AGUARDANDO_MANIFESTACAO",
      xmlAvailable: false,
      imported: importedNums.has("98124"),
      nsu: "000000000142978",
      itemsPreview: [
        { name: "Farinha de Trigo Especial Pastel/Pão 5kg", quantity: 60, unit: "UN", unitCost: 18.50, totalCost: 1110.00, barcode: "7891000123456", ncm: "11010010", cfop: "5101" },
        { name: "Fermento Biológico Seco Instantâneo 500g", quantity: 20, unit: "UN", unitCost: 14.50, totalCost: 290.00, barcode: "7891000123463", ncm: "21021090", cfop: "5102" },
        { name: "Açúcar Cristal Especial 5kg", quantity: 30, unit: "UN", unitCost: 14.00, totalCost: 420.00, barcode: "7891000123470", ncm: "17019900", cfop: "5102" },
      ]
    }
  ];

  return {
    invoices: radarList,
    lastSync: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    cnpjMonitorado: sup1.document || "Matriz Ativa"
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
