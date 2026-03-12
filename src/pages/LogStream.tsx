import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api, Log } from '../lib/api'
import { SeverityBadge, Timestamp, Spinner, ErrorBox } from '../components/ui'

export default function LogStream() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Log | null>(null)
  const LIMIT = 50

  async function load(o = 0) {
    setLoading(true); setError(null)
    try {
      const data = await api.logs.list(LIMIT, o)
      const unfiltered = data.filter(l => l.processing_stage === 'unfiltered')
      setLogs(unfiltered); setOffset(o)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(0) }, [])

  useEffect(() => {
    const interval = setInterval(() => load(0), 5000)
    return () => clearInterval(interval)
  }, [])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--green)',
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
            logs.unfiltered — live
          </span>
        </div>
        <input
          className="filter-input"
          placeholder="Search by message, ID or service..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 300, marginLeft: 8 }}
        />
        <button className="refresh-btn" onClick={() => load(0)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trace ID</th>
                <th>Timestamp</th>
                <th>Service</th>
                <th>Message</th>
                <th>Level</th>
                <th>HTTP</th>
                <th>PID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={7}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr className="loading-row"><td colSpan={7}>No unfiltered logs yet. Start the ingestor to see data here.</td></tr>
              ) : filtered.map(log => (
                <tr key={log.id} onClick={() => setSelected(log)}>
                  <td className="td-mono" style={{ color: 'var(--teal)', fontSize: 11 }}>
                    {(log.trace_id ?? log.id).slice(0, 12)}…
                  </td>
                  <td><Timestamp iso={log.timestamp} /></td>
                  <td className="td-mono">{log.service_name ?? '—'}</td>
                  <td>
                    <span className="truncate" style={{ display: 'block' }}>{log.message ?? '—'}</span>
                  </td>
                  <td><SeverityBadge severity={log.raw_severity} /></td>
                  <td className="td-mono">{log.http_status ?? '—'}</td>
                  <td className="td-mono">{log.process_pid ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button className="page-btn" disabled={offset === 0} onClick={() => load(offset - LIMIT)}>Prev</button>
          <span>{filtered.length} logs</span>
          <button className="page-btn" disabled={logs.length < LIMIT} onClick={() => load(offset + LIMIT)}>Next</button>
        </div>
      </div>

      {selected && (
        <div className="detail-overlay" onClick={() => setSelected(null)}>
          <div className="detail-panel" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Raw Log</div>
                <span className="td-mono text-sm text-muted">{selected.trace_id ?? selected.id}</span>
              </div>
              <button className="detail-close" onClick={() => setSelected(null)}><X /></button>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Message</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 12.5,
                background: 'var(--ink)', color: '#E8F4F4',
                padding: '12px 14px', borderRadius: 6,
                lineHeight: 1.6, wordBreak: 'break-all',
              }}>
                {selected.message ?? '(no message)'}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Fields</div>
              <div className="grid-2">
                {[
                  ['Service',     selected.service_name],
                  ['Level',       selected.raw_severity],
                  ['HTTP Status', String(selected.http_status ?? '—')],
                  ['PID',         String(selected.process_pid ?? '—')],
                  ['User ID',     selected.user_id],
                  ['Stage',       selected.processing_stage],
                ].map(([label, value]) => (
                  <div className="detail-field" key={label}>
                    <div className="detail-field-label">{label}</div>
                    <div className="detail-field-value td-mono" style={{ fontSize: 12.5 }}>{value ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">IDs</div>
              <div className="detail-field">
                <div className="detail-field-label">Trace ID</div>
                <div className="detail-field-value td-mono" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                  {selected.trace_id ?? '—'}
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-field-label">Timestamp</div>
                <Timestamp iso={selected.timestamp} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
