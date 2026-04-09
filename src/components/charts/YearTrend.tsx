'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getColorHex } from '../../lib/colors';
import type { BmwEntry } from '../../types';

interface Props {
  entries: BmwEntry[];
}

export default function YearTrend({ entries }: Props) {
  if (entries.length === 0) {
    return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No data yet.</p>;
  }

  // Get top 8 colors by total count
  const colorCountMap = new Map<string, number>();
  for (const e of entries) {
    colorCountMap.set(e.ext_color, (colorCountMap.get(e.ext_color) ?? 0) + 1);
  }
  const top8 = Array.from(colorCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([color]) => color);

  // Get all years
  const years = Array.from(new Set(entries.map((e) => e.model_year))).sort();

  // Build chart data: one row per year
  const chartData = years.map((year) => {
    const row: Record<string, number | string> = { year: String(year) };
    for (const color of top8) {
      row[color] = entries.filter(
        (e) => e.model_year === year && e.ext_color === color
      ).length;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="#2d3f55" strokeDasharray="3 3" />
        <XAxis
          dataKey="year"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={{ stroke: '#2d3f55' }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#1e2a3a', border: '1px solid #2d3f55', color: '#e2e8f0' }}
          formatter={(v, name) => [Number(v), String(name)]}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#cbd5e1', fontSize: 11 }}>{value}</span>
          )}
          iconType="circle"
          iconSize={8}
        />
        {top8.map((color) => (
          <Line
            key={color}
            type="monotone"
            dataKey={color}
            stroke={getColorHex(color)}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
