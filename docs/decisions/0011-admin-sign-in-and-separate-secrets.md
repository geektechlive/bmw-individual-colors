# 0011. The admin signs in to a session; each secret has one job

Status: Accepted · Date: 2026-11-13

## Context

`/admin` was reached as `/admin?token=<admin token>`. The token was rendered into hidden inputs on
every form, the actions redirected back to that URL, and three exported Server Actions took the
token as an argument. The same admin token also keyed the HMAC for edit links.

## Decision

- **`/admin` shows a sign-in form.** The admin token plus a fresh Turnstile token is required on
  every attempt. Success sets `mc_admin`, a cookie holding `v1.<exp>.<HMAC>`:
  - the HMAC is keyed by `ADMIN_SESSION_SECRET` over `admin|exp|sha256(ADMIN_TOKEN)`, so
    rotating either secret revokes every session;
  - the cookie is HttpOnly, Secure, SameSite=Strict, and lasts 12 hours;
  - a `?token=` in the URL is ignored.
- **One server-side check, `hasAdminSession()`,** guards the page and every privileged action.
  Moderation runs only through `adminModerate`, and no action takes the admin token as an
  argument.
- **Each secret has one job.** `ADMIN_TOKEN` is only the sign-in credential. `EDIT_TOKEN_SECRET`
  signs edit links. `ADMIN_SESSION_SECRET` signs sessions and keys the flag-reporter hash, and
  flagging fails closed without it.
- **Secrets fail closed:** if one is missing, the dependent feature refuses rather than falling
  back to a known key.
- **The admin token was rotated at cutover.** In hindsight it was precautionary, not a response to
  a leak (see ADR 0013). The only copies of the old token were on the owner's own devices.

## Consequences

- The admin credential no longer appears in URLs, page HTML or links.
- The owner types the token once per 12 hours. Edit links issued before the cutover stopped
  working; those users re-verify their forum username.
- Revisit if more than one person needs admin access. Per-person accounts would then be warranted.

## Evidence

- #32, #33; f7e0cc8, befb705.
- `src/lib/admin-session.ts`, `src/lib/admin-auth.ts`, `src/lib/edit-token.ts`,
  `src/app/admin/page.tsx`.
- `tests/unit/admin-session.test.ts`, `tests/unit/edit-token.test.ts`, `tests/e2e/submit.spec.ts`
  ("Admin page").
