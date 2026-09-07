'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { GrowthPoint } from '../../lib/analytics';

interface Props {
  data: GrowthPoint[];
}

export default function RegistryGrowth({ data }: Props) {
  if (data.length === 0) {
    return (
      <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
        No data yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1C69D4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#1C69D4" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={35}
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
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#1C69D4"
          strokeWidth={2}
          fill="url(#growthGrad)"
          dot={false}
          name="Total Builds"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
