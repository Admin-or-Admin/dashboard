import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, ChevronDown, ChevronUp, History } from 'lucide-react'
import { api, LogFullDetail } from '../lib/api'
import { SeverityBadge, CategoryBadge, PriorityBar, Timestamp } from '../components/ui'
import { ChatSidebar } from '../components/ChatSidebar'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AgentChatProps {
  logContext?: LogFullDetail | null
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Bot size={14} color="#fff" />
      </div>
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--rule)',
        borderRadius: '0 12px 12px 12px', padding: '10px 16px',
        display: 'flex', gap: 4, alignItems: 'center'
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-3)',
            animation: 'bounce 1.2s ease infinite',
            animationDelay: `${i * 0.2}s`
          }} />
        ))}
      </div>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  const renderContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3).replace(/^[a-z]+\n/, '')
        return (
          <pre key={i} style={{
            background: 'var(--ink)', color: '#E8F4F4',
            padding: '10px 14px', borderRadius: 6,
            fontFamily: 'var(--font-mono)', fontSize: 12,
            overflowX: 'auto', margin: '8px 0', whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>{code}</pre>
        )
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} style={{
            background: 'rgba(0,0,0,0.06)', padding: '1px 6px',
            borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 12
          }}>{part.slice(1, -1)}</code>
        )
      }
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
      return (
        <span key={i}>
          {boldParts.map((bp, j) => {
            if (bp.startsWith('**') && bp.endsWith('**')) {
              return <strong key={j}>{bp.slice(2, -2)}</strong>
            }
            return bp
          })}
        </span>
      )
    })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: '6px 0',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--ink)' : 'var(--teal)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser ? <User size={13} color="#fff" /> : <Bot size={13} color="#fff" />}
      </div>

      <div style={{ maxWidth: '75%' }}>
        <div style={{
          background: isUser ? 'var(--ink)' : 'var(--surface)',
          color: isUser ? '#fff' : 'var(--ink)',
          border: isUser ? 'none' : '1px solid var(--rule)',
          borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px',
          padding: '10px 14px',
          fontSize: 13.5,
          lineHeight: 1.6,
        }}>
          {renderContent(msg.content)}
        </div>
        <div style={{
          fontSize: 10.5, color: 'var(--ink-3)',
          fontFamily: 'var(--font-mono)',
          marginTop: 4,
          textAlign: isUser ? 'right' : 'left',
        }}>
          {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

function LogSidebar({ log }: { log: LogFullDetail }) {
  const [collapsed, setCollapsed] = useState(false)
  const c = log.classification
  const t = log.threat_assessment

  return (
    <div style={{
      width: collapsed ? 48 : 300,
      minWidth: collapsed ? 48 : 300,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--rule)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--rule)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', fontWeight: 500 }}>
            Log Context
          </span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2, marginLeft: 'auto' }}
        >
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Log ID</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--teal)', wordBreak: 'break-all' }}>{log.id}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Service</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{log.service_name ?? '—'}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Timestamp</div>
            <Timestamp iso={log.timestamp} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Message</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{log.message ?? '—'}</div>
          </div>

          {c && (
            <div style={{ marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--rule-2)' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Classification</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <CategoryBadge category={c.category} />
                <SeverityBadge severity={c.severity} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>{c.reasoning ?? '—'}</div>
            </div>
          )}

          {t && (
            <div style={{ marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--rule-2)' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Threat</div>
              <div style={{ marginBottom: 8 }}>
                <PriorityBar priority={t.priority} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 6 }}>{t.attack_vector ?? '—'}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AgentChat({ logContext }: AgentChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024)
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const skipNextFetch = useRef(false)

  const isMobile = window.innerWidth < 1024

  useEffect(() => {
    if (sessionId) {
      if (skipNextFetch.current) {
        skipNextFetch.current = false
        return
      }
      loadSession(sessionId)
    } else if (!logContext) {
      setMessages([{
        role: 'assistant',
        content: `I am your cybersecurity analyst assistant. I can help you investigate logs, understand threats, interpret attack patterns, advise on remediation steps, or answer any security operations questions.`,
        timestamp: new Date(),
      }])
    }
  }, [sessionId])

  async function loadSession(id: string) {
    setLoading(true)
    try {
      const session = await api.chats.get(id)
      setMessages(session.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp)
      })))
    } catch (err) {
      console.error('Failed to load session:', err)
      setError('Failed to load conversation history')
    } finally {
      setLoading(false)
    }
  }

  function handleNewChat() {
    setSessionId(null)
    setMessages([])
  }

  useEffect(() => {
    if (logContext) {
      const initial = `I have context on log \`${logContext.id.slice(0, 12)}…\` from **${logContext.service_name ?? 'unknown service'}**. How can I help?`
      setMessages([{ role: 'assistant', content: initial, timestamp: new Date() }])
    }
  }, [logContext?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() }
    
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    let currentSessionId = sessionId
    
    try {
      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID()
        await api.chats.create(currentSessionId, text.slice(0, 40) + (text.length > 40 ? '...' : ''))
        skipNextFetch.current = true
        setSessionId(currentSessionId)
      }

      await api.chats.addMessage(currentSessionId, 'user', text)

      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const data = await api.chats.completion(history, logContext?.id)
      const reply = data.content

      await api.chats.addMessage(currentSessionId, 'assistant', reply)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const SUGGESTIONS = logContext ? [
    'What is the risk level?',
    'Explain the attack vector',
    'What should I do next?',
  ] : [
    'What are common signs of brute force?',
    'How do I investigate SQL injection?',
    'What is Aurora?',
  ]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <ChatSidebar 
        currentSessionId={sessionId} 
        onSelectSession={setSessionId} 
        onNewChat={handleNewChat}
        isCollapsed={isCollapsed}
        onToggleCollapse={setIsCollapsed}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile Header with History Toggle */}
        {isMobile && isCollapsed && (
          <div style={{ 
            padding: '8px 16px', 
            borderBottom: '1px solid var(--rule)', 
            display: 'flex', 
            alignItems: 'center',
            background: 'var(--surface)',
            flexShrink: 0
          }}>
            <button 
              onClick={() => setIsCollapsed(false)}
              style={{
                background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500
              }}
            >
              <History size={16} color="var(--teal)" />
              History
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && <TypingIndicator />}
          {error && (
            <div style={{ background: 'var(--red-light)', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 12.5, color: 'var(--red)' }}>
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 1 && !input && (
          <div style={{ padding: '0 28px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => setInput(s)} style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 100, fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: '16px 28px 20px', borderTop: '1px solid var(--rule)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 12, padding: '10px 14px' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none', fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}
            />
            <button onClick={send} disabled={!input.trim() || loading} style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: input.trim() && !loading ? 'var(--teal)' : 'var(--rule)', color: '#fff', cursor: 'pointer' }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
      {logContext && <LogSidebar log={logContext} />}
    </div>
  )
}
