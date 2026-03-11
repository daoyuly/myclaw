import { useEffect, useState } from 'react'

interface AppStatus {
  version: string
  platform: string
  arch: string
  uptime: number
}

interface ElectronAPI {
  getAppStatus: () => Promise<AppStatus>
  showWindow: () => Promise<void>
  hideWindow: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

function App() {
  const [status, setStatus] = useState<AppStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadStatus() {
    try {
      const data = await window.electronAPI.getAppStatus()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">{error}</div>
      </div>
    )
  }

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
          </div>
        </section>

        <section className="card">
          <h2>Gateway 状态</h2>
          <div className="service-status">
            <span className="status-dot inactive"></span>
            <span>未启动</span>
          </div>
          <button className="btn">启动 Gateway</button>
        </section>
      </main>

      <footer className="footer">
        <p>MyClaw v0.1.0 • OpenClaw Runtime</p>
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

export default App
