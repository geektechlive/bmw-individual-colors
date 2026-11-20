'use client';

import { useState, useEffect } from 'react';
import { useTurnstile } from './form/useTurnstile';
import Link from 'next/link';
import { submitEntry } from '../app/actions';
import { defaultsFromSubmission, useActionStateKeepingValues } from './form/keep-values';
import FormFields from './form/FormFields';
import FormError from './form/FormError';
import { fieldErrorProps, fieldForError } from './form/field-error';
import { SUBMIT_DEFAULTS } from './form/options';
import { useLocation } from './form/useLocation';
import styles from './EntryForm.module.css';

export default function EntryForm() {
  // Keeps the last submission so a duplicate warning or error doesn't reset the fields.
  const [state, action, isPending, submitted, round] = useActionStateKeepingValues(submitEntry, {});
  const loc = useLocation();
  const [forumUsername, setForumUsername] = useState('');
  const errorField = fieldForError(state?.error);

  // Turnstile: the server consumes the token on every submitEntry call, even
  // when it just returns an error or a duplicate warning. Once that happens
  // the rendered widget's token is stale, so both submit buttons are disabled
  // until a fresh token comes back via the widget's callback.
  // It starts true: until the widget issues its FIRST token a submit would cost a round
  // trip and an error. The widget is rendered by this component (#90), so its callbacks
  // exist before it can issue a token.
  const [needsFreshToken, setNeedsFreshToken] = useState(true);
  const { containerRef: turnstileRef, reset: resetTurnstile } = useTurnstile({
    onToken: () => setNeedsFreshToken(false),
    onLost: () => setNeedsFreshToken(true),
  });

  // A server error or duplicate warning means the Turnstile token was consumed
  // server-side, so submits stay disabled until the widget issues a new one.
  // Adjusted during render when a new action result arrives (React's "store
  // the previous value" pattern) rather than via setState inside an effect.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.error || state?.duplicate) setNeedsFreshToken(true);
  }

  // Resetting the widget is a side effect on an external system, so it stays in an effect.
  // Keyed on the response object itself, not its text: two identical responses in a row
  // (the same duplicate warning twice) must each reset the widget, or the buttons stay
  // disabled waiting for a token that never comes.
  useEffect(() => {
    if (state?.error || state?.duplicate) resetTurnstile();
  }, [state, resetTurnstile]);

  const submitDisabled = isPending || !forumUsername.trim() || needsFreshToken;

  return (
    <form action={action} className={styles.form}>
      <FormError message={state?.error} />

      {/* A duplicate is a hard stop (ADR 0017): one visible build per user and spec (#35). */}
      {state?.duplicate && (
        <div className={styles.dup} role="alert">
          <div className={styles.dupHead}>
            <span className={styles.dupIcon} aria-hidden="true">⚠️</span>
            <span className={styles.dupTitle}>You&apos;ve already registered this build</span>
          </div>
          <p className={styles.dupText}>
            {state.duplicateInfo}
          </p>
          <p className={styles.dupSub}>
            To change it, edit that build instead. If something above is wrong, fix it and submit again.
          </p>
          {state.duplicateId && (
            <Link href={`/edit/${state.duplicateId}`} className={`btn btn--warn ${styles.dupButton}`}>
              Edit that build
            </Link>
          )}
        </div>
      )}

      <FormFields
        key={round}
        defaults={defaultsFromSubmission(submitted, SUBMIT_DEFAULTS)}
        loc={loc}
        errorField={errorField}
        sendInteriorType
        afterForum={(forum) => (
          <>
            <label className="field-label" htmlFor="forum_username">Forum Username *</label>
            <input
              type="text"
              id="forum_username"
              name="forum_username"
              className="input"
              placeholder={`Your ${forum} username`}
              required
              value={forumUsername}
              onChange={(e) => setForumUsername(e.target.value)}
              {...fieldErrorProps('forum_username', errorField)}
            />
          </>
        )}
      />

      {/* Turnstile bot protection, rendered by useTurnstile (#90) */}
      <div className="cf-turnstile" ref={turnstileRef} />

      {needsFreshToken && !isPending && (
        <p className="field-hint" role="status">Waiting for the security check before you can submit.</p>
      )}

      <button
        type="submit"
        disabled={submitDisabled}
        className={`btn btn--primary ${styles.submit}`}
      >
        {isPending ? 'Submitting...' : 'Submit Build'}
      </button>
    </form>
  );
}
