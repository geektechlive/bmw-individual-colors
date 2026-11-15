# 0018. Stay on Supabase; don't move the data to Cloudflare D1

Status: Accepted · Date: 2026-11-14

## Context

The site runs on Cloudflare Workers (ADR 0003), but its data lives in Supabase Postgres. The
owner asked whether Cloudflare's own database, D1, could replace Supabase and simplify the data
layer.

D1 works on the Workers free plan. Cloudflare's D1 pricing and limits pages (checked 2026-11-14)
give these free-plan limits:

- 5 million rows read and 100,000 rows written per day, reset at 00:00 UTC;
- 500 MB per database and 5 GB per account, with up to 10 databases;
- 7 days of point-in-time recovery;
- 50 queries per Worker invocation.

Past a daily limit, queries return errors until the reset. Nothing is billed. The registry holds a
few hundred rows, and the edge cache (ADR 0004) answers most page views without a database read,
so it would fit easily.

What a move would gain:

- one vendor instead of two;
- an in-network binding instead of the blocking data-version read over the internet (ADR 0007);
- a database used by this project alone. The Supabase project is shared with another project.

What it would take:

- **A rewrite, not a swap.** `schema.sql` relies on Postgres features SQLite lacks: the
  `bmwic_flag_entry` and `bmwic_moderate` functions (ADR 0010, 0011), and row-level security
  policies. Flagging and moderation would move into Worker code, and the
  `bmwic_bump_data_version` triggers would need rebuilding as SQLite triggers.
- **Changes beyond the schema.** About a dozen source, script and test files use the Supabase
  client, and the live data would have to move.
- **A change in how the data is inspected.** The project inspects the database through
  Postgres-based tooling today.

None of this changes anything a visitor sees.

## Decision

The owner decided to stay on Supabase. It is free, it works, and the work it would take is better
spent on changes visitors use, such as the paint lookup and the phone layouts from the design
review.

## Consequences

- No migration work. The current data layer, triggers and functions stay as they are.
- The data-version read keeps its network round trip, timeout and per-colo fallback (ADR 0007).
- Revisit if:
  - the data-version read to Supabase causes slow or failed pages;
  - Supabase changes its free plan, or sharing the project becomes a problem;
  - the data layer is being rewritten anyway, for example to add a chassis column for the next
    generation of M3.

## Evidence

- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- `schema.sql`: `bmwic_bump_data_version`, `bmwic_flag_entry`, `bmwic_moderate`,
  `create policy "public read"`.
- `src/lib/edge-cache.ts`: the data-version read.
