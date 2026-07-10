"use server";

import { prisma } from "@emporio/database";
import { revalidatePath } from "next/cache";

export async function findSaleForReturn(query: string) {
  try {
    const sale = await prisma.sale.findFirst({
      where: {
        OR: [
          { id: query },
          { invoiceId: query }
        ]
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        returns: {
          include: {
            items: true
          }
        }
      }
    });

    if (!sale) return { error: "Venda não encontrada com esse ID ou chave." };

    return { success: true, sale };
  } catch (err: any) {
    return { error: err.message || "Erro ao buscar venda" };
  }
}

export async function processReturn(data: {
  saleId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number; destiny: "STOCK" | "LOSS" }>;
  totalAmount: number;
  reason: string;
  userId: string;
  companyId: string;
}) {
  try {
    // 1. Validate customer registration
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return { error: "Cliente não encontrado." };
    if (!customer.document) {
      return { error: "Cliente com cadastro incompleto. É necessário informar o CPF/CNPJ para gerar o Vale-Crédito." };
    }

    // 2. Perform the transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Return record
      const returnRecord = await tx.return.create({
        data: {
          saleId: data.saleId,
          customerId: data.customerId,
          companyId: data.companyId,
          userId: data.userId,
          totalAmount: data.totalAmount,
          reason: data.reason,
          creditApplied: true,
          status: "COMPLETED",
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
              destiny: item.destiny
            }))
          }
        },
        include: { items: true }
      });

      // Update Stock or Create Loss for each item
      for (const item of data.items) {
        if (item.destiny === "STOCK") {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        } else if (item.destiny === "LOSS") {
          const returnItem = returnRecord.items.find(ri => ri.productId === item.productId);
          await tx.loss.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              reason: data.reason || "Devolução - Sem condição de uso",
              companyId: data.companyId,
              userId: data.userId,
              returnItemId: returnItem?.id
            }
          });
          // Note: When it's a loss, the product stock was already deducted during the sale.
          // We don't increment it back because it's lost. We just record the loss.
        }
      }

      // Add credit to customer (cashbackBalance)
      await tx.customer.update({
        where: { id: data.customerId },
        data: { cashbackBalance: { increment: data.totalAmount } }
      });

      // Create a cashback log to record the credit transaction
      await tx.cashbackLog.create({
        data: {
          amount: data.totalAmount,
          type: "EARN",
          description: `Vale-Crédito referente à Devolução ${returnRecord.id}`,
          customerId: data.customerId,
          saleId: data.saleId
        }
      });

      // Mock generating a Return Invoice (NF-e de Devolução)
      const mockInvoice = await tx.invoice.create({
        data: {
          type: "NFe",
          number: Math.floor(Math.random() * 100000).toString(),
          series: "1",
          accessKey: Array.from({length: 44}, () => Math.floor(Math.random() * 10)).join(''),
          status: "AUTHORIZED",
          environment: "producao",
          companyId: data.companyId,
          orderId: data.saleId // Link to original sale order if any, or leave as is
        }
      });

      await tx.return.update({
        where: { id: returnRecord.id },
        data: { invoiceId: mockInvoice.id }
      });

      return { returnId: returnRecord.id, invoice: mockInvoice };
    });

    revalidatePath("/returns");
    revalidatePath("/losses");
    
    return { success: true, ...result };
  } catch (err: any) {
    return { error: err.message || "Erro ao processar devolução" };
  }
}
