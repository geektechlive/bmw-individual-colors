import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ease, lerp, smooth, viewMetrics, rectToPose, targetPose } from '../../src/lib/paint-3d/flight';

// #96: the flight starts exactly on the card's on-page rect and ends centred in the view.

const m = viewMetrics(1000, 800, 20, 9);

test('easing and smoothing are 0 at the start and 1 at the end', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.equal(smooth(0, 1, 0), 0);
  assert.equal(smooth(0, 1, 1), 1);
  assert.equal(smooth(0, 1, 2), 1);
  assert.equal(lerp(2, 4, 0.5), 3);
});

test('a rect centred on the screen maps to the world origin', () => {
  const pose = rectToPose({ left: 400, top: 300, width: 200, height: 200 }, m);
  assert.ok(Math.abs(pose.x) < 1e-9 && Math.abs(pose.y) < 1e-9);
});

test('screen y grows downward, world y upward', () => {
  const high = rectToPose({ left: 400, top: 0, width: 200, height: 100 }, m);
  const low = rectToPose({ left: 400, top: 600, width: 200, height: 100 }, m);
  assert.ok(high.y > 0 && low.y < 0);
});

test('the start scale makes a unit-high slab as tall as the rect', () => {
  const pose = rectToPose({ left: 0, top: 0, width: 100, height: 400 }, m);
  assert.ok(Math.abs(pose.s - 400 * m.wpp) < 1e-9);
});

test('the target pose fits half the view and stays above centre', () => {
  const t = targetPose(m);
  assert.equal(t.x, 0);
  assert.ok(t.y > 0 && t.s > 0);
  const wide = targetPose(viewMetrics(2000, 400, 20, 9));
  assert.ok(wide.s < t.s * 2, 'limited by height on a wide, short view');
});
