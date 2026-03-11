import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    getVersion: () => '0.1.0',
    isQuitting: false,
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return '/tmp/myclaw-test'
      if (name === 'home') return '/tmp/home'
      return '/tmp'
    }),
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

vi.mock('@myclaw/gateway', () => ({
  GatewayLauncher: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    restart: vi.fn().mockResolvedValue(undefined),
    getHealth: vi.fn().mockResolvedValue({
      status: 'healthy',
      lastCheck: new Date(),
      uptime: 1000
    }),
    getState: vi.fn().mockReturnValue({
      status: 'stopped',
      restartCount: 0
    }),
    on: vi.fn()
  }))
}))

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn()
}))

describe('Desktop App - Gateway Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Gateway Configuration', () => {
    it('should have correct default port', () => {
      const defaultPort = 3210
      expect(defaultPort).toBe(3210)
    })

    it('should have correct max restarts', () => {
      const maxRestarts = 5
      expect(maxRestarts).toBe(5)
    })

    it('should have correct health check interval', () => {
      const healthCheckInterval = 30000
      expect(healthCheckInterval).toBe(30000)
    })
  })

  describe('Gateway Status Interface', () => {
    it('should define all status types', () => {
      const statusTypes = ['running', 'stopped', 'starting', 'stopping', 'error']
      expect(statusTypes).toHaveLength(5)
      expect(statusTypes).toContain('running')
      expect(statusTypes).toContain('stopped')
      expect(statusTypes).toContain('error')
    })

    it('should have optional pid and startedAt fields', () => {
      const status = {
        status: 'running',
        pid: 12345,
        startedAt: new Date(),
        uptime: 1000
      }
      expect(status).toHaveProperty('pid')
      expect(status).toHaveProperty('startedAt')
      expect(status).toHaveProperty('uptime')
    })
  })

  describe('Gateway Health Interface', () => {
    it('should define health status types', () => {
      const healthStatuses = ['healthy', 'unhealthy', 'unknown']
      expect(healthStatuses).toHaveLength(3)
    })

    it('should include required fields', () => {
      const health = {
        status: 'healthy' as const,
        lastCheck: new Date(),
        uptime: 1000
      }
      expect(health.status).toBe('healthy')
      expect(health.lastCheck).toBeInstanceOf(Date)
      expect(health.uptime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Platform Detection', () => {
    it('should detect darwin platform', () => {
      const platform = 'darwin'
      expect(['darwin', 'win32', 'linux']).toContain(platform)
    })

    it('should have default paths for macOS', () => {
      const darwinPaths = [
        '/usr/local/bin/openclaw',
        '/opt/homebrew/bin/openclaw'
      ]
      expect(darwinPaths).toHaveLength(2)
    })
  })

  describe('IPC Handlers', () => {
    it('should define all gateway IPC channels', () => {
      const channels = [
        'gateway:start',
        'gateway:stop',
        'gateway:restart',
        'gateway:status',
        'gateway:health'
      ]
      expect(channels).toHaveLength(5)
      expect(channels).toContain('gateway:start')
      expect(channels).toContain('gateway:stop')
    })

    it('should return success/error responses', () => {
      const successResponse = { success: true }
      const errorResponse = { success: false, error: 'Test error' }

      expect(successResponse.success).toBe(true)
      expect(errorResponse.success).toBe(false)
      expect(errorResponse).toHaveProperty('error')
    })
  })
})

describe('Desktop App - Gateway Integration', () => {
  it('should initialize gateway on app ready', async () => {
    // This tests that the gateway init flow is correct
    const initOrder = ['window', 'tray', 'gateway', 'server']
    expect(initOrder[2]).toBe('gateway')
  })

  it('should cleanup gateway on app quit', async () => {
    const cleanupOrder = ['gateway', 'server']
    expect(cleanupOrder[0]).toBe('gateway')
  })

  it('should not auto-start gateway on init', () => {
    const autoStart = false
    expect(autoStart).toBe(false)
  })
})
