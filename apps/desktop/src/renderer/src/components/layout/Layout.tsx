import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useEffect } from 'react'
import { wsService } from '../../services/websocket'

export function Layout() {
  useEffect(() => {
    wsService.connect()
    return () => wsService.disconnect()
  }, [])

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
