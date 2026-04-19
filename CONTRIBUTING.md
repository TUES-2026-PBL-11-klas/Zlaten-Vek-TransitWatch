# Contributing to TransitWatch Sofia

Short guide with the essentials for contributors.

## Setup

### 1. Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose
- Supabase project

### 2. Clone and configure

```bash
git clone https://github.com/tues-2026-pbl-11-klas/Zlaten-Vek-TransitWatch.git
cd Zlaten-Vek-TransitWatch
cp .env.example .env
```

Fill `.env` with Supabase/API values:

- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3. Install and migrate

```bash
npm install
cd apps/api
npx prisma migrate deploy
cd ../..
```

## Run locally

### Option A: Docker (recommended)

```bash
docker-compose up --build
```

- Web: http://localhost:8080
- API: http://localhost:3000

### Option B: Local dev servers

```bash
# from repo root
npm run dev:api
```

```bash
# from repo root
npm run dev:web
```

- Web: http://localhost:5173
- API: http://localhost:3000

If running without Docker, set:

- `CORS_ORIGIN=http://localhost:5173`
- `VITE_API_URL=http://localhost:3000`

## Useful commands

```bash
# API tests
cd apps/api && npm run test
cd apps/api && npm run test:cov
cd apps/api && npm run test:e2e

# Web tests
cd apps/web && npm run test
cd apps/web && npm run test:cov
```

```bash
# manual GTFS import (when API is running)
curl -X POST http://localhost:3000/transit/import
```

## Workflow

```bash
git checkout -b feat/short-name
# make changes
git add .
git commit -m "feat: short description"
git push origin feat/short-name
```

- Use Conventional Commits: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`
- Husky hooks run lint + gitleaks on commit

## CI/CD (what happens after PR)

1. CI runs lint + tests + Docker build.
2. On merge to `main`, CD builds/pushes images to GHCR.
3. CD updates image tags in `k8s/*.yaml`.
4. ArgoCD auto-syncs the cluster from `k8s/`.

Prometheus + Alertmanager handle monitoring and Discord alerts.
