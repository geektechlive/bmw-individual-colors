# 0017. A duplicate build is a hard stop, with a link to edit the existing one

Status: Accepted · Date: 2026-11-14

## Context

Since April 2026 the submit form showed a duplicate warning with a "Submit Anyway" button, meant
for an owner with two cars of the same spec. The database also has a
unique index allowing one visible web-submitted build per forum user, paint, model year, body
style and drivetrain (`bmwic_entries_user_submitted_unique` in `schema.sql`, re-verified for #35).
With that index, the button could never save a genuinely identical build.

It looked as if it worked because of a separate form bug: React 19 resets uncontrolled form
fields when a server action returns, so after the warning the model year and several other
fields silently went back to their defaults, and "Submit Anyway" saved a different car (for
example model year 2021 instead of 2024). An end-to-end test caught this on 2026-11-14 once the
form kept the user's values. A query of the live data found no real user builds created through
this path.

## Decision

The owner chose to remove "Submit Anyway". A duplicate is a hard stop: the form says "You've
already registered this build", shows the existing spec, and links to the edit page of that
build. The server action no longer reads `force_submit`; the duplicate check always runs, and it
returns the existing build's id for the link. The form keeps the values the user typed after any
warning or error.

## Consequences

- The form, the server action and the database now enforce the same rule.
- No more wrong-spec builds from the reset bug.
- The owner's view: one person owning two cars with exactly the same spec is close to impossible,
  so blocking it costs nothing real.
- The rule compares only forum user, paint, model year, body style and drivetrain. Two genuinely
  different cars that share those five (say a Competition automatic and a base manual) are also
  stopped. That was already true at the database level before this change. If owners ask for it,
  add transmission (and the Competition flag) to the duplicate check and the unique index, with
  a migration.

## Evidence

- `src/app/actions.ts` (`submitEntry`, duplicate check), `src/components/EntryForm.tsx`.
- `src/components/form/keep-values.ts` (the reset fix) and its unit test.
- `tests/e2e/submit-duplicate.spec.ts`, which asserts the stop, the kept values and the link.
- `schema.sql` (`bmwic_entries_user_submitted_unique`), issue #35, ADR 0016's refresh work (#51).
