import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDesignCheckEnabled } from '../../src/lib/design-check';

test('the design-check fixture page is disabled in production', () => {
  assert.equal(isDesignCheckEnabled('production'), false);
});

test('the design-check fixture page is enabled in development and test', () => {
  assert.equal(isDesignCheckEnabled('development'), true);
  assert.equal(isDesignCheckEnabled('test'), true);
  assert.equal(isDesignCheckEnabled(undefined), true);
});
