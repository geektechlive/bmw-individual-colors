import { createServerClient } from './supabase';
import { BMW_COLORS, COLOR_FAMILY_MAP } from './colors';
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

export function computeStats(entries: BmwEntry[]): Stats {
  return {
    totalEntries: entries.length,
    totalColors: new Set(entries.map((e) => e.ext_color)).size,
    totalCountries: new Set(entries.map((e) => e.location_country).filter(Boolean)).size,
  };
}

export function computeColorCounts(entries: BmwEntry[]): ColorCount[] {
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

export function computeModelYearMatrix(entries: BmwEntry[]): MatrixData {
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

export function computeInteriorCounts(entries: BmwEntry[]): ColorCount[] {
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

export interface GrowthPoint {
  month: string;
  cumulative: number;
}

export function computeRegistryGrowth(entries: BmwEntry[]): GrowthPoint[] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const map = new Map<string, number>();
  for (const e of sorted) {
    const d = new Date(e.created_at);
    const key = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  let cumulative = 0;
  return Array.from(map.entries()).map(([month, count]) => {
    cumulative += count;
    return { month, cumulative };
  });
}

export interface CompetitionPoint {
  year: number;
  M3_pct: number;
  M4_pct: number;
  total: number;
}

export function computeCompetitionAdoption(entries: BmwEntry[]): CompetitionPoint[] {
  const yearMap = new Map<number, { M3_comp: number; M3_total: number; M4_comp: number; M4_total: number }>();
  for (const e of entries) {
    if (!yearMap.has(e.model_year)) yearMap.set(e.model_year, { M3_comp: 0, M3_total: 0, M4_comp: 0, M4_total: 0 });
    const y = yearMap.get(e.model_year)!;
    if (e.body_style === 'M3') { y.M3_total++; if (e.competition) y.M3_comp++; }
    else { y.M4_total++; if (e.competition) y.M4_comp++; }
  }
  return Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, v]) => ({
      year,
      M3_pct: v.M3_total ? Math.round((v.M3_comp / v.M3_total) * 100) : 0,
      M4_pct: v.M4_total ? Math.round((v.M4_comp / v.M4_total) * 100) : 0,
      total: v.M3_total + v.M4_total,
    }));
}

export interface FamilyYearPoint {
  year: number;
  Blues: number;
  Greens: number;
  'Reds & Oranges': number;
  Yellows: number;
  Purples: number;
  'Greys & Blacks': number;
  Other: number;
}

export function computeColorFamilyByYear(entries: BmwEntry[]): FamilyYearPoint[] {
  const yearMap = new Map<number, Record<string, number>>();
  for (const e of entries) {
    if (!yearMap.has(e.model_year)) {
      yearMap.set(e.model_year, { Blues: 0, Greens: 0, 'Reds & Oranges': 0, Yellows: 0, Purples: 0, 'Greys & Blacks': 0, Other: 0 });
    }
    const family = COLOR_FAMILY_MAP[e.ext_color] ?? 'Other';
    yearMap.get(e.model_year)![family]++;
  }
  return Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, counts]) => ({ year, ...counts } as FamilyYearPoint));
}

export function computeWheelCounts(entries: BmwEntry[]): ColorCount[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const w = e.wheels?.trim();
    if (w) map.set(w, (map.get(w) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([color, count]) => ({ color, count, hex: '#888888' }))
    .sort((a, b) => b.count - a.count);
}

export async function getEntriesByColor(colorName: string): Promise<BmwEntry[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('bmwic_entries')
    .select('*')
    .eq('ext_color', colorName)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getEntriesByColor error:', error);
    return [];
  }
  return data as BmwEntry[];
}

export function computeRarityLabel(count: number): string {
  if (count <= 2) return 'Unicorn';
  if (count <= 8) return 'Rare';
  if (count <= 20) return 'Uncommon';
  return 'Common';
}

export function computeRarityColor(label: string): string {
  switch (label) {
    case 'Unicorn': return '#862086';
    case 'Rare': return '#E8002D';
    case 'Uncommon': return '#e8a020';
    default: return '#64748b';
  }
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
