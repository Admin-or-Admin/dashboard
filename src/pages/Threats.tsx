import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api, ThreatAssessment } from '../lib/api'
import { SeverityBadge, PriorityBar, ConfidenceBar, Spinner, ErrorBox, Timestamp } from '../components/ui'

export default function Threats() {
  const [threats, setThreats] = useState<ThreatAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ThreatAssessment | null>(null)
  const [complexityFilter, setComplexityFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  async function load(o = 0) {
    setLoading(true); setError(null)
    try {
      const data = await api.threats.list(LIMIT, o)
      setThreats(data); setOffset(o)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = complexityFilter
    ? threats.filter(t => t.complexity === complexityFilter)
    : threats

  return (
    <div>
      <div className="filter-bar">
        <select className="filter-select" value={complexityFilter} onChange={e => setComplexityFilter(e.target.value)}>
          <option value="">All complexity</option>
          <option value="simple">Simple</option>
          <option value="complex">Complex</option>
        </select>
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
                <th>Log ID</th>
                <th>Attack Vector</th>
                <th>Complexity</th>
                <th>Priority</th>
                <th>Confidence</th>
                <th>Auto-fixable</th>
                <th>Recurrence</th>
                <th>Detected</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={8}>Loading threats...</td></tr>
              ) : filtered.length === 0 ? (
                <tr className="loading-row"><td colSpan={8}>No threats found.</td></tr>
              ) : filtered.map(t => (
                <tr key={t.log_id} onClick={() => setSelected(t)}>
                  <td className="td-mono" style={{ color: 'var(--teal)' }}>{t.log_id.slice(0, 8)}…</td>
                  <td style={{ maxWidth: 200 }}>
                    <span className="truncate" style={{ display: 'block' }}>{t.attack_vector ?? '—'}</span>
                  </td>
                  <td>
                    <span className={`badge ${t.complexity === 'complex' ? 'badge-high' : 'badge-low'}`}>
                      {t.complexity ?? '—'}
                    </span>
                  </td>
                  <td><PriorityBar priority={t.priority} /></td>
                  <td><ConfidenceBar value={t.confidence} /></td>
                  <td>
                    <span className={`badge ${t.auto_fixable ? 'badge-auto' : 'badge-pending'}`}>
                      {t.auto_fixable ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="td-mono">{t.recurrence_rate ?? '—'}%</td>
                  <td><Timestamp iso={t.created_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button className="page-btn" disabled={offset === 0} onClick={() => load(offset - LIMIT)}>Prev</button>
          <span>Showing {offset + 1}–{offset + filtered.length}</span>
          <button className="page-btn" disabled={threats.length < LIMIT} onClick={() => load(offset + LIMIT)}>Next</button>
        </div>
      </div>

      {selected && (
        <div className="detail-overlay" onClick={() => setSelected(null)}>
          <div className="detail-panel" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Threat Assessment</div>
                <span className="td-mono text-sm text-muted">{selected.log_id}</span>
              </div>
              <button className="detail-close" onClick={() => setSelected(null)}><X /></button>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Analysis</div>
              <div className="detail-field">
                <div className="detail-field-label">AI Suggestion</div>
                <div className="detail-field-value">{selected.ai_suggestion ?? '—'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-field-label">Attack Vector</div>
                <div className="detail-field-value">{selected.attack_vector ?? '—'}</div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Assessment</div>
              <div className="grid-2">
                <div className="detail-field">
                  <div className="detail-field-label">Priority</div>
                  <PriorityBar priority={selected.priority} />
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Confidence</div>
                  <ConfidenceBar value={selected.confidence} />
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Complexity</div>
                  <span className={`badge ${selected.complexity === 'complex' ? 'badge-high' : 'badge-low'}`}>
                    {selected.complexity ?? '—'}
                  </span>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Recurrence Rate</div>
                  <div className="detail-field-value td-mono">{selected.recurrence_rate ?? '—'}%</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Auto-fixable</div>
                  <span className={`badge ${selected.auto_fixable ? 'badge-auto' : 'badge-pending'}`}>
                    {selected.auto_fixable ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Requires Approval</div>
                  <span className={`badge ${selected.requires_approval ? 'badge-pending' : 'badge-auto'}`}>
                    {selected.requires_approval ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {selected.notify_teams && selected.notify_teams.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">Notify Teams</div>
                <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                  {selected.notify_teams.map(t => (
                    <span key={t} className="badge badge-security">{t}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-section">
              <div className="detail-section-title">Metadata</div>
              <div className="detail-field">
                <div className="detail-field-label">Detected at</div>
                <Timestamp iso={selected.created_at} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
