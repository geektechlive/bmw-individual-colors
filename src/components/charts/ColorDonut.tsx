'use client';

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
  const top20 = data.slice(0, 20);
  const otherCount = data.slice(20).reduce((s, d) => s + d.count, 0);

  const chartData =
    otherCount > 0
      ? [...top20, { color: 'Other', count: otherCount, hex: '#666666' }]
      : top20;

  const total = chartData.reduce((s, d) => s + d.count, 0);

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
        >
          {chartData.map((entry) => (
            <Cell key={entry.color} fill={entry.hex} stroke="#1e2a3a" strokeWidth={1} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [
            `${Number(value)} (${((Number(value) / total) * 100).toFixed(1)}%)`,
            'Count',
          ]}
          contentStyle={{ background: '#1e2a3a', border: '1px solid #2d3f55', color: '#e2e8f0' }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={10}
          formatter={(value) => (
            <span style={{ color: '#cbd5e1', fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
