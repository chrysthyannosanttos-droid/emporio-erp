import axios from 'axios';

/**
 * Serviço de Integração WhatsApp
 * Pode ser plugado com Z-API, Evolution API, Baileys ou API Oficial do WhatsApp (Cloud API).
 */
export class WhatsAppService {
  private apiUrl = process.env.WHATSAPP_API_URL || 'http://localhost:8080';
  private apiToken = process.env.WHATSAPP_API_TOKEN || 'sua-chave-api-aqui';

  /**
   * Envia uma mensagem de texto simples
   */
  async sendMessage(phone: string, text: string) {
    try {
      console.log(`[WhatsApp] Enviando mensagem para ${phone}...`);
      // Exemplo de payload padronizado Evolution/Z-API
      const payload = {
        number: phone,
        textMessage: { text }
      };

      // Em produção:
      // const response = await axios.post(`${this.apiUrl}/message/sendText`, payload, {
      //   headers: { Authorization: `Bearer ${this.apiToken}` }
      // });
      // return response.data;

      console.log(`[WhatsApp] Mensagem simulada entregue: "${text}"`);
      return { success: true, simulated: true };
    } catch (error) {
      console.error('[WhatsApp] Erro ao enviar mensagem', error);
      throw error;
    }
  }

  /**
   * Envia o cupom de desconto gerado pelo sistema
   */
  async sendDiscountCoupon(phone: string, customerName: string, code: string, discount: string) {
    const message = `Olá ${customerName}! 🎁\n\nSeparamos um presente especial para você na Empório.\nApresente o cupom *${code}* no caixa e ganhe *${discount}* na sua próxima compra!\n\nVálido por 7 dias.`;
    return this.sendMessage(phone, message);
  }

  /**
   * Envia encarte / catálogo PDF (Exemplo de envio de mídia)
   */
  async sendCatalog(phone: string, pdfUrl: string) {
    console.log(`[WhatsApp] Enviando catálogo PDF ${pdfUrl} para ${phone}`);
    return { success: true, simulated: true };
  }
}
