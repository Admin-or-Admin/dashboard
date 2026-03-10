import { useEffect, useState } from 'react'
import { Check, X, Terminal } from 'lucide-react'
import { api, RemediationStep } from '../lib/api'
import { RiskBadge, Spinner, ErrorBox, Timestamp } from '../components/ui'

export default function Remediation() {
  const [steps, setSteps] = useState<RemediationStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'auto' | 'approved' | 'denied'>('all')
  const [offset, setOffset] = useState(0)

  // Local override map — approval decisions made in the UI
  // In production this would call a PATCH endpoint on the gateway
  const [localStatus, setLocalStatus] = useState<Record<number, string>>({})
  const LIMIT = 100

  async function load(o = 0) {
    setLoading(true); setError(null)
    try {
      const data = await api.remediation.list(LIMIT, o)
      setSteps(data); setOffset(o)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function approve(id: number) { setLocalStatus(s => ({ ...s, [id]: 'approved' })) }
  function deny(id: number) { setLocalStatus(s => ({ ...s, [id]: 'denied' })) }

  function getStatus(step: RemediationStep): string {
    return localStatus[step.id] ?? step.status ?? (step.requires_approval ? 'pending' : 'auto')
  }

  const filtered = steps.filter(s => {
    if (filter === 'all') return true
    return getStatus(s) === filter
  })

  const counts = {
    all: steps.length,
    pending: steps.filter(s => getStatus(s) === 'pending').length,
    auto: steps.filter(s => getStatus(s) === 'auto').length,
    approved: steps.filter(s => getStatus(s) === 'approved').length,
    denied: steps.filter(s => getStatus(s) === 'denied').length,
  }

  return (
    <div>
      <div className="tabs">
        {(['all', 'pending', 'auto', 'approved', 'denied'] as const).map(f => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginLeft: 6, fontSize: 11, color: filter === f ? 'var(--teal)' : 'var(--ink-3)' }}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} />}

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No remediation steps in this category.</p>
        </div>
      ) : (
        <div className="step-list">
          {filtered.map(step => {
            const status = getStatus(step)
            const isPending = status === 'pending'
            const isApproved = status === 'approved'
            const isDenied = status === 'denied'

            return (
              <div className="step-item" key={step.id} style={{
                opacity: isDenied ? 0.6 : 1,
                borderColor: isPending ? 'var(--amber)' : isApproved ? 'var(--green)' : isDenied ? '#FCA5A5' : 'var(--rule)',
              }}>
                <div className="step-header">
                  <div className="step-number">{step.step_number ?? step.id}</div>
                  <div className="step-title">{step.title ?? 'Untitled step'}</div>
                  <div className="flex gap-8 items-center">
                    <RiskBadge risk={step.risk} />
                    <span className={`badge badge-${status}`}>{status}</span>
                    {step.estimated_time && (
                      <span className="badge badge-neutral">{step.estimated_time}</span>
                    )}
                  </div>
                </div>

                <div className="step-body">
                  {step.description && <p className="step-desc">{step.description}</p>}

                  {step.command && (
                    <div className="step-command">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, opacity: 0.5 }}>
                        <Terminal size={11} />
                        <span style={{ fontSize: 10, letterSpacing: '0.08em' }}>COMMAND</span>
                      </div>
                      {step.command}
                    </div>
                  )}

                  {step.rollback && (
                    <div style={{
                      fontSize: 12, color: 'var(--ink-3)', background: 'var(--surface-2)',
                      padding: '8px 12px', borderRadius: 'var(--radius)', marginBottom: 10,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      Rollback: {step.rollback}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="td-mono text-sm text-muted">
                      Log: {step.log_id.slice(0, 12)}…
                    </span>

                    {isPending && (
                      <div className="step-actions" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                        <button className="btn btn-approve" onClick={() => approve(step.id)}>
                          <Check size={13} /> Approve
                        </button>
                        <button className="btn btn-deny" onClick={() => deny(step.id)}>
                          <X size={13} /> Deny
                        </button>
                      </div>
                    )}

                    {isApproved && (
                      <span className="flex gap-8 items-center" style={{ fontSize: 12.5, color: 'var(--green)', fontWeight: 500 }}>
                        <Check size={14} /> Approved
                      </span>
                    )}

                    {isDenied && (
                      <span className="flex gap-8 items-center" style={{ fontSize: 12.5, color: 'var(--red)', fontWeight: 500 }}>
                        <X size={14} /> Denied
                      </span>
                    )}
                  </div>

                  {step.executed_at && (
                    <div style={{ marginTop: 8 }}>
                      <span className="text-sm text-muted">Executed: </span>
                      <Timestamp iso={step.executed_at} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="pagination" style={{ marginTop: 16 }}>
        <button className="page-btn" disabled={offset === 0} onClick={() => load(offset - LIMIT)}>Prev</button>
        <span>Showing {offset + 1}–{offset + steps.length}</span>
        <button className="page-btn" disabled={steps.length < LIMIT} onClick={() => load(offset + LIMIT)}>Next</button>
      </div>
    </div>
  )
}
