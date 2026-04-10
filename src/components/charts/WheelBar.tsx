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

const WHEEL_PALETTE = ['#8a8a9a', '#6a6a7a', '#aaaaaa', '#5a5a6a', '#9a9aaa', '#4a4a5a'];

export default function WheelBar({ data }: Props) {
  if (data.length === 0) {
    return (
      <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
        No wheel data yet.
      </p>
    );
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
          width={160}
          tick={{ fill: '#e2e8f0', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{
            background: '#1e2a3a',
            border: '1px solid #2d3f55',
            color: '#e2e8f0',
          }}
          formatter={(v) => [Number(v), 'Entries']}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={entry.color}
              fill={WHEEL_PALETTE[index % WHEEL_PALETTE.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
