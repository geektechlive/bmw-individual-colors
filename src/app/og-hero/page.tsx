import { notFound } from 'next/navigation';
import { getEntries } from '../../lib/queries';
import { computeColorCounts } from '../../lib/analytics';
import { sortByHue } from '../../lib/hue-sort';
import { isDesignCheckEnabled } from '../../lib/design-check';
import { cssVars } from '../../lib/css-vars';
import styles from './page.module.css';

// Development-only source for the site's share image (public/og.png). Screenshotted at
// 1200x630 by scripts/render-og-hero.mjs; 404 in production. The wall uses the registry's
// current counts for strip widths only (no numbers are shown), so the image never goes stale.
//
// Content follows the marketing and design reviews (2026-11-14): the platforms already print
// the site name (and often the domain) beside the card, so the image carries the hook instead,
// plus the audience filter; no URL in the image; every text line stays legible at ~400px wide.

export const dynamic = 'force-dynamic';

const WALL_PAINTS = 40;

export default async function OgHeroPage() {
  if (!isDesignCheckEnabled(process.env.NODE_ENV)) notFound();
  const counts = computeColorCounts(await getEntries()).slice(0, WALL_PAINTS);
  const wall = sortByHue(counts);

  return (
    <div className={styles.stage}>
      <section id="og-hero" className={styles.hero} aria-label="Share image">
        <div className={styles.top}>
          <span className={styles.stripe} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className={styles.eyebrow}>G80 M3 · G82 M4</span>
        </div>
        <h1 className={styles.hook}>How rare is your paint?</h1>
        <p className={styles.name}>BMW M Individual Colors Registry</p>
        <div className={styles.wall} aria-hidden="true">
          {wall.map((p) => (
            <span key={p.color} className={styles.strip} style={cssVars({ '--p': p.hex, '--n': p.count })} />
          ))}
        </div>
      </section>
    </div>
  );
}
