# Decisions

Architecture decision records: what was decided, why, and when to revisit it. They are the source
of truth for decisions. They are public ([0001](0001-decisions-are-public.md)): no secrets, account,
zone or resource IDs, email addresses, local paths or personal details. Start a new one from
[0000-template.md](0000-template.md), in the same change that makes the decision.

| ADR                                                        | Decision                                                                            | Issues          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------- |
| [0001](0001-decisions-are-public.md)                       | Decisions are recorded as public ADRs in this repository                            | #34             |
| [0002](0002-no-ci-no-prs.md)                               | No CI and no PRs: `npm run verify` is the gate                                      | #29, #30        |
| [0003](0003-stay-on-the-workers-free-plan.md)              | Stay on the Cloudflare Workers free plan, and design to its 10 ms CPU limit         | #21             |
| [0004](0004-edge-cache-keyed-on-data-version.md)           | Public pages are edge-cached until the registry data changes                        | #22, #23, #26   |
| [0005](0005-stay-on-nextjs.md)                             | Stay on Next.js; revisit a static rebuild only on evidence                          | #21             |
| [0006](0006-social-cards-keep-the-live-count-in-kv.md)     | Social cards keep the live build count and are cached globally in free KV           | #24             |
| [0007](0007-the-version-read-blocks.md)                    | The data-version read blocks; it never serves an older version                      | #23             |
| [0008](0008-username-edits-and-soft-delete.md)             | Entries are edited by forum username, and nothing is hard-deleted                   | #27             |
| [0009](0009-validate-and-normalize-on-the-server.md)       | Submissions are validated and normalized on the server, on every write              |                 |
| [0010](0010-flags-need-a-reason.md)                        | A flag must say what is wrong, and lives outside the entries table                  | #26, #31, #33   |
| [0011](0011-admin-sign-in-and-separate-secrets.md)         | The admin signs in to a session; each secret has one job                            | #32, #33        |
| [0012](0012-upgrade-by-hand-in-batches.md)                 | Upgrade by hand, in peer-compatible batches, deployed separately                    | #30             |
| [0013](0013-security-reviews-use-an-explicit-threat-model.md) | Security reviews state their threat model; the owner's own surfaces are trusted  | #32             |
| [0014](0014-schema-file-and-live-migrations.md)            | `schema.sql` mirrors the live database; changes are applied live and verified       | #26, #31, #33   |
| [0015](0015-changelog-hook-and-forum-updates.md)           | User-visible changes go to CHANGELOG.md automatically and to the forum by script    |                 |
| [0016](0016-design-refresh-mix-direction.md)               | A token-based design system: "Build Sheet" for data, lit paint where paint is the point | #38–#52     |
