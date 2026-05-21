# CircleTrack

A Life360-style family location-sharing web app with real-time location sharing, family circles, saved places, and activity feeds.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/life360-app run dev` — run the frontend (port auto-assigned)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (Tailwind CSS, shadcn/ui, wouter, TanStack Query)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit Auth (openid-client v6, replit-auth-web)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/life360-app/` — React frontend
- `artifacts/api-server/` — Express API server
- `lib/db/` — Drizzle schema + migrations (source of truth for DB)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod schemas

## DB Schema Tables

- `sessions` — express-session storage
- `users` — Replit Auth user profiles
- `circles` — family/friend groups
- `circle_members` — membership + roles (owner/member)
- `locations` — user location history
- `places` — saved places with geofence radius
- `activity_events` — arrival/departure/checkin events

## API Routes

- `GET /api/healthz` — health check
- `GET/POST /api/auth/*` — Replit Auth (login, callback, logout, me)
- `GET/POST/PATCH/DELETE /api/circles/*` — circle CRUD + members + activity + check-in
- `PUT /api/locations/me` — update own location
- `GET /api/locations/me/history` — own location history
- `GET /api/locations/circles/:id/members` — circle member locations

## Product

- **Home**: Map view showing all circle members' locations with a family status panel
- **Circles**: List and create family/friend circles; invite/remove members
- **Circle Detail**: Per-circle view with Members, Places, and Activity tabs
- **Places**: Manage saved locations (Home, Work, School, etc.) with geofence radius
- **Activity**: Cross-circle event feed (arrivals, departures, check-ins)
- **Profile**: Share location, view location history, sign out

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks on frontend
- Replit Auth (OpenID Connect PKCE) for zero-config user authentication
- All routes authenticated via `authMiddleware` except `/api/auth/*` and `/api/healthz`
- Simulated map component (no external map API keys needed for dev)
- Location sharing is pull-based: clients POST their location, others query it

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do not add `limit` query params to OpenAPI operations that also have path params — causes Orval codegen hook name collisions
- Run `pnpm --filter @workspace/db run push` after any schema change in `lib/db/src/schema/`
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change
- `locationsTable` must be included in `@workspace/db` barrel export when used in routes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
