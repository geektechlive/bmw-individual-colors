'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { flagEntry } from '../app/actions';
import { FLAG_NOTE_MAX, FLAG_REASONS, FLAG_REASON_LABELS, type FlagReason } from '../lib/flag-validation';

import styles from './FlagButton.module.css';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '0x4AAAAAAC6yXfM_xBBaAkKj';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: {
        sitekey: string;
        callback?: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        size?: 'normal' | 'compact' | 'invisible';
        theme?: 'light' | 'dark' | 'auto';
      }) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export default function FlagButton({ id }: { id: string }) {
  const [flagged, setFlagged] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [flagError, setFlagError] = useState<string | null>(null);
  // A flag must say what is wrong (#31); "Other" also needs a short note.
  const [reason, setReason] = useState<FlagReason | ''>('');
  const [note, setNote] = useState('');
  const noteRequired = reason === 'other';
  const canSubmit = Boolean(tsToken) && reason !== '' && (!noteRequired || note.trim() !== '');
  const [pending, startTransition] = useTransition();
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!confirming || !widgetContainerRef.current || widgetIdRef.current) return;

    let attempts = 0;
    const tryRender = () => {
      if (!widgetContainerRef.current) return;
      if (window.turnstile && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setTsToken(token),
          'error-callback': () => setTsToken(null),
          'expired-callback': () => setTsToken(null),
          size: 'compact',
          theme: 'dark',
        });
      } else if (attempts < 20) {
        attempts++;
        setTimeout(tryRender, 200);
      }
    };
    tryRender();

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [confirming]);

  function handleCancel() {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }
    setConfirming(false);
    setTsToken(null);
    setFlagError(null);
    setReason('');
    setNote('');
  }

  if (flagged) {
    return <span className={styles.done}>Reported, thanks</span>;
  }

  if (confirming) {
    return (
      <div className={styles.panel}>
        <label className={styles.panelLabel} htmlFor={`flag-reason-${id}`}>
          What&apos;s wrong with this entry?
        </label>
        <select
          id={`flag-reason-${id}`}
          value={reason}
          onChange={(e) => setReason(e.target.value as FlagReason | '')}
          className={`input ${styles.field}`}
          required
        >
          <option value="" disabled>
            Choose a reason…
          </option>
          {FLAG_REASONS.map((r) => (
            <option key={r} value={r}>
              {FLAG_REASON_LABELS[r]}
            </option>
          ))}
        </select>
        <textarea
          aria-label={noteRequired ? 'Describe the problem (required)' : 'Add details (optional)'}
          placeholder={noteRequired ? 'Describe the problem (required)' : 'Add details (optional)'}
          value={note}
          maxLength={FLAG_NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className={`input ${styles.field} ${styles.note}`}
        />
        <div ref={widgetContainerRef} />
        {flagError && <span className={styles.error}>{flagError}</span>}
        <div className={styles.actions}>
          <button
            disabled={!canSubmit || pending}
            aria-label="Send report about this entry"
            onClick={() => {
              if (!canSubmit || !tsToken) return;
              startTransition(async () => {
                const result = await flagEntry(id, reason, note, tsToken);
                if (result.ok) {
                  setFlagged(true);
                  return;
                }
                setFlagError(result.error);
                setTsToken(null);
                if (widgetIdRef.current && window.turnstile) {
                  window.turnstile.reset(widgetIdRef.current);
                }
              });
            }}
            className={`btn btn--danger ${styles.small}`}
          >
            {pending ? '...' : 'Send report'}
          </button>
          <button
            onClick={handleCancel}
            aria-label="Cancel flagging this entry"
            className={`btn ${styles.small}`}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Flag this entry as incorrect"
      aria-label="Flag this entry as incorrect"
      className={styles.flag}
    >
      🚩
    </button>
  );
}
