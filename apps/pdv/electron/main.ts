import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// CyberSync Service Logic
function initCyberSync() {
  console.log('CyberSync Service Initialized locally');
  // Later we can init local Prisma SQLite here and polling logic
}

app.whenReady().then(() => {
  initCyberSync();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // You can use `process.env.VITE_DEV_SERVER_URL` when the vite command is called `serve`
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    // Load your file
    win.loadFile('dist/index.html');
  }

  // Basic IPC example for the Renderer
  ipcMain.handle('cybersync:status', () => {
    return { status: 'online', pendingSyncs: 0 };
  })
})
