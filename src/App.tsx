import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Activity, AlertTriangle,
  Shield, Wrench, Radio, ChevronRight, MessageSquare, BrainCircuit
} from 'lucide-react'
import Overview from './pages/Overview'
import LogStream from './pages/LogStream'
import Threats from './pages/Threats'
import Incidents from './pages/Incidents'
import Remediation from './pages/Remediation'
import AgentMonitor from './pages/AgentMonitor'
import AgentChat from './pages/AgentChat'
import AIAnalyst from './pages/AIAnalyst'
import { LogFullDetail } from './lib/api'
import './index.css'

type Page = 'overview' | 'analyst' | 'logs' | 'threats' | 'incidents' | 'remediation' | 'agents' | 'chat'

interface NavItem {
  id: Page
  label: string
  icon: React.ReactNode
}

const NAV: NavItem[] = [
  { id: 'overview',    label: 'Overview',      icon: <LayoutDashboard size={15} /> },
  { id: 'analyst',     label: 'AI Analyst',    icon: <BrainCircuit size={15} /> },
  { id: 'logs',        label: 'Log Stream',    icon: <Activity size={15} /> },
  { id: 'threats',     label: 'Threats',       icon: <AlertTriangle size={15} /> },
  { id: 'incidents',   label: 'Incidents',     icon: <Shield size={15} /> },
  { id: 'remediation', label: 'Remediation',   icon: <Wrench size={15} /> },
  { id: 'agents',      label: 'Agent Monitor', icon: <Radio size={15} /> },
]

const PAGE_TITLES: Record<Page, string> = {
  overview:    'Overview',
  analyst:     'AI Analyst',
  logs:        'Log Stream',
  threats:     'Threat Assessments',
  incidents:   'Incidents',
  remediation: 'Remediation',
  agents:      'Agent Monitor',
  chat:        'Analyst Chat',
}

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const [chatContext, setChatContext] = useState<LogFullDetail | null>(null)
  const [analystMessage, setAnalystMessage] = useState<string | undefined>(undefined)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true)
      } else {
        setSidebarCollapsed(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function refresh() { setRefreshKey(k => k + 1) }

  function openChat(log?: LogFullDetail) {
    setChatContext(log ?? null)
    setPage('chat')
  }

  function openAnalystWithContext(logId: string, context: string) {
    setAnalystMessage(`Investigate log ID ${logId} in full detail. Context: ${context}`)
    setPage('analyst')
  }

  return (
    <div className="layout">
      {!sidebarCollapsed && window.innerWidth < 1024 && (
        <div 
          onClick={() => setSidebarCollapsed(true)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999
          }}
        />
      )}
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <svg viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="currentColor" fillOpacity="0.1" />
              <path d="M14 4L22 9V19L14 24L6 19V9L14 4Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="14" cy="14" r="3" fill="currentColor" />
            </svg>
            {!sidebarCollapsed && (
              <div>
                <div className="sidebar-logo-text">CyberControl</div>
                <div className="sidebar-logo-sub">Aurora Platform</div>
              </div>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">{sidebarCollapsed ? '•' : 'Navigation'}</div>
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => {
                setPage(item.id)
                if (window.innerWidth < 1024) setSidebarCollapsed(true)
              }}
              title={sidebarCollapsed ? item.label : ''}
            >
              {item.icon}
              {!sidebarCollapsed && item.label}
            </button>
          ))}

          <div className="nav-section-label" style={{ marginTop: 8 }}>{sidebarCollapsed ? '•' : 'Assistant'}</div>
          <button
            className={`nav-item ${page === 'chat' ? 'active' : ''}`}
            onClick={() => {
              openChat()
              if (window.innerWidth < 1024) setSidebarCollapsed(true)
            }}
            title={sidebarCollapsed ? 'Analyst Chat' : ''}
          >
            <MessageSquare size={15} />
            {!sidebarCollapsed && 'Analyst Chat'}
          </button>
        </nav>

        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            v0.0.1 · Aurora
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              className="menu-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18 }}>
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>Aurora</span>
              <ChevronRight size={13} color="var(--ink-3)" />
              <span className="topbar-title">{PAGE_TITLES[page]}</span>
              {page === 'chat' && chatContext && (
                <>
                  <ChevronRight size={13} color="var(--ink-3)" />
                  <span style={{ fontSize: 12, color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>
                    {chatContext.id.slice(0, 12)}…
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="topbar-right">
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            {page !== 'chat' && (
              <button className="refresh-btn" onClick={refresh}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Refresh
              </button>
            )}
          </div>
        </header>

        <main className={page === 'chat' || page === 'analyst' ? '' : 'page-content'} style={page === 'chat' || page === 'analyst' ? { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '24px 28px' } : {}}>
          {page === 'chat' ? (
            <AgentChat logContext={chatContext} />
          ) : page === 'analyst' ? (
            <AIAnalyst key={analystMessage} initialMessage={analystMessage} />
          ) : page === 'logs' ? (
            <LogStream key={refreshKey} onAskAI={openAnalystWithContext} />
          ) : page === 'overview' ? (
            <Overview key={refreshKey} />
          ) : page === 'threats' ? (
            <Threats key={refreshKey} onAskAI={openAnalystWithContext} />
          ) : page === 'incidents' ? (
            <Incidents key={refreshKey} onAskAI={openAnalystWithContext} />
          ) : page === 'remediation' ? (
            <Remediation key={refreshKey} />
          ) : (
            <AgentMonitor key={refreshKey} />
          )}
        </main>
      </div>
    </div>
  )
}
