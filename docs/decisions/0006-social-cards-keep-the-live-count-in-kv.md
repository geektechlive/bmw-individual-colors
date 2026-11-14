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

## Addendum, 2026-11-14: the key no longer includes the deploy

Keying on the deployed version wiped every card on every deploy. On a day with many deploys, a
link-preview crawler that walked the color cards found them cold each time; each render costs 1 to
2 s of CPU, and Cloudflare killed two in six hours (2 010 ms, `exceededCpu`, Workers telemetry for
`/colors/<slug>/opengraph-image`). This is the revisit condition above.

The key is now `og:<card design version>:<slug>:<data_version>`. The design version is a constant
(`OG_DESIGN_VERSION` in `src/lib/og-cache.ts`) that is bumped by hand when the card layout
changes, so deploys that don't touch the card no longer cause renders. A data change still
re-renders the cards that are requested afterwards. The trade-off: a deploy that changes what a
card shows without bumping the constant serves the old card until the next data change or the
30-day expiry.

Previews and production now share cached cards (the key has no deploy or host). That is harmless
while the card design is the same, and it means a card changed on a preview would leak into
production's cache. So any change to a card's layout or content bumps `OG_DESIGN_VERSION` in the
same commit; the preview then writes new keys and production keeps reading the old ones until
the change lands.
