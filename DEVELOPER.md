# Where You Dey? — Developer Guide

A Life360-style Nigerian family location-sharing web app. Real-time location tracking, family circles, chat, saved places, SOS alerts, and push notifications — built on a contract-first OpenAPI pipeline.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Monorepo Structure](#monorepo-structure)
4. [Tech Stack](#tech-stack)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Frontend Pages & Components](#frontend-pages--components)
8. [Custom Hooks](#custom-hooks)
9. [Authentication Flow](#authentication-flow)
10. [Location Tracking Pipeline](#location-tracking-pipeline)
11. [Push Notifications](#push-notifications)
12. [OpenAPI Codegen Pipeline](#openapi-codegen-pipeline)
13. [Environment Variables](#environment-variables)
14. [Development Workflow](#development-workflow)
15. [Known Constraints & Gotchas](#known-constraints--gotchas)

---

## Quick Start

```bash
# Install all dependencies
pnpm install

# Push DB schema to Postgres
pnpm --filter @workspace/db run push

# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start frontend (auto-assigned port)
pnpm --filter @workspace/life360-app run dev
```

**Required environment variables:**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for signing express-session cookies |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key |

---

## Architecture Overview

```
Browser
  │
  ▼
Shared Reverse Proxy (localhost:80)
  ├── /api/*  ──►  Express API Server  (port 8080)
  │                      │
  │                      ▼
  │                 PostgreSQL DB
  │
  └── /*  ────►  Vite Dev Server (React SPA)
```

**Key design decisions:**

- **Contract-first API:** The OpenAPI spec (`lib/api-spec/openapi.yaml`) is the single source of truth. Orval generates React Query hooks AND Zod validation schemas from it automatically.
- **Replit Auth (OpenID Connect PKCE):** Zero-config auth — no passwords, no email verification. Users sign in with their Replit/Google/GitHub account.
- **Pull-based location sharing:** Clients POST their GPS coordinates periodically. Other clients query member locations on demand. No persistent WebSocket connections.
- **Simulated map:** A pure CSS/React map pinned to Nigeria's bounding box — no external map API key needed. Clicking any pin opens real Google Maps navigation.

---

## Monorepo Structure

```
workspace/
├── artifacts/
│   ├── life360-app/          # React + Vite frontend
│   │   └── src/
│   │       ├── components/   # Shared UI components
│   │       │   ├── layout/   # AppLayout (sidebar, bottom nav, SOS button)
│   │       │   ├── map/      # SimulatedMap (member pins, speed, battery)
│   │       │   └── ui/       # shadcn/ui component library
│   │       ├── context/      # React contexts (AutoTrack, Theme)
│   │       ├── hooks/        # Custom hooks (useAutoTrack, useBattery, useTheme)
│   │       ├── lib/          # Utilities (cn, etc.)
│   │       └── pages/        # Route-level page components
│   │
│   └── api-server/           # Express 5 backend
│       └── src/
│           ├── lib/          # Shared server utilities (webpush, etc.)
│           ├── middleware/   # Auth middleware
│           └── routes/       # Route handlers (circles, locations, sos, etc.)
│
├── lib/
│   ├── api-spec/             # OpenAPI YAML spec + Orval config
│   ├── api-client-react/     # GENERATED: React Query hooks
│   ├── api-zod/              # GENERATED: Zod validation schemas
│   ├── db/                   # Drizzle ORM schema + migration config
│   └── replit-auth-web/      # Replit Auth client helper
│
├── scripts/                  # Utility scripts
├── pnpm-workspace.yaml       # Workspace config, catalog pins
├── tsconfig.base.json        # Shared TypeScript strict defaults
└── tsconfig.json             # Root solution file (composite libs only)
```

> **Rule:** `artifacts/` packages are leaf nodes — they never import from each other. Shared code always goes in `lib/`.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 24 |
| Language | TypeScript | 5.9 |
| Package manager | pnpm workspaces | 10 |
| Frontend framework | React + Vite | React 19, Vite 7 |
| Styling | Tailwind CSS v4 + shadcn/ui | – |
| Routing (frontend) | wouter | – |
| Data fetching | TanStack Query (React Query) | v5 |
| API server | Express | 5 |
| ORM | Drizzle ORM | 0.45 |
| Database | PostgreSQL | – |
| Auth | Replit Auth (openid-client v6) | – |
| Validation | Zod v4 | – |
| API codegen | Orval | 8 |
| Server build | esbuild | – |
| Push notifications | web-push (VAPID) | – |

---

## Database Schema

All tables defined in `lib/db/src/schema/`. After any schema change, run:

```bash
pnpm --filter @workspace/db run push
```

### `users`
Populated automatically on first Replit Auth login.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Replit user ID |
| `email` | text | |
| `firstName` | text | |
| `lastName` | text | |
| `profileImageUrl` | text | |
| `createdAt` | timestamp | |

### `circles`
A group that members belong to (e.g. "Family", "Work Crew").

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text | |
| `description` | text | nullable |
| `createdAt` | timestamp | |

### `circle_members`
Membership join table with roles.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `circleId` | integer FK → circles | |
| `userId` | text FK → users | |
| `role` | text | `"owner"` or `"member"` |
| `joinedAt` | timestamp | |

### `locations`
Location history — one row per GPS update per user.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `userId` | text FK → users | |
| `latitude` | numeric | |
| `longitude` | numeric | |
| `accuracy` | numeric | nullable, metres |
| `address` | text | nullable, reverse-geocoded |
| `speed` | numeric | nullable, **m/s** from browser GPS |
| `batteryLevel` | integer | nullable, 0–100 |
| `timestamp` | timestamp | |

### `places`
Saved locations with a geofence radius (Home, Office, Market, etc.).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `circleId` | integer FK → circles | |
| `name` | text | |
| `latitude` | numeric | |
| `longitude` | numeric | |
| `radius` | numeric | metres |
| `icon` | text | emoji or icon name |
| `createdAt` | timestamp | |

### `activity_events`
Audit log for arrivals, departures, check-ins, member joins, and SOS events.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `circleId` | integer FK → circles | |
| `userId` | text FK → users | |
| `type` | text | See event types below |
| `description` | text | Human-readable message |
| `placeId` | integer | nullable |
| `placeName` | text | nullable, denormalised |
| `timestamp` | timestamp | |

**Event types:** `arrival` · `departure` · `checkin` · `location_shared` · `member_joined` · `member_left` · `sos`

### `push_subscriptions`
Web Push subscription objects (one per browser/device per user).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `userId` | text FK → users | |
| `endpoint` | text | Push service URL |
| `p256dhKey` | text | ECDH public key |
| `authKey` | text | Auth secret |
| `createdAt` | timestamp | |

### `circle_invites`
Time-limited magic-link tokens for joining a circle.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `circleId` | integer FK → circles | |
| `createdBy` | text FK → users | |
| `token` | text unique | UUID v4 |
| `expiresAt` | timestamp | 7 days from creation |
| `usedAt` | timestamp | nullable, set on redemption |

### `sos_alerts`
Log of every SOS dispatch (for audit/cooldown checking).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `userId` | text FK → users | |
| `latitude` | numeric | nullable |
| `longitude` | numeric | nullable |
| `notifiedCount` | integer | recipients reached |
| `createdAt` | timestamp | |

### `circle_messages`
Per-circle chat messages.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `circleId` | integer FK → circles | cascade delete |
| `userId` | text FK → users | |
| `content` | text | max 500 chars |
| `createdAt` | timestamp | |

### `sessions`
`express-session` storage managed by `connect-pg-simple`. Do not edit manually.

---

## API Reference

All routes are prefixed with `/api`. All routes except `/api/auth/*`, `/api/healthz`, and `/api/join/*` require an authenticated session (`authMiddleware`).

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/healthz` | Returns `{ status: "ok" }` |

### Auth

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/login` | Redirects to Replit OIDC login |
| `GET` | `/api/callback` | OIDC callback — sets session cookie |
| `POST` | `/api/logout` | Destroys session |
| `GET` | `/api/auth/user` | Returns current user object |

### Circles

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/circles` | List circles for current user |
| `POST` | `/api/circles` | Create a new circle |
| `GET` | `/api/circles/:id` | Get circle details |
| `PATCH` | `/api/circles/:id` | Update circle name/description |
| `DELETE` | `/api/circles/:id` | Delete circle (owner only) |
| `GET` | `/api/circles/:id/summary` | Member count, place count, recent events |
| `GET` | `/api/circles/:id/members` | List members with last known location |
| `POST` | `/api/circles/:id/members/invite` | Add existing user by email |
| `DELETE` | `/api/circles/:id/members/:memberId` | Remove a member |
| `GET` | `/api/circles/:id/places` | List saved places |
| `POST` | `/api/circles/:id/places` | Create a saved place |
| `PATCH` | `/api/circles/:id/places/:placeId` | Update a place |
| `DELETE` | `/api/circles/:id/places/:placeId` | Delete a place |
| `GET` | `/api/circles/:id/activity` | Recent activity events (last 30) |
| `POST` | `/api/circles/:id/checkin` | Post a check-in event |
| `GET` | `/api/circles/:id/messages` | Fetch chat messages (last 50, chronological) |
| `POST` | `/api/circles/:id/messages` | Send a chat message |

### Locations

| Method | Path | Description |
|---|---|---|
| `PUT` | `/api/locations/me` | Update current user's location |
| `GET` | `/api/locations/history` | Current user's location history |
| `GET` | `/api/locations/circles/:id/members` | All member locations in a circle |

### Invites

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/circles/:id/invite-link` | Generate a 7-day invite token |
| `GET` | `/api/join/:token` | Validate token (returns circle info) |
| `POST` | `/api/join/:token` | Redeem token (joins circle) |

### Notifications

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/notifications/subscribe` | Save a Web Push subscription |
| `DELETE` | `/api/notifications/unsubscribe` | Remove a subscription |

### SOS

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sos` | Dispatch SOS push to all circle members (5-min cooldown) |

---

## Frontend Pages & Components

### Pages (`artifacts/life360-app/src/pages/`)

| File | Route | Description |
|---|---|---|
| `Login.tsx` | `/login` | Unauthenticated landing with "Enter Make We See You" button |
| `Home.tsx` | `/` | Map view + member status panel for all circles |
| `Circles.tsx` | `/circles` | List all circles, create new ones |
| `CircleDetail.tsx` | `/circles/:id` | Members · Chat · Places · Activity tabs |
| `Places.tsx` | `/places` | Manage saved places (cross-circle) |
| `Activity.tsx` | `/activity` | Cross-circle event feed |
| `Profile.tsx` | `/profile` | Location history, push permission, sign-out |
| `Join.tsx` | `/join/:token` | Invite link landing — redeems token |
| `not-found.tsx` | `*` | 404 fallback |

### Key Components

| Component | Description |
|---|---|
| `AppLayout` | Shell: desktop sidebar, mobile bottom nav, dark-mode toggle, SOS FAB |
| `SimulatedMap` | Nigeria bounding-box map; shows member pins with battery + speed chips; pin click → Google Maps directions |

---

## Custom Hooks

### `useAutoTrack` (`hooks/useAutoTrack.ts`)

Starts `navigator.geolocation.watchPosition` and POSTs location updates to `/api/locations/me` with throttling:

- **Distance threshold:** 40 metres (ignores jitter)
- **Time threshold:** 30 seconds minimum between POSTs
- **Payload includes:** `latitude`, `longitude`, `accuracy`, `speed`, `batteryLevel`

Exposed via `AutoTrackContext` — wrap your app in `<AutoTrackProvider>` to enable.

```ts
const { isTracking, lastUpdate, error } = useAutoTrackContext();
```

### `useBattery` (`hooks/useBattery.ts`)

Wraps the [Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API).

```ts
const { level, charging } = useBattery();
// level: 0–100 integer (null on unsupported browsers)
// charging: boolean
```

### `useTheme` (`hooks/useTheme.ts`)

Reads/writes the dark-mode preference.

```ts
const { theme, toggle } = useTheme();
// theme: "light" | "dark"
// toggle(): flips theme, persists to localStorage as "wyd_theme"
```

Dark mode is implemented via Tailwind v4's `@custom-variant dark (&:is(.dark *))` — toggling the `dark` class on `<html>` activates all `dark:` utility classes.

---

## Authentication Flow

```
1. User clicks "Enter Make We See You"
2. Browser → GET /api/login
3. Server redirects to Replit OIDC provider (with PKCE)
4. User authenticates with Replit / Google / GitHub
5. Provider → GET /api/callback?code=...
6. Server exchanges code for tokens, upserts user row in `users` table
7. Server sets signed session cookie (SESSION_SECRET)
8. User redirected to / — all subsequent API calls include the cookie
```

**Session:** `express-session` backed by PostgreSQL via `connect-pg-simple`. The `sessions` table is managed automatically.

**Adding new protected routes on the server:**

```ts
import { authMiddleware } from "./middleware/auth";

router.get("/my-route", authMiddleware, async (req, res) => {
  const userId = req.user.id; // guaranteed to exist
});
```

---

## Location Tracking Pipeline

```
Browser GPS (watchPosition)
    │  fires when position changes > 40m or > 30s
    ▼
useAutoTrack hook
    │  + batteryLevel from useBattery
    │  + speed from GeolocationCoordinates (m/s)
    ▼
PUT /api/locations/me
    │  body: { latitude, longitude, accuracy, speed, batteryLevel }
    ▼
INSERT INTO locations (userId, latitude, longitude, ...)
    │
    ▼
Other clients poll GET /api/locations/circles/:id/members
    │  returns last known location per member
    ▼
SimulatedMap renders pins with:
    ├── Battery chip (colour coded: green/yellow/amber/red)
    ├── Speed chip (🚶 / 🛵 / 🚗 based on km/h)
    └── Click → Google Maps navigation to that location
```

**Speed units:** The Browser Geolocation API returns speed in **m/s**. The app multiplies by `3.6` to display km/h. Speeds below 3 km/h are suppressed (GPS noise).

---

## Push Notifications

Uses the [Web Push Protocol](https://web.dev/push-notifications-overview/) with VAPID keys.

**Setup:**
1. Generate VAPID keys once:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Store `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` as environment secrets.

**Flow:**
1. Frontend calls `Notification.requestPermission()` → user grants
2. Browser creates a `PushSubscription` from `serviceWorkerRegistration.pushManager.subscribe()`
3. Frontend POSTs subscription object to `POST /api/notifications/subscribe`
4. Subscription stored in `push_subscriptions` table
5. Server sends pushes via `web-push.sendNotification()` (`artifacts/api-server/src/lib/webpush.ts`)

**Triggers:** SOS alerts, (extensible to: member arrivals, check-ins, etc.)

**SOS cooldown:** The frontend tracks the last SOS timestamp in `localStorage` (`wyd_sos_last`) and blocks re-sends within 5 minutes. The server also enforces this.

---

## OpenAPI Codegen Pipeline

The pipeline ensures the frontend always has type-safe, up-to-date API hooks.

```
lib/api-spec/openapi.yaml    ← Edit this to add/change endpoints
         │
         ▼  pnpm --filter @workspace/api-spec run codegen
         │
         ├──► lib/api-client-react/src/generated/
         │      api.ts           ← React Query hooks (useGetCircle, useListCircleMessages, etc.)
         │      api.schemas.ts   ← TypeScript interfaces
         │
         └──► lib/api-zod/src/generated/
                zod.ts           ← Zod schemas for server-side validation
```

**Adding a new endpoint — checklist:**

1. Add the path and schema to `lib/api-spec/openapi.yaml`
2. Run `pnpm --filter @workspace/api-spec run codegen`
3. Use the generated Zod schema in your Express route handler for validation
4. Use the generated React Query hook in your React component

**Generated hook naming:** Orval derives hook names from `operationId`:
- `operationId: listCircleMessages` → `useListCircleMessages(circleId, options?)`
- `operationId: sendCircleMessage` → `useSendCircleMessage(options?)`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (`postgresql://user:pass@host/db`) |
| `SESSION_SECRET` | ✅ | Long random string for signing session cookies |
| `VAPID_PUBLIC_KEY` | ✅ | Web Push VAPID public key (base64url) |
| `VAPID_PRIVATE_KEY` | ✅ | Web Push VAPID private key (base64url) |
| `PORT` | Auto | Injected by Replit for each artifact's dev server |
| `BASE_PATH` | Auto | Injected by Replit's reverse proxy |
| `NODE_ENV` | Auto | `"development"` in dev, `"production"` in deploy |

---

## Development Workflow

### Making a schema change

```bash
# 1. Edit lib/db/src/schema/<table>.ts
# 2. Export from lib/db/src/schema/index.ts
# 3. Push to DB
pnpm --filter @workspace/db run push
# 4. Restart API server workflow
```

### Adding an API endpoint

```bash
# 1. Add path + schema to lib/api-spec/openapi.yaml
# 2. Regenerate hooks + Zod schemas
pnpm --filter @workspace/api-spec run codegen
# 3. Add route handler in artifacts/api-server/src/routes/
# 4. Restart API server workflow
```

### Typechecking

```bash
# Full workspace typecheck (libs first, then leaf packages)
pnpm run typecheck

# Frontend only
pnpm --filter @workspace/life360-app run typecheck

# API server only
pnpm --filter @workspace/api-server run typecheck
```

### Building for production

```bash
# Typecheck + build all packages
pnpm run build
```

---

## Known Constraints & Gotchas

### ⚠️ Drizzle `inArray()` is broken with the `pg` driver

Drizzle v0.45.x generates `= ANY(($1,$2))` (invalid SQL) for `inArray()` and `sql\`= ANY(${array})\`` when using the `pg` driver.

**Workaround — always do this instead:**
```ts
// ❌ Broken
db.select().from(t).where(inArray(t.id, [1, 2, 3]));

// ✅ Correct
import { or, eq } from "drizzle-orm";
db.select().from(t).where(or(...[1, 2, 3].map(id => eq(t.id, id))));

// ✅ Also guard for empty arrays
const ids = [...];
if (ids.length === 0) return [];
db.select().from(t).where(or(...ids.map(id => eq(t.id, id))));
```

### ⚠️ No `limit` query params on paths with path params (Orval)

Adding a `limit` or `offset` query parameter to an OpenAPI operation that **also** has path parameters (e.g. `circleId`) causes Orval to generate colliding hook names. Use a fixed server-side `.limit(N)` in the Drizzle query instead.

### ⚠️ API server requires a workflow restart after code changes

The server is compiled with esbuild into `dist/index.mjs` before starting. File edits do **not** hot-reload — you must restart the `API Server` workflow for changes to take effect.

### ⚠️ Email invite requires the person to already be a user

`POST /api/circles/:id/members/invite` looks up the email in the `users` table. Since auth is OAuth-only, a user only appears in that table after their first login. **Solution:** use the invite link flow (`POST /api/circles/:id/invite-link`) which generates a token anyone can use to join after signing in.

### ⚠️ Tailwind v4 dark mode — no `tailwind.config.ts`

Dark mode is declared in CSS (`src/index.css`):
```css
@custom-variant dark (&:is(.dark *));
```
Toggle dark mode by adding/removing the `dark` class on `document.documentElement`. Do not create a `tailwind.config.ts` — Tailwind v4 uses CSS-first configuration.

### ⚠️ Vite duplicate React error after dep changes

If you see `Cannot read properties of null (reading 'useMemo')` in the browser after installing new packages, restart the `life360-app: web` workflow to clear Vite's dependency optimisation cache.

---

## Project Conventions

- **Logging:** Never use `console.log` in server code. Use `req.log` in route handlers and the singleton `logger` for non-request code.
- **IDs:** Always parse route param IDs with `parseId()` before passing to Drizzle. Raw Express params are strings.
- **Zod validation:** Every route handler validates path params and request body with the generated Zod schemas before touching the database.
- **Error responses:** `{ error: string }` with the appropriate HTTP status code (400, 401, 403, 404, 409, 500).
- **Timestamps:** All timestamps stored as `timestamp with time zone`. Serialised to ISO 8601 string in API responses.
- **Speed units:** GPS speed is stored and sent in **m/s** (browser native). Multiply by `3.6` at display time for km/h.
