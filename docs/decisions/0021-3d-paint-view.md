# 0021. The paint page can show the paint in 3D: vanilla three.js, a code-built shape, loaded on intent

Status: Accepted · Date: 2026-11-20

## Context

A paint is only ever a flat CSS swatch on this site. The paint page's spray card fakes depth with a
CSS tilt, but it cannot show how a metallic flake, a pearl's color shift or a clear coat's gloss
behaves as the surface turns, and that is what owners compare when they choose a paint (#96). A
browser prototype tested in desktop Safari and on an iPad showed it can be done in the visitor's
browser, so the Worker's 10 ms CPU limit (ADR 0003) is not involved. three.js is about 700 KB, so the
risk is the opposite one: it must never reach the server bundle or the page load.

## Decision

The owner decided on 2026-11-20:

- **Vanilla three.js**, not React Three Fiber. The viewer (`src/lib/paint-3d/`) has no framework in
  it, so the same module can be reused on other sites.
- **The shape is a paint-shop "speed shape" built in code**: a lofted body with a height field, no
  model file, no license, no real car's lines. It was compared side by side with a public-domain
  (CC0) speed form from Printables and the code-built one won. There is no flat or wavy chip.
- **Interaction:** the card looks exactly as before at rest. A tap lifts it off the page from its
  own rect; mid-flight it becomes the shape, which floats, can be dragged or turned with the arrow
  keys, and is lit by a softbox that follows the pointer. Close (button, Esc, tap outside) reverses
  the flight and lands on the card. Reduced motion gets a short fade and no flight or float.
- **Loaded on intent only, and never in the server bundle:** the 3D view (dialog, canvas, HUD and
  the viewer) is one client component, `PaintViewerStage`, loaded with `next/dynamic` and
  `ssr: false` from the card's island. Hover, focus or pointer-down on the card mounts it; a page
  load fetches no three.js chunk. `viewer.ts` is the only file that imports `three`, the stage is
  the only file that imports `viewer.ts`, and nothing imports the stage except through
  `next/dynamic`. A unit test fails if any of that changes.
- **The paint page's spray card only.** Every other chip already links to the paint page. A
  separate comparison page is deferred until people ask for side-by-side 3D.
- **Fallbacks:** without WebGL, or after a lost context, the view closes (or never opens) and a
  short message says why; the flat card stays usable.

## Consequences

- Owners can judge finish behaviour, not just color. It costs no Worker CPU and no paid product.
- **Why `next/dynamic` with `ssr: false`, not a plain `import()`:** a plain `import()` inside a
  client component still makes the server build emit the chunk. Measured: a 760 KB chunk in the
  Worker's server output, `handler.mjs` 4,951,445 to 5,757,558 bytes (about 227 KiB gzip; the
  upload was 2221 KiB gzip against the Free plan's 3 MiB limit). With `ssr: false` the handler grew
  by 2.8 KB and three.js appears only in a static asset chunk.
- three.js is a pinned runtime dependency (`three`, exact version) plus `@types/three` for
  development. The island adds a client component to a Server Component page.
- Rejected: React Three Fiber (React coupling for no gain here), `model-viewer` (needs a model
  file), Babylon.js (larger), Spline (hosted runtime, vendor), Unreal or a streamed render (needs a
  server and a paid plan), and any downloaded model, including the CC0 Printables form (a file to
  host and an open underside to patch).
- Revisit if the bundle size matters, if three.js needs to be shared with another page (then a
  shared chunk may beat per-page loading), or if a side-by-side Paint Lab page is wanted.

## Evidence

- Issue #96 and its owner decisions.
- `src/lib/paint-3d/` (`material.ts`, `speed-shape.ts`, `flight.ts`, `viewer.ts`) and
  `src/components/PaintViewer.tsx` (the card, loads the stage) and
  `src/components/PaintViewerStage.tsx` (dialog, canvas and HUD; the one importer of the viewer).
- `tests/unit/paint-3d-import-ban.test.ts`, `tests/unit/paint-3d-material.test.ts`,
  `tests/unit/paint-3d-speed-shape.test.ts`, `tests/e2e/paint-3d.spec.ts`.
