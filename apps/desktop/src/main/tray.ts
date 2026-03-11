import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import { join } from 'path'
import { createLogger } from '@myclaw/logger'

const logger = createLogger('desktop:tray')

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow): Tray {
  // 创建托盘图标（使用默认图标）
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADlSURBVDiNpZMxCsJAEEXfJoWFnkDwBHoCj+IJPIWtN/AaHsENPIWtvAQn0ykUwo1YSDuJhWQnjT3xzvCd2e4PyIT5gU/w3/OGAfg0gVfBgqpYDC4EV6pm4O8A7g5wAljOANZNgLSqRDgHOANw1QCslgCyCgFZ9f9pAM5dA84tgNdV4NgC7JYBswqwdQHWNEDWJcCuKsD2Mti0uH2hgC3SbRhgdYB1DbBpAtsuAa0aYLMF2DQDthsA7RpgswXYdAO2XAD1LcD1b5O8Q/8B3DZ0lxH0P+0AAAAASUVORK5CYII='
  )

  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: (): void => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    {
      label: '隐藏窗口',
      click: (): void => {
        mainWindow.hide()
      }
    },
    { type: 'separator' },
    {
      label: '重启服务',
      click: (): void => {
        logger.info('Restarting services...')
        // TODO: Implement service restart
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: (): void => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('MyClaw Desktop')
  tray.setContextMenu(contextMenu)

  // 点击托盘图标显示/隐藏窗口
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  logger.info('Tray created')
  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
    logger.info('Tray destroyed')
  }
}
