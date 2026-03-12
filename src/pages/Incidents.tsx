import { useEffect, useState } from 'react'
import { X, MessageSquare } from 'lucide-react'
import { api, Incident, RemediationStep, FollowUpAction } from '../lib/api'
import { Spinner, ErrorBox, Timestamp } from '../components/ui'

interface IncidentsProps {
  onAskAI?: (logId: string, context: string) => void
}

export default function Incidents({ onAskAI }: IncidentsProps) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<Incident | null>(null)
  const [remediation, setRemediation] = useState<RemediationStep[]>([])
  const [followUps, setFollowUps] = useState<FollowUpAction[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const LIMIT = 50

  async function load(o = 0) {
    setLoading(true); setError(null)
    try {
      const data = await api.incidents.list(LIMIT, o)
      setIncidents(data); setOffset(o)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function openIncident(incident: Incident) {
    setSelected(incident); setDetailLoading(true)
    try {
      const [r, f] = await Promise.all([
        api.incidents.remediation(incident.incident_id),
        api.incidents.actions(incident.incident_id),
      ])
      setRemediation(r); setFollowUps(f)
    } catch { setRemediation([]); setFollowUps([]) }
    finally { setDetailLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="filter-bar">
        <button className="refresh-btn" onClick={() => load(offset)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
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
                <th>Incident ID</th>
                <th>Log ID</th>
                <th>Mode</th>
                <th>Summary</th>
                <th>Outcome</th>
                <th>Resolved by</th>
                <th>Resolved at</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={7}>Loading incidents...</td></tr>
              ) : incidents.length === 0 ? (
                <tr className="loading-row"><td colSpan={7}>No incidents found.</td></tr>
              ) : incidents.map(inc => (
                <tr key={inc.incident_id} onClick={() => openIncident(inc)}>
                  <td className="td-mono" style={{ color: 'var(--teal)' }}>{inc.incident_id.slice(0, 8)}…</td>
                  <td className="td-mono text-muted">{inc.log_id.slice(0, 8)}…</td>
                  <td>
                    <span className={`badge ${inc.resolution_mode === 'autonomous' ? 'badge-auto' : 'badge-security'}`}>
                      {inc.resolution_mode ?? '—'}
                    </span>
                  </td>
                  <td>
                    <span className="truncate" style={{ display: 'block', maxWidth: 240 }}>
                      {inc.executive_summary ?? '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${inc.outcome === 'resolved' ? 'badge-low' : 'badge-pending'}`}>
                      {inc.outcome ?? '—'}
                    </span>
                  </td>
                  <td className="td-mono">{inc.resolved_by ?? '—'}</td>
                  <td><Timestamp iso={inc.resolved_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button className="page-btn" disabled={offset === 0} onClick={() => load(offset - LIMIT)}>Prev</button>
          <span>Showing {offset + 1}–{offset + incidents.length}</span>
          <button className="page-btn" disabled={incidents.length < LIMIT} onClick={() => load(offset + LIMIT)}>Next</button>
        </div>
      </div>

      {selected && (
        <div className="detail-overlay" onClick={() => setSelected(null)}>
          <div className="detail-panel" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Incident Detail</div>
                <span className="td-mono text-sm text-muted">{selected.incident_id}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {onAskAI && (
                  <button
                    className="btn btn-teal"
                    style={{ fontSize: 12, padding: '5px 12px' }}
                    onClick={() => {
                      onAskAI(
                        selected.log_id,
                        `Incident ${selected.incident_id} on log ${selected.log_id}: "${selected.executive_summary}", outcome: ${selected.outcome}, root cause: ${selected.root_cause}`
                      )
                      setSelected(null)
                    }}
                  >
                    <MessageSquare size={13} />
                    Ask AI
                  </button>
                )}
                <button className="detail-close" onClick={() => setSelected(null)}><X /></button>
              </div>
            </div>

            {detailLoading ? <Spinner /> : (
              <>
                <div className="detail-section">
                  <div className="detail-section-title">Summary</div>
                  <div className="detail-field">
                    <div className="detail-field-label">Executive Summary</div>
                    <div className="detail-field-value">{selected.executive_summary ?? '—'}</div>
                  </div>
                  <div className="grid-2">
                    <div className="detail-field">
                      <div className="detail-field-label">Mode</div>
                      <span className={`badge ${selected.resolution_mode === 'autonomous' ? 'badge-auto' : 'badge-security'}`}>
                        {selected.resolution_mode ?? '—'}
                      </span>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Outcome</div>
                      <span className={`badge ${selected.outcome === 'resolved' ? 'badge-low' : 'badge-pending'}`}>
                        {selected.outcome ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">Post-incident Analysis</div>
                  {[
                    ['What Happened', selected.what_happened],
                    ['Impact Assessment', selected.impact_assessment],
                    ['Root Cause', selected.root_cause],
                    ['Lessons Learned', selected.lessons_learned],
                  ].map(([label, value]) => (
                    <div className="detail-field" key={label as string}>
                      <div className="detail-field-label">{label}</div>
                      <div className="detail-field-value">{value ?? '—'}</div>
                    </div>
                  ))}
                </div>

                {remediation.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title">Remediation Steps ({remediation.length})</div>
                    <div className="step-list">
                      {remediation.map(step => (
                        <div className="step-item" key={step.id}>
                          <div className="step-header">
                            <div className="step-number">{step.step_number}</div>
                            <div className="step-title">{step.title}</div>
                            <span className={`badge ${step.status === 'approved' ? 'badge-approved' : step.status === 'denied' ? 'badge-denied' : step.status === 'auto' ? 'badge-auto' : 'badge-pending'}`}>
                              {step.status ?? 'pending'}
                            </span>
                          </div>
                          {(step.description || step.command) && (
                            <div className="step-body">
                              {step.description && <p className="step-desc">{step.description}</p>}
                              {step.command && <div className="step-command">{step.command}</div>}
                              <div className="step-meta">
                                {step.risk && (
                                  <span className={`badge badge-${step.risk === 'high' ? 'high' : step.risk === 'medium' ? 'medium' : 'low'}`}>
                                    {step.risk} risk
                                  </span>
                                )}
                                {step.estimated_time && (
                                  <span className="badge badge-neutral">{step.estimated_time}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {followUps.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title">Follow-up Actions ({followUps.length})</div>
                    {followUps.map(fu => (
                      <div key={fu.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--rule-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{fu.title}</span>
                          <span className="badge badge-neutral">{fu.deadline}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 4 }}>{fu.description}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                          Owner: {fu.owner ?? '—'}
                        </div>
                      </div>
                    ))}
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
