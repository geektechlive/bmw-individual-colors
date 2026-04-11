import Link from 'next/link';
import { getEntries, computeStats, computeColorCounts } from '../lib/queries';
import { getColorHex, colorToSlug } from '../lib/colors';
import ColorTreemapLoader from '../components/charts/ColorTreemapLoader';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BMW M Individual Colors Registry',
  description: 'Community-driven registry tracking BMW M3 and M4 Individual color builds.',
};

export default async function HomePage() {
  const entries = await getEntries();
  const stats = computeStats(entries);
  const latest8 = entries.slice(0, 8);

  // Insight tile computations
  const colorCounts = computeColorCounts(entries);
  const topColor = colorCounts[0];

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

  return (
    <main>
      {/* Hero */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0a0f1a 0%, #0f1923 50%, #0a1220 100%)',
          borderBottom: '3px solid transparent',
          borderImage: 'linear-gradient(to right, #1C69D4, #862086, #E8002D) 1',
          padding: '4rem 1.5rem 3rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 14px',
              background: 'rgba(28,105,212,0.15)',
              border: '1px solid rgba(28,105,212,0.3)',
              borderRadius: 20,
              color: '#1C69D4',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            Community Registry
          </div>
          <h1
            style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 900,
              color: '#f1f5f9',
              lineHeight: 1.15,
              marginBottom: 16,
              letterSpacing: '-0.02em',
            }}
          >
            BMW M Individual<br />Colors Registry
          </h1>
          <p
            style={{
              fontSize: 17,
              color: '#94a3b8',
              lineHeight: 1.6,
              maxWidth: 520,
              margin: '0 auto 36px',
            }}
          >
            Track and explore BMW M3 and M4 Individual paint color builds from the M community.
            Discover which colors are out there and where.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/submit"
              style={{
                padding: '12px 28px',
                background: '#1C69D4',
                color: '#ffffff',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Submit Your Build
            </Link>
            <Link
              href="/entries"
              style={{
                padding: '12px 28px',
                background: 'transparent',
                color: '#e2e8f0',
                border: '1px solid #2d3f55',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Browse All Entries
            </Link>
            <Link
              href="/reports"
              style={{
                padding: '12px 28px',
                background: 'transparent',
                color: '#e2e8f0',
                border: '1px solid #2d3f55',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              View Reports →
            </Link>
          </div>
        </div>
      </section>

      {/* Color Treemap */}
      <section style={{ background: '#0a0f1a', padding: '0 1.5rem 1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #1e2a3a' }}>
            <ColorTreemapLoader data={computeColorCounts(entries).slice(0, 30)} />
          </div>
        </div>
      </section>

      {/* Stat Strip */}
      <section
        style={{
          background: '#0f1923',
          borderBottom: '1px solid #1e2a3a',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
          }}
        >
          {[
            { label: 'Total Builds',        value: stats.totalEntries,  color: '#1C69D4' },
            { label: 'Individual Colors',   value: stats.totalColors,   color: '#862086' },
            { label: 'Countries / Regions', value: stats.totalCountries, color: '#E8002D' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '1rem' }}>
              <div
                style={{
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  fontWeight: 900,
                  color,
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {value}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Insight strip */}
      <section style={{ background: '#0f1923', borderBottom: '1px solid #1e2a3a', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
          {insightTiles.map(({ label, value, sub, hex }) => (
            <div key={label} style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                {hex && <div style={{ width: 14, height: 14, borderRadius: '50%', background: hex, border: '1px solid #2d3f55', flexShrink: 0 }} />}
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{value}</div>
              </div>
              {sub && <div style={{ fontSize: 11, color: '#475569' }}>{sub}</div>}
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Latest 8 Submissions */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
            Latest Submissions
          </h2>
          <Link
            href="/entries"
            style={{ color: '#1C69D4', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}
          >
            View all →
          </Link>
        </div>

        {latest8.length === 0 ? (
          <div
            style={{
              background: '#0f1923',
              border: '1px solid #2d3f55',
              borderRadius: 12,
              padding: '3rem',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            No builds yet. Be the first to{' '}
            <Link href="/submit" style={{ color: '#1C69D4', textDecoration: 'none' }}>
              submit yours
            </Link>
            !
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {latest8.map((e) => {
                const hex = getColorHex(e.ext_color);
                const location = [e.location_city, e.location_state, e.location_country]
                  .filter(Boolean)
                  .join(', ');

                return (
                  <div
                    key={e.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      background: `${hex}12`,
                      border: '1px solid #2d3f55',
                      borderLeft: `4px solid ${hex}`,
                      borderRadius: 10,
                      padding: '14px 20px',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: hex,
                        border: '2px solid #2d3f55',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/colors/${colorToSlug(e.ext_color)}`} style={{ textDecoration: 'none' }}>
                        <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{e.ext_color}</div>
                      </Link>
                      <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
                        {e.model_year} {e.body_style}
                        {e.competition ? ' Competition' : ''} · {e.drivetrain} · {e.transmission}
                        {location ? ` · ${location}` : ''}
                      </div>
                    </div>
                    {e.forum_username && (
                      <div style={{ color: '#475569', fontSize: 12, flexShrink: 0 }}>
                        {e.forum_username}
                      </div>
                    )}
                    <div style={{ color: '#374151', fontSize: 11, flexShrink: 0 }}>
                      {new Date(e.created_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
              <Link href="/entries" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                Browse all entries →
              </Link>
              <Link href="/colors" style={{ color: '#1C69D4', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                Explore all colors →
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
