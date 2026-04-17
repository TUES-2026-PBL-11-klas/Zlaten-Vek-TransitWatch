# Contributing to TransitWatch Sofia

Welcome to TransitWatch Sofia — a crowdsourced real-time transit issue reporting app for Sofia, Bulgaria. This guide will get you from zero to a running development environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [First-time Setup](#first-time-setup)
- [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Architecture Overview](#architecture-overview)
- [Code Conventions](#code-conventions)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| npm | 10+ | Comes with Node.js |
| Docker + Docker Compose | Latest | Required for local full-stack dev |
| Git | Any | With commit signing recommended |

You also need a **Supabase project** (free tier is fine). Create one at [supabase.com](https://supabase.com) and keep the dashboard open — you'll need a few keys.

---

## First-time Setup

**1. Clone the repo**

```bash
git clone https://github.com/zlatenvek/TransitWatch.git
cd TransitWatch
```

**2. Copy environment variables**

```bash
cp .env.example .env
```

Open `.env` and fill in the values from your Supabase project dashboard:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_JWT_SECRET` | Project Settings → API → JWT Secret |
| `DATABASE_URL` | Project Settings → Database → Connection string → URI |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API → anon / public key |

**3. Install dependencies**

```bash
npm install
```

This installs dependencies for the root workspace and both apps.

**4. Run database migrations**

```bash
cd apps/api
npx prisma migrate deploy
cd ../..
```

---

## Running the Project

### Option A — Docker Compose (recommended for full-stack)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Web (React) | http://localhost:8080 |
| API (NestJS) | http://localhost:3000 |

### Option B — Local dev servers (faster iteration)

In two separate terminals:

```bash
# Terminal 1 — API
cd apps/api
npm run dev
# Runs on http://localhost:3000
```

```bash
# Terminal 2 — Web
cd apps/web
npm run dev
# Runs on http://localhost:5173
```

> When running locally without Docker, make sure `CORS_ORIGIN` in `.env` is set to `http://localhost:5173` and `VITE_API_URL` is `http://localhost:3000`.

---

## Project Structure

```
TransitWatch/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # React frontend
├── k8s/              # Kubernetes manifests (production)
├── docs/             # Additional documentation
├── .env.example      # Environment variable template
├── docker-compose.yml
└── package.json      # Root workspace
```

See [apps/api/README.md](apps/api/README.md) and [apps/web/README.md](apps/web/README.md) for app-specific details.

---

## Development Workflow

### Branches

| Pattern | Purpose |
|---|---|
| `main` | Production-ready code; deploys to k3s cluster |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `chore/<name>` | Tooling, deps, config |

### Making a change

```bash
git checkout -b feat/your-feature
# make changes
git add <files>
git commit -m "feat: describe what and why"
git push origin feat/your-feature
# open a PR on GitHub
```

### Pre-commit hooks

[Husky](https://typicode.github.io/husky/) runs automatically on every commit:

- **ESLint** — catches lint errors in staged files
- **Gitleaks** — scans for accidentally committed secrets

If a hook blocks your commit, fix the flagged issue before retrying. Do not bypass hooks with `--no-verify`.

### Commit message format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

Types: feat | fix | refactor | chore | docs | test
```

---

## Architecture Overview

```
User → Traefik Ingress → React App (Nginx)
                       → NestJS API
                         → Supabase (PostgreSQL via Prisma)
```

The API is organized into NestJS modules: `AuthModule`, `ReportModule`, `LineModule`, `UserModule`, `VoteModule`, `TransitModule`, `MetricsModule`.

Key design patterns used (required for school):

- **Strategy pattern** — each report type (delay, inspector, safety…) has its own strategy class implementing `IReportStrategy`. Adding a new report type = add one class, touch nothing else.
- **Repository pattern** — `IReportRepository` abstracts all database access so the service layer never imports Prisma directly.

---

## Code Conventions

- **TypeScript strict mode** is enabled — no `any` without a comment explaining why.
- **No comments by default** — code should be self-documenting through naming. Only add a comment when the *why* is non-obvious.
- **No unused variables or imports** — ESLint enforces this.
- **Validation at boundaries only** — use `class-validator` DTOs on API endpoints; don't re-validate inside services.

---

## Testing

```bash
# Unit tests
cd apps/api && npm test

# Unit tests in watch mode
cd apps/api && npm run test:watch

# Coverage report
cd apps/api && npm run test:cov

# End-to-end tests
cd apps/api && npm run test:e2e
```

Tests live in `apps/api/test/` (e2e) and alongside source files as `*.spec.ts`.

---

## CI/CD Pipeline

Every PR runs the GitHub Actions pipeline:

1. **Lint** — ESLint on both apps
2. **Unit tests** — NestJS test suite
3. **Integration tests** — e2e suite against a real test DB
4. **Docker build** — verifies both images build cleanly
5. **Push to GHCR** — on merge to `main` only

Merge to `main` triggers `kubectl apply -f k8s/` to the local k3s cluster.

**Alerts:** Discord webhook fires on any pipeline failure. Prometheus alerts if the API error rate exceeds 5%.
