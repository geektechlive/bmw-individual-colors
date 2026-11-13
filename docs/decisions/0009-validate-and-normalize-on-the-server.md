# 0009. Submissions are validated and normalized on the server, on every write

Status: Accepted · Date: 2026-09-05

## Context

Field values had drifted across forum imports and web submissions: 8 spellings of "Automatic",
32 variants of "USA", 24 spellings of wheels. Cleanup scripts fixed the data once, and new
submissions brought the drift back.

## Decision

`src/lib/validation.ts` normalizes transmission, country, wheels and color names on every create
and edit (`validateEntryInput`). Both `submitEntry` and `updateEntry` go through it, so the two
paths enforce the same rules. The client form is a convenience, not the gate.
`scripts/normalize-db.ts` repairs existing rows with the same rules; it is idempotent.

Suspicious rows are never deleted by scripts. They are left for the owner to review.

## Consequences

- Charts and counts stay consistent without periodic cleanups.
- When a new kind of drift appears, the normalizer in `validation.ts` and the matching rule in
  `normalize-db.ts` change together.
- Color aliases (for example "Enzian Blue" → "Gentian Blue") are canonicalized on write as well
  as on read since 2026-11-13. The five existing alias rows were migrated first, so the unique
  index sees one name per car (#35). Alias names are not offered as separate colors.
- Permanent, unless the data model changes.

## Evidence

- 196d450, 327e9fe; #35.
- `src/lib/validation.ts`, `scripts/normalize-db.ts`.
