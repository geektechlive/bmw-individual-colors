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
import { AXIS_TICK, COMPETITION_COLORS, GRID_STROKE, LEGEND_WRAPPER_STYLE, TOOLTIP_STYLE } from './palette';
import shared from './charts.module.css';

interface Props {
  data: CompetitionPoint[];
}

export default function CompetitionAdoption({ data }: Props) {
  if (data.length === 0) {
    return <p className={shared.emptyFaint}>No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => [`${value}%`, name]}
        />
        <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} />
        <Bar dataKey="M3_pct" name="M3 Competition %" fill={COMPETITION_COLORS.M3} radius={[4, 4, 0, 0]} />
        <Bar dataKey="M4_pct" name="M4 Competition %" fill={COMPETITION_COLORS.M4} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
