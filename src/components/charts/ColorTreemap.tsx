'use client';

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { isLightColor } from '../../lib/colors';
import { TOKENS } from '../../lib/design-tokens';
import type { ColorCount } from '../../types';
import { FALLBACK_PAINT, SLICE_STROKE } from './palette';
import shared from './charts.module.css';

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

const MIN_LABEL_PX = 11;

function CustomContent(props: TreemapContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', hex = FALLBACK_PAINT, value = 0 } = props;
  const textColor = isLightColor(hex) ? TOKENS['bg'] : TOKENS['on-accent'];
  // Hide labels that can't fit at the 11px floor (roughly 0.6em per character, plus padding);
  // the tooltip still names the tile.
  const fitsName = width >= name.length * MIN_LABEL_PX * 0.6 + 8;
  const showLabel = width > 60 && height > 30 && fitsName;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={hex}
        stroke={SLICE_STROKE}
        strokeWidth={2}
      />
      {showLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={textColor}
            fontSize={Math.max(MIN_LABEL_PX, Math.min(13, width / 8))}
            fontWeight={600}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={textColor}
            fontSize={MIN_LABEL_PX}
            opacity={0.85}
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
              <div className={shared.tooltipCard}>
                <div className={shared.tooltipName}>{d.name}</div>
                <div className={shared.tooltipSub}>{d.value} entries</div>
              </div>
            );
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
