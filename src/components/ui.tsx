import { ReactNode } from 'react'

// ── Severity badge ────────────────────────────────────────────────────────────
export function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return <span className="badge badge-neutral">—</span>
  const cls = `badge badge-${severity.toLowerCase()}`
  return <span className={cls}>{severity.toUpperCase()}</span>
}

// ── Category badge ────────────────────────────────────────────────────────────
export function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="badge badge-neutral">—</span>
  const map: Record<string, string> = {
    security: 'badge-security',
    infrastructure: 'badge-info',
    application: 'badge-neutral',
    deployment: 'badge-neutral',
  }
  return <span className={`badge ${map[category] ?? 'badge-neutral'}`}>{category}</span>
}

// ── Risk badge ────────────────────────────────────────────────────────────────
export function RiskBadge({ risk }: { risk: string | null }) {
  if (!risk) return <span className="badge badge-neutral">—</span>
  const map: Record<string, string> = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high' }
  return <span className={`badge ${map[risk] ?? 'badge-neutral'}`}>{risk}</span>
}

// ── Approval status badge ─────────────────────────────────────────────────────
export function ApprovalBadge({ status }: { status: string | null }) {
  if (!status) return <span className="badge badge-neutral">—</span>
  const map: Record<string, string> = {
    pending: 'badge-pending',
    auto: 'badge-auto',
    approved: 'badge-approved',
    denied: 'badge-denied',
  }
  return <span className={`badge ${map[status] ?? 'badge-neutral'}`}>{status}</span>
}

// ── Priority pips ─────────────────────────────────────────────────────────────
export function PriorityBar({ priority }: { priority: number | null }) {
  if (!priority) return <span className="text-muted text-mono text-sm">—</span>
  return (
    <div className="priority-bar">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`priority-pip ${i <= priority ? (priority >= 4 ? 'high' : 'filled') : ''}`}
        />
      ))}
      <span className="text-mono text-sm text-muted" style={{ marginLeft: 6 }}>{priority}/5</span>
    </div>
  )
}

// ── Confidence bar ────────────────────────────────────────────────────────────
export function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted text-mono text-sm">—</span>
  const color = value >= 80 ? 'var(--green)' : value >= 60 ? 'var(--amber)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span className="text-mono text-sm">{value}%</span>
    </div>
  )
}

// ── Timestamp formatter ───────────────────────────────────────────────────────
export function Timestamp({ iso }: { iso: string }) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <span className="text-mono text-sm text-muted" title={iso}>
      {date} {time}
    </span>
  )
}

// ── Loading spinner ───────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle cx="12" cy="12" r="10" stroke="var(--rule)" strokeWidth="2.5" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// ── Error box ─────────────────────────────────────────────────────────────────
export function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      background: 'var(--red-light)', border: '1px solid #FCA5A5',
      borderRadius: 'var(--radius-lg)', padding: '16px 20px', color: 'var(--red)',
      fontSize: 13, marginBottom: 16
    }}>
      Could not load data: {message}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="card mb-24">
      <div className="card-header">
        <span className="card-title">{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}
