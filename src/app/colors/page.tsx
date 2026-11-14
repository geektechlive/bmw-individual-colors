import Link from 'next/link';
import { getEntries } from '../../lib/queries';
import { computeColorCounts } from '../../lib/analytics';
import { getColorFamily, colorToSlug, isLightColor } from '../../lib/colors';
import { cssVars } from '../../lib/css-vars';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'All Colors — BMW M Individual Colors Registry' };

export default async function ColorsPage() {
  const entries = await getEntries();
  const colorCounts = computeColorCounts(entries);

  return (
    <main className="page">
      <div className={styles.back}>
        <Link href="/" className="link">← Home</Link>
      </div>
      <h1 className={`title ${styles.heading}`}>Individual Colors</h1>
      <p className={`muted ${styles.intro}`}>
        {colorCounts.length} colors across {entries.length} builds in the registry.
      </p>

      <div className={styles.grid}>
        {colorCounts.map(({ color, count, hex }) => {
          const slug = colorToSlug(color);
          const family = getColorFamily(color);
          const light = isLightColor(hex);
          return (
            <Link key={color} href={`/colors/${slug}`} className={styles.tileLink}>
              <div
                className={`${styles.tile} ${light ? styles.tileDark : styles.tileLight}`}
                style={cssVars({ '--p': hex })}
              >
                <div className={`${styles.tileName} paint-name`}>{color}</div>
                <div className={`${styles.tileMeta} num`}>
                  {count} build{count !== 1 ? 's' : ''} · {family}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
