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
import { TOKENS } from '../../lib/design-tokens';
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from './palette';
import shared from './charts.module.css';

interface Props {
  data: GrowthPoint[];
}

export default function RegistryGrowth({ data }: Props) {
  if (data.length === 0) {
    return <p className={shared.emptyFaint}>No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={TOKENS['accent']} stopOpacity={0.3} />
            <stop offset="95%" stopColor={TOKENS['accent']} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          dataKey="month"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={35} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke={TOKENS['accent']}
          strokeWidth={2}
          fill="url(#growthGrad)"
          dot={false}
          name="Total Builds"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
