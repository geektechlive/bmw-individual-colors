# 0008. Entries are edited by forum username, and nothing is hard-deleted

Status: Accepted · Date: 2026-09-05 (reaffirmed 2026-11-13)

## Context

Entries carry the owner's forum username, which is shown publicly in the entries table. Anyone
who types an entry's username, and passes Turnstile, gets a 1-hour signed edit link that can
change or soft-delete that entry. About 215 entries were imported from the forum and have no
per-entry secret anyone could hold.

A per-entry secret, issued at submission, would stop impersonation but lock out every imported
entry.

## Decision

The owner, 2026-09-05: keep the low-friction username flow, which came from forum feedback. Make
every removal reversible instead:

- `deleted_at` soft-deletes rows;
- every read path filters on it;
- the admin page can restore any deleted row.

A 2026-11-13 review rated username-only editing "critical". The owner kept the decision (#27,
closed by design).

## Consequences

- The registry is a community trust system, not an auth system. Reversibility beats gatekeeping.
- Vandalism is possible and undoable from `/admin`.
- Edit links are signed with their own secret, so the admin credential can't forge them (ADR 0011).
- Revisit only if abuse actually shows up. Don't propose per-entry secrets before that.

## Evidence

- 196d450 (soft delete); #27 (closed, by design).
- `src/lib/edit-token.ts`; `schema.sql` (search `deleted_at is null`).
