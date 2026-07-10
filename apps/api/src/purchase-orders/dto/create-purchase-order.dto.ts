export class CreatePurchaseOrderItemDto {
  productId: string;
  quantity: number;
  unitCost: number;
}

export class CreatePurchaseOrderDto {
  orderNumber?: string;
  companyId: string;
  supplierId: string;
  userId: string;
  items: CreatePurchaseOrderItemDto[];
}
