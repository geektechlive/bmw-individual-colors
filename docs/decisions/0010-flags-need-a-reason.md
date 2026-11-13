# 0010. A flag must say what is wrong, and lives outside the entries table

Status: Accepted · Date: 2026-11-13

## Context

The 🚩 button recorded one anonymous click as `flag_count + 1`, with no reason. The owner had
nothing to judge, so the queue became "delete or ignore". By November, 37 entries had flags, most
of them single clicks from April, before the button had a bot check.

Flag writes also hit `bmwic_entries`, which bumped the cache version and emptied every page's
cache (#26). The count-only RPC was also executable by anyone holding the public key, through the
default PUBLIC grant (#33).

## Decision

The owner, 2026-11-13:

- **A reason is required:** wrong color, wrong details, duplicate, not a real build, or other.
  An optional note is allowed, up to 280 characters, and is required for "other".
- **Storage:** flags live in `bmwic_flags`, written through the atomic, service-role-only
  function `bmwic_flag_entry`. It only flags visible entries, keeps one open flag per reporter
  per entry, and caps open flags at 20 per entry. The reporter key is an HMAC of the IP; the raw
  IP is never stored.
- **`/admin`** shows every reason, note and date. Dismiss and Delete run through
  `bmwic_moderate` in one transaction.
- **The old mechanism is gone:** `increment_flag` was dropped, and `flag_count` is legacy.

The 37 legacy flags were triaged once:

- 4 entries with evidence of a problem were soft-deleted (restorable): a 2035 model year, two
  duplicates, a one-letter username;
- the rest were dismissed.

## Consequences

- Flags are actionable and never touch the public cache.
- Database checks enforce the rules even if app validation is bypassed.
- Revisit the cap and dedupe if real reports start hitting `too_many`.

## Evidence

- #31, #33, #26; f7e0cc8.
- `src/lib/flag-validation.ts`, `src/lib/flagging.ts`, `schema.sql` (search `bmwic_flags`).
- `tests/unit/flag-validation.test.ts`, `tests/unit/moderation-flagging.test.ts`.
