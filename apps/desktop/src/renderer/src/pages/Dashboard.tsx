import { useEffect, useState } from 'react'
import { 
  Activity, 
  Server, 
  Cpu, 
  HardDrive,
  Play,
  Square,
  RotateCcw,
  RefreshCw,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAppStore } from '../stores/app'
import { getAppStatus, startGateway, stopGateway, restartGateway } from '../services/api'
import type { AppStatus } from '../types'

export function Dashboard() {
  const { gatewayStatus, setGatewayStatus } = useAppStore()
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadStatus() {
    const res = await getAppStatus()
    if (res.success && res.data) {
      setAppStatus(res.data)
    }
  }

  async function handleStart() {
    setLoading(true)
    await startGateway()
    setTimeout(() => {
      loadStatus()
      setLoading(false)
    }, 1000)
  }

  async function handleStop() {
    setLoading(true)
    await stopGateway()
    setTimeout(() => {
      loadStatus()
      setLoading(false)
    }, 500)
  }

  async function handleRestart() {
    setLoading(true)
    await restartGateway()
    setTimeout(() => {
      loadStatus()
      setLoading(false)
    }, 1500)
  }

  const isRunning = gatewayStatus?.status === 'running'
  const isStarting = gatewayStatus?.status === 'starting'
  const isStopping = gatewayStatus?.status === 'stopping'

  return (
    <div className="page dashboard">
      <header className="page__header">
        <h1>概览</h1>
        <button className="btn btn--icon" onClick={loadStatus} title="刷新">
          <RefreshCw size={18} />
        </button>
      </header>

      <div className="dashboard__grid">
        {/* 系统状态 */}
        <section className="card">
          <h2 className="card__title">
            <Server size={18} />
            系统状态
          </h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">版本</span>
              <span className="stat-value">{appStatus?.version || '-'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">平台</span>
              <span className="stat-value">{appStatus?.platform} ({appStatus?.arch})</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">运行时间</span>
              <span className="stat-value">{formatUptime(appStatus?.uptime || 0)}</span>
            </div>
          </div>
        </section>

        {/* Gateway 控制 */}
        <section className="card">
          <h2 className="card__title">
            <Activity size={18} />
            Gateway 状态
          </h2>
          <div className="gateway-status">
            <div className="status-indicator">
              <span className={clsx(
                'status-badge',
                isRunning ? 'status-badge--success' : 
                isStarting || isStopping ? 'status-badge--warning' : 
                'status-badge--default'
              )}>
                {getStatusText(gatewayStatus?.status)}
              </span>
              {gatewayStatus?.pid && (
                <span className="pid">PID: {gatewayStatus.pid}</span>
              )}
            </div>

            {gatewayStatus?.error && (
              <div className="error-box">
                ⚠️ {gatewayStatus.error}
              </div>
            )}

            {isRunning && gatewayStatus?.uptime && (
              <div className="info-row">
                <span>运行时间: {formatUptime(gatewayStatus.uptime / 1000)}</span>
                {gatewayStatus.health && (
                  <span className={clsx(
                    'health-badge',
                    gatewayStatus.health.status === 'healthy' ? 'health-badge--ok' : 'health-badge--warn'
                  )}>
                    {gatewayStatus.health.status === 'healthy' ? '✅ 健康' : '⚠️ 异常'}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="button-group">
            {!isRunning && !isStarting && (
              <button 
                className="btn btn--primary"
                onClick={handleStart}
                disabled={loading}
              >
                <Play size={16} />
                启动 Gateway
              </button>
            )}

            {isRunning && (
              <>
                <button 
                  className="btn btn--secondary"
                  onClick={handleRestart}
                  disabled={loading}
                >
                  <RotateCcw size={16} />
                  重启
                </button>
                <button 
                  className="btn btn--danger"
                  onClick={handleStop}
                  disabled={loading || isStopping}
                >
                  <Square size={16} />
                  停止
                </button>
              </>
            )}

            {(isStarting || isStopping) && (
              <button className="btn" disabled>
                {isStarting ? '启动中...' : '停止中...'}
              </button>
            )}
          </div>
        </section>

        {/* 资源使用 */}
        <section className="card">
          <h2 className="card__title">
            <Cpu size={18} />
            资源使用
          </h2>
          <div className="resource-grid">
            <div className="resource-item">
              <HardDrive size={24} />
              <div className="resource-info">
                <span className="resource-label">CPU</span>
                <span className="resource-value">-</span>
              </div>
            </div>
            <div className="resource-item">
              <HardDrive size={24} />
              <div className="resource-info">
                <span className="resource-label">内存</span>
                <span className="resource-value">-</span>
              </div>
            </div>
          </div>
          <p className="resource-note">资源监控需要 Gateway 运行时才能显示</p>
        </section>

        {/* 快捷入口 */}
        <section className="card">
          <h2 className="card__title">
            快捷入口
          </h2>
          <div className="quick-links">
            <a 
              href="http://localhost:3210/health" 
              target="_blank" 
              rel="noopener noreferrer"
              className="quick-link"
            >
              /health
            </a>
            <a 
              href="http://localhost:3210/api/status" 
              target="_blank" 
              rel="noopener noreferrer"
              className="quick-link"
            >
              /api/status
            </a>
            <a 
              href="http://localhost:3210/api/gateway" 
              target="_blank" 
              rel="noopener noreferrer"
              className="quick-link"
            >
              /api/gateway
            </a>
          </div>
        </section>
      </div>
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

function getStatusText(status?: string): string {
  switch (status) {
    case 'running': return '运行中'
    case 'starting': return '启动中'
    case 'stopping': return '停止中'
    case 'error': return '错误'
    default: return '已停止'
  }
}
