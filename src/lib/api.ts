// gateway runs on 8000 locally, override with VITE_API_URL in .env
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// generic GET wrapper, builds the full URL with query params and parses the JSON response
// T is whatever type we expect back (Log[], Incident, etc.)
async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(BASE_URL + path)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

// ── Types ─────────────────────────────────────────────────────────────────────

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

// used for the charts on the overview page
export interface SeverityStat { severity: string; count: number }
export interface TrendPoint { date: string; count: number }
export interface ServiceStat { service_name: string; count: number }

// ── API calls ─────────────────────────────────────────────────────────────────

// all gateway calls go through here, one place to change if the gateway moves
export const api = {
  logs: {
    list: (limit = 100, offset = 0, service_name?: string) =>
      get<Log[]>('/logs', service_name ? { limit, offset, service_name } : { limit, offset }),
    get: (id: string) => get<Log>(`/logs/${id}`),
    details: (id: string) => get<LogDetail>(`/logs/${id}/details`), // log + classification + threat
    full: (id: string) => get<LogFullDetail>(`/logs/${id}/full`),   // everything including incident + remediation
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
    // PATCH endpoint, writes approval decision to the db
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
    // these three feed the charts on the overview page
    severity: () => get<SeverityStat[]>('/stats/severity'),
    trend: () => get<TrendPoint[]>('/stats/incidents/trend'),
    services: () => get<ServiceStat[]>('/stats/services'),
  },
}