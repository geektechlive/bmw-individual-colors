'use client';

import { useActionState, useEffect, useState } from 'react';
import { verifyForumUsername } from '../../actions';
import FormError from '../../../components/form/FormError';
import { fieldErrorProps } from '../../../components/form/field-error';
import styles from './EditVerifyForm.module.css';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '0x4AAAAAAC6yXfM_xBBaAkKj';

// Cloudflare Turnstile attaches callbacks and the widget API to window.
interface TurnstileWindow {
  __tsSuccess?: () => void;
  __tsExpired?: () => void;
  __tsError?: () => void;
  turnstile?: { reset: (selector: string) => void };
}

interface Props {
  entryId: string;
}

export default function EditVerifyForm({ entryId }: Props) {
  const [state, action, isPending] = useActionState(verifyForumUsername, {});
  const [turnstileDone, setTurnstileDone] = useState(false);

  // Register global Turnstile callbacks once on mount
  useEffect(() => {
    (window as Window & TurnstileWindow).__tsSuccess = () => setTurnstileDone(true);
    (window as Window & TurnstileWindow).__tsExpired = () => setTurnstileDone(false);
    (window as Window & TurnstileWindow).__tsError = () => setTurnstileDone(false);
  }, []);

  // Reset the widget whenever the server returns an error so the user can retry.
  // setTurnstileDone(false) here is intentional — we're responding to an external
  // state change (server error) and there's no dependency cycle risk.
  useEffect(() => {
    if (state?.error && (window as Window & TurnstileWindow).turnstile) {
      (window as Window & TurnstileWindow).turnstile!.reset('.cf-turnstile');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTurnstileDone(false);
    }
  }, [state?.error]);

  const canSubmit = !isPending && turnstileDone;

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="id" value={entryId} />

      <div>
        <p className={`muted ${styles.intro}`}>
          To edit this entry, enter the forum username associated with it. This confirms you submitted the original entry.
        </p>
      </div>

      <FormError message={state?.error} />

      <div className="field">
        <label className="field-label" htmlFor="forum_username">Forum Username *</label>
        <input
          type="text"
          id="forum_username"
          name="forum_username"
          className="input"
          placeholder="Your forum username on this entry"
          required
          autoComplete="off"
          {...fieldErrorProps('forum_username', state?.error?.startsWith('Username') ? 'forum_username' : null)}
        />
      </div>

      <div
        className="cf-turnstile"
        data-sitekey={TURNSTILE_SITE_KEY}
        data-theme="dark"
        data-callback="__tsSuccess"
        data-expired-callback="__tsExpired"
        data-error-callback="__tsError"
      />

      <button
        type="submit"
        disabled={!canSubmit}
        className={`btn btn--primary ${styles.submit}`}
      >
        {isPending ? 'Verifying...' : 'Verify & Edit'}
      </button>
      {!turnstileDone && !isPending && (
        <p className={`field-hint ${styles.hint}`}>
          Complete the security check above to continue.
        </p>
      )}
    </form>
  );
}
