import { useState } from 'react'
import { Shield, Folder, FileText, Lock, Unlock, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

interface PermissionRule {
  id: string
  path: string
  access: 'read' | 'write' | 'full' | 'deny'
  description: string
}

const DEFAULT_PERMISSIONS: PermissionRule[] = [
  { id: '1', path: '~/.myclaw', access: 'full', description: 'MyClaw 数据目录' },
  { id: '2', path: '~/.openclaw', access: 'read', description: 'OpenClaw 配置目录' },
  { id: '3', path: '~/Documents', access: 'read', description: '文档目录（只读）' },
  { id: '4', path: '~/Desktop', access: 'deny', description: '桌面目录（禁止访问）' },
]

export function Permissions() {
  const [permissions, setPermissions] = useState<PermissionRule[]>(DEFAULT_PERMISSIONS)
  const [editing, setEditing] = useState<PermissionRule | null>(null)

  function handleUpdate(id: string, updates: Partial<PermissionRule>) {
    setPermissions(permissions.map(p => p.id === id ? { ...p, ...updates } : p))
    setEditing(null)
  }

  function handleAdd() {
    const newRule: PermissionRule = {
      id: Date.now().toString(),
      path: '',
      access: 'read',
      description: '',
    }
    setEditing(newRule)
  }

  function handleDelete(id: string) {
    if (confirm('确定要删除这条权限规则吗？')) {
      setPermissions(permissions.filter(p => p.id !== id))
    }
  }

  return (
    <div className="page permissions">
      <header className="page__header">
        <h1>权限控制</h1>
        <p className="page__desc">管理 AI 助手对文件系统的访问权限</p>
      </header>

      {/* 安全提示 */}
      <div className="security-notice">
        <AlertTriangle size={20} />
        <div>
          <strong>安全提示</strong>
          <p>合理的权限配置可以保护您的隐私数据。建议仅授予必要的访问权限。</p>
        </div>
      </div>

      {/* 权限列表 */}
      <div className="permissions__list">
        {permissions.map(rule => (
          <div key={rule.id} className={clsx('permission-card', `permission-card--${rule.access}`)}>
            <div className="permission-card__header">
              <div className="permission-card__icon">
                {rule.access === 'deny' ? <Lock size={20} /> : <Unlock size={20} />}
              </div>
              <div className="permission-card__info">
                <code className="permission-path">{rule.path}</code>
                <p className="permission-desc">{rule.description}</p>
              </div>
              <div className="permission-card__access">
                <span className={clsx('access-badge', `access-badge--${rule.access}`)}>
                  {getAccessLabel(rule.access)}
                </span>
              </div>
            </div>
            <div className="permission-card__actions">
              <button 
                className="btn btn--small btn--secondary"
                onClick={() => setEditing(rule)}
              >
                编辑
              </button>
              <button 
                className="btn btn--small btn--danger"
                onClick={() => handleDelete(rule.id)}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 添加按钮 */}
      <button className="btn btn--primary" onClick={handleAdd}>
        + 添加权限规则
      </button>

      {/* 编辑弹窗 */}
      {editing && (
        <PermissionForm
          rule={editing}
          onSubmit={(updates) => {
            if (permissions.find(p => p.id === editing.id)) {
              handleUpdate(editing.id, updates)
            } else {
              setPermissions([...permissions, { ...editing, ...updates }])
              setEditing(null)
            }
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

interface PermissionFormProps {
  rule: PermissionRule
  onSubmit: (updates: Partial<PermissionRule>) => void
  onClose: () => void
}

function PermissionForm({ rule, onSubmit, onClose }: PermissionFormProps) {
  const [path, setPath] = useState(rule.path)
  const [access, setAccess] = useState<PermissionRule['access']>(rule.access)
  const [description, setDescription] = useState(rule.description)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ path, access, description })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>编辑权限规则</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>路径</label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="~/Documents"
              required
            />
          </div>
          <div className="form-group">
            <label>访问级别</label>
            <select value={access} onChange={(e) => setAccess(e.target.value as PermissionRule['access'])}>
              <option value="read">只读</option>
              <option value="write">读写</option>
              <option value="full">完全访问</option>
              <option value="deny">禁止访问</option>
            </select>
          </div>
          <div className="form-group">
            <label>描述</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="规则用途说明"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn--primary">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getAccessLabel(access: PermissionRule['access']): string {
  switch (access) {
    case 'read': return '只读'
    case 'write': return '读写'
    case 'full': return '完全访问'
    case 'deny': return '禁止'
  }
}
