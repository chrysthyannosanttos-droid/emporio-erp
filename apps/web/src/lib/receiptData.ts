import { prisma } from "@emporio/database";
import { ReceiptData, shortSaleNumber } from "@/lib/receiptFormat";

/**
 * Busca os dados de um cupom pelo ID da venda.
 * Uso exclusivo do servidor. O ID (UUID) funciona como segredo do link público;
 * por isso o retorno NÃO inclui dados pessoais do cliente.
 */
export async function getReceiptBySaleId(saleId: string): Promise<ReceiptData | null> {
  // Evita consulta desnecessária para IDs claramente inválidos
  if (!/^[0-9a-fA-F-]{32,36}$/.test(saleId)) return null;

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      company: { select: { name: true, document: true } },
      user: { select: { name: true } },
      items: { include: { product: { select: { name: true, unit: true } } } },
      payments: true,
    },
  });

  if (!sale) return null;

  return {
    saleId: sale.id,
    number: shortSaleNumber(sale.id),
    companyName: sale.company.name,
    companyDocument: sale.company.document,
    operatorName: sale.user.name,
    createdAt: sale.createdAt.toISOString(),
    items: sale.items.map((i) => ({
      name: i.product.name,
      unit: i.product.unit || "UN",
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      total: Number(i.total),
    })),
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    total: Number(sale.total),
    paymentMethod: sale.payments[0]?.paymentMethod || "MONEY",
  };
}

