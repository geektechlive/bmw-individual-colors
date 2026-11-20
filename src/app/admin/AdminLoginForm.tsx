'use client';

import { useActionState, useEffect } from 'react';
import { adminLogin } from '../actions';
import { useTurnstile } from '../../components/form/useTurnstile';
import styles from './AdminLoginForm.module.css';

/**
 * Admin sign-in (#32). The token is typed here once per 12 h and never put in
 * a URL. Turnstile is required on every attempt; a failed attempt consumed the
 * token, so the widget is reset for the next try.
 */
export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, {});
  const { containerRef: turnstileRef, reset: resetTurnstile } = useTurnstile();

  useEffect(() => {
    if (state.error) resetTurnstile();
  }, [state, resetTurnstile]);

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
      <div className="cf-turnstile" ref={turnstileRef} />
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
