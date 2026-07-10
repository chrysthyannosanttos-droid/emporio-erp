import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    if (createProductDto.barcode) {
      const existing = await this.prisma.product.findFirst({
        where: { barcode: createProductDto.barcode, companyId: createProductDto.companyId }
      });
      if (existing) throw new ConflictException('Barcode already exists for this company');
    }
    return this.prisma.product.create({ data: createProductDto });
  }

  findAll(companyId: string) {
    return this.prisma.product.findMany({ where: { companyId } });
  }

  findOne(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
