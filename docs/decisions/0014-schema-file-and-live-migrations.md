# 0014. `schema.sql` mirrors the live database; changes are applied live and verified

Status: Accepted · Date: recorded 2026-11-13, decided earlier

## Context

The registry's tables live in a Supabase project shared with other apps. There is no migrations
directory and no CI to run one (ADR 0002). The schema had drifted from the file before the
September health pass resynced it.

## Decision

- `schema.sql` is the reference copy of everything the site depends on: tables, indexes, RLS
  policies, triggers and functions.
- A database change is applied to the live project, and `schema.sql` is updated in the same
  change.
- Each change is verified live before landing: a rolled-back transaction exercises the behaviour,
  privileges are checked with `has_table_privilege` and `has_function_privilege`, and real calls
  are made with the public key.
- Every SECURITY DEFINER function revokes EXECUTE from `public` as well as `anon` and
  `authenticated`, and grants it to `service_role` only.
- The order is schema first, then code: a new table or function exists before the code that uses
  it ships, and an old one is dropped only after the code that used it is gone.

## Consequences

- One readable file describes the database, without migration tooling.
- Drift between the file and the live database is still possible. The verification step is what
  catches it.
- Revisit if the database gets more writers or more environments; versioned migrations would then
  pay off.

## Evidence

- ce0ebc1 (schema synced with the live database).
- #26, #31, #33 (each applied live, verified, then mirrored).
- `schema.sql`.
