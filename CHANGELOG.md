# BMW Individual Colors Registry — Changelog

Tracks changes to [mcolors.geektechlive.com](https://mcolors.geektechlive.com).  
Run `npx tsx scripts/post-to-bimmerpost.ts --dry-run` to preview a post.  
Run `npx tsx scripts/post-to-bimmerpost.ts` to publish pending items to the forum thread.

---

## [Unreleased]

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
