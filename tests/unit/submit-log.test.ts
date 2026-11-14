import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validationReason, rejectionLogLine } from '../../src/lib/submit-log';

// #59: log WHY a submission is turned away, with the reason only (no form values, no
// username, no IP). Real users failed to submit in November and nothing said why.

test('each validation message maps to its field', () => {
  assert.equal(validationReason('Model year is required.'), 'validation:model_year');
  assert.equal(validationReason('Model year must be between 2021 and 2028.'), 'validation:model_year');
  assert.equal(validationReason('Body style must be M3 or M4.'), 'validation:body_style');
  assert.equal(validationReason('Transmission must be 8AT or 6MT.'), 'validation:transmission');
  assert.equal(validationReason('Individual color is required.'), 'validation:ext_color');
  assert.equal(validationReason('Forum username must be 2–40 characters.'), 'validation:forum_username');
  assert.equal(validationReason('Notes must be 500 characters or fewer.'), 'validation:notes');
});

test('an unknown message is "validation:other" and never echoes the text', () => {
  const reason = validationReason('Something about bob_the_owner and 123 Main St');
  assert.equal(reason, 'validation:other');
  assert.doesNotMatch(reason, /bob|Main/);
});

test('the log line is one JSON object with msg, action and reason, and nothing else', () => {
  const line = rejectionLogLine('submit', 'duplicate');
  assert.deepEqual(JSON.parse(line), { msg: 'submission rejected', action: 'submit', reason: 'duplicate' });
});

test('edit rejections are told apart from submit rejections', () => {
  assert.equal(JSON.parse(rejectionLogLine('update', 'edit:expired')).action, 'update');
});
