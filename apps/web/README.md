# TransitWatch Web

React frontend for TransitWatch Sofia — a map-first UI where passengers report and view real-time transit issues on a Leaflet map.

## Tech Stack

- **Framework:** React 18 (TypeScript) + Vite
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui + Base UI
- **Map:** Leaflet + react-leaflet
- **Auth:** Supabase JS client
- **HTTP:** Axios
- **Icons:** Lucide React

## Getting Started

From the repo root, copy `.env.example` to `.env` and fill in your Supabase credentials. Then:

```bash
# Install dependencies (from repo root)
npm install

# Start dev server
cd apps/web && npm run dev
```

The app starts on **http://localhost:5173**.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:3000`) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

> All `VITE_*` variables are inlined at build time. Do not put secrets here.

## Source Structure

```
src/
├── assets/       # Static images and icons
├── components/   # Reusable UI components (map, cards, nav, modals)
├── contexts/     # React contexts (AuthContext, etc.)
├── hooks/        # Custom hooks (useReports, useMap, etc.)
├── lib/          # API client, Supabase client, utilities
├── pages/        # Route-level page components
├── types/        # Shared TypeScript types
├── App.tsx       # Root component with router
└── main.tsx      # Entry point
```

## Key Concepts

**Map-first layout** — the Leaflet map is always the primary element. Report markers are rendered as custom icons color-coded by category. Clicking a marker opens a bottom sheet (mobile) or popup (desktop).

**Auth flow** — Supabase handles email/password auth. `AuthContext` exposes the current user and session. Protected routes redirect unauthenticated users to `/login`. No anonymous reports are allowed.

**Report categories** — each category has a distinct icon and auto-expiry time (20–60 min). The frontend shows only active (non-expired) reports fetched from the API.

## Adding a New Page

1. Create `src/pages/YourPage.tsx`
2. Add a route in `App.tsx`
3. If the page requires auth, wrap it with the auth guard pattern used by existing protected routes

## Building for Production

```bash
cd apps/web
npm run build
# Output is in dist/ — served by Nginx in Docker
```

The `Dockerfile` in this directory builds a multi-stage image: Vite build → Nginx static server.
