# 0004. Public pages are edge-cached until the registry data changes

Status: Accepted · Date: 2026-10-06 (refined 2026-11-12/13)

## Context

Rendering a page costs far more CPU than the free plan allows (ADR 0003). Registry data changes
rarely: a few writes a month, from the site, scripts or the Supabase dashboard. Paid cache
products and purge APIs are out.

## Decision

`worker.ts` and `src/lib/edge-cache.ts` serve public GET and HEAD pages from `caches.default`
before the Next server loads.

- **Cache key:** host + deployed version id + `bmwic_meta.data_version` + path + a hash of the
  RSC router headers (never `_rsc`).
- **Invalidation needs no purge calls.** Postgres statement triggers bump `data_version` on any
  insert, delete or truncate, and on any UPDATE that sets a column other than the legacy
  `flag_count`.
- **Bypassed:** `/edit`, `/admin`, `/api`, server actions, unknown query parameters, and the
  60-second `mc_fresh` cookie that lets an editor see their own change.

Refinements from the November audit:

- A HEAD miss renders as GET and is stored, so uptime monitors fill the cache (#22).
- The version read is shared per isolate and blocks rather than serving an older version (ADR
  0007, #23).
- Flag-only writes don't bump the version (#26). Flags now live in their own table (ADR 0010).

## Consequences

- Repeat views cost almost no CPU. Each data center still renders a page once after every change
  or deploy, because the Cache API is per data center.
- **A new column that public pages render must be added to the trigger's `UPDATE OF` list** in
  `schema.sql` and in the live database, or edits to it won't show.
- Revisit if write volume grows enough that per-change invalidation keeps the cache cold.

## Evidence

- ec9b4d5, a67dd64; 74a10e6 (#22, #23, #26).
- `schema.sql` (search `bmwic_entries_bump_data_version`).
- `tests/unit/edge-cache.test.ts`.
