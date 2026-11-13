# Design refresh, November 2026

The owner chose the "Mix" direction on 2026-11-13 ([ADR 0016](../decisions/0016-design-refresh-mix-direction.md)).
The mockups are in [2026-11-refresh-mockups.html](2026-11-refresh-mockups.html). Open the file in a
browser; the "Mix" section is the target. Work is tracked in issues #38 to #52.

## The rule for the mix

Pages are split by what they are for.

- **Pages where people read numbers** (entries, reports, the map, most of the home page) use
  Direction A, "Build Sheet": graphite ground, Archivo for headings and text, JetBrains Mono for
  numbers and labels, specs laid out like a window sticker, and the M stripe as a section divider.
- **Places where the paint is the point** use Direction B, "Paint Booth", lighting: paint names,
  the home page strips, the colors page tiles, the swatch on each color page and the home page
  share image.

## Design rules

These are the load-bearing rules. Everything else in the mockups is a default that can change.

1. **Dark only.** One theme, set explicitly. No `prefers-color-scheme` branch.
2. **Tokens only.** No color literals or font sizes outside the token files, in CSS or in TSX
   inline styles. Tokens are exported to both CSS and TypeScript. Stylelint checks the CSS, and an
   ESLint rule checks color literals and font sizes in TSX `style` objects (#40). Two scoped
   exceptions: paint hex values in `src/lib/colors.ts` (they are data), and the share-image files,
   which must use inline styles (see "Share images").
3. **Text contrast is at least 4.5:1** on the ground it sits on. Each text token notes its ratio.
   Colors that fail are MARK-ONLY: borders, ticks and the M stripe, never text.
4. **Nothing under 11px.**
5. **Paint names use the condensed italic, and nothing else does.** That font always means "this
   is a paint".
6. **A swatch keeps the paint's own hex.** Anything that has to be readable (accent text, bars, the
   rarity pill) uses a version of the paint lightened until it reaches 4.5:1 against the surface it
   actually sits on, not just the page ground. The allowed text-on-surface pairs are listed with
   the tokens, and tests composite any translucent layer before measuring. Text never sits on a
   gradient or a translucent fill without a tested opaque fallback.
7. **Paint is drawn in CSS.** No paint images, no per-request rendering for swatches.
8. **Motion is optional.** Every page is complete with motion off. A global
   `prefers-reduced-motion` rule turns it all off.
9. **Copy is plain.** Say what the page does in the words owners use. No slogan headlines, stacked
   fragments, colon reveals or em dashes. Copy gets a cold review by the copy-editor agent against
   the owner's writing style guide before it ships.

## Type

| Role | Face | Notes |
| --- | --- | --- |
| Headings and text | Archivo (width axis, 400 to 900) | Headings set wide (`font-stretch` 112 to 125%) with tight tracking |
| Numbers and labels | JetBrains Mono (400, 500, 700) | Tabular figures; labels in tracked uppercase |
| Paint names | Barlow Condensed 700 italic | One weight and style only |

All three load through `next/font`, self-hosted and subset. Three families is one more than the
usual limit. The exception is deliberate: Barlow Condensed is a single style used for one job, and
it is what makes a paint name read as a paint name.

## Tokens (starting values from the mockups)

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0b0d10` | Page ground |
| `--panel`, `--panel-2` | `#12151a`, `#181c22` | Raised surfaces |
| `--rule` | `#262b33` | Hairlines (MARK-ONLY) |
| `--ink` | `#eceef1` | Main text, 16.5:1 |
| `--ink-2` | `#a9b0ba` | Secondary text, 8.9:1 |
| `--ink-3` | `#848c97` | Labels and captions, 5.7:1 |
| `--m-blue`, `--m-violet`, `--m-red` | `#1c69d4`, `#6f2da8`, `#e8002d` | M stripe (MARK-ONLY) |
| `--focus` | `#6aa6ff` | Focus ring |
| `--r` | `4px` | The one radius for controls; tiles and frames may use 6 to 8px |

Spacing, the type scale, durations and easings are set in #38.

## Paint swatch

One `PaintSwatch` component (#44) with three sizes: chip (tables, feed, map, pickers), tile (colors
page) and panel (color page). Four finishes:

- **Solid:** gloss with no flake.
- **Metallic:** a wider highlight that darkens toward the lower edge, plus fine flake from an inline
  SVG noise.
- **Pearl:** a slight color shift from one edge to the other.
- **Frozen:** matte. No highlight and no horizon, a soft fade and a faint grain.

Lighting follows car studio photography. Gloss finishes reflect an overhead softbox as a bright
band, then a horizon line where the panel starts reflecting the dark floor. The home page strips
are lit as one surface so the reflection runs across all of them.

The finish comes from a hand-filled `finish` value in `src/lib/colors.ts` first, because many
metallic paints don't say so in their name. Submissions can carry paints that aren't in the
catalog, so for those the finish is read from the name (Frozen, then Pearl, then Metallic), and
only then defaults to solid. This matches how `colors.ts` already guesses a hex for unknown names.
Tests cover every branch.

## Share images

Share images are drawn by `ImageResponse` (Satori), which supports only a subset of CSS: no
stylesheets, no pseudo-elements, no blend modes, and fonts passed in as buffers. So the browser
`PaintSwatch` can't be reused there. #52 adds a separate share-image swatch built from the same
paint data (hex and finish) using only gradients Satori supports, with fonts embedded explicitly.
A PNG snapshot test covers each finish.

The existing KV cache only matches `/colors/<slug>/opengraph-image`. #52 extends it to the home
image with its own key (`og:<deploy>:home:<data_version>`), with the same miss, degraded-render
and redeploy behaviour, and tests for each. As ADR 0006 says, each image normally renders once
per deploy and data version, but concurrent first requests in different regions can each render,
and a killed render stores nothing and runs again.

## Page by page

| Page | Treatment | Issues |
| --- | --- | --- |
| Home | Headline and a three-fact panel, then the lit wall of the 40 paints with the most builds (sorted by hue, sized by builds, family ticks underneath), stats row, latest builds table | #46 |
| Colors | Large lit tiles; sort, filter and search | #47 |
| Color page | Tinted by its paint; spray-out card under a light; spec tag; one-line summary; charts | #45 |
| Entries, reports | A's type and table style; mobile card layout | #40, #42 |
| Map | Dark popups with a swatch chip and a link to the color page | #49 |
| Submit, edit | One shared form with the PaintSwatch color picker | #51 |
| Share images | Home card with the fan of the 12 most-registered paints; color cards with the new swatch. A Satori-safe swatch, cached in KV (ADR 0006) | #52 |

## Order of work

1. **A, foundation:** tokens and fonts (#38), remove Tailwind (#39), CSS Modules and the design
   lint (#40). Everything after depends on these.
2. **B, usability:** accessibility (#41), mobile (#42), loading and empty states (#43). These can
   ship before the new look.
3. **C, signature:** PaintSwatch (#44), color pages (#45), home wall (#46), colors page (#47).
4. **D, polish:** motion and grain (#48), map (#49), site name (#50), shared form (#51), share
   images and cleanup (#52).

Each phase lands on its own. A deploy changes the version id, so the edge cache refills by itself.

## Constraints

- **Workers free plan, 10 ms CPU** ([ADR 0003](../decisions/0003-stay-on-the-workers-free-plan.md)).
  Swatches and lighting are CSS. Fonts are static files. Nothing here adds server work per request.
- **Edge cache** ([ADR 0004](../decisions/0004-edge-cache-keyed-on-data-version.md)). New facts on
  the home page are computed from the same `getEntries()` data during the cached render.
- **Share images** ([ADR 0006](../decisions/0006-social-cards-keep-the-live-count-in-kv.md)) carry
  live counts, so they are cached in KV and never rendered per visit. See "Share images" above.

## How it is checked

- `npm run verify` on every phase, plus the design lint once #40 lands.
- **A design test matrix in Playwright** for the home page, the colors page and color pages, at
  desktop and phone sizes, on Chromium and on an always-on WebKit project. The current `mobile`
  project only runs the nav and edit tests and uses Chromium unless `PLAYWRIGHT_WEBKIT` is set,
  so it doesn't cover this. The matrix covers:
  - all four finishes;
  - a near-black and a near-white paint;
  - the longest paint name;
  - a paint that isn't in the catalog;
  - the home strip at its narrowest width;
  - reduced motion.
- **Snapshots** use asserted baselines (`toHaveScreenshot`), taken after fonts load. Screenshots
  without a baseline don't count.
- **An axe check** (#41) for structure and labels. Axe doesn't judge text on gradients, so the
  contrast pairs are tested in unit tests.
- **Share images** are decoded and snapshot-tested for each finish (#52).
- **Unit tests** for the contrast pairs, the readable paint accent, the finish lookup (catalog,
  name, default), the hue sort, tied ranks and the home page facts.
- **CPU, before landing.** Each phase that changes a server-rendered page is measured on a preview
  deployment before it reaches `main`. That means cold-miss CPU per route (`x-edge-cache: MISS`,
  and `x-og-cache: MISS` for share images) on `/`, `/colors` and one color page, at p95 from
  Workers telemetry. The threshold is no higher than the same routes on the current deploy.
  Production telemetry afterwards is a second check, not the first.
