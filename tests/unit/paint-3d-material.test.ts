import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FINISHES } from '../../src/lib/paint-finish';
import { materialParams, FLAKE_REPEAT } from '../../src/lib/paint-3d/material';

// #96: the finish decides how the 3D paint reacts to light. The mapping is pure so it can be
// checked without WebGL.

test('every finish maps to a complete parameter set with the paint color', () => {
  for (const finish of FINISHES) {
    const p = materialParams(finish, '#1e4c8c');
    assert.equal(p.color, '#1e4c8c', finish);
    for (const key of ['metalness', 'roughness', 'clearcoat', 'clearcoatRoughness', 'iridescence', 'sheen'] as const) {
      assert.ok(Number.isFinite(p[key]) && p[key] >= 0 && p[key] <= 1, `${finish}.${key}`);
    }
  }
});

test('solid is non-metallic clear coat with no flakes', () => {
  const p = materialParams('solid', '#a51c1c');
  assert.equal(p.metalness, 0);
  assert.equal(p.clearcoat, 1);
  assert.equal(p.flakeScale, null);
  assert.equal(p.iridescence, 0);
});

test('metallic is mostly metal with fine flakes under clear coat', () => {
  const p = materialParams('metallic', '#1e4c8c');
  assert.ok(p.metalness > 0.5);
  assert.equal(p.clearcoat, 1);
  assert.equal(p.flakeScale, 0.07);
});

test('pearl adds iridescence on top of metallic flakes', () => {
  const p = materialParams('pearl', '#5a3a7a');
  assert.ok(p.iridescence > 0.5);
  assert.deepEqual(p.iridescenceThicknessRange, [260, 620]);
  assert.equal(p.flakeScale, 0.05);
  assert.equal(p.clearcoat, 1);
});

test('frozen is matte: no clear coat, sheen and the softest flakes', () => {
  const p = materialParams('frozen', '#1e3a8a');
  assert.equal(p.clearcoat, 0);
  assert.ok(p.sheen > 0);
  assert.equal(p.flakeScale, 0.03);
  assert.ok(p.roughness > materialParams('metallic', '#000000').roughness);
});

test('the flake texture repeat is the fine 18 by 11 grid', () => {
  assert.deepEqual(FLAKE_REPEAT, [18, 11]);
});
