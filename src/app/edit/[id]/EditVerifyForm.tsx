'use client';

import { useActionState, useEffect, useState } from 'react';
import { verifyForumUsername } from '../../actions';
import FormError from '../../../components/form/FormError';
import { fieldErrorProps } from '../../../components/form/field-error';
import { useTurnstile } from '../../../components/form/useTurnstile';
import styles from './EditVerifyForm.module.css';

interface Props {
  entryId: string;
}

export default function EditVerifyForm({ entryId }: Props) {
  const [state, action, isPending] = useActionState(verifyForumUsername, {});
  const [turnstileDone, setTurnstileDone] = useState(false);
  // Rendered by this component, so it appears after an in-app link too (#90).
  const { containerRef: turnstileRef, reset: resetTurnstile } = useTurnstile({
    onToken: () => setTurnstileDone(true),
    onLost: () => setTurnstileDone(false),
  });

  // The server consumed the token, so ask for a new one before the next try.
  // Keyed on the response object: the same error twice must reset twice.
  useEffect(() => {
    if (state?.error) {
      resetTurnstile();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTurnstileDone(false);
    }
  }, [state, resetTurnstile]);

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

      <div className="cf-turnstile" ref={turnstileRef} />

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
