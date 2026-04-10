import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEntriesByColor, getEntries, computeRarityLabel, computeRarityColor } from '../../../lib/queries';
import { slugToColor, getColorHex, getColorFamily } from '../../../lib/colors';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const colorName = slugToColor(slug);
  if (!colorName) return { title: 'Color Not Found' };
  return { title: `${colorName} — BMW M Individual Colors Registry` };
}

export default async function ColorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const colorName = slugToColor(slug);
  if (!colorName) notFound();

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

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: '#64748b' }}>
        <Link href="/" style={{ color: '#1C69D4', textDecoration: 'none' }}>Home</Link>
        <span>›</span>
        <Link href="/colors" style={{ color: '#1C69D4', textDecoration: 'none' }}>Colors</Link>
        <span>›</span>
        <span style={{ color: '#94a3b8' }}>{colorName}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: hex, border: '3px solid #2d3f55', flexShrink: 0, boxShadow: `0 0 24px ${hex}40` }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>{colorName}</h1>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${rarityColor}22`, color: rarityColor, border: `1px solid ${rarityColor}44` }}>
              {rarityLabel}
            </span>
          </div>
          <div style={{ fontSize: 14, color: '#64748b' }}>
            {family} · {pct}% of all registry builds
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Builds', value: totalBuilds, color: '#1C69D4' },
          { label: 'M3 / M4', value: `${m3Count} / ${m4Count}`, color: '#862086' },
          { label: 'Countries', value: countries, color: '#E8002D' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0f1923', border: '1px solid #2d3f55', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Mini charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Year distribution — simple inline bar chart (no Recharts, SSR safe) */}
        <div style={{ background: '#0f1923', border: '1px solid #2d3f55', borderRadius: 10, padding: '16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>By Year</div>
          {yearData.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 13 }}>No data</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {yearData.map(([year, count]) => {
                const maxCount = Math.max(...yearData.map(([, c]) => c));
                return (
                  <div key={year} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#64748b', width: 36, flexShrink: 0 }}>{year}</span>
                    <div style={{ flex: 1, background: '#1e2a3a', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${(count / maxCount) * 100}%`, height: '100%', background: hex, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#94a3b8', width: 20, textAlign: 'right', flexShrink: 0 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drivetrain split */}
        <div style={{ background: '#0f1923', border: '1px solid #2d3f55', borderRadius: 10, padding: '16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Drivetrain</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'RWD', count: rwdCount, color: '#E8002D' },
              { label: 'AWD', count: awdCount, color: '#1C69D4' },
            ].map(({ label, count, color }) => {
              const pctDt = totalBuilds > 0 ? Math.round((count / totalBuilds) * 100) : 0;
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{label}</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{count} ({pctDt}%)</span>
                  </div>
                  <div style={{ background: '#1e2a3a', borderRadius: 4, height: 8 }}>
                    <div style={{ width: `${pctDt}%`, height: '100%', background: color, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Build list */}
      {colorEntries.length === 0 ? (
        <div style={{ background: '#0f1923', border: '1px solid #2d3f55', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          No builds with this color yet. <Link href="/submit" style={{ color: '#1C69D4', textDecoration: 'none' }}>Submit yours →</Link>
        </div>
      ) : (
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            All Builds ({totalBuilds})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {colorEntries.map((e) => {
              const location = [e.location_city, e.location_state, e.location_country].filter(Boolean).join(', ');
              return (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: `${hex}12`,
                  border: '1px solid #2d3f55',
                  borderLeft: `4px solid ${hex}`,
                  borderRadius: 10,
                  padding: '14px 20px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>
                      {e.model_year} {e.body_style}{e.competition ? ' Competition' : ''} · {e.drivetrain} · {e.transmission}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>
                      {[e.interior_color, e.interior_type && `(${e.interior_type})`].filter(Boolean).join(' ')}
                      {e.wheels && ` · ${e.wheels}`}
                      {location && ` · ${location}`}
                    </div>
                  </div>
                  {e.forum_username && (
                    <div style={{ color: '#94a3b8', fontSize: 12, flexShrink: 0 }}>
                      {e.source_forum ? <span style={{ color: '#64748b' }}>[{e.source_forum}] </span> : null}
                      {e.forum_username}
                    </div>
                  )}
                  <div style={{ color: '#64748b', fontSize: 11, flexShrink: 0 }}>
                    {new Date(e.posted_at ?? e.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
