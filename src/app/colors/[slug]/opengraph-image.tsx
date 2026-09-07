import { ImageResponse } from 'next/og';
import { getEntriesByColor, resolveColorSlug } from '../../../lib/queries';
import { computeRarityLabel } from '../../../lib/analytics';
import { getColorHex, canonicalColorName } from '../../../lib/colors';

export const alt = 'BMW M Individual Colors Registry';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveColorSlug(slug);
  const colorName = resolved ? canonicalColorName(resolved) : slug;
  const hex = getColorHex(colorName);
  const entries = await getEntriesByColor(colorName);
  const totalBuilds = entries.length;
  const rarityLabel = computeRarityLabel(totalBuilds);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070d14',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: hex,
            border: '6px solid #2d3f55',
            boxShadow: `0 0 80px ${hex}66`,
            marginBottom: 40,
            display: 'flex',
          }}
        />
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#e2e8f0',
            marginBottom: 16,
            display: 'flex',
          }}
        >
          {colorName}
        </div>
        <div
          style={{
            fontSize: 30,
            color: '#94a3b8',
            marginBottom: 48,
            display: 'flex',
          }}
        >
          {totalBuilds} build{totalBuilds === 1 ? '' : 's'} · {rarityLabel}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {['#1C69D4', '#862086', '#E8002D'].map((stripeColor) => (
            <div
              key={stripeColor}
              style={{ width: 10, height: 28, background: stripeColor, borderRadius: 3, display: 'flex' }}
            />
          ))}
          <span style={{ fontSize: 24, fontWeight: 700, color: '#64748b', marginLeft: 12 }}>
            BMW M Individual Colors Registry
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
