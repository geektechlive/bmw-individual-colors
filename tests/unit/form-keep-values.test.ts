import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultsFromSubmission } from '../../src/components/form/keep-values';
import { SUBMIT_DEFAULTS } from '../../src/components/form/options';

// React 19 resets uncontrolled fields when a form action returns. After a duplicate warning
// or a server error, the form must come back with what the user typed, not the defaults.

const submitted = (pairs: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(pairs)) fd.set(k, v);
  return fd;
};

test('no submission yet: the base defaults', () => {
  assert.deepEqual(defaultsFromSubmission(null, SUBMIT_DEFAULTS), SUBMIT_DEFAULTS);
});

test('submitted values replace the defaults for every field the form posts', () => {
  const d = defaultsFromSubmission(
    submitted({
      model_year: '2024', body_style: 'M4', variant: 'Competition xDrive', transmission: '6MT',
      ext_color: 'Twilight Purple', interior_color: 'Black', interior_seats: 'Carbon Buckets',
      interior_leather: 'Full', wheels: '826M', location_city: 'Austin', notes: 'hello', source_forum: 'M3Post',
    }),
    SUBMIT_DEFAULTS
  );
  assert.equal(d.modelYear, 2024);
  assert.equal(d.bodyStyle, 'M4');
  assert.equal(d.variant, 'Competition xDrive');
  assert.equal(d.transmission, '6MT');
  assert.equal(d.extColor, 'Twilight Purple');
  assert.equal(d.interiorColor, 'Black');
  assert.equal(d.interiorSeats, 'Carbon Buckets');
  assert.equal(d.interiorLeather, 'Full');
  assert.equal(d.wheels, '826M');
  assert.equal(d.city, 'Austin');
  assert.equal(d.notes, 'hello');
  assert.equal(d.forum, 'M3Post');
});

test('fields the submission left out keep the base value', () => {
  const d = defaultsFromSubmission(submitted({ model_year: '2023' }), SUBMIT_DEFAULTS);
  assert.equal(d.modelYear, 2023);
  assert.equal(d.bodyStyle, SUBMIT_DEFAULTS.bodyStyle);
  assert.equal(d.notes, SUBMIT_DEFAULTS.notes);
});

test('a non-numeric year is ignored rather than becoming NaN', () => {
  const d = defaultsFromSubmission(submitted({ model_year: 'abc' }), SUBMIT_DEFAULTS);
  assert.equal(d.modelYear, SUBMIT_DEFAULTS.modelYear);
});

test('the base object is not changed', () => {
  const copy = JSON.stringify(SUBMIT_DEFAULTS);
  defaultsFromSubmission(submitted({ notes: 'x' }), SUBMIT_DEFAULTS);
  assert.equal(JSON.stringify(SUBMIT_DEFAULTS), copy);
});
