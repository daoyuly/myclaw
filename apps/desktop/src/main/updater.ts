import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, dialog, Notification } from 'electron'
import { createLogger } from '@myclaw/logger'

const logger = createLogger('desktop:updater')

export interface UpdateStatus {
  checking: boolean
  available: boolean
  downloading: boolean
  downloaded: boolean
  progress: {
    bytesPerSecond: number
    percent: number
    transferred: number
    total: number
  } | null
  version: string | null
  error: string | null
}

let updateStatus: UpdateStatus = {
  checking: false,
  available: false,
  downloading: false,
  downloaded: false,
  progress: null,
  version: null,
  error: null
}

let mainWindow: BrowserWindow | null = null

/**
 * Initialize auto-updater
 */
export function initUpdater(window: BrowserWindow): void {
  mainWindow = window

  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Events
  autoUpdater.on('checking-for-update', () => {
    updateStatus = {
      ...updateStatus,
      checking: true,
      available: false,
      downloaded: false,
      error: null
    }
    logger.info('Checking for updates...')
    notifyMainWindow('update:status', updateStatus)
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    updateStatus = {
      ...updateStatus,
      checking: false,
      available: true,
      version: info.version
    }
    logger.info('Update available', { version: info.version })
    notifyMainWindow('update:status', updateStatus)

    // Show notification
    showNotification('发现新版本', `v${info.version} 已发布，点击下载`)
  })

  autoUpdater.on('update-not-available', () => {
    updateStatus = {
      ...updateStatus,
      checking: false,
      available: false
    }
    logger.info('No updates available')
    notifyMainWindow('update:status', updateStatus)
  })

  autoUpdater.on('download-progress', (progress) => {
    updateStatus = {
      ...updateStatus,
      downloading: true,
      progress: {
        bytesPerSecond: progress.bytesPerSecond,
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total
      }
    }
    logger.debug('Download progress', { percent: progress.percent.toFixed(1) })
    notifyMainWindow('update:status', updateStatus)
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    updateStatus = {
      ...updateStatus,
      downloading: false,
      downloaded: true,
      version: info.version,
      progress: null
    }
    logger.info('Update downloaded', { version: info.version })
    notifyMainWindow('update:status', updateStatus)

    // Show notification
    showNotification('更新已下载', `v${info.version} 已准备就绪，点击安装`)
  })

  autoUpdater.on('error', (error) => {
    updateStatus = {
      ...updateStatus,
      checking: false,
      downloading: false,
      error: error.message
    }
    logger.error('Update error', error)
    notifyMainWindow('update:status', updateStatus)
  })

  logger.info('Auto-updater initialized')
}

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    logger.error('Failed to check for updates', error)
    updateStatus = {
      ...updateStatus,
      checking: false,
      error: error instanceof Error ? error.message : String(error)
    }
    notifyMainWindow('update:status', updateStatus)
  }
}

/**
 * Download update
 */
export async function downloadUpdate(): Promise<void> {
  if (!updateStatus.available) {
    logger.warn('No update available to download')
    return
  }

  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    logger.error('Failed to download update', error)
    updateStatus = {
      ...updateStatus,
      downloading: false,
      error: error instanceof Error ? error.message : String(error)
    }
    notifyMainWindow('update:status', updateStatus)
  }
}

/**
 * Install update and restart
 */
export function installUpdate(): void {
  if (!updateStatus.downloaded) {
    logger.warn('No update downloaded to install')
    return
  }

  logger.info('Installing update and restarting...')
  autoUpdater.quitAndInstall()
}

/**
 * Get current update status
 */
export function getUpdateStatus(): UpdateStatus {
  return { ...updateStatus }
}

/**
 * Notify main window of status change
 */
function notifyMainWindow(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

/**
 * Show notification
 */
function showNotification(title: string, body: string): void {
  const notification = new Notification({
    title,
    body,
    silent: false
  })

  notification.on('click', () => {
    if (updateStatus.downloaded) {
      installUpdate()
    } else if (updateStatus.available) {
      downloadUpdate()
    }
  })

  notification.show()
}
