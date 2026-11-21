import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORUM_THREADS, markPosted, postLink, readPending } from '../../scripts/lib/forum-post';

// #100: changelog updates go to both registry threads, and recording them must not disturb
// older sections.

const CHANGELOG = [
  '# Changelog',
  '',
  '---',
  '',
  '## [Unreleased]',
  '',
  '- **Fixed:** new thing (#99)',
  '',
  '- **Added:** other thing (#98)',
  '',
  '## [2026-11-20] https://g80.bimmerpost.com/forums/showpost.php?p=1 (posted by hand)',
  '',
  '- **Added:** old thing (#96)',
  '',
  '---',
  '',
  '## [2026-09-01] older',
  '',
  '- something',
  '',
].join('\n');

test('both registry threads are configured, each with a reply anchor', () => {
  assert.deepEqual(FORUM_THREADS.map((t) => t.id), ['2237372', '2229924']);
  for (const t of FORUM_THREADS) assert.match(t.anchorPost, /^\d+$/);
});

test('readPending returns only the [Unreleased] entries', () => {
  assert.equal(readPending(CHANGELOG), '- **Fixed:** new thing (#99)\n\n- **Added:** other thing (#98)');
  assert.equal(readPending(CHANGELOG.replace(/- \*\*Fixed[\s\S]*?\(#98\)\n/, '')), '');
});

test('postLink turns a redirect URL into a showpost link', () => {
  assert.equal(
    postLink('https://g80.bimmerpost.com/forums/showthread.php?p=33078404#post33078404'),
    'https://g80.bimmerpost.com/forums/showpost.php?p=33078404',
  );
  assert.equal(postLink('https://g80.bimmerpost.com/forums/showthread.php?t=2229924'), 'https://g80.bimmerpost.com/forums/showthread.php?t=2229924');
});

test('markPosted puts a dated heading with every thread link under [Unreleased] and leaves history alone', () => {
  const out = markPosted(CHANGELOG, '2026-11-21', [
    { threadId: '2237372', url: 'https://g80.bimmerpost.com/forums/showpost.php?p=10' },
    { threadId: '2229924', url: 'https://g80.bimmerpost.com/forums/showpost.php?p=11' },
  ]);
  assert.equal(readPending(out), '');
  assert.ok(
    out.includes(
      '## [Unreleased]\n\n## [2026-11-21] https://g80.bimmerpost.com/forums/showpost.php?p=10 (thread 2237372); https://g80.bimmerpost.com/forums/showpost.php?p=11 (thread 2229924)\n\n- **Fixed:** new thing (#99)\n\n- **Added:** other thing (#98)\n\n## [2026-11-20]',
    ),
    out,
  );
  // Everything from the previous dated section on is byte-for-byte unchanged.
  const tail = CHANGELOG.slice(CHANGELOG.indexOf('## [2026-11-20]'));
  assert.ok(out.endsWith(tail));
});

test('markPosted notes a thread that failed, and refuses when nothing is pending', () => {
  const out = markPosted(CHANGELOG, '2026-11-21', [
    { threadId: '2237372', url: 'https://g80.bimmerpost.com/forums/showpost.php?p=10' },
  ], ['2229924']);
  assert.ok(out.includes('(thread 2237372); NOT posted to thread 2229924\n'), out);
  const empty = CHANGELOG.replace(/- \*\*Fixed[\s\S]*?\(#98\)\n/, '');
  assert.throws(() => markPosted(empty, '2026-11-21', []), /nothing pending/);
});
