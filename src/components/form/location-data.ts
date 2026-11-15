import { COUNTRIES } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';

export type CountryOption = { isoCode: string; name: string };
export type StateOption = { isoCode: string; name: string };

/** Countries whose state/province list the location field offers. */
export const COUNTRIES_WITH_REGIONS: readonly string[] = Object.keys(REGIONS);

const COUNTRY_OPTIONS: CountryOption[] = COUNTRIES.map(([isoCode, name]) => ({ isoCode, name }));

export function countryOptions(): CountryOption[] {
  return COUNTRY_OPTIONS;
}

/** The entry's stored country name, matched exactly, then ignoring case. */
export function findCountry(name: string | undefined): CountryOption | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  return COUNTRY_OPTIONS.find((c) => c.name === name) ?? COUNTRY_OPTIONS.find((c) => c.name.toLowerCase() === lower);
}

/** States or provinces for a country, or none if the field doesn't offer them. */
export function regionsOf(countryCode: string): StateOption[] {
  if (!Object.hasOwn(REGIONS, countryCode)) return [];
  return REGIONS[countryCode].map(([isoCode, name]) => ({ isoCode, name }));
}
