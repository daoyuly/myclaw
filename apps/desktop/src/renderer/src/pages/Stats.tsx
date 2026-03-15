import { useState, useEffect } from 'react'
import { BarChart3, MessageSquare, Zap, Clock, TrendingUp } from 'lucide-react'
import { getStats } from '../services/api'
import type { UsageStats } from '../types'

export function Stats() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    setLoading(true)
    const res = await getStats()
    if (res.success && res.data) {
      setStats(res.data)
    }
    setLoading(false)
  }

  // 模拟数据（当没有真实数据时）
  const displayStats = stats || {
    totalMessages: 1234,
    totalTokens: 567890,
    totalSessions: 56,
    byProvider: {
      openai: { messages: 800, tokens: 400000 },
      anthropic: { messages: 434, tokens: 167890 },
    },
    byDay: [
      { date: '2026-03-07', messages: 150, tokens: 75000 },
      { date: '2026-03-08', messages: 180, tokens: 90000 },
      { date: '2026-03-09', messages: 220, tokens: 110000 },
      { date: '2026-03-10', messages: 190, tokens: 95000 },
      { date: '2026-03-11', messages: 210, tokens: 105000 },
      { date: '2026-03-12', messages: 160, tokens: 80000 },
      { date: '2026-03-13', messages: 124, tokens: 12890 },
    ],
  }

  const maxMessages = Math.max(...displayStats.byDay.map(d => d.messages))

  return (
    <div className="page stats">
      <header className="page__header">
        <h1>使用统计</h1>
        <p className="page__desc">查看 AI 助手的使用情况和性能指标</p>
      </header>

      {/* 概览卡片 */}
      <div className="stats__overview">
        <div className="stat-card">
          <div className="stat-card__icon">
            <MessageSquare size={24} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__value">{displayStats.totalMessages.toLocaleString()}</span>
            <span className="stat-card__label">总消息数</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">
            <Zap size={24} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__value">{displayStats.totalTokens.toLocaleString()}</span>
            <span className="stat-card__label">总 Token 数</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">
            <Clock size={24} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__value">{displayStats.totalSessions}</span>
            <span className="stat-card__label">会话数</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__value">
              {Math.round(displayStats.totalTokens / displayStats.totalMessages)}
            </span>
            <span className="stat-card__label">平均 Token/消息</span>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="stats__charts">
        {/* 每日使用量 */}
        <section className="chart-card">
          <h2>每日消息量</h2>
          <div className="bar-chart">
            {displayStats.byDay.map((day, index) => (
              <div key={day.date} className="bar-item">
                <div 
                  className="bar" 
                  style={{ height: `${(day.messages / maxMessages) * 100}%` }}
                  title={`${day.messages} 条消息`}
                >
                  <span className="bar-value">{day.messages}</span>
                </div>
                <span className="bar-label">{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 提供商分布 */}
        <section className="chart-card">
          <h2>提供商使用分布</h2>
          <div className="provider-distribution">
            {Object.entries(displayStats.byProvider).map(([provider, data]) => {
              const percentage = (data.messages / displayStats.totalMessages) * 100
              return (
                <div key={provider} className="distribution-item">
                  <div className="distribution-header">
                    <span className="provider-name">{provider}</span>
                    <span className="provider-percent">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="distribution-bar">
                    <div 
                      className="distribution-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="distribution-stats">
                    <span>{data.messages.toLocaleString()} 消息</span>
                    <span>{data.tokens.toLocaleString()} tokens</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* 详细数据 */}
      <section className="chart-card">
        <h2>每日详细数据</h2>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>消息数</th>
                <th>Token 数</th>
                <th>平均 Token/消息</th>
              </tr>
            </thead>
            <tbody>
              {displayStats.byDay.slice().reverse().map(day => (
                <tr key={day.date}>
                  <td>{day.date}</td>
                  <td>{day.messages.toLocaleString()}</td>
                  <td>{day.tokens.toLocaleString()}</td>
                  <td>{Math.round(day.tokens / day.messages)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
