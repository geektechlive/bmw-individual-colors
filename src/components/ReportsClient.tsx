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
} from '../lib/analytics';

import styles from './ReportsClient.module.css';
import ColorMatrix from './charts/ColorMatrix';
import ColorInteriorMatrix from './charts/ColorInteriorMatrix';
import DrivetrainMatrix from './charts/DrivetrainMatrix';

const chartSkeleton = () => (
  <div className="skeleton skeleton--chart" aria-hidden="true" />
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

interface ChartCardProps {
  id?: string;
  full?: boolean;
  title: string;
  desc: string;
  children: React.ReactNode;
}

function ChartCard({ id, full, title, desc, children }: ChartCardProps) {
  const className = `card ${styles.card}${full ? ` ${styles.full}` : ''}`;
  return (
    <div id={id} className={className}>
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardDesc}>{desc}</div>
      {children}
    </div>
  );
}

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
      <p className={`muted ${styles.intro}`}>
        Visual breakdowns of{' '}
        {hasFilters ? (
          <>
            <strong>{filteredEntries.length}</strong>
            {' '}(filtered from {entries.length})
          </>
        ) : (
          <strong>{entries.length}</strong>
        )}{' '}
        BMW M Individual color builds in the registry.
      </p>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className="label">Year</span>
          {allYears.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => startTransition(() => setSelectedYears(toggle(selectedYears, year)))}
              className="chip"
              aria-pressed={selectedYears.includes(year)}
            >
              {year}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className="label">Model</span>
          {['M3', 'M4'].map((bs) => (
            <button
              key={bs}
              type="button"
              onClick={() => startTransition(() => setSelectedBodyStyles(toggle(selectedBodyStyles, bs)))}
              className="chip"
              aria-pressed={selectedBodyStyles.includes(bs)}
            >
              {bs}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className="label">Drive</span>
          {['RWD', 'AWD'].map((dt) => (
            <button
              key={dt}
              type="button"
              onClick={() => startTransition(() => setSelectedDrivetrains(toggle(selectedDrivetrains, dt)))}
              className="chip"
              aria-pressed={selectedDrivetrains.includes(dt)}
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
            className={styles.clear}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* Section jump nav */}
      <nav className={styles.jumpNav}>
        <div className={styles.jumpList}>
          {[
            { label: 'Distribution', href: '#distribution' },
            { label: 'Growth', href: '#growth' },
            { label: 'Models', href: '#models' },
            { label: 'Trends', href: '#trends' },
            { label: 'Interiors', href: '#interiors' },
            { label: 'Matrix', href: '#matrix' },
          ].map(({ label, href }) => (
            <a key={label} href={href} className={styles.jump}>
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* Chart grid */}
      <div className={styles.grid}>
        <ChartCard id="growth" full title="Registry Growth" desc="Cumulative builds added to the registry over time">
          <RegistryGrowth data={growthData} />
        </ChartCard>

        <ChartCard id="distribution" title="Color Distribution" desc="Top 20 Individual colors by build count">
          <ColorDonut data={colorCounts} />
        </ChartCard>

        <ChartCard title="Color Treemap" desc="Size proportional to count — filled with actual BMW color">
          <ColorTreemapLoader data={colorCounts} />
        </ChartCard>

        <ChartCard
          id="models"
          full
          title="Model, Drivetrain & Transmission Breakdown"
          desc="Split by body style (M3/M4), drivetrain, and transmission"
        >
          <ModelBreakdown entries={filteredEntries} />
        </ChartCard>

        <ChartCard
          title="Competition Package Adoption"
          desc="% of M3 and M4 builds with Competition package by year"
        >
          <CompetitionAdoption data={competitionData} />
        </ChartCard>

        <ChartCard
          title="Drivetrain & Transmission Mix"
          desc="Breakdown of RWD/AWD × Manual/Auto combinations"
        >
          <DrivetrainMatrix entries={filteredEntries} />
        </ChartCard>

        <ChartCard id="trends" full title="Color Popularity by Model Year" desc="Top 8 colors tracked across model years">
          <YearTrend entries={filteredEntries} />
        </ChartCard>

        <ChartCard
          full
          title="Color Family Trends by Year"
          desc="Stacked breakdown of color families across model years"
        >
          <ColorFamilyTrends data={familyTrendData} />
        </ChartCard>

        <ChartCard id="interiors" title="Interior Colors" desc="Frequency of interior color selections">
          <InteriorBar data={interiorCounts} />
        </ChartCard>

        <ChartCard title="Wheel Popularity" desc="Most common wheel packages in the registry">
          <WheelBar data={wheelCounts} />
        </ChartCard>

        <ChartCard
          full
          title="Color × Interior Heatmap"
          desc="Top 15 exterior × top 8 interior color combinations"
        >
          <ColorInteriorMatrix entries={filteredEntries} />
        </ChartCard>

        <ChartCard
          id="matrix"
          full
          title="Color × Year × Drivetrain Matrix"
          desc="Detailed breakdown of each color by year, model, and drivetrain"
        >
          <ColorMatrix data={matrixData} />
        </ChartCard>
      </div>
    </>
  );
}
