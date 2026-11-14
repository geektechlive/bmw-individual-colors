import Link from 'next/link';
import { getEntries } from '../lib/queries';
import { computeStats, computeColorCounts } from '../lib/analytics';
import { getColorHex, colorToSlug } from '../lib/colors';
import ColorTreemapLoader from '../components/charts/ColorTreemapLoader';
import type { Metadata } from 'next';
import { cssVars } from '../lib/css-vars';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BMW M Individual Colors Registry',
};

export default async function HomePage() {
  const entries = await getEntries();
  const stats = computeStats(entries);
  const latest8 = entries.slice(0, 8);

  // Insight tile computations
  const colorCounts = computeColorCounts(entries);
  const topColor = colorCounts[0];

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recentMap = new Map<string, number>();
  for (const e of entries) {
    if (new Date(e.created_at).getTime() > thirtyDaysAgo) {
      recentMap.set(e.ext_color, (recentMap.get(e.ext_color) ?? 0) + 1);
    }
  }
  const trendingEntries = Array.from(recentMap.entries()).sort((a, b) => b[1] - a[1]);
  const trendingColor = trendingEntries[0];

  const countryMap = new Map<string, number>();
  for (const e of entries) {
    if (e.location_country) countryMap.set(e.location_country, (countryMap.get(e.location_country) ?? 0) + 1);
  }
  const topCountry = Array.from(countryMap.entries()).sort((a, b) => b[1] - a[1])[0];

  const insightTiles = [
    {
      label: 'Most Popular Color',
      value: topColor?.color ?? '—',
      sub: topColor ? `${topColor.count} build${topColor.count !== 1 ? 's' : ''}` : undefined,
      hex: topColor?.hex,
    },
    {
      label: 'Trending This Month',
      value: trendingColor?.[0] ?? 'No recent data',
      sub: trendingColor ? `+${trendingColor[1]} this month` : undefined,
      hex: trendingColor ? (colorCounts.find(c => c.color === trendingColor[0])?.hex) : undefined,
    },
    {
      label: 'Most Builds In',
      value: topCountry?.[0] ?? '—',
      sub: topCountry ? `${topCountry[1]} build${topCountry[1] !== 1 ? 's' : ''}` : undefined,
      hex: undefined,
    },
  ];

  const statItems = [
    { label: 'Total Builds', value: stats.totalEntries, color: 'var(--m-blue)' },
    { label: 'Individual Colors', value: stats.totalColors, color: 'var(--m-violet)' },
    { label: 'Countries / Regions', value: stats.totalCountries, color: 'var(--m-red)' },
  ];

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.badge}>Community Registry</div>
          <h1 className={styles.heroTitle}>
            BMW M Individual<br />Colors Registry
          </h1>
          <p className={styles.heroLede}>
            Track and explore BMW M3 and M4 Individual paint color builds from the M community.
            Discover which colors are out there and where.
          </p>
          <div className={styles.heroActions}>
            <Link href="/submit" className={`btn btn--primary ${styles.heroBtn}`}>
              Submit Your Build
            </Link>
            <Link href="/entries" className={`btn ${styles.heroBtn}`}>
              Browse All Entries
            </Link>
            <Link href="/reports" className={`btn ${styles.heroBtn}`}>
              View Reports →
            </Link>
          </div>
        </div>
      </section>

      {/* Color Treemap */}
      <section className={styles.treemapSection}>
        <div className={styles.treemapInner}>
          <div className={styles.treemapFrame}>
            <ColorTreemapLoader data={computeColorCounts(entries).slice(0, 30)} />
          </div>
        </div>
      </section>

      {/* Stat Strip */}
      <section className={styles.stats}>
        <div className={styles.statGrid}>
          {statItems.map(({ label, value, color }) => (
            <div key={label} className={styles.stat}>
              <div className={`${styles.statValue} num`} style={cssVars({ '--p': color })}>
                {value}
              </div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Insight strip */}
      <section className={styles.insights}>
        <div className={styles.statGrid}>
          {insightTiles.map(({ label, value, sub, hex }) => (
            <div key={label} className={styles.insight}>
              <div className={styles.insightHead}>
                {hex && <div className={styles.swatchSmall} style={cssVars({ '--p': hex })} />}
                <div className={styles.insightValue}>{value}</div>
              </div>
              {sub && <div className={`${styles.insightSub} num`}>{sub}</div>}
              <div className={styles.insightLabel}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Latest 8 Submissions */}
      <section className={styles.latest}>
        <div className={styles.latestHead}>
          <h2 className="section-title">Latest Submissions</h2>
          <Link href="/entries" className={`link ${styles.viewAll}`}>
            View all →
          </Link>
        </div>

        {latest8.length === 0 ? (
          <div className={styles.empty}>
            No builds yet. Be the first to{' '}
            <Link href="/submit" className="link">
              submit yours
            </Link>
            !
          </div>
        ) : (
          <>
            <div className={styles.feed}>
              {latest8.map((e) => {
                const hex = getColorHex(e.ext_color);
                const location = [e.location_city, e.location_state, e.location_country]
                  .filter(Boolean)
                  .join(', ');

                return (
                  <div key={e.id} className={styles.row} style={cssVars({ '--p': hex })}>
                    <div className={styles.rowSwatch} />
                    <div className={styles.rowBody}>
                      <Link href={`/colors/${colorToSlug(e.ext_color)}`} className={styles.rowLink}>
                        <div className={`${styles.rowColor} paint-name`}>{e.ext_color}</div>
                      </Link>
                      <div className={styles.rowMeta}>
                        {e.model_year} {e.body_style}
                        {e.competition ? ' Competition' : ''} · {e.drivetrain} · {e.transmission}
                        {location ? ` · ${location}` : ''}
                      </div>
                    </div>
                    {e.forum_username && (
                      <div className={styles.rowUser}>{e.forum_username}</div>
                    )}
                    <div className={`${styles.rowDate} mono`}>
                      {new Date(e.created_at).toLocaleDateString('en-US', {
                        timeZone: 'UTC',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={styles.latestFoot}>
              <Link href="/entries" className={styles.footMuted}>
                Browse all entries →
              </Link>
              <Link href="/colors" className={`link ${styles.footAccent}`}>
                Explore all colors →
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
