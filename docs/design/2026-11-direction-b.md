# Build spec: Direction B, "The rare tail" (mcolors, 2026-11-17)

**Approved by Chris on 2026-11-17, with the copy-editor's changes.**

- **Mockup:** `docs/design/2026-11-direction-b-mockups.html`. It is the visual target. Open it with `?frame=<id>` to see one frame at its real width.
- **Shots:** not kept in the repo; render the mockup frames to compare.
- **Rules that still apply:** ADR 0016, `docs/design/2026-11-refresh.md` and the Styling section of CLAUDE.md. That means tokens only, the design lint, dark only, nothing under 11px, the paint face for paint names only, and no em dashes.

There are five units, (a) to (e). Each one lands on its own and gets its own issue: labels `web` plus a priority, with (a) first. The units only touch each other where noted.

**Never hard-code a count.** Every count (71 paints, 23 single-build paints, 259 builds, the number a paint is tied with) comes from `computeColorCounts(getEntries())`. The numbers in this document are from the live data on 2026-11-17 and are examples only.

**Phone breakpoint:** `max-width: 720px`, the same as the existing modules. The mockup uses container queries on 390 px frames to stand in for this; the build uses normal media queries.

---

## (a) Tokens and accessibility

**Why:**
- Input, select and chip borders are 1.78 to 1.89:1 against WCAG's 3:1.
- Several controls are under 44 px.
- The spray-card label is text on a gradient with no tested opaque fallback, which breaks rule 6.

**Files**
- `src/styles/tokens.css:23`: after `--rule-strong`, add `--rule-control: #616a78;` and put it in the "Lines (MARK-ONLY)" block. Comment: "Control boundaries: input, select, chip, toggle borders. 3:1 on bg, panel, panel-2."
- `src/lib/design-tokens.ts:14`: add `'rule-control': '#616a78'` to `TOKENS`.
- `src/app/globals.css`:
  - `.chip`:
    - Use `border: 1px solid var(--rule-control)` (it is `--rule-strong` at :254).
    - Add `min-height: 44px`, `display: inline-flex`, `align-items: center` and `padding: 0 var(--s-4)`.
    - Set `white-space: nowrap`.
  - `.input`: use `border: 1px solid var(--rule-control)` (at :289).
  - `.nav-toggle`:
    - Change the size from 36 to 44 px (`width` and `height` at :360-361).
    - Change the border to `--rule-control` (at :364).
  - `.btn`: add `min-height: 44px`.
- `src/app/NavLinks.module.css:26` (`.cta`): add `min-height: 44px`, `display: inline-flex` and `align-items: center`. Also give every desktop nav link `min-height: 44px`.
- **Spray label** (`src/app/colors/[slug]/page.module.css:134`, `:145`, `:160-172`):
  - Delete the `--label` custom property and its `.sprayLight` override.
  - `.sprayLabel` becomes an opaque sticker:
    ```css
    left: 10px; right: auto; max-width: calc(100% - 20px);
    padding: 5px 7px; border-radius: 2px;
    background: var(--ink); color: var(--bg);
    font-weight: 500; letter-spacing: 0.08em; line-height: 1.3;
    box-shadow: var(--shadow-1);
    ```
  - Keep the font, size and uppercase it has today.
  - The sticker is the same for every paint. The `sprayLight` class stays only if something else still uses it.

**Do not**
- Don't use `--rule-control` for dividers or hairlines. Those stay `--rule` and `--rule-strong`.
- Don't put any input, select or chip on `--panel-3`. `--rule-control` is only 2.82:1 there.
- Don't bring back translucent label text.

**Acceptance**
- **Unit (`tests/unit/design-tokens.test.ts`):**
  - The tokens.css and design-tokens.ts values match, which the existing parity test covers.
  - A new test checks `--rule-control` is at least 3:1 on `bg` (3.56), `panel` (3.35) and `panel-2` (3.13).
  - `TEXT_PAIRS` gains `{ text: 'bg', surface: 'ink' }` (16.74:1).
- **Design lint:** passes.
- **e2e (new `tests/e2e/targets.spec.ts`, Chromium and mobile WebKit at 390):**
  - On `/`, `/entries`, `/colors` and `/colors/signal-green-uni`, every visible `a, button, input, select, [role=option]` measures at least 44×44.
  - Exempt: wall strips (`[data-wall-strip]`), and links inside running text in a `<p>`. List both exemptions in the spec file.
- **e2e:** the computed `border-color` of `.input` and `.chip` is `rgb(97, 106, 120)`.
- **axe (`a11y.spec.ts`):** still passes with `KNOWN_ISSUES` empty.
- **Snapshots:** update the `design.spec.ts` baselines on purpose, and look at the new PNGs before committing.

---

## (b) Paint page: tie wording, newest first, charts, phone order

**Files**
- **`src/lib/paint-summary.ts` (whole file, 27 lines).** Keep `rankOf`. Rewrite `paintSummary` and add `rankNote`.

  Definitions:
  - `lead` is `${n === 1 ? '1 build is' : `${n} builds are`} registered in ${color}`.
  - `above` is the paints with a higher count, `below` the paints with a lower count, and `tied` the other paints with the same count.
  - `tiedWith` is the tied paint's name when `tied.length === 1`, otherwise `${tied.length} other paints`.

  Branches, in this order:

  | Case | String |
  |---|---|
  | No paint above, none tied | `${lead}, more than any other paint.` |
  | No paint above, tied | `${lead}, tied with ${tiedWith} for the most.` |
  | No paint below, none tied | `${lead}, fewer than any other paint.` |
  | No paint below, tied | `${lead}, tied with ${tiedWith} for the fewest.` |
  | Otherwise | Let `tie` be `, tied with ${tiedWith}` when there are tied paints, else empty. One paint above: `${lead}${tie}. Only ${above[0].color} has more.` More than one: `${lead}${tie}. ${above.length} paints have more.` |

  `rankNote(counts, color)` returns `null` when the paint is not tied, otherwise `Tied with ${k} other paint${k === 1 ? '' : 's'}`.

- **`src/app/colors/[slug]/page.tsx`:**
  - Builds are newest first: sort `colorEntries` by `posted_at ?? created_at`, descending. Use the same date that `entryDate` shows, before the map at :231.
  - The heading reads `All builds (${n})`. When n ≥ 2, add ` · newest first` (`label` style, `--ink-3`).
  - Charts (:193): change `totalBuilds > 0` to `totalBuilds >= MIN_CHART_BUILDS`, a named constant set to `3`.
  - The rank tile (:180) keeps `#${rank} of ${colorCounts.length}`. When `rankNote` returns a string, add a second `<dd className={styles.tie}>`.
  - Build rows (:261): replace `<FlagButton>` with the shared `<RowActions id>` from unit (d). If (b) lands first, keep `FlagButton` and swap it when (d) lands.
- **`src/app/colors/[slug]/page.module.css`:**
  - Add `.tie`: `font-family: var(--font-mono); font-size: var(--t-12); font-weight: 500; font-stretch: 100%; color: var(--ink-2);`.
  - **Phone order (≤720px): text, then tiles, then the card.**
    - `.page` becomes a flex column. `.hero` gets `display: contents`.
    - Orders: `.heroText` 1, `.tiles` 2, `.cove` 3, then charts and builds 4.
    - Each of `.heroText`, `.tiles` and `.cove` gets the paint wash `color-mix(in srgb, var(--p) 14%, var(--bg))`, with `margin-inline: calc(var(--s-5) * -1)` and `padding-inline: var(--s-5)`. Together they read as one band.
    - The cove keeps its floor glow, layered over the wash.
    - `.tiles` gets a top border, and `.cove` a bottom border, of `color-mix(in srgb, var(--p) 40%, var(--rule))`.
    - The card is `aria-hidden`, so moving it doesn't change reading or focus order.
    - Desktop is unchanged.

**Strings (exact; live examples)**
- "1 build is registered in Signal Green Uni, tied with 22 other paints for the fewest."
- "5 builds are registered in Violet Blue, tied with 7 other paints. 10 paints have more."
- "12 builds are registered in Laguna Seca Blue, tied with Voodoo Blue. 2 paints have more."
- Rank tile notes: "Tied with 22 other paints", "Tied with 1 other paint".

**Acceptance**
- **Unit (`tests/unit/paint-page.test.ts`).** Every row below must pass. These match the mockup's port of the rule.
  - Update the existing expectations at :103 (Voodoo Blue is now tied) and :107 (a sole single build now reads "fewer than any other paint").

  | counts | paint | rank | rankNote | summary |
  |---|---|---|---|---|
  | A26 B17 C12 D12 E7 F5 G5 H5 I1 J1 | A | 1 | null | 26 builds are registered in A, more than any other paint. |
  | same | B | 2 | null | 17 builds are registered in B. Only A has more. |
  | same | C | 3 | Tied with 1 other paint | 12 builds are registered in C, tied with D. 2 paints have more. |
  | same | E | 5 | null | 7 builds are registered in E. 4 paints have more. |
  | same | F | 6 | Tied with 2 other paints | 5 builds are registered in F, tied with 2 other paints. 5 paints have more. |
  | same | I | 9 | Tied with 1 other paint | 1 build is registered in I, tied with J for the fewest. |
  | A26 B17 C17 D3 | B | 2 | Tied with 1 other paint | 17 builds are registered in B, tied with C. Only A has more. |
  | A9 B3 C1 | C | 3 | null | 1 build is registered in C, fewer than any other paint. |
  | A5 B5 D1 | A | 1 | Tied with 1 other paint | 5 builds are registered in A, tied with B for the most. |
  | A5 B5 C5 D1 | A | 1 | Tied with 2 other paints | 5 builds are registered in A, tied with 2 other paints for the most. |
  | A4 B1 C1 D1 | B | 2 | Tied with 2 other paints | 1 build is registered in B, tied with 2 other paints for the fewest. |

- **Unit (existing "every catalog paint" test):** add `--ink-3` on the paint wash at 4.5:1 or more. The worst live case is Chalk at 4.75:1. The tiles' labels now sit on the wash on phones.
- **e2e:**
  - On a 1-build paint page there is no "Builds by model year" heading. A paint with 3 or more builds shows both charts.
  - Build dates on a multi-build page are in descending order.
  - At 390, `.tiles` has a lower `getBoundingClientRect().top` than the spray card.

---

## (c) Home: hero search, all-paints wall, single-build row

**Files**
- **`src/app/page.tsx`:**
  - Lede (:63): "Owners of G80 M3s and G82 M4s in BMW Individual paint list their cars here. Look up your paint to see how many others have it, and add yours if it's missing."
  - Actions (:67-75): remove "View reports". "Submit your build" and "Browse all builds" are both plain `btn`; neither is `btn--primary`.
  - Above the actions, render the new `<PaintLookup paints={colorCounts with slug}>`. It takes `{ color, slug, count, hex }[]`, the data the page already has. There are no new queries.
  - Rarest fact (:97): drop `paint-name`. The value uses a new `.factNumber` class: `font-family: var(--font-text); font-weight: 800; font-stretch: 110%`. This is rule 5: the paint face is for paint names only.
  - Wall (:20, :40): show every paint. Use `sortByHue(colorCounts)` and delete `WALL_SIZE`. `topPaintsByHue` stays only if something else still uses it.
  - After the wall, add a new section. It renders only when there is at least one single-build paint.
    - Heading `<h2 class="label">Paints with a single build</h2>`.
    - Count line: "{n} paints have one build registered so far.", or "1 paint has one build registered so far." when n is 1.
    - A list of single-build paints, sorted by hue. Each item is a link to `/colors/<slug>` containing `PaintSwatch size="chip-sm"` and the name in the paint face.
    - Closing line: "Own one of these, or a paint that isn't listed? " followed by the link "Submit your build →".
    - On phones every name stays visible. The list wraps; it does not scroll sideways.
- **New `src/components/home/PaintLookup.tsx` (client component).**
  - **Shared logic:** pull the filter, active-index and keyboard logic out of `ColorCombobox.tsx` into a hook in `src/components/form/` (the arrow keys already use `combobox-nav.ts`), so both components share it. The submit form's ColorCombobox keeps its free-text behaviour.
  - **Label:** a visible `<label>` reading "Find your paint" (`--t-15`, weight 700, `--ink`).
  - **Input:**
    - 56px tall, left padding 48px, with a search icon at 16px.
    - Background `--panel`, border `--rule-control`.
    - Font size `--t-18` on desktop and `--t-16` on phones. 16px stops iOS zooming in on focus.
    - Placeholder: "Search paints, e.g. Laguna".
    - `role="combobox"`.
  - **Listbox:** every match, sorted by count descending.
    - Each option is 48px tall: swatch chip, name in the paint face at `--t-18` with the matched part underlined (`--ink-3` underline), and the count ("1 build" / "26 builds") in mono `--t-13`, `--ink-2`.
    - Surface `--panel-3`, border `--rule-control`, `max-height: 264px` (5.5 rows, so a cut-off row shows it scrolls), `overflow-y: auto`.
    - The active option has an inset 3px `--focus` bar on the left.
  - **No match:** a `role="status"` panel in the same place reading "No paint called “{query}” is registered yet. Check the spelling, or submit your build →". The link goes to `/submit` and sits on its own line, 44px tall.
  - **Enter:**
    - If an option is highlighted, open it.
    - Otherwise, if there is at least one match, open the first match: an exact name match (ignoring case) if there is one, else the first in the list.
    - With no match, Enter does nothing.
  - **Clicking an option:** opens `/colors/<slug>` via `router.push`.
  - **Escape:** closes the list.
  - **Prefetch:** only on intent, as `IntentLink` does today. There is no prefetch per option.
- **`src/components/home/PaintWall.tsx` and `PaintWall.module.css`:**
  - **Group strips into family runs**, so ticks come from where the strips actually render, not from the count share:
    - The outer `<ul aria-label="All {n} registered paints, sorted by color">` holds one `<li>` per family run.
    - Each run `<li>` has `flex: var(--n) 1 0` (the run's total build count) and `min-width: auto`.
    - Inside it: a strip row (the nested `<ul>`, with each strip `flex: var(--n) 1 0`), then the tick label underneath.
    - The tick is therefore exactly as wide as its run. Delete the `--x` and `--w` positioning and the `familyTicks` start and share maths. Keep the container-query label rules.
    - The lighting `::after` covers the strip row only (`height` = wall height), not the ticks.
  - Strip `min-width`: 6px on desktop, 3px on phones (where the gap is 1px). Today it is 4px (:23) with a 2px gap (:14).
  - Mark each strip `data-wall-strip`. Strips are exempt from the 44px rule; on phones the single-build list is the tap target.
  - Caption (:98): `<b>Hover or tap a strip for its name and build count.</b> All {n} paints, sorted by color.` and `Wider strips have more builds.` On phones, hide the bold sentence.

**Acceptance**
- **Unit (`tests/unit/home-facts.test.ts`):**
  - The wall list has every paint, in hue order.
  - The single-build list is exactly the paints with count 1, in hue order.
  - The count line uses the singular form when n is 1.
- **Unit (the shared combobox hook):** Enter picks the highlighted option, else the exact match, else the first match, else nothing.
- **e2e (`home.spec.ts`):**
  - Typing "green" lists options with counts. Pressing Enter goes to `/colors/british-racing-green`, the first by count. This test depends on live data, so assert "the URL starts with `/colors/`".
  - Typing "zzzz" shows the no-match status with a link to `/submit`.
  - There is no "View reports" link in the hero.
  - The number of wall strips equals the number of paints in the facts or stats.
  - The single-build links all go to `/colors/`.
  - At 390, the h1 is 2 lines or fewer (height ≤ 2 × line-height).
  - Each tick's left edge is within 1px of the left edge of its run's first strip.
- **CLS:** `layout-shift.spec.ts` still passes on `/`.
- **CPU:** measure cold-miss CPU on `/` on a preview build, as the refresh spec requires. The page now serializes up to 71 small paint objects for `PaintLookup`.

---

## (d) /entries: Build Sheet table, phone rows, the ··· action, filters, forum tag

**Files**
- **`src/components/EntryTable.tsx` and `EntryTable.module.css`:**
  - **Filters (:199-245):**
    - Three groups: "Model" (M3, M4, Comp), "Drive" (RWD, AWD) and "Trans" (8AT, 6MT).
    - Group labels use the `label` class. Groups are split by a 1px `--rule` line and `--s-4` padding.
    - Comp moves out of Trans.
    - On phones, all seven chips sit in one sideways-scrolling row (`overflow-x: auto`, no scrollbar), with 1px `--rule-strong` separators between groups.
  - **Table (desktop):**
    - Use the home "Latest builds" style. Take the table rules from `src/app/page.module.css:154-196` and move them into a shared module, so the home table and this one use the same CSS.
    - No cell boxes and no zebra stripes. Rows have a 1px `--rule` bottom line and are 52px tall. The header has a 1px `--rule-strong` bottom line.
    - Headers: mono `--t-11`, tracked, `--ink-3`. The column being sorted is `--ink`. Sort buttons are at least 44×44.
    - Paint cell: chip swatch, then a link in the paint face at `--t-16`, `--ink`, 44px tall.
    - Interior and Location are two-line cells: the main value in `--ink-2` `--t-13`, the detail (seats and leather; country) in `--ink-3` `--t-12`. Don't cut anything off with an ellipsis.
    - Rows highlight `--panel` on hover.
    - Headers keep "Color" and "Forum User".
  - **Forum tag:** show it only when `source_forum !== 'BimmerPost'`. The stored value "Other" displays as "Other forum".
  - **Phone (≤719px, the card view today):** replace `EntryCard` cards with two-line rows.
    - Line 1 is a grid `22px 1fr auto 44px`: the swatch chip; the paint name as a link (paint face `--t-16`, 44px tall, cut off with an ellipsis); the year and model in mono `--t-12` `--ink` (for example "2027 M3 Comp"); and a 44×44 chevron `button` with `aria-expanded`, `aria-controls` and `aria-label="More about this build"`.
    - Line 2 is `drive · trans · wheels · city, state`, falling back to the country. It is `--t-13`, `--ink-2`, one line, cut off with an ellipsis. Indent it 34px.
    - Each row is about 65px. In the mockup, 50 rows measure 3,406px.
    - Expanded: a `dl` with Interior, Location, Forum user and Posted (labels in the `label` style), then the "Edit this build" and "Report a problem" buttons (44px, `--rule-control` border).
  - **Phone sort:** one select with the visible prefix "Sort" (`label` style) and the closed value "Year, newest first". Options: "Year, newest first", "Year, oldest first", "Color, A to Z", "Model", "Drive", "Interior", "Location", "Forum user". These are the existing keys; the direction is part of the year options.
  - **Phone count:** "1–50 of {total}". Desktop keeps "Showing 1–50 of {total} entries".
- **New shared `src/components/RowActions.tsx`:**
  - A 44×44 `button`, `aria-haspopup="menu"`, `aria-label="Edit or report this build"`, showing "···" in `--ink-3`. On hover or when open: `--ink`, a `--rule-control` border and `--panel-2` fill.
  - **Menu:**
    - Surface `--panel-3`, border `--rule-control`.
    - Items are 44px tall: "Edit this build" (a link to `/edit/<id>` with `prefetch={false}`, keeping the reason given in the comment at EntryTable.tsx:383-386) and "Report a problem".
    - Under the items, a hint: "You'll need the forum username on the build to edit it." (`--t-12`, `--ink-2`).
    - Behaviour: Escape closes the menu and returns focus to the button; the arrow keys move between items; clicking outside closes it.
  - **Report a problem:** opens the existing FlagButton flow. Split `FlagButton.tsx` (:157-164 is the trigger) into the dialog and its trigger, so RowActions can open the dialog. Turnstile and the reasons stay as they are.
  - Used on `/entries` and on the paint-page rows from (b), at the end of the row in both places.

**Do not**
- No red flag anywhere in a row.
- Don't prefetch `/edit` (Workers CPU).
- Don't show the forum tag for BimmerPost.

**Acceptance**
- **e2e (`entries.spec.ts`):**
  - Change :23 to expect the Model, Drive and Trans group labels.
  - Comp sits inside the Model group.
  - Each row has exactly one `button[aria-label="Edit or report this build"]`. Its menu has an `/edit/` link and "Report a problem", and "Report a problem" opens the reason picker.
  - No row shows "BimmerPost". Find a non-BimmerPost row through the filter box: Oxford Green II Metallic, user Oxfg.m3, shows "Other forum" (live data).
- **e2e, mobile project:**
  - The rows are visible and there is no card list.
  - A chevron toggles `aria-expanded` and shows Interior.
  - The 50 rows are under 4,000px tall in total.
- **e2e (`submit.spec.ts:98-110`):** replace the `title="Flag this entry as incorrect"` locators with the RowActions button.
- **axe:** clean on `/entries` at both widths, with the menu open and with a row expanded.

---

## (e) /colors on a phone: 2-up grid and compact controls

**Files**
- **`src/components/colors/ColorsBrowser.tsx` and `.module.css`:**
  - **Grid (≤720px):** `grid-template-columns: repeat(2, minmax(0, 1fr))` with a `--s-3` gap. It is `minmax(min(100%, 200px), 1fr)` at :28 today. Tiles stay `PaintSwatch size="tile"`, which is 4:3.
  - **Tile text (phone):** name in the paint face at `--t-15`; the count ("26 builds") and rarity ("Very common") each on their own mono `--t-11` `--ink-3` line, so they never break mid-phrase.
  - **Search:** placeholder "Search paints, e.g. Frozen" at all widths. The "Search by name" label stays. The input is 44px tall.
  - **Sort (phone):** one select, next to the count ("71 paints"). The visible prefix is "Sort" and the closed value is "Most builds". Options: "Most builds", "Rarest", "By color", "Name, A to Z". It writes the same URL hash (`sortHash`) as the chips do.
    - At 720px and wider, keep today's sort chips; desktop wasn't part of this round. Rendering both, with one hidden by CSS, is fine as long as both read and write the same hash state.
    - Rename the chip label "Name" to "Name, A to Z" too, so both controls say the same thing.
  - **Filters (phone):** the family chips, a 1px `--rule-strong` separator, then the finish chips, all in one sideways-scrolling row with no scrollbar and no fade mask (rule 6). They keep `aria-pressed` and are 44px tall, from unit (a).

**Acceptance**
- **e2e (`interactions.spec.ts:15-40`):** on desktop the chip tests keep running, with "Name" now "Name, A to Z". A new mobile test picks "Rarest" in the select, then checks the hash is written and the first tile has 1 build.
- **e2e (mobile):**
  - The first two tiles share the same `top`.
  - The search placeholder matches.
  - All chips sit in one row: same `top`, and the container's `scrollWidth` is greater than its `clientWidth`.
- **axe:** clean at 390.

---

## Copy (final, after the copy-editor pass)

| Where | String |
|---|---|
| Home lede | Owners of G80 M3s and G82 M4s in BMW Individual paint list their cars here. Look up your paint to see how many others have it, and add yours if it's missing. |
| Search label / placeholder | Find your paint / Search paints, e.g. Laguna |
| Option count | 1 build / {n} builds |
| No match | No paint called “{query}” is registered yet. Check the spelling, or submit your build → |
| Hero buttons | Submit your build · Browse all builds |
| Wall caption | Hover or tap a strip for its name and build count. All {n} paints, sorted by color. / Wider strips have more builds. (On phones, the first sentence is hidden.) |
| Wall aria-label | All {n} registered paints, sorted by color |
| Single-build row | Paints with a single build · {n} paints have one build registered so far. (1 paint has one build registered so far.) · Own one of these, or a paint that isn't listed? Submit your build → |
| Paint summary | See (b) |
| Rank note | Tied with {k} other paints / Tied with 1 other paint |
| Build list | All builds ({n}) · newest first |
| Row action | aria-label "Edit or report this build"; items "Edit this build", "Report a problem"; hint "You'll need the forum username on the build to edit it." |
| Entries filters | Model · Drive · Trans |
| Forum tag | Other forum |
| Entries phone | 1–50 of {total} · Sort: Year, newest first (options in (d)) · More about this build · Interior / Location / Forum user / Posted |
| Colors | Search paints, e.g. Frozen · Sort: Most builds (Most builds / Rarest / By color / Name, A to Z) |

## Contrast (computed with WCAG 2.x)

| Pair | Ratio | Needs |
|---|---|---|
| `--rule-control` on bg / panel / panel-2 | 3.56 / 3.35 / 3.13 | 3:1 |
| `--rule-control` on panel-3 (menu and listbox edges only, which are containers) | 2.82 | n/a |
| `--bg` on `--ink` (spray sticker) | 16.74 | 4.5:1 |
| `--ink-3` on `--panel-3` (listbox, menu) | 4.96 | 4.5:1 |
| `--ink-2` on `--panel-3` | 7.04 | 4.5:1 |
| `--ink-3` on the paint wash, worst case (Chalk, wash #27282a) | 4.75 | 4.5:1 |
| `--ink-2` / `--ink` on the paint wash, worst case (Chalk) | 6.75 / 12.69 | 4.5:1 |

## Order and intent check

- **Order:** land (a) first. Units (b) to (e) can land in any order after it. (b) and (d) share `RowActions`, so whichever lands second makes the swap.
- **Intent check:** after each unit, senior-designer re-shoots that unit's frames at 1440 and 390 (WebKit for 390) against `mockups.html`. Then ui-ux-reviewer audits cold and copy-editor checks the final strings in place.
