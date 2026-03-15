// MyClaw Types

export interface AppStatus {
  version: string
  platform: string
  arch: string
  uptime: number
}

export type GatewayStatusType = 'running' | 'stopped' | 'starting' | 'stopping' | 'error'

export interface GatewayHealth {
  status: 'healthy' | 'unhealthy' | 'unknown'
  lastCheck: string
  uptime: number
}

export interface GatewayStatus {
  status: GatewayStatusType
  pid?: number
  startedAt?: string
  uptime?: number
  error?: string
  health?: GatewayHealth
}

export interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

export interface UpdateStatus {
  checking: boolean
  available: boolean
  downloading: boolean
  downloaded: boolean
  progress: UpdateProgress | null
  version: string | null
  error: string | null
}

// Rules
export interface Rule {
  id: string
  name: string
  description: string
  content: string
  enabled: boolean
  createdAt: string
  updatedAt: string
  priority: number
  tags: string[]
}

export interface RuleCreateInput {
  name: string
  description: string
  content: string
  priority?: number
  tags?: string[]
}

// Providers
export type LLMProviderType = 'openai' | 'anthropic' | 'gemini' | 'zhipu' | 'moonshot' | 'deepseek' | 'ollama'

export interface LLMProvider {
  id: string
  type: LLMProviderType
  name: string
  enabled: boolean
  apiKey?: string
  baseUrl?: string
  model?: string
  priority: number
  config: Record<string, unknown>
}

// Channels
export type ChannelType = 'telegram' | 'discord' | 'whatsapp' | 'signal' | 'feishu' | 'webchat'

export interface Channel {
  id: string
  type: ChannelType
  name: string
  enabled: boolean
  config: Record<string, unknown>
}

// Chat
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  sessionId?: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  provider?: string
  model?: string
}

// Stats
export interface UsageStats {
  totalMessages: number
  totalTokens: number
  totalSessions: number
  byProvider: Record<string, { messages: number; tokens: number }>
  byDay: Array<{ date: string; messages: number; tokens: number }>
}

// WebSocket Events
export type WSEventType = 
  | 'gateway:status'
  | 'gateway:health'
  | 'chat:message'
  | 'chat:stream'
  | 'rule:updated'
  | 'stats:updated'

export interface WSEvent<T = unknown> {
  type: WSEventType
  data: T
  timestamp: string
}

// API Response
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
