# 0019. Paint names follow BMW, from a cited source

Status: Accepted · Date: 2026-11-20

## Context

Paint names came from forum spelling. One BMW paint could be stored under two names (Fire Orange and Fire Orange III, #91; Tanzanite Blue and Tanzanite Blue II), and some names are not BMW's at all. Of the 72 paint names with builds on 2026-11-20, about 30 differed from BMW's own name. BMW publishes its Individual paint list (code, English name, models) behind its public colors page, and its archived visualizer pages still name paints it has dropped.

## Decision

The paint CODE is the identity; the display name follows BMW. The owner decided this on 2026-11-20. Sources, in order:

1. The BMW Individual paint list (https://individual.bmw-m.com/en-US/colors).
2. BMW's archived visualizer pages (Wayback Machine), for paints BMW has dropped.
3. A BMW US document, where it differs from the visualizer. C3Z is "Tanzanite Blue II Metallic" (BMW NA Ordering Guide, M3 (G80) MY2022), not the visualizer's "Tansanit".
4. Otherwise the name stays as owners typed it and is marked unverified, with whatever citation exists.

Display name rule: BMW's English name with the prefixes "BMW Individual " and "M " removed and a trailing " Uni" removed ("Uni" only means solid). Two paints BMW lists in German only use the German string. São Paulo Yellow (C4H) keeps its accent (slug `sao-paulo-yellow`, #75).

Owner rulings on the unclear names:

- Marina Bay Blue becomes "Marina Bay Blue Metallic" (C1K, the metallic, not Frozen P5T).
- Malachite Green becomes "Malachite Green Metallic", unverified by code: BMW lists P85 and S10 and which one a build has is unknown.
- Mexico Blue stays "Mexico Blue", unverified, with the note that it is reported renamed by BMW to Daytona Beach Blue (a paint-code site, not BMW). It is not merged.
- Atlantis Blue Metallic, Verde Ermes, Frozen Orange II, Snapper Rocks Blue and Sunset Orange stay as typed and unverified, each with what was or was not found.
- Merges: Tanzanite Blue and Tanzanite Blue II into Tanzanite Blue II Metallic; Santorini Blue and Santorini Blue II into Santorin Blue II (BMW's spelling); Dakar Yellow into Dakar Yellow II; Fire Orange into Fire Orange III.

The catalog (`BMW_COLORS`) is every paint in the BMW snapshot, the archived paints, and the unverified names that have builds. Names with no builds and no BMW source leave it. Old names with builds become aliases: reads merge them (`canonicalColorName`), writes snap them, and the database is not rewritten. Every paint page shows a source line. Old URLs answer a 308 from the Worker.

## Consequences

- Reads and writes agree on one name per paint, and each page says where its name comes from.
- Rows keep their old `ext_color` text. Any database filter on a paint must match every spelling (`paintNameSpellings`); the submit duplicate check does.
- Old `/colors/<slug>` URLs of renamed paints redirect with a 308 before the Next server loads (closes #89). The redirect table is generated and import-free, to fit the 10 ms CPU limit (ADR 0003). Old names that were catalog-only (no builds) and left the catalog now answer 404, apart from a few with the same BMW code.
- "Verde British Racing" is a separate BMW paint (P6E), so it is no longer an alias of British Racing Green. Builds saved under that alias before this change stay under British Racing Green; they cannot be told apart without the owners.
- Hex: the catalog's existing value where a paint was already listed, else BMW's. Archived paints have no BMW hex, so theirs are approximations. Two near-white paints use a slightly darker display hex so labels keep 4.5:1 contrast on the paint wash.
- Revisit when BMW publishes another paint list (re-run the two scripts in `scripts/`), when an owner supplies the code for Malachite Green or a BMW source for an unverified name, or when the 308 table grows large enough to cost Worker CPU.

## Evidence

- `data/bmw-individual-paints-2026-11-20.json`: the trimmed BMW snapshot and archived pages; `data/paint-rulings.json`: the rulings above.
- `scripts/trim-bmw-snapshot.ts` and `scripts/gen-paint-reference.ts`, which generate `src/lib/paint-reference.ts` and `src/lib/paint-redirects.ts`.
- `tests/unit/paint-reference.test.ts`, `tests/unit/legacy-slugs.test.ts`, `tests/unit/paint-source.test.ts`.
- Issues #93, #89, #91, #75.

## Addendum 2026-11-21: frozen paints use BMW's hex (#98)

The "existing hex wins" rule kept a wrong value for frozen paints. The old catalog drew a frozen paint as a paler version of its base colour, so Frozen Preciosa Red Metallic (P9C) showed as salmon pink (`#c87272`) where BMW gives a deep wine red (`#622129`), and an owner of that paint said the 3D view (ADR 0021) looked nothing like the car. Frozen paint is satin, not pastel. Frozen paints now take BMW's hex (the contrast overrides still win), and `guessColorFromName` no longer lightens a typed frozen name. Six paints changed, two of them a lot (P9C, and C5A Frozen Pure Grey `#8a8a8a` to `#606463`). The other 31 non-frozen paints whose old hex differs a lot from BMW's need a ruling per paint, because some of BMW's swatches look wrong too; that is #99. The decision above stands for them until then.
