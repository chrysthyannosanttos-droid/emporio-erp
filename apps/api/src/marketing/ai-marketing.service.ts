import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiMarketingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analisa vendas e sugere quais produtos precisam de promoção e quais campanhas criar.
   */
  async suggestPromotions(companyId: string) {
    // 1. Busca produtos parados no estoque (não vendidos nos últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stagnantProducts = await this.prisma.product.findMany({
      where: {
        companyId,
        saleItems: {
          none: {
            sale: {
              createdAt: { gte: thirtyDaysAgo }
            }
          }
        },
        stock: { gt: 0 }
      },
      take: 20
    });

    // 2. IA Mock - Simula recomendação para campanhas de desconto ou BOGO (Leve 2 Pague 1)
    const suggestions = stagnantProducts.map(product => ({
      productId: product.id,
      productName: product.name,
      currentStock: product.stock,
      suggestedCampaignType: product.stock > 50 ? 'BOGO' : 'DISCOUNT',
      suggestedDiscountPercentage: product.stock > 50 ? 0 : 20,
      reasoning: 'Produto sem giro nos últimos 30 dias.'
    }));

    return {
      message: 'Sugestões geradas pela IA de Marketing',
      suggestions
    };
  }
}
