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
User → Cloudflare CDN → React App (Vercel)
                      → NestJS API (Docker Kubernetes)
                        → Supabase
```

**Layered architecture:** React → REST API → Service Layer → Repository Layer → Supabase

**NestJS Modules:** `AuthModule`, `ReportModule`, `LineModule`, `NotificationModule`, `UserModule`

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
- Created → appears on map immediately, push notification to followers
- 3+ confirmations → **Verified**
- 3+ disputes → **Hidden** (auto-moderated)
- Auto-expires based on category timer
- Disputed reports go to moderation queue

### User System
- Registration via email (Supabase Auth) — **no anonymous reports**
- **Credibility score** based on confirmed reports (shown first in feeds)
- **Followed lines** → push/email notifications for new verified reports
- Morning digest summary

## Design Patterns (Required for School)
- **Observer pattern:** New report → NotificationService notified automatically
- **Repository pattern:** IReportRepository abstracts DB access from business logic
- **Strategy pattern:** Different report types handled via enum + strategy (OCP)

## SOLID Principles (Required for School)
- **SRP:** ReportService only validates/creates reports, does NOT send notifications
- **OCP:** New report types added via enum + strategy, no existing code changed
- **DIP:** ReportService depends on `IReportRepository` interface, not concrete implementation

## Database Schema (Key Tables)
```
users(id, email, google_id, credibility_score, created_at)
reports(id, user_id FK, stop_id FK, type, description, expires_at, created_at)
lines(id, name, type)
stops(id, line_id FK, name, lat, lng)
votes(id, report_id FK, user_id FK, type: confirm|dispute)
notifications(id, user_id FK, report_id FK, sent_at)
```

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
- **Pre-commit hooks:** Husky + lint-staged (ESLint + Prettier + Gitleaks)
- **PR pipeline:** lint → unit tests → integration tests → Docker build
- **Merge to main:** build → push image → deploy to Railway/ECS
- **Alerts:** GitHub Actions on failure, Prometheus alerting for API errors

## Skills Available
- `/frontend-design` — use for all UI/component work to get polished, production-quality React components
- GitHub MCP — use `mcp__github__*` tools to create/manage issues directly from Claude
