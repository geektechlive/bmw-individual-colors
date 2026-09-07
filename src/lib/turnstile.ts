/**
 * Cloudflare Turnstile server-side verification.
 *
 * Keyed by TURNSTILE_SECRET_KEY. Every failure mode (missing token, network
 * error, non-2xx response, malformed body) resolves to `false` so callers only
 * have to handle a boolean.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      console.error('Turnstile verification failed: HTTP', res.status, res.statusText);
      return false;
    }

    const json = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!json.success) {
      console.error('Turnstile verification rejected:', json['error-codes'] ?? 'no error codes');
    }
    return Boolean(json.success);
  } catch (e) {
    console.error('Turnstile verification error:', e);
    return false;
  }
}
