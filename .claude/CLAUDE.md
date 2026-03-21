# TransitWatch Sofia — CLAUDE.md

## Project Overview

**TransitWatch Sofia** is a crowdsourced real-time public transit issue reporting web app for Sofia, Bulgaria. Think Waze, but for Sofia's buses/trams/metro — passengers report problems and other passengers see them instantly on a map, before boarding.

**Team:** Zlaten Vek (Златен Век)

## Brand & Design

### Colors
| Role | Hex | Usage |
|---|---|---|
| Primary | `#1A1A2E` | Headers, nav, primary buttons |
| Accent | `#16A34A` | Active states, success, confirmations |
| Background | `#F9FAFB` | Page background |
| Surface | `#FFFFFF` | Cards, modals, panels |
| Text Primary | `#111827` | Body text |
| Text Secondary | `#6B7280` | Captions, labels, muted text |
| Border | `#E5E7EB` | Dividers, card borders, input outlines |
| Danger | `#DC2626` | Errors, destructive actions |
| Warning | `#F59E0B` | Alerts, pending states |

### Typography
- **Font family:** `Inter` (primary), `system-ui, sans-serif` (fallback)
- **Headings:** Semi-bold (600), tracking tight
- **Body:** Regular (400), 16px base
- **Small/captions:** 12–14px, text-secondary color

### Design Principles
- Clean, minimal UI — generous whitespace, no visual clutter
- Flat design with subtle shadows (`shadow-sm`) on cards only
- Rounded corners (`rounded-lg` / 8px) for interactive elements
- High contrast text on light backgrounds for readability
- Map-first layout — the map is always the hero element

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (TypeScript), Leaflet/Mapbox for maps |
| Backend | NestJS (TypeScript) |
| Database | Supabase via Prisma |
| Auth | Supabase Email Auth |
| CI/CD | GitHub Actions |
| Infra | Docker Kubernetes (local)|
| Observability | Prometheus |

## Architecture

```
User → Traefik Ingress → React App (Nginx pod, 3 replicas)
                       → NestJS API (3 replicas, HPA)
                         → Supabase (PostgreSQL)
```

**Layered architecture:** React → REST API → Service Layer → Repository Layer → Supabase

**NestJS Modules:** `AuthModule`, `ReportModule`, `LineModule`, `UserModule`

## Key Domain Concepts

### Report Categories & Expiry
| Category | Examples | Auto-expires |
|---|---|---|
| 🚌 Vehicle issue | Broken AC, broken door | 60 min |
| ⏱ Traffic issue | Delay >10min, overcrowding | 30 min |
| 🎫 Inspectors | Ticket check at stop X | 20 min |
| ⚠️ Safety/comfort | Aggressive passenger | 45 min |
| ℹ️ Other | Free seats, route change | 30 min |

### Report Lifecycle
- Created → appears on map immediately
- Auto-expires based on category timer
- Owner can delete their own report

### User System
- Registration via email (Supabase Auth) — **no anonymous reports**
- **Credibility score** field exists (future: sort reports by credibility)

## Design Patterns (Required for School)
- **Strategy pattern:** Each report type has its own strategy class (`DelayReportStrategy`, `InspectorReportStrategy`, etc.) implementing `IReportStrategy` — defines `getExpiryMinutes()`, credibility weight, and auto-hide threshold. Adding a new type = new class only, no existing code changed.
- **Repository pattern:** `IReportRepository` abstracts DB access from business logic — swap ORM/DB without touching service layer.

## SOLID Principles (Required for School)
- **SRP:** ReportService only validates/creates reports
- **OCP:** New report types added via enum + strategy, no existing code changed
- **DIP:** ReportService depends on `IReportRepository` interface, not concrete implementation

## Database Schema (Key Tables)
```
users(id, email, credibility_score, created_at)
lines(id, name, type)
stops(id, name, lat, lng)
line_stops(id, line_id FK, stop_id FK, stop_order)
reports(id, user_id FK, line_id FK, category, description, credibility_score, status, expires_at, created_at)
votes(id, report_id FK, user_id FK, type)
```

**ORM:** Prisma with eager loading for `line` and `user` (always needed when displaying a report).

## Development Setup

```bash
# Install dependencies
npm install

# Local dev (Docker Compose)
docker-compose up

# Run migrations
npm run migration:run

# Run tests
npm run test
npm run test:e2e
```

## CI/CD
- **Pre-commit hooks:** Husky + lint-staged (ESLint + Gitleaks for secrets detection)
- **PR pipeline:** lint → unit tests → integration tests → Docker build → push to GHCR
- **Merge to main:** `kubectl apply -f k8s/` to k3s cluster
- **Orchestrator:** k3s (local Kubernetes)
- **Alerts:** Discord webhook on pipeline failure, Prometheus alerting for API errors (error rate > 5%)

## Skills Available
- `/frontend-design` — use for all UI/component work to get polished, production-quality React components
- GitHub MCP — use `mcp__github__*` tools to create/manage issues directly from Claude
