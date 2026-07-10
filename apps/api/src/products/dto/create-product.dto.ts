export class CreateProductDto {
  name: string;
  barcode?: string;
  price: number;
  cost?: number;
  unit?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  categoryId?: string;
  companyId: string;
}
