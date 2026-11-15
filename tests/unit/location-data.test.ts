import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Country, State } from 'country-state-city';
import { countryOptions, findCountry, regionsOf, COUNTRIES_WITH_REGIONS } from '../../src/components/form/location-data';

// #60: the forms used to lazy-load all of country-state-city (8.5 MB raw, every city on
// Earth) just to list countries and states. They now read small generated snapshots.

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

test('nothing under src/ imports country-state-city', () => {
  const offenders = sourceFiles(join(__dirname, '..', '..', 'src')).filter((file) =>
    /(import|require)\s*\(?\s*['"]country-state-city['"]/.test(readFileSync(file, 'utf8')),
  );
  assert.deepEqual(offenders, []);
});

test('the country list matches country-state-city, in the same order', () => {
  assert.deepEqual(
    countryOptions(),
    Country.getAllCountries().map((c) => ({ isoCode: c.isoCode, name: c.name })),
  );
});

test('regions match country-state-city for every country that shows them', () => {
  for (const code of COUNTRIES_WITH_REGIONS) {
    assert.deepEqual(
      regionsOf(code),
      State.getStatesOfCountry(code).map((s) => ({ isoCode: s.isoCode, name: s.name })),
      code,
    );
  }
});

test('countries outside the list show no regions', () => {
  assert.deepEqual(regionsOf('FI'), []);
  assert.deepEqual(regionsOf('constructor'), []);
});

test('findCountry matches a stored name exactly, then ignoring case', () => {
  assert.equal(findCountry('United States')?.isoCode, 'US');
  assert.equal(findCountry('united kingdom')?.isoCode, 'GB');
  assert.equal(findCountry('Atlantis'), undefined);
  assert.equal(findCountry(undefined), undefined);
});
