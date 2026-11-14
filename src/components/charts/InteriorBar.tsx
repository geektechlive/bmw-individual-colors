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
import {
  AXIS_LINE,
  AXIS_TICK,
  AXIS_TICK_LABEL,
  BAR_CURSOR,
  FALLBACK_PAINT,
  GRID_STROKE,
  TOOLTIP_STYLE,
} from './palette';
import { INTERIOR_HEX_MAP } from '../../lib/colors';
import shared from './charts.module.css';

interface Props {
  data: ColorCount[];
}

export default function InteriorBar({ data }: Props) {
  if (data.length === 0) {
    return <p className={shared.empty}>No interior data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36 + 40)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 32, bottom: 4, left: 16 }}
      >
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          axisLine={AXIS_LINE}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="color"
          width={140}
          tick={AXIS_TICK_LABEL}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={BAR_CURSOR}
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [Number(v), 'Entries']}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell key={entry.color} fill={INTERIOR_HEX_MAP[entry.color] ?? FALLBACK_PAINT} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
