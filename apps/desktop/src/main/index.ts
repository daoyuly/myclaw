import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createLogger } from '@myclaw/logger'
import { createTray } from './tray'
import { startServer, stopServer } from './server'
import {
  initGateway,
  startGateway,
  stopGateway,
  restartGateway,
  getGatewayStatus,
  getGatewayHealth,
  cleanupGateway,
  GatewayStatus
} from './gateway'
import {
  initUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  getUpdateStatus,
  UpdateStatus
} from './updater'

const logger = createLogger('desktop:main')

let mainWindow: BrowserWindow | null = null

async function createWindow(): Promise<BrowserWindow> {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 10 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 关闭窗口时最小化到托盘，而不是退出
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
    return false
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// App lifecycle
app.whenReady().then(async () => {
  logger.info('MyClaw Desktop starting...')

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.myclaw.desktop')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.handle('get-app-status', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime()
    }
  })

  ipcMain.handle('show-window', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  ipcMain.handle('hide-window', () => {
    mainWindow?.hide()
  })

  // Gateway IPC handlers
  ipcMain.handle('gateway:start', async () => {
    try {
      await startGateway()
      return { success: true }
    } catch (error) {
      logger.error('Failed to start gateway', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('gateway:stop', async () => {
    try {
      await stopGateway()
      return { success: true }
    } catch (error) {
      logger.error('Failed to stop gateway', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('gateway:restart', async () => {
    try {
      await restartGateway()
      return { success: true }
    } catch (error) {
      logger.error('Failed to restart gateway', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('gateway:status', async (): Promise<GatewayStatus> => {
    return getGatewayStatus()
  })

  ipcMain.handle('gateway:health', async () => {
    return getGatewayHealth()
  })

  // Update IPC handlers
  ipcMain.handle('update:check', async () => {
    try {
      await checkForUpdates()
      return { success: true }
    } catch (error) {
      logger.error('Failed to check for updates', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      await downloadUpdate()
      return { success: true }
    } catch (error) {
      logger.error('Failed to download update', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('update:install', () => {
    installUpdate()
    return { success: true }
  })

  ipcMain.handle('update:status', (): UpdateStatus => {
    return getUpdateStatus()
  })

  // Create window
  await createWindow()
  logger.info('Window created')

  // Create tray
  createTray(mainWindow!)
  logger.info('Tray icon created')

  // Initialize updater
  initUpdater(mainWindow!)
  logger.info('Updater initialized')

  // Initialize Gateway (don't auto-start)
  initGateway()
  logger.info('Gateway initialized')

  // Start local server
  await startServer()
  logger.info('Local server started on port 3210')

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  logger.info('MyClaw Desktop ready')
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up on quit
app.on('before-quit', async () => {
  app.isQuitting = true
  await cleanupGateway()
  await stopServer()
  logger.info('MyClaw Desktop shutting down...')
})

// Export for IPC
declare module 'electron' {
  interface App {
    isQuitting?: boolean
  }
}
