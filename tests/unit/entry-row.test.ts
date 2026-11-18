import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forumTagLabel, phoneSubline, carLabel } from '../../src/lib/entry-display';

// Direction B unit (d), #69: strings for the entries rows.

test('forumTagLabel shows nothing for BimmerPost or an empty forum', () => {
  assert.equal(forumTagLabel('BimmerPost'), null);
  assert.equal(forumTagLabel(null), null);
  assert.equal(forumTagLabel(''), null);
});

test('forumTagLabel shows other forums, and spells out the stored "Other"', () => {
  assert.equal(forumTagLabel('M3Post'), 'M3Post');
  assert.equal(forumTagLabel('F80Post'), 'F80Post');
  assert.equal(forumTagLabel('Other'), 'Other forum');
});

test('phoneSubline joins drive, trans, wheels and city, state', () => {
  assert.equal(
    phoneSubline({
      drivetrain: 'AWD',
      transmission: '8AT',
      wheels: '826M',
      location_city: 'Hampton Roads',
      location_state: 'Virginia',
      location_country: 'United States',
    }),
    'AWD · 8AT · 826M · Hampton Roads, Virginia',
  );
});

test('phoneSubline falls back to the country and skips a missing wheel', () => {
  assert.equal(
    phoneSubline({
      drivetrain: 'AWD',
      transmission: '8AT',
      wheels: null,
      location_city: null,
      location_state: null,
      location_country: 'United States',
    }),
    'AWD · 8AT · United States',
  );
});

test('carLabel is the year and model, as on the phone row', () => {
  assert.equal(carLabel({ model_year: 2027, body_style: 'M3', competition: true }), '2027 M3 Comp');
  assert.equal(carLabel({ model_year: 2027, body_style: 'M4', competition: false }), '2027 M4');
});
