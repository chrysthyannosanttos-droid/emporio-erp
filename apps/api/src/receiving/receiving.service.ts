import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceivingDto } from './dto/create-receiving.dto';

@Injectable()
export class ReceivingService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReceivingDto) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: dto.purchaseOrderId },
      include: { items: true }
    });

    if (!po) throw new BadRequestException('Purchase Order not found');
    if (po.status === 'RECEIVED') throw new BadRequestException('Purchase Order already fully received');

    // Validation for divergences
    let hasDivergence = false;
    let totalAmount = 0;

    for (const rItem of dto.items) {
      const poItem = po.items.find(i => i.productId === rItem.productId);
      if (!poItem) {
        hasDivergence = true; // Product not in PO
      } else {
        if (rItem.receivedQty > (poItem.quantity - poItem.receivedQty)) hasDivergence = true; // Over receiving
        if (Number(rItem.unitCost) > Number(poItem.unitCost)) hasDivergence = true; // Price higher than negotiated
      }
      totalAmount += rItem.receivedQty * rItem.unitCost;
    }

    if (hasDivergence) {
      // In a real scenario, we might still save the StockEntry as BLOCKED, but for now we throw to require a supervisor override (not implemented yet).
      throw new BadRequestException('Divergence detected in receiving (price or quantity). Supervisor approval required.');
    }

    // Execute in a transaction: update PO items, create StockEntry, update Product stock
    return this.prisma.$transaction(async (tx) => {
      // 1. Create StockEntry
      const stockEntry = await tx.stockEntry.create({
        data: {
          invoiceNum: dto.invoiceNum,
          totalAmount,
          companyId: dto.companyId,
          userId: dto.userId,
          purchaseOrderId: dto.purchaseOrderId,
          supplierId: po.supplierId,
          items: {
            create: dto.items.map(i => ({
              productId: i.productId,
              quantity: i.receivedQty,
              unitCost: i.unitCost
            }))
          }
        }
      });

      // 2. Update PO Items and Product Stock
      for (const rItem of dto.items) {
        const poItem = po.items.find(i => i.productId === rItem.productId);
        
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQty: { increment: rItem.receivedQty } }
        });

        await tx.product.update({
          where: { id: rItem.productId },
          data: { stock: { increment: rItem.receivedQty } }
        });
      }

      // 3. Update PO Status to RECEIVED if fully received
      const updatedPo = await tx.purchaseOrder.findUnique({ where: { id: po.id }, include: { items: true } });
      const isFullyReceived = updatedPo.items.every(i => i.receivedQty >= i.quantity);
      
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: isFullyReceived ? 'RECEIVED' : 'PARTIAL' }
      });

      return stockEntry;
    });
  }

  findAll(companyId: string) {
    return this.prisma.stockEntry.findMany({ 
      where: { companyId },
      include: { supplier: true, user: true, items: true }
    });
  }
}
