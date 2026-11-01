// apps/pdv/src/services/SyncService.ts

import { OfflineStorage } from './OfflineStorage';
import type { PdvTerminalConfig } from '../types/terminal';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSalesCount: number;
  lastSyncedAt: Date | null;
  lastError: string | null;
}

export class SyncService {
  private config: PdvTerminalConfig | null = null;
  private syncTimer: any = null;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private status: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingSalesCount: 0,
    lastSyncedAt: null,
    lastError: null,
  };

  constructor(config: PdvTerminalConfig | null) {
    this.config = config;
    this.updatePendingCount();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  setConfig(config: PdvTerminalConfig | null) {
    this.config = config;
  }

  subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    listener(this.status);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.status));
  }

  private updatePendingCount() {
    this.status.pendingSalesCount = OfflineStorage.getPendingSales().length;
    this.notify();
  }

  private handleNetworkChange(isOnline: boolean) {
    this.status.isOnline = isOnline;
    this.notify();
    if (isOnline) {
      this.syncNow();
    }
  }

  startAutoSync(intervalSeconds: number = 30) {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      if (navigator.onLine) {
        this.syncNow();
      }
    }, intervalSeconds * 1000);
  }

  stopAutoSync() {
    if (this.syncTimer) clearInterval(this.syncTimer);
  }

  /**
   * Baixa catálogo de produtos atualizado do servidor para armazenamento local
   */
  async downloadCatalog(): Promise<{ count: number; ok: boolean }> {
    if (!this.config?.apiUrl || !this.config?.terminalId) {
      return { count: 0, ok: false };
    }

    try {
      const res = await fetch(`${this.config.apiUrl}/api/pdv/sync/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminalId: this.config.terminalId,
          token: this.config.token,
        }),
      });

      if (!res.ok) {
        throw new Error(`Falha ao sincronizar produtos: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.products && Array.isArray(data.products)) {
        OfflineStorage.saveProducts(data.products);
        return { count: data.products.length, ok: true };
      }
      return { count: 0, ok: true };
    } catch (err: any) {
      console.warn('[PDV Sync] Erro ao baixar produtos do servidor:', err);
      this.status.lastError = err.message || 'Erro ao sincronizar catálogo';
      this.notify();
      return { count: 0, ok: false };
    }
  }

  /**
   * Envia as vendas realizadas offline para o servidor
   */
  async uploadPendingSales(): Promise<{ syncedCount: number }> {
    const pending = OfflineStorage.getPendingSales();
    if (pending.length === 0) return { syncedCount: 0 };
    if (!this.config?.apiUrl || !this.config?.terminalId) {
      return { syncedCount: 0 };
    }

    try {
      const res = await fetch(`${this.config.apiUrl}/api/pdv/sync/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminalId: this.config.terminalId,
          token: this.config.token,
          sales: pending,
        }),
      });

      if (!res.ok) {
        throw new Error(`Falha ao enviar vendas: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.syncedIds && Array.isArray(data.syncedIds)) {
        OfflineStorage.markSalesSynced(data.syncedIds);
        this.updatePendingCount();
        return { syncedCount: data.syncedIds.length };
      }
      return { syncedCount: 0 };
    } catch (err: any) {
      console.warn('[PDV Sync] Erro ao enviar vendas pendentes:', err);
      this.status.lastError = err.message || 'Erro ao enviar vendas';
      this.notify();
      return { syncedCount: 0 };
    }
  }

  /**
   * Executa ciclo completo de sincronização
   */
  async syncNow(): Promise<void> {
    if (this.status.isSyncing) return;
    this.status.isSyncing = true;
    this.status.lastError = null;
    this.notify();

    try {
      // 1. Enviar vendas pendentes
      await this.uploadPendingSales();

      // 2. Baixar catálogo atualizado de produtos
      await this.downloadCatalog();

      this.status.lastSyncedAt = new Date();
    } catch (err: any) {
      this.status.lastError = err.message;
    } finally {
      this.status.isSyncing = false;
      this.updatePendingCount();
    }
  }
}
