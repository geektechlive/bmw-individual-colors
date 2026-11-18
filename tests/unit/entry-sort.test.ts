import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SORT_CHOICES, choiceById, choiceFor } from '../../src/lib/entry-sort';

// Direction B unit (d), #69: the phone sort select. The labels are final copy.

test('the phone sort options are the spec list plus "Color, Z to A", in order', () => {
  assert.deepEqual(
    SORT_CHOICES.map((c) => c.label),
    [
      'Year, newest first',
      'Year, oldest first',
      'Color, A to Z',
      'Color, Z to A',
      'Model',
      'Drive',
      'Interior',
      'Location',
      'Forum user',
    ],
  );
});

test('each option maps to an existing sort key and a direction', () => {
  assert.deepEqual(choiceById('year-desc'), { id: 'year-desc', label: 'Year, newest first', key: 'model_year', dir: 'desc' });
  assert.deepEqual(choiceById('year-asc'), { id: 'year-asc', label: 'Year, oldest first', key: 'model_year', dir: 'asc' });
  assert.equal(choiceById('color')?.key, 'ext_color');
  assert.equal(choiceById('model')?.key, 'body_style');
  assert.equal(choiceById('drive')?.key, 'drivetrain');
  assert.equal(choiceById('interior')?.key, 'interior_color');
  assert.equal(choiceById('location')?.key, 'location_state');
  assert.equal(choiceById('forum')?.key, 'forum_username');
  for (const c of SORT_CHOICES.filter((x) => x.key !== 'model_year' && x.id !== 'color-desc')) assert.equal(c.dir, 'asc');
});

test('an unknown option id maps to nothing', () => {
  assert.equal(choiceById('nope'), undefined);
  assert.equal(choiceById('constructor'), undefined);
});

test('choiceFor finds the option for the current sort state', () => {
  assert.equal(choiceFor('model_year', 'desc').id, 'year-desc');
  assert.equal(choiceFor('model_year', 'asc').id, 'year-asc');
  assert.equal(choiceFor('ext_color', 'asc').id, 'color');
});

test('Color, Z to A is color, descending', () => {
  assert.deepEqual(choiceById('color-desc'), { id: 'color-desc', label: 'Color, Z to A', key: 'ext_color', dir: 'desc' });
  assert.equal(choiceFor('ext_color', 'desc').id, 'color-desc');
});

test('every key and direction a desktop header can set maps to an option with the same key and direction', () => {
  const keys = ['ext_color', 'model_year', 'body_style', 'drivetrain', 'interior_color', 'location_state', 'forum_username'] as const;
  for (const key of keys) {
    for (const dir of ['asc', 'desc'] as const) {
      const c = choiceFor(key, dir);
      assert.equal(c.key, key);
      assert.equal(c.dir, dir, `${key} ${dir} must not be shown as ${c.label}`);
    }
  }
});

test('a descending state with no listed option gets a truthful label, not the ascending one', () => {
  assert.equal(choiceFor('body_style', 'desc').label, 'Model, reversed');
  assert.equal(choiceFor('forum_username', 'desc').label, 'Forum user, reversed');
});
