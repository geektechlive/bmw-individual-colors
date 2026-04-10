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

interface Props {
  data: ColorCount[];
}

export default function ColorDonut({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const top20 = data.slice(0, 20);
  const otherCount = data.slice(20).reduce((s, d) => s + d.count, 0);

  const chartData =
    otherCount > 0
      ? [...top20, { color: 'Other', count: otherCount, hex: '#666666' }]
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
              stroke={index === activeIndex ? '#ffffff' : '#1e2a3a'}
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
          contentStyle={{ background: '#1e2a3a', border: '1px solid #2d3f55', color: '#e2e8f0', borderRadius: 6 }}
          labelStyle={{ display: 'none' }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={10}
          formatter={(value) => (
            <span style={{
              color: value === activeColor ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: value === activeColor ? 700 : 400,
              transition: 'color 0.1s, font-weight 0.1s',
            }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
