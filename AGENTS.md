# Project rules

- The app currently runs on in-memory sample data (`src/lib/demo-store.tsx`) at the user's request; the backend tables exist but aren't used yet. Swap the store for real queries when the user asks.
- Styling uses Tailwind v3 (`tailwind.config.ts`, `postcss.config.js`) with the Perficient design system CSS imported first in `src/styles.css`, because the design system targets Tailwind v3.
- App pages live under `/app/*` (`src/routes/app.tsx` layout). This avoids a pathless layout that would clash with `/`.
