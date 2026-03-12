import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
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

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY ?? ''

function buildSystemPrompt(log: LogFullDetail | null | undefined): string {
  if (!log) {
    return `You are a senior cybersecurity analyst assistant embedded in the CyberControl security operations platform. You help security operators investigate incidents, understand threats, interpret logs, and make decisions about remediation steps.

You are knowledgeable about:
- Log analysis and interpretation
- Threat detection and attack vectors
- Incident response procedures
- OWASP Top 10 and common attack patterns
- Remediation strategies and best practices
- GDPR and compliance implications of security incidents

Be precise, actionable, and concise. When you suggest commands or steps, format them clearly. Always consider the risk level of any action you recommend.`
  }

  const c = log.classification
  const t = log.threat_assessment
  const inc = log.incident
  const steps = log.remediation_steps ?? []

  return `You are a senior cybersecurity analyst assistant embedded in the CyberControl security operations platform. The operator has opened a specific log for investigation and needs your help.

--- LOG CONTEXT ---
Log ID: ${log.id}
Timestamp: ${log.timestamp}
Service: ${log.service_name ?? 'unknown'}
Message: ${log.message ?? 'no message'}
HTTP Status: ${log.http_status ?? 'N/A'}
Trace ID: ${log.trace_id ?? 'N/A'}
Processing Stage: ${log.processing_stage ?? 'unknown'}

${c ? `--- CLASSIFICATION ---
Category: ${c.category ?? 'unknown'}
Severity: ${c.severity ?? 'unknown'}
Is Cybersecurity: ${c.is_cybersecurity ? 'YES' : 'NO'}
Confidence: ${c.confidence ?? 'N/A'}%
Tags: ${c.tags?.join(', ') ?? 'none'}
Reasoning: ${c.reasoning ?? 'none'}` : '--- CLASSIFICATION ---\nNot yet classified.'}

${t ? `--- THREAT ASSESSMENT ---
Attack Vector: ${t.attack_vector ?? 'unknown'}
AI Analysis: ${t.ai_suggestion ?? 'none'}
Complexity: ${t.complexity ?? 'unknown'}
Priority: ${t.priority ?? 'N/A'}/5
Recurrence Rate: ${t.recurrence_rate ?? 'N/A'}%
Auto-fixable: ${t.auto_fixable ? 'YES' : 'NO'}
Requires Human Approval: ${t.requires_approval ? 'YES' : 'NO'}
Notify Teams: ${t.notify_teams?.join(', ') ?? 'none'}` : '--- THREAT ASSESSMENT ---\nNo threat assessment available.'}

${inc ? `--- INCIDENT ---
Incident ID: ${inc.incident_id}
Resolution Mode: ${inc.resolution_mode ?? 'unknown'}
Executive Summary: ${inc.executive_summary ?? 'none'}
Root Cause: ${inc.root_cause ?? 'unknown'}
What Happened: ${inc.what_happened ?? 'unknown'}
Impact: ${inc.impact_assessment ?? 'unknown'}
Lessons Learned: ${inc.lessons_learned ?? 'none'}` : '--- INCIDENT ---\nNo incident record yet.'}

${steps.length > 0 ? `--- REMEDIATION STEPS (${steps.length}) ---
${steps.map(s => `Step ${s.step_number}: ${s.title} [${s.risk} risk] [${s.status ?? 'pending'}]${s.command ? `\n  Command: ${s.command}` : ''}`).join('\n')}` : '--- REMEDIATION ---\nNo remediation steps yet.'}

--- YOUR ROLE ---
The operator is asking you questions about this specific log and incident. Help them understand what happened, why it matters, what the risk is, and what they should do. Be direct and actionable. If you suggest commands, format them as code. Reference the log data above when relevant.`
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

  // Render markdown-like code blocks
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
      // Bold
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
          {/* Log ID */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Log ID</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--teal)', wordBreak: 'break-all' }}>{log.id}</div>
          </div>

          {/* Service + Timestamp */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Service</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{log.service_name ?? '—'}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Timestamp</div>
            <Timestamp iso={log.timestamp} />
          </div>

          {/* Message */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Message</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{log.message ?? '—'}</div>
          </div>

          {/* Classification */}
          {c && (
            <div style={{ marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--rule-2)' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Classification</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <CategoryBadge category={c.category} />
                <SeverityBadge severity={c.severity} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>{c.reasoning ?? '—'}</div>
              {c.tags && c.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {c.tags.map(tag => (
                    <span key={tag} className="badge badge-neutral" style={{ fontSize: 10 }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Threat */}
          {t && (
            <div style={{ marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--rule-2)' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Threat</div>
              <div style={{ marginBottom: 8 }}>
                <PriorityBar priority={t.priority} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 6 }}>{t.attack_vector ?? '—'}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{t.ai_suggestion ?? '—'}</div>
            </div>
          )}

          {/* Steps summary */}
          {log.remediation_steps && log.remediation_steps.length > 0 && (
            <div style={{ paddingTop: 14, borderTop: '1px solid var(--rule-2)' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                Remediation ({log.remediation_steps.length} steps)
              </div>
              {log.remediation_steps.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--ink)', color: '#fff',
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>{s.step_number}</div>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{s.title}</span>
                  <span className={`badge badge-${s.status ?? 'pending'}`} style={{ fontSize: 9, marginLeft: 'auto' }}>
                    {s.status ?? 'pending'}
                  </span>
                </div>
              ))}
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load session messages when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId)
    } else if (!logContext) {
      // Default greeting for a blank new chat
      setMessages([{
        role: 'assistant',
        content: `I am your cybersecurity analyst assistant. I can help you investigate logs, understand threats, interpret attack patterns, advise on remediation steps, or answer any security operations questions.

You can also open me directly from a specific log in the Log Stream page to get pre-loaded context.

What can I help you with?`,
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
    // Reset greeting based on context if any
  }

  // Inject opening message when log context is provided
  useEffect(() => {
    if (logContext) {
      const initial = `I have full context on log \`${logContext.id.slice(0, 12)}…\` from **${logContext.service_name ?? 'unknown service'}**.

${logContext.classification ? `It was classified as **${logContext.classification.severity?.toUpperCase()} ${logContext.classification.category}** with ${logContext.classification.confidence}% confidence.` : ''}
${logContext.threat_assessment ? `The threat assessment identifies **${logContext.threat_assessment.attack_vector}** as the attack vector with priority **${logContext.threat_assessment.priority}/5**.` : ''}

What would you like to know? I can help you understand what happened, assess the risk, walk through the remediation steps, or discuss broader implications.`
      
      setMessages([{
        role: 'assistant',
        content: initial,
        timestamp: new Date(),
      }])
    }
  }, [logContext?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    let currentSessionId = sessionId
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID()
      await api.chats.create(currentSessionId, text.slice(0, 40) + (text.length > 40 ? '...' : ''))
      setSessionId(currentSessionId)
      
      // Save the initial greeting if it exists
      if (messages.length > 0 && messages[0].role === 'assistant') {
        await api.chats.addMessage(currentSessionId, 'assistant', messages[0].content)
      }
    }

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    // Save user message
    await api.chats.addMessage(currentSessionId, 'user', text)

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [
            { role: 'system', content: buildSystemPrompt(logContext) },
            ...history,
          ],
          max_tokens: 1024,
          temperature: 0.3,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? `OpenAI error ${res.status}`)
      }

      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content ?? 'No response.'

      // Save assistant message
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
    'What is the risk level of this incident?',
    'Explain the attack vector in plain English',
    'Should I approve the remediation steps?',
    'What teams need to be notified?',
  ] : [
    'What are common signs of a brute force attack?',
    'How do I investigate a SQL injection attempt?',
    'What does a high recurrence rate indicate?',
    'Explain OWASP Top 10 briefly',
  ]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <ChatSidebar 
        currentSessionId={sessionId} 
        onSelectSession={setSessionId} 
        onNewChat={handleNewChat} 
      />
      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* No API key warning */}
          {!OPENAI_API_KEY && (
            <div style={{
              background: 'var(--amber-light)', border: '1px solid #FCD34D',
              borderRadius: 8, padding: '12px 16px', marginBottom: 20,
              fontSize: 13, color: 'var(--amber)'
            }}>
              <strong>VITE_OPENAI_API_KEY</strong> is not set in your .env file. Add it to enable the chat.
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {loading && <TypingIndicator />}

          {error && (
            <div style={{
              background: 'var(--red-light)', border: '1px solid #FCA5A5',
              borderRadius: 8, padding: '10px 14px', marginTop: 8,
              fontSize: 12.5, color: 'var(--red)'
            }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestions — shown only when last message is from assistant and no user input yet started */}
        {messages.length <= 1 && !input && (
          <div style={{ padding: '0 28px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => setInput(s)}
                style={{
                  padding: '6px 12px', background: 'var(--surface)',
                  border: '1px solid var(--rule)', borderRadius: 100,
                  fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--teal)'; (e.target as HTMLElement).style.color = 'var(--teal)' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--rule)'; (e.target as HTMLElement).style.color = 'var(--ink-2)' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div style={{
          padding: '16px 28px 20px',
          borderTop: '1px solid var(--rule)',
          background: 'var(--surface)',
        }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: 'var(--surface-2)', border: '1px solid var(--rule)',
            borderRadius: 12, padding: '10px 14px',
            transition: 'border-color 0.15s',
          }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--rule)')}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about this log, or any security question..."
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13.5,
                color: 'var(--ink)', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
              }}
              onInput={e => {
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading || !OPENAI_API_KEY}
              style={{
                width: 34, height: 34, borderRadius: 8, border: 'none',
                background: input.trim() && !loading && OPENAI_API_KEY ? 'var(--teal)' : 'var(--rule)',
                color: input.trim() && !loading && OPENAI_API_KEY ? '#fff' : 'var(--ink-3)',
                cursor: input.trim() && !loading && OPENAI_API_KEY ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.15s',
              }}
            >
              <Send size={15} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            Enter to send · Shift+Enter for new line · Powered by GPT-4.1
          </div>
        </div>
      </div>

      {/* Log sidebar — only shown when context is available */}
      {logContext && <LogSidebar log={logContext} />}
    </div>
  )
}
