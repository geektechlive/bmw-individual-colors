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
import type { CompetitionPoint } from '../../lib/analytics';

interface Props {
  data: CompetitionPoint[];
}

export default function CompetitionAdoption({ data }: Props) {
  if (data.length === 0) {
    return (
      <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
        No data yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
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
          width={40}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            background: '#1e2a3a',
            border: '1px solid #2d3f55',
            borderRadius: 6,
            color: '#e2e8f0',
            fontSize: 13,
          }}
          formatter={(value, name) => [`${value}%`, name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
        />
        <Bar dataKey="M3_pct" name="M3 Competition %" fill="#1C69D4" radius={[4, 4, 0, 0]} />
        <Bar dataKey="M4_pct" name="M4 Competition %" fill="#862086" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
