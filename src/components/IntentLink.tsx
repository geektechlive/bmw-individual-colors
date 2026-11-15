'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'prefetch'>;

/** How long the pointer must rest on a link before it prefetches. */
export const HOVER_INTENT_MS = 100;

/**
 * A Link that prefetches only once the visitor shows intent, following Next's
 * "Hover-triggered prefetch" guide: keyboard focus or touch at once, a mouse after resting
 * on the link for HOVER_INTENT_MS (so sweeping across the 40-strip paint wall doesn't
 * prefetch every strip it crosses). Used for paint-page links: pages that list dozens of
 * paints otherwise prefetch every one as it scrolls into view, and each prefetch is a
 * Worker render on the 10 ms free plan (#62, ADR 0003).
 */
export default function IntentLink({ onMouseEnter, onMouseLeave, onFocus, onTouchStart, ...rest }: Props) {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => cancel, []);

  return (
    <Link
      {...rest}
      prefetch={active ? null : false}
      onMouseEnter={(e) => {
        cancel();
        if (!active) timer.current = setTimeout(() => setActive(true), HOVER_INTENT_MS);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        cancel();
        onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        setActive(true);
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        setActive(true);
        onTouchStart?.(e);
      }}
    />
  );
}
