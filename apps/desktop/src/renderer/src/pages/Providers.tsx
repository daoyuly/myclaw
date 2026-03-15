import { useState, useEffect } from 'react'
import { Bot, Settings, Key, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAppStore } from '../stores/app'
import { getProviders, updateProvider } from '../services/api'
import { clsx } from 'clsx'
import type { LLMProvider, LLMProviderType } from '../types'

const PROVIDER_INFO: Record<LLMProviderType, { name: string; description: string; models: string[] }> = {
  openai: { 
    name: 'OpenAI', 
    description: 'GPT-4, GPT-3.5 等模型', 
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] 
  },
  anthropic: { 
    name: 'Anthropic', 
    description: 'Claude 系列模型', 
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] 
  },
  gemini: { 
    name: 'Google Gemini', 
    description: 'Google 最新多模态模型', 
    models: ['gemini-pro', 'gemini-pro-vision'] 
  },
  zhipu: { 
    name: '智谱 AI', 
    description: 'GLM 系列国产模型', 
    models: ['glm-4', 'glm-3-turbo'] 
  },
  moonshot: { 
    name: 'Moonshot', 
    description: 'Kimi 长文本模型', 
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] 
  },
  deepseek: { 
    name: 'DeepSeek', 
    description: '深度求索开源模型', 
    models: ['deepseek-chat', 'deepseek-coder'] 
  },
  ollama: { 
    name: 'Ollama', 
    description: '本地运行开源模型', 
    models: ['llama2', 'mistral', 'codellama'] 
  },
}

export function Providers() {
  const { providers, setProviders } = useAppStore()
  const [editing, setEditing] = useState<LLMProvider | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProviders()
  }, [])

  async function loadProviders() {
    const res = await getProviders()
    if (res.success && res.data) {
      setProviders(res.data)
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    const res = await updateProvider(id, { enabled })
    if (res.success && res.data) {
      setProviders(providers.map(p => p.id === id ? { ...p, enabled } : p))
    }
  }

  async function handleUpdate(id: string, updates: Partial<LLMProvider>) {
    setLoading(true)
    const res = await updateProvider(id, updates)
    if (res.success && res.data) {
      setProviders(providers.map(p => p.id === id ? res.data! : p))
      setEditing(null)
    }
    setLoading(false)
  }

  // 如果没有数据，显示所有可用提供商
  const displayProviders = providers.length > 0 
    ? providers 
    : Object.entries(PROVIDER_INFO).map(([type, info], index) => ({
        id: `provider-${type}`,
        type: type as LLMProviderType,
        name: info.name,
        enabled: false,
        priority: index,
        config: {},
      }))

  return (
    <div className="page providers">
      <header className="page__header">
        <h1>LLM 提供商</h1>
        <p className="page__desc">配置和管理您的 AI 模型提供商</p>
      </header>

      <div className="providers__grid">
        {displayProviders.map(provider => {
          const info = PROVIDER_INFO[provider.type]
          return (
            <div key={provider.id} className={clsx('provider-card', !provider.enabled && 'provider-card--disabled')}>
              <div className="provider-card__header">
                <div className="provider-card__icon">
                  <Bot size={24} />
                </div>
                <div className="provider-card__info">
                  <h3>{info?.name || provider.name}</h3>
                  <p>{info?.description}</p>
                </div>
                <button
                  className="btn btn--icon"
                  onClick={() => handleToggle(provider.id, !provider.enabled)}
                  title={provider.enabled ? '禁用' : '启用'}
                >
                  {provider.enabled ? (
                    <ToggleRight size={24} className="toggle-on" />
                  ) : (
                    <ToggleLeft size={24} className="toggle-off" />
                  )}
                </button>
              </div>

              <div className="provider-card__body">
                <div className="provider-card__field">
                  <label>
                    <Key size={14} />
                    API Key
                  </label>
                  <span className="value">
                    {provider.apiKey ? '••••••••' + provider.apiKey.slice(-4) : '未配置'}
                  </span>
                </div>
                <div className="provider-card__field">
                  <label>模型</label>
                  <span className="value">{provider.model || '默认'}</span>
                </div>
                <div className="provider-card__field">
                  <label>优先级</label>
                  <span className="value">{provider.priority}</span>
                </div>
              </div>

              <div className="provider-card__footer">
                <button 
                  className="btn btn--secondary btn--small"
                  onClick={() => setEditing(provider)}
                >
                  <Settings size={14} />
                  配置
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 编辑弹窗 */}
      {editing && (
        <ProviderForm
          provider={editing}
          onSubmit={(updates) => handleUpdate(editing.id, updates)}
          onClose={() => setEditing(null)}
          loading={loading}
        />
      )}
    </div>
  )
}

interface ProviderFormProps {
  provider: LLMProvider
  onSubmit: (updates: Partial<LLMProvider>) => void
  onClose: () => void
  loading: boolean
}

function ProviderForm({ provider, onSubmit, onClose, loading }: ProviderFormProps) {
  const info = PROVIDER_INFO[provider.type]
  const [apiKey, setApiKey] = useState(provider.apiKey || '')
  const [model, setModel] = useState(provider.model || '')
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl || '')
  const [priority, setPriority] = useState(provider.priority)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ apiKey, model, baseUrl, priority })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>配置 {info?.name || provider.name}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div className="form-group">
            <label>模型</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="">默认</option>
              {info?.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Base URL (可选)</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com"
            />
          </div>
          <div className="form-group">
            <label>优先级</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              min={0}
              max={100}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
