export class ReceiveItemDto {
  productId: string;
  receivedQty: number;
  unitCost: number;
}

export class CreateReceivingDto {
  purchaseOrderId: string;
  invoiceNum: string;
  companyId: string;
  userId: string;
  items: ReceiveItemDto[];
}
