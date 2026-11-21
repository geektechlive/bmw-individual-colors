# BMW Individual Colors Registry — Changelog

Tracks changes to [mcolors.geektechlive.com](https://mcolors.geektechlive.com).  
Run `npx tsx scripts/post-to-bimmerpost.ts --dry-run` to preview a post.  
Run `npx tsx scripts/post-to-bimmerpost.ts` to publish pending items to the forum thread.

---

## [Unreleased]

- **Fixed:** frozen paints draw in their real colour; Frozen Preciosa Red is wine red, not pink (#98)

- **Fixed:** unknown paint pages answer a real 404 (#94)

## [2026-11-20] https://g80.bimmerpost.com/forums/showpost.php?p=33078081 (posted by hand; also in thread 2229924 as p=33078082)

- **Fixed:** the paint card turns into the speed shape slowly enough to watch, on any screen (#97)

- **Added:** tap the paint card to see the paint in 3D on a speed shape (#96)

## [2026-11-20] https://g80.bimmerpost.com/forums/showpost.php?p=33077333 (posted by hand; also in thread 2229924 as p=33076941)

- **Added:** paint names follow BMW, with the source on every paint page (#93)

- **Improved:** first visits reuse a page rendered anywhere, not just at their data center (#21)

- **Fixed:** Fire Orange builds all show on the Fire Orange III page (#91)

- **Fixed:** submit and edit forms work after an in-app link (#90)

## [2026-11-18] https://g80.bimmerpost.com/forums/showpost.php?p=33075064 (posted by hand)

- **Fixed:** São Paulo Yellow's page is /colors/sao-paulo-yellow, the old link still works (#75)

- **Fixed:** the Comp filter is a simple on/off chip (#77)

- **Fixed:** nav lists Colors before Reports (#74)

- **Fixed:** frozen paint tiles get a soft falloff and visible grain (#73)

- **Fixed:** the map opens on the registry's builds, so phones start on the US (#72)

- **Added:** reports keeps five charts, growth chart on a true time axis (#71)

- **Fixed:** paint page rows show a labelled Edit or report button on phones (#86)

- **Fixed:** Tab out of the row menu returns focus to the trigger (#84)

- **Fixed:** home Latest builds fits a phone as two-line rows (#85)

- **Fixed:** nav marks Colors and Entries current on their sub-pages (#80)

- **Fixed:** build table rows are 52 px, not 65 (#78)

- **Fixed:** phone filter, search and sort controls are 16 px so iOS does not zoom (#81)

- **Fixed:** the M stripe no longer collapses to 0 px on long pages (#79)

- **Fixed:** home search announces how many paints match (#83)

- **Fixed:** home search highlights the first match as the list opens (#88)

- **Fixed:** wall read-out is a 44 px link to the tapped paint (#87)

- **Fixed:** skip link and one tab stop for the paint wall (#82)

- **Added:** colors on a phone, 2-up grid and compact controls (#70)

- **Added:** home paint search, every paint on the wall, single-build row (#68)

- **Added:** entries as a Build Sheet table, two-line phone rows, one quiet row action (#69)

- **Added:** paint pages show ties, newest builds first, phone stats above the card (#67)

- **Added:** control borders, 44 px targets, opaque spray-card sticker (#66)

- **Fixed:** the entries page has one loading state, so the footer can't jump (#63)

- **Improved:** sweeping the mouse across the paint wall doesn't preload every strip (#62)

- **Fixed:** pages no longer jump when they finish loading (#63)

- **Improved:** paint pages load in the background only when you point at them (#62)

- **Improved:** browsers keep the site's scripts and styles instead of re-checking them (#61)

- **Improved:** submit and edit forms no longer download every city on Earth (#60)

- **Docs:** ADR 0018, stay on Supabase rather than Cloudflare D1

## [2026-11-14] https://g80.bimmerpost.com/forums/showpost.php?p=33067899 (posted by hand)

- **Added:** log why a submission or edit is turned away (#59)

- **Added:** share image leads with the hook, legible at chat sizes (#52)

- **Added:** share image for links to the site, in the new design (#52)

- **Fixed:** share-image cache no longer wiped by every deploy (#52, ADR 0006 addendum)

- **Added:** one site name, look-alike paint names, form fixes, motion, grain and polish

- **Fixed:** accessibility issues found by axe, and reduced motion in Safari (#41)

- **Fixed:** map tiles use a CARTO basemaps key, so the world map is back (#54)

- **Fixed:** version reads are per request, so a cancelled prefetch can't 500 the others

- **Added:** entries as cards on phones, chart headings and summaries, loading states (#41, #42, #43)

- **Added:** dark map popups with a swatch and a link to the paint (#49)

- **Added:** one shared submit/edit form; duplicates are a hard stop (#51, ADR 0017)

- **Fixed:** paint names like "constructor" no longer resolve to JavaScript built-ins

- **Added:** rarity labels from the approved mockups (Very common, Common, Uncommon, Rare)

- **Added:** colors page with lit tiles, sort, filter and search (#47)

- **Added:** home page paint wall, facts panel and latest builds (#46)

- **Added:** hue sort for paint walls and the colors page (#46, #47)

- **Added:** color pages tinted by their paint, with a spray-out card (#45)

- **Added:** PaintSwatch with solid, metallic, pearl and frozen finishes (#44)

- **Improved:** CSS Modules on tokens, Tailwind removed, design lint (#39, #40)

- **Added:** design tokens, three self-hosted fonts and tested contrast pairs (#38)

- **Docs:** design refresh spec, mockups and ADR 0016 (mix direction)

- **Fixed:** old alias color URLs redirect to the canonical color page

- **Added:** Miami Blue in the color list; aliases stored under one name; clear duplicate-edit message (Phase 4)

- **Docs:** adopt public ADRs and backfill 15 decisions; README/SECURITY match the code

- **Added:** flag reasons and admin sign-in (Phase 3)

- **Fixed:** upgrade Next 16.4.6, React 19.3.1, OpenNext 1.20.17, wrangler 4.161

- **Improved:** cut Worker CPU overruns on the free plan (HEAD fill, OG KV cache, static assets)

- **Fixed:** don't prefetch per-row edit links

- **Fixed:** never edge-cache a render whose data read failed

- **Added:** edge-cache pages until the registry data changes

- **Fixed:** never accept an empty token when ADMIN_TOKEN is unset

- **Fixed:** 403 dotfile and wp-* bot probes before the Next server loads

- **Fixed:** keep country-state-city out of the server bundle

### Registry Update — September 2026

**What's new**

- **Works on your phone now** -- The nav collapses into a menu on small screens and the stat tiles and forms reflow instead of clipping.
- **Entries table is paginated** -- 50 builds per page, sortable from the keyboard, with a labeled filter box. The page loads a lot lighter.
- **Every color has a shareable page** -- Posting a link like mcolors.geektechlive.com/colors/twilight-purple now shows a proper preview card with the swatch and build count. Custom color names get a page too instead of a 404.
- **Search engines can find the registry** -- Added a sitemap and robots file so color pages get indexed.
- **You can undo a delete** -- Deleting your entry hides it instead of destroying it. If you removed the wrong build, ping the thread and it can be restored.
- **Cleaner data going in** -- Submissions are checked and normalized server-side: transmission is always 8AT or 6MT, countries and wheel names snap to one spelling, and color names snap to the official BMW Individual name when they match. Alias names (Enzian Blue / Gentian Blue) are merged in the counts.
- **Existing data cleaned up** -- 67 imported rows fixed: 8 "Automatic" transmissions, 32 "USA" countries, 24 wheel spellings, one misfiled location. Two suspicious rows were flagged for review rather than deleted.

**Fixed**

- **"Submit Anyway" no longer dead-ends** -- If the duplicate warning appeared, the bot check token had already been used and the form could not be submitted again without a reload. It resets itself now.
- **Delete button was broken for everyone** -- The "Yes, delete it" button was inside a nested form, which browsers silently discard. It never fired. Fixed.
- **Delete failures no longer show a false success** -- A failed delete used to redirect to a "deleted" message while the entry was still live.
- **Edit links are verified before the form opens** -- The edit page checked only that a token was present, not that it was valid.
- **Edit sessions expire after 1 hour** -- If you come back later you will be asked to verify your username again.
- **Edit history is tracked** -- Entries show "Edited X times · last updated [date]" on the edit form.
- **Flagging requires bot verification** -- The flag button had no protection and could flood the review queue. If a flag fails you now see a retry message instead of a false "Flagged".
- **Registry stats could not silently drop rows** -- Reads now page through the database, so the counts stay right past 1,000 builds.
- **Map popups escape text** -- Color and location text in popups was not HTML-escaped.
- **Country no longer silently resets to United States on edit** -- Unrecognized stored country names show a warning and ask you to pick the right one.
- **Concurrent duplicate submissions blocked at the database** -- Two identical builds submitted at the same instant can no longer both slip through.
- **Security hardening** -- Constant-time token comparisons, request logging turned on for the site so errors are visible, tighter blocking of bot probes.

---
