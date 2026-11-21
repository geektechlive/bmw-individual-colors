// Pure helpers for scripts/post-to-bimmerpost.ts (#100): which threads get each update, and how
// CHANGELOG.md records the posts. No I/O, so the changelog rewrite is unit-tested.

export interface ForumThread {
  id: string;
  /** A post in the thread; vBulletin's reply form is fetched through it. */
  anchorPost: string;
  name: string;
}

/** Every changelog update goes to both registry threads, in this order. */
export const FORUM_THREADS: readonly ForumThread[] = [
  { id: '2237372', anchorPost: '32758986', name: 'M-Color Individual Registry Site' },
  { id: '2229924', anchorPost: '33076941', name: 'MY27 G8X Individual Registry' },
];

export interface PostedThread {
  threadId: string;
  url: string;
}

const UNRELEASED = /## \[Unreleased\][^\n]*\n([\s\S]*?)(?=\n## |\n---|$)/;

/** The entries under [Unreleased], up to the next heading or separator. */
export function readPending(changelog: string): string {
  return changelog.match(UNRELEASED)?.[1].trim() ?? '';
}

/** vBulletin redirects to showthread.php?p=N#postN; the changelog keeps showpost.php?p=N. */
export function postLink(url: string): string {
  const p = url.match(/[?&]p=(\d+)/)?.[1];
  return p ? `https://g80.bimmerpost.com/forums/showpost.php?p=${p}` : url;
}

/**
 * Moves the pending entries under a new dated heading that links every post, leaving
 * [Unreleased] empty and every older section untouched. `failed` names threads the update
 * did not reach, so a partial post is visible in the record.
 */
export function markPosted(
  changelog: string,
  date: string,
  posted: readonly PostedThread[],
  failed: readonly string[] = [],
): string {
  const pending = readPending(changelog);
  if (!pending) throw new Error('markPosted: nothing pending under [Unreleased]');
  const links = [
    ...posted.map((p) => `${p.url} (thread ${p.threadId})`),
    ...failed.map((id) => `NOT posted to thread ${id}`),
  ].join('; ');
  return changelog.replace(UNRELEASED, `## [Unreleased]\n\n## [${date}] ${links}\n\n${pending}\n`);
}
