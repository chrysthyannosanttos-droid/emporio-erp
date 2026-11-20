"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { resolveActiveCompany } from "@/lib/tenant";
import { logAudit } from "./audit";
import { adjustProductStockWithParent } from "@/lib/stockDeduction";

export interface SaleAdminItemDTO {
  id?: string;
  productId: string;
  productName: string;
  unit: string;
  barcode?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SaleAdminRecord {
  id: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  createdAt: string;
  customerId: string | null;
  customerName: string;
  customerDocument: string | null;
  operatorName: string;
  paymentMethod: string;
  payments: Array<{ id: string; paymentMethod: string; amount: number }>;
  items: SaleAdminItemDTO[];
  adjustmentReason: string | null;
  adjustedAt: string | null;
  originalTotal: number | null;
  linkedTransactionsCount: number;
  invoice: {
    id: string;
    type: string;
    number: string | null;
    series: string;
    status: string;
    environment: string;
    accessKey: string | null;
    errorMsg: string | null;
  } | null;
}

export interface SaleAdminUpdateInput {
  saleId: string;
  customerId: string | null;
  paymentMethod: string;
  discount: number;
  createdAt?: string;
  reason?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

function roundQty(v: number): number {
  return Number((Number(v) || 0).toFixed(3));
}

function roundMoney(v: number): number {
  return Number((Number(v) || 0).toFixed(2));
}

async function resolveContext() {
  const [session, company] = await Promise.all([getSession(), resolveActiveCompany()]);
  if (!company) return null;
  let userId = session?.userId || null;
  if (!userId) {
    const firstUser = await prisma.user.findFirst({
      where: { companyId: company.id },
      select: { id: true },
    });
    userId = firstUser?.id || null;
  }
  return { company, userId, session };
}

function serializeSale(
  sale: any,
  invoiceMap: Map<string, any>,
  txCountBySale: Map<string, number>
): SaleAdminRecord {
  const payments = (sale.payments || []).map((p: any) => ({
    id: p.id,
    paymentMethod: p.paymentMethod,
    amount: Number(p.amount || 0),
  }));
  const primaryPayment = payments[0]?.paymentMethod || "DINHEIRO";
  const inv = sale.invoiceId ? invoiceMap.get(sale.invoiceId) || null : null;

  return {
    id: sale.id,
    subtotal: Number(sale.subtotal || 0),
    discount: Number(sale.discount || 0),
    total: Number(sale.total || 0),
    status: sale.status,
    createdAt: sale.createdAt instanceof Date ? sale.createdAt.toISOString() : String(sale.createdAt),
    customerId: sale.customerId || null,
    customerName: sale.customer?.name || "Consumidor Final",
    customerDocument: sale.customer?.document || null,
    operatorName: sale.user?.name || "Operador",
    paymentMethod:
      payments.length > 1
        ? payments.map((p: any) => p.paymentMethod).join(" + ")
        : primaryPayment,
    payments,
    items: (sale.items || []).map((it: any) => ({
      id: it.id,
      productId: it.productId,
      productName: it.product?.name || "Produto",
      unit: it.product?.unit || "UN",
      barcode: it.product?.barcode || null,
      quantity: roundQty(it.quantity),
      unitPrice: Number(it.unitPrice || 0),
      total: roundMoney(Number(it.total ?? Number(it.unitPrice || 0) * Number(it.quantity || 0))),
    })),
    adjustmentReason: sale.adjustmentReason || null,
    adjustedAt: sale.adjustedAt ? new Date(sale.adjustedAt).toISOString() : null,
    originalTotal: sale.originalTotal != null ? Number(sale.originalTotal) : null,
    linkedTransactionsCount: txCountBySale.get(sale.id) || 0,
    invoice: inv
      ? {
          id: inv.id,
          type: inv.type,
          number: inv.number,
          series: inv.series,
          status: inv.status,
          environment: inv.environment,
          accessKey: inv.accessKey,
          errorMsg: inv.errorMsg,
        }
      : null,
  };
}

function revalidateSaleRelatedPaths() {
  revalidatePath("/sales");
  revalidatePath("/");
  revalidatePath("/pdv");
  revalidatePath("/vendas-diretas");
  revalidatePath("/finance");
  revalidatePath("/stock");
  revalidatePath("/reports");
  revalidatePath("/fiscal");
  revalidatePath("/customers");
}

export async function listSalesAdmin(filters?: {
  search?: string;
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  take?: number;
}) {
  try {
    const ctx = await resolveContext();
    if (!ctx) {
      return { success: false, error: "Empresa ativa não localizada.", sales: [], customers: [], products: [] };
    }

    const where: any = { companyId: ctx.company.id };
    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(`${filters.startDate}T00:00:00-03:00`);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(`${filters.endDate}T23:59:59.999-03:00`);
      }
    }

    const [salesRaw, customers, products] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, unit: true, barcode: true } },
            },
          },
          payments: true,
          customer: { select: { id: true, name: true, document: true, taxRegime: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: filters?.take || 150,
      }),
      prisma.customer.findMany({
        where: { companyId: ctx.company.id },
        select: { id: true, name: true, document: true, taxRegime: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { companyId: ctx.company.id },
        select: { id: true, name: true, barcode: true, price: true, unit: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const invoiceIds = salesRaw.map((s) => s.invoiceId).filter(Boolean) as string[];
    const saleIds = salesRaw.map((s) => s.id);

    const [invoices, linkedTxs] = await Promise.all([
      invoiceIds.length > 0
        ? prisma.invoice.findMany({
            where: { id: { in: invoiceIds } },
          })
        : Promise.resolve([]),
      saleIds.length > 0
        ? prisma.transaction.groupBy({
            by: ["orderId"],
            where: { companyId: ctx.company.id, orderId: { in: saleIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));
    const txCountBySale = new Map<string, number>();
    for (const row of linkedTxs) {
      if (row.orderId) txCountBySale.set(row.orderId, row._count.id);
    }

    let sales = salesRaw.map((s) => serializeSale(s, invoiceMap, txCountBySale));

    if (filters?.paymentMethod && filters.paymentMethod !== "ALL") {
      const target = filters.paymentMethod.toUpperCase();
      sales = sales.filter((s) =>
        s.payments.some((p) => p.paymentMethod.toUpperCase().includes(target))
      );
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      sales = sales.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          (s.customerDocument || "").toLowerCase().includes(q) ||
          s.operatorName.toLowerCase().includes(q) ||
          s.items.some((it) => it.productName.toLowerCase().includes(q)) ||
          (s.invoice?.number && s.invoice.number.includes(q))
      );
    }

    return {
      success: true,
      sales,
      customers,
      products: products.map((p) => ({
        ...p,
        price: Number(p.price || 0),
      })),
    };
  } catch (err: any) {
    console.error("Erro em listSalesAdmin:", err);
    return { success: false, error: err.message, sales: [], customers: [], products: [] };
  }
}

export async function getSaleByIdAdmin(saleId: string) {
  try {
    const ctx = await resolveContext();
    if (!ctx) return { success: false, error: "Empresa ativa não localizada." };

    const [sale, customers, products] = await Promise.all([
      prisma.sale.findFirst({
        where: { id: saleId, companyId: ctx.company.id },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, unit: true, barcode: true } } },
          },
          payments: true,
          customer: { select: { id: true, name: true, document: true, taxRegime: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.customer.findMany({
        where: { companyId: ctx.company.id },
        select: { id: true, name: true, document: true, taxRegime: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { companyId: ctx.company.id },
        select: { id: true, name: true, barcode: true, price: true, unit: true },
        orderBy: { name: "asc" },
      }),
    ]);

    if (!sale) return { success: false, error: "Venda não encontrada." };

    const [inv, txCount] = await Promise.all([
      sale.invoiceId ? prisma.invoice.findUnique({ where: { id: sale.invoiceId } }) : Promise.resolve(null),
      prisma.transaction.count({ where: { companyId: ctx.company.id, orderId: sale.id } }),
    ]);

    const invoiceMap = new Map(inv ? [[inv.id, inv]] : []);
    const txCountBySale = new Map([[sale.id, txCount]]);

    return {
      success: true,
      sale: serializeSale(sale, invoiceMap, txCountBySale),
      customers,
      products: products.map((p) => ({ ...p, price: Number(p.price || 0) })),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao carregar venda." };
  }
}

export async function updateSaleAdmin(input: SaleAdminUpdateInput) {
  try {
    const ctx = await resolveContext();
    if (!ctx) return { success: false, error: "Sessão inválida ou empresa não encontrada." };

    if (!input.items || input.items.length === 0) {
      return { success: false, error: "A venda precisa ter ao menos 1 item." };
    }

    const validItems = input.items.map((it) => ({
      productId: it.productId,
      quantity: roundQty(it.quantity),
      unitPrice: roundMoney(it.unitPrice),
    }));
    if (validItems.some((it) => !it.productId || it.quantity <= 0 || it.unitPrice < 0)) {
      return { success: false, error: "Verifique os itens: quantidade deve ser > 0 e preço >= 0." };
    }

    const existing = await prisma.sale.findFirst({
      where: { id: input.saleId, companyId: ctx.company.id },
      include: {
        items: true,
        payments: true,
        customer: { select: { id: true, name: true, taxRegime: true } },
      },
    });
    if (!existing) {
      return { success: false, error: "Venda não encontrada nesta empresa." };
    }

    let nextCustomerName = "Consumidor Final";
    if (input.customerId) {
      const cust = await prisma.customer.findFirst({
        where: { id: input.customerId, companyId: ctx.company.id },
        select: { id: true, name: true },
      });
      if (!cust) {
        return { success: false, error: "Cliente selecionado não pertence à empresa ativa." };
      }
      nextCustomerName = cust.name;
    }

    const subtotal = roundMoney(
      validItems.reduce((acc, it) => acc + roundMoney(it.quantity * it.unitPrice), 0)
    );
    const discount = roundMoney(Math.max(0, Number(input.discount || 0)));
    const total = roundMoney(Math.max(0, subtotal - discount));
    const paymentMethod = (input.paymentMethod || "DINHEIRO").trim().toUpperCase();

    let parsedDate: Date | undefined = undefined;
    if (input.createdAt) {
      const d = new Date(input.createdAt);
      if (!Number.isNaN(d.getTime())) parsedDate = d;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Ajuste líquido de estoque por produto (somente se venda não estiver cancelada)
      if (existing.status !== "CANCELED") {
        const oldQtyMap = new Map<string, number>();
        for (const it of existing.items) {
          oldQtyMap.set(it.productId, (oldQtyMap.get(it.productId) || 0) + Number(it.quantity || 0));
        }

        const newQtyMap = new Map<string, number>();
        for (const it of validItems) {
          newQtyMap.set(it.productId, (newQtyMap.get(it.productId) || 0) + it.quantity);
        }

        const allProductIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
        const toIncrement: { productId: string; quantity: number }[] = [];
        const toDecrement: { productId: string; quantity: number }[] = [];
        for (const productId of allProductIds) {
          const oldQ = oldQtyMap.get(productId) || 0;
          const newQ = newQtyMap.get(productId) || 0;
          const stockDelta = roundQty(oldQ - newQ); // positivo devolve ao estoque; negativo baixa mais
          if (stockDelta > 0.0001) {
            toIncrement.push({ productId, quantity: stockDelta });
          } else if (stockDelta < -0.0001) {
            toDecrement.push({ productId, quantity: Math.abs(stockDelta) });
          }
        }
        if (toIncrement.length > 0) {
          await adjustProductStockWithParent(tx, toIncrement, "INCREMENT");
        }
        if (toDecrement.length > 0) {
          await adjustProductStockWithParent(tx, toDecrement, "DECREMENT");
        }
      }

      // 2. Recriar itens da venda
      await tx.saleItem.deleteMany({ where: { saleId: existing.id } });
      await tx.saleItem.createMany({
        data: validItems.map((it) => ({
          saleId: existing.id,
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: roundMoney(it.quantity * it.unitPrice),
        })),
      });

      // 3. Recriar pagamento principal
      await tx.salePayment.deleteMany({ where: { saleId: existing.id } });
      await tx.salePayment.create({
        data: {
          saleId: existing.id,
          paymentMethod,
          amount: total,
        },
      });

      // 4. Atualizar títulos financeiros vinculados (ex.: Crediário Funcionários ou Boletos)
      const linkedTxs = await tx.transaction.findMany({
        where: { companyId: ctx.company.id, orderId: existing.id },
        orderBy: { dueDate: "asc" },
      });

      const oldCrediarioOpen = linkedTxs
        .filter((t) => t.category === "Crediário Funcionários" && t.status !== "RECEIVED")
        .reduce((a, b) => a + Math.abs(Number(b.amount || 0)), 0);

      if (linkedTxs.length === 1) {
        await tx.transaction.update({
          where: { id: linkedTxs[0].id },
          data: {
            amount: total,
            provider: nextCustomerName,
            paymentMethod,
          },
        });
      } else if (linkedTxs.length > 1) {
        const count = linkedTxs.length;
        const parcelVal = roundMoney(total / count);
        for (let i = 0; i < count; i++) {
          const val = i === count - 1 ? roundMoney(total - parcelVal * (count - 1)) : parcelVal;
          await tx.transaction.update({
            where: { id: linkedTxs[i].id },
            data: {
              amount: val,
              provider: nextCustomerName,
              paymentMethod,
            },
          });
        }
      }

      // Ajustar creditUsed se houve Crediário aberto vinculado
      if (oldCrediarioOpen > 0 && existing.customerId) {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: {
            creditUsed: {
              decrement: Math.min(oldCrediarioOpen, Number(existing.total || 0)),
            },
          },
        });
      }
      if (linkedTxs.some((t) => t.category === "Crediário Funcionários" && t.status !== "RECEIVED") && input.customerId) {
        await tx.customer.update({
          where: { id: input.customerId },
          data: { creditUsed: { increment: total } },
        });
      }

      // 5. Atualizar venda preservando histórico original
      await tx.sale.update({
        where: { id: existing.id },
        data: {
          customerId: input.customerId || null,
          subtotal,
          discount,
          total,
          status: existing.status === "CANCELED" ? "CANCELED" : "ADJUSTED",
          originalSubtotal: existing.originalSubtotal ?? existing.subtotal,
          originalDiscount: existing.originalDiscount ?? existing.discount,
          originalTotal: existing.originalTotal ?? existing.total,
          adjustedAt: new Date(),
          adjustedByUserId: ctx.userId,
          adjustmentReason: input.reason?.trim() || "Edição administrativa de venda",
          ...(parsedDate ? { createdAt: parsedDate } : {}),
        },
      });
    });

    await logAudit({
      operation: "SALE_EDIT",
      action: "UPDATE",
      entity: "Sale",
      entityId: existing.id,
      oldValue: `Total: R$ ${Number(existing.total).toFixed(2)} | Itens: ${existing.items.length}`,
      newValue: `Total: R$ ${total.toFixed(2)} | Pagamento: ${paymentMethod} | Itens: ${validItems.length}`,
      reason: input.reason?.trim() || "Edição administrativa da venda",
      companyId: ctx.company.id,
      userId: ctx.userId || undefined,
    });

    revalidateSaleRelatedPaths();
    return { success: true };
  } catch (err: any) {
    console.error("Erro em updateSaleAdmin:", err);
    return { success: false, error: err.message || "Erro ao atualizar venda." };
  }
}

export async function cancelOrDeleteSaleAdmin(input: {
  saleId: string;
  mode: "CANCEL" | "DELETE";
  reason?: string;
  cancelInvoiceOnSefaz?: boolean;
  forceWithoutInvoiceCancel?: boolean;
}) {
  try {
    const ctx = await resolveContext();
    if (!ctx) return { success: false, error: "Empresa ativa não encontrada." };

    const sale = await prisma.sale.findFirst({
      where: { id: input.saleId, companyId: ctx.company.id },
      include: {
        items: true,
        payments: true,
        customer: { select: { id: true, name: true, cashbackBalance: true, creditUsed: true } },
      },
    });
    if (!sale) {
      return { success: false, error: "Venda não encontrada." };
    }

    const invoice = sale.invoiceId
      ? await prisma.invoice.findUnique({ where: { id: sale.invoiceId } })
      : null;

    if (
      invoice &&
      invoice.status === "AUTHORIZED" &&
      invoice.environment === "producao"
    ) {
      if (input.cancelInvoiceOnSefaz) {
        const { cancelInvoice } = await import("./invoice");
        const sefazCancel = await cancelInvoice(
          invoice.id,
          input.reason?.trim() || "Cancelamento administrativo de venda por erro operacional."
        );
        if (sefazCancel?.error && !input.forceWithoutInvoiceCancel) {
          return {
            success: false,
            requiresFiscalHandling: true,
            error: `SEFAZ recusou o cancelamento da ${invoice.type} #${invoice.number}: ${sefazCancel.error}`,
          };
        }
      } else if (!input.forceWithoutInvoiceCancel) {
        return {
          success: false,
          requiresFiscalHandling: true,
          error: `Esta venda possui ${invoice.type} #${invoice.number || "S/N"} AUTORIZADA em Produção na SEFAZ. Selecione a opção de cancelar a NF na SEFAZ antes ou confirme a operação.`,
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Devolver estoque apenas se a venda ainda não estava cancelada
      if (sale.status !== "CANCELED") {
        await adjustProductStockWithParent(
          tx,
          sale.items.map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity || 0),
          })),
          "INCREMENT"
        );

        // 2. Reverter cashback gerado/resgatado dessa venda
        const cashbackLogs = await tx.cashbackLog.findMany({
          where: { saleId: sale.id },
        });
        if (cashbackLogs.length > 0 && sale.customerId) {
          let netEarned = 0;
          for (const log of cashbackLogs) {
            const amt = Number(log.amount || 0);
            if (log.type === "EARN") netEarned += amt;
            else if (log.type === "REDEEM") netEarned -= amt;
          }
          const cust = await tx.customer.findUnique({
            where: { id: sale.customerId },
            select: { cashbackBalance: true },
          });
          if (cust) {
            const nextCashback = Math.max(0, roundMoney(Number(cust.cashbackBalance || 0) - netEarned));
            await tx.customer.update({
              where: { id: sale.customerId },
              data: { cashbackBalance: nextCashback },
            });
          }
          await tx.cashbackLog.deleteMany({ where: { saleId: sale.id } });
        }
      }

      // 3. Reverter/Remover títulos financeiros vinculados (Crediário ou Boleto)
      const linkedTxs = await tx.transaction.findMany({
        where: { companyId: ctx.company.id, orderId: sale.id },
      });
      if (linkedTxs.length > 0) {
        const openCrediarioAmt = linkedTxs
          .filter((t) => t.category === "Crediário Funcionários" && t.status !== "RECEIVED")
          .reduce((a, b) => a + Math.abs(Number(b.amount || 0)), 0);

        if (openCrediarioAmt > 0 && sale.customerId) {
          const cust = await tx.customer.findUnique({
            where: { id: sale.customerId },
            select: { creditUsed: true },
          });
          if (cust) {
            await tx.customer.update({
              where: { id: sale.customerId },
              data: {
                creditUsed: Math.max(0, roundMoney(Number(cust.creditUsed || 0) - openCrediarioAmt)),
              },
            });
          }
        }
        await tx.transaction.deleteMany({
          where: { companyId: ctx.company.id, orderId: sale.id },
        });
      }

      // 4. Desvincular devoluções se houver
      await tx.return.updateMany({
        where: { saleId: sale.id },
        data: { saleId: null },
      });

      if (input.mode === "CANCEL") {
        await tx.sale.update({
          where: { id: sale.id },
          data: {
            status: "CANCELED",
            adjustedAt: new Date(),
            adjustedByUserId: ctx.userId,
            adjustmentReason: input.reason?.trim() || "Venda cancelada pelo administrador",
          },
        });
      } else {
        await tx.sale.delete({ where: { id: sale.id } });
      }
    });

    const invoiceSummary = invoice ? ` | NF: ${invoice.type} #${invoice.number || "S/N"}` : "";
    await logAudit({
      operation: input.mode === "CANCEL" ? "SALE_CANCEL" : "SALE_DELETE",
      action: input.mode === "CANCEL" ? "CANCEL" : "DELETE",
      entity: "Sale",
      entityId: sale.id,
      oldValue: `Venda #${sale.id.slice(0, 8)} | Total: R$ ${Number(sale.total).toFixed(2)} | Cliente: ${sale.customer?.name || "Consumidor Final"}${invoiceSummary}`,
      newValue: input.mode === "CANCEL" ? "CANCELED" : "DELETED",
      reason: input.reason?.trim() || (input.mode === "CANCEL" ? "Cancelamento de venda" : "Exclusão definitiva de venda"),
      companyId: ctx.company.id,
      userId: ctx.userId || undefined,
    });

    revalidateSaleRelatedPaths();
    return {
      success: true,
      message:
        input.mode === "CANCEL"
          ? "Venda cancelada e estoque/títulos estornados com sucesso."
          : "Venda excluída definitivamente e estoque/títulos estornados.",
    };
  } catch (err: any) {
    console.error("Erro em cancelOrDeleteSaleAdmin:", err);
    return { success: false, error: err.message || "Erro ao processar venda." };
  }
}

export async function bulkUpdateSalesAdmin(input: {
  saleIds: string[];
  customerId?: string; // "__KEEP__" = manter | "" = Consumidor Final | uuid = cliente
  paymentMethod?: string; // "__KEEP__" = manter | "PIX" | ...
  reason?: string;
}) {
  try {
    const ctx = await resolveContext();
    if (!ctx) return { success: false, error: "Empresa ativa não localizada." };

    const ids = Array.from(new Set(input.saleIds || [])).filter(Boolean);
    if (ids.length === 0) return { success: false, error: "Nenhuma venda selecionada." };

    const changeCustomer = input.customerId !== undefined && input.customerId !== "__KEEP__";
    const nextCustomerId = changeCustomer ? (input.customerId || null) : undefined;
    const changePayment = Boolean(input.paymentMethod && input.paymentMethod !== "__KEEP__");
    const nextMethod = changePayment ? String(input.paymentMethod).trim().toUpperCase() : undefined;

    let nextCustomerName = "Consumidor Final";
    if (nextCustomerId) {
      const cust = await prisma.customer.findFirst({
        where: { id: nextCustomerId, companyId: ctx.company.id },
        select: { id: true, name: true },
      });
      if (!cust) return { success: false, error: "Cliente não pertence à empresa ativa." };
      nextCustomerName = cust.name;
    }

    let updated = 0;
    await prisma.$transaction(async (tx) => {
      for (const saleId of ids) {
        const sale = await tx.sale.findFirst({
          where: { id: saleId, companyId: ctx.company.id },
          select: {
            id: true,
            total: true,
            status: true,
            originalSubtotal: true,
            originalDiscount: true,
            originalTotal: true,
            subtotal: true,
            discount: true,
          },
        });
        if (!sale) continue;

        await tx.sale.update({
          where: { id: sale.id },
          data: {
            ...(changeCustomer ? { customerId: nextCustomerId } : {}),
            status: sale.status === "CANCELED" ? "CANCELED" : "ADJUSTED",
            originalSubtotal: sale.originalSubtotal ?? sale.subtotal,
            originalDiscount: sale.originalDiscount ?? sale.discount,
            originalTotal: sale.originalTotal ?? sale.total,
            adjustedAt: new Date(),
            adjustedByUserId: ctx.userId,
            adjustmentReason: input.reason?.trim() || "Edição em lote",
          },
        });

        if (nextMethod) {
          await tx.salePayment.deleteMany({ where: { saleId: sale.id } });
          await tx.salePayment.create({
            data: {
              saleId: sale.id,
              paymentMethod: nextMethod,
              amount: Number(sale.total || 0),
            },
          });
        }

        if (changeCustomer || nextMethod) {
          await tx.transaction.updateMany({
            where: { companyId: ctx.company.id, orderId: sale.id },
            data: {
              ...(changeCustomer ? { provider: nextCustomerName } : {}),
              ...(nextMethod ? { paymentMethod: nextMethod } : {}),
            },
          });
        }
        updated++;
      }
    });

    await logAudit({
      operation: "SALE_BULK_EDIT",
      action: "UPDATE",
      entity: "Sale",
      entityId: ids.slice(0, 5).join(","),
      newValue: `${updated} venda(s) editadas em lote`,
      reason: input.reason?.trim() || "Edição em lote",
      companyId: ctx.company.id,
      userId: ctx.userId || undefined,
    });

    revalidateSaleRelatedPaths();
    return { success: true, updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro na edição em lote." };
  }
}

export async function bulkCancelOrDeleteSalesAdmin(input: {
  saleIds: string[];
  mode: "CANCEL" | "DELETE";
  reason?: string;
  cancelInvoiceOnSefaz?: boolean;
  forceWithoutInvoiceCancel?: boolean;
}) {
  const ids = Array.from(new Set(input.saleIds || [])).filter(Boolean);
  if (ids.length === 0) {
    return { success: false, error: "Nenhuma venda selecionada.", successCount: 0, errors: [] as string[] };
  }

  let successCount = 0;
  const errors: string[] = [];
  let requiresFiscalHandling = false;

  for (const saleId of ids) {
    const res = await cancelOrDeleteSaleAdmin({
      saleId,
      mode: input.mode,
      reason: input.reason,
      cancelInvoiceOnSefaz: input.cancelInvoiceOnSefaz,
      forceWithoutInvoiceCancel: input.forceWithoutInvoiceCancel,
    });
    if (res.success) {
      successCount++;
    } else {
      if ((res as any).requiresFiscalHandling) requiresFiscalHandling = true;
      errors.push(`#${saleId.slice(0, 8)}: ${res.error || "Erro"}`);
    }
  }

  revalidateSaleRelatedPaths();
  return {
    success: successCount > 0 && errors.length === 0,
    partial: successCount > 0 && errors.length > 0,
    requiresFiscalHandling,
    successCount,
    errors,
  };
}

export interface DeletedSaleAuditRecord {
  id: string;
  saleId: string;
  code: string;
  operation: string;
  total: number;
  customerName: string;
  invoiceInfo: string | null;
  reason: string;
  deletedBy: string;
  createdAt: string;
  rawSummary: string;
}

export async function listDeletedSalesAuditAdmin(filters?: {
  startDate?: string;
  endDate?: string;
  take?: number;
}) {
  try {
    const ctx = await resolveContext();
    if (!ctx) {
      return { success: false, error: "Empresa ativa não encontrada.", logs: [] as DeletedSaleAuditRecord[] };
    }

    const where: any = {
      companyId: ctx.company.id,
      entity: "Sale",
      operation: { in: ["SALE_DELETE", "SALE_CANCEL"] },
    };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(`${filters.startDate}T00:00:00.000-03:00`);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(`${filters.endDate}T23:59:59.999-03:00`);
      }
    }

    const rows = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: filters?.take || 500,
    });

    const logs: DeletedSaleAuditRecord[] = rows.map((r) => {
      const raw = r.oldValue || "";
      const codeMatch = raw.match(/Venda\s+#([A-Za-z0-9-]+)/);
      const totalMatch = raw.match(/Total:\s*R\$\s*([\d.,]+)/);
      const custMatch = raw.match(/Cliente:\s*([^|]+)/);
      const nfMatch = raw.match(/NF:\s*([^|]+)/);

      const totalNum = totalMatch
        ? parseFloat(totalMatch[1].replace(/\./g, "").replace(",", ".")) || 0
        : 0;

      return {
        id: r.id,
        saleId: r.entityId || "",
        code: codeMatch ? codeMatch[1] : (r.entityId || "").slice(0, 8),
        operation: r.operation === "SALE_CANCEL" ? "CANCELADA" : "EXCLUÍDA",
        total: totalNum,
        customerName: custMatch ? custMatch[1].trim() : "Consumidor Final",
        invoiceInfo: nfMatch ? nfMatch[1].trim() : null,
        reason: r.reason || (r.operation === "SALE_CANCEL" ? "Cancelamento" : "Exclusão"),
        deletedBy: r.user?.name || "Administrador",
        createdAt: r.createdAt.toISOString(),
        rawSummary: raw,
      };
    });

    return { success: true, logs };
  } catch (err: any) {
    console.error("Erro ao listar histórico de vendas apagadas:", err);
    return {
      success: false,
      error: err?.message || "Erro ao buscar histórico de notas/vendas apagadas.",
      logs: [] as DeletedSaleAuditRecord[],
    };
  }
}

