import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
let app: any, BrowserWindow: any, ipcMain: any

try {
  const electron = require('electron')
  if (electron && electron.app) {
    app = electron.app
    BrowserWindow = electron.BrowserWindow
    ipcMain = electron.ipcMain
  }
} catch (e) {
  console.warn('[PDV Main] Electron APIs não disponíveis:', e)
}

const __dirname = dirname(fileURLToPath(import.meta.url))

if (app && typeof app.whenReady === 'function') {
  app.whenReady().then(() => {
    const win = new BrowserWindow({
      width: 1280,
      height: 850,
      minWidth: 1024,
      minHeight: 700,
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    if (process.env.VITE_DEV_SERVER_URL) {
      win.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
      win.loadFile('dist/index.html')
    }

    ipcMain.handle('cybersync:status', () => {
      return { status: 'online', pendingSyncs: 0 }
    })
  })
} else {
  console.log('[PDV Main] Servidor ativo para testes no navegador em http://localhost:5173/');
  // Mantém o processo em segundo plano para o Vite continuar servindo
  setInterval(() => {}, 1000 * 60 * 60);
}
