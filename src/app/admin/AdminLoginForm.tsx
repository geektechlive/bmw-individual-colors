'use client';

import { useActionState, useEffect } from 'react';
import { adminLogin } from '../actions';
import styles from './AdminLoginForm.module.css';

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
    <form action={action} className={styles.form}>
      <label htmlFor="admin_token" className="field-label">
        Admin token
      </label>
      <input
        id="admin_token"
        name="admin_token"
        type="password"
        autoComplete="current-password"
        required
        className="input"
      />
      <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="dark" />
      {state.error && (
        <div role="alert" className={styles.error}>
          {state.error}
        </div>
      )}
      <button type="submit" disabled={pending} className={`btn btn--primary ${styles.submit}`}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
