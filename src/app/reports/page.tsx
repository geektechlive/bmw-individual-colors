import Link from 'next/link';
import { getEntries, getColorCounts, getModelYearMatrix, getInteriorCounts, getLocationEntries } from '../../lib/queries';
import ColorDonut from '../../components/charts/ColorDonut';
import ColorTreemap from '../../components/charts/ColorTreemap';
import ColorMatrix from '../../components/charts/ColorMatrix';
import LocationMap from '../../components/charts/LocationMap';
import InteriorBar from '../../components/charts/InteriorBar';
import ModelBreakdown from '../../components/charts/ModelBreakdown';
import YearTrend from '../../components/charts/YearTrend';
import ColorInteriorMatrix from '../../components/charts/ColorInteriorMatrix';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports — BMW Individual Colors Registry',
};

export const dynamic = 'force-dynamic';

const cardStyle: React.CSSProperties = {
  background: '#0f1923',
  border: '1px solid #2d3f55',
  borderRadius: 12,
  padding: '1.5rem',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: '#e2e8f0',
  marginBottom: 4,
};

const cardDescStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#64748b',
  marginBottom: 20,
};

export default async function ReportsPage() {
  const [entries, colorCounts, matrixData, interiorCounts, locationEntries] = await Promise.all([
    getEntries(),
    getColorCounts(),
    getModelYearMatrix(),
    getInteriorCounts(),
    getLocationEntries(),
  ]);

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: '#1C69D4', textDecoration: 'none', fontSize: 14 }}>
          ← Home
        </Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>
        Reports &amp; Analytics
      </h1>
      <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 32 }}>
        Visual breakdowns of {entries.length} BMW M Individual color builds in the registry.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(560px, 1fr))',
          gap: 24,
        }}
      >
        {/* Color Distribution Donut */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Color Distribution</div>
          <div style={cardDescStyle}>Top 20 Individual colors by build count</div>
          <ColorDonut data={colorCounts} />
        </div>

        {/* Color Treemap */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Color Treemap</div>
          <div style={cardDescStyle}>Size proportional to count — filled with actual BMW color</div>
          <ColorTreemap data={colorCounts} />
        </div>

        {/* Model Breakdown — full width */}
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={cardTitleStyle}>Model, Drivetrain &amp; Transmission Breakdown</div>
          <div style={cardDescStyle}>Split by body style (M3/M4), drivetrain, and transmission</div>
          <ModelBreakdown entries={entries} />
        </div>

        {/* Year Trend — full width */}
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={cardTitleStyle}>Color Popularity by Model Year</div>
          <div style={cardDescStyle}>Top 8 colors tracked across model years</div>
          <YearTrend entries={entries} />
        </div>

        {/* Interior Bar */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Interior Colors</div>
          <div style={cardDescStyle}>Frequency of interior color selections</div>
          <InteriorBar data={interiorCounts} />
        </div>

        {/* Color-Interior Heatmap */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Color × Interior Heatmap</div>
          <div style={cardDescStyle}>Top 15 exterior × top 8 interior color combinations</div>
          <ColorInteriorMatrix entries={entries} />
        </div>

        {/* Color-Year Matrix — full width */}
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={cardTitleStyle}>Color × Year × Drivetrain Matrix</div>
          <div style={cardDescStyle}>Detailed breakdown of each color by year, model, and drivetrain</div>
          <ColorMatrix data={matrixData} />
        </div>

        {/* Location Map — full width */}
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={cardTitleStyle}>Global Distribution Map</div>
          <div style={cardDescStyle}>
            {locationEntries.length} builds with location data — markers colored by Individual color
          </div>
          <LocationMap entries={locationEntries} />
        </div>
      </div>
    </main>
  );
}
