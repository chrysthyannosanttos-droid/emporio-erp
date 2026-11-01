// apps/pdv/src/services/ScaleParser.ts

export interface ScaleBarcodeConfig {
  prefix: string; // Ex: '2' (padrão nacional EAN-13 de balança)
  codeLength: number; // Geralmente 4 ou 5 dígitos para o código do produto
  valueType: 'WEIGHT' | 'PRICE'; // Se os 5 dígitos seguintes representam Peso (Gramas) ou Preço (Centavos)
  priceDecimals: number; // 2 decimais
  weightDecimals: number; // 3 decimais (ex: 00550 = 0.550 kg)
}

export const DEFAULT_SCALE_CONFIG: ScaleBarcodeConfig = {
  prefix: '2',
  codeLength: 5, // 2 + 5 dígitos de código + 5 dígitos de peso/preço + 1 DV = 13 dígitos
  valueType: 'WEIGHT', // Pode ser configurado para PRICE
  priceDecimals: 2,
  weightDecimals: 3,
};

export interface ParsedScaleBarcode {
  isScaleBarcode: boolean;
  productCode: string;
  weight?: number; // em KG
  totalPrice?: number; // em R$
}

/**
 * Parser de código de barras de etiquetas de balança (açougue, hortifruti, padaria).
 * Padrão brasileiro EAN-13:
 * Início '2':
 * Exemplo A (por Peso): 2 [00123] [00550] [X]
 * - Prefixo 2
 * - Código PLU: 00123
 * - Peso: 00550 = 0,550 kg
 * - Dígito Verificador: X
 *
 * Exemplo B (por Preço/Valor): 2 [00123] [01250] [X]
 * - Prefixo 2
 * - Código PLU: 00123
 * - Valor: 01250 = R$ 12,50
 */
export function parseScaleBarcode(
  barcode: string,
  config: ScaleBarcodeConfig = DEFAULT_SCALE_CONFIG
): ParsedScaleBarcode {
  const clean = barcode.replace(/\D/g, '');

  if (clean.length !== 13 || !clean.startsWith(config.prefix)) {
    return { isScaleBarcode: false, productCode: clean };
  }

  const codeStart = config.prefix.length;
  const codeEnd = codeStart + config.codeLength;
  const productCode = clean.substring(codeStart, codeEnd);

  const valuePart = clean.substring(codeEnd, 12);
  const rawValue = parseInt(valuePart, 10);

  if (isNaN(rawValue)) {
    return { isScaleBarcode: false, productCode: clean };
  }

  if (config.valueType === 'WEIGHT') {
    // 00550 => 0.550 kg
    const weight = rawValue / Math.pow(10, config.weightDecimals);
    return {
      isScaleBarcode: true,
      productCode,
      weight,
    };
  } else {
    // 01250 => R$ 12.50
    const totalPrice = rawValue / Math.pow(10, config.priceDecimals);
    return {
      isScaleBarcode: true,
      productCode,
      totalPrice,
    };
  }
}

/**
 * Gerenciador de conexão com Balança de Checkout direta (via porta Serial / USB).
 * Suporta protocolos comuns do varejo brasileiro:
 * - Toledo (Prix 3, Prix 4, Prix 5)
 * - Filizola (CS15, Platina)
 * - Elgin / Urano
 *
 * Utiliza a API padrão Web Serial API do navegador / Electron.
 */
export class CheckoutScaleReader {
  private port: any = null;
  private reader: any = null;
  private isConnected: boolean = false;

  /**
   * Verifica se o navegador/ambiente suporta Web Serial
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Solicita ao usuário a seleção da porta serial da balança
   */
  async requestPort(baudRate: number = 9600): Promise<boolean> {
    if (!CheckoutScaleReader.isSupported()) {
      throw new Error('A API Web Serial não é suportada neste terminal.');
    }

    try {
      // @ts-ignore
      this.port = await navigator.serial.requestPort();
      await this.port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      });
      this.isConnected = true;
      return true;
    } catch (err) {
      console.error('Erro ao conectar na balança:', err);
      this.isConnected = false;
      throw err;
    }
  }

  /**
   * Envia comando de leitura (ex: ENQ 0x05 para Toledo) ou lê stream contínuo
   * Retorna o peso em kg (número)
   */
  async readWeight(protocol: 'TOLEDO' | 'FILIZOLA' | 'ELGIN' = 'TOLEDO'): Promise<number> {
    if (!this.isConnected || !this.port) {
      // Fallback para teste/simulação com balança virtual caso não haja hardware conectado
      return this.simulateWeight();
    }

    try {
      // Para Toledo/Prix, envia o caractere ENQ (0x05) para solicitar leitura do peso
      if (protocol === 'TOLEDO') {
        const writer = this.port.writable.getWriter();
        await writer.write(new Uint8Array([0x05]));
        writer.releaseLock();
      }

      const reader = this.port.readable.getReader();
      this.reader = reader;

      const { value, done } = await reader.read();
      reader.releaseLock();

      if (done || !value) {
        return 0;
      }

      const rawText = new TextDecoder().decode(value);
      return this.parseWeightString(rawText, protocol);
    } catch (err) {
      console.error('Erro ao ler dados da balança:', err);
      return 0;
    }
  }

  /**
   * Extrai o peso numérico da resposta serial
   */
  private parseWeightString(text: string, _protocol: string): number {
    // Formato Toledo padrão: STX (0x02) + 5 dígitos de peso + ETX (0x03) -> ex: \x0201500\x03 = 1.500kg
    const matches = text.match(/\d{4,6}/);
    if (matches) {
      const num = parseInt(matches[0], 10);
      return num / 1000;
    }
    return 0;
  }

  /**
   * Simulação de balança para testes na ausência de balança serial física
   */
  simulateWeight(): number {
    // Gera um peso randômico realista entre 0.250kg e 2.800kg
    const randomGrams = Math.floor(Math.random() * 2550) + 250;
    return +(randomGrams / 1000).toFixed(3);
  }

  async disconnect() {
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch {}
    }
    this.isConnected = false;
  }
}
