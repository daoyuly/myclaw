import { useState, useEffect } from 'react'
import { Radio, Settings, ToggleLeft, ToggleRight, MessageCircle, Users, Send } from 'lucide-react'
import { useAppStore } from '../stores/app'
import { getChannels, updateChannel } from '../services/api'
import { clsx } from 'clsx'
import type { Channel, ChannelType } from '../types'

const CHANNEL_INFO: Record<ChannelType, { name: string; icon: typeof MessageCircle; description: string }> = {
  telegram: { 
    name: 'Telegram', 
    icon: Send, 
    description: 'Telegram Bot API' 
  },
  discord: { 
    name: 'Discord', 
    icon: Users, 
    description: 'Discord Bot' 
  },
  whatsapp: { 
    name: 'WhatsApp', 
    icon: MessageCircle, 
    description: 'WhatsApp Business API' 
  },
  signal: { 
    name: 'Signal', 
    icon: Radio, 
    description: 'Signal CLI' 
  },
  feishu: { 
    name: '飞书', 
    icon: MessageCircle, 
    description: '飞书机器人' 
  },
  webchat: { 
    name: 'Web Chat', 
    icon: MessageCircle, 
    description: '内置网页聊天' 
  },
}

export function Channels() {
  const { channels, setChannels } = useAppStore()
  const [editing, setEditing] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadChannels()
  }, [])

  async function loadChannels() {
    const res = await getChannels()
    if (res.success && res.data) {
      setChannels(res.data)
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    const res = await updateChannel(id, { enabled })
    if (res.success && res.data) {
      setChannels(channels.map(c => c.id === id ? { ...c, enabled } : c))
    }
  }

  async function handleUpdate(id: string, updates: Partial<Channel>) {
    setLoading(true)
    const res = await updateChannel(id, updates)
    if (res.success && res.data) {
      setChannels(channels.map(c => c.id === id ? res.data! : c))
      setEditing(null)
    }
    setLoading(false)
  }

  // 显示所有可用通道
  const displayChannels = channels.length > 0 
    ? channels 
    : Object.entries(CHANNEL_INFO).map(([type, info]) => ({
        id: `channel-${type}`,
        type: type as ChannelType,
        name: info.name,
        enabled: type === 'webchat',
        config: {},
      }))

  return (
    <div className="page channels">
      <header className="page__header">
        <h1>消息通道</h1>
        <p className="page__desc">配置 AI 助手的消息接入渠道</p>
      </header>

      <div className="channels__grid">
        {displayChannels.map(channel => {
          const info = CHANNEL_INFO[channel.type]
          const Icon = info?.icon || Radio
          return (
            <div key={channel.id} className={clsx('channel-card', !channel.enabled && 'channel-card--disabled')}>
              <div className="channel-card__header">
                <div className="channel-card__icon">
                  <Icon size={24} />
                </div>
                <div className="channel-card__info">
                  <h3>{info?.name || channel.name}</h3>
                  <p>{info?.description}</p>
                </div>
                <button
                  className="btn btn--icon"
                  onClick={() => handleToggle(channel.id, !channel.enabled)}
                  title={channel.enabled ? '禁用' : '启用'}
                >
                  {channel.enabled ? (
                    <ToggleRight size={24} className="toggle-on" />
                  ) : (
                    <ToggleLeft size={24} className="toggle-off" />
                  )}
                </button>
              </div>

              <div className="channel-card__status">
                <span className={clsx('status-dot', channel.enabled && 'status-dot--active')} />
                <span>{channel.enabled ? '已启用' : '未启用'}</span>
              </div>

              <div className="channel-card__footer">
                <button 
                  className="btn btn--secondary btn--small"
                  onClick={() => setEditing(channel)}
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
        <ChannelForm
          channel={editing}
          onSubmit={(updates) => handleUpdate(editing.id, updates)}
          onClose={() => setEditing(null)}
          loading={loading}
        />
      )}
    </div>
  )
}

interface ChannelFormProps {
  channel: Channel
  onSubmit: (updates: Partial<Channel>) => void
  onClose: () => void
  loading: boolean
}

function ChannelForm({ channel, onSubmit, onClose, loading }: ChannelFormProps) {
  const info = CHANNEL_INFO[channel.type]
  
  // 根据通道类型显示不同配置项
  const configFields = getConfigFields(channel.type)
  const [config, setConfig] = useState(channel.config)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ config })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>配置 {info?.name || channel.name}</h2>
        <form onSubmit={handleSubmit}>
          {configFields.map(field => (
            <div key={field.key} className="form-group">
              <label>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  value={(config[field.key] as string) || ''}
                  onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  rows={3}
                />
              ) : (
                <input
                  type={field.type}
                  value={(config[field.key] as string) || ''}
                  onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
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

function getConfigFields(type: ChannelType): Array<{ key: string; label: string; type: string; placeholder?: string }> {
  switch (type) {
    case 'telegram':
      return [
        { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: '123456:ABC...' },
        { key: 'chatId', label: 'Chat ID', type: 'text', placeholder: '-1001234567890' },
      ]
    case 'discord':
      return [
        { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'OTk...' },
        { key: 'clientId', label: 'Client ID', type: 'text' },
        { key: 'guildId', label: 'Guild ID (可选)', type: 'text' },
      ]
    case 'whatsapp':
      return [
        { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text' },
        { key: 'accessToken', label: 'Access Token', type: 'password' },
      ]
    case 'signal':
      return [
        { key: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: '+86...' },
      ]
    case 'feishu':
      return [
        { key: 'appId', label: 'App ID', type: 'text' },
        { key: 'appSecret', label: 'App Secret', type: 'password' },
      ]
    default:
      return []
  }
}
