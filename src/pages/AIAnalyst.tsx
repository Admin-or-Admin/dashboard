import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Search, FileText, X, Loader, Wrench } from 'lucide-react'
import { api, Log, AIAnalysisResponse } from '../lib/api'
import { ChatSidebar } from '../components/ChatSidebar'

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'tool'

interface ChatMessage {
  role: MessageRole
  content: string
  _toolName?: string
  _toolArgs?: string
  _isToolCall?: boolean
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function ToolCallBadge({ name, args }: { name: string; args: string }) {
  const [open, setOpen] = useState(false)
  let parsed: any = {}
  try { parsed = JSON.parse(args) } catch { /**/ }
  const hasArgs = Object.keys(parsed).length > 0

  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column',
      background: 'var(--teal-light)', border: '1px solid #A7D9DB',
      borderRadius: 6, padding: '5px 10px', marginBottom: 4,
      fontSize: 12, fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: hasArgs ? 'pointer' : 'default' }}
        onClick={() => hasArgs && setOpen(o => !o)}>
        <Wrench size={11} color="var(--teal)" />
        <span style={{ color: 'var(--teal-dark)', fontWeight: 500 }}>{name}</span>
        {hasArgs && (
          <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
        )}
      </div>
      {open && hasArgs && (
        <pre style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg._isToolCall) {
    return (
      <div style={{ padding: '4px 0', display: 'flex', justifyContent: 'center' }}>
        <ToolCallBadge name={msg._toolName!} args={msg._toolArgs ?? '{}'} />
      </div>
    )
  }

  const isUser = msg.role === 'user'

  const renderContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).split('\n')
        const lang = lines[0].match(/^[a-z]+$/) ? lines.shift() : ''
        return (
          <pre key={i} style={{
            background: 'var(--ink)', color: '#E8F4F4',
            padding: '10px 14px', borderRadius: 6,
            fontFamily: 'var(--font-mono)', fontSize: 12,
            overflowX: 'auto', margin: '8px 0', whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {lang && <div style={{ color: 'var(--teal)', fontSize: 10, marginBottom: 6, opacity: 0.7 }}>{lang}</div>}
            {lines.join('\n')}
          </pre>
        )
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} style={{
            background: isUser ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
            padding: '1px 6px', borderRadius: 4,
            fontFamily: 'var(--font-mono)', fontSize: 12,
          }}>{part.slice(1, -1)}</code>
        )
      }
      return (
        <span key={i}>
          {part.split(/(\*\*[^*]+\*\*|\n)/g).map((chunk, j) => {
            if (chunk.startsWith('**') && chunk.endsWith('**')) return <strong key={j}>{chunk.slice(2,-2)}</strong>
            if (chunk === '\n') return <br key={j} />
            return chunk
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
      gap: 10, padding: '6px 0',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--ink)' : 'var(--teal)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser ? <User size={14} color="#fff" /> : <Bot size={14} color="#fff" />}
      </div>
      <div style={{ maxWidth: '78%' }}>
        <div style={{
          background: isUser ? 'var(--ink)' : 'var(--surface)',
          color: isUser ? '#fff' : 'var(--ink)',
          border: isUser ? 'none' : '1px solid var(--rule)',
          borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px',
          padding: '10px 14px', fontSize: 13.5, lineHeight: 1.65,
        }}>
          {renderContent(msg.content)}
        </div>
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', background: 'var(--teal)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Bot size={14} color="#fff" />
      </div>
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--rule)',
        borderRadius: '0 12px 12px 12px', padding: '10px 14px',
        display: 'flex', gap: 4,
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-3)',
            animation: 'aiBounce 1.2s ease infinite',
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
      <style>{`@keyframes aiBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }`}</style>
    </div>
  )
}

function LogPicker({ onSelect, onClose }: { onSelect: (log: Log) => void; onClose: () => void }) {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.logs.list(100).then(setLogs).finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? logs.filter(l =>
        l.id.includes(search) ||
        l.message?.toLowerCase().includes(search.toLowerCase()) ||
        l.service_name?.toLowerCase().includes(search.toLowerCase())
      )
    : logs

  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
      background: 'var(--surface)', border: '1px solid var(--rule)',
      borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      zIndex: 50, overflow: 'hidden', maxHeight: 360,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--rule-2)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Search size={13} color="var(--ink-3)" />
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search logs by ID, message, or service..."
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: 13,
            fontFamily: 'var(--font-body)', background: 'none', color: 'var(--ink)',
          }}
        />
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading logs…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No logs found</div>
        ) : filtered.map(log => (
          <div
            key={log.id}
            onClick={() => onSelect(log)}
            style={{
              padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--rule-2)',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--teal)' }}>
                {log.id.slice(0, 14)}…
              </span>
              {log.raw_severity && (
                <span className={`badge badge-${log.raw_severity.toLowerCase()}`} style={{ fontSize: 10 }}>
                  {log.raw_severity}
                </span>
              )}
              {log.service_name && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
                  {log.service_name}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {log.message ?? '(no message)'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'What is the current security posture?',
  'Show me critical threats',
  'Which services are loud?',
  'Walk me through the latest incident',
]

export default function AIAnalyst({ initialMessage }: { initialMessage?: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [pasteMode, setPasteMode] = useState(false)
  const [pastedLog, setPastedLog] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputAreaRef = useRef<HTMLDivElement>(null)
  const didAutoSend = useRef(false)
  const skipNextFetch = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, loading])

  useEffect(() => {
    if (sessionId) {
      if (skipNextFetch.current) {
        skipNextFetch.current = false
        return
      }
      loadSession(sessionId)
    } else {
      setMessages([])
      setDisplayMessages([])
    }
  }, [sessionId])

  async function loadSession(id: string) {
    setLoading(true)
    try {
      const session = await api.chats.get(id)
      const history: ChatMessage[] = session.messages.map(m => ({
        role: m.role as any,
        content: m.content
      }))
      setMessages(history)
      setDisplayMessages(history.filter(m => m.role === 'user' || m.role === 'assistant'))
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
    setDisplayMessages([])
    didAutoSend.current = false
  }

  useEffect(() => {
    if (initialMessage && !didAutoSend.current) {
      didAutoSend.current = true
      send(initialMessage)
    }
  }, [initialMessage])

  function addDisplay(msg: ChatMessage) {
    setDisplayMessages(prev => [...prev, msg])
  }

  async function send(overrideInput?: string) {
    const text = (overrideInput ?? input).trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    
    // 1. Optimistic Update
    addDisplay(userMsg)
    setInput('')
    setError(null)
    setShowPicker(false)
    setLoading(true)

    let currentSessionId = sessionId
    
    try {
      // 2. Create session if needed
      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID()
        await api.chats.create(currentSessionId, text.slice(0, 40) + (text.length > 40 ? '...' : ''))
        skipNextFetch.current = true
        setSessionId(currentSessionId)
      }

      // 3. Save to DB
      await api.chats.addMessage(currentSessionId, 'user', text)

      const historyForAPI = [...messages, userMsg].map(({ role, content }) => ({ role, content }))
      setMessages(prev => [...prev, userMsg])

      // 4. Get Analyze result
      const response: AIAnalysisResponse = await api.chats.analyze(historyForAPI)
      
      // 5. Render intermediate steps
      response.intermediate_steps.forEach(step => {
        addDisplay({
          role: 'assistant',
          content: '',
          _isToolCall: true,
          _toolName: step.tool,
          _toolArgs: step.args
        })
      })

      const assistantMsg: ChatMessage = { role: 'assistant', content: response.final_answer }
      addDisplay(assistantMsg)
      setMessages(prev => [...prev, assistantMsg])
      
      // 6. Save final response
      await api.chats.addMessage(currentSessionId, 'assistant', response.final_answer)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  function onLogSelect(log: Log) {
    setShowPicker(false)
    send(`Investigate this log: ID ${log.id}`)
  }

  function onPasteSubmit() {
    if (!pastedLog.trim()) return
    setPasteMode(false)
    send(`Analyse this raw log:\n\n\`\`\`\n${pastedLog.trim()}\n\`\`\``)
    setPastedLog('')
  }

  const isEmpty = displayMessages.length === 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <ChatSidebar 
        currentSessionId={sessionId} 
        onSelectSession={setSessionId} 
        onNewChat={handleNewChat} 
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', padding: '16px' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px 8px' }}>

        {isEmpty && (
          <div style={{ textAlign: 'center', padding: '48px 24px 32px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Bot size={24} color="#fff" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>AI Security Analyst</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 600, margin: '0 auto' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{ padding: '7px 14px', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 100, fontSize: 12.5, color: 'var(--ink-2)', cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {displayMessages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && <TypingDots />}

        {error && (
          <div style={{ background: 'var(--red-light)', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', margin: '8px 0', fontSize: 12.5, color: 'var(--red)' }}>{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {pasteMode && (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 10, background: 'var(--surface-2)', marginBottom: 10, overflow: 'hidden' }}>
          <textarea
            autoFocus
            value={pastedLog}
            onChange={e => setPastedLog(e.target.value)}
            placeholder={`Paste raw log...`}
            style={{ width: '100%', padding: '12px 14px', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'transparent', color: 'var(--ink)', minHeight: 90 }}
          />
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--rule-2)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setPasteMode(false)} className="btn btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
            <button onClick={onPasteSubmit} disabled={!pastedLog.trim()} className="btn btn-teal" style={{ fontSize: 12 }}>Analyse</button>
          </div>
        </div>
      )}

      <div ref={inputAreaRef} style={{ position: 'relative', flexShrink: 0 }}>
        {showPicker && <LogPicker onSelect={onLogSelect} onClose={() => setShowPicker(false)} />}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '8px 10px 8px 12px' }}>
          <div style={{ display: 'flex', gap: 4, alignSelf: 'flex-end', paddingBottom: 4 }}>
            <button onClick={() => setShowPicker(o => !o)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--rule)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Search size={13} /></button>
            <button onClick={() => setPasteMode(o => !o)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--rule)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={13} /></button>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask anything..."
            rows={1}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none', fontSize: 13.5, color: 'var(--ink)', maxHeight: 120, overflowY: 'auto', padding: '5px 0' }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading} style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: input.trim() && !loading ? 'var(--teal)' : 'var(--rule)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
    </div>
  )
}
