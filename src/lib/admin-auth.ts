/**
 * Wires the pure admin-session module (#32) to env secrets and Next cookies.
 * The single server-side check used by the /admin page and every privileged
 * Server Action: hasAdminSession(). Nothing privileged takes a token argument.
 */
import 'server-only';
import { cookies, headers } from 'next/headers';
import { ADMIN_COOKIE, adminCookieOptions, createAdminSession, verifyAdminSession } from './admin-session';
import { hmacSha256Hex } from './hmac';

function adminSecrets() {
  return {
    sessionSecret: process.env.ADMIN_SESSION_SECRET ?? '',
    adminToken: process.env.ADMIN_TOKEN ?? '',
  };
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export async function hasAdminSession(): Promise<boolean> {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyAdminSession(cookie, nowSeconds(), adminSecrets());
}

export function isAdminLoginConfigured(): boolean {
  const { sessionSecret, adminToken } = adminSecrets();
  return Boolean(sessionSecret && adminToken);
}

export async function startAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, await createAdminSession(nowSeconds(), adminSecrets()), adminCookieOptions());
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: '/' });
}

/**
 * Stable per-reporter key for flag dedupe (#31): an HMAC of the client IP,
 * domain-separated from session signing. The raw IP is never stored.
 */
export async function flagReporterHash(): Promise<string> {
  const h = await headers();
  const ip = h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const secret = adminSecrets().sessionSecret;
  // A known key would make the hash reversible to the IP: refuse instead.
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured.');
  return hmacSha256Hex(secret, `flag-reporter|${ip}`);
}
