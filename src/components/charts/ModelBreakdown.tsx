'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { BmwEntry } from '../../types';
import {
  DRIVETRAIN_COLORS,
  MODEL_COLORS,
  SLICE_STROKE,
  TOOLTIP_STYLE,
  TRANSMISSION_COLORS,
} from './palette';
import shared from './charts.module.css';

interface Props {
  entries: BmwEntry[];
}

interface Slice {
  name: string;
  value: number;
}

function countBy(entries: BmwEntry[], pick: (e: BmwEntry) => string): Slice[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const key = pick(e);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

const legendFormatter = (value: string) => <span className={shared.legendLabel}>{value}</span>;

function BreakdownPie({ title, data, colors }: { title: string; data: Slice[]; colors: string[] }) {
  return (
    <div className={shared.pieCol}>
      <p className={shared.pieTitle}>{title}</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2} label={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} stroke={SLICE_STROKE} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [Number(v), 'Count']} />
          <Legend formatter={legendFormatter} iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ModelBreakdown({ entries }: Props) {
  if (entries.length === 0) {
    return <p className={shared.empty}>No data yet.</p>;
  }

  return (
    <div className={shared.pieRow}>
      <BreakdownPie title="Body Style" data={countBy(entries, (e) => e.body_style)} colors={MODEL_COLORS} />
      <BreakdownPie title="Drivetrain" data={countBy(entries, (e) => e.drivetrain)} colors={DRIVETRAIN_COLORS} />
      <BreakdownPie title="Transmission" data={countBy(entries, (e) => e.transmission)} colors={TRANSMISSION_COLORS} />
    </div>
  );
}
