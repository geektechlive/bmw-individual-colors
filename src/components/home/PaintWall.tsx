'use client';

import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import IntentLink from '../IntentLink';
import { cssVars } from '../../lib/css-vars';
import { paintNoun } from '../../lib/paint-count';
import { wallStepIndex } from './wall-nav';
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
 * as wide as the strips it names (#68). Each strip is a real link, and the wall is one Tab stop (roving tabindex, #82). Pointing at or focusing a
 * strip writes its name and count in the read-out below the wall, which links to that paint (a 44 px target on a phone, #87). On touch, the first tap shows
 * the read-out and the second opens the page.
 */
export default function PaintWall({ runs, totalPaints }: Props) {
  const [active, setActive] = useState<WallPaint | null>(null);
  const lastPointer = useRef('');
  // The strip a touch tap has armed. Kept apart from `active`: a tap also fires the emulated
  // mouseenter and focus before click, which set `active`, so `active` can't tell a first tap.
  const armed = useRef<string | null>(null);

  // Roving tabindex (#82): the wall is one Tab stop, on the strip last focused (the first at
  // the start). Arrow keys, Home and End move focus between strips.
  const [rover, setRover] = useState(0);
  const wallRef = useRef<HTMLDivElement>(null);
  const firstIndex = useMemo(
    () => runs.map((_, r) => runs.slice(0, r).reduce((sum, run) => sum + run.paints.length, 0)),
    [runs],
  );

  const onWallKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const strips = Array.from(wallRef.current?.querySelectorAll<HTMLElement>('[data-wall-strip]') ?? []);
    const from = strips.indexOf(e.target as HTMLElement);
    if (from < 0) return;
    const to = wallStepIndex(from, e.key, strips.length);
    if (to === null) return;
    e.preventDefault();
    strips[to].focus();
  };

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
      <div className={styles.wall} ref={wallRef} onKeyDown={onWallKeyDown}>
        <ul className={styles.runs} aria-label={`All ${totalPaints} registered ${paintNoun(totalPaints)}, sorted by color`}>
          {runs.map((run, r) => (
            <li
              key={`${run.family}-${run.paints[0].slug}`}
              className={styles.run}
              style={cssVars({ '--n': run.total })}
              data-wall-run=""
            >
              <ul className={styles.strips}>
                {run.paints.map((p, i) => (
                  <li key={p.slug} className={styles.item} style={cssVars({ '--n': p.count, '--p': p.hex })}>
                    <IntentLink
                      href={`/colors/${p.slug}`}
                      className={styles.strip}
                      data-wall-strip=""
                      tabIndex={firstIndex[r] + i === rover ? 0 : -1}
                      aria-label={`${p.color}, ${buildsText(p.count)}`}
                      onPointerDown={onPointerDown}
                      onMouseEnter={() => setActive(p)}
                      onFocus={() => {
                        setActive(p);
                        setRover(firstIndex[r] + i);
                      }}
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
              <span>
                <b>{active.color}</b> · {buildsText(active.count)}
              </span>
              <IntentLink
                href={`/colors/${active.slug}`}
                className={styles.open}
                // Pointer and touch only: keyboard users already have the focused strip (Enter opens
                // it), and a second stop here would break the wall's single Tab stop (#82).
                tabIndex={-1}
              >
                Open {active.color} →
              </IntentLink>
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
