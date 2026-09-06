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
  interior_seats: string | null;
  interior_leather: string | null;
  wheels: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  forum_username: string | null;
  source_forum: string | null;
  posted_at: string | null;
  flag_count: number;
  edit_count: number;
  last_edited_at: string | null;
  notes: string | null;
  user_submitted: boolean;
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
