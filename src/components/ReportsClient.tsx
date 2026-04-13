'use client';

import React, { useState, useMemo, startTransition } from 'react';
import dynamic from 'next/dynamic';
import type { BmwEntry } from '../types';
import {
  computeColorCounts,
  computeModelYearMatrix,
  computeInteriorCounts,
  computeRegistryGrowth,
  computeColorFamilyByYear,
  computeCompetitionAdoption,
  computeWheelCounts,
} from '../lib/queries';

import ColorMatrix from './charts/ColorMatrix';
import ColorInteriorMatrix from './charts/ColorInteriorMatrix';
import DrivetrainMatrix from './charts/DrivetrainMatrix';

const chartSkeleton = () => (
  <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
);

const ColorDonut = dynamic(() => import('./charts/ColorDonut'), { ssr: false, loading: chartSkeleton });
const ColorTreemapLoader = dynamic(() => import('./charts/ColorTreemapLoader'), { ssr: false, loading: chartSkeleton });
const InteriorBar = dynamic(() => import('./charts/InteriorBar'), { ssr: false, loading: chartSkeleton });
const ModelBreakdown = dynamic(() => import('./charts/ModelBreakdown'), { ssr: false, loading: chartSkeleton });
const YearTrend = dynamic(() => import('./charts/YearTrend'), { ssr: false, loading: chartSkeleton });
const RegistryGrowth = dynamic(() => import('./charts/RegistryGrowth'), { ssr: false, loading: chartSkeleton });
const CompetitionAdoption = dynamic(() => import('./charts/CompetitionAdoption'), { ssr: false, loading: chartSkeleton });
const ColorFamilyTrends = dynamic(() => import('./charts/ColorFamilyTrends'), { ssr: false, loading: chartSkeleton });
const WheelBar = dynamic(() => import('./charts/WheelBar'), { ssr: false, loading: chartSkeleton });

interface Props {
  entries: BmwEntry[];
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid',
    borderColor: active ? '#1C69D4' : '#2d3f55',
    background: active ? 'rgba(28,105,212,0.2)' : '#1e2a3a',
    color: active ? '#e2e8f0' : '#94a3b8',
  };
}

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

export default function ReportsClient({ entries }: Props) {
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedBodyStyles, setSelectedBodyStyles] = useState<string[]>([]);
  const [selectedDrivetrains, setSelectedDrivetrains] = useState<string[]>([]);

  const allYears = useMemo(
    () => [...new Set(entries.map((e) => e.model_year))].sort(),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedYears.length && !selectedYears.includes(e.model_year)) return false;
      if (selectedBodyStyles.length && !selectedBodyStyles.includes(e.body_style)) return false;
      if (selectedDrivetrains.length && !selectedDrivetrains.includes(e.drivetrain)) return false;
      return true;
    });
  }, [entries, selectedYears, selectedBodyStyles, selectedDrivetrains]);

  const colorCounts = useMemo(() => computeColorCounts(filteredEntries), [filteredEntries]);
  const matrixData = useMemo(() => computeModelYearMatrix(filteredEntries), [filteredEntries]);
  const interiorCounts = useMemo(() => computeInteriorCounts(filteredEntries), [filteredEntries]);
  const wheelCounts = useMemo(() => computeWheelCounts(filteredEntries), [filteredEntries]);
  const growthData = useMemo(() => computeRegistryGrowth(entries), [entries]);
  const familyTrendData = useMemo(() => computeColorFamilyByYear(filteredEntries), [filteredEntries]);
  const competitionData = useMemo(() => computeCompetitionAdoption(filteredEntries), [filteredEntries]);

  const hasFilters = selectedYears.length > 0 || selectedBodyStyles.length > 0 || selectedDrivetrains.length > 0;

  return (
    <>
      <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
        Visual breakdowns of{' '}
        {hasFilters ? (
          <>
            <strong style={{ color: '#e2e8f0' }}>{filteredEntries.length}</strong>
            {' '}(filtered from {entries.length})
          </>
        ) : (
          <strong style={{ color: '#e2e8f0' }}>{entries.length}</strong>
        )}{' '}
        BMW M Individual color builds in the registry.
      </p>

      {/* Filter bar */}
      <div
        style={{
          background: '#0f1923',
          border: '1px solid #2d3f55',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 24px',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              color: '#64748b',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Year
          </span>
          {allYears.map((year) => (
            <button
              key={year}
              onClick={() => startTransition(() => setSelectedYears(toggle(selectedYears, year)))}
              style={chipStyle(selectedYears.includes(year))}
            >
              {year}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              color: '#64748b',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Model
          </span>
          {['M3', 'M4'].map((bs) => (
            <button
              key={bs}
              onClick={() => startTransition(() => setSelectedBodyStyles(toggle(selectedBodyStyles, bs)))}
              style={chipStyle(selectedBodyStyles.includes(bs))}
            >
              {bs}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              color: '#64748b',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Drive
          </span>
          {['RWD', 'AWD'].map((dt) => (
            <button
              key={dt}
              onClick={() => startTransition(() => setSelectedDrivetrains(toggle(selectedDrivetrains, dt)))}
              style={chipStyle(selectedDrivetrains.includes(dt))}
            >
              {dt}
            </button>
          ))}
        </div>
        {hasFilters ? (
          <button
            onClick={() => startTransition(() => {
              setSelectedYears([]);
              setSelectedBodyStyles([]);
              setSelectedDrivetrains([]);
            })}
            style={{
              fontSize: 12,
              color: '#64748b',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* Section jump nav */}
      <nav
        style={{
          position: 'sticky',
          top: 52,
          zIndex: 40,
          background: '#070d14',
          paddingBottom: 12,
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Distribution', href: '#distribution' },
            { label: 'Growth', href: '#growth' },
            { label: 'Models', href: '#models' },
            { label: 'Trends', href: '#trends' },
            { label: 'Interiors', href: '#interiors' },
            { label: 'Matrix', href: '#matrix' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                padding: '4px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
                color: '#94a3b8',
                background: '#1e2a3a',
                border: '1px solid #2d3f55',
                textDecoration: 'none',
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* Chart grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(560px, 1fr))',
          gap: 24,
        }}
      >
        {/* Registry Growth — full width */}
        <div id="growth" style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={cardTitleStyle}>Registry Growth</div>
          <div style={cardDescStyle}>Cumulative builds added to the registry over time</div>
          <RegistryGrowth data={growthData} />
        </div>

        {/* Color Distribution Donut */}
        <div id="distribution" style={cardStyle}>
          <div style={cardTitleStyle}>Color Distribution</div>
          <div style={cardDescStyle}>Top 20 Individual colors by build count</div>
          <ColorDonut data={colorCounts} />
        </div>

        {/* Color Treemap */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Color Treemap</div>
          <div style={cardDescStyle}>Size proportional to count — filled with actual BMW color</div>
          <ColorTreemapLoader data={colorCounts} />
        </div>

        {/* Model Breakdown — full width */}
        <div id="models" style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={cardTitleStyle}>Model, Drivetrain &amp; Transmission Breakdown</div>
          <div style={cardDescStyle}>Split by body style (M3/M4), drivetrain, and transmission</div>
          <ModelBreakdown entries={filteredEntries} />
        </div>

        {/* Competition Adoption */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Competition Package Adoption</div>
          <div style={cardDescStyle}>% of M3 and M4 builds with Competition package by year</div>
          <CompetitionAdoption data={competitionData} />
        </div>

        {/* Drivetrain Matrix */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Drivetrain &amp; Transmission Mix</div>
          <div style={cardDescStyle}>Breakdown of RWD/AWD × Manual/Auto combinations</div>
          <DrivetrainMatrix entries={filteredEntries} />
        </div>

        {/* Year Trend — full width */}
        <div id="trends" style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={cardTitleStyle}>Color Popularity by Model Year</div>
          <div style={cardDescStyle}>Top 8 colors tracked across model years</div>
          <YearTrend entries={filteredEntries} />
        </div>

        {/* Color Family Trends — full width */}
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={cardTitleStyle}>Color Family Trends by Year</div>
          <div style={cardDescStyle}>Stacked breakdown of color families across model years</div>
          <ColorFamilyTrends data={familyTrendData} />
        </div>

        {/* Interior Bar */}
        <div id="interiors" style={cardStyle}>
          <div style={cardTitleStyle}>Interior Colors</div>
          <div style={cardDescStyle}>Frequency of interior color selections</div>
          <InteriorBar data={interiorCounts} />
        </div>

        {/* Wheel Bar */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Wheel Popularity</div>
          <div style={cardDescStyle}>Most common wheel packages in the registry</div>
          <WheelBar data={wheelCounts} />
        </div>

        {/* Color-Interior Heatmap */}
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={cardTitleStyle}>Color × Interior Heatmap</div>
          <div style={cardDescStyle}>Top 15 exterior × top 8 interior color combinations</div>
          <ColorInteriorMatrix entries={filteredEntries} />
        </div>

        {/* Color-Year Matrix — full width */}
        <div id="matrix" style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={cardTitleStyle}>Color × Year × Drivetrain Matrix</div>
          <div style={cardDescStyle}>Detailed breakdown of each color by year, model, and drivetrain</div>
          <ColorMatrix data={matrixData} />
        </div>

      </div>
    </>
  );
}
