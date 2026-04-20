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

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in your own values. See `SECURITY.md` for the full list and where to find each credential. Never commit `.env.local`.

## Commands

```bash
npm run dev        # local dev server (Next.js + Cloudflare Workers shim)
npm run build      # standard Next.js build
npm run build:cf   # Cloudflare Workers production build
npm run lint       # ESLint
```

## Deployment

Pushing to `main` triggers a Cloudflare Pages/Workers build automatically. Run `npm run build:cf` locally before pushing to catch production-build errors that the dev server won't surface.

## Contributing

Community submissions and corrections are welcome. See `SECURITY.md` before getting started — make sure your `.env.local` is in place and that you're not committing any credentials.
