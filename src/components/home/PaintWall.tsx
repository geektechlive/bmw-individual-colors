'use client';

import { useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import IntentLink from '../IntentLink';
import { cssVars } from '../../lib/css-vars';
import { paintNoun } from '../../lib/paint-count';
import styles from './PaintWall.module.css';

export interface WallPaint {
  color: string;
  count: number;
  hex: string;
  slug: string;
}

/** A run of neighbouring same-family paints. Its tick is as wide as its strip row. */
export interface WallRun {
  family: string;
  /** The run's total builds, which sets how wide it is. */
  total: number;
  paints: WallPaint[];
}

interface Props {
  runs: WallRun[];
  totalPaints: number;
}

/** "Reds & Oranges" becomes "Reds" where the full name doesn't fit. */
const shortFamily = (family: string) => family.split(' & ')[0];

const buildsText = (n: number) => `${n} build${n === 1 ? '' : 's'}`;

/**
 * The registry as one lit surface: a strip per paint, as wide as its build count (#46).
 * Strips are grouped into family runs and each run carries its own tick, so a tick is exactly
 * as wide as the strips it names (#68). Each strip is a real link. Pointing at or focusing a
 * strip writes its name and count in the read-out below the wall. On touch, the first tap shows
 * the read-out and the second opens the page.
 */
export default function PaintWall({ runs, totalPaints }: Props) {
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
        <ul className={styles.runs} aria-label={`All ${totalPaints} registered ${paintNoun(totalPaints)}, sorted by color`}>
          {runs.map((run) => (
            <li
              key={`${run.family}-${run.paints[0].slug}`}
              className={styles.run}
              style={cssVars({ '--n': run.total })}
              data-wall-run=""
            >
              <ul className={styles.strips}>
                {run.paints.map((p) => (
                  <li key={p.slug} className={styles.item} style={cssVars({ '--n': p.count, '--p': p.hex })}>
                    <IntentLink
                      href={`/colors/${p.slug}`}
                      className={styles.strip}
                      data-wall-strip=""
                      aria-label={`${p.color}, ${buildsText(p.count)}`}
                      onPointerDown={onPointerDown}
                      onMouseEnter={() => setActive(p)}
                      onFocus={() => setActive(p)}
                      onClick={(e) => onClick(e, p)}
                    />
                  </li>
                ))}
              </ul>
              <span className={styles.tick} aria-hidden="true" data-wall-tick="">
                <span className={styles.tickFull}>{run.family}</span>
                <span className={styles.tickShort}>{shortFamily(run.family)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.read} aria-live="polite">
        <span>
          {active ? (
            <>
              <b>{active.color}</b> · {buildsText(active.count)}
            </>
          ) : (
            <>
              <b className={styles.hint}>Hover or tap a strip for its name and build count.</b> All {totalPaints}{' '}
              {paintNoun(totalPaints)}, sorted by color.
            </>
          )}
        </span>
        <span>Wider strips have more builds.</span>
      </div>
    </>
  );
}
