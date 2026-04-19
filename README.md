# TransitWatch Sofia

**TransitWatch Sofia** е crowdsourced уеб приложение за сигнали в реално време за градския транспорт в София.

**Решаван проблем:** Пътниците нямат бърз peer-to-peer канал за информация за текущи проблеми (закъснения, контрольори, претоварване, повреди) преди да се качат. Съществуващите инструменти (ЦГМ, Moovit, Facebook групи) или не са real-time, или не са структурирани, или информацията не достига до другите пътници. TransitWatch запълва тази празнина — потребителите докладват проблеми директно, а останалите ги виждат веднага на интерактивна карта, заедно с реални GPS позиции на превозните средства и разписания на спирките от официалния GTFS feed на Столична агенция за транспорт.

---

## Архитектурна диаграма

![Инфраструктурна диаграма](docs/infrastructure-diagram.png)

> Потребителят достига системата чрез Traefik Ingress → React frontend (Nginx, 2 replicas) и NestJS API (3 replicas, HPA). API комуникира с Supabase PostgreSQL, GTFS feeds от Sofia Traffic и Prometheus. CI/CD: GitHub Actions → GHCR → ArgoCD автоматично синхронизира K8s манифестите.

Допълнителни диаграми:
- [ER диаграма](docs/database-diagram.png)
- [UML Class диаграма](docs/uml-diagram.png)

---

## Инструкции за стартиране

### Предварителни изисквания

- Node.js 20+ (или 22)
- Docker и Docker Compose
- Supabase проект (безплатен tier)

### Стъпка 1: Клониране на хранилището

```bash
git clone https://github.com/tues-2026-pbl-11-klas/Zlaten-Vek-TransitWatch.git
cd Zlaten-Vek-TransitWatch
```

### Стъпка 2: Конфигурация на environment

```bash
cp .env.example .env
```

Попълни нужните стойности в `.env`:

| Променлива | Описание |
|---|---|
| `DATABASE_URL` | Prisma connection string към Supabase PostgreSQL |
| `SUPABASE_URL` | URL на Supabase проекта |
| `SUPABASE_JWT_SECRET` | JWT secret от Supabase Dashboard |
| `VITE_SUPABASE_URL` | Supabase URL за frontend |
| `VITE_SUPABASE_ANON_KEY` | Anon key за frontend |

### Вариант A: Стартиране с Docker (препоръчително)

```bash
docker-compose up --build
```

| Услуга | URL |
|---|---|
| Web | http://localhost:8080 |
| API | http://localhost:3000 |
| API Health | http://localhost:3000/health |
| Swagger документация | http://localhost:3000/api/docs |

### Вариант Б: Локална разработка без Docker

```bash
# 1. Инсталирай зависимости (от root на монорепото)
npm install

# 2. Приложи миграции
cd apps/api
npx prisma migrate dev
cd ../..

# 3. Стартирай API (Терминал 1)
npm run dev:api     # http://localhost:3000

# 4. Стартирай Web (Терминал 2)
npm run dev:web     # http://localhost:5173
```

### Стъпка 3: Импорт на GTFS данни (задължително)

```bash
curl -X POST http://localhost:3000/transit/import
```

Импортира линии, спирки и маршрути от официалния Sofia Traffic GTFS feed. Изпълнява се автоматично всеки ден в 03:00 UTC.

### Стартиране на тестовете

```bash
# Backend unit тестове
cd apps/api && npm run test

# Backend coverage
cd apps/api && npm run test:cov

# Backend e2e тестове
cd apps/api && npm run test:e2e

# Frontend unit тестове
cd apps/web && npm run test
```

---

## Използвани технологии и версии

| Слой | Технология | Версия |
|---|---|---|
| Frontend | React | 19.2.4 |
| Frontend | TypeScript (web) | ~5.9.3 |
| Frontend | Vite | 8.0.0 |
| Frontend | Leaflet / React-Leaflet | 1.9.4 / 5.0.0 |
| Backend | NestJS | 11.x |
| Backend | TypeScript (api) | ^5.7.3 |
| ORM | Prisma / @prisma/client | 7.6.0 / 7.5.0 |
| Database | PostgreSQL (Supabase) | managed |
| Auth | Supabase Auth / supabase-js | 2.99.2 |
| Testing | Jest / Vitest | 30.0.0 / 3.2.4 |
| Containerization | Docker / Docker Compose | — |
| Orchestration | Kubernetes (k3s) | — |
| GitOps | ArgoCD | — |
| Observability | Prometheus + Alertmanager | — |
| CI/CD | GitHub Actions | — |

---

## API Endpoints

Интерактивна Swagger документация достъпна на: **http://localhost:3000/api/docs**

### Auth

| Метод | Път | Auth | Описание |
|---|---|---|---|
| GET | `/auth/me` | Bearer JWT | Вземи/създай потребителски профил |

### Reports

| Метод | Път | Auth | Описание |
|---|---|---|---|
| POST | `/reports` | Bearer JWT | Създай репорт |
| GET | `/reports/active` | — | Всички активни репорти |
| GET | `/reports/mine` | Bearer JWT | Репортите на потребителя |
| GET | `/reports/:id` | — | Конкретен репорт |
| GET | `/reports/line/:lineId` | — | Репорти за линия |
| DELETE | `/reports/:id` | Bearer JWT | Изтрий репорт (само собственик) |

### Votes

| Метод | Път | Auth | Описание |
|---|---|---|---|
| POST | `/reports/:reportId/votes` | Bearer JWT | Гласувай (confirm / dispute) |
| GET | `/reports/:reportId/votes` | Опционален | Брой гласове + глас на потребителя |

### Lines

| Метод | Път | Auth | Описание |
|---|---|---|---|
| GET | `/lines` | — | Всички линии |
| GET | `/lines/:id` | — | Линия + спирки |
| GET | `/lines/:id/reports` | — | Активни репорти за линия |

### Transit (GTFS)

| Метод | Път | Auth | Описание |
|---|---|---|---|
| GET | `/transit/stops` | — | Спирки в bbox (viewport) |
| GET | `/transit/stops/:id` | — | Детайли за спирка |
| GET | `/transit/stops/:id/arrivals` | — | Предстоящи пристигания |
| GET | `/transit/lines` | — | Всички линии (cache 24h) |
| GET | `/transit/lines/:id/shape` | — | Геометрия на маршрута |
| GET | `/transit/vehicles` | — | Реални GPS позиции на МПС |
| GET | `/transit/vehicles/:vehicleId/trip` | — | Маршрут на МПС |
| GET | `/transit/trips/:tripId/timeline` | — | Спирки и ETA по рейс |
| POST | `/transit/import` | — | Ръчен GTFS импорт |

### Users / Health / Metrics

| Метод | Път | Auth | Описание |
|---|---|---|---|
| GET | `/users/me/profile` | Bearer JWT | Профил + credibility score |
| GET | `/health` | — | Health check |
| GET | `/metrics` | — | Prometheus метрики |

---

## Структура на проекта

```
Zlaten-Vek-TransitWatch/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/           # JWT аутентикация (JWKS валидация)
│   │   │   ├── report/         # Репорти + Strategy Pattern за изтичане
│   │   │   ├── vote/           # Гласуване (confirm / dispute)
│   │   │   ├── line/           # Линии и спирки
│   │   │   ├── transit/        # GTFS статичен + real-time интеграция
│   │   │   ├── user/           # Потребителски профили, credibility score
│   │   │   ├── metrics/        # Prometheus метрики, HTTP interceptor
│   │   │   └── prisma/         # Глобален Prisma database client
│   │   └── prisma/
│   │       ├── schema.prisma   # Схема на БД (7 таблици)
│   │       └── migrations/     # История на миграциите
│   │
│   └── web/                    # React + Vite frontend
│       └── src/
│           ├── components/     # UI компоненти (map, panels, report form)
│           ├── pages/          # Маршрутни страници (Map, Login, Register, Profile)
│           ├── hooks/          # Custom React hooks (useActiveReports, useVehicles…)
│           ├── contexts/       # AuthContext (Supabase сесия)
│           └── lib/            # Axios API client, utils
│
├── packages/
│   └── shared/                 # Споделени DTOs, enums и типове между API и Web
│
├── docs/                       # Диаграми, screenshots, документация
├── k8s/                        # Kubernetes манифести (deployments, HPA, ingress)
├── argocd/                     # ArgoCD GitOps конфигурация
├── .github/workflows/          # CI/CD pipelines (lint → test → build → deploy)
├── docker-compose.yml          # Локално стартиране на API + Web
└── package.json                # Monorepo workspace scripts
```

---

## Полезни линкове

- [Подробна документация](docs/documentation.md)
- [Интерактивна инфраструктурна диаграма](docs/diagrams/infrastructure-diagram.html)
- [ER диаграма (HTML)](docs/diagrams/database-diagram.html)
- [UML диаграма (HTML)](docs/diagrams/uml-class-diagram.html)

---

## Екип

**Златен Век** — ТУЕС, 11. клас
