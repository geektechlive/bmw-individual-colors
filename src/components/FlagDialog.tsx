'use client';

import { useId, useState, useTransition, useRef, useEffect } from 'react';
import { flagEntry } from '../app/actions';
import { useTurnstile } from './form/useTurnstile';
import { FLAG_NOTE_MAX, FLAG_REASONS, FLAG_REASON_LABELS, type FlagReason } from '../lib/flag-validation';

import styles from './FlagDialog.module.css';

interface Props {
  id: string;
  /** Called once the dialog has closed, with whether a report was sent. */
  onClose: (reported: boolean) => void;
}

/**
 * The report flow for one build: a reason, an optional note, Turnstile, then flagEntry
 * (#31). Mount it to open it; it closes itself and calls `onClose`. RowActions owns the
 * trigger (the "Report a problem" item), so this component has none.
 */
export default function FlagDialog({ id, onClose }: Props) {
  const [flagged, setFlagged] = useState(false);
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [flagError, setFlagError] = useState<string | null>(null);
  // A flag must say what is wrong (#31); "Other" also needs a short note.
  const [reason, setReason] = useState<FlagReason | ''>('');
  const [note, setNote] = useState('');
  const noteRequired = reason === 'other';
  const canSubmit = Boolean(tsToken) && reason !== '' && (!noteRequired || note.trim() !== '');
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { containerRef: turnstileRef, reset: resetTurnstile } = useTurnstile({
    onToken: (token) => setTsToken(token),
    onLost: () => setTsToken(null),
    size: 'compact',
  });
  const flaggedRef = useRef(false);
  const reasonId = useId();
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function close() {
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      // Closing mid-send would unmount the dialog and lose the "reported" result.
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
      onClose={() => onClose(flaggedRef.current)}
    >
      {flagged ? (
        <div className={styles.panel}>
          <p id={titleId} className={styles.done} role="status">
            Reported, thanks
          </p>
          <button type="button" onClick={close} className={`btn ${styles.small}`}>
            Close
          </button>
        </div>
      ) : (
        <div className={styles.panel}>
          <label id={titleId} className={styles.panelLabel} htmlFor={reasonId}>
            What&apos;s wrong with this entry?
          </label>
          <select
            id={reasonId}
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
          <div ref={turnstileRef} />
          {flagError && <span className={styles.error}>{flagError}</span>}
          <div className={styles.actions}>
            <button
              type="button"
              disabled={!canSubmit || pending}
              aria-label="Send report about this entry"
              onClick={() => {
                if (!canSubmit || !tsToken) return;
                startTransition(async () => {
                  const result = await flagEntry(id, reason, note, tsToken);
                  if (result.ok) {
                    flaggedRef.current = true;
                    setFlagged(true);
                    return;
                  }
                  setFlagError(result.error);
                  setTsToken(null);
                  resetTurnstile();
                });
              }}
              className={`btn btn--danger ${styles.small}`}
            >
              {pending ? '...' : 'Send report'}
            </button>
            <button
              type="button"
              onClick={close}
              disabled={pending}
              aria-label="Cancel flagging this entry"
              className={`btn ${styles.small}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
