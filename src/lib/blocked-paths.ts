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

export function isBlockedPath(rawPath: string): boolean {
  const path = rawPath.toLowerCase();
  return (
    hasDotSegment(path) ||
    path.endsWith('.php') ||
    BLOCKED_SUBSTRINGS.some((p) => path.includes(p))
  );
}
