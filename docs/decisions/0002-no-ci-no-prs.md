# 0002. No CI and no PRs: `npm run verify` is the gate

Status: Accepted · Date: recorded 2026-11-13, decided earlier

## Context

This is a one-maintainer hobby project. A hosted CI run would only repeat the checks the maintainer
already runs locally, and pull requests add a review step with no second reviewer. Pushes to
`main` deploy through Cloudflare Workers Builds.

## Decision

There is no hosted CI and no pull-request flow. One local command, `npm run verify` (lint,
typecheck, unit tests, Cloudflare build), is the gate. Each change is worked in its own git
worktree, test-first, then squash-merged to `main` with `Closes #N` and pushed.

GitHub's Dependabot **security** updates stay on. Version-update PRs are not configured;
dependencies are upgraded by hand (ADR 0012). A security PR is landed like any change: pull the
branch, run the gate. Merging it in the GitHub UI is not enough, because nothing else tests it.

## Consequences

- Fast, cheap, no CI minutes. The gate is only as good as remembering to run it, and that
  discipline is part of the workflow.
- A push to `main` is a production deploy. When a git-triggered build doesn't fire, `npm run
  deploy` from a clean `main` is the fallback (#29).
- Revisit if the project gains regular outside contributors.

## Evidence

- `package.json` script `verify`, added in 74a10e6.
- The repository has no `.github/workflows/`.
- #29 (a missed build trigger, worked around by a manual deploy) and #30 (Dependabot PRs
  superseded by a manual upgrade).
