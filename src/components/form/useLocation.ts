'use client';

import { useMemo, useState } from 'react';
import { countryOptions, findCountry, regionsOf, type CountryOption, type StateOption } from './location-data';

export type { CountryOption, StateOption };

export interface LocationState {
  countries: CountryOption[];
  countryCode: string;
  countryName: string;
  states: StateOption[];
  stateValue: string;
  setCountryCode: (code: string) => void;
  setStateValue: (value: string) => void;
  /** True when the entry's stored country name matched nothing in the list. */
  countryMismatch: boolean;
}

/**
 * Country, state and city cascade shared by both forms. Pass the entry's stored country
 * name and state to prefill (edit); omit them for the blank submit form. The lists are
 * small generated snapshots (location-data.ts), so they are ready on first render (#60).
 */
export function useLocation(initialCountryName?: string, initialState = ''): LocationState {
  const countries = countryOptions();
  const found = useMemo(() => findCountry(initialCountryName), [initialCountryName]);

  // Derived, not synced in an effect: the user's pick wins, then the resolved country, then 'US'.
  const [chosenCode, setChosenCode] = useState<string | null>(null);
  const countryCode = chosenCode ?? found?.isoCode ?? 'US';
  const [stateValue, setStateValue] = useState(initialState);

  const states = useMemo(() => regionsOf(countryCode), [countryCode]);

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
    countryMismatch: !found && !!initialCountryName,
  };
}
