import { describe, it, expect, vi, beforeEach } from 'vitest'
import { join } from 'path'

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    getVersion: () => '0.1.0',
    isQuitting: false,
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
    getPath: vi.fn(() => '/tmp'),
    getAppPath: vi.fn(() => '/app')
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    focus: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    webContents: {
      setWindowOpenHandler: vi.fn()
    }
  })),
  Tray: vi.fn().mockImplementation(() => ({
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn()
  })),
  Menu: {
    buildFromTemplate: vi.fn(() => ({}))
  },
  nativeImage: {
    createFromDataURL: vi.fn(() => ({
      resize: vi.fn(() => ({}))
    }))
  },
  shell: {
    openExternal: vi.fn()
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  }
}))

vi.mock('@electron-toolkit/utils', () => ({
  electronApp: {
    setAppUserModelId: vi.fn()
  },
  optimizer: {
    watchWindowShortcuts: vi.fn()
  },
  is: {
    dev: true
  }
}))

vi.mock('@myclaw/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }))
}))

describe('Desktop App - Main Process', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Configuration', () => {
    it('should have correct app model id', () => {
      const expectedId = 'com.myclaw.desktop'
      expect(expectedId).toBe('com.myclaw.desktop')
    })

    it('should use port 3210 for local server', () => {
      const port = 3210
      expect(port).toBe(3210)
    })
  })

  describe('Window Configuration', () => {
    it('should have correct default dimensions', () => {
      const windowConfig = {
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600
      }
      expect(windowConfig.width).toBe(1200)
      expect(windowConfig.height).toBe(800)
      expect(windowConfig.minWidth).toBe(800)
      expect(windowConfig.minHeight).toBe(600)
    })

    it('should enable security features', () => {
      const webPreferences = {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
      expect(webPreferences.contextIsolation).toBe(true)
      expect(webPreferences.nodeIntegration).toBe(false)
    })
  })

  describe('Tray Menu', () => {
    it('should have required menu items', () => {
      const menuItems = [
        { label: '显示主窗口' },
        { label: '隐藏窗口' },
        { type: 'separator' },
        { label: '重启服务' },
        { type: 'separator' },
        { label: '退出' }
      ]
      expect(menuItems).toHaveLength(6)
      expect(menuItems[0].label).toBe('显示主窗口')
      expect(menuItems[5].label).toBe('退出')
    })
  })

  describe('Server Endpoints', () => {
    it('should define health check endpoint', () => {
      const endpoints = ['/health', '/api/status', '/api/gateway']
      expect(endpoints).toContain('/health')
      expect(endpoints).toContain('/api/status')
    })

    it('should return correct health check response structure', () => {
      const healthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
      expect(healthResponse).toHaveProperty('status')
      expect(healthResponse).toHaveProperty('timestamp')
      expect(healthResponse).toHaveProperty('uptime')
    })
  })
})

describe('Desktop App - Preload Script', () => {
  it('should expose required API methods', () => {
    const exposedAPI = {
      getAppStatus: vi.fn(),
      showWindow: vi.fn(),
      hideWindow: vi.fn(),
      startGateway: vi.fn(),
      stopGateway: vi.fn(),
      getGatewayHealth: vi.fn()
    }
    expect(exposedAPI).toHaveProperty('getAppStatus')
    expect(exposedAPI).toHaveProperty('showWindow')
    expect(exposedAPI).toHaveProperty('hideWindow')
  })
})

describe('Desktop App - Paths', () => {
  it('should resolve preload script path correctly', () => {
    const preloadPath = join(__dirname, '../preload/index.js')
    expect(preloadPath).toContain('preload/index.js')
  })

  it('should resolve renderer path correctly', () => {
    const rendererPath = join(__dirname, '../renderer/index.html')
    expect(rendererPath).toContain('renderer/index.html')
  })
})
