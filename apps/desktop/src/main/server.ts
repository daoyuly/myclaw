import express, { Express, Request, Response } from 'express'
import { createLogger } from '@myclaw/logger'
import { getGatewayStatus, getGatewayHealth } from './gateway'

const logger = createLogger('desktop:server')

const PORT = 3210
let server: ReturnType<Express['listen']> | null = null

export async function startServer(): Promise<void> {
  const app = express()

  // Middleware
  app.use(express.json())

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  })

  // App status endpoint
  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({
      app: 'myclaw-desktop',
      version: process.env.npm_package_version || '0.1.0',
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
      uptime: process.uptime(),
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss
      }
    })
  })

  // Gateway status endpoint
  app.get('/api/gateway', async (_req: Request, res: Response) => {
    try {
      const status = await getGatewayStatus()
      const health = await getGatewayHealth()
      res.json({
        ...status,
        health
      })
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  return new Promise((resolve, reject) => {
    server = app.listen(PORT, () => {
      logger.info(`Local server running at http://localhost:${PORT}`)
      logger.info(`Health check: http://localhost:${PORT}/health`)
      logger.info(`API status: http://localhost:${PORT}/api/status`)
      resolve()
    })

    server.on('error', (error: Error) => {
      logger.error('Server error:', error)
      reject(error)
    })
  })
}

export async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        logger.info('Server stopped')
        server = null
        resolve()
      })
    } else {
      resolve()
    }
  })
}
