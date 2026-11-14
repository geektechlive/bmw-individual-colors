'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import L from 'leaflet';
import 'leaflet.markercluster';
import { useEffect, useMemo, useRef } from 'react';
import { getColorHex } from '../lib/colors';
import { TOKENS } from '../lib/design-tokens';
import { buildPopupHtml, escapeHtml, type PopupClasses } from '../lib/map-popup';
import { paintSwatchClassNames } from './PaintSwatch';
import styles from './RegistryMap.module.css';
import type { BmwEntry } from '../types';

const POPUP_CLASSES: PopupClasses = {
  body: styles.popupBody,
  head: styles.popupHead,
  swatch: styles.popupSwatch,
  name: styles.popupName,
  meta: styles.popupMeta,
  location: styles.popupLocation,
  link: styles.popupLink,
};

// A small flat dot: no finish at this size (#44). A dark ring keeps it crisp on the map.
function makeIcon(hex: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" fill="${escapeHtml(hex)}" stroke="${TOKENS['bg']}" stroke-width="2"/>
    </svg>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function markerLabel(entry: BmwEntry): string {
  return `${entry.ext_color}, ${entry.model_year} ${entry.body_style}`;
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
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
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
      const popupHtml = buildPopupHtml(
        entry,
        hex,
        paintSwatchClassNames(entry.ext_color, 'chip-sm'),
        POPUP_CLASSES,
      );
      const marker = L.marker([entry.location_lat, entry.location_lng], {
        icon: makeIcon(hex),
        title: markerLabel(entry),
      }).bindPopup(popupHtml, { className: styles.popup });
      marker.on('add', () => marker.getElement()?.setAttribute('aria-label', markerLabel(entry)));
      marker.addTo(group);
    });

    map.addLayer(group);

    // When a popup opens from the keyboard (Enter on a focused marker), move focus to its
    // link so the next Tab or Enter goes to "View paint". Mouse and touch keep their focus.
    let viaKeyboard = false;
    const onKey = () => { viaKeyboard = true; };
    const onPointer = () => { viaKeyboard = false; };
    container.addEventListener('keydown', onKey);
    container.addEventListener('pointerdown', onPointer);
    map.on('popupopen', (e) => {
      if (!viaKeyboard) return;
      e.popup.getElement()?.querySelector<HTMLElement>('a[href]')?.focus();
    });

    return () => {
      container.removeEventListener('keydown', onKey);
      container.removeEventListener('pointerdown', onPointer);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesSignature]);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      role="region"
      aria-label="Map of registry builds by location"
    />
  );
}
