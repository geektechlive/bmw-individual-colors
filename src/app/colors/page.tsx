import Link from 'next/link';
import { getEntries } from '../../lib/queries';
import { computeColorCounts, computeRarityLabel } from '../../lib/analytics';
import { getColorFamily, colorToSlug } from '../../lib/colors';
import { getPaintFinish } from '../../lib/paint-finish';
import ColorsBrowser from '../../components/colors/ColorsBrowser';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'All Colors — BMW M Individual Colors Registry' };

export default async function ColorsPage() {
  const entries = await getEntries();
  const colorCounts = computeColorCounts(entries);
  const colors = colorCounts.map(({ color, count, hex }) => ({
    name: color,
    slug: colorToSlug(color),
    hex,
    count,
    rarity: computeRarityLabel(count),
    family: getColorFamily(color),
    finish: getPaintFinish(color),
  }));

  return (
    <main className="page">
      <div className={styles.back}>
        <Link href="/" className="link">← Home</Link>
      </div>
      <h1 className={`title ${styles.heading}`}>Individual Colors</h1>
      <p className={`muted ${styles.intro}`}>
        {colorCounts.length} colors across {entries.length} builds in the registry.
      </p>
      <ColorsBrowser colors={colors} />
    </main>
  );
}
