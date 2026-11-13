'use client';

import { useActionState, useEffect } from 'react';
import { adminLogin } from '../actions';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '0x4AAAAAAC6yXfM_xBBaAkKj';

type TurnstileApi = { reset: (target: string) => void };

/**
 * Admin sign-in (#32). The token is typed here once per 12 h and never put in
 * a URL. Turnstile is required on every attempt; a failed attempt consumed the
 * token, so the widget is reset for the next try.
 */
export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, {});

  useEffect(() => {
    const turnstile = (window as Window & { turnstile?: TurnstileApi }).turnstile;
    if (state.error && turnstile) turnstile.reset('.cf-turnstile');
  }, [state]);

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
      <label htmlFor="admin_token" style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 600 }}>
        Admin token
      </label>
      <input
        id="admin_token"
        name="admin_token"
        type="password"
        autoComplete="current-password"
        required
        style={{
          padding: '10px 12px',
          background: '#0f1923',
          color: '#e2e8f0',
          border: '1px solid #2d3f55',
          borderRadius: 8,
          fontSize: 14,
        }}
      />
      <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="dark" />
      {state.error && (
        <div role="alert" style={{ color: '#fca5a5', fontSize: 13 }}>
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        style={{
          padding: '10px 16px',
          background: '#1C69D4',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          cursor: pending ? 'not-allowed' : 'pointer',
          opacity: pending ? 0.6 : 1,
          alignSelf: 'flex-start',
        }}
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
