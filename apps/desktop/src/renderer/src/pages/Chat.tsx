import { useState, useRef, useEffect } from 'react'
import { Send, Plus, Trash2, MessageSquare } from 'lucide-react'
import { useAppStore } from '../stores/app'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'

export function Chat() {
  const { sessions, currentSession, setCurrentSession, addMessage, addSession } = useAppStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages])

  function handleNewSession() {
    const session = {
      id: `session-${Date.now()}`,
      title: '新对话',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addSession(session)
    setCurrentSession(session)
  }

  async function handleSend() {
    if (!input.trim() || !currentSession || loading) return

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date().toISOString(),
      sessionId: currentSession.id,
    }

    addMessage(currentSession.id, userMessage)
    setInput('')
    setLoading(true)

    // TODO: 实际 API 调用
    setTimeout(() => {
      const assistantMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant' as const,
        content: '这是一个模拟回复。需要连接到实际的 LLM API 才能获得真实响应。',
        timestamp: new Date().toISOString(),
        sessionId: currentSession.id,
      }
      addMessage(currentSession.id, assistantMessage)
      setLoading(false)
    }, 1000)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="page chat">
      {/* 会话列表 */}
      <aside className="chat__sidebar">
        <div className="chat__sidebar-header">
          <h2>对话</h2>
          <button className="btn btn--icon btn--small" onClick={handleNewSession} title="新对话">
            <Plus size={18} />
          </button>
        </div>
        <div className="chat__sessions">
          {sessions.length === 0 ? (
            <div className="chat__empty">
              <MessageSquare size={32} />
              <p>暂无对话</p>
              <button className="btn btn--primary btn--small" onClick={handleNewSession}>
                开始新对话
              </button>
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={clsx(
                  'chat__session-item',
                  currentSession?.id === session.id && 'chat__session-item--active'
                )}
                onClick={() => setCurrentSession(session)}
              >
                <span className="session-title">{session.title}</span>
                <span className="session-count">{session.messages.length}</span>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* 聊天区域 */}
      <div className="chat__main">
        {currentSession ? (
          <>
            {/* 消息列表 */}
            <div className="chat__messages">
              {currentSession.messages.length === 0 ? (
                <div className="chat__welcome">
                  <h2>开始对话</h2>
                  <p>输入消息开始与 AI 助手对话</p>
                </div>
              ) : (
                currentSession.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={clsx('message', `message--${msg.role}`)}
                  >
                    <div className="message__role">
                      {msg.role === 'user' ? '你' : 'AI'}
                    </div>
                    <div className="message__content">
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="message message--assistant">
                  <div className="message__role">AI</div>
                  <div className="message__content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="chat__input">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                rows={3}
                disabled={loading}
              />
              <button 
                className="btn btn--primary"
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="chat__placeholder">
            <MessageSquare size={64} />
            <h2>选择或创建对话</h2>
            <p>从左侧选择一个对话，或点击 + 创建新对话</p>
            <button className="btn btn--primary" onClick={handleNewSession}>
              <Plus size={18} />
              新对话
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
