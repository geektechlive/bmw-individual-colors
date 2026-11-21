import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSpeedShape, SPEED_SHAPE } from '../../src/lib/paint-3d/speed-shape';

// #96: the speed shape is built in code. These checks stand in for looking at it: a closed
// loft, finite numbers, the expected size, and triangles that face outward.

const shape = buildSpeedShape();
const { positions: P, uvs, indices: I } = shape;
const { NU, NV, L } = SPEED_SHAPE;

test('vertex and index counts match the loft grid', () => {
  assert.equal(shape.vertexCount, (NU + 1) * (NV + 1));
  assert.equal(P.length, shape.vertexCount * 3);
  assert.equal(uvs.length, shape.vertexCount * 2);
  assert.equal(I.length, NU * NV * 6);
  assert.ok(I instanceof Uint32Array, 'more than 65k vertices needs 32-bit indices');
});

test('every index is in range and every number is finite', () => {
  for (const v of I) assert.ok(v < shape.vertexCount);
  for (const v of P) assert.ok(Number.isFinite(v));
  for (const v of uvs) assert.ok(Number.isFinite(v));
});

test('it is as long as the loft and sits on a flat base', () => {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxZ = 0;
  for (let i = 0; i < P.length; i += 3) {
    minX = Math.min(minX, P[i]); maxX = Math.max(maxX, P[i]);
    minY = Math.min(minY, P[i + 1]); maxY = Math.max(maxY, P[i + 1]);
    maxZ = Math.max(maxZ, Math.abs(P[i + 2]));
  }
  assert.ok(Math.abs(minX + L / 2) < 1e-6 && Math.abs(maxX - L / 2) < 1e-6);
  assert.ok(minY >= -0.06 && minY < 0, `base at ${minY}`);
  assert.ok(maxY > 0.8 && maxY < 1.4, `roof at ${maxY}`);
  assert.ok(maxZ > 0.8 && maxZ < 1.1, `half width ${maxZ}`);
});

test('the seam closes: first and last ring coincide', () => {
  for (let i = 0; i <= NU; i++) {
    const a = (i * (NV + 1)) * 3, b = (i * (NV + 1) + NV) * 3;
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(P[a + k] - P[b + k]) < 1e-5, `ring ${i} axis ${k}`);
  }
});

test('the nose and tail rings collapse to a point so the loft is closed', () => {
  for (const i of [0, NU]) {
    for (let j = 0; j <= NV; j++) {
      const o = (i * (NV + 1) + j) * 3;
      assert.ok(Math.abs(P[o + 2]) < 1e-3, `ring ${i} vertex ${j} z=${P[o + 2]}`);
    }
  }
});

test('triangles face outward: the signed volume is positive', () => {
  let volume = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    volume +=
      (P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) -
        P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) +
        P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c])) / 6;
  }
  assert.ok(volume > 0.5, `signed volume ${volume}`);
});
