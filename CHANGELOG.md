# BMW Individual Colors Registry — Changelog

Tracks changes to [mcolors.geektechlive.com](https://mcolors.geektechlive.com).  
Run `npx tsx scripts/post-to-bimmerpost.ts --dry-run` to preview a post.  
Run `npx tsx scripts/post-to-bimmerpost.ts` to publish pending items to the forum thread.

---

## [Unreleased]

- **Fixed:** harden entry edit/delete/flag flows

- **Added:** add changelog automation and forum posting script

- **Added:** block .env and additional credential probes in middleware

- **Added:** block bot probe paths in middleware

### Registry Update — Bug Fixes & Security Improvements (May 2026)

1. **Delete button was broken for everyone** -- The "Yes, delete it" confirmation button was inside a nested HTML form, which browsers silently discard. The delete action was never firing. Fixed.
2. **Delete failures no longer show a false success** -- If a delete failed server-side, the page would redirect to a "deleted" success message while the entry was still live. Fixed to surface the error.
3. **Edit sessions now expire after 1 hour** -- Edit/delete tokens were permanent once generated. They now expire after 60 minutes. If you start editing and come back later, you will be asked to verify again.
4. **Edit history is now tracked** -- Each time an entry is edited, it records the edit count and last-updated date. You will see "Edited X times · last updated [date]" on the edit form.
5. **Map popup XSS hardened** -- Color names and location data in map popups were not HTML-escaped. A crafted entry could have injected script into other users' browsers. Fixed.
6. **Flagging an entry now requires bot verification** -- The flag button had no protection and could be abused to flood the admin queue. A Turnstile challenge is now required before a flag is submitted.
7. **Duplicate warning no longer bypassable** -- When the duplicate warning appeared during submission, the main Submit Build button was still active and could circumvent the check. Fixed.
8. **Country field no longer silently corrupts on edit** -- If a stored country name did not exactly match the dropdown library's format, it silently defaulted to United States on save. Now shows a warning and requires you to confirm the correct country.
9. **Concurrent duplicate submissions blocked at DB level** -- A unique constraint was added so two identical builds submitted simultaneously can no longer both slip through.
10. **Security hardening** -- Token comparisons are now constant-time. Map coordinate filtering fixed for the 0,0 edge case.

---
