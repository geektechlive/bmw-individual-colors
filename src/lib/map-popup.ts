import { colorToSlug } from './colors';
import type { BmwEntry } from '../types';

/** Class names the popup markup uses (CSS Module names, passed in so this stays pure). */
export interface PopupClasses {
  body: string;
  head: string;
  swatch: string;
  name: string;
  meta: string;
  location: string;
  link: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** City, state, country: the parts that exist, already escaped. */
export function locationLine(entry: BmwEntry): string {
  return [entry.location_city, entry.location_state, entry.location_country]
    .filter((s): s is string => Boolean(s))
    .map(escapeHtml)
    .join(', ');
}

/**
 * The popup's HTML string (Leaflet injects it as markup). Every user-supplied value is
 * escaped. `swatchClass` is the paint swatch's CSS Module classes for this paint.
 */
export function buildPopupHtml(
  entry: BmwEntry,
  hex: string,
  swatchClass: string,
  c: PopupClasses,
): string {
  const location = locationLine(entry);
  const slug = escapeHtml(colorToSlug(entry.ext_color));
  const model = `${entry.model_year} BMW ${entry.body_style}${entry.competition ? ' Competition' : ''}`;
  return `<div class="${c.body}">
  <div class="${c.head}">
    <span class="${swatchClass} ${c.swatch}" style="--p:${escapeHtml(hex)}" aria-hidden="true"></span>
    <strong class="${c.name} paint-name">${escapeHtml(entry.ext_color)}</strong>
  </div>
  <div class="${c.meta}">
    <div>${escapeHtml(model)}</div>
    <div>${escapeHtml(entry.drivetrain)} · ${escapeHtml(entry.transmission)}</div>
    ${location ? `<div class="${c.location}">${location}</div>` : ''}
  </div>
  <a class="${c.link}" href="/colors/${slug}">View paint</a>
</div>`;
}
