import { create } from 'zustand'
import type { GatewayStatus, UpdateStatus, ChatSession, Rule, LLMProvider, Channel } from '../types'

interface AppState {
  // Gateway
  gatewayStatus: GatewayStatus | null
  setGatewayStatus: (status: GatewayStatus) => void
  
  // Updates
  updateStatus: UpdateStatus | null
  setUpdateStatus: (status: UpdateStatus) => void
  
  // Navigation
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  
  // Chat
  currentSession: ChatSession | null
  sessions: ChatSession[]
  setCurrentSession: (session: ChatSession | null) => void
  addSession: (session: ChatSession) => void
  addMessage: (sessionId: string, message: ChatSession['messages'][0]) => void
  
  // Rules
  rules: Rule[]
  setRules: (rules: Rule[]) => void
  addRule: (rule: Rule) => void
  updateRule: (id: string, updates: Partial<Rule>) => void
  deleteRule: (id: string) => void
  
  // Providers
  providers: LLMProvider[]
  setProviders: (providers: LLMProvider[]) => void
  
  // Channels
  channels: Channel[]
  setChannels: (channels: Channel[]) => void
  
  // Connection
  wsConnected: boolean
  setWsConnected: (connected: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Gateway
  gatewayStatus: null,
  setGatewayStatus: (status) => set({ gatewayStatus: status }),
  
  // Updates
  updateStatus: null,
  setUpdateStatus: (status) => set({ updateStatus: status }),
  
  // Navigation
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  // Chat
  currentSession: null,
  sessions: [],
  setCurrentSession: (session) => set({ currentSession: session }),
  addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
  addMessage: (sessionId, message) => set((state) => {
    const sessions = state.sessions.map(s => 
      s.id === sessionId 
        ? { ...s, messages: [...s.messages, message], updatedAt: new Date().toISOString() }
        : s
    )
    const currentSession = state.currentSession?.id === sessionId
      ? { ...state.currentSession, messages: [...state.currentSession.messages, message] }
      : state.currentSession
    return { sessions, currentSession }
  }),
  
  // Rules
  rules: [],
  setRules: (rules) => set({ rules }),
  addRule: (rule) => set((state) => ({ rules: [...state.rules, rule] })),
  updateRule: (id, updates) => set((state) => ({
    rules: state.rules.map(r => r.id === id ? { ...r, ...updates } : r)
  })),
  deleteRule: (id) => set((state) => ({
    rules: state.rules.filter(r => r.id !== id)
  })),
  
  // Providers
  providers: [],
  setProviders: (providers) => set({ providers }),
  
  // Channels
  channels: [],
  setChannels: (channels) => set({ channels }),
  
  // Connection
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
}))
