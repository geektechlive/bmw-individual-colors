# Security

## Credentials and secrets

All secrets are managed via environment variables and are never committed to this repository.

**What is gitignored:**
- `.env.local` — Supabase keys, Turnstile keys, `ADMIN_TOKEN`, Cloudflare API token, `BIMMERPOST_USERNAME`/`BIMMERPOST_PASSWORD`
- `.dev.vars` — Wrangler local dev mirror of `.env.local`
- `.wrangler/` — Wrangler build cache

Each secret has one job ([ADR 0011](docs/decisions/0011-admin-sign-in-and-separate-secrets.md)):
`ADMIN_TOKEN` is only the credential typed at `/admin`; `ADMIN_SESSION_SECRET` signs the
12-hour admin session cookie (rotating it, or `ADMIN_TOKEN`, signs everyone out);
`EDIT_TOKEN_SECRET` signs `/edit/[id]` links (1-hour TTL). A missing secret makes its feature
refuse rather than fall back to a known key. Security reviews of this project state their threat
model first ([ADR 0013](docs/decisions/0013-security-reviews-use-an-explicit-threat-model.md)).

`.env.local` also holds `ADMIN_SESSION_SECRET` and `EDIT_TOKEN_SECRET`.

**What is safe to be public:**
- `wrangler.toml` contains only `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, which is the client-side Cloudflare Turnstile site key. This key is designed to be public — it is not a secret.
- All other secrets are injected as Cloudflare Worker secrets at deploy time and are never stored in the repo.

## Setting up locally

Copy `.env.local.example` to `.env.local` and fill in your own credentials:

```bash
cp .env.local.example .env.local
```

You will need:
- A [Supabase](https://supabase.com) project with a table matching the `BmwEntry` schema in `src/types/index.ts`
- A [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) site/secret key pair
- An `ADMIN_TOKEN`, `ADMIN_SESSION_SECRET` and `EDIT_TOKEN_SECRET` (long random strings, e.g.
  `openssl rand -base64 32` each)

## Reporting a vulnerability

If you find a security issue, please open a GitHub issue or contact the maintainer directly. Do not include actual credentials or exploit payloads in public issues.
