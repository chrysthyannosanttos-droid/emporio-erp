import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CyberSyncWorkerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Roda a cada minuto (Cron).
   * Simula o coração do CyberSync: pega os logs do banco da nuvem e prepara pacotes pro PDV baixar.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processSyncQueue() {
    // 1. Busca dispositivos (PDVs) online
    const onlineDevices = await this.prisma.deviceSync.findMany({
      where: { status: 'ONLINE' }
    });

    console.log(`[CyberSync] Processando fila para ${onlineDevices.length} dispositivos online.`);
    
    // 2. Mock de envio de catálogo e preços atualizados para os PDVs
    for (const device of onlineDevices) {
      // Simula a carga de produtos cujo `priceChangedAt` ou `updatedAt` for maior que o `device.lastSync`
      console.log(`[CyberSync] Preparando Delta de Produtos para o PDV ${device.deviceName}...`);
      
      // Update do lastSync para manter o controle
      await this.prisma.deviceSync.update({
        where: { id: device.id },
        data: { lastSync: new Date() }
      });
    }
  }
}
