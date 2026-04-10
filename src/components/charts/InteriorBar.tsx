'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ColorCount } from '../../types';

interface Props {
  data: ColorCount[];
}

const INTERIOR_HEX_MAP: Record<string, string> = {
  'Black': '#1a1a1a',
  'Fiona Red': '#8c1a1a',
  'Fjord Blue': '#1a3a7c',
  'Fjord Blue/Black': '#1a3a7c',
  'Kyalami Orange': '#c45a1a',
  'Sakhir Orange': '#d4661e',
  'Silverstone': '#8a8a8a',
  'Silverstone Grey': '#7a7a7a',
  'Smoke White': '#d4d0cc',
  'Tartufo Brown': '#6a3a1a',
};

export default function InteriorBar({ data }: Props) {
  if (data.length === 0) {
    return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No interior data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36 + 40)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 32, bottom: 4, left: 16 }}
      >
        <CartesianGrid horizontal={false} stroke="#2d3f55" />
        <XAxis
          type="number"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={{ stroke: '#2d3f55' }}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="color"
          width={140}
          tick={{ fill: '#e2e8f0', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{ background: '#1e2a3a', border: '1px solid #2d3f55', color: '#e2e8f0' }}
          formatter={(v) => [Number(v), 'Entries']}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell key={entry.color} fill={INTERIOR_HEX_MAP[entry.color] ?? '#888888'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
