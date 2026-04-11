# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # local dev server (Next.js + Cloudflare Workers shim)
npm run build        # standard Next.js build
npm run build:cf     # Cloudflare Workers build via @opennextjs/cloudflare
npm run deploy       # build:cf + wrangler deploy
npm run lint         # ESLint
```

**Scripts** (run with `npx tsx`):
```bash
npx tsx scripts/import.ts [seed-file.json]   # import seed data into Supabase
npx tsx scripts/import.ts --dry-run          # preview without writing
npx tsx scripts/import.ts --skip-geo         # skip geocoding
npx tsx scripts/normalize-colors.ts          # normalize color names in seed JSON
npx tsx scripts/seed-forum.ts [threadId] [pages]  # scrape bimmerpost forum thread → JSON
npx tsx scripts/backfill-dates.ts [--dry-run]     # backfill posted_at from forum data
npx tsx scripts/normalize-wheels.ts [--dry-run]   # normalize wheel field to canonical names
```

## Architecture

Next.js 16 App Router app deployed to **Cloudflare Workers** via `@opennextjs/cloudflare`. All pages are Server Components; data is fetched at request time via Supabase.

**Data flow:**
- `src/lib/supabase.ts` — three clients: `createClient()` (browser/anon), `createServerClient()` (server/anon), `createAdminClient()` (server/service-role, bypasses RLS). Use admin only in Server Actions and scripts.
- `src/lib/queries.ts` — all Supabase queries. Most aggregate over `getEntries()` in-memory; only `getLocationEntries()` and `getEntriesByColor()` add DB-level filters. Also contains: `computeRarityLabel()` / `computeRarityColor()`, `computeRegistryGrowth()`, `computeCompetitionAdoption()`, `computeColorFamilyByYear()`, `computeWheelCounts()`.
- `src/app/actions.ts` — Server Actions: `submitEntry` (geocodes via Nominatim, inserts, redirects to `/entries`), `flagEntry` (increments `flag_count`), `dismissFlag` (resets `flag_count`), `deleteEntry` (hard delete). Admin actions are token-gated.
- `src/lib/colors.ts` — BMW Individual color names → hex, `isLightColor()`, `COLOR_FAMILY_MAP`, `getColorFamily()`, `getColorHex()`, `colorToSlug()` / `slugToColor()` for URL routing.

**Routes:**
- `/` — home with stats + chart overview
- `/submit` — form page (uses `EntryForm` with `useFormState`)
- `/entries` — paginated table of all submissions
- `/reports` — full chart dashboard (Server Component fetches data, hands off to `ReportsClient` Client Component for interactive state + charts)
- `/colors` — grid of all colors in the registry with swatch, count, and family
- `/colors/[slug]` — color detail page: stat tiles, year distribution bar, drivetrain split, full build list. Pure HTML/CSS inline charts (no Recharts) to avoid hydration issues in Server Component context. Slug resolved via `slugToColor()`.
- `/admin` — token-gated moderation page (`?token=ADMIN_TOKEN`). Lists flagged entries; Dismiss and Delete actions via inline server forms. No nav link — direct URL access only.

**Components:**
- `src/components/charts/` — Recharts/react-simple-maps chart components; all Client Components (`'use client'`)
- `EntryForm` — Client Component for the submit form (includes Cloudflare Turnstile)
- `EntryTable` — Client Component for the sortable/filterable entries table
- `FlagButton` — Client Component; one-shot 🚩 button per entry, calls `flagEntry()` Server Action
- `ReportsClient` — Client Component; orchestrates all chart components with tab/filter UI
- `src/app/NavLinks.tsx` — Client Component in app dir (not `components/`); nav bar with active-state styling

**Flag/moderation flow:** Community flags via `FlagButton` → `flagEntry()` increments `flag_count`. Admin reviews at `/admin?token=...`, then dismisses (resets count) or deletes the row.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=   # Cloudflare Turnstile (public, used in EntryForm)
TURNSTILE_SECRET_KEY=             # Cloudflare Turnstile (server-side validation in submitEntry)
ADMIN_TOKEN=                      # Guards /admin route and deleteEntry/dismissFlag actions
```

## Supabase Table

Single table: `bmwic_entries`. Schema matches the `BmwEntry` interface in `src/types/index.ts`. No migrations directory — schema managed directly in Supabase dashboard.

## Cloudflare Deployment

`wrangler.toml` points at `.open-next/worker.js`. The `WORKER_SELF_REFERENCE` service binding is required for the OpenNext Cloudflare adapter. Env vars are set as Cloudflare Worker secrets (not in `wrangler.toml`).
