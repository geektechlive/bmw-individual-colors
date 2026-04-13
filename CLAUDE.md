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
npx tsx scripts/import.ts [seed-file.json]        # import seed data into Supabase
npx tsx scripts/import.ts --dry-run               # preview without writing
npx tsx scripts/import.ts --skip-geo              # skip geocoding
npx tsx scripts/normalize-colors.ts               # normalize color names in seed JSON
npx tsx scripts/seed-forum.ts [threadId] [pages]  # scrape bimmerpost forum thread → JSON
npx tsx scripts/backfill-dates.ts [--dry-run]     # backfill posted_at from forum data
npx tsx scripts/normalize-wheels.ts [--dry-run]   # normalize wheel field to canonical names
npx tsx scripts/normalize-locations.ts [--dry-run] # normalize location fields + re-geocode
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
- `/reports` — full chart dashboard (Server Component fetches data, hands off to `ReportsClient` Client Component for interactive state + charts). Analytics only — no map.
- `/map` — interactive Registry Map (Server Component fetches `getLocationEntries()`, renders via `RegistryMapWrapper` → `RegistryMap`). Full-viewport Leaflet map with marker clustering.
- `/colors` — grid of all colors in the registry with swatch, count, and family
- `/colors/[slug]` — color detail page: stat tiles, year distribution bar, drivetrain split, full build list. Pure HTML/CSS inline charts (no Recharts) to avoid hydration issues in Server Component context. Slug resolved via `slugToColor()`.
- `/admin` — token-gated moderation page (`?token=ADMIN_TOKEN`). Lists flagged entries; Dismiss and Delete actions via inline server forms. No nav link — direct URL access only.

**Components:**
- `src/components/charts/` — Recharts chart components; all Client Components (`'use client'`)
- `EntryForm` — Client Component for the submit form (includes Cloudflare Turnstile)
- `EntryTable` — Client Component for the sortable/filterable entries table
- `FlagButton` — Client Component; one-shot 🚩 button per entry, calls `flagEntry()` Server Action
- `ReportsClient` — Client Component; orchestrates all chart components with tab/filter UI
- `RegistryMapWrapper` — thin Client Component wrapper that `dynamic()`-imports `RegistryMap` with `ssr: false`. Required because `ssr: false` cannot be used in Server Components directly.
- `RegistryMap` — Client Component; fully imperative Leaflet map (useRef + useEffect, no MapContainer). Uses `leaflet.markercluster` for clustering. Imperative pattern avoids the "Map container is already initialized" error from React StrictMode/HMR.
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

Deployment is **Git-triggered** — pushing to `main` kicks off a Cloudflare build automatically. Do not run `npm run deploy` unless deploying outside of CI.

**Wrangler local dev secrets:** `.dev.vars` (gitignored) mirrors `.env.local` for `wrangler dev`. Add any secret needed locally to both files.

**Minification:** `minify = true` lives in `wrangler.toml` (applied by wrangler at deploy time). Do NOT add it to `open-next.config.ts` — `CloudflareOverrides` does not accept that property.

**ESLint:** `.wrangler/**` is in `globalIgnores` in `eslint.config.mjs`. If lint starts producing thousands of errors from minified temp files, check that this ignore is still present.

**Pre-push build check:** Always run `npm run build:cf` locally before pushing to main. `npm run dev` and lint alone are not sufficient — the Cloudflare production build catches errors that Turbopack dev mode does not (missing modules, CSS import failures, SSR violations).

**Transitive dependencies:** If you `import 'some-package'` directly in source code, that package must be listed explicitly in `package.json`. Do not rely on it being present as a transitive dependency of something else — it will disappear when the parent is removed, breaking Cloudflare's clean install.

**CSS imports from node_modules:** Some packages (e.g. `react-leaflet-cluster`) self-`require()` their CSS in their CJS entry point. This breaks Turbopack's production build with a "module factory not available" error. Prefer packages that do not bundle CSS side-effects, or import CSS directly from the package's dist path in your own component.

**`ssr: false` with `next/dynamic`:** Cannot be used directly in Server Component page files. Must be wrapped in a Client Component (see `RegistryMapWrapper.tsx`).

**Browser-only libraries (e.g. Leaflet):** Use imperative `useRef + useEffect` initialization rather than React wrapper components. This avoids the "Map container is already initialized" error caused by React StrictMode double-invocation and HMR remounts. Guard initialization with `if (mapRef.current) return` and clean up with `map.remove()` on unmount.

**Playwright against production:**
```bash
ADMIN_TOKEN=<token> PLAYWRIGHT_BASE_URL=https://mcolors.geektechlive.com npx playwright test --no-deps
```
Test 12 (Turnstile submit) always fails in headless — expected. 48/49 is the realistic ceiling.
