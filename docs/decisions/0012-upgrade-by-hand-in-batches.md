# 0012. Upgrade by hand, in peer-compatible batches, deployed separately from other changes

Status: Accepted · Date: 2026-11-13

## Context

By November, `next` 16.2.3 carried advisories that reach the deployed Worker, including a Server
Actions CPU-exhaustion bug. On this plan that kind of bug surfaces as Error 1102. Fifteen
Dependabot security PRs were open, each bumping one package. `@opennextjs/cloudflare` 1.20.17
requires `next >= 16.4.5` and `wrangler ^4.148`, so the core packages can only move together.

## Decision

- **Dependencies are upgraded by hand,** in one batch per set of peer constraints (Next, React,
  OpenNext and wrangler together), with the low-risk bumps alongside. The batch then goes through
  `npm run verify`, a run on the real Workers runtime, and a Cloudflare preview build before it
  lands.
- **No `npm audit fix` downgrades.** Pin with `overrides` instead (for example `d3-color`).
- **Hold a major version** until its ecosystem supports it (TypeScript 7 and ESLint 10 as of
  2026-11-13).
- **Ship an upgrade as its own deploy, apart from performance changes,** so their effects on CPU
  can be told apart. The per-request log line makes them attributable when they have to overlap.

## Consequences

- One coherent upgrade replaces many single-package PRs; superseded Dependabot PRs are closed.
- Upgrades need a deliberate pass, not a click.
- Revisit if upgrades fall behind security advisories again.

## Evidence

- #30; 119b942.
- `package.json` `overrides`.
