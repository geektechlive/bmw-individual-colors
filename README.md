# BMW Individual Colors Registry

A community registry of BMW Individual paint colors submitted by owners. Browse builds, explore color rarity, and see where Individual-spec cars are registered around the world.

Live at [mcolors.geektechlive.com](https://mcolors.geektechlive.com).

## Stack

- **Next.js 16** (App Router, Server Components) deployed to **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Supabase** for the database
- **Cloudflare Turnstile** for spam protection on the submit form
- **Recharts** for analytics charts
- **Leaflet** + `leaflet.markercluster` for the registry map

## Getting started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase and Cloudflare Turnstile credentials

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database setup

The app uses a single Supabase table (`bmwic_entries`). To create it from scratch:

1. Create a new [Supabase](https://supabase.com) project
2. Open the SQL editor and run `schema.sql` from this repo — it creates the table, RLS policies, and the `increment_flag` function
3. Copy your project URL, anon key, and service role key into `.env.local`

`schema.sql` includes the primary key index plus a unique partial index that dedupes
web-submitted entries and a partial index on `deleted_at` for the admin restore flow. If
you're running this at scale, consider adding indexes on `ext_color`, `model_year`, and
`user_submitted` depending on your query patterns.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in your own values. See `SECURITY.md` for the full list and where to find each credential. Never commit `.env.local`.

## Commands

```bash
npm run dev        # local dev server (Next.js + Cloudflare Workers shim)
npm run build      # standard Next.js build
npm run build:cf   # Cloudflare Workers production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Database maintenance scripts

`scripts/normalize-db.ts` normalizes existing rows in place (transmission, country, wheels,
and color values) using the same allowlists as `src/lib/validation.ts`. Run with `--dry-run`
first to preview changes, then `--apply` to write them:

```bash
npx tsx scripts/normalize-db.ts --dry-run
npx tsx scripts/normalize-db.ts --apply
```

## Deployment

Pushing to `main` triggers a Cloudflare Pages/Workers build automatically. Run `npm run build:cf` locally before pushing to catch production-build errors that the dev server won't surface.

## Notes

**Turnstile:** `wrangler.toml` contains the original project's Turnstile site key. If you're forking this, replace `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `wrangler.toml` and `TURNSTILE_SECRET_KEY` in `.env.local` with your own keys from the [Cloudflare Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile). The existing key is domain-restricted and won't work on a different origin.

## Changelog & forum thread posting

The repo includes an automated system for maintaining a public changelog and posting updates to a vBulletin forum thread.

### How it works

**`CHANGELOG.md`** uses [Keep a Changelog](https://keepachangelog.com) format. A `## [Unreleased]` section accumulates pending entries. When you post, it becomes a dated section with the forum URL.

**Git hook** (`.githooks/post-commit`) prepends a changelog entry to `## [Unreleased]`
automatically after every meaningful commit. Wire it up once after cloning:

```bash
git config core.hooksPath .githooks
```

Entries are generated from [Conventional Commits](https://www.conventionalcommits.org) prefixes:

| Commit prefix | Changelog label |
|---|---|
| `feat:` | Added |
| `fix:` | Fixed |
| `perf:` / `refactor:` | Improved |
| `security:` | Security |
| `docs:` | Docs |
| `chore:` / `ci:` / `build:` / `test:` / `style:` | skipped |

**Posting script** converts the pending entries to BBCode and posts them as a reply to your designated vBulletin thread. It handles login, CSRF token extraction, and post submission — no browser required.

```bash
npx tsx scripts/post-to-bimmerpost.ts --dry-run   # preview BBCode without posting
npx tsx scripts/post-to-bimmerpost.ts             # post and update CHANGELOG.md
```

### Setup for your own forum thread

1. Add credentials to `.env.local`:
   ```
   BIMMERPOST_USERNAME=your-forum-username
   BIMMERPOST_PASSWORD=your-forum-password
   ```
2. In `scripts/post-to-bimmerpost.ts`, update the two constants at the top:
   ```ts
   const THREAD_ID = 'your-thread-id';         // from the thread URL (?t=)
   const THREAD_ANCHOR_POST = 'your-post-id';  // any post ID in that thread (?p=)
   ```
   Both values are visible in your browser's address bar when viewing or replying to the thread.

3. Run `--dry-run` first to confirm the BBCode renders as expected.

This works with any standard vBulletin 3.8+ installation. The script uses form-based auth (the same flow as logging in through a browser) since vBulletin 3.x does not expose a public API.

## Testing with Playwright

Cloudflare Turnstile blocks headless browsers by default, so local Playwright runs against a
build that uses [Cloudflare's published test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
instead of the real site/secret pair. These always pass without solving a challenge:

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Never use these in production — see `.env.local.example` for where they go locally. Run
`npx playwright test --list` to see the current test count and names before a run; it changes
as coverage grows, so don't rely on a hardcoded number.

## Moderation: flags, soft delete, and restore

Community members can flag an entry via the 🚩 button, which increments `flag_count`. Admins
review flagged entries at `/admin?token=ADMIN_TOKEN` and can dismiss the flag (resets the
count) or delete the entry.

Deletes are soft: `deleteEntry` sets `deleted_at` rather than removing the row, so the "public
read" RLS policy (`deleted_at is null`) hides it immediately without destroying the data. The
admin page's "Recently deleted" section lists soft-deleted rows (fetched with the service-role
client, which bypasses RLS) and offers a Restore action that clears `deleted_at`.

## Contributing

Community submissions and corrections are welcome. See `SECURITY.md` before getting started — make sure your `.env.local` is in place and that you're not committing any credentials.
