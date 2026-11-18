'use client';

import React, { useState, useMemo, startTransition } from 'react';
import dynamic from 'next/dynamic';
import type { BmwEntry } from '../types';
import {
  computeColorCounts,
  computeRegistryGrowth,
  computeWheelCounts,
} from '../lib/analytics';
import {
  rankedSummary,
  shareSummary,
  modelSummary,
  trendSummary,
  growthSummary,
} from '../lib/report-summaries';

import styles from './ReportsClient.module.css';
import ModelBreakdown from './charts/ModelBreakdown';

const chartSkeleton = () => (
  <div className="skeleton skeleton--chart" aria-hidden="true" />
);

const ColorTreemapLoader = dynamic(() => import('./charts/ColorTreemapLoader'), { ssr: false, loading: chartSkeleton });
const YearTrend = dynamic(() => import('./charts/YearTrend'), { ssr: false, loading: chartSkeleton });
const RegistryGrowth = dynamic(() => import('./charts/RegistryGrowth'), { ssr: false, loading: chartSkeleton });
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
  summary: string;
  children: React.ReactNode;
}

function ChartCard({ id, full, title, desc, summary, children }: ChartCardProps) {
  const className = `card ${styles.card}${full ? ` ${styles.full}` : ''}`;
  const headingId = `chart-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  return (
    <section id={id} className={className} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.cardTitle}>{title}</h2>
      <p className={styles.cardDesc}>{desc}</p>
      <p className={styles.cardSummary}>{summary}</p>
      {children}
    </section>
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
  const wheelCounts = useMemo(() => computeWheelCounts(filteredEntries), [filteredEntries]);
  const growthData = useMemo(() => computeRegistryGrowth(entries), [entries]);

  const summaries = useMemo(
    () => ({
      growth: growthSummary(growthData),
      treemap: `${rankedSummary(colorCounts, 'paint')} ${shareSummary(colorCounts)}`,
      models: modelSummary(filteredEntries),
      trends: trendSummary(filteredEntries),
      wheels: rankedSummary(wheelCounts, 'wheel package'),
    }),
    [growthData, colorCounts, filteredEntries, wheelCounts]
  );

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
            type="button"
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

      {/* Chart grid */}
      <div className={styles.grid}>
        <ChartCard id="growth" full title="Registry growth" summary={summaries.growth} desc="Cumulative builds added to the registry, on a true time scale">
          <RegistryGrowth data={growthData} />
        </ChartCard>

        <ChartCard id="distribution" full title="Paints by build count" summary={summaries.treemap} desc="Each block's size is its build count, filled with the paint's own color">
          <ColorTreemapLoader data={colorCounts} />
        </ChartCard>

        <ChartCard id="models" title="M3 and M4, RWD and AWD" summary={summaries.models} desc="How the builds split by model and drivetrain">
          <ModelBreakdown entries={filteredEntries} />
        </ChartCard>

        <ChartCard title="Wheel popularity" summary={summaries.wheels} desc="Most common wheel packages in the registry">
          <WheelBar data={wheelCounts} />
        </ChartCard>

        <ChartCard id="trends" full title="Paint popularity by model year" summary={summaries.trends} desc="Top 8 paints tracked across model years">
          <YearTrend entries={filteredEntries} />
        </ChartCard>
      </div>
    </>
  );
}
