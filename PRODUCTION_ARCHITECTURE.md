# Where You Dey? — Production Architecture

> Nigerian family location-sharing platform (Life360-style).
> Built as a pnpm monorepo, contract-first API, and real-time map experience.

---

## Full Tech Stack

### Runtime & Tooling

| Layer | Technology | Version |
|---|---|---|
| JavaScript Runtime | Node.js | 24.13.0 |
| Language | TypeScript | 5.9.3 |
| Package Manager | pnpm (workspaces) | 10.x |
| Monorepo Structure | pnpm workspaces | — |
| Code Formatter | Prettier | 3.8.3 |

---

### Frontend (`artifacts/life360-app`)

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19.x |
| Build Tool | Vite | 7.x |
| CSS Framework | Tailwind CSS v4 | 4.x |
| Component Library | shadcn/ui (Radix UI) | — |
| Routing | Wouter | 3.3.5 |
| Data Fetching | TanStack React Query | 5.x |
| Maps | Leaflet + React-Leaflet | 1.9.4 / 5.0.0 |
| Map Tiles | OpenStreetMap (free, no API key) | — |
| Animation | Framer Motion | — |
| Icons | Lucide React | — |
| Date Formatting | date-fns | 3.6.0 |
| Form Handling | React Hook Form + Zod | — |
| Charts | Recharts | 2.15.2 |
| Dark Mode | Tailwind v4 class-based (`next-themes`) | — |
| Push Notifications | Web Push API (service worker) | — |
| Auth Client | `@workspace/replit-auth-web` (custom) | — |

---

### Backend (`artifacts/api-server`)

| Layer | Technology | Version |
|---|---|---|
| HTTP Framework | Express | 5.2.1 |
| Language | TypeScript (compiled via esbuild) | 5.9.3 |
| Bundler | esbuild | 0.27.3 |
| Auth | Replit Auth — OpenID Connect PKCE | openid-client 6.8.4 |
| Session Management | express-session + PostgreSQL store | — |
| Logging | Pino + pino-http | 9.x / 10.x |
| Validation (input) | Zod v4 (generated schemas) | — |
| Push Notifications | web-push (VAPID) | 3.6.7 |
| CORS | cors | 2.8.6 |
| Cookie Parsing | cookie-parser | 1.4.7 |

---

### Database (`lib/db`)

| Layer | Technology | Version |
|---|---|---|
| Database | PostgreSQL | — |
| ORM | Drizzle ORM | — |
| Migrations | Drizzle Kit | 0.31.10 |
| Schema Validation | drizzle-zod | 0.8.3 |
| DB Driver | pg (node-postgres) | 8.20.0 |

---

### API Contract (`lib/api-spec` + `lib/api-client-react`)

| Layer | Technology |
|---|---|
| Spec Format | OpenAPI 3.1 (YAML) |
| Code Generator | Orval |
| Generated Output | Typed React Query hooks + Zod schemas |
| Pattern | Contract-first: spec → codegen → typed client |

---

## Database Schema

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│   users     │────<│  circle_members  │>────│   circles    │
│─────────────│     │──────────────────│     │──────────────│
│ id (PK)     │     │ userId (FK)      │     │ id (PK)      │
│ replitId    │     │ circleId (FK)    │     │ name         │
│ username    │     │ role             │     │ description  │
│ firstName   │     │ joinedAt         │     │ createdById  │
│ lastName    │     └──────────────────┘     │ createdAt    │
│ email       │                              └──────────────┘
│ profileImg  │
└──────┬──────┘
       │
       ├──────────────────────────────────────────────────────┐
       │                                                      │
┌──────▼──────┐     ┌──────────────────┐     ┌──────────────▼─┐
│  locations  │     │  activity_events │     │    places      │
│─────────────│     │──────────────────│     │────────────────│
│ id (PK)     │     │ id (PK)          │     │ id (PK)        │
│ userId (FK) │     │ circleId (FK)    │     │ circleId (FK)  │
│ latitude    │     │ userId (FK)      │     │ createdById    │
│ longitude   │     │ type             │     │ name           │
│ accuracy    │     │ description      │     │ latitude       │
│ altitude    │     │ metadata (JSON)  │     │ longitude      │
│ speed       │     │ createdAt        │     │ radius (m)     │
│ heading     │     └──────────────────┘     │ icon           │
│ address     │                              └────────────────┘
│ batteryLevel│
│ timestamp   │     ┌──────────────────┐     ┌────────────────┐
└─────────────┘     │ circle_messages  │     │ circle_invites │
                    │──────────────────│     │────────────────│
                    │ id (PK)          │     │ id (PK)        │
                    │ circleId (FK)    │     │ circleId (FK)  │
                    │ userId (FK)      │     │ createdById    │
                    │ content          │     │ token (unique) │
                    │ createdAt        │     │ expiresAt      │
                    └──────────────────┘     │ usedAt         │
                                             └────────────────┘
┌──────────────────────┐     ┌──────────────────────┐
│   sos_alerts         │     │  push_subscriptions  │
│──────────────────────│     │──────────────────────│
│ id (PK)              │     │ id (PK)              │
│ userId (FK)          │     │ userId (FK)          │
│ circleId (FK)        │     │ endpoint             │
│ latitude / longitude │     │ p256dh               │
│ message              │     │ auth                 │
│ resolvedAt           │     │ createdAt            │
└──────────────────────┘     └──────────────────────┘

                    ┌──────────────┐
                    │   sessions   │
                    │──────────────│
                    │ sid (PK)     │
                    │ sess (JSON)  │
                    │ expire       │
                    └──────────────┘
```

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/healthz` | Health check |
| `GET` | `/api/auth/login` | Initiate Replit Auth (PKCE) |
| `GET` | `/api/auth/callback` | Auth callback + session creation |
| `GET` | `/api/auth/logout` | Destroy session |
| `GET` | `/api/auth/user` | Current logged-in user |
| `GET` | `/api/circles` | List user's circles |
| `POST` | `/api/circles` | Create a new circle |
| `GET` | `/api/circles/:id` | Get circle details |
| `PATCH` | `/api/circles/:id` | Update circle |
| `DELETE` | `/api/circles/:id` | Delete circle |
| `GET` | `/api/circles/:id/summary` | Member/place/event counts |
| `GET` | `/api/circles/:id/members` | List members + last location |
| `POST` | `/api/circles/:id/members` | Add member by email |
| `DELETE` | `/api/circles/:id/members/:userId` | Remove member |
| `POST` | `/api/circles/:id/invite-link` | Generate invite token |
| `GET` | `/api/circles/:id/activity` | Circle activity feed |
| `POST` | `/api/circles/:id/checkin` | Post a check-in event |
| `GET` | `/api/circles/:id/messages` | List chat messages |
| `POST` | `/api/circles/:id/messages` | Send chat message |
| `GET` | `/api/circles/:id/places` | List saved places |
| `POST` | `/api/circles/:id/places` | Create saved place |
| `PATCH` | `/api/circles/:id/places/:placeId` | Update place |
| `DELETE` | `/api/circles/:id/places/:placeId` | Delete place |
| `PUT` | `/api/locations/me` | Update own GPS location |
| `GET` | `/api/locations/me/history` | Own location history |
| `GET` | `/api/locations/circles/:id/members` | All member locations for a circle |
| `POST` | `/api/join/:token` | Join circle via invite link |
| `POST` | `/api/sos` | Trigger SOS alert |
| `POST` | `/api/push/subscribe` | Register push subscription |

---

## Monorepo Structure

```
where-you-dey/
│
├── artifacts/
│   ├── life360-app/          ← React + Vite frontend
│   │   ├── src/
│   │   │   ├── pages/        ← Home, Circles, CircleDetail, Profile, Activity, Places, Join
│   │   │   ├── components/   ← UI components + Leaflet map
│   │   │   ├── hooks/        ← useTheme, useAuth, useGeolocation
│   │   │   └── index.css     ← Tailwind v4 + dark mode config
│   │   └── public/sw.js      ← Service worker for push notifications
│   │
│   └── api-server/           ← Express 5 API server
│       ├── src/
│       │   ├── routes/       ← circles, locations, invites, sos, push
│       │   ├── middleware/   ← authMiddleware, session
│       │   └── index.ts      ← Server entry point
│       └── build.mjs         ← esbuild bundler config
│
├── lib/
│   ├── db/                   ← Drizzle schema + migrations (source of truth)
│   │   └── src/schema/       ← All table definitions
│   │
│   ├── api-spec/             ← OpenAPI 3.1 YAML (source of truth for API)
│   │   └── openapi.yaml
│   │
│   ├── api-client-react/     ← Generated React Query hooks (DO NOT edit manually)
│   ├── api-zod/              ← Generated Zod schemas (DO NOT edit manually)
│   └── replit-auth-web/      ← Auth client hook (useAuth)
│
├── scripts/                  ← Utility scripts
├── DEVELOPER.md              ← Full developer guide
├── PRODUCTION_ARCHITECTURE.md ← This file
└── pnpm-workspace.yaml       ← Workspace config + dependency catalog
```

---

## Authentication Flow

```
User clicks "Sign In"
       │
       ▼
Frontend → GET /api/auth/login
       │
       ▼
Server generates PKCE code_verifier + code_challenge
Server redirects → Replit OAuth (accounts.replit.com)
       │
       ▼
User approves on Replit
       │
       ▼
Replit redirects → GET /api/auth/callback?code=...
       │
       ▼
Server exchanges code for tokens (PKCE)
Server fetches user profile from Replit
Server upserts user in `users` table
Server creates session (stored in `sessions` table)
       │
       ▼
Frontend receives session cookie
useAuth() hook reads /api/auth/user → user object
All subsequent API calls are authenticated via cookie
```

---

## Data Flow: Location Update

```
User's Phone (browser)
       │
       │ navigator.geolocation.watchPosition()
       ▼
PUT /api/locations/me
  { latitude, longitude, speed, accuracy, batteryLevel, address }
       │
       ▼
authMiddleware → verify session
       │
       ▼
INSERT into locations table
       │
       ▼
Other circle members call:
GET /api/locations/circles/:id/members  (polled every N seconds)
       │
       ▼
React Query returns updated positions
       │
       ▼
Leaflet map re-renders pins at correct GPS coordinates
```

---

## Invite Flow

```
Circle owner clicks "Invite Member"
       │
       ▼
POST /api/circles/:id/invite-link
       │
       ▼
Server generates unique token (UUID)
Saves to circle_invites table with 7-day expiry
       │
       ▼
Returns token → frontend builds:
https://your-domain.com/join/<token>
       │
       ▼
Owner shares link via WhatsApp / SMS / native share
       │
       ▼
Recipient clicks link → /join/<token> page
       │
       ▼
If not logged in → redirected to Replit Auth
If logged in → POST /api/join/:token
       │
       ▼
Server validates token (not expired, not used)
Adds recipient to circle_members
Marks token as used
       │
       ▼
Recipient lands in the circle
```

---

## Production Deployment Guide

### What You Need

| Requirement | Where to get it |
|---|---|
| Node.js 20+ | Pre-installed on Railway, Render, Fly.io |
| PostgreSQL database | Railway / Render / Supabase / Neon (free tiers available) |
| `DATABASE_URL` | Your Postgres provider will give you this |
| `SESSION_SECRET` | Any long random string (generate one: `openssl rand -hex 32`) |
| Replit Auth credentials | Already configured for your Replit domain |

### Recommended Platforms (Free → Paid)

| Platform | Best for | Cost |
|---|---|---|
| **Railway** | Easiest — one-click Node + Postgres | Free tier available |
| **Render** | Good free tier, auto-deploys from GitHub | Free tier available |
| **Fly.io** | More control, global edge | Free tier available |
| **VPS (DigitalOcean, Hetzner)** | Full control, cheapest at scale | ~$5/month |

### Deployment Steps

```bash
# 1. Clone from GitHub
git clone https://github.com/Abimbola030325/Family-Locator
cd Family-Locator

# 2. Install dependencies
pnpm install

# 3. Set environment variables (on your host platform)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SESSION_SECRET=your-long-random-secret

# 4. Create database tables
pnpm --filter @workspace/db run push

# 5. Build the API server
pnpm --filter @workspace/api-server run build

# 6. Build the frontend
pnpm --filter @workspace/life360-app run build

# 7. Start the API server
node artifacts/api-server/dist/index.mjs

# 8. Serve the frontend build
# → Copy artifacts/life360-app/dist/ to any static host
#    (Netlify, Vercel, Cloudflare Pages — all free)
```

### Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ Yes | Secret key for signing session cookies |
| `PORT` | No | Server port (defaults to 8080) |
| `NODE_ENV` | No | Set to `production` for production builds |
| `VAPID_PUBLIC_KEY` | No | For push notifications |
| `VAPID_PRIVATE_KEY` | No | For push notifications |

---

## Security Notes

- All API routes (except `/api/auth/*` and `/api/healthz`) require an active session
- Sessions are stored server-side in PostgreSQL — not in the browser (HTTP-only cookies)
- Auth uses OpenID Connect with PKCE — no passwords are ever stored
- Invite tokens expire after 7 days and can only be used once
- CORS is configured to only allow your own domain in production

---

*Generated: June 2026 — Where You Dey? v1.0*
