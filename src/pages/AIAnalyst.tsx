import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, ChevronDown, Search, FileText, X, Loader, Wrench } from 'lucide-react'
import { api, Log } from '../lib/api'

// ── Tool definitions ──────────────────────────────────────────────────────────

const GATEWAY_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_logs',
      description: 'List logs from the system. Use this to search for logs by service name or browse recent activity.',
      parameters: {
        type: 'object',
        properties: {
          limit:        { type: 'number',  description: 'Max results to return (default 20, max 100)' },
          offset:       { type: 'number',  description: 'Pagination offset' },
          service_name: { type: 'string',  description: 'Filter by service name' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_log_full',
      description: 'Get full details for a specific log including its classification, threat assessment, remediation steps, and incident record.',
      parameters: {
        type: 'object',
        properties: {
          log_id: { type: 'string', description: 'The log ID' },
        },
        required: ['log_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_classifications',
      description: 'List all log classifications. Each classification has a category (security/infrastructure/application/deployment), severity, confidence score, reasoning, and tags.',
      parameters: {
        type: 'object',
        properties: {
          limit:  { type: 'number', description: 'Max results (default 20)' },
          offset: { type: 'number', description: 'Pagination offset' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_classification',
      description: 'Get the classification for a specific log.',
      parameters: {
        type: 'object',
        properties: {
          log_id: { type: 'string', description: 'The log ID' },
        },
        required: ['log_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_threats',
      description: 'List threat assessments. Each has an attack vector, complexity, priority (1-5), confidence, recurrence rate, and whether it is auto-fixable.',
      parameters: {
        type: 'object',
        properties: {
          limit:  { type: 'number', description: 'Max results (default 20)' },
          offset: { type: 'number', description: 'Pagination offset' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_threat',
      description: 'Get the threat assessment for a specific log.',
      parameters: {
        type: 'object',
        properties: {
          log_id: { type: 'string', description: 'The log ID' },
        },
        required: ['log_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_incidents',
      description: 'List resolved incidents. Each has an executive summary, root cause, what happened, impact assessment, lessons learned, and resolution mode.',
      parameters: {
        type: 'object',
        properties: {
          limit:  { type: 'number', description: 'Max results (default 20)' },
          offset: { type: 'number', description: 'Pagination offset' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_incident',
      description: 'Get a specific incident by its incident ID.',
      parameters: {
        type: 'object',
        properties: {
          incident_id: { type: 'string', description: 'The incident ID' },
        },
        required: ['incident_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_incident_remediation',
      description: 'Get all remediation steps for a specific incident.',
      parameters: {
        type: 'object',
        properties: {
          incident_id: { type: 'string', description: 'The incident ID' },
        },
        required: ['incident_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_incident_actions',
      description: 'Get follow-up actions for a specific incident.',
      parameters: {
        type: 'object',
        properties: {
          incident_id: { type: 'string', description: 'The incident ID' },
        },
        required: ['incident_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_remediation',
      description: 'List all remediation steps across all logs. Each step has a title, description, command, risk level, estimated time, rollback instructions, and approval status.',
      parameters: {
        type: 'object',
        properties: {
          limit:  { type: 'number', description: 'Max results (default 20)' },
          offset: { type: 'number', description: 'Pagination offset' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_remediation_by_log',
      description: 'Get all remediation steps for a specific log.',
      parameters: {
        type: 'object',
        properties: {
          log_id: { type: 'string', description: 'The log ID' },
        },
        required: ['log_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stats_severity',
      description: 'Get log counts grouped by severity level (critical, high, medium, low, info). Use for overview questions.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stats_trend',
      description: 'Get incident counts per day for the last 30 days. Use for trend analysis questions.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stats_services',
      description: 'Get log counts grouped by service name. Use to identify which services generate the most logs.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, any>): Promise<unknown> {
  switch (name) {
    case 'list_logs':             return api.logs.list(args.limit ?? 20, args.offset ?? 0, args.service_name)
    case 'get_log_full':          return api.logs.full(args.log_id)
    case 'list_classifications':  return api.classifications.list(args.limit ?? 20, args.offset ?? 0)
    case 'get_classification':    return api.classifications.get(args.log_id)
    case 'list_threats':          return api.threats.list(args.limit ?? 20, args.offset ?? 0)
    case 'get_threat':            return api.threats.get(args.log_id)
    case 'list_incidents':        return api.incidents.list(args.limit ?? 20, args.offset ?? 0)
    case 'get_incident':          return api.incidents.get(args.incident_id)
    case 'get_incident_remediation': return api.incidents.remediation(args.incident_id)
    case 'get_incident_actions':  return api.incidents.actions(args.incident_id)
    case 'list_remediation':      return api.remediation.list(args.limit ?? 20, args.offset ?? 0)
    case 'get_remediation_by_log': return api.remediation.byLog(args.log_id)
    case 'get_stats_severity':    return api.stats.severity()
    case 'get_stats_trend':       return api.stats.trend()
    case 'get_stats_services':    return api.stats.services()
    default: throw new Error(`Unknown tool: ${name}`)
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'tool'

interface ChatMessage {
  role: MessageRole
  content: string
  tool_call_id?: string
  tool_calls?: any[]
  // UI-only metadata
  _toolName?: string
  _toolArgs?: string
  _isToolCall?: boolean
}

interface LogPickerState {
  open: boolean
  logs: Log[]
  loading: boolean
  search: string
}

const SYSTEM_PROMPT = `You are a senior cybersecurity analyst AI embedded in the CyberControl platform — an AI-powered security operations center built on Apache Kafka, PostgreSQL, and three AI agents (Classifier, Analyst, Responder).

You have access to tools that connect directly to the live platform API. Use them proactively to give accurate, data-driven answers. When a user asks about logs, threats, incidents, or statistics — always call the relevant tools first before answering.

Your capabilities:
- Query and analyse logs, classifications, threat assessments, incidents, remediation steps, and platform stats
- Investigate specific logs in full depth using get_log_full
- Identify patterns across multiple records
- Advise on remediation and approval decisions
- Explain what the AI agents (Classifier, Analyst, Responder) decided and why
- Answer general cybersecurity questions using your knowledge

Behaviour rules:
- Always use tools to fetch live data rather than guessing
- For broad questions like "what is the current state of the system", call get_stats_severity, get_stats_trend, and get_stats_services together
- For log-specific questions, call get_log_full first to get all context
- Be concise and actionable. Lead with the key finding, then explain
- Format commands and technical values as code
- Severity order: critical > high > medium > low > info
- Priority order: 5 (most urgent) to 1 (least urgent)`

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
      // Process bold and line breaks
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

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY ?? ''

const SUGGESTIONS = [
  'What is the current security posture of the system?',
  'Show me the most critical threats right now',
  'Which services are generating the most logs?',
  'Walk me through the latest incident',
  'Are there any pending remediation steps that need approval?',
  'What attack vectors are most common in our logs?',
]

export default function AIAnalyst({ initialMessage }: { initialMessage?: string }) {
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, loading])

  // Auto-send initial message if provided (e.g. from Threats or Incidents page)
  useEffect(() => {
    if (initialMessage && !didAutoSend.current && OPENAI_KEY) {
      didAutoSend.current = true
      send(initialMessage)
    }
  }, [initialMessage])

  function buildInitialGreeting() {
    return `I am your AI security analyst. I have live access to the entire CyberControl platform — logs, classifications, threat assessments, incidents, remediation steps, and statistics.

Ask me anything about the system, paste a raw log for analysis, or select a specific log from the database. I will query the live data and give you a complete picture.`
  }

  function addDisplay(msg: ChatMessage) {
    setDisplayMessages(prev => [...prev, msg])
  }

  async function runAgent(userInput: string, initialMessages: ChatMessage[]) {
    const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
    let history = [...initialMessages]

    // Strip UI-only fields before sending to API
    const toAPI = (msgs: ChatMessage[]) => msgs
      .filter(m => !m._isToolCall)
      .map(({ role, content, tool_call_id, tool_calls }) => {
        const msg: any = { role, content }
        if (tool_call_id) msg.tool_call_id = tool_call_id
        if (tool_calls)   msg.tool_calls   = tool_calls
        return msg
      })

    // Agentic loop — keep calling until no more tool calls
    for (let iteration = 0; iteration < 10; iteration++) {
      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...toAPI(history),
          ],
          tools: GATEWAY_TOOLS,
          tool_choice: 'auto',
          max_tokens: 2048,
          temperature: 0.2,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? `OpenAI ${res.status}`)
      }

      const data = await res.json()
      const choice = data.choices?.[0]
      const assistantMsg = choice?.message

      if (!assistantMsg) break

      // Add assistant message to history
      history.push({
        role: 'assistant',
        content: assistantMsg.content ?? '',
        tool_calls: assistantMsg.tool_calls,
      })

      // No tool calls → final answer
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        if (assistantMsg.content) {
          addDisplay({ role: 'assistant', content: assistantMsg.content })
        }
        break
      }

      // Execute each tool call
      for (const toolCall of assistantMsg.tool_calls) {
        const name = toolCall.function.name
        const args = toolCall.function.arguments

        // Show tool call badge in UI
        addDisplay({
          role: 'assistant',
          content: '',
          _isToolCall: true,
          _toolName: name,
          _toolArgs: args,
        })

        let result: unknown
        try {
          result = await executeTool(name, JSON.parse(args))
        } catch (e: any) {
          result = { error: e.message }
        }

        const toolResultMsg: ChatMessage = {
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        }

        history.push(toolResultMsg)
      }
    }

    return history
  }

  async function send(overrideInput?: string) {
    const text = (overrideInput ?? input).trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    setShowPicker(false)

    if (messages.length === 0) {
      // First message — add greeting to display
      addDisplay({ role: 'assistant', content: buildInitialGreeting() })
    }

    const userMsg: ChatMessage = { role: 'user', content: text }
    addDisplay(userMsg)
    setLoading(true)

    const newHistory = [...messages, userMsg]
    setMessages(newHistory)

    try {
      const finalHistory = await runAgent(text, newHistory)
      setMessages(finalHistory)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  function onLogSelect(log: Log) {
    setShowPicker(false)
    send(`Investigate this log in full detail: log ID is ${log.id} (service: ${log.service_name ?? 'unknown'}, message: "${log.message ?? ''}")`)
  }

  function onPasteSubmit() {
    if (!pastedLog.trim()) return
    setPasteMode(false)
    send(`Analyse this raw log entry and tell me what it means, whether it is a security concern, and what should be done:\n\n\`\`\`\n${pastedLog.trim()}\n\`\`\``)
    setPastedLog('')
  }

  const isEmpty = displayMessages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* No API key warning */}
      {!OPENAI_KEY && (
        <div style={{
          background: 'var(--amber-light)', border: '1px solid #FCD34D',
          borderRadius: 8, padding: '10px 16px', margin: '0 0 12px',
          fontSize: 12.5, color: 'var(--amber)',
        }}>
          <strong>VITE_OPENAI_API_KEY</strong> is not set. Add it to your <code>.env</code> file to enable the analyst.
        </div>
      )}

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px 8px' }}>

        {isEmpty && (
          <div style={{ textAlign: 'center', padding: '48px 24px 32px' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: 'var(--teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Bot size={24} color="#fff" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>
              AI Security Analyst
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-3)', maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Ask anything about the platform. I have live access to all logs, threats, incidents, and statistics via the gateway API.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 600, margin: '0 auto' }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={!OPENAI_KEY}
                  style={{
                    padding: '7px 14px', background: 'var(--surface)',
                    border: '1px solid var(--rule)', borderRadius: 100,
                    fontSize: 12.5, color: 'var(--ink-2)', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.borderColor = 'var(--teal)'
                    el.style.color = 'var(--teal)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.borderColor = 'var(--rule)'
                    el.style.color = 'var(--ink-2)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayMessages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && <TypingDots />}

        {error && (
          <div style={{
            background: 'var(--red-light)', border: '1px solid #FCA5A5',
            borderRadius: 8, padding: '10px 14px', margin: '8px 0',
            fontSize: 12.5, color: 'var(--red)',
          }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Paste mode panel */}
      {pasteMode && (
        <div style={{
          border: '1px solid var(--rule)', borderRadius: 10,
          background: 'var(--surface-2)', marginBottom: 10, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--rule-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>Paste raw log</span>
            <button onClick={() => setPasteMode(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}>
              <X size={14} />
            </button>
          </div>
          <textarea
            autoFocus
            value={pastedLog}
            onChange={e => setPastedLog(e.target.value)}
            placeholder={`Paste your raw log here, e.g.:\n2024-03-15T14:23:01Z ERROR auth-service - Failed login attempt from 192.168.1.105 for user admin (attempt 47/50)`}
            style={{
              width: '100%', padding: '12px 14px',
              border: 'none', outline: 'none', resize: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 12,
              background: 'transparent', color: 'var(--ink)',
              lineHeight: 1.6, minHeight: 90,
            }}
          />
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--rule-2)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setPasteMode(false)} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}>Cancel</button>
            <button
              onClick={onPasteSubmit}
              disabled={!pastedLog.trim()}
              className="btn btn-teal"
              style={{ fontSize: 12, padding: '5px 12px' }}
            >
              Analyse
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div ref={inputAreaRef} style={{ position: 'relative', flexShrink: 0 }}>
        {showPicker && (
          <LogPicker
            onSelect={onLogSelect}
            onClose={() => setShowPicker(false)}
          />
        )}

        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderRadius: 12, padding: '8px 10px 8px 12px',
          transition: 'border-color 0.15s',
        }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--rule)')}
        >
          {/* Attach buttons */}
          <div style={{ display: 'flex', gap: 4, alignSelf: 'flex-end', paddingBottom: 4, flexShrink: 0 }}>
            <button
              title="Select a log from the database"
              onClick={() => { setShowPicker(o => !o); setPasteMode(false) }}
              style={{
                width: 30, height: 30, borderRadius: 6, border: '1px solid var(--rule)',
                background: showPicker ? 'var(--teal-light)' : 'var(--surface-2)',
                color: showPicker ? 'var(--teal)' : 'var(--ink-3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              <Search size={13} />
            </button>
            <button
              title="Paste a raw log to analyse"
              onClick={() => { setPasteMode(o => !o); setShowPicker(false) }}
              style={{
                width: 30, height: 30, borderRadius: 6, border: '1px solid var(--rule)',
                background: pasteMode ? 'var(--teal-light)' : 'var(--surface-2)',
                color: pasteMode ? 'var(--teal)' : 'var(--ink-3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              <FileText size={13} />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder="Ask anything about logs, threats, incidents, or platform health..."
            rows={1}
            disabled={!OPENAI_KEY}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13.5,
              color: 'var(--ink)', lineHeight: 1.55, maxHeight: 120, overflowY: 'auto',
              padding: '5px 0',
            }}
            onInput={e => {
              const el = e.target as HTMLTextAreaElement
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />

          <button
            onClick={() => send()}
            disabled={!input.trim() || loading || !OPENAI_KEY}
            style={{
              width: 34, height: 34, borderRadius: 8, border: 'none', flexShrink: 0,
              background: input.trim() && !loading && OPENAI_KEY ? 'var(--teal)' : 'var(--rule)',
              color: input.trim() && !loading && OPENAI_KEY ? '#fff' : 'var(--ink-3)',
              cursor: input.trim() && !loading && OPENAI_KEY ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s', alignSelf: 'flex-end',
            }}
          >
            {loading ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={14} />}
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          Enter to send · Shift+Enter for new line · <Search size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> select log · <FileText size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> paste log
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
