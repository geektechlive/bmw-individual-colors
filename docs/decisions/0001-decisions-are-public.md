# 0001. Decisions are recorded as public ADRs in this repository

Status: Accepted · Date: 2026-11-13

## Context

Until 2026-11-13 the project's rules and the reasons behind them lived in a gitignored
`CLAUDE.md` and in private notes, never in git. They drifted from the code. One example: the notes
said `updateEntry` verified Turnstile; it never did. A November audit and remediation (#21–#33)
kept running into this gap between what was believed, what was wanted and what was true.

The repository is public, and the reasoning for recent decisions was already public in the issues.

## Decision

The owner, 2026-11-13: decisions are recorded as architecture decision records in tracked
`docs/decisions/`, public, in the same format as the owner's other projects. `CLAUDE.md` stays
private and gitignored; it holds working rules and points here for decisions.

No ADR may hold secrets, tokens, account, zone or resource IDs, email addresses, local file paths
or personal details. People are named by role. Evidence is limited to what a reader of the
repository can open: issues, commits, tracked files and public URLs. The rule is in the template.

## Consequences

- A decision lands in git in the same change that makes it, so it can be checked against the
  code it governs and linked from issues and the README.
- Anything sensitive behind a decision stays out; the ADR records the decision and its public
  evidence.
- Decisions made before 2026-11-13 were backfilled on that date. Their ADRs give the original
  date where it's known, and say "decided earlier" where it isn't.
- Revisit if a decision ever can't be explained without private detail. Record that one
  privately and leave a public stub.

## Evidence

- #34 (adopt ADRs and backfill).
- `docs/decisions/0000-template.md`.
