# 0006. Social cards keep the live build count and are cached globally in free KV

Status: Accepted · Date: 2026-11-12

## Context

`/colors/<slug>/opengraph-image` renders a PNG with the color's swatch, name, live build count
and rarity, at about 1.3–2 s of CPU per render. Requests are rare and spread across many data
centers, so the per-data-center Cache API almost never has them. Both requests Cloudflare killed
in the week of 2026-11-06 were card renders. Cloudflare Builds has no database secrets at build
time, so a static card can't include the live count.

## Decision

The owner chose to keep the live count. Cards are cached in a free-tier Workers KV namespace
(`OG_CACHE`):

- **Key:** `og:<deployed version>:<slug>:<data_version>`, with a 30-day TTL, so a card re-renders
  only after a deploy or a data change.
- **Misses** render through the edge-cache handler, so 404s for unknown slugs are cached too.
- **Unknown slugs return 404** instead of rendering a card for arbitrary text.
- **Query strings are ignored.**
- **Degraded renders** (a failed data read) are served `no-store` and never stored.
- **`x-og-cache: HIT|MISS`** reports what happened.

## Consequences

- Volume is a few KV writes a week against the 1,000 a day free limit.
- KV is eventually consistent (about 60 s), so concurrent first requests in different regions can
  each render. A render that gets killed stores nothing. Kills become rare, not impossible.
- Revisit if card renders keep getting killed. The fallback is static cards without the count.

## Evidence

- #24; 74a10e6.
- `src/lib/og-cache.ts`, `tests/unit/og-cache.test.ts`, the `[[kv_namespaces]]` binding in
  `wrangler.toml`.
