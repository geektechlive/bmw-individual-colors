export interface BmwEntry {
  id: string;
  created_at: string;
  model_year: number;
  body_style: string;
  competition: boolean;
  drivetrain: string;
  transmission: string;
  ext_color: string;
  interior_color: string | null;
  interior_type: string | null;
  wheels: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  forum_username: string | null;
  source_forum: string | null;
  notes: string | null;
}

export interface ColorCount {
  color: string;
  count: number;
  hex: string;
}

export interface Stats {
  totalEntries: number;
  totalColors: number;
  totalCountries: number;
}
