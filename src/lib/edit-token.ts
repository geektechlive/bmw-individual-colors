/**
 * Edit-token helpers for the self-service entry editor, plus the admin
 * credential check used by the /admin login.
 *
 * Edit links are signed with EDIT_TOKEN_SECRET (#32). They used to be keyed by
 * ADMIN_TOKEN, so anyone holding the admin token could forge an edit link for
 * any entry. Rotating EDIT_TOKEN_SECRET invalidates outstanding links (they
 * live 1 hour; the owner just re-verifies their forum username).
 *
 * No 'use server' directive: a plain library so Server Components (e.g. the
 * /edit/[id] page) can verify tokens without a Server Action boundary.
 */
import { hmacSha256Hex, timingSafeEqual } from './hmac';

export { timingSafeEqual };

/** How long a generated edit link stays valid. */
export const EDIT_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

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

/** HMAC-SHA256 over `${id}:${username.toLowerCase()}:${expiresAt}`, hex encoded. */
export async function signEditToken(
  secret: string,
  id: string,
  username: string,
  expiresAt: number
): Promise<string> {
  if (!secret) throw new Error('EDIT_TOKEN_SECRET is not configured.');
  return hmacSha256Hex(secret, `${id}:${username.toLowerCase()}:${expiresAt}`);
}

/** Pure check: right secret, right entry/user/expiry, and not yet expired. */
export async function verifyEditTokenWith(
  secret: string,
  token: string,
  id: string,
  username: string,
  expiresAt: number,
  nowMs: number
): Promise<boolean> {
  if (!secret || !token || !Number.isFinite(expiresAt) || expiresAt <= nowMs) return false;
  return timingSafeEqual(token, await signEditToken(secret, id, username, expiresAt));
}

function editTokenSecret(): string {
  return process.env.EDIT_TOKEN_SECRET ?? '';
}

/** Mints an edit token with EDIT_TOKEN_SECRET; throws when it is not configured. */
export function generateEditToken(id: string, username: string, expiresAt: number): Promise<string> {
  return signEditToken(editTokenSecret(), id, username, expiresAt);
}

/** Verifies an edit token against EDIT_TOKEN_SECRET and the current time. */
export function verifyEditToken(
  token: string,
  id: string,
  username: string,
  expiresAt: number
): Promise<boolean> {
  return verifyEditTokenWith(editTokenSecret(), token, id, username, expiresAt, Date.now());
}
