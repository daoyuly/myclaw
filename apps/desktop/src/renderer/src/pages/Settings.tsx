import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Monitor, Bell, Moon, Sun, Globe, Download, RefreshCw, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { useAppStore } from '../stores/app'
import { checkUpdates, downloadUpdate, installUpdate } from '../services/api'

export function Settings() {
  const { updateStatus, gatewayStatus } = useAppStore()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
  const [notifications, setNotifications] = useState(true)
  const [autoStart, setAutoStart] = useState(false)
  const [minimizeToTray, setMinimizeToTray] = useState(true)
  const [checking, setChecking] = useState(false)

  async function handleCheckUpdates() {
    setChecking(true)
    await checkUpdates()
    setTimeout(() => setChecking(false), 1000)
  }

  async function handleDownloadUpdate() {
    await downloadUpdate()
  }

  async function handleInstallUpdate() {
    await installUpdate()
  }

  return (
    <div className="page settings">
      <header className="page__header">
        <h1>设置</h1>
      </header>

      <div className="settings__sections">
        {/* 外观 */}
        <section className="settings-section">
          <h2>
            <Monitor size={18} />
            外观
          </h2>
          <div className="settings-item">
            <div className="settings-item__info">
              <span className="label">主题</span>
              <span className="desc">选择应用外观主题</span>
            </div>
            <div className="theme-selector">
              <button 
                className={clsx('theme-btn', theme === 'light' && 'theme-btn--active')}
                onClick={() => setTheme('light')}
              >
                <Sun size={16} />
                浅色
              </button>
              <button 
                className={clsx('theme-btn', theme === 'dark' && 'theme-btn--active')}
                onClick={() => setTheme('dark')}
              >
                <Moon size={16} />
                深色
              </button>
              <button 
                className={clsx('theme-btn', theme === 'system' && 'theme-btn--active')}
                onClick={() => setTheme('system')}
              >
                <Monitor size={16} />
                系统
              </button>
            </div>
          </div>
        </section>

        {/* 通知 */}
        <section className="settings-section">
          <h2>
            <Bell size={18} />
            通知
          </h2>
          <div className="settings-item">
            <div className="settings-item__info">
              <span className="label">桌面通知</span>
              <span className="desc">接收消息和系统通知</span>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* 系统 */}
        <section className="settings-section">
          <h2>
            <Globe size={18} />
            系统
          </h2>
          <div className="settings-item">
            <div className="settings-item__info">
              <span className="label">开机自启动</span>
              <span className="desc">系统启动时自动运行 MyClaw</span>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="settings-item">
            <div className="settings-item__info">
              <span className="label">最小化到托盘</span>
              <span className="desc">关闭窗口时最小化到系统托盘</span>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={minimizeToTray}
                onChange={(e) => setMinimizeToTray(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* 更新 */}
        <section className="settings-section">
          <h2>
            <Download size={18} />
            软件更新
          </h2>
          <div className="settings-item">
            <div className="settings-item__info">
              <span className="label">当前版本</span>
              <span className="desc">v0.1.0</span>
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item__info">
              <span className="label">检查更新</span>
              <span className="desc">
                {updateStatus?.available 
                  ? `发现新版本 v${updateStatus.version}` 
                  : '检查是否有新版本可用'}
              </span>
            </div>
            <div className="update-actions">
              {!updateStatus?.available && !updateStatus?.downloaded && (
                <button 
                  className="btn btn--secondary"
                  onClick={handleCheckUpdates}
                  disabled={checking}
                >
                  <RefreshCw size={16} className={clsx(checking && 'spin')} />
                  {checking ? '检查中...' : '检查更新'}
                </button>
              )}
              {updateStatus?.available && !updateStatus?.downloaded && (
                <button 
                  className="btn btn--primary"
                  onClick={handleDownloadUpdate}
                >
                  <Download size={16} />
                  下载更新
                </button>
              )}
              {updateStatus?.downloaded && (
                <button 
                  className="btn btn--primary"
                  onClick={handleInstallUpdate}
                >
                  安装并重启
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 关于 */}
        <section className="settings-section">
          <h2>
            <Info size={18} />
            关于
          </h2>
          <div className="about-info">
            <div className="about-logo">🎋</div>
            <h3>MyClaw Desktop</h3>
            <p>简化版 OpenClaw 运行时</p>
            <p className="version">版本 0.1.0</p>
            <div className="about-links">
              <a href="https://github.com/openclaw/myclaw" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a href="https://docs.openclaw.ai" target="_blank" rel="noopener noreferrer">
                文档
              </a>
              <a href="https://discord.com/invite/clawd" target="_blank" rel="noopener noreferrer">
                社区
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
