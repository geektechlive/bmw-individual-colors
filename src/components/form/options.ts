import { BMW_COLORS } from '../../lib/colors';

export const INTERIOR_OPTIONS = [
  'Black', 'Fjord Blue', 'Fiona Red', 'Ivory White', 'Kyalami Orange',
  'Sakhir Orange', 'Silverstone', 'Silverstone Grey', 'Tartufo Brown',
];

export const WHEEL_OPTIONS = [
  '824M', '825M', '825M Orbit Grey', '825M Silver', '826M',
  '826M Bi-Color', '827M', '963M', '1000M', '1000M Gold/Bronze',
];

export const FORUMS = ['BimmerPost', 'M3Post', 'F80Post', 'Other'];

export const MODEL_YEARS = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];

export const COLOR_NAMES = Object.keys(BMW_COLORS).sort();

export const BASE_VARIANT = 'Base (RWD)';

/**
 * The option list, with the stored value added first when the list doesn't have it. Without
 * this, the edit form would show the placeholder for a stored value it doesn't list and save
 * it back as blank.
 */
export function withCurrentOption(options: readonly string[], current: string | null | undefined): string[] {
  const value = current?.trim();
  if (!value || options.includes(value)) return [...options];
  return [value, ...options];
}

/** Starting values for the shared field set. The submit form uses the defaults; edit passes the entry's. */
export interface FormDefaults {
  modelYear?: number;
  bodyStyle: string;
  variant: string;
  transmission: string;
  extColor: string;
  interiorColor: string;
  interiorSeats: string;
  interiorLeather: string;
  wheels: string;
  city: string;
  notes: string;
  forum: string;
}

export const SUBMIT_DEFAULTS: FormDefaults = {
  bodyStyle: 'M3',
  variant: 'Competition',
  transmission: '8AT',
  extColor: '',
  interiorColor: '',
  interiorSeats: '',
  interiorLeather: '',
  wheels: '',
  city: '',
  notes: '',
  forum: 'BimmerPost',
};
