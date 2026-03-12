import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { api, ChatSession } from '../lib/api'

interface ChatSidebarProps {
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onNewChat: () => void
}

export function ChatSidebar({ currentSessionId, onSelectSession, onNewChat }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [currentSessionId])

  const fetchSessions = async () => {
    try {
      const data = await api.chats.list()
      setSessions(data)
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this conversation?')) return
    try {
      await api.chats.delete(id)
      setSessions(sessions.filter(s => s.id !== id))
      if (currentSessionId === id) {
        onNewChat()
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  if (isCollapsed) {
    return (
      <div style={{
        width: 48,
        height: '100%',
        background: 'var(--surface)',
        borderRight: '1px solid var(--rule)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        transition: 'width 0.2s ease'
      }}>
        <button 
          onClick={() => setIsCollapsed(false)}
          style={{
            background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer',
            padding: 8, marginBottom: 20
          }}
        >
          <ChevronRight size={20} />
        </button>
        <button 
          onClick={onNewChat}
          style={{
            background: 'var(--teal)', border: 'none', color: '#fff', borderRadius: 8,
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginBottom: 20
          }}
        >
          <Plus size={18} />
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: 260,
      height: '100%',
      background: 'var(--surface)',
      borderRight: '1px solid var(--rule)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--rule)'
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--ink)' }}>Conversations</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <button 
            onClick={onNewChat}
            style={{
              background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer',
              padding: 4, display: 'flex', alignItems: 'center'
            }}
            title="New Chat"
          >
            <Plus size={18} />
          </button>
          <button 
            onClick={() => setIsCollapsed(true)}
            style={{
              background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer',
              padding: 4
            }}
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)', fontSize: 12 }}>
            Loading history...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)', fontSize: 12 }}>
            No previous chats
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: currentSessionId === session.id ? 'var(--rule)' : 'transparent',
                transition: 'background 0.2s ease',
                position: 'relative',
                group: 'true' // trick for pseudo-class if we had tailwind
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget.querySelector('.delete-btn') as HTMLElement
                if (btn) btn.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget.querySelector('.delete-btn') as HTMLElement
                if (btn) btn.style.opacity = '0'
              }}
            >
              <MessageSquare size={16} color={currentSessionId === session.id ? 'var(--teal)' : 'var(--ink-3)'} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontSize: 13,
                  color: currentSessionId === session.id ? 'var(--ink)' : 'var(--ink-2)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontWeight: currentSessionId === session.id ? 500 : 400
                }}>
                  {session.title || 'Untitled Chat'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Clock size={10} />
                  {new Date(session.updated_at).toLocaleDateString()}
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => handleDelete(e, session.id)}
                style={{
                  background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer',
                  padding: 4, opacity: 0, transition: 'opacity 0.2s ease'
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
