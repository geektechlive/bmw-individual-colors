import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { getEntriesByColor, getEntries, resolveColorSlug } from '../../../lib/queries';
import { computeRarityLabel, computeColorCounts } from '../../../lib/analytics';
import { getColorHex, getColorFamily, isLightColor, COLOR_ALIASES, aliasRedirectSlug, canonicalColorName, colorToSlug } from '../../../lib/colors';
import { readablePaint, paintSurfaces } from '../../../lib/paint-accent';
import { rankOf, paintSummary } from '../../../lib/paint-summary';
import FlagButton from '../../../components/FlagButton';
import PaintSwatch from '../../../components/PaintSwatch';
import type { Metadata } from 'next';
import { cssVars } from '../../../lib/css-vars';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

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

  // Readable form of the paint for text, bars and the pill (#45, ADR 0016 rule 6).
  // The swatch keeps the paint's own hex.
  const paintInk = readablePaint(hex, paintSurfaces(hex));

  const colorCounts = computeColorCounts(allEntries);
  const rank = rankOf(colorCounts, colorName);
  const summary = paintSummary(colorCounts, colorName);

  const countBy = (pick: (e: (typeof colorEntries)[number]) => string) =>
    colorEntries.reduce<Record<string, number>>((acc, e) => ({ ...acc, [pick(e)]: (acc[pick(e)] ?? 0) + 1 }), {});
  const bodies = countBy((e) => e.body_style);
  const gearboxes = countBy((e) => e.transmission);
  const drives = countBy((e) => e.drivetrain);
  const countries = new Set(colorEntries.map((e) => e.location_country).filter(Boolean)).size;

  const years = colorEntries.map((e) => e.model_year);
  const minYear = years.length ? Math.min(...years) : null;
  const maxYear = years.length ? Math.max(...years) : null;
  const yearRange = minYear === null ? null : minYear === maxYear ? `MY ${minYear}` : `MY ${minYear}–${maxYear}`;

  // Spec tag: the build-sheet line under the name. Only parts with data are shown.
  const specTag = [
    yearRange,
    [bodies.M3 ? `M3 ${bodies.M3}` : null, bodies.M4 ? `M4 ${bodies.M4}` : null].filter(Boolean).join(' · '),
    Object.entries(gearboxes).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(' · '),
    Object.entries(drives).sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d} ${n}`).join(' · '),
  ].filter((s): s is string => Boolean(s));

  const yearData = Object.entries(countBy((e) => String(e.model_year))).sort((a, b) => Number(a[0]) - Number(b[0]));
  const maxYearCount = Math.max(0, ...yearData.map(([, c]) => c));
  const driveSplit = Object.entries(drives).sort((a, b) => b[1] - a[1]);

  // Aliases: any alternate names that map to this canonical color.
  const aliases = Object.entries(COLOR_ALIASES)
    .filter(([, canonical]) => canonical === colorName)
    .map(([alias]) => alias);

  return (
    <main className={styles.page} style={cssVars({ '--p': hex, '--paint-ink': paintInk })}>
      <section className={styles.hero} aria-labelledby="paint-name">
        <div className={styles.heroText}>
          <nav aria-label="Breadcrumb" className={styles.crumbs}>
            <Link href="/colors">Colors</Link>
            <span aria-hidden="true">/</span>
            <span>{family}</span>
          </nav>
          <h1 id="paint-name" className={`paint-name ${styles.name}`}>{colorName}</h1>
          {specTag.length > 0 && (
            <p className={styles.tag}>
              {specTag.map((part) => <span key={part}>{part}</span>)}
            </p>
          )}
          {summary && <p className={styles.lede}>{summary}</p>}
          {aliases.length > 0 && (
            <p className={styles.alias}>
              Also known as <span className={styles.aliasNames}>{aliases.join(', ')}</span>
            </p>
          )}
        </div>

        <div className={styles.cove} aria-hidden="true">
          <div className={styles.lamp} />
          <div className={`${styles.spray} ${isLightColor(hex) ? styles.sprayLight : ''}`}>
            <PaintSwatch name={colorName} hex={hex} size="fill" />
            <div className={styles.sprayLabel}>
              <span>{colorName}</span>
              <span>BMW Individual</span>
            </div>
            <div className={styles.sprayHide} />
          </div>
        </div>
      </section>

      <dl className={styles.tiles}>
        <div>
          <dt className="label">Builds</dt>
          <dd className="num">{totalBuilds}</dd>
        </div>
        <div>
          <dt className="label">Rank</dt>
          <dd className="num">{rank ? `#${rank} of ${colorCounts.length}` : '–'}</dd>
        </div>
        <div>
          <dt className="label">Countries</dt>
          <dd className="num">{countries}</dd>
        </div>
        <div>
          <dt className="label">Rarity</dt>
          <dd><span className={styles.pill}>{rarityLabel}</span></dd>
        </div>
      </dl>

      {totalBuilds > 0 && (
        <div className={styles.charts}>
          <section aria-labelledby="by-year">
            <h2 id="by-year" className={styles.chartTitle}>Builds by model year</h2>
            <ul className={styles.bars}>
              {yearData.map(([year, count]) => (
                <li key={year} className={styles.bar}>
                  <span>{year}</span>
                  <i style={cssVars({ '--w': `${(count / maxYearCount) * 100}%` })} />
                  <span>{count}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="by-drive">
            <h2 id="by-drive" className={styles.chartTitle}>Drivetrain</h2>
            <div className={styles.split}>
              {driveSplit.map(([drive, count]) => (
                <div key={drive} style={cssVars({ '--n': count })}>
                  {drive} {count}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Build list */}
      {colorEntries.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          No builds with this color yet. <Link href="/submit" className="link">Submit yours →</Link>
        </div>
      ) : (
        <div className={styles.buildList}>
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
                        [
                          e.interior_color,
                          (e.interior_seats || e.interior_leather)
                            ? `(${[e.interior_seats, e.interior_leather ? `${e.interior_leather} Leather` : null].filter(Boolean).join(', ')})`
                            : e.interior_type ? `(${e.interior_type})` : null,
                        ].filter(Boolean).join(' '),
                        e.wheels,
                        location,
                      ].filter(Boolean).join(' · ')}
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
