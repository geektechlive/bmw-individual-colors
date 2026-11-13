# 0016. The site gets a token-based design system: "Build Sheet" for data, lit paint where paint is the point

Status: Accepted · Date: 2026-11-13

## Context

The site's look dates from its first build. An audit on 2026-11-13 found:

- About 400 inline `style={{}}` objects against 12 `className` uses, and dozens of hard-coded hex
  values.
- CSS variables that no component reads, and no type scale.
- Tailwind installed and imported for one loading skeleton, against the project's custom-CSS rule.
- Focus rings removed on form fields, text below the AA contrast minimum, one responsive rule (for
  the nav), no loading states and no reduced-motion handling.
- Every paint drawn as a flat hex dot, though the site is about paint.

Two directions were mocked up with live registry data: A, "Build Sheet" (graphite, wide display
type, mono numbers, specs laid out like a window sticker), and B, "Paint Booth" (showroom lighting,
condensed italic type, paint shown large). A third section mixed the two.

## Decision

The owner chose the mix.

- **A's system runs the site.** Its tokens, type and layout cover every page, because most pages
  are tables, charts and the map.
- **B's lighting appears only where the paint is the point:**
  - paint names, set in B's condensed italic and nothing else;
  - the home page strips;
  - the colors page tiles;
  - the spray-out card on each color page;
  - the home page share image.
- **The site stays dark-only and custom-CSS-only.** Tailwind is removed.
- **Paint is drawn in CSS** from its hex value and a hand-filled finish (solid, metallic, pearl or
  frozen).
- **Color pages take on their paint.** Where the paint is too dark to read, accents use a lightened
  version that reaches 4.5:1 contrast. The swatch keeps the paint's own hex.

The rules, tokens, type roles and page-by-page treatment are in `docs/design/2026-11-refresh.md`.

## Consequences

- The work is fifteen issues (#38 to #52) in four phases. The foundation phase (tokens, removing
  Tailwind, moving inline styles into CSS Modules with a design lint) must land before the
  signature work.
- **Fonts.** Three font families load instead of two. Barlow Condensed is one style used only for
  paint names. All three are self-hosted through `next/font`.
- **Server cost.** Nothing in the design adds per-request server work, because lighting and swatches
  are CSS. The new home page share image follows ADR 0006 and is cached in KV. That needs the KV
  handler extended beyond color pages and a separate swatch that `ImageResponse` can draw.
  Cold-miss CPU is measured on a preview deploy before each phase lands.
- **Paint data.** `colors.ts` gains a `finish` value per paint, filled in by hand. Paints that aren't
  in the catalog get their finish from their name, then default to solid.
- **Review.** A second-model (Codex) review of the spec found that share images can't reuse the
  browser swatch, that the KV cache didn't cover the home image, and gaps in the test and CPU
  plans. The spec was revised for each before this ADR was accepted.
- **Copy.** It is written in plain owner language and reviewed by the copy-editor agent before it
  ships.
- **Revisit** if the design lint or the contrast tests can't hold the rules, or if per-request CPU
  on cache misses rises after a phase lands.

## Evidence

- `docs/design/2026-11-refresh.md`: the spec.
- `docs/design/2026-11-refresh-mockups.html`: the mockups. The "Mix" section is the chosen direction.
- Issues #38 to #52.
- `src/app/globals.css` (the unused variables and the Tailwind import) and
  `src/components/ReportsClient.tsx` (the only Tailwind class use).
