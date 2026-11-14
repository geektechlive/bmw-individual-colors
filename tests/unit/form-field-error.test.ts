import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldForError, fieldErrorProps, FORM_ERROR_ID } from '../../src/components/form/field-error';

// The server returns one error string. The form ties it to the field it is about, so a
// screen reader hears the message when it lands on that field (#41).

test('maps each validation message to its field id', () => {
  assert.equal(fieldForError('Model year is required.'), 'model_year');
  assert.equal(fieldForError('Model year must be between 2021 and 2030.'), 'model_year');
  assert.equal(fieldForError('Transmission must be 8AT or 6MT.'), 'transmission');
  assert.equal(fieldForError('Individual color is required.'), 'ext_color');
  assert.equal(fieldForError('Forum username must be 2–40 characters.'), 'forum_username');
  assert.equal(fieldForError('Notes must be 1000 characters or fewer.'), 'notes');
});

test('returns null for errors that are not about one field', () => {
  assert.equal(fieldForError('Bot verification failed. Please try again.'), null);
  assert.equal(fieldForError('Failed to save your submission. Please try again.'), null);
  assert.equal(fieldForError(undefined), null);
});

test('fieldErrorProps marks only the matching field', () => {
  assert.deepEqual(fieldErrorProps('notes', 'notes'), {
    'aria-invalid': true,
    'aria-describedby': FORM_ERROR_ID,
  });
  assert.deepEqual(fieldErrorProps('notes', 'ext_color'), {});
  assert.deepEqual(fieldErrorProps('notes', null), {});
});
