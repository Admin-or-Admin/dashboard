// gateway runs on 8000 locally, override with VITE_API_URL in .env
const BASE_URL = (window as any).env?.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  username: string
  email: string
  is_active: boolean
  created_at: string
}

export interface Token {
  access_token: string
  token_type: string
}

// mirrors the logs table in postgres — raw log as it came off kafka
export interface Log {
  id: string
  timestamp: string
  message: string | null
  service_name: string | null
  raw_severity: string | null
  created_at: string
  user_id: string | null
  http_status: number | null
  process_pid: number | null
  trace_id: string | null
  processing_stage: string | null // "unfiltered" means it hasn't been touched by the agents yet
}

// what the classifier agent writes after processing a log
export interface Classification {
  log_id: string
  category: string | null
  severity: string | null
  is_cybersecurity: boolean | null
  confidence: number | null // 0-100
  reasoning: string | null
  tags: string[] | null
  created_at: string
}

// what the analyst agent writes, deeper threat analysis on top of classification
export interface ThreatAssessment {
  log_id: string
  attack_vector: string | null
  ai_suggestion: string | null
  complexity: string | null
  recurrence_rate: number | null
  confidence: number | null
  auto_fixable: boolean | null
  requires_approval: boolean | null
  priority: number | null // 1-5, 5 is most urgent
  notify_teams: string[] | null
  created_at: string
}

// final output from the responder agent
export interface Incident {
  incident_id: string
  log_id: string
  resolution_mode: string | null // "autonomous" or "manual"
  executive_summary: string | null
  outcome: string | null
  resolved_by: string | null
  what_happened: string | null
  impact_assessment: string | null
  root_cause: string | null
  lessons_learned: string | null
  resolved_at: string
}

// individual steps the responder generated to fix the incident
export interface RemediationStep {
  id: number
  log_id: string
  step_number: number | null
  title: string | null
  description: string | null
  command: string | null // actual shell command to run
  risk: string | null // low / medium / high
  estimated_time: string | null
  rollback: string | null // how to undo this step if it goes wrong
  auto_execute: boolean | null
  requires_approval: boolean | null
  status: string | null // pending / approved / denied / auto
  executed_at: string | null
  created_at: string
}

// follow-up tasks created after an incident is resolved
export interface FollowUpAction {
  id: number
  incident_id: string
  title: string | null
  description: string | null
  owner: string | null
  deadline: string | null
  created_at: string
}

// log + its classification + threat assessment joined together
export interface LogDetail extends Log {
  classification: Classification | null
  threat_assessment: ThreatAssessment | null
}

// everything about a log in one shot — used for the detail panel
export interface LogFullDetail extends LogDetail {
  remediation_steps: RemediationStep[]
  incident: Incident | null
}

export interface ChatMessage {
  id?: number
  session_id: string
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string
  timestamp: string
}

export interface ChatSession {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  messages: ChatMessage[]
}

export interface AIAnalysisResponse {
  intermediate_steps: { tool: string; args: string; result: string }[]
  final_answer: string
}

// used for the charts on the overview page
export interface SeverityStat { severity: string; count: number }
export interface TrendPoint { date: string; count: number }
export interface ServiceStat { service_name: string; count: number }

// ── Generic Request Wrapper ───────────────────────────────────────────────────

async function request<T>(
  path: string, 
  options: RequestInit = {}, 
  params?: Record<string, string | number>
): Promise<T> {
  const url = new URL(BASE_URL + path)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  
  const token = localStorage.getItem('aurora_token')
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  const res = await fetch(url.toString(), { ...options, headers })
  
  if (res.status === 401) {
    localStorage.removeItem('aurora_token')
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login'
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || `${res.status} ${res.statusText}`)
  }
  
  return res.json()
}

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  return request<T>(path, { method: 'GET' }, params)
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: async (formData: FormData) => {
      // OAuth2 Password flow uses x-www-form-urlencoded
      return request<Token>('/auth/login', {
        method: 'POST',
        body: formData,
      })
    },
    register: async (userData: any) => {
      return request<User>('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
    },
    me: () => get<User>('/auth/me'),
  },
  logs: {
    list: (limit = 100, offset = 0, service_name?: string) =>
      get<Log[]>('/logs', service_name ? { limit, offset, service_name } : { limit, offset }),
    get: (id: string) => get<Log>(`/logs/${id}`),
    details: (id: string) => get<LogDetail>(`/logs/${id}/details`),
    full: (id: string) => get<LogFullDetail>(`/logs/${id}/full`),
  },
  chats: {
    list: () => get<ChatSession[]>('/chats'),
    get: (id: string) => get<ChatSession>(`/chats/${id}`),
    create: (id: string, title?: string) => 
      request<ChatSession>('/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title }),
      }),
    addMessage: (sessionId: string, role: string, content: string) =>
      request<ChatMessage>(`/chats/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      }),
    completion: (messages: { role: string; content: string }[], logId?: string) =>
      request<{ content: string }>('/chats/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, log_id: logId }),
      }),
    analyze: (messages: { role: string; content: string }[]) =>
      request<AIAnalysisResponse>('/chats/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      }),
    delete: (id: string) => request<void>(`/chats/${id}`, { method: 'DELETE' }),
  },
  classifications: {
    list: (limit = 100, offset = 0) => get<Classification[]>('/classifications', { limit, offset }),
    get: (log_id: string) => get<Classification>(`/classifications/${log_id}`),
  },
  threats: {
    list: (limit = 100, offset = 0) => get<ThreatAssessment[]>('/threats', { limit, offset }),
    get: (log_id: string) => get<ThreatAssessment>(`/threats/${log_id}`),
  },
  incidents: {
    list: (limit = 100, offset = 0) => get<Incident[]>('/incidents', { limit, offset }),
    get: (id: string) => get<Incident>(`/incidents/${id}`),
    remediation: (id: string) => get<RemediationStep[]>(`/incidents/${id}/remediation`),
    actions: (id: string) => get<FollowUpAction[]>(`/incidents/${id}/actions`),
  },
  remediation: {
    list: (limit = 100, offset = 0) => get<RemediationStep[]>('/remediation', { limit, offset }),
    byLog: (log_id: string) => get<RemediationStep[]>(`/remediation/log/${log_id}`),
    updateStatus: (id: number, status: string) =>
      request<any>(`/remediation/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
  },
  stats: {
    severity: () => get<SeverityStat[]>('/stats/severity'),
    services: () => get<ServiceStat[]>('/stats/services'),
    trend: () => get<TrendPoint[]>('/stats/incidents/trend'),
  },
  health: {
    check: () => get<any>('/health'),
  }
}
