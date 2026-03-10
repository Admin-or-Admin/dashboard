import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { api, SeverityStat, TrendPoint, ServiceStat } from '../lib/api'
import { Spinner, ErrorBox } from '../components/ui'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#C0392B', high: '#DC2626', medium: '#D97706',
  low: '#059669', info: '#2563EB',
}

export default function Overview() {
  const [severity, setSeverity] = useState<SeverityStat[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [services, setServices] = useState<ServiceStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const [s, t, sv] = await Promise.all([api.stats.severity(), api.stats.trend(), api.stats.services()])
      setSeverity(s); setTrend(t); setServices(sv)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <Spinner />
  if (error) return <ErrorBox message={error} />

  const totalLogs = severity.reduce((s, x) => s + Number(x.count), 0)
  const criticalCount = severity.find(x => x.severity === 'critical')?.count ?? 0
  const highCount = severity.find(x => x.severity === 'high')?.count ?? 0
  const totalTrend = trend.reduce((s, x) => s + Number(x.count), 0)

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-tile accent">
          <div className="stat-tile-label">Total Logs</div>
          <div className="stat-tile-value">{totalLogs.toLocaleString()}</div>
          <div className="stat-tile-sub">across all services</div>
        </div>
        <div className="stat-tile danger">
          <div className="stat-tile-label">Critical</div>
          <div className="stat-tile-value">{Number(criticalCount).toLocaleString()}</div>
          <div className="stat-tile-sub">require immediate action</div>
        </div>
        <div className="stat-tile warning">
          <div className="stat-tile-label">High Severity</div>
          <div className="stat-tile-value">{Number(highCount).toLocaleString()}</div>
          <div className="stat-tile-sub">elevated risk</div>
        </div>
        <div className="stat-tile success">
          <div className="stat-tile-label">Incidents (30d)</div>
          <div className="stat-tile-value">{totalTrend.toLocaleString()}</div>
          <div className="stat-tile-sub">resolved incidents</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">Severity Distribution</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={severity} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="severity" tick={{ fontSize: 11, fontFamily: 'DM Mono' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'DM Mono' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, fontFamily: 'DM Mono', border: '1px solid #E4E4E4', borderRadius: 4 }}
                  cursor={{ fill: 'var(--surface-2)' }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}
                  fill="var(--teal)"
                  label={false}
                >
                  {severity.map((entry) => (
                    <rect key={entry.severity}
                      fill={SEVERITY_COLORS[entry.severity] ?? 'var(--teal)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Incident Trend — Last 30 Days</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--rule-2)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'DM Mono' }}
                  tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'DM Mono' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, fontFamily: 'DM Mono', border: '1px solid #E4E4E4', borderRadius: 4 }}
                />
                <Line type="monotone" dataKey="count" stroke="var(--teal)" strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--teal)' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Log Volume by Service</span></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={services.slice(0, 12)} layout="vertical"
              margin={{ top: 0, right: 40, left: 80, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'DM Mono' }} />
              <YAxis type="category" dataKey="service_name" tick={{ fontSize: 11, fontFamily: 'DM Mono' }} width={80} />
              <Tooltip
                contentStyle={{ fontSize: 12, fontFamily: 'DM Mono', border: '1px solid #E4E4E4', borderRadius: 4 }}
                cursor={{ fill: 'var(--surface-2)' }}
              />
              <Bar dataKey="count" fill="var(--teal)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
