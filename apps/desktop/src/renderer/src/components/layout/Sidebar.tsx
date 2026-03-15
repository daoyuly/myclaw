import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  MessageSquare, 
  ScrollText, 
  Bot, 
  Radio,
  Shield,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Circle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAppStore } from '../../stores/app'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '概览' },
  { to: '/chat', icon: MessageSquare, label: '聊天' },
  { to: '/rules', icon: ScrollText, label: '规则' },
  { to: '/providers', icon: Bot, label: '提供商' },
  { to: '/channels', icon: Radio, label: '通道' },
  { to: '/permissions', icon: Shield, label: '权限' },
  { to: '/stats', icon: BarChart3, label: '统计' },
  { to: '/settings', icon: Settings, label: '设置' },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, gatewayStatus, wsConnected } = useAppStore()

  return (
    <aside className={clsx(
      'sidebar',
      sidebarCollapsed && 'sidebar--collapsed'
    )}>
      <div className="sidebar__header">
        <div className="sidebar__logo">
          🎋
        </div>
        {!sidebarCollapsed && (
          <span className="sidebar__title">MyClaw</span>
        )}
      </div>

      <nav className="sidebar__nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'sidebar__link',
              isActive && 'sidebar__link--active'
            )}
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon size={20} />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__status">
          <div className="status-item">
            <Circle 
              size={8} 
              className={clsx(
                'status-dot',
                gatewayStatus?.status === 'running' ? 'status-dot--active' : 'status-dot--inactive'
              )} 
            />
            {!sidebarCollapsed && <span>Gateway</span>}
          </div>
          <div className="status-item">
            <Circle 
              size={8} 
              className={clsx(
                'status-dot',
                wsConnected ? 'status-dot--active' : 'status-dot--inactive'
              )} 
            />
            {!sidebarCollapsed && <span>WS</span>}
          </div>
        </div>

        <button 
          className="sidebar__toggle"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? '展开' : '收起'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  )
}
