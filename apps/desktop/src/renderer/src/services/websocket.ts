import { useAppStore } from '../stores/app'
import type { WSEvent } from '../types'

type EventHandler = (data: unknown) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(url: string = 'ws://localhost:3210/ws') {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('[WS] Connected')
      this.reconnectAttempts = 0
      useAppStore.getState().setWsConnected(true)
    }

    this.ws.onclose = () => {
      console.log('[WS] Disconnected')
      useAppStore.getState().setWsConnected(false)
      this.attemptReconnect(url)
    }

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error)
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WSEvent = JSON.parse(event.data)
        this.handleEvent(message)
      } catch (error) {
        console.error('[WS] Parse error:', error)
      }
    }
  }

  private attemptReconnect(url: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    setTimeout(() => {
      this.connect(url)
    }, delay)
  }

  private handleEvent(event: WSEvent) {
    const handlers = this.handlers.get(event.type)
    if (handlers) {
      handlers.forEach(handler => handler(event.data))
    }

    // Update store based on event type
    const store = useAppStore.getState()
    
    switch (event.type) {
      case 'gateway:status':
        store.setGatewayStatus(event.data as Parameters<typeof store.setGatewayStatus>[0])
        break
      case 'gateway:health':
        // Update health within gateway status
        break
      // Add more handlers as needed
    }
  }

  on(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)
    
    return () => {
      this.handlers.get(eventType)?.delete(handler)
    }
  }

  off(eventType: string, handler: EventHandler) {
    this.handlers.get(eventType)?.delete(handler)
  }

  send(type: string, data: unknown) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.error('[WS] Not connected')
      return false
    }

    this.ws.send(JSON.stringify({ type, data, timestamp: new Date().toISOString() }))
    return true
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsService = new WebSocketService()
