import Link from 'next/link';
import { getEntries, computeColorCounts } from '../../lib/queries';
import { getColorFamily, colorToSlug, isLightColor } from '../../lib/colors';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'All Colors — BMW M Individual Colors Registry' };

export default async function ColorsPage() {
  const entries = await getEntries();
  const colorCounts = computeColorCounts(entries);

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: '#1C69D4', textDecoration: 'none', fontSize: 14 }}>← Home</Link>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>Individual Colors</h1>
      <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 32 }}>
        {colorCounts.length} colors across {entries.length} builds in the registry.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {colorCounts.map(({ color, count, hex }) => {
          const slug = colorToSlug(color);
          const family = getColorFamily(color);
          const light = isLightColor(hex);
          return (
            <Link key={color} href={`/colors/${slug}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: hex,
                borderRadius: 10,
                padding: '20px 16px 14px',
                height: 110,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                border: '1px solid rgba(0,0,0,0.2)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                cursor: 'pointer',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: light ? '#1a1a1a' : '#ffffff', lineHeight: 1.3, marginBottom: 3 }}>
                  {color}
                </div>
                <div style={{ fontSize: 11, color: light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)' }}>
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
