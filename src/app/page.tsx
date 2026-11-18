import Link from 'next/link';
import IntentLink from '../components/IntentLink';
import { getEntries } from '../lib/queries';
import { computeStats, computeColorCounts } from '../lib/analytics';
import { colorToSlug } from '../lib/colors';
import {
  mostRegistered,
  newestEntry,
  rarePaintCount,
  wallPaintsByHue,
  wallRuns,
  singleBuildPaints,
  singleBuildLine,
} from '../lib/home-facts';
import PaintSwatch from '../components/PaintSwatch';
import EntryPhoneRow from '../components/EntryPhoneRow';
import PaintWall from '../components/home/PaintWall';
import PaintLookup from '../components/home/PaintLookup';
import type { LookupPaint } from '../components/home/PaintLookup';
import type { WallRun } from '../components/home/PaintWall';
import styles from './page.module.css';
import table from '../components/BuildTable.module.css';

export const dynamic = 'force-dynamic';

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

  // One small object per paint, four fields. The search list and the wall runs share these same
  // objects, so each paint is serialized to the client once (CPU budget, CLAUDE.md).
  const lookupPaints: LookupPaint[] = [...colorCounts]
    .sort((a, b) => b.count - a.count || a.color.localeCompare(b.color))
    .map((p) => ({ color: p.color, slug: colorToSlug(p.color), count: p.count, hex: p.hex }));
  const wallRunList: WallRun[] = wallRuns(wallPaintsByHue(lookupPaints));
  const singles = singleBuildPaints(lookupPaints);

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
              Owners of G80 M3s and G82 M4s in BMW Individual paint list their cars here. Look up your paint to see
              how many others have it, and add yours if it&apos;s missing.
            </p>
            <PaintLookup paints={lookupPaints} />
            <div className={styles.actions}>
              <Link href="/submit" className="btn">
                Submit your build
              </Link>
              <Link href="/entries" className="btn">
                Browse all builds
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
                <dd className={`${styles.factValue} ${styles.factNumber}`}>
                  {rareCount} paint{rareCount === 1 ? '' : 's'}
                </dd>
                <dd className={`${styles.factNote} mono`}>1 or 2 builds each</dd>
              </div>
            </dl>
          )}

          {wallRunList.length > 0 && (
            <div className={styles.wallArea}>
              <div className={styles.lamp} aria-hidden="true" />
              <PaintWall runs={wallRunList} totalPaints={colorCounts.length} />
            </div>
          )}

          {singles.length > 0 && (
            <section className={styles.singles} aria-labelledby="singles-heading">
              <div className={styles.singlesHead}>
                <h2 id="singles-heading" className="label">
                  Paints with a single build
                </h2>
                <p>{singleBuildLine(singles.length)}</p>
              </div>
              <ul className={styles.ones}>
                {singles.map((p) => (
                  <li key={p.color}>
                    <IntentLink href={`/colors/${p.slug}`} className={styles.one}>
                      <PaintSwatch name={p.color} hex={p.hex} size="chip-sm" />
                      <span className="paint-name">{p.color}</span>
                    </IntentLink>
                  </li>
                ))}
              </ul>
              <p className={styles.singlesMore}>
                Own one of these, or a paint that isn&apos;t listed?{' '}
                <Link href="/submit" className={`link ${styles.singlesLink}`}>
                  Submit your build →
                </Link>
              </p>
            </section>
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
          <Link href="/entries" className="link link-target">
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
          <>
          {/* Phones get the two-line rows from /entries, without the expand (#85). */}
          <ul className={styles.phoneList} aria-label="Latest builds">
            {latest.map((e) => (
              <EntryPhoneRow key={e.id} entry={e} expandable={false} />
            ))}
          </ul>
          <div className={`${table.wrap} ${styles.deskTable}`}>
            <table className={table.table}>
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
                        <span className={table.paintCell}>
                          <PaintSwatch name={e.ext_color} size="chip" />
                          <IntentLink
                            href={`/colors/${colorToSlug(e.ext_color)}`}
                            className={`${table.paintLink} paint-name`}
                          >
                            {e.ext_color}
                          </IntentLink>
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
          </>
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
