import { useEffect, useState } from 'react'

interface AppStatus {
  version: string
  platform: string
  arch: string
  uptime: number
}

interface GatewayStatus {
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error'
  pid?: number
  startedAt?: string
  uptime?: number
  error?: string
  health?: {
    status: 'healthy' | 'unhealthy' | 'unknown'
    lastCheck: string
    uptime: number
  }
}

interface UpdateStatus {
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

interface ElectronAPI {
  getAppStatus: () => Promise<AppStatus>
  showWindow: () => Promise<void>
  hideWindow: () => Promise<void>
  startGateway: () => Promise<{ success: boolean; error?: string }>
  stopGateway: () => Promise<{ success: boolean; error?: string }>
  restartGateway: () => Promise<{ success: boolean; error?: string }>
  getGatewayStatus: () => Promise<GatewayStatus>
  getGatewayHealth: () => Promise<GatewayStatus['health']>
  checkForUpdates: () => Promise<{ success: boolean; error?: string }>
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>
  installUpdate: () => Promise<{ success: boolean }>
  getUpdateStatus: () => Promise<UpdateStatus>
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

function App() {
  const [status, setStatus] = useState<AppStatus | null>(null)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [gatewayLoading, setGatewayLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 5000)

    // Listen for update status changes
    window.electronAPI.onUpdateStatus((status) => {
      setUpdateStatus(status)
    })

    return () => clearInterval(interval)
  }, [])

  async function loadStatus() {
    try {
      const [appData, gatewayData, updateData] = await Promise.all([
        window.electronAPI.getAppStatus(),
        window.electronAPI.getGatewayStatus(),
        window.electronAPI.getUpdateStatus()
      ])
      setStatus(appData)
      setGatewayStatus(gatewayData)
      setUpdateStatus(updateData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status')
    } finally {
      setLoading(false)
    }
  }

  async function handleStartGateway() {
    setGatewayLoading(true)
    try {
      const result = await window.electronAPI.startGateway()
      if (!result.success) {
        setError(result.error || 'Failed to start gateway')
      }
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start gateway')
    } finally {
      setGatewayLoading(false)
    }
  }

  async function handleStopGateway() {
    setGatewayLoading(true)
    try {
      const result = await window.electronAPI.stopGateway()
      if (!result.success) {
        setError(result.error || 'Failed to stop gateway')
      }
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop gateway')
    } finally {
      setGatewayLoading(false)
    }
  }

  async function handleRestartGateway() {
    setGatewayLoading(true)
    try {
      const result = await window.electronAPI.restartGateway()
      if (!result.success) {
        setError(result.error || 'Failed to restart gateway')
      }
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart gateway')
    } finally {
      setGatewayLoading(false)
    }
  }

  async function handleCheckUpdates() {
    setUpdateLoading(true)
    try {
      const result = await window.electronAPI.checkForUpdates()
      if (!result.success) {
        setError(result.error || 'Failed to check for updates')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates')
    } finally {
      setUpdateLoading(false)
    }
  }

  async function handleDownloadUpdate() {
    setUpdateLoading(true)
    try {
      const result = await window.electronAPI.downloadUpdate()
      if (!result.success) {
        setError(result.error || 'Failed to download update')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download update')
    } finally {
      setUpdateLoading(false)
    }
  }

  async function handleInstallUpdate() {
    await window.electronAPI.installUpdate()
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  const isGatewayRunning = gatewayStatus?.status === 'running'
  const isGatewayStarting = gatewayStatus?.status === 'starting'
  const isGatewayStopping = gatewayStatus?.status === 'stopping'

  return (
    <div className="app">
      <header className="header">
        <h1>🎋 MyClaw Desktop</h1>
        <p>简化版 OpenClaw 运行时</p>
      </header>

      <main className="main">
        <section className="card">
          <h2>应用状态</h2>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">版本</span>
              <span className="value">{status?.version}</span>
            </div>
            <div className="status-item">
              <span className="label">平台</span>
              <span className="value">{status?.platform} ({status?.arch})</span>
            </div>
            <div className="status-item">
              <span className="label">运行时间</span>
              <span className="value">{formatUptime(status?.uptime || 0)}</span>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>本地服务</h2>
          <div className="service-status">
            <span className="status-dot active"></span>
            <span>HTTP Server: http://localhost:3210</span>
          </div>
          <div className="endpoints">
            <a href="http://localhost:3210/health" target="_blank" rel="noopener noreferrer">
              /health
            </a>
            <a href="http://localhost:3210/api/status" target="_blank" rel="noopener noreferrer">
              /api/status
            </a>
            <a href="http://localhost:3210/api/gateway" target="_blank" rel="noopener noreferrer">
              /api/gateway
            </a>
          </div>
        </section>

        <section className="card">
          <h2>Gateway 状态</h2>
          <div className="service-status">
            <span className={`status-dot ${isGatewayRunning ? 'active' : isGatewayStarting ? 'starting' : 'inactive'}`}></span>
            <span>{getGatewayStatusText(gatewayStatus?.status)}</span>
            {gatewayStatus?.pid && (
              <span className="pid">PID: {gatewayStatus.pid}</span>
            )}
          </div>

          {gatewayStatus?.error && (
            <div className="error-message">
              ⚠️ {gatewayStatus.error}
            </div>
          )}

          {isGatewayRunning && gatewayStatus?.uptime && (
            <div className="gateway-info">
              <span>运行时间: {formatUptime(gatewayStatus.uptime / 1000)}</span>
              {gatewayStatus.health && (
                <span className="health-status">
                  健康: {gatewayStatus.health.status === 'healthy' ? '✅' : '⚠️'}
                </span>
              )}
            </div>
          )}

          <div className="button-group">
            {!isGatewayRunning && !isGatewayStarting && (
              <button
                className="btn btn-primary"
                onClick={handleStartGateway}
                disabled={gatewayLoading}
              >
                {gatewayLoading ? '启动中...' : '启动 Gateway'}
              </button>
            )}

            {isGatewayRunning && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={handleRestartGateway}
                  disabled={gatewayLoading}
                >
                  重启
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleStopGateway}
                  disabled={gatewayLoading || isGatewayStopping}
                >
                  {isGatewayStopping ? '停止中...' : '停止'}
                </button>
              </>
            )}

            {isGatewayStarting && (
              <button className="btn" disabled>
                启动中...
              </button>
            )}
          </div>
        </section>

        <section className="card">
          <h2>软件更新</h2>
          
          {updateStatus?.error && (
            <div className="error-message">
              ⚠️ {updateStatus.error}
            </div>
          )}

          {updateStatus?.checking && (
            <div className="service-status">
              <span className="status-dot starting"></span>
              <span>检查更新中...</span>
            </div>
          )}

          {updateStatus?.available && !updateStatus.downloaded && (
            <div className="service-status">
              <span className="status-dot active"></span>
              <span>发现新版本 v{updateStatus.version}</span>
            </div>
          )}

          {updateStatus?.downloading && updateStatus.progress && (
            <div className="download-progress">
              <span>下载中: {updateStatus.progress.percent.toFixed(1)}%</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${updateStatus.progress.percent}%` }}
                ></div>
              </div>
              <span className="progress-speed">
                {formatBytes(updateStatus.progress.bytesPerSecond)}/s
              </span>
            </div>
          )}

          {updateStatus?.downloaded && (
            <div className="service-status">
              <span className="status-dot active"></span>
              <span>更新已就绪 v{updateStatus.version}</span>
            </div>
          )}

          {!updateStatus?.checking && !updateStatus?.available && !updateStatus?.downloaded && (
            <div className="service-status">
              <span className="status-dot inactive"></span>
              <span>已是最新版本</span>
            </div>
          )}

          <div className="button-group">
            {!updateStatus?.available && !updateStatus?.checking && (
              <button
                className="btn btn-secondary"
                onClick={handleCheckUpdates}
                disabled={updateLoading}
              >
                检查更新
              </button>
            )}

            {updateStatus?.available && !updateStatus?.downloaded && !updateStatus?.downloading && (
              <button
                className="btn btn-primary"
                onClick={handleDownloadUpdate}
                disabled={updateLoading}
              >
                下载更新
              </button>
            )}

            {updateStatus?.downloaded && (
              <button
                className="btn btn-primary"
                onClick={handleInstallUpdate}
              >
                安装并重启
              </button>
            )}
          </div>
        </section>

        {error && (
          <section className="card error-card">
            <p>❌ {error}</p>
            <button className="btn btn-small" onClick={() => setError(null)}>
              关闭
            </button>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>MyClaw v{status?.version} • OpenClaw Runtime</p>
      </footer>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getGatewayStatusText(status?: GatewayStatus['status']): string {
  switch (status) {
    case 'running':
      return '运行中'
    case 'starting':
      return '启动中...'
    case 'stopping':
      return '停止中...'
    case 'error':
      return '错误'
    case 'stopped':
    default:
      return '已停止'
  }
}

export default App
