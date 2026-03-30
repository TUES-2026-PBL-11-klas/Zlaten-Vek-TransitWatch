# TransitWatch Sofia 

> **Work in Progress** — Development ongoing for ПБО (School Project) 2025–2026

Real-time crowdsourced reporting for Sofia's public transit. Report issues, verify them, and help other passengers stay informed before boarding.

**Think Waze, but for buses, trams, and the metro.**

## What is it?

TransitWatch is a web app where Sofia transit users can:
- **Report problems** — broken AC, delays, overcrowding, inspectors, safety issues
- **See reports in real-time** on an interactive map
- **Verify or dispute** reports from other users
- **Follow favorite lines** and get notified about verified issues

Reports auto-expire based on category, and the community decides what's real through voting.

### Why TransitWatch?

| Solution | What it offers | What's missing |
|---|---|---|
| CGM (City Mobility Center) | Official complaint channel | Takes days, doesn't reach other passengers |
| Google Maps / Moovit | Schedules, routes, GPS delays | No real-time crowdsourced reports |
| Facebook groups / Twitter | People share problems sometimes | No structure, no map, slow |
| **TransitWatch** ✓ | **Real-time peer reports, map, voting, auto-expire** | **Solves all of the above** |

## Local Development (Docker)

Start the full stack with a single command:

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Start all services
docker-compose up
```

This spins up:
- **API** at http://localhost:3000 (NestJS)
- **Frontend** at http://localhost:5173 (React + Vite with hot reload)

Health check: http://localhost:3000/health

To rebuild after dependency changes:
```bash
docker-compose up --build
```

To reset the database:
```bash
docker-compose down -v
```

## Local Kubernetes (K3s via k3d)

Use this to run the full stack on a local K3s cluster, matching the production environment.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- [k3d](https://k3d.io/) — `brew install k3d`
- [kubectl](https://kubernetes.io/docs/tasks/tools/) — `brew install kubectl`

### 1. Create the cluster

```bash
k3d cluster create transitwatch \
  --port "80:80@loadbalancer" \
  --port "443:443@loadbalancer"
```

Verify it's ready:

```bash
kubectl get nodes
# NAME                        STATUS   ROLES                  AGE   VERSION
# k3d-transitwatch-server-0   Ready    control-plane,master   ...   v1.x
```

### 2. Apply the namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 3. Create secrets

Never commit real values — create the secret directly on the cluster:

```bash
kubectl create secret generic transitwatch-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=SUPABASE_URL='https://xxxx.supabase.co' \
  --from-literal=SUPABASE_JWT_SECRET='...' \
  -n transitwatch
```

Get the values from a teammate or the shared credentials store.

### 4. Apply all manifests

```bash
kubectl apply -f k8s/
```

### 5. Verify everything is running

```bash
kubectl get pods,svc,hpa -n transitwatch
# All pods should reach Running status within ~30 seconds
```

### Accessing the app

| Service | URL |
|---|---|
| Frontend | http://localhost |
| API | http://localhost/api |
| Health check | http://localhost/api/health |

### Teardown

```bash
k3d cluster delete transitwatch
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React + TypeScript, Leaflet maps |
| **Backend** | NestJS + TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Email Auth |
| **Infrastructure** | Docker, k3s (Kubernetes), GitHub Actions CI/CD |

## System Architecture

The app follows a **layered architecture** with clear separation of concerns:

```
User (Browser)
    ↓ HTTPS
    ├→ Traefik Ingress
    ├→ React App (Nginx pod, 2 replicas)
         ↓ REST API
    ├→ NestJS API (3 replicas, HPA)
         ↓ Database / ORM
    └→ Supabase PostgreSQL
```

![Infrastructure Diagram](docs/infrastructure-diagram.png)

**Key layers:**
- **Frontend** — React + TypeScript, Leaflet interactive map
- **Backend** — NestJS REST API with service/repository pattern
- **Database** — PostgreSQL (Supabase) with Prisma ORM
- **Observability** — Prometheus metrics, GitHub Actions CI/CD

## Domain Model (UML)

The core entities and their relationships:

![UML Class Diagram](docs/transitwatch-uml-1.jpg)

**Key classes:**
- **User** — email authentication (Supabase), credibility score, followed lines
- **Report** — linked to user, line, stop; has type, description, expiry time
- **Line** — bus/tram/metro line with stops
- **Stop** — geographic location (lat/lng) on a line
- **ReportType** — category (vehicle, traffic, inspectors, safety, other)
- **BaseEntity** — abstract base (id, createdAt, updatedAt)

## Key Concepts

### Report Categories & Auto-Expiry
| Type | Examples | Expires |
|---|---|---|
| **Vehicle** | Broken AC, door, loud noise | 60 min |
| **Traffic** | Delay >10min, overcrowding | 30 min |
| **Inspectors** | Ticket check at stop X | 20 min |
| **Safety/Comfort** | Aggressive passenger, dark lighting | 45 min |
| **Other** | Free seats, route change | 30 min |

### Credibility & Verification
- **Credibility Score** — Users earn points from verified reports (shown first in feeds)
- **Verification** — 2+ confirmations → marked as Verified
- **Auto-hide** — 2+ disputes → automatically hidden & sent to moderation queue
- **No anonymous reports** — account required (reduces spam)

---

**Team:** Zlaten Vek (Златен Век)
**School:** ТУЕС Sofia, 11. Grade
**Subject:** ПБО (Programming & Software Development) 2025–2026