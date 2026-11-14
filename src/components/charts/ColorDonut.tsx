'use client';

import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ColorCount } from '../../types';
import { TOKENS } from '../../lib/design-tokens';
import { OTHER_SLICE, SLICE_STROKE, TOOLTIP_STYLE } from './palette';
import shared from './charts.module.css';

interface Props {
  data: ColorCount[];
}

export default function ColorDonut({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const top20 = data.slice(0, 20);
  const otherCount = data.slice(20).reduce((s, d) => s + d.count, 0);

  const chartData =
    otherCount > 0
      ? [...top20, { color: 'Other', count: otherCount, hex: OTHER_SLICE }]
      : top20;

  const total = chartData.reduce((s, d) => s + d.count, 0);
  const activeColor = activeIndex !== null ? chartData[activeIndex]?.color : null;

  return (
    <ResponsiveContainer width="100%" height={480}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="color"
          cx="40%"
          cy="50%"
          innerRadius={80}
          outerRadius={150}
          paddingAngle={1}
          label={false}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={entry.color}
              fill={entry.hex}
              stroke={index === activeIndex ? TOKENS['ink'] : SLICE_STROKE}
              strokeWidth={index === activeIndex ? 2 : 1}
              opacity={activeIndex === null || index === activeIndex ? 1 : 0.5}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [
            `${Number(value)} (${((Number(value) / total) * 100).toFixed(1)}%)`,
            name,
          ]}
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ display: 'none' }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={10}
          formatter={(value) => (
            <span
              className={`${shared.legendDonut} ${value === activeColor ? shared.legendDonutActive : ''}`}
            >
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
