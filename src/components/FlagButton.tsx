'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { flagEntry } from '../app/actions';

const TURNSTILE_SITE_KEY = '0x4AAAAAAC6yXfM_xBBaAkKj';

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
    };
  }
}

export default function FlagButton({ id }: { id: string }) {
  const [flagged, setFlagged] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [tsToken, setTsToken] = useState<string | null>(null);
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
  }

  if (flagged) {
    return <span style={{ color: '#64748b', fontSize: 11 }}>Flagged</span>;
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
        <div ref={widgetContainerRef} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            disabled={!tsToken || pending}
            onClick={() => {
              if (!tsToken) return;
              startTransition(async () => {
                await flagEntry(id, tsToken);
                setFlagged(true);
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
              cursor: tsToken && !pending ? 'pointer' : 'not-allowed',
              opacity: tsToken && !pending ? 1 : 0.5,
            }}
          >
            {pending ? '...' : 'Flag'}
          </button>
          <button
            onClick={handleCancel}
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
