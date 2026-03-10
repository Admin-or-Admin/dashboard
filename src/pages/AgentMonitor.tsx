import { useEffect, useState } from 'react'
import { Activity, Clock, Zap, Shield, Target } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api, Classification, ThreatAssessment } from '../lib/api'
import { Spinner, ErrorBox } from '../components/ui'

// This page derives agent health metrics from the data already in the DB
// since the analytics Kafka topic feeds into the ledger → DB pipeline.
// We reconstruct agent-level stats from what the gateway exposes.

interface AgentStats {
  name: string
  role: string
  processed: number
  security: number
  avgConfidence: number
  topCategory: string
  status: 'online' | 'idle' | 'offline'
}

export default function AgentMonitor() {
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [threats, setThreats] = useState<ThreatAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const [c, t] = await Promise.all([
        api.classifications.list(1000),
        api.threats.list(1000),
      ])
      setClassifications(c); setThreats(t)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <Spinner />
  if (error) return <ErrorBox message={error} />

  // Derive classifier stats
  const secCount = classifications.filter(c => c.is_cybersecurity).length
  const avgConf = classifications.length
    ? Math.round(classifications.reduce((s, c) => s + (c.confidence ?? 0), 0) / classifications.length)
    : 0
  const catCounts = classifications.reduce((acc, c) => {
    if (c.category) acc[c.category] = (acc[c.category] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  const severityCounts = ['critical', 'high', 'medium', 'low', 'info'].map(s => ({
    severity: s,
    count: classifications.filter(c => c.severity === s).length,
  }))

  // Derive analyst stats
  const autoFixable = threats.filter(t => t.auto_fixable).length
  const avgPriority = threats.length
    ? (threats.reduce((s, t) => s + (t.priority ?? 0), 0) / threats.length).toFixed(1)
    : '—'
  const complexCount = threats.filter(t => t.complexity === 'complex').length

  const complexityData = [
    { name: 'Simple', count: threats.filter(t => t.complexity === 'simple').length },
    { name: 'Complex', count: complexCount },
  ]

  const priorityData = [1, 2, 3, 4, 5].map(p => ({
    priority: `P${p}`,
    count: threats.filter(t => t.priority === p).length,
  }))

  const agents: AgentStats[] = [
    {
      name: 'Classifier',
      role: 'Recognise',
      processed: classifications.length,
      security: secCount,
      avgConfidence: avgConf,
      topCategory: topCat,
      status: classifications.length > 0 ? 'online' : 'idle',
    },
    {
      name: 'Analyst',
      role: 'Analyse',
      processed: threats.length,
      security: threats.filter(t => t.requires_approval).length,
      avgConfidence: threats.length
        ? Math.round(threats.reduce((s, t) => s + (t.confidence ?? 0), 0) / threats.length)
        : 0,
      topCategory: `P${Math.round(Number(avgPriority))} avg`,
      status: threats.length > 0 ? 'online' : 'idle',
    },
    {
      name: 'Responder',
      role: 'Counter',
      processed: autoFixable + threats.filter(t => !t.auto_fixable).length,
      security: autoFixable,
      avgConfidence: threats.length
        ? Math.round((autoFixable / threats.length) * 100)
        : 0,
      topCategory: autoFixable > 0 ? 'auto-fixable' : 'guided',
      status: threats.length > 0 ? 'online' : 'idle',
    },
  ]

  return (
    <div>
      <div className="agent-grid">
        {agents.map(agent => (
          <div className="agent-card" key={agent.name}>
            <div className="agent-card-header">
              <div>
                <div className="agent-name">{agent.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {agent.role}
                </div>
              </div>
              <div className="agent-status">
                <div className={`status-dot ${agent.status === 'idle' ? 'warning' : agent.status === 'offline' ? 'offline' : ''}`} />
                <span style={{ color: agent.status === 'online' ? 'var(--green)' : 'var(--ink-3)' }}>
                  {agent.status}
                </span>
              </div>
            </div>
            <div className="agent-stats">
              <div className="agent-stat">
                <div className="agent-stat-label">Processed</div>
                <div className="agent-stat-value">{agent.processed.toLocaleString()}</div>
              </div>
              <div className="agent-stat">
                <div className="agent-stat-label">Avg Conf.</div>
                <div className="agent-stat-value">{agent.avgConfidence}%</div>
              </div>
              <div className="agent-stat">
                <div className="agent-stat-label">Security</div>
                <div className="agent-stat-value">{agent.security.toLocaleString()}</div>
              </div>
              <div className="agent-stat">
                <div className="agent-stat-label">Top</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', marginTop: 2, color: 'var(--ink)' }}>
                  {agent.topCategory}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Classifier — Severity Breakdown</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={severityCounts} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="severity" tick={{ fontSize: 11, fontFamily: 'DM Mono' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'DM Mono' }} />
                <Tooltip contentStyle={{ fontSize: 12, fontFamily: 'DM Mono', border: '1px solid #E4E4E4', borderRadius: 4 }} />
                <Bar dataKey="count" fill="var(--teal)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Analyst — Priority Distribution</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="priority" tick={{ fontSize: 11, fontFamily: 'DM Mono' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'DM Mono' }} />
                <Tooltip contentStyle={{ fontSize: 12, fontFamily: 'DM Mono', border: '1px solid #E4E4E4', borderRadius: 4 }} />
                <Bar dataKey="count" fill="var(--red)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Analyst — Complexity Split</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 24 }}>
            {complexityData.map(d => (
              <div key={d.name} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 500, color: d.name === 'Complex' ? 'var(--red)' : 'var(--green)' }}>
                  {d.count}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{d.name} incidents</div>
                <div style={{ marginTop: 8, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: threats.length ? `${(d.count / threats.length) * 100}%` : '0%',
                    height: '100%',
                    background: d.name === 'Complex' ? 'var(--red)' : 'var(--green)',
                    borderRadius: 2,
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  {threats.length ? Math.round((d.count / threats.length) * 100) : 0}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">Category Breakdown — Classifier</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {Object.entries(catCounts).map(([cat, count]) => (
              <div key={cat} style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--rule)' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                  {cat}
                </div>
                <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                  {classifications.length ? Math.round((count / classifications.length) * 100) : 0}% of total
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
