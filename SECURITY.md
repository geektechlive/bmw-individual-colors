# Security

## Credentials and secrets

All secrets are managed via environment variables and are never committed to this repository.

**What is gitignored:**
- `.env.local` — Supabase keys, Turnstile keys, `ADMIN_TOKEN`, Cloudflare API token
- `.dev.vars` — Wrangler local dev mirror of `.env.local`
- `.wrangler/` — Wrangler build cache

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
- An `ADMIN_TOKEN` of your choosing (any strong random string)

## Reporting a vulnerability

If you find a security issue, please open a GitHub issue or contact the maintainer directly. Do not include actual credentials or exploit payloads in public issues.
