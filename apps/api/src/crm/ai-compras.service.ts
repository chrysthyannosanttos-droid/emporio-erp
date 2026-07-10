import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiComprasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analisa vendas de 7/15/30 dias e gera sugestão de quantidade de compra.
   */
  async generatePurchaseSuggestion(companyId: string) {
    const products = await this.prisma.product.findMany({
      where: { companyId },
      include: {
        saleItems: {
          include: { sale: true }
        }
      }
    });

    const suggestions = products.map(product => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      
      const salesLast30Days = product.saleItems
        .filter(item => item.sale.createdAt >= thirtyDaysAgo)
        .reduce((acc, item) => acc + item.quantity, 0);

      const averageDailySales = salesLast30Days / 30;
      const coverageDays = product.stock / (averageDailySales || 1); // Evitar divisão por zero

      // Se cobertura for menor que 7 dias, sugere compra
      let suggestionQty = 0;
      if (coverageDays < 7) {
        // Comprar para cobrir 30 dias
        suggestionQty = Math.ceil((averageDailySales * 30) - product.stock);
      }

      return {
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        averageDailySales: averageDailySales.toFixed(2),
        daysOfCoverage: coverageDays.toFixed(1),
        suggestedPurchaseQuantity: suggestionQty > 0 ? suggestionQty : 0
      };
    }).filter(s => s.suggestedPurchaseQuantity > 0);

    return {
      message: 'Sugestão Inteligente de Compras baseada em ruptura e cobertura',
      suggestions
    };
  }
}
