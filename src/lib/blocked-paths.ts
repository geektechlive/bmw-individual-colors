const BLOCKED_SUBSTRINGS = [
  'wp-includes',
  'wp-admin',
  'wp-content',
  'xmlrpc.php',
  '_ignition',
  'wp-json',
  'phpinfo',
];

// Bot probes hunt for dotfiles anywhere in the tree (/app/.env, /cms/.git/config,
// /.npmrc). Answering them in middleware is nearly free; letting them fall
// through to a rendered 404 loads the whole Next server and costs ~400 ms of
// Worker CPU. `.well-known` is the one legitimate dot-segment.
function hasDotSegment(path: string): boolean {
  return path
    .split('/')
    .some((segment) => segment.startsWith('.') && segment !== '.well-known');
}

// Decoded first, so /%2eenv cannot slip past as an unknown path and render a
// Next 404 (#25). Malformed encoding is never a real page: block it.
function decodePath(rawPath: string): string | null {
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return null;
  }
}

export function isBlockedPath(rawPath: string): boolean {
  const decoded = decodePath(rawPath);
  if (decoded === null) return true;
  const path = decoded.toLowerCase();
  return (
    hasDotSegment(path) ||
    path.endsWith('.php') ||
    BLOCKED_SUBSTRINGS.some((p) => path.includes(p))
  );
}

/**
 * True for /_next/static/* requests. Workers Static Assets answer every file
 * that exists before the Worker runs, so one that reaches the Worker is a
 * missing file (old build chunk, scanner) and gets a plain 404 instead of a
 * rendered Next 404 (#25). Runtime endpoints like /_next/image are untouched.
 */
export function isMissingStaticAsset(path: string): boolean {
  return path.startsWith('/_next/static/');
}
