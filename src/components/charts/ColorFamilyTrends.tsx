'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { FamilyYearPoint } from '../../lib/queries';

interface Props {
  data: FamilyYearPoint[];
}

const FAMILY_COLORS: Record<string, string> = {
  Blues: '#1C69D4',
  Greens: '#22c55e',
  'Reds & Oranges': '#E8002D',
  Yellows: '#eab308',
  Purples: '#862086',
  'Greys & Blacks': '#64748b',
  Other: '#475569',
};

const FAMILIES = ['Blues', 'Greens', 'Reds & Oranges', 'Yellows', 'Purples', 'Greys & Blacks', 'Other'] as const;

export default function ColorFamilyTrends({ data }: Props) {
  if (data.length === 0) {
    return (
      <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
        No data yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={35}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: '#1e2a3a',
            border: '1px solid #2d3f55',
            borderRadius: 6,
            color: '#e2e8f0',
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        {FAMILIES.map((family) => (
          <Bar
            key={family}
            dataKey={family}
            stackId="a"
            fill={FAMILY_COLORS[family]}
            name={family}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
