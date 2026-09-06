'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import L from 'leaflet';
import 'leaflet.markercluster';
import { useEffect, useRef } from 'react';
import { getColorHex } from '../lib/colors';
import type { BmwEntry } from '../types';

function makeIcon(hex: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="6" fill="${hex}" stroke="#ffffff" stroke-width="1.5"/>
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
    <div style="min-width:180px;font-family:inherit">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div style="width:14px;height:14px;border-radius:50%;background:${esc(hex)};border:1px solid #ccc;flex-shrink:0"></div>
        <strong style="font-size:13px">${esc(entry.ext_color)}</strong>
      </div>
      <div style="font-size:12px;color:#555;line-height:1.6">
        <div>${esc(String(entry.model_year))} BMW ${esc(entry.body_style)}${entry.competition ? ' Competition' : ''}</div>
        <div>${esc(entry.drivetrain)} · ${esc(entry.transmission)}</div>
        ${location ? `<div style="margin-top:4px">${location}</div>` : ''}
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
        .bindPopup(makePopupHtml(entry, hex))
        .addTo(group);
    });

    map.addLayer(group);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [entries]);

  return (
    <div
      ref={containerRef}
      style={{ height: 'calc(100vh - 140px)', width: '100%', borderRadius: 8 }}
    />
  );
}
