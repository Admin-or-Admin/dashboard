# CyberControl Aurora Dashboard

React + TypeScript frontend for the CyberControl platform — an AI-powered security operations center built on Apache Kafka, PostgreSQL, and three autonomous AI agents (Classifier, Analyst, Responder).

The dashboard connects to the [gateway](https://github.com/Admin-or-Admin/gateway) REST API and provides a live view of everything the platform is doing.

---

## Pages

### Overview
High-level system health at a glance. Shows total log count, active threats, open incidents, and pending remediation steps. Includes three charts: log severity distribution, incident trend over the last 30 days, and top services by log volume.

### AI Analyst
Agentic chat interface powered by GPT-4.1. Has access to 15 tools that map directly to every gateway endpoint — it queries the live database rather than answering from memory. You can ask it broad questions like "what is the current security posture" or paste a raw log for immediate analysis. Clicking **Ask AI** on any threat or incident detail panel navigates here with the investigation pre-loaded.

### Log Stream
Live feed of raw logs from the `logs.unfiltered` Kafka topic as written to the database by the ledger. Auto-refreshes every 5 seconds. Clicking a row opens a detail panel with the full raw log fields.

### Threats
Table of threat assessments produced by the Analyst agent. Shows attack vector, complexity, priority, confidence, and whether the threat is auto-fixable. Clicking a row opens a detail panel with an **Ask AI** button that takes you straight to the AI Analyst with the threat pre-loaded.

### Incidents
Table of incidents produced by the Responder agent. Clicking a row loads the full incident detail including post-incident analysis (what happened, root cause, impact, lessons learned), all remediation steps, and follow-up actions. Has an **Ask AI** button in the detail panel.

### Remediation
List of all remediation steps across all incidents. Steps that require human approval show **Approve** and **Deny** buttons — decisions are written to the database immediately via `PATCH /remediation/{id}` on the gateway. Supports filtering by status: pending, auto, approved, denied.

### Agent Monitor
Derived health metrics for the three AI agents (Classifier, Analyst, Responder). Shows processing counts, confidence averages, and a breakdown of what each agent has produced. All data is derived from what is already in the database — no separate agent health endpoint is needed.

---

## Stack

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Charts | Recharts |
| Icons | Lucide React |
| Fonts | DM Serif Display, DM Mono, DM Sans |
| AI chat | OpenAI GPT-4.1 via direct API calls from the browser |

---

## Prerequisites

- Node.js 18+
- The [gateway](https://github.com/Admin-or-Admin/gateway) running on port 8000
- An OpenAI API key (for the AI Analyst page only)

---

## Getting started

```bash
# install dependencies
npm install

# copy the env file and fill in your values
cp .env.example .env

# start the dev server
npm run dev
```

Opens at `http://localhost:5173`.

---

## Environment variables

```properties
# URL of the running gateway — defaults to localhost:8000 if not set
VITE_API_URL=http://localhost:8000

# OpenAI key for the AI Analyst page
VITE_OPENAI_API_KEY=sk-...
```

---

## Project structure

```
src/
  App.tsx              — layout, sidebar navigation, page routing
  index.css            — design system (CSS variables, all component styles)
  main.tsx             — entry point
  lib/
    api.ts             — all gateway HTTP calls + TypeScript types
  components/
    ui.tsx             — shared components (badges, bars, spinner, etc.)
  pages/
    Overview.tsx       — stat tiles + charts
    AIAnalyst.tsx      — agentic GPT-4.1 chat with 15 gateway tools
    LogStream.tsx      — live logs.unfiltered feed
    Threats.tsx        — threat assessments table + detail panel
    Incidents.tsx      — incidents table + full drill-down panel
    Remediation.tsx    — remediation steps with approve/deny
    AgentMonitor.tsx   — derived agent health metrics
    AgentChat.tsx      — log-specific chat (legacy, superseded by AI Analyst)
```

---

## How it talks to the gateway

All HTTP calls go through `src/lib/api.ts`. This file is the only place in the codebase that knows the gateway URL — every page imports from it. The `api` object is namespaced by resource:

```typescript
api.logs.list(50, 0)           // GET /logs?limit=50&offset=0
api.logs.full(id)              // GET /logs/{id}/full
api.threats.list()             // GET /threats
api.incidents.get(id)          // GET /incidents/{id}
api.remediation.updateStatus(id, 'approved')  // PATCH /remediation/{id}
api.stats.severity()           // GET /stats/severity
```

---

## Platform architecture

```
Elasticsearch
     ↓
  Ingestor  →  logs.unfiltered (Kafka)
                     ↓
               Classifier agent  →  logs.categories
                     ↓
               Analyst agent    →  logs.solver_plan
                     ↓
               Responder agent  →  logs.solution
                     ↓
                  Ledger  →  PostgreSQL
                     ↓
                 Gateway  →  Dashboard
```

For the full platform setup including all services, see the [.github repo](https://github.com/Admin-or-Admin/.github).

---

## Related repos

| Repo | Description |
|---|---|
| [gateway](https://github.com/Admin-or-Admin/gateway) | FastAPI REST API, reads from PostgreSQL |
| [rac-agents](https://github.com/Admin-or-Admin/rac-agents) | Classifier, Analyst, Responder agents |
| [ledger](https://github.com/Admin-or-Admin/ledger) | Kafka consumer that writes to PostgreSQL |
| [ingestor](https://github.com/Admin-or-Admin/ingestor) | Log ingestion adapters (mock, Elasticsearch, GNS3) |
| [.github](https://github.com/Admin-or-Admin/.github) | Docker Compose for local development |
