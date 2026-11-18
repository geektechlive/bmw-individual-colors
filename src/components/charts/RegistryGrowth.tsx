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
import { growthYearTicks, type GrowthPoint } from '../../lib/analytics';
import { TOKENS } from '../../lib/design-tokens';
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from './palette';
import shared from './charts.module.css';

interface Props {
  data: GrowthPoint[];
}

const formatYear = (t: number) => String(new Date(t).getUTCFullYear());
const formatMonth = (t: unknown) =>
  new Date(Number(t)).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function RegistryGrowth({ data }: Props) {
  if (data.length === 0) {
    return <p className={shared.emptyFaint}>No data yet.</p>;
  }
  const ticks = growthYearTicks(data);

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
          dataKey="t"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={ticks.length > 0 ? ticks : undefined}
          tickFormatter={formatYear}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={35} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={formatMonth} />
        <Area
          type="stepAfter"
          dataKey="cumulative"
          stroke={TOKENS['accent']}
          strokeWidth={2}
          fill="url(#growthGrad)"
          dot={false}
          name="Total builds"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
