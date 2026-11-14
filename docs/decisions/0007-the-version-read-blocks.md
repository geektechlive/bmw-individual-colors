# 0007. The edge cache's data-version read blocks; it never serves an older version

Status: Accepted · Date: 2026-11-12

## Context

Every cacheable request needs the current `data_version` to build its cache key (ADR 0004). The
read went to Supabase with a 1.5 s timeout. In the week of 2026-11-06, 178 requests timed out.
In data centers with no last-known-good version, those requests rendered uncached, at full CPU.

A stale-while-revalidate variant was built: answer with the old version and refresh in the
background. A second-model review rejected it. After a data change it could serve pre-edit pages
to everyone, for an unbounded time.

## Decision

The read blocks. Waiting costs wall time, not CPU. The timeout is 4 s, and concurrent requests in
one isolate share a single in-flight read. On failure, the per-data-center last-known-good is
used. A failed save of that fallback never downgrades a fresh read.

## Consequences

- No request answers with an older version than the database has, once the 10 s per-isolate memo
  has expired.
- A slow Supabase read adds latency, not CPU.
- Revisit if read latency becomes a user-visible problem. A faster authoritative version source
  would be the fix, not stale answers.

## Evidence

- #23; 74a10e6.
- `src/lib/edge-cache.ts` (search `createVersionSource`).
- `tests/unit/edge-cache.test.ts`: the tests "never answering with the old one" and "shares a
  single in-flight version read".

## Addendum, 2026-11-14: concurrent requests no longer share the in-flight read

Sharing one in-flight read across requests broke under the Workers rule that a promise created by
one request can't settle into another request after the first has ended
(`handle_cross_request_promise_resolution`, on by compatibility date). When the request that
started the read was cancelled, such as a prefetch the browser abandoned, every request waiting
on it failed with a 500. The design refresh made this common: the home and colors pages carry
40 to 70 links, so browsers fire bursts of prefetches. It was seen in production telemetry and
reproduced on a preview version (128 of 490 prefetch responses were 5xx).

Each request now does its own read when the memo has expired. The decision above is unchanged:
the read still blocks and never serves an older version. The cost is a few extra small reads when
several requests miss in one isolate at the same moment. The test that asserted sharing now
asserts independent reads.
