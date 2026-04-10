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
```

## Architecture

Next.js 16 App Router app deployed to **Cloudflare Workers** via `@opennextjs/cloudflare`. All pages are Server Components; data is fetched at request time via Supabase.

**Data flow:**
- `src/lib/supabase.ts` — three clients: `createClient()` (browser/anon), `createServerClient()` (server/anon), `createAdminClient()` (server/service-role, bypasses RLS). Use admin only in Server Actions and scripts.
- `src/lib/queries.ts` — all Supabase queries. Most aggregate over `getEntries()` in-memory; only `getLocationEntries()` adds a DB-level filter.
- `src/app/actions.ts` — single Server Action `submitEntry` that geocodes via Nominatim, then inserts via admin client. On success, redirects to `/entries`.
- `src/lib/colors.ts` — static map of BMW Individual color names → hex approximations. `isLightColor()` drives text contrast in charts.

**Routes:**
- `/` — home with stats + chart overview
- `/submit` — form page (uses `EntryForm` with `useFormState`)
- `/entries` — paginated table of all submissions
- `/reports` — full chart dashboard

**Components:** `src/components/charts/` contains Recharts/react-simple-maps chart components; all are Client Components (`'use client'`). `EntryForm` is a Client Component; `EntryTable` is a Client Component for the sortable/filterable table.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Supabase Table

Single table: `bmwic_entries`. Schema matches the `BmwEntry` interface in `src/types/index.ts`. No migrations directory — schema managed directly in Supabase dashboard.

## Cloudflare Deployment

`wrangler.toml` points at `.open-next/worker.js`. The `WORKER_SELF_REFERENCE` service binding is required for the OpenNext Cloudflare adapter. Env vars are set as Cloudflare Worker secrets (not in `wrangler.toml`).
