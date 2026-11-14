'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { submitEntry } from '../app/actions';
import { defaultsFromSubmission, useActionStateKeepingValues } from './form/keep-values';
import FormFields from './form/FormFields';
import FormError from './form/FormError';
import { fieldErrorProps, fieldForError } from './form/field-error';
import { SUBMIT_DEFAULTS } from './form/options';
import { useLocation } from './form/useLocation';
import styles from './EntryForm.module.css';

// Cloudflare Turnstile attaches a global widget API and invokes our named
// callbacks via the data-callback/data-*-callback attributes. This is a
// local, self-contained type — deliberately not shared with FlagButton's
// global Window augmentation, so this component doesn't depend on it.
interface TurnstileWindow {
  __entryFormTsSuccess?: (token: string) => void;
  __entryFormTsExpired?: () => void;
  __entryFormTsError?: () => void;
  turnstile?: { reset: (selector: string) => void };
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAC6yXfM_xBBaAkKj';

export default function EntryForm() {
  // Keeps the last submission so a duplicate warning or error doesn't reset the fields.
  const [state, action, isPending, submitted, round] = useActionStateKeepingValues(submitEntry, {});
  const loc = useLocation();
  const [forumUsername, setForumUsername] = useState('');
  const errorField = fieldForError(state?.error);

  // Turnstile: the server consumes the token on every submitEntry call, even
  // when it just returns an error or a duplicate warning. Once that happens
  // the rendered widget's token is stale, so both submit buttons are disabled
  // until a fresh token comes back via the widget's data-callback.
  const [needsFreshToken, setNeedsFreshToken] = useState(false);

  // Register the Turnstile callbacks once on mount.
  useEffect(() => {
    (window as Window & TurnstileWindow).__entryFormTsSuccess = () => setNeedsFreshToken(false);
    (window as Window & TurnstileWindow).__entryFormTsExpired = () => setNeedsFreshToken(true);
    (window as Window & TurnstileWindow).__entryFormTsError = () => setNeedsFreshToken(true);
  }, []);

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
    if ((state?.error || state?.duplicate) && (window as Window & TurnstileWindow).turnstile) {
      (window as Window & TurnstileWindow).turnstile!.reset('.cf-turnstile');
    }
  }, [state]);

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

      {/* Turnstile bot protection — script tag is loaded once in the root layout */}
      <div
        className="cf-turnstile"
        data-sitekey={TURNSTILE_SITE_KEY}
        data-theme="dark"
        data-callback="__entryFormTsSuccess"
        data-expired-callback="__entryFormTsExpired"
        data-error-callback="__entryFormTsError"
      />

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
