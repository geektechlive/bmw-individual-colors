import Link from 'next/link';
import type { Metadata } from 'next';
import { getEntries } from '../lib/queries';
import { computeStats, computeColorCounts } from '../lib/analytics';
import { colorToSlug } from '../lib/colors';
import {
  mostRegistered,
  newestEntry,
  rarePaintCount,
  topPaintsByHue,
  familyTicks,
} from '../lib/home-facts';
import PaintSwatch from '../components/PaintSwatch';
import PaintWall from '../components/home/PaintWall';
import type { WallPaint, WallTick } from '../components/home/PaintWall';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BMW M Individual Colors Registry',
};

const WALL_SIZE = 40;
/** A family narrower than this share of the wall gets a tick but no name. */
const TICK_LABEL_MIN_SHARE = 0.06;
const LATEST_COUNT = 8;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });

const buildsText = (n: number) => `${n} build${n === 1 ? '' : 's'}`;

export default async function HomePage() {
  const entries = await getEntries();
  const stats = computeStats(entries);
  const colorCounts = computeColorCounts(entries);
  const latest = entries.slice(0, LATEST_COUNT);

  const topPaint = mostRegistered(colorCounts);
  const newest = newestEntry(entries);
  const rareCount = rarePaintCount(colorCounts);

  const wall = topPaintsByHue(colorCounts, WALL_SIZE);
  const wallPaints: WallPaint[] = wall.map((p) => ({ ...p, slug: colorToSlug(p.color) }));
  const wallTicks: WallTick[] = familyTicks(wall).map((t) => ({
    family: t.family,
    start: t.start,
    share: t.share,
    labelled: t.share >= TICK_LABEL_MIN_SHARE,
  }));

  const statItems = [
    { label: 'Builds', value: stats.totalEntries },
    { label: 'Paints', value: stats.totalColors },
    { label: 'Countries', value: stats.totalCountries },
  ];

  return (
    <main>
      <section className={styles.hero}>
        <div className={`${styles.heroGrid} page page--wide`}>
          <div className={styles.heroText}>
            <span className="label">G80 M3 · G82 M4 · BMW Individual paint</span>
            <h1 className={styles.title}>BMW M Individual Colors Registry</h1>
            <p className={styles.lede}>
              Owners of G80 M3s and G82 M4s in BMW Individual paint list their cars here. Find your color to see how
              many others have it, and add yours if it&apos;s missing.
            </p>
            <div className={styles.actions}>
              <Link href="/submit" className="btn btn--primary">
                Submit your build
              </Link>
              <Link href="/entries" className="btn">
                Browse all builds
              </Link>
              <Link href="/reports" className="btn">
                View reports
              </Link>
            </div>
          </div>

          {entries.length > 0 && (
            <dl className={styles.facts}>
              {topPaint && (
                <div className={styles.fact}>
                  <dt className="label">Most registered</dt>
                  <dd className={`${styles.factValue} paint-name`}>{topPaint.color}</dd>
                  <dd className={`${styles.factNote} mono`}>{buildsText(topPaint.count)}</dd>
                </div>
              )}
              {newest && (
                <div className={styles.fact}>
                  <dt className="label">Newest</dt>
                  <dd className={`${styles.factValue} paint-name`}>{newest.ext_color}</dd>
                  <dd className={`${styles.factNote} mono`}>{shortDate(newest.created_at)}</dd>
                </div>
              )}
              <div className={styles.fact}>
                <dt className="label">Rarest</dt>
                <dd className={`${styles.factValue} paint-name`}>
                  {rareCount} paint{rareCount === 1 ? '' : 's'}
                </dd>
                <dd className={`${styles.factNote} mono`}>1 or 2 builds each</dd>
              </div>
            </dl>
          )}

          {wallPaints.length > 0 && (
            <div className={styles.wallArea}>
              <div className={styles.lamp} aria-hidden="true" />
              <PaintWall paints={wallPaints} ticks={wallTicks} totalPaints={stats.totalColors} />
            </div>
          )}
        </div>
      </section>

      <section className={`${styles.stats} page page--wide`} aria-label="Registry totals">
        {statItems.map(({ label, value }) => (
          <div key={label} className={styles.stat}>
            <span className="label">{label}</span>
            <strong className={`${styles.statValue} num`}>{value}</strong>
          </div>
        ))}
      </section>

      <section className={`${styles.latest} page page--wide`}>
        <div className={styles.latestHead}>
          <h2 className="label">Latest builds</h2>
          <Link href="/entries" className="link">
            View all →
          </Link>
        </div>

        {latest.length === 0 ? (
          <p className={styles.empty}>
            No builds yet.{' '}
            <Link href="/submit" className="link">
              Submit yours
            </Link>
            .
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Paint</th>
                  <th scope="col">Car</th>
                  <th scope="col">Spec</th>
                  <th scope="col">Location</th>
                  <th scope="col">Added</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((e) => {
                  const location = [e.location_city, e.location_state, e.location_country]
                    .filter(Boolean)
                    .join(', ');
                  return (
                    <tr key={e.id}>
                      <td>
                        <span className={styles.paintCell}>
                          <PaintSwatch name={e.ext_color} size="chip" />
                          <Link
                            href={`/colors/${colorToSlug(e.ext_color)}`}
                            className={`${styles.paintLink} paint-name`}
                          >
                            {e.ext_color}
                          </Link>
                        </span>
                      </td>
                      <td className="mono">
                        {e.model_year} {e.body_style}
                        {e.competition ? ' Competition' : ''}
                      </td>
                      <td className="mono">
                        {e.drivetrain} · {e.transmission}
                      </td>
                      <td>{location}</td>
                      <td className="mono">{shortDate(e.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className={styles.foot}>
          <Link href="/colors" className="link">
            Explore all colors →
          </Link>
        </p>
      </section>
    </main>
  );
}
