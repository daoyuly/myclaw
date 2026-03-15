import type { AppStatus, GatewayStatus, UpdateStatus, Rule, RuleCreateInput, LLMProvider, Channel, UsageStats, APIResponse } from '../types'

const API_BASE = 'http://localhost:3210/api'

async function request<T>(path: string, options?: RequestInit): Promise<APIResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    const data = await res.json()
    return { success: res.ok, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// App
export const getAppStatus = () => request<AppStatus>('/status')
export const getGatewayStatus = () => request<GatewayStatus>('/gateway')
export const startGateway = () => request('/gateway/start', { method: 'POST' })
export const stopGateway = () => request('/gateway/stop', { method: 'POST' })
export const restartGateway = () => request('/gateway/restart', { method: 'POST' })

// Rules
export const getRules = () => request<Rule[]>('/rules')
export const createRule = (input: RuleCreateInput) => request<Rule>('/rules', {
  method: 'POST',
  body: JSON.stringify(input),
})
export const updateRule = (id: string, updates: Partial<Rule>) => request<Rule>(`/rules/${id}`, {
  method: 'PUT',
  body: JSON.stringify(updates),
})
export const deleteRule = (id: string) => request(`/rules/${id}`, { method: 'DELETE' })
export const toggleRule = (id: string, enabled: boolean) => updateRule(id, { enabled })

// Providers
export const getProviders = () => request<LLMProvider[]>('/providers')
export const updateProvider = (id: string, updates: Partial<LLMProvider>) => 
  request<LLMProvider>(`/providers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })

// Channels
export const getChannels = () => request<Channel[]>('/channels')
export const updateChannel = (id: string, updates: Partial<Channel>) =>
  request<Channel>(`/channels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })

// Stats
export const getStats = () => request<UsageStats>('/stats')

// Updates
export const checkUpdates = () => request('/updates/check', { method: 'POST' })
export const downloadUpdate = () => request('/updates/download', { method: 'POST' })
export const installUpdate = () => request('/updates/install', { method: 'POST' })
