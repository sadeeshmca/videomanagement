# Video Management Platform — Build Plan

The spreadsheet lists 46 tasks. I'll build them in this app using Lovable Cloud (database, logins, file storage, server jobs) plus one central Google Drive account for video storage. Work is split into phases so you can review each one.

## What changes from the brief (and why)

| Brief asks for | What I'll use instead |
|---|---|
| Next.js, NextAuth, JWT | This platform's React framework with Lovable Cloud logins (email + password, email verification, password reset) |
| Neon Postgres + Prisma | Lovable Cloud database with per-site data isolation rules |
| Upstash Redis sessions | Built-in Cloud sessions and sign-out |
| BullMQ + node-cron | A jobs table plus scheduled calls to server endpoints |
| FFmpeg thumbnails | Google Drive's own generated thumbnails (FFmpeg can't run on this hosting) |
| ZIP backups | ZIP built on the server for modest sizes; very large backups get flagged as a limit |
| Google Workspace SMTP | Cloud's built-in email sending (needs an email domain set up later) |
| Docker, GitHub Actions, Railway, Sentry | Lovable hosting and publishing. Error logging goes to the server logs |
| Jest unit tests | Vitest tests for the core helpers |

## Phase 1: Foundation
- Apply the Perficient design system (surfaces, logo, buttons, tagline close).
- Enable Cloud and set up sign-up, email verification, login, forgot and reset password, and profile with avatar.
- Roles: Super Admin (everything, creates sites, assigns Admins) and Admin (add videos and view listings for their own site only).
- Data: sites, profiles, user roles, videos, backups, jobs, audit log, broadcasts, all scoped by site.

## Phase 2: Google Drive and videos
- Connect the central Google Drive account.
- Folder layout: site / order / file.
- Resumable chunked upload with a progress bar, retry, and daily 750GB upload tracking.
- Link videos to order ID, SKU, and date, stored in Drive file properties and in the database.
- Video list with search, date and order filters, and pages.
- Row actions: Open in Drive, WhatsApp send (wa.me), public/private share toggle.
- Soft delete with 30-day recovery, plus bulk select, delete, and tag.
- Storage meter per user and per site, synced with Drive's quota.

## Phase 3: Backups
- Per-user schedule (every 1, 3, or 6 months, with a start date) and a "Back up now" button.
- A job builds the ZIP, uploads it to the Drive backup folder, and shows progress.
- Backup history with an expiring download link, a completion email, and retention auto-delete.

## Phase 4: Admin panels
- Super Admin: site CRUD, admin invites, suspend or delete admins, system dashboard with users and storage charts, and a monitor for all backup jobs.
- Audit log that can't be edited, with CSV export.
- Email broadcast to users, segmented by site.

## Phase 5: QA
- Tests for quota math, WhatsApp link building, and retention rules. Check desktop and mobile layouts.

## Things you'll need to provide
- Google Drive connection (a connect card will appear).
- An email sending domain, for verification, reset, backup, and broadcast emails.
- The first Super Admin's email.

## Technical details
- TanStack Start server functions, with Cloud auth middleware on every protected call.
- RLS on every table using a `has_role` security-definer function and `site_id` scoping. Roles live in a separate `user_roles` table.
- Drive calls go through the connector gateway, with exponential backoff on 429 errors.
- Scheduled work runs through pg_cron calling `/api/public/cron/*` endpoints protected by a shared secret.
