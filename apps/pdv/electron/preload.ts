import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

try {
  const electron = require('electron')
  if (electron && electron.contextBridge && electron.ipcRenderer) {
    const { contextBridge, ipcRenderer } = electron
    contextBridge.exposeInMainWorld('ipcRenderer', {
      invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
        ipcRenderer.on(channel, listener)
      },
    })
  }
} catch (e) {
  console.warn('[PDV Preload] Electron contextBridge não disponível:', e)
}
