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
import type { FamilyYearPoint } from '../../lib/analytics';
import { AXIS_TICK, FAMILY_COLORS, GRID_STROKE, LEGEND_WRAPPER_STYLE, TOOLTIP_STYLE } from './palette';
import shared from './charts.module.css';

interface Props {
  data: FamilyYearPoint[];
}

const FAMILIES = ['Blues', 'Greens', 'Reds & Oranges', 'Yellows', 'Purples', 'Greys & Blacks', 'Other'] as const;

export default function ColorFamilyTrends({ data }: Props) {
  if (data.length === 0) {
    return <p className={shared.emptyFaint}>No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={35}
          allowDecimals={false}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} />
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
