# 0003. Stay on the Cloudflare Workers free plan, and design to its 10 ms CPU limit

Status: Accepted · Date: 2026-10-06

## Context

The site is Next.js on Cloudflare Workers through OpenNext. Workers Free allows 10 ms of CPU per
request. A request that loads the Next server costs 400–1,300 ms. Cloudflare tolerates that most
of the time, then kills bursts with Error 1102. A September deploy pulled an 8.7 MB package
(`country-state-city`) into server code, and the site broke intermittently for a month.

## Decision

The owner declined paid plans and paid products. The site stays on Workers Free, and the design
works to its limits:

- Never import a heavy package from server code; generate the small slice that's needed.
- Serve public pages from the free Workers Cache API before the Next server loads (ADR 0004).
- Answer bot probes, missing static files and other junk cheaply, before the Next server loads.
- Free-tier products are fine: Workers KV is used within its free daily limits (ADR 0006).

## Consequences

- Hosting stays free, at the cost of engineering around cold renders.
- Every new feature is checked for its uncached CPU cost.
- In the week of 2026-11-06, p99 CPU was about 1.2 s. The causes were fixed in 74a10e6 (#21);
  #21 tracks the 7-day re-check.
- Revisit if cache work can no longer keep killed requests near zero. Then the choice is between
  a paid plan and a framework change (ADR 0005), and it's the owner's call.

## Evidence

- 895af04 (keep `country-state-city` out of the server bundle), ec9b4d5 (edge cache).
- #21, with telemetry baselines in its comments; 74a10e6 (Phase 1 CPU fixes).
