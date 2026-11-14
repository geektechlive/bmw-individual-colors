import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { getEntriesByColor, getEntries, resolveColorSlug } from '../../../lib/queries';
import { computeRarityLabel, computeRarityColor } from '../../../lib/analytics';

export const dynamic = 'force-dynamic';
import { getColorHex, getColorFamily, COLOR_ALIASES, aliasRedirectSlug, canonicalColorName, colorToSlug } from '../../../lib/colors';
import FlagButton from '../../../components/FlagButton';
import type { Metadata } from 'next';
import { cssVars } from '../../../lib/css-vars';
import styles from './page.module.css';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveColorSlug(slug);
  if (!resolved) return { title: 'Color Not Found' };
  // resolveColorSlug already returns a canonical name (getEntries() canonicalizes
  // ext_color at the source), but canonicalize defensively so an aliased request
  // slug (e.g. /colors/enzian-blue) still points its canonical tag/OG image at
  // the merged color's own slug (/colors/gentian-blue) rather than echoing the
  // requested one back at itself.
  const colorName = canonicalColorName(resolved);
  const canonicalSlug = colorToSlug(colorName);

  const colorEntries = await getEntriesByColor(colorName);
  const totalBuilds = colorEntries.length;
  const rarityLabel = computeRarityLabel(totalBuilds);

  const years = colorEntries.map((e) => e.model_year);
  const yearRange =
    years.length > 0
      ? Math.min(...years) === Math.max(...years)
        ? `${Math.min(...years)}`
        : `${Math.min(...years)}–${Math.max(...years)}`
      : null;

  const wheelCounts = new Map<string, number>();
  for (const e of colorEntries) {
    if (e.wheels) wheelCounts.set(e.wheels, (wheelCounts.get(e.wheels) ?? 0) + 1);
  }
  const topWheels = Array.from(wheelCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([wheel]) => wheel);

  const description = [
    `${rarityLabel} BMW M Individual color`,
    yearRange ? `seen on MY${yearRange} builds` : null,
    topWheels.length > 0 ? `most often paired with ${topWheels.join(' and ')} wheels` : null,
  ]
    .filter(Boolean)
    .join(', ') + '.';

  return {
    title: `${colorName} — ${totalBuilds} build${totalBuilds === 1 ? '' : 's'}`,
    description,
    alternates: {
      canonical: `/colors/${canonicalSlug}`,
    },
    openGraph: {
      title: `${colorName} — BMW M Individual Colors Registry`,
      description,
      images: [`/colors/${canonicalSlug}/opengraph-image`],
    },
  };
}

export default async function ColorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Alias names aren't listed colors (#35): send old links to the canonical page (#37).
  const aliasTarget = aliasRedirectSlug(slug);
  if (aliasTarget) permanentRedirect(`/colors/${aliasTarget}`);
  const resolved = await resolveColorSlug(slug);
  if (!resolved) notFound();
  const colorName = canonicalColorName(resolved);

  const [colorEntries, allEntries] = await Promise.all([
    getEntriesByColor(colorName),
    getEntries(),
  ]);

  const hex = getColorHex(colorName);
  const family = getColorFamily(colorName);
  const totalBuilds = colorEntries.length;
  const rarityLabel = computeRarityLabel(totalBuilds);
  const rarityColor = computeRarityColor(rarityLabel);
  const totalRegistryBuilds = allEntries.length;
  const pct = totalRegistryBuilds > 0 ? ((totalBuilds / totalRegistryBuilds) * 100).toFixed(1) : '0';

  // Stats
  const m3Count = colorEntries.filter(e => e.body_style === 'M3').length;
  const m4Count = colorEntries.filter(e => e.body_style === 'M4').length;
  const countries = new Set(colorEntries.map(e => e.location_country).filter(Boolean)).size;

  // Year distribution (for mini bar)
  const yearMap = new Map<number, number>();
  for (const e of colorEntries) yearMap.set(e.model_year, (yearMap.get(e.model_year) ?? 0) + 1);
  const yearData = Array.from(yearMap.entries()).sort((a, b) => a[0] - b[0]);

  // Drivetrain split
  const rwdCount = colorEntries.filter(e => e.drivetrain === 'RWD').length;
  const awdCount = colorEntries.filter(e => e.drivetrain === 'AWD').length;

  // Aliases: any alternate names that map to this canonical color.
  const aliases = Object.entries(COLOR_ALIASES)
    .filter(([, canonical]) => canonical === colorName)
    .map(([alias]) => alias);

  const maxYearCount = Math.max(...yearData.map(([, c]) => c));

  const statTiles = [
    { label: 'Total Builds', value: totalBuilds, color: 'var(--m-blue)' },
    { label: 'M3 / M4', value: `${m3Count} / ${m4Count}`, color: 'var(--m-violet)' },
    { label: 'Countries', value: countries, color: 'var(--m-red)' },
  ];
  const drivetrainRows = [
    { label: 'RWD', count: rwdCount, color: 'var(--m-red)' },
    { label: 'AWD', count: awdCount, color: 'var(--m-blue)' },
  ];

  return (
    <main className="page page--text" style={cssVars({ '--p': hex })}>
      {/* Breadcrumb */}
      <div className={styles.crumbs}>
        <Link href="/" className="link">Home</Link>
        <span>›</span>
        <Link href="/colors" className="link">Colors</Link>
        <span>›</span>
        <span className="muted">{colorName}</span>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.swatch} />
        <div>
          <div className={styles.titleRow}>
            <h1 className="title paint-name">{colorName}</h1>
            <span className={styles.rarity} style={cssVars({ '--p': rarityColor })}>
              {rarityLabel}
            </span>
          </div>
          <div className={styles.sub}>
            {family} · <span className="num">{pct}%</span> of all registry builds
          </div>
          {aliases.length > 0 && (
            <div className={styles.alias}>
              Also known as: <span className={styles.aliasNames}>{aliases.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stat tiles */}
      <div className={styles.tiles}>
        {statTiles.map(({ label, value, color }) => (
          <div key={label} className={`card ${styles.tile}`} style={cssVars({ '--p': color })}>
            <div className={`${styles.tileValue} num`}>{value}</div>
            <div className={styles.tileLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Mini charts row */}
      <div className={styles.charts}>
        {/* Year distribution — simple inline bar chart (no Recharts, SSR safe) */}
        <div className={`card ${styles.chartCard}`}>
          <div className={`label ${styles.chartTitle}`}>By Year</div>
          {yearData.length === 0 ? (
            <p className={styles.noData}>No data</p>
          ) : (
            <div className={styles.yearList}>
              {yearData.map(([year, count]) => (
                <div key={year} className={styles.yearRow}>
                  <span className={`${styles.yearLabel} mono`}>{year}</span>
                  <div className={styles.track}>
                    <div className={styles.fill} style={cssVars({ '--w': `${(count / maxYearCount) * 100}%` })} />
                  </div>
                  <span className={`${styles.yearCount} mono`}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drivetrain split */}
        <div className={`card ${styles.chartCard}`}>
          <div className={`label ${styles.chartTitle}`}>Drivetrain</div>
          <div className={styles.dtList}>
            {drivetrainRows.map(({ label, count, color }) => {
              const pctDt = totalBuilds > 0 ? Math.round((count / totalBuilds) * 100) : 0;
              return (
                <div key={label}>
                  <div className={styles.dtHead}>
                    <span className={styles.dtName}>{label}</span>
                    <span className={`${styles.dtCount} num`}>{count} ({pctDt}%)</span>
                  </div>
                  <div className={styles.dtTrack}>
                    <div className={styles.fill} style={cssVars({ '--w': `${pctDt}%`, '--p': color })} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Build list */}
      {colorEntries.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          No builds with this color yet. <Link href="/submit" className="link">Submit yours →</Link>
        </div>
      ) : (
        <div>
          <h2 className={`label ${styles.buildsTitle}`}>
            All Builds ({totalBuilds})
          </h2>
          <div className={styles.builds}>
            {colorEntries.map((e) => {
              const location = [e.location_city, e.location_state, e.location_country].filter(Boolean).join(', ');
              return (
                <div key={e.id} className={styles.row}>
                  <div className={styles.rowBody}>
                    <div className={styles.rowMain}>
                      {e.model_year} {e.body_style}{e.competition ? ' Competition' : ''} · {e.drivetrain} · {e.transmission}
                    </div>
                    <div className={styles.rowDetail}>
                      {[
                        e.interior_color,
                        (e.interior_seats || e.interior_leather)
                          ? `(${[e.interior_seats, e.interior_leather ? `${e.interior_leather} Leather` : null].filter(Boolean).join(', ')})`
                          : e.interior_type ? `(${e.interior_type})` : null,
                      ].filter(Boolean).join(' ')}
                      {e.wheels && ` · ${e.wheels}`}
                      {location && ` · ${location}`}
                    </div>
                  </div>
                  {e.forum_username && (
                    <div className={styles.rowUser}>
                      {e.source_forum ? <span className={styles.rowForum}>[{e.source_forum}] </span> : null}
                      {e.forum_username}
                    </div>
                  )}
                  <div className={`${styles.rowDate} mono`}>
                    {new Date(e.posted_at ?? e.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                  </div>
                  <FlagButton id={e.id} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
