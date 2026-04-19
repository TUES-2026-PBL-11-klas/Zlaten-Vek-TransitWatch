# TransitWatch API

NestJS REST API for TransitWatch Sofia — handles authentication, report management, transit line data, voting, and Prometheus metrics.

## Tech Stack

- **Framework:** NestJS (TypeScript)
- **Database:** Supabase (PostgreSQL) via Prisma ORM
- **Auth:** Supabase Email Auth + JWT (Passport)
- **Metrics:** Prometheus (`@willsoto/nestjs-prometheus`)
- **Validation:** `class-validator` + `class-transformer`

## Getting Started

From the repo root, copy `.env.example` to `.env` and fill in your Supabase credentials. Then:

```bash
# Install dependencies (from repo root)
npm install

# Run in dev mode (hot reload)
npm run dev

# Run database migrations
npx prisma migrate deploy
```

The API starts on **http://localhost:3000**.

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `nest start --watch` | Dev server with hot reload |
| `build` | `nest build` | Compile to `dist/` |
| `start:prod` | `node dist/main` | Run compiled build |
| `test` | `jest` | Unit tests |
| `test:watch` | `jest --watch` | Tests in watch mode |
| `test:cov` | `jest --coverage` | Coverage report |
| `test:e2e` | `jest --config test/jest-e2e.json` | End-to-end tests |
| `lint` | `eslint ... --fix` | Lint and auto-fix |
| `format` | `prettier --write ...` | Format source files |

## Module Structure

```
src/
├── auth/        # JWT guard, Supabase token validation
├── line/        # Transit line endpoints
├── metrics/     # Prometheus metrics endpoint
├── prisma/      # PrismaService (singleton DB client)
├── report/      # Report CRUD, strategy pattern, repository pattern
├── transit/     # GTFS real-time data ingestion
├── user/        # User profile management
├── vote/        # Upvote/downvote on reports
└── main.ts      # Bootstrap, global pipes, CORS
```

## Key Design Patterns

**Strategy pattern** — `src/report/strategies/` contains one class per report category (`DelayReportStrategy`, `InspectorReportStrategy`, etc.), each implementing `IReportStrategy`. This defines the expiry time and credibility weight for that category. Adding a new report type requires only a new strategy class.

**Repository pattern** — `IReportRepository` is the interface the service depends on; `PrismaReportRepository` is the concrete implementation. The service layer never imports Prisma directly.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (from Supabase) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_JWT_SECRET` | JWT secret for verifying Supabase tokens |
| `CORS_ORIGIN` | Allowed frontend origin (e.g. `http://localhost:5173`) |
| `PORT` | Port to listen on (default: `3000`) |

## Database

Schema is managed via Prisma. Key tables: `users`, `lines`, `stops`, `line_stops`, `reports`, `votes`.

```bash
# Open Prisma Studio (visual DB browser)
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration-name>
```

## API Endpoints (Overview)

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register with email + password |
| `POST` | `/auth/login` | Login, returns JWT |
| `GET` | `/reports` | List active reports (map feed) |
| `POST` | `/reports` | Create a report |
| `DELETE` | `/reports/:id` | Delete own report |
| `POST` | `/reports/:id/vote` | Upvote or downvote a report |
| `GET` | `/lines` | List transit lines |
| `GET` | `/metrics` | Prometheus metrics scrape endpoint |
