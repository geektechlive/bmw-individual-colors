import { createServerClient } from './supabase';
import { BMW_COLORS } from './colors';
import type { BmwEntry, ColorCount, Stats } from '../types';

export async function getEntries(): Promise<BmwEntry[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('bmwic_entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getEntries error:', error);
    return [];
  }
  return data as BmwEntry[];
}

export async function getStats(): Promise<Stats> {
  const entries = await getEntries();
  const totalEntries = entries.length;
  const totalColors = new Set(entries.map((e) => e.ext_color)).size;
  const totalCountries = new Set(
    entries.map((e) => e.location_country).filter(Boolean)
  ).size;
  return { totalEntries, totalColors, totalCountries };
}

export async function getColorCounts(): Promise<ColorCount[]> {
  const entries = await getEntries();
  const map = new Map<string, number>();
  for (const e of entries) {
    map.set(e.ext_color, (map.get(e.ext_color) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([color, count]) => ({
      color,
      count,
      hex: BMW_COLORS[color] ?? '#888888',
    }))
    .sort((a, b) => b.count - a.count);
}

export interface MatrixRow {
  color: string;
  hex: string;
  cells: Record<string, number>;
  total: number;
}

export interface MatrixData {
  columns: string[];
  rows: MatrixRow[];
  columnTotals: Record<string, number>;
  grandTotal: number;
}

export async function getModelYearMatrix(): Promise<MatrixData> {
  const entries = await getEntries();

  // Build column keys: "YYYY M3C AWD", etc.
  const colSet = new Set<string>();
  for (const e of entries) {
    const model = `${e.body_style}${e.competition ? 'C' : ''}`;
    const col = `${e.model_year} ${model} ${e.drivetrain}`;
    colSet.add(col);
  }
  const columns = Array.from(colSet).sort();

  // Build rows keyed by ext_color
  const rowMap = new Map<string, MatrixRow>();
  for (const e of entries) {
    const model = `${e.body_style}${e.competition ? 'C' : ''}`;
    const col = `${e.model_year} ${model} ${e.drivetrain}`;

    if (!rowMap.has(e.ext_color)) {
      rowMap.set(e.ext_color, {
        color: e.ext_color,
        hex: BMW_COLORS[e.ext_color] ?? '#888888',
        cells: {},
        total: 0,
      });
    }
    const row = rowMap.get(e.ext_color)!;
    row.cells[col] = (row.cells[col] ?? 0) + 1;
    row.total += 1;
  }

  const rows = Array.from(rowMap.values()).sort((a, b) => b.total - a.total);

  const columnTotals: Record<string, number> = {};
  for (const col of columns) {
    columnTotals[col] = rows.reduce((s, r) => s + (r.cells[col] ?? 0), 0);
  }
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return { columns, rows, columnTotals, grandTotal };
}

export async function getInteriorCounts(): Promise<ColorCount[]> {
  const entries = await getEntries();
  const map = new Map<string, number>();
  for (const e of entries) {
    const ic = e.interior_color?.trim();
    if (ic) {
      map.set(ic, (map.get(ic) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([color, count]) => ({ color, count, hex: '#888888' }))
    .sort((a, b) => b.count - a.count);
}

export async function getLocationEntries(): Promise<BmwEntry[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('bmwic_entries')
    .select('*')
    .not('location_lat', 'is', null)
    .not('location_lng', 'is', null);

  if (error) {
    console.error('getLocationEntries error:', error);
    return [];
  }
  return data as BmwEntry[];
}
