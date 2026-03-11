import { GatewayLauncher, GatewayHealth, GatewayConfig } from '@myclaw/gateway'
import { createLogger } from '@myclaw/logger'
import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { mkdirSync } from 'fs'

const logger = createLogger('desktop:gateway')

let gateway: GatewayLauncher | null = null
let gatewayConfig: GatewayConfig | null = null

export interface GatewayStatus {
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error'
  pid?: number
  startedAt?: Date
  uptime?: number
  health?: GatewayHealth
  error?: string
}

/**
 * Get default OpenClaw path based on platform
 */
function getDefaultOpenClawPath(): string {
  const platform = process.platform

  if (platform === 'darwin') {
    // macOS: check common locations
    const paths = [
      '/usr/local/bin/openclaw',
      '/opt/homebrew/bin/openclaw',
      join(app.getPath('home'), '.nvm/versions/node/v24.11.1/bin/openclaw'),
    ]

    for (const p of paths) {
      if (existsSync(p)) return p
    }
  } else if (platform === 'win32') {
    // Windows
    return 'openclaw'
  } else {
    // Linux
    return '/usr/local/bin/openclaw'
  }

  // Fallback to PATH
  return 'openclaw'
}

/**
 * Get default config directory
 */
function getDefaultConfigDir(): string {
  const configDir = join(app.getPath('userData'), 'myclaw')

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
    logger.info('Created config directory', { path: configDir })
  }

  return configDir
}

/**
 * Initialize Gateway with configuration
 */
export function initGateway(config?: Partial<GatewayConfig>): GatewayLauncher {
  if (gateway) {
    logger.warn('Gateway already initialized')
    return gateway
  }

  const defaultConfig: GatewayConfig = {
    openclawPath: getDefaultOpenClawPath(),
    configDir: getDefaultConfigDir(),
    port: 3210,
    maxRestarts: 5,
    healthCheckInterval: 30000,
    enableMonitoring: true,
    envFile: join(getDefaultConfigDir(), '.env'),
  }

  gatewayConfig = { ...defaultConfig, ...config }
  gateway = new GatewayLauncher(gatewayConfig)

  // Setup event handlers
  gateway.on('starting', () => {
    logger.info('Gateway starting...')
  })

  gateway.on('started', ({ pid }) => {
    logger.info('Gateway started', { pid })
  })

  gateway.on('stopping', () => {
    logger.info('Gateway stopping...')
  })

  gateway.on('stopped', () => {
    logger.info('Gateway stopped')
  })

  gateway.on('crash', ({ code }) => {
    logger.error('Gateway crashed', { code })
  })

  gateway.on('error', (error) => {
    logger.error('Gateway error', error)
  })

  gateway.on('stats', (stats) => {
    logger.debug('Gateway stats', { stats })
  })

  logger.info('Gateway initialized', { config: gatewayConfig })
  return gateway
}

/**
 * Get Gateway instance
 */
export function getGateway(): GatewayLauncher | null {
  return gateway
}

/**
 * Start Gateway
 */
export async function startGateway(): Promise<void> {
  if (!gateway) {
    initGateway()
  }

  if (!gateway) {
    throw new Error('Failed to initialize gateway')
  }

  await gateway.start()
}

/**
 * Stop Gateway
 */
export async function stopGateway(): Promise<void> {
  if (!gateway) {
    logger.warn('Gateway not initialized')
    return
  }

  await gateway.stop()
}

/**
 * Restart Gateway
 */
export async function restartGateway(): Promise<void> {
  if (!gateway) {
    logger.warn('Gateway not initialized, starting...')
    await startGateway()
    return
  }

  await gateway.restart()
}

/**
 * Get Gateway status
 */
export async function getGatewayStatus(): Promise<GatewayStatus> {
  if (!gateway) {
    return {
      status: 'stopped',
      error: 'Gateway not initialized',
    }
  }

  try {
    const health = await gateway.getHealth()
    const state = gateway.getState()

    return {
      status: state.status,
      pid: state.pid,
      startedAt: state.startedAt,
      uptime: state.startedAt ? Date.now() - state.startedAt.getTime() : undefined,
      health,
      error: state.errorMessage,
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Get Gateway health
 */
export async function getGatewayHealth(): Promise<GatewayHealth> {
  if (!gateway) {
    return {
      status: 'unknown',
      lastCheck: new Date(),
      uptime: 0,
    }
  }

  return gateway.getHealth()
}

/**
 * Cleanup Gateway on app quit
 */
export async function cleanupGateway(): Promise<void> {
  if (gateway) {
    try {
      await gateway.stop()
      logger.info('Gateway cleaned up')
    } catch (error) {
      logger.error('Error cleaning up gateway', error)
    }
  }
}
