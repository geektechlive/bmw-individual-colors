# 0005. Stay on Next.js; revisit a static rebuild only on evidence

Status: Accepted · Date: 2026-11-12

## Context

With the 10 ms CPU limit (ADR 0003), a mostly-read site that boots a full Next server on every
cache miss is a poor fit. A static build (for example Astro output served as Workers Static
Assets, with a few small Worker endpoints for writes) would make reads cost zero CPU.

Telemetry from 2026-11-06 to 2026-11-13 showed where the CPU actually went:

- 58% on uptime-monitor HEAD requests that the cache never stored;
- both killed requests on social-card renders.

Both are fixable gaps in our own cache layer, not limits of the framework.

## Decision

The owner, 2026-11-12: stay on Next.js and fix the cache gaps first (#22–#26).

## Consequences

- No rewrite; the fixes shipped as one deploy (74a10e6).
- Keeps Next's upgrade cadence (ADR 0012) and its cold-render cost on every remaining miss.
- **Revisit if**, after the 7-day re-check in #21, real page misses (mostly `/colors/<slug>`
  across data centers) still cause killed requests. Compare a global page cache in free KV with
  a static rebuild, using numbers.

## Evidence

- #21: the telemetry breakdown and the options weighed are in its comments.
- 74a10e6.
