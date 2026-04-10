'use client';

import { useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { getColorHex } from '../../lib/colors';
import type { BmwEntry } from '../../types';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface Props {
  entries: BmwEntry[];
}

export default function LocationMap({ entries }: Props) {
  const [tooltip, setTooltip] = useState<{ label: string; x: number; y: number } | null>(null);

  return (
    <div style={{ position: 'relative', background: '#0f1923', borderRadius: 8 }}>
      <ComposableMap
        projection="geoNaturalEarth1"
        style={{ width: '100%', height: 'auto' }}
        projectionConfig={{ scale: 147 }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1e2a3a"
                stroke="#2d3f55"
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none', fill: '#243447' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {entries.map((entry) => {
          if (!entry.location_lat || !entry.location_lng) return null;
          const hex = getColorHex(entry.ext_color);
          const label = [
            entry.ext_color,
            [entry.location_city, entry.location_state, entry.location_country]
              .filter(Boolean)
              .join(', '),
          ]
            .filter(Boolean)
            .join(' — ');

          return (
            <Marker
              key={entry.id}
              coordinates={[entry.location_lng, entry.location_lat]}
              onMouseEnter={(e: React.MouseEvent) => {
                setTooltip({ label, x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle
                r={5}
                fill={hex}
                stroke="#ffffff"
                strokeWidth={1}
                style={{ cursor: 'pointer', opacity: 0.9 }}
              />
            </Marker>
          );
        })}
      </ComposableMap>

      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            background: '#1e2a3a',
            border: '1px solid #2d3f55',
            padding: '6px 10px',
            borderRadius: 6,
            color: '#e2e8f0',
            fontSize: 13,
            pointerEvents: 'none',
            zIndex: 1000,
            maxWidth: 260,
          }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
