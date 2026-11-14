'use client';

import { useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import Link from 'next/link';
import { cssVars } from '../../lib/css-vars';
import styles from './PaintWall.module.css';

export interface WallPaint {
  color: string;
  count: number;
  hex: string;
  slug: string;
}

export interface WallTick {
  family: string;
  /** 0 to 1 along the wall. */
  start: number;
  /** Width of the family run, 0 to 1 of the wall. */
  share: number;
  /** Whether the family is wide enough to carry its name. */
  labelled: boolean;
}

interface Props {
  paints: WallPaint[];
  ticks: WallTick[];
  totalPaints: number;
}

const buildsText = (n: number) => `${n} build${n === 1 ? '' : 's'}`;

/**
 * The registry as one lit surface: a strip per paint, as wide as its build count (#46).
 * Each strip is a real link. Pointing at or focusing a strip writes its name and count in the
 * read-out below the wall. On touch, the first tap shows the read-out and the second opens the page.
 */
export default function PaintWall({ paints, ticks, totalPaints }: Props) {
  const [active, setActive] = useState<WallPaint | null>(null);
  const lastPointer = useRef('');
  // The strip a touch tap has armed. Kept apart from `active`: a tap also fires the emulated
  // mouseenter and focus before click, which set `active`, so `active` can't tell a first tap.
  const armed = useRef<string | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLAnchorElement>) => {
    lastPointer.current = e.pointerType;
  };

  const onClick = (e: MouseEvent<HTMLAnchorElement>, paint: WallPaint) => {
    const isTouch = lastPointer.current === 'touch';
    lastPointer.current = '';
    if (isTouch && armed.current !== paint.slug) {
      e.preventDefault();
      armed.current = paint.slug;
      setActive(paint);
    }
  };

  return (
    <>
      <div className={styles.wall}>
        <ul className={styles.strips} aria-label="Top 40 registered paints, sorted by color">
          {paints.map((p) => (
            <li key={p.slug} className={styles.item} style={cssVars({ '--n': p.count, '--p': p.hex })}>
              <Link
                href={`/colors/${p.slug}`}
                className={styles.strip}
                aria-label={`${p.color}, ${buildsText(p.count)}`}
                onPointerDown={onPointerDown}
                onMouseEnter={() => setActive(p)}
                onFocus={() => setActive(p)}
                onClick={(e) => onClick(e, p)}
              />
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.ticks} aria-hidden="true">
        {ticks.map((t) => (
          <span key={`${t.family}-${t.start}`} className={styles.tick} style={cssVars({ '--x': `${t.start * 100}%`, '--w': `${t.share * 100}%` })}>
            {t.labelled ? t.family : ''}
          </span>
        ))}
      </div>
      <div className={styles.read} aria-live="polite">
        <span>
          {active ? (
            <>
              <b>{active.color}</b> · {buildsText(active.count)}
            </>
          ) : (
            <>
              <b>Hover or tap a strip for its name and build count.</b> Showing the {paints.length} paints with
              the most builds, out of {totalPaints}.
            </>
          )}
        </span>
        <span>Sorted by color. Wider strips have more builds.</span>
      </div>
    </>
  );
}
