import { useState } from 'react'
import {
  LayoutDashboard, Activity, AlertTriangle,
  Shield, Wrench, Radio, ChevronRight
} from 'lucide-react'
import Overview from './pages/Overview'
import LogStream from './pages/LogStream'
import Threats from './pages/Threats'
import Incidents from './pages/Incidents'
import Remediation from './pages/Remediation'
import AgentMonitor from './pages/AgentMonitor'
import './index.css'

type Page = 'overview' | 'logs' | 'threats' | 'incidents' | 'remediation' | 'agents'

interface NavItem {
  id: Page
  label: string
  icon: React.ReactNode
}

const NAV: NavItem[] = [
  { id: 'overview',    label: 'Overview',      icon: <LayoutDashboard size={15} /> },
  { id: 'logs',        label: 'Log Stream',    icon: <Activity size={15} /> },
  { id: 'threats',     label: 'Threats',       icon: <AlertTriangle size={15} /> },
  { id: 'incidents',   label: 'Incidents',     icon: <Shield size={15} /> },
  { id: 'remediation', label: 'Remediation',   icon: <Wrench size={15} /> },
  { id: 'agents',      label: 'Agent Monitor', icon: <Radio size={15} /> },
]

const PAGE_TITLES: Record<Page, string> = {
  overview:    'Overview',
  logs:        'Log Stream',
  threats:     'Threat Assessments',
  incidents:   'Incidents',
  remediation: 'Remediation',
  agents:      'Agent Monitor',
}

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [refreshKey, setRefreshKey] = useState(0)

  function refresh() { setRefreshKey(k => k + 1) }

  const PageComponent = {
    overview:    Overview,
    logs:        LogStream,
    threats:     Threats,
    incidents:   Incidents,
    remediation: Remediation,
    agents:      AgentMonitor,
  }[page]

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <svg viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="currentColor" fillOpacity="0.1" />
              <path d="M14 4L22 9V19L14 24L6 19V9L14 4Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="14" cy="14" r="3" fill="currentColor" />
            </svg>
            <div>
              <div className="sidebar-logo-text">CyberControl</div>
              <div className="sidebar-logo-sub">Aurora Platform</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          v1.0.0 · Aurora
        </div>
      </aside>

      {/* Main area */}
      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>Aurora</span>
            <ChevronRight size={13} color="var(--ink-3)" />
            <span className="topbar-title">{PAGE_TITLES[page]}</span>
          </div>
          <div className="topbar-right">
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            <button className="refresh-btn" onClick={refresh}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        <main className="page-content">
          <PageComponent key={refreshKey} />
        </main>
      </div>
    </div>
  )
}
