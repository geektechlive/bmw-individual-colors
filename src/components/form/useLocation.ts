'use client';

import { useEffect, useMemo, useState } from 'react';

export type CountryOption = { isoCode: string; name: string };
export type StateOption = { isoCode: string; name: string };

// Countries that have state/province data worth showing
const COUNTRIES_WITH_STATES = new Set([
  'US', 'CA', 'AU', 'DE', 'GB', 'FR', 'JP', 'CN', 'BR', 'MX', 'IN', 'IT', 'ES', 'NL', 'CH', 'AT', 'BE', 'PL', 'CZ', 'SE', 'NO', 'DK', 'NZ',
]);

// Small static list for first paint; the full country-state-city dataset is
// dynamically imported in an effect so it never lands in the initial bundle.
const COMMON_COUNTRIES: CountryOption[] = [
  { isoCode: 'US', name: 'United States' }, { isoCode: 'CA', name: 'Canada' },
  { isoCode: 'GB', name: 'United Kingdom' }, { isoCode: 'AU', name: 'Australia' },
  { isoCode: 'DE', name: 'Germany' }, { isoCode: 'FR', name: 'France' },
  { isoCode: 'JP', name: 'Japan' }, { isoCode: 'CN', name: 'China' },
  { isoCode: 'BR', name: 'Brazil' }, { isoCode: 'MX', name: 'Mexico' },
  { isoCode: 'IN', name: 'India' }, { isoCode: 'IT', name: 'Italy' },
  { isoCode: 'ES', name: 'Spain' }, { isoCode: 'NL', name: 'Netherlands' },
  { isoCode: 'CH', name: 'Switzerland' }, { isoCode: 'AT', name: 'Austria' },
  { isoCode: 'BE', name: 'Belgium' }, { isoCode: 'SE', name: 'Sweden' },
  { isoCode: 'PL', name: 'Poland' },
];

export interface LocationState {
  countries: CountryOption[];
  countryCode: string;
  countryName: string;
  states: StateOption[];
  stateValue: string;
  setCountryCode: (code: string) => void;
  setStateValue: (value: string) => void;
  /** True once the full list loaded and the entry's stored country name matched nothing. */
  countryMismatch: boolean;
}

/**
 * Country, state and city cascade shared by both forms. Pass the entry's stored country
 * name and state to prefill (edit); omit them for the blank submit form.
 */
export function useLocation(initialCountryName?: string, initialState = ''): LocationState {
  const [csc, setCsc] = useState<typeof import('country-state-city') | null>(null);
  useEffect(() => {
    let cancelled = false;
    import('country-state-city').then((mod) => {
      if (!cancelled) setCsc(mod);
    });
    return () => { cancelled = true; };
  }, []);

  const fullCountries = useMemo<CountryOption[] | null>(
    () => (csc ? csc.Country.getAllCountries().map((c) => ({ isoCode: c.isoCode, name: c.name })) : null),
    [csc],
  );
  const countries = fullCountries ?? COMMON_COUNTRIES;

  // Reverse-lookup the ISO code from the stored country name (case-insensitive fallback).
  // Runs once the full list has loaded; until then the 'US' default stands.
  const found = useMemo(() => {
    if (!fullCountries || !initialCountryName) return undefined;
    return (
      fullCountries.find((c) => c.name === initialCountryName) ??
      fullCountries.find((c) => c.name.toLowerCase() === initialCountryName.toLowerCase())
    );
  }, [fullCountries, initialCountryName]);

  // Derived, not synced in an effect: the user's pick wins, then the resolved country, then 'US'.
  const [chosenCode, setChosenCode] = useState<string | null>(null);
  const countryCode = chosenCode ?? found?.isoCode ?? 'US';
  const [stateValue, setStateValue] = useState(initialState);

  const states = useMemo<StateOption[]>(
    () =>
      csc && COUNTRIES_WITH_STATES.has(countryCode)
        ? csc.State.getStatesOfCountry(countryCode).map((s) => ({ isoCode: s.isoCode, name: s.name }))
        : [],
    [csc, countryCode],
  );

  return {
    countries,
    countryCode,
    countryName: countries.find((c) => c.isoCode === countryCode)?.name ?? '',
    states,
    stateValue,
    setCountryCode: (code) => {
      setChosenCode(code);
      setStateValue('');
    },
    setStateValue,
    countryMismatch: !!fullCountries && !found && !!initialCountryName,
  };
}
