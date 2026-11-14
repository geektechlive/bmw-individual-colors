'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import L from 'leaflet';
import 'leaflet.markercluster';
import { useEffect, useMemo, useRef } from 'react';
import { getColorHex } from '../lib/colors';
import { TOKENS } from '../lib/design-tokens';
import styles from './RegistryMap.module.css';
import type { BmwEntry } from '../types';

function makeIcon(hex: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="6" fill="${hex}" stroke="${TOKENS['ink']}" stroke-width="1.5"/>
    </svg>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function makePopupHtml(entry: BmwEntry, hex: string): string {
  const location = [entry.location_city, entry.location_state, entry.location_country]
    .filter(Boolean)
    .map((s) => esc(s!))
    .join(', ');
  return `
    <div class="rm-popup-body">
      <div class="rm-popup-head">
        <div class="rm-popup-swatch" style="--p:${esc(hex)}"></div>
        <strong class="rm-popup-name">${esc(entry.ext_color)}</strong>
      </div>
      <div class="rm-popup-meta">
        <div>${esc(String(entry.model_year))} BMW ${esc(entry.body_style)}${entry.competition ? ' Competition' : ''}</div>
        <div>${esc(entry.drivetrain)} · ${esc(entry.transmission)}</div>
        ${location ? `<div class="rm-popup-location">${location}</div>` : ''}
      </div>
    </div>
  `;
}

interface Props {
  entries: BmwEntry[];
}

export default function RegistryMap({ entries }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // A new `entries` array reference (e.g. from a parent re-render) shouldn't
  // rebuild the whole Leaflet map — only rebuild when the actual set of
  // entries changes, keyed on a stable signature of entry ids.
  const entriesSignature = useMemo(() => entries.map((e) => e.id).join(','), [entries]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 10],
      zoom: 2,
      minZoom: 2,
      worldCopyJump: true,
    });

    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const group = L.markerClusterGroup({ chunkedLoading: true });

    entries.forEach((entry) => {
      if (entry.location_lat == null || entry.location_lng == null) return;
      const hex = getColorHex(entry.ext_color);
      L.marker([entry.location_lat, entry.location_lng], { icon: makeIcon(hex) })
        .bindPopup(makePopupHtml(entry, hex), { className: 'rm-popup' })
        .addTo(group);
    });

    map.addLayer(group);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesSignature]);

  return <div ref={containerRef} className={styles.container} />;
}
