// apps/pdv/src/services/TefService.ts

export type TefCardType = 'CREDIT' | 'DEBIT' | 'VOUCHER';

export interface TefTransactionResult {
  success: boolean;
  authCode: string;
  nsu: string;
  cardBrand: string;
  cardLastDigits: string;
  amount: number;
  type: TefCardType;
  customerReceipt: string;
  merchantReceipt: string;
  errorMessage?: string;
}

export type TefStep =
  | 'IDLE'
  | 'INITIALIZING'
  | 'INSERT_CARD'
  | 'PROCESSING'
  | 'ENTER_PIN'
  | 'APPROVED'
  | 'DECLINED'
  | 'CANCELED';

export class TefService {
  /**
   * Executa fluxo de transação TEF no PinPad (com simulação realista e cancelamento)
   */
  static async processPayment(
    amount: number,
    type: TefCardType,
    onStepChange: (step: TefStep, message: string) => void,
    signal?: AbortSignal
  ): Promise<TefTransactionResult> {
    const fmtBRL = (v: number) =>
      v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const delay = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), ms);
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('TRANSACTION_CANCELED'));
          });
        }
      });

    try {
      onStepChange('INITIALIZING', 'Conectando ao PinPad...');
      await delay(600);

      onStepChange('INSERT_CARD', `INSIRA OU APROXIME O CARTÃO\nVALOR: R$ ${fmtBRL(amount)}`);
      await delay(1500);

      onStepChange('ENTER_PIN', 'AGUARDANDO SENHA DO CLIENTE...');
      await delay(1200);

      onStepChange('PROCESSING', 'PROCESSANDO AUTORIZAÇÃO BANCÁRIA...');
      await delay(1000);

      const authCode = Math.floor(100000 + Math.random() * 900000).toString();
      const nsu = Math.floor(100000000 + Math.random() * 900000000).toString();
      const brands = ['MASTERCARD', 'VISA', 'ELO', 'HIPERCARD'];
      const cardBrand = brands[Math.floor(Math.random() * brands.length)];
      const cardLastDigits = Math.floor(1000 + Math.random() * 9000).toString();

      onStepChange('APPROVED', 'TRANSAÇÃO AUTORIZADA!');

      const dateStr = new Date().toLocaleString('pt-BR');
      const customerReceipt = `
========================================
           COMPROVANTE TEF
              VIA CLIENTE
========================================
ESTABELECIMENTO: EMPORIO ERP
DATA/HORA: ${dateStr}
DOC: ${nsu}  AUT: ${authCode}
CARTAO: ${cardBrand} final ****${cardLastDigits}
MODALIDADE: ${type === 'CREDIT' ? 'CREDITO A VISTA' : type === 'DEBIT' ? 'DEBITO' : 'VOUCHER'}
VALOR TOTAL: R$ ${fmtBRL(amount)}
----------------------------------------
          TRANSACAO APROVADA
========================================`;

      const merchantReceipt = `
========================================
           COMPROVANTE TEF
        VIA ESTABELECIMENTO
========================================
DATA/HORA: ${dateStr}
DOC: ${nsu}  AUT: ${authCode}
CARTAO: ${cardBrand} ****${cardLastDigits}
VALOR: R$ ${fmtBRL(amount)}
STATUS: APROVADO
========================================`;

      return {
        success: true,
        authCode,
        nsu,
        cardBrand,
        cardLastDigits,
        amount,
        type,
        customerReceipt,
        merchantReceipt,
      };
    } catch (err: any) {
      if (err.message === 'TRANSACTION_CANCELED') {
        onStepChange('CANCELED', 'Transação cancelada pelo operador.');
        return {
          success: false,
          authCode: '',
          nsu: '',
          cardBrand: '',
          cardLastDigits: '',
          amount,
          type,
          customerReceipt: '',
          merchantReceipt: '',
          errorMessage: 'Transação cancelada.',
        };
      }
      onStepChange('DECLINED', 'Transação não autorizada pela operadora.');
      return {
        success: false,
        authCode: '',
        nsu: '',
        cardBrand: '',
        cardLastDigits: '',
        amount,
        type,
        customerReceipt: '',
        merchantReceipt: '',
        errorMessage: err.message || 'Erro no PinPad.',
      };
    }
  }
}

