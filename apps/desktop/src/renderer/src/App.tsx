import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/layout'
import { 
  Dashboard, 
  Chat, 
  Rules, 
  Providers, 
  Channels, 
  Permissions, 
  Stats, 
  Settings 
} from './pages'
import { useAppStore } from './stores/app'
import { useEffect } from 'react'
import { wsService } from './services/websocket'

// Electron API 类型声明
interface ElectronAPI {
  getAppStatus: () => Promise<{
    version: string
    platform: string
    arch: string
    uptime: number
  }>
  getGatewayStatus: () => Promise<{
    status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error'
    pid?: number
    startedAt?: string
    uptime?: number
    error?: string
    health?: {
      status: 'healthy' | 'unhealthy' | 'unknown'
      lastCheck: string
      uptime: number
    }
  }>
  getUpdateStatus: () => Promise<{
    checking: boolean
    available: boolean
    downloading: boolean
    downloaded: boolean
    progress: {
      bytesPerSecond: number
      percent: number
      transferred: number
      total: number
    } | null
    version: string | null
    error: string | null
  }>
  onUpdateStatus: (callback: (status: {
    checking: boolean
    available: boolean
    downloading: boolean
    downloaded: boolean
    progress: {
      bytesPerSecond: number
      percent: number
      transferred: number
      total: number
    } | null
    version: string | null
    error: string | null
  }) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function AppContent() {
  const { setGatewayStatus, setUpdateStatus } = useAppStore()

  useEffect(() => {
    // 加载初始状态
    async function loadInitialStatus() {
      try {
        if (window.electronAPI) {
          const gatewayStatus = await window.electronAPI.getGatewayStatus()
          setGatewayStatus(gatewayStatus)

          const updateStatus = await window.electronAPI.getUpdateStatus()
          setUpdateStatus(updateStatus)

          // 监听更新状态变化
          window.electronAPI.onUpdateStatus((status) => {
            setUpdateStatus(status)
          })
        }
      } catch (error) {
        console.error('Failed to load initial status:', error)
      }
    }

    loadInitialStatus()

    // 定期刷新状态
    const interval = setInterval(loadInitialStatus, 5000)
    return () => clearInterval(interval)
  }, [setGatewayStatus, setUpdateStatus])

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="chat" element={<Chat />} />
        <Route path="rules" element={<Rules />} />
        <Route path="providers" element={<Providers />} />
        <Route path="channels" element={<Channels />} />
        <Route path="permissions" element={<Permissions />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
