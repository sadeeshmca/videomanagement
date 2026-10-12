# Packing Video Hub — Express.js + PostgreSQL Conversion

## Overview

Convert the TanStack Start + in-memory demo app to an Express.js API server with PostgreSQL (via existing Drizzle ORM schema) and React Router v6 SPA frontend. Single server deployment on Railway.

## Decisions

- **Video storage:** Google Drive via service account
- **Auth:** Invite-only, JWT (jose + bcrypt)
- **Frontend routing:** React Router v6 (replacing TanStack Router + Start)
- **Data fetching:** TanStack React Query + fetch
- **Server:** Express serves API routes under `/api` and React SPA static files
- **Database:** Existing Drizzle ORM schema (10 tables, migration already written)

## Architecture

```
Express.js Server (server/)
├── index.ts            — app entry, static file serving
├── middleware/
│   ├── auth.ts         — JWT verification, requireAuth, requireRole
│   └── audit.ts        — audit log helper
├── routes/
│   ├── auth.ts         — login, forgot-password, reset-password
│   ├── videos.ts       — CRUD, search, filter, soft delete/restore
│   ├── upload.ts       — chunked upload to Google Drive
│   ├── backups.ts      — schedule CRUD, trigger, history
│   ├── profile.ts      — profile CRUD, avatar, change password
│   ├── admin/
│   │   ├── users.ts    — invite, suspend, delete
│   │   ├── audit.ts    — audit log listing
│   │   ├── broadcast.ts— send/list broadcasts
│   │   └── jobs.ts     — backup jobs listing
│   ├── sites.ts        — site CRUD
│   └── settings.ts     — app settings
└── lib/
    ├── db.ts           — Drizzle ORM connection (from existing db.server.ts)
    ├── drive.ts        — Google Drive service account client
    └── password.ts     — bcrypt hash/verify helpers

React SPA (src/)
├── main.tsx            — React entry with QueryClientProvider + RouterProvider
├── router.tsx          — React Router v6 route definitions
├── lib/
│   ├── api.ts          — fetch wrapper with auth headers
│   ├── auth.ts         — token storage, login/logout helpers
│   └── format.ts       — (existing)
├── hooks/
│   ├── use-auth.ts     — auth context provider
│   └── use-api.ts      — React Query wrapper hooks per resource
├── components/         — (existing UI components, unchanged)
├── design-system/      — (existing, unchanged)
└── pages/
    ├── Landing.tsx      — / (existing index.tsx)
    ├── Auth.tsx         — /auth (login + forgot password)
    ├── ResetPassword.tsx— /reset-password
    ├── app/
    │   ├── Layout.tsx   — sidebar nav, auth guard
    │   ├── Dashboard.tsx— /app
    │   ├── Videos.tsx   — /app/videos
    │   ├── Upload.tsx   — /app/upload
    │   ├── Backups.tsx  — /app/backups
    │   ├── Profile.tsx  — /app/profile
    │   └── admin/
    │       ├── Users.tsx    — /app/admin/users
    │       ├── Audit.tsx    — /app/admin/audit
    │       ├── Broadcast.tsx— /app/admin/broadcast
    │       └── Jobs.tsx     — /app/admin/jobs
```

## API Routes

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Email + password → JWT token |
| POST | `/api/auth/forgot-password` | No | Email → reset token (logged for now) |
| POST | `/api/auth/reset-password` | No | Reset token + new password |

### Videos (`/api/videos`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/videos` | Yes | List with search/filter/pagination. Query: `q`, `startDate`, `endDate`, `trashed`, `page`, `limit` |
| POST | `/api/videos` | Yes | Create video record |
| PATCH | `/api/videos/:id` | Yes | Update title, tags, isPublic, order fields |
| DELETE | `/api/videos/:id` | Yes | Soft delete |
| POST | `/api/videos/:id/restore` | Yes | Restore soft-deleted |
| DELETE | `/api/videos/:id/permanent` | Admin | Hard delete + remove from Drive |

### Upload (`/api/upload`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/upload/init` | Yes | Init resumable Drive upload → session URL |
| POST | `/api/upload/chunk` | Yes | Forward chunk to Drive → progress |
| POST | `/api/upload/complete` | Yes | Finalize → create video record |

### Backups (`/api/backups`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/backups/schedule` | Yes | Get user's schedule |
| PUT | `/api/backups/schedule` | Yes | Create/update schedule |
| POST | `/api/backups/trigger` | Yes | Manual backup now |
| GET | `/api/backups` | Yes | List backup history |

### Profile (`/api/profile`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/profile` | Yes | Current user's profile |
| PATCH | `/api/profile` | Yes | Update name, phone, avatar |
| POST | `/api/profile/change-password` | Yes | Old + new password |
| POST | `/api/profile/avatar` | Yes | Upload avatar to Drive |

### Admin — Users (`/api/admin/users`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/users` | Super Admin | List users with profiles/roles |
| POST | `/api/admin/users/invite` | Super Admin | Invite by email + role + siteId |
| PATCH | `/api/admin/users/:id/suspend` | Super Admin | Toggle suspended |
| DELETE | `/api/admin/users/:id` | Super Admin | Delete user cascade |

### Admin — Audit (`/api/admin/audit`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/audit` | Super Admin | List audit logs with filters |

### Admin — Broadcast (`/api/admin/broadcast`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/broadcast` | Super Admin | List sent broadcasts |
| POST | `/api/admin/broadcast` | Super Admin | Send broadcast |

### Admin — Jobs (`/api/admin/jobs`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/jobs` | Super Admin | List all backup jobs |

### Sites (`/api/sites`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/sites` | Yes | Own site (admin), all sites (super_admin) |
| POST | `/api/sites` | Super Admin | Create site |
| PATCH | `/api/sites/:id` | Super Admin | Update site |

### Settings (`/api/settings`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/settings/:key` | Yes | Read setting |
| PUT | `/api/settings/:key` | Super Admin | Update setting |

## Auth Flow

1. Super admin invites user → `POST /api/admin/users/invite` creates user with bcrypt-hashed temporary password
2. User logs in → `POST /api/auth/login` verifies password, returns JWT (7-day expiry)
3. Frontend stores JWT in localStorage, attaches as `Authorization: Bearer <token>` on every request
4. `requireAuth` middleware verifies JWT, loads user + roles from DB, attaches to `req.user`
5. `requireRole("super_admin")` middleware checks role for admin routes
6. Password reset: forgot-password generates a token stored on the user row, reset-password consumes it

## Google Drive Integration

- Service account with domain-wide delegation or shared folder access
- Credentials stored as `GOOGLE_SERVICE_ACCOUNT_KEY` env var (JSON string)
- Each site has a `driveFolderId` — all videos for that site upload into that folder
- Resumable uploads: server initiates session with Drive API, returns session URI to client, client sends chunks through server to Drive
- On completion: server stores `driveFileId`, `driveWebViewLink`, `thumbnailUrl` on the video record

## Frontend Conversion

### Removed
- TanStack Start (`@tanstack/react-start`)
- TanStack Router (`@tanstack/react-router`, `@tanstack/router-plugin`)
- `demo-store.tsx` (in-memory data)
- `routeTree.gen.ts` (auto-generated route tree)
- `start.ts` (TanStack Start entry)
- Cloudflare Workers config (`@cloudflare/vite-plugin`, `wrangler.jsonc`)
- `server.mjs` (custom Node HTTP server — replaced by Express)
- Lovable preview routes

### Added
- React Router v6 (`react-router-dom` already installed)
- `src/lib/api.ts` — fetch wrapper: base URL, auth header injection, error handling
- `src/hooks/use-auth.ts` — AuthContext with login/logout/user state, persisted JWT
- `src/hooks/use-api.ts` — React Query hooks per resource (useVideos, useBackups, etc.)

### Page Changes
Each page keeps its existing UI components and Tailwind styling. The only change is swapping `useDemoStore()` calls for React Query hooks that hit the real API. Role-based access uses the user's actual roles from the JWT/profile endpoint instead of the sidebar toggle.

## Build & Deploy

### Development
- `npm run dev:server` — runs Express with tsx watch
- `npm run dev:client` — runs Vite dev server with proxy to Express
- `npm run dev` — runs both concurrently

### Production (Railway)
- `npm run build` — Vite builds React SPA to `dist/client/`, tsc compiles server to `dist/server/`
- `npm run start` — `node dist/server/index.js` serves API + static files
- Pre-deploy: `npm run db:migrate`

### Environment Variables
| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google service account JSON |
| `PORT` | Server port (default 3000) |

## Schema Changes

The existing Drizzle schema is used as-is with one addition:
- `users` table gets a `resetToken` (text, nullable) and `resetTokenExpiresAt` (timestamp, nullable) for password reset flow

New migration: `0001_add_reset_token.sql`

## Audit Logging

A `logAudit(actorId, siteId, action, target, meta?)` helper is called from route handlers on mutations. Actions: `user.invite`, `user.suspend`, `user.delete`, `video.create`, `video.update`, `video.delete`, `video.restore`, `backup.trigger`, `backup.schedule`, `broadcast.send`, `site.create`, `site.update`, `settings.update`, `profile.update`.
