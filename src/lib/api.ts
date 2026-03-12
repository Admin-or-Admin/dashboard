const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(BASE_URL + path)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

// ── Types ─────────────────────────────────────────────────────────────────────

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
  processing_stage: string | null
}

export interface Classification {
  log_id: string
  category: string | null
  severity: string | null
  is_cybersecurity: boolean | null
  confidence: number | null
  reasoning: string | null
  tags: string[] | null
  created_at: string
}

export interface ThreatAssessment {
  log_id: string
  attack_vector: string | null
  ai_suggestion: string | null
  complexity: string | null
  recurrence_rate: number | null
  confidence: number | null
  auto_fixable: boolean | null
  requires_approval: boolean | null
  priority: number | null
  notify_teams: string[] | null
  created_at: string
}

export interface Incident {
  incident_id: string
  log_id: string
  resolution_mode: string | null
  executive_summary: string | null
  outcome: string | null
  resolved_by: string | null
  what_happened: string | null
  impact_assessment: string | null
  root_cause: string | null
  lessons_learned: string | null
  resolved_at: string
}

export interface RemediationStep {
  id: number
  log_id: string
  step_number: number | null
  title: string | null
  description: string | null
  command: string | null
  risk: string | null
  estimated_time: string | null
  rollback: string | null
  auto_execute: boolean | null
  requires_approval: boolean | null
  status: string | null
  executed_at: string | null
  created_at: string
}

export interface FollowUpAction {
  id: number
  incident_id: string
  title: string | null
  description: string | null
  owner: string | null
  deadline: string | null
  created_at: string
}

export interface LogDetail extends Log {
  classification: Classification | null
  threat_assessment: ThreatAssessment | null
}

export interface LogFullDetail extends LogDetail {
  remediation_steps: RemediationStep[]
  incident: Incident | null
}

export interface SeverityStat { severity: string; count: number }
export interface TrendPoint { date: string; count: number }
export interface ServiceStat { service_name: string; count: number }

// ── API calls ─────────────────────────────────────────────────────────────────

export const api = {
  logs: {
    list: (limit = 100, offset = 0, service_name?: string) =>
      get<Log[]>('/logs', service_name ? { limit, offset, service_name } : { limit, offset }),
    get: (id: string) => get<Log>(`/logs/${id}`),
    details: (id: string) => get<LogDetail>(`/logs/${id}/details`),
    full: (id: string) => get<LogFullDetail>(`/logs/${id}/full`),
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
    updateStatus: async (id: number, status: 'approved' | 'denied') => {
      const res = await fetch(`${BASE_URL}/remediation/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return res.json()
    },
  },
  stats: {
    severity: () => get<SeverityStat[]>('/stats/severity'),
    trend: () => get<TrendPoint[]>('/stats/incidents/trend'),
    services: () => get<ServiceStat[]>('/stats/services'),
  },
}
