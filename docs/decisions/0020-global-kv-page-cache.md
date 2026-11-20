# 0020. Pages are also cached globally in free KV, behind the per-data-center cache

Status: Accepted · Date: 2026-11-20

## Context

Public pages are cached in the Workers Cache API (ADR 0004), which is per data center. Traffic is
spread over about 45 of them, so over the 7 days to 2026-11-20 the request log line showed a page
HIT ratio of 64% and an RSC ratio of 42% (#21, re-check comment). Every miss loads the Next server
(about 450-490 ms of CPU on a 10 ms plan, 1.6-2.6 s wall) and a small share are killed (Error
1102). That week also had 15 commits on `main`, and every deploy re-keys every page, so the ratios
mix cache design with deploy churn. ADR 0005 named a global KV page cache as the next step; the
owner approved it on 2026-11-20.

## Decision

Lookup order for a cacheable request: the data-center cache, then free-tier Workers KV, then
render. A render is stored in both. A KV hit is also written to the data-center cache, so the next
request in that data center is a local HIT.

- **Same namespace.** It reuses the `OG_CACHE` binding (no new Cloudflare resource). Page keys are
  `page:<deployed version>:<data_version>:<sha256>`, where the hash covers host, path and the hashed
  RSC router headers (never `_rsc`), exactly the edge-cache key material. The hash keeps any path
  under KV's 512-byte key limit. Card keys stay `og:...`.
- **Full HTML pages only.** A request with any RSC router header or `_rsc` neither reads nor
  writes KV and keeps today's per-data-center cache. The RSC key hashes `Next-Router-State-Tree`,
  which varies with the page the visitor came from, so RSC would multiply distinct keys (writes)
  while rarely hitting globally. The main session decided this on 2026-11-20 to protect the shared
  write quota (see Consequences).
- **Same eligibility as the edge cache**, plus two narrower rules: only status 200 goes to KV
  (404s stay per data center), and social card paths never go to the page KV. Never stored:
  anything with `Set-Cookie` or a content encoding, degraded renders, bodies over 2 MiB.
- **TTL 7 days**, a safety net; keys go stale on their own with each deploy or data change.
- **Fails open everywhere.** A KV read is raced against a 400 ms timer. A healthy read is far
  below it and a render costs 1.6-2.6 s wall, so a slow KV adds at most 400 ms and never turns a
  hit-able page into a worse-than-render case. A read error, timeout or corrupt value renders. KV
  writes run in `waitUntil` after the response, errors are caught and logged, and after one failed
  write that Worker isolate stops attempting writes for 5 minutes (most likely cause: the daily
  quota).
- **Observability.** Responses carry `x-edge-cache: HIT-KV`, which the request log line reports in
  its `cache` field, so KV hits can be split from local hits.

### KV limits (verified 2026-11-20)

From [Workers KV limits](https://developers.cloudflare.com/kv/platform/limits/) and
[pricing](https://developers.cloudflare.com/kv/platform/pricing/): Free plan 100,000 reads per
day, 1,000 writes to different keys per day, 1 write per second to the same key, 25 MiB per value,
512-byte keys. The pricing page says: "Daily usage limits reset daily at 00:00 UTC. If you exceed
any one of these limits, further operations of that type will fail with an error." So the reset
is 00:00 UTC, as the owner had been told.

## Consequences

- **The 1,000 writes/day budget is shared with the social cards, and this is the real risk.** In the
  7-day window there were about 1,390 page and 4,490 RSC misses. Storing both would have meant
  roughly 840 writes a day before any KV layer, close to the limit, and every deploy or data change
  re-keys everything. Pages alone are about 200 misses a day, comfortably under 1,000, which is why
  RSC is excluded. A busy day can still reach the limit; after that, page and card writes both
  fail until 00:00 UTC. Failure is harmless to pages (they render, as today) but card renders are
  the requests that get killed. Whether quota is per account or per namespace is not stated on the
  pages above, so a second namespace is not assumed to help.
- RSC requests stay at their per-data-center ratio (42% in the baseline); only page HTML gains the
  global layer.
- Anyone can force writes by requesting distinct valid paths. The same requests already force
  renders today; the new cost is quota. The per-isolate write pause limits the failure rate but
  does not cap the writes.
- Previews share the namespace and the quota (ADR 0006 addendum). Their page keys carry their own
  version id, so they never serve or overwrite production pages, but they spend the same writes.
- If the quota proves too tight, the options are: write only after a key is seen twice, or reserve
  the namespace for cards. If RSC misses later prove to be the CPU problem, a KV layer for them needs
  a key that does not hash the router-state header.
- KV is eventually consistent (about 60 s), so a page rendered in one region is not instantly
  visible in another; a few extra renders in that window are accepted.
- `next dev` does not run `worker.ts`, so the KV path is covered by unit tests
  (`tests/unit/page-kv.test.ts`) and by checking `x-edge-cache` on a preview or production.
- Revisit after a week of the request log: compare HIT plus HIT-KV against the 64% and 42% baselines,
  count KV write failures in Workers Logs, and check card renders still get cached.

## Evidence

- #21; ADRs 0004, 0005, 0006, 0007.
- `src/lib/page-kv.ts`, `src/lib/edge-cache.ts`, `worker.ts`, `tests/unit/page-kv.test.ts`.
