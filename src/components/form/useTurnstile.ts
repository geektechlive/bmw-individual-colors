'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Public site key (not a secret). Tests swap in Cloudflare's test key via the env var. */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAC6yXfM_xBBaAkKj';

/** How long to wait for the layout's script before giving up (slow phones, #90). */
const SCRIPT_WAIT_MS = 30_000;
const POLL_MS = 100;

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

interface Options {
  /** A fresh token arrived. */
  onToken?: (token: string) => void;
  /** The token expired or the check failed: the form must wait for a new one. */
  onLost?: () => void;
  size?: 'normal' | 'compact';
}

/**
 * Renders Cloudflare Turnstile into the returned ref's element, explicitly (#90).
 *
 * The script loads once from the root layout with `render=explicit`. Implicit rendering
 * scanned the page only when the script first ran, so a form reached by an in-app link
 * mounted after that scan and never got a widget: an empty box and a submit button that
 * never enabled. Rendering from the component works on a full load and after client-side
 * navigation alike. Keep the element inside the <form>: Turnstile puts the token in a
 * hidden `cf-turnstile-response` input there, which the server actions read.
 */
export function useTurnstile({ onToken, onLost, size = 'normal' }: Options = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Latest callbacks without re-rendering the widget when a parent re-renders.
  const handlers = useRef({ onToken, onLost });
  useEffect(() => {
    handlers.current = { onToken, onLost };
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const tryRender = () => {
      const el = containerRef.current;
      if (!el || widgetIdRef.current) return;
      if (window.turnstile) {
        widgetIdRef.current = window.turnstile.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          size,
          callback: (token) => handlers.current.onToken?.(token),
          'expired-callback': () => handlers.current.onLost?.(),
          'error-callback': () => handlers.current.onLost?.(),
        });
      } else if (Date.now() - startedAt < SCRIPT_WAIT_MS) {
        timer = setTimeout(tryRender, POLL_MS);
      }
    };
    tryRender();

    return () => {
      clearTimeout(timer);
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [size]);

  /** Ask for a fresh token (the server consumed the last one). */
  const reset = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  }, []);

  return { containerRef, reset };
}
