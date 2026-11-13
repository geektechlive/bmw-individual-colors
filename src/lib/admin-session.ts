/**
 * Admin session cookie (#32). Replaces `/admin?token=…`, which put the admin
 * credential in URLs, history and hidden form fields.
 *
 * Cookie value: `v1.<expEpochSeconds>.<hmac>`, where
 *   hmac = HMAC-SHA256(ADMIN_SESSION_SECRET, `admin|<exp>|sha256(ADMIN_TOKEN)`).
 * Binding the signature to the current ADMIN_TOKEN means rotating the admin
 * credential revokes every live session too, not just future logins.
 *
 * Pure (secrets and clock injected), so it is unit-testable in Node.
 * src/lib/admin-auth.ts wires it to env vars and next/headers.
 */
import { hmacSha256Hex, sha256Hex, timingSafeEqual } from './hmac';

export const ADMIN_COOKIE = 'mc_admin';
export const ADMIN_SESSION_TTL_S = 12 * 60 * 60;

export interface AdminSecrets {
  sessionSecret: string;
  adminToken: string;
}

async function signature(exp: number, secrets: AdminSecrets): Promise<string> {
  return hmacSha256Hex(secrets.sessionSecret, `admin|${exp}|${await sha256Hex(secrets.adminToken)}`);
}

export async function createAdminSession(nowS: number, secrets: AdminSecrets): Promise<string> {
  if (!secrets.sessionSecret || !secrets.adminToken) {
    throw new Error('ADMIN_SESSION_SECRET and ADMIN_TOKEN must both be configured.');
  }
  const exp = nowS + ADMIN_SESSION_TTL_S;
  return `v1.${exp}.${await signature(exp, secrets)}`;
}

export async function verifyAdminSession(
  cookie: string | undefined,
  nowS: number,
  secrets: AdminSecrets
): Promise<boolean> {
  if (!cookie || !secrets.sessionSecret || !secrets.adminToken) return false;
  const match = /^v1\.(\d{1,12})\.([0-9a-f]{64})$/.exec(cookie);
  if (!match) return false;
  const exp = Number(match[1]);
  if (!Number.isSafeInteger(exp) || exp <= nowS) return false;
  return timingSafeEqual(match[2], await signature(exp, secrets));
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: ADMIN_SESSION_TTL_S,
  };
}
