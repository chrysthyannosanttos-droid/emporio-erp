// apps/pdv/src/services/ScaleIntegration.ts

/**
 * Serviço responsável por gerar os arquivos de exportação para balanças.
 * Padrão abordado: Toledo (MGV6) TXT format (ITENSMGV.TXT).
 */
export class ScaleIntegration {
  
  /**
   * Gera a linha TXT no formato exigido pela Toledo MGV6 para o ITENSMGV.TXT
   * Formato (Simplificado):
   * [01-02] Departamento (01)
   * [03-03] Tipo (0 = Peso, 1 = Unidade)
   * [04-09] Código do Produto (PLU)
   * [10-15] Preço
   * [16-18] Dias de validade
   * [19-68] Descrição do produto (50 caracteres)
   */
  static generateToledoLine(product: { 
    id: number, plu: string, type: 'W' | 'U', price: number, daysValid: number, name: string 
  }): string {
    const dept = '01';
    const typeStr = product.type === 'W' ? '0' : '1';
    const pluStr = product.plu.padStart(6, '0').slice(0, 6);
    
    // Preço: 6 dígitos (ex: R$ 12,50 -> 001250)
    const priceStr = Math.round(product.price * 100).toString().padStart(6, '0');
    
    // Validade: 3 dígitos
    const validStr = product.daysValid.toString().padStart(3, '0');
    
    // Nome: 50 dígitos
    const nameStr = product.name.padEnd(50, ' ').slice(0, 50);

    return `${dept}${typeStr}${pluStr}${priceStr}${validStr}${nameStr}`;
  }

  /**
   * Exporta todo o catálogo de produtos que são pesáveis ou requerem etiqueta de balança
   */
  static generateExportFile(products: any[]): string {
    const lines = products.map(p => this.generateToledoLine({
      id: p.id,
      plu: p.barcode || p.id.toString(), // Simplificação
      type: p.unit === 'KG' ? 'W' : 'U',
      price: Number(p.price) || 0,
      daysValid: 30, // Default mock
      name: p.name
    }));

    return lines.join('\n');
  }
}
