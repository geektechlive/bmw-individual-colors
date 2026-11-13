# 0015. User-visible changes go to CHANGELOG.md automatically and to the forum thread by script

Status: Accepted · Date: recorded 2026-11-13, decided earlier

## Context

The registry's users live on a forum thread, not on GitHub. They need to hear about fixes and
features in their own place, and writing release notes by hand had been skipped.

## Decision

- A post-commit hook (`.githooks/post-commit`) turns each user-visible conventional commit into a
  line under `## [Unreleased]` in `CHANGELOG.md`: `feat` becomes Added, `fix` Fixed, `perf` and
  `refactor` Improved, `security` Security, `docs` Docs. `chore`, `test`, `ci`, `build` and
  `style` are skipped.
- `scripts/post-to-bimmerpost.ts` posts the Unreleased section to the forum thread as BBCode and
  dates the section.
- Work done in a worktree discards its per-commit changelog lines before landing, so the squash
  commit on `main` produces one entry.

## Consequences

- Release notes write themselves from commit subjects, so the subjects must read well to users.
- Posting to the forum stays a deliberate, manual step.
- Revisit if the community moves off the forum.

## Evidence

- 327e9fe (hook and posting script hardened).
- `.githooks/post-commit`, `scripts/post-to-bimmerpost.ts`, `CHANGELOG.md`.
