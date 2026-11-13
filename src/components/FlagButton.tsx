'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { flagEntry } from '../app/actions';
import { FLAG_NOTE_MAX, FLAG_REASONS, FLAG_REASON_LABELS, type FlagReason } from '../lib/flag-validation';

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
    return <span style={{ color: '#64748b', fontSize: 11 }}>Reported, thanks</span>;
  }

  if (confirming) {
    const fieldStyle: React.CSSProperties = {
      background: '#0f1923',
      color: '#e2e8f0',
      border: '1px solid #2d3f55',
      borderRadius: 4,
      fontSize: 12,
      padding: '4px 6px',
      width: '100%',
      maxWidth: 260,
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
        <label style={{ color: '#94a3b8', fontSize: 11 }} htmlFor={`flag-reason-${id}`}>
          What&apos;s wrong with this entry?
        </label>
        <select
          id={`flag-reason-${id}`}
          value={reason}
          onChange={(e) => setReason(e.target.value as FlagReason | '')}
          style={fieldStyle}
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
          style={{ ...fieldStyle, resize: 'vertical' }}
        />
        <div ref={widgetContainerRef} />
        {flagError && (
          <span style={{ color: '#f87171', fontSize: 11 }}>{flagError}</span>
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
            style={{
              padding: '3px 8px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: canSubmit && !pending ? 'pointer' : 'not-allowed',
              opacity: canSubmit && !pending ? 1 : 0.5,
            }}
          >
            {pending ? '...' : 'Send report'}
          </button>
          <button
            onClick={handleCancel}
            aria-label="Cancel flagging this entry"
            style={{
              padding: '3px 8px',
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid #2d3f55',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
            }}
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
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#475569', fontSize: 12, padding: '2px 4px', borderRadius: 4,
        transition: 'color 0.15s', lineHeight: 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
      onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
    >
      🚩
    </button>
  );
}
