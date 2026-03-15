import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search } from 'lucide-react'
import { useAppStore } from '../stores/app'
import { getRules, createRule, updateRule, deleteRule, toggleRule } from '../services/api'
import { clsx } from 'clsx'
import type { Rule, RuleCreateInput } from '../types'

export function Rules() {
  const { rules, setRules, addRule, updateRule: updateRuleStore, deleteRule: deleteRuleStore } = useAppStore()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Rule | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadRules()
  }, [])

  async function loadRules() {
    const res = await getRules()
    if (res.success && res.data) {
      setRules(res.data)
    }
  }

  const filteredRules = rules.filter(rule => 
    rule.name.toLowerCase().includes(search.toLowerCase()) ||
    rule.description.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(input: RuleCreateInput) {
    setLoading(true)
    const res = await createRule(input)
    if (res.success && res.data) {
      addRule(res.data)
      setShowForm(false)
    }
    setLoading(false)
  }

  async function handleUpdate(id: string, updates: Partial<Rule>) {
    setLoading(true)
    const res = await updateRule(id, updates)
    if (res.success && res.data) {
      updateRuleStore(id, res.data)
      setEditing(null)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这条规则吗？')) return
    setLoading(true)
    const res = await deleteRule(id)
    if (res.success) {
      deleteRuleStore(id)
    }
    setLoading(false)
  }

  async function handleToggle(id: string, enabled: boolean) {
    const res = await toggleRule(id, enabled)
    if (res.success && res.data) {
      updateRuleStore(id, { enabled })
    }
  }

  return (
    <div className="page rules">
      <header className="page__header">
        <h1>规则管理</h1>
        <div className="page__actions">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="搜索规则..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn--primary" onClick={() => setShowForm(true)}>
            <Plus size={18} />
            新建规则
          </button>
        </div>
      </header>

      <div className="rules__list">
        {filteredRules.length === 0 ? (
          <div className="empty-state">
            <p>暂无规则</p>
            <button className="btn btn--primary" onClick={() => setShowForm(true)}>
              创建第一条规则
            </button>
          </div>
        ) : (
          filteredRules.map(rule => (
            <div key={rule.id} className={clsx('rule-card', !rule.enabled && 'rule-card--disabled')}>
              <div className="rule-card__header">
                <h3>{rule.name}</h3>
                <div className="rule-card__actions">
                  <button
                    className="btn btn--icon btn--small"
                    onClick={() => handleToggle(rule.id, !rule.enabled)}
                    title={rule.enabled ? '禁用' : '启用'}
                  >
                    {rule.enabled ? (
                      <ToggleRight size={20} className="toggle-on" />
                    ) : (
                      <ToggleLeft size={20} className="toggle-off" />
                    )}
                  </button>
                  <button
                    className="btn btn--icon btn--small"
                    onClick={() => setEditing(rule)}
                    title="编辑"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn btn--icon btn--small btn--danger"
                    onClick={() => handleDelete(rule.id)}
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="rule-card__desc">{rule.description}</p>
              <pre className="rule-card__content">{rule.content}</pre>
              <div className="rule-card__footer">
                <div className="rule-card__tags">
                  {rule.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
                <span className="rule-card__priority">优先级: {rule.priority}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 新建/编辑表单 */}
      {(showForm || editing) && (
        <RuleForm
          rule={editing}
          onSubmit={editing 
            ? (updates) => handleUpdate(editing.id, updates) 
            : handleCreate
          }
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          loading={loading}
        />
      )}
    </div>
  )
}

interface RuleFormProps {
  rule?: Rule | null
  onSubmit: (data: RuleCreateInput | Partial<Rule>) => void
  onClose: () => void
  loading: boolean
}

function RuleForm({ rule, onSubmit, onClose, loading }: RuleFormProps) {
  const [name, setName] = useState(rule?.name || '')
  const [description, setDescription] = useState(rule?.description || '')
  const [content, setContent] = useState(rule?.content || '')
  const [priority, setPriority] = useState(rule?.priority || 0)
  const [tags, setTags] = useState(rule?.tags.join(', ') || '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      name,
      description,
      content,
      priority,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{rule ? '编辑规则' : '新建规则'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>描述</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>规则内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>优先级</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>标签 (逗号分隔)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2"
              />
            </div>
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
