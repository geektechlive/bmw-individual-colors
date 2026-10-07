/**
 * Edit-token helpers for the self-service entry editor.
 *
 * NOTE: `ADMIN_TOKEN` doubles as the edit-token signing secret. It guards the
 * /admin route AND keys the HMAC used to sign per-entry edit links, so rotating
 * it invalidates every outstanding edit link (which is the desired behaviour).
 *
 * This module deliberately has no 'use server' directive: it is a plain library
 * so Server Components (e.g. the /edit/[id] page) can import the constants and
 * verify tokens without going through a Server Action boundary.
 */

/** How long a generated edit link stays valid. */
export const EDIT_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Constant-time string comparison to prevent timing attacks on token checks. */
export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let diff = aBytes.length ^ bBytes.length;
  const len = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

/**
 * True only for a non-empty token matching a configured ADMIN_TOKEN. Comparing
 * against `process.env.ADMIN_TOKEN ?? ''` directly would accept an empty token
 * whenever the secret is missing (e.g. a misconfigured preview deploy).
 */
export function isAdminToken(token: string | null | undefined): boolean {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret || !token) return false;
  return timingSafeEqual(token, secret);
}

/**
 * HMAC-SHA256 over `${id}:${username.toLowerCase()}:${expiresAt}`, hex encoded.
 * Keyed by ADMIN_TOKEN; throws when that env var is not configured.
 */
export async function generateEditToken(
  id: string,
  username: string,
  expiresAt: number
): Promise<string> {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) throw new Error('ADMIN_TOKEN environment variable is not configured.');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}:${username.toLowerCase()}:${expiresAt}`)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
