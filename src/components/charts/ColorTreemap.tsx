'use client';

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { isLightColor } from '../../lib/colors';
import type { ColorCount } from '../../types';

interface Props {
  data: ColorCount[];
}

interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  hex?: string;
  value?: number;
}

function CustomContent(props: TreemapContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', hex = '#888', value = 0 } = props;
  const textColor = isLightColor(hex) ? '#1a1a1a' : '#ffffff';
  const showLabel = width > 60 && height > 30;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ fill: hex, stroke: '#0f172a', strokeWidth: 2 }}
      />
      {showLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fill: textColor, fontSize: Math.min(13, width / 8), fontWeight: 600 }}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fill: textColor, fontSize: Math.min(11, width / 10), opacity: 0.85 }}
          >
            {value}
          </text>
        </>
      )}
    </g>
  );
}

export default function ColorTreemap({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.color,
    size: d.count,
    hex: d.hex,
    value: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={chartData}
        dataKey="size"
        nameKey="name"
        content={<CustomContent />}
      >
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div style={{ background: '#1e2a3a', border: '1px solid #2d3f55', padding: '8px 12px', borderRadius: 6, color: '#e2e8f0' }}>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <div style={{ color: '#94a3b8' }}>{d.value} entries</div>
              </div>
            );
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
