import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api, Log, LogFullDetail } from '../lib/api'
import { SeverityBadge, CategoryBadge, Timestamp, Spinner, ErrorBox } from '../components/ui'

export default function LogStream() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [selected, setSelected] = useState<LogFullDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const LIMIT = 50

  async function load(o = 0) {
    setLoading(true); setError(null)
    try {
      const data = await api.logs.list(LIMIT, o, serviceFilter || undefined)
      setLogs(data); setOffset(o)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function openDetail(id: string) {
    setDetailLoading(true)
    try {
      const data = await api.logs.full(id)
      setSelected(data)
    } catch { /* fall back to basic */ }
    finally { setDetailLoading(false) }
  }

  useEffect(() => { load(0) }, [serviceFilter])

  const services = [...new Set(logs.map(l => l.service_name).filter(Boolean))]

  const filtered = search
    ? logs.filter(l =>
        l.message?.toLowerCase().includes(search.toLowerCase()) ||
        l.id.includes(search) ||
        l.service_name?.toLowerCase().includes(search.toLowerCase())
      )
    : logs

  return (
    <div>
      <div className="filter-bar">
        <input
          className="filter-input"
          placeholder="Search by message, ID or service..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <select className="filter-select" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
          <option value="">All services</option>
          {services.map(s => <option key={s!} value={s!}>{s}</option>)}
        </select>
        <button className="refresh-btn" onClick={() => load(offset)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Service</th>
                <th>Message</th>
                <th>Severity</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={6}>Loading logs...</td></tr>
              ) : filtered.length === 0 ? (
                <tr className="loading-row"><td colSpan={6}>No logs found.</td></tr>
              ) : filtered.map(log => (
                <tr key={log.id} onClick={() => openDetail(log.id)}>
                  <td className="td-mono" style={{ color: 'var(--teal)' }}>{log.id.slice(0, 8)}…</td>
                  <td><Timestamp iso={log.timestamp} /></td>
                  <td className="td-mono">{log.service_name ?? '—'}</td>
                  <td><span className="truncate" style={{ display: 'block' }}>{log.message ?? '—'}</span></td>
                  <td><SeverityBadge severity={log.raw_severity} /></td>
                  <td>
                    <span className="badge badge-neutral td-mono" style={{ fontSize: 10 }}>
                      {log.processing_stage ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button className="page-btn" disabled={offset === 0} onClick={() => load(offset - LIMIT)}>Prev</button>
          <span>Showing {offset + 1}–{offset + filtered.length}</span>
          <button className="page-btn" disabled={logs.length < LIMIT} onClick={() => load(offset + LIMIT)}>Next</button>
        </div>
      </div>

      {/* Detail panel */}
      {(selected || detailLoading) && (
        <div className="detail-overlay" onClick={() => setSelected(null)}>
          <div className="detail-panel" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Log Detail</div>
                <span className="td-mono text-sm text-muted">{selected?.id}</span>
              </div>
              <button className="detail-close" onClick={() => setSelected(null)}><X /></button>
            </div>

            {detailLoading ? <Spinner /> : selected && (
              <>
                <div className="detail-section">
                  <div className="detail-section-title">Raw Log</div>
                  <div className="detail-field">
                    <div className="detail-field-label">Message</div>
                    <div className="detail-field-value">{selected.message ?? '—'}</div>
                  </div>
                  <div className="grid-2">
                    <div className="detail-field">
                      <div className="detail-field-label">Service</div>
                      <div className="detail-field-value td-mono">{selected.service_name ?? '—'}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Timestamp</div>
                      <Timestamp iso={selected.timestamp} />
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">HTTP Status</div>
                      <div className="detail-field-value td-mono">{selected.http_status ?? '—'}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Trace ID</div>
                      <div className="detail-field-value td-mono" style={{ wordBreak: 'break-all', fontSize: 11 }}>{selected.trace_id ?? '—'}</div>
                    </div>
                  </div>
                </div>

                {selected.classification && (
                  <div className="detail-section">
                    <div className="detail-section-title">Classification</div>
                    <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
                      <CategoryBadge category={selected.classification.category} />
                      <SeverityBadge severity={selected.classification.severity} />
                      {selected.classification.is_cybersecurity && (
                        <span className="badge badge-security">Cybersecurity</span>
                      )}
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Reasoning</div>
                      <div className="detail-field-value">{selected.classification.reasoning ?? '—'}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Confidence</div>
                      <div className="detail-field-value td-mono">{selected.classification.confidence ?? '—'}%</div>
                    </div>
                    {selected.classification.tags && (
                      <div className="detail-field">
                        <div className="detail-field-label">Tags</div>
                        <div className="flex gap-8" style={{ flexWrap: 'wrap', marginTop: 4 }}>
                          {selected.classification.tags.map(t => (
                            <span key={t} className="badge badge-neutral">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selected.threat_assessment && (
                  <div className="detail-section">
                    <div className="detail-section-title">Threat Assessment</div>
                    <div className="detail-field">
                      <div className="detail-field-label">AI Analysis</div>
                      <div className="detail-field-value">{selected.threat_assessment.ai_suggestion ?? '—'}</div>
                    </div>
                    <div className="grid-2">
                      <div className="detail-field">
                        <div className="detail-field-label">Attack Vector</div>
                        <div className="detail-field-value">{selected.threat_assessment.attack_vector ?? '—'}</div>
                      </div>
                      <div className="detail-field">
                        <div className="detail-field-label">Priority</div>
                        <div className="detail-field-value td-mono">{selected.threat_assessment.priority ?? '—'}/5</div>
                      </div>
                    </div>
                  </div>
                )}

                {selected.incident && (
                  <div className="detail-section">
                    <div className="detail-section-title">Incident</div>
                    <div className="detail-field">
                      <div className="detail-field-label">Summary</div>
                      <div className="detail-field-value">{selected.incident.executive_summary ?? '—'}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Root Cause</div>
                      <div className="detail-field-value">{selected.incident.root_cause ?? '—'}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
