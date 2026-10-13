# Express.js + PostgreSQL Conversion

## Overview

Convert the Packing Video Hub from TanStack Start with in-memory demo data to a Vite SPA frontend + Express.js REST API backend with PostgreSQL via Drizzle ORM.

## Architecture

```
┌─────────────┐     /api/*     ┌──────────────┐     Drizzle     ┌────────────┐
│  Vite SPA   │ ──────────────→│  Express.js  │ ──────────────→ │ PostgreSQL │
│  (React)    │  fetch/JSON    │  REST API    │    ORM          │            │
└─────────────┘                └──────────────┘                 └────────────┘
```

- **Dev:** Vite dev server proxies `/api` to Express on port 3001
- **Prod:** Express serves Vite's `dist/` as static files + API on one port

## Server Structure

```
server/
  index.ts          — Express entry, static serving, error handling
  db.ts             — Drizzle + postgres connection
  middleware/
    auth.ts         — JWT verify middleware (from auth.server.ts)
  routes/
    auth.ts         — POST /api/auth/login, /api/auth/register
    dashboard.ts    — GET /api/dashboard (aggregated stats)
    videos.ts       — GET/PATCH/DELETE /api/videos
    backups.ts      — GET/POST /api/backups, GET/PUT /api/backup-schedule
    sites.ts        — GET /api/sites
    users.ts        — GET/PATCH /api/users
    audit.ts        — GET /api/audit
    broadcasts.ts   — GET/POST /api/broadcasts
    upload.ts       — POST /api/upload
    profile.ts      — GET/PATCH /api/profile
  seed.ts           — Seeds demo data into PostgreSQL
```

## API Endpoints

All protected routes require `Authorization: Bearer <jwt>`.

### Auth (public)
- `POST /api/auth/register` — { email, password, fullName } → { token, user }
- `POST /api/auth/login` — { email, password } → { token, user }

### Dashboard
- `GET /api/dashboard` — aggregated stats (video count, user count, backups running, storage meters)

### Videos
- `GET /api/videos?q=&from=&to=&view=active|trash&page=0&limit=10` — paginated, filtered
- `PATCH /api/videos/:id` — update tags, isPublic, soft delete/restore
- `DELETE /api/videos` — bulk soft-delete { ids: string[] }
- `POST /api/videos/restore` — bulk restore { ids: string[] }

### Backups
- `GET /api/backups` — list user's backups
- `POST /api/backups` — trigger manual backup
- `GET /api/backup-schedule` — get schedule
- `PUT /api/backup-schedule` — update schedule

### Sites
- `GET /api/sites` — list sites (super_admin: all, admin: own)

### Users (super_admin only)
- `GET /api/users` — list admin users
- `PATCH /api/users/:id` — suspend/unsuspend, change quota

### Audit (super_admin only)
- `GET /api/audit?page=0&limit=20` — paginated audit log

### Broadcasts (super_admin only)
- `GET /api/broadcasts` — list
- `POST /api/broadcasts` — send { subject, body, siteId? }

### Upload
- `POST /api/upload` — { orderId, sku, customerPhone, title, tags, siteId, sizeBytes }

### Profile
- `GET /api/profile` — current user profile + role
- `PATCH /api/profile` — update name, phone, avatar

## Frontend Changes

### New: `src/lib/api.ts`
Thin fetch wrapper that:
- Prepends `/api` to paths
- Attaches Bearer token from localStorage
- Throws on non-OK responses
- Returns parsed JSON

### New: `src/lib/auth-context.tsx`
React context for auth state:
- token in localStorage
- user object (id, email, name, role, siteId)
- login/logout/register functions

### Route component changes
Every route that calls `useStore()` / `useVisibleVideos()` switches to React Query hooks calling the API. The data shapes from the API match what the components already expect (the Drizzle schema was designed from the demo-store types).

### Removed
- `src/lib/demo-store.tsx` — replaced by API calls
- `DemoStoreProvider` wrapper in `app.tsx` — replaced by auth context
- `src/lib/auth.server.ts` — logic moves to `server/middleware/auth.ts`
- `src/lib/db.server.ts` — logic moves to `server/db.ts`
- `server.mjs` — replaced by `server/index.ts`

## Package Changes

### New production deps
- `express` + `@types/express`
- `cors` + `@types/cors`
- `bcryptjs` + `@types/bcryptjs`

### Move to production deps
- `drizzle-orm`, `postgres` (currently devDependencies)

### New dev deps
- `tsx` (run TypeScript server in dev)
- `concurrently` (run Vite + Express together)

### Remove
- `@cloudflare/vite-plugin` (no longer deploying to Workers)
- `@tanstack/react-start` (no longer using SSR)
- TanStack Start-related config

## Scripts

```json
{
  "dev": "concurrently \"vite\" \"tsx watch server/index.ts\"",
  "build": "vite build",
  "start": "node dist/server/index.js",
  "db:migrate": "drizzle-kit migrate",
  "db:seed": "tsx server/seed.ts"
}
```

## Vite Config Changes

- Remove Cloudflare plugin, TanStack Start plugin, lovable-tagger
- Add proxy: `/api` → `http://localhost:3001`
- Keep: React plugin, tsconfig-paths, Tailwind

## Seed Data

`server/seed.ts` inserts the same demo data currently in `demo-store.tsx` into PostgreSQL, including a default super_admin user with a known password for development.
