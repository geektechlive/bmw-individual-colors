import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interiorDetail, cityState, modelLabel, entryDate } from '../../src/lib/entry-display';

test('interiorDetail lists seats and leather, falling back to the interior type', () => {
  assert.equal(interiorDetail({ interior_seats: 'Carbon', interior_leather: 'Merino', interior_type: 'X' }), 'Carbon, Merino Leather');
  assert.equal(interiorDetail({ interior_seats: null, interior_leather: 'Merino', interior_type: null }), 'Merino Leather');
  assert.equal(interiorDetail({ interior_seats: null, interior_leather: null, interior_type: 'Full Merino' }), 'Full Merino');
  assert.equal(interiorDetail({ interior_seats: null, interior_leather: null, interior_type: null }), null);
});

test('cityState joins the parts that exist', () => {
  assert.equal(cityState({ location_city: 'Austin', location_state: 'TX' }), 'Austin, TX');
  assert.equal(cityState({ location_city: null, location_state: 'TX' }), 'TX');
  assert.equal(cityState({ location_city: null, location_state: null }), '');
});

test('entryDate prefers the forum post date and formats in UTC', () => {
  assert.equal(entryDate({ posted_at: '2026-03-05T23:30:00Z', created_at: '2026-04-01T00:00:00Z' }), 'Mar 5, 2026');
  assert.equal(entryDate({ posted_at: null, created_at: '2026-04-01T00:00:00Z' }), 'Apr 1, 2026');
});

test('modelLabel appends Comp for Competition builds', () => {
  assert.equal(modelLabel({ body_style: 'M3', competition: true }), 'M3 Comp');
  assert.equal(modelLabel({ body_style: 'M4', competition: false }), 'M4');
});
