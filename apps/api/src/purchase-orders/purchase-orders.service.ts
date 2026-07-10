import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreatePurchaseOrderDto) {
    const totalAmount = createDto.items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);

    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber: createDto.orderNumber,
        companyId: createDto.companyId,
        supplierId: createDto.supplierId,
        userId: createDto.userId,
        totalAmount,
        status: 'DRAFT',
        items: {
          create: createDto.items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            total: i.quantity * i.unitCost
          }))
        }
      },
      include: { items: true }
    });
  }

  findAll(companyId: string) {
    return this.prisma.purchaseOrder.findMany({ 
      where: { companyId },
      include: { supplier: true, user: true }
    });
  }

  findOne(id: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, supplier: true }
    });
  }

  update(id: string, updateDto: UpdatePurchaseOrderDto) {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: updateDto.status }, // simplified update
    });
  }

  remove(id: string) {
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }
}
