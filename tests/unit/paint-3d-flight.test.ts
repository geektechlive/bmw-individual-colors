import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ease, lerp, smooth, viewMetrics, rectToPose, targetPose, stepMix, OPEN_MS, CLOSE_MS, SWAP_IN_MS, SWAP_OUT_MS } from '../../src/lib/paint-3d/flight';

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

// #97: the card-to-shape swap is timed in milliseconds, not frames.
const run = (hz: number, ms: number, target = 1, dur = SWAP_IN_MS, start = 0) => {
  let mix = start;
  for (let t = 0; t < ms; t += 1000 / hz) mix = stepMix(mix, target, 1000 / hz, dur);
  return mix;
};

test('the swap takes the same time at 60 Hz and 120 Hz', () => {
  const at60 = run(60, 500);
  const at120 = run(120, 500);
  assert.ok(Math.abs(at60 - at120) < 0.02, `60 Hz ${at60} vs 120 Hz ${at120}`);
  assert.ok(at60 > 0.3 && at60 < 0.6, 'about half done after 0.5 s');
});

test('the swap is slow enough to watch, and finishes', () => {
  assert.ok(SWAP_IN_MS >= 900, 'turning into the speed shape takes about a second');
  assert.ok(SWAP_OUT_MS >= 600, 'turning back into the card is slow enough to watch too');
  assert.ok(SWAP_OUT_MS < CLOSE_MS, 'shrinking back finishes before the card lands');
  assert.ok(OPEN_MS >= 700 && CLOSE_MS >= 800, 'the flights are not rushed either');
  assert.equal(run(60, SWAP_IN_MS + 50), 1);
  assert.equal(run(60, SWAP_OUT_MS + 50, 0, SWAP_OUT_MS, 1), 0);
});

test('the swap never overshoots and ignores bad frame gaps', () => {
  assert.equal(stepMix(0.95, 1, 1000, SWAP_IN_MS), 1);
  assert.equal(stepMix(0.05, 0, 1000, SWAP_OUT_MS), 0);
  assert.equal(stepMix(0.5, 1, -16, SWAP_IN_MS), 0.5, 'a negative gap does not move it');
});

test('a zero duration (reduced motion) jumps straight to the target', () => {
  assert.equal(stepMix(0, 1, 16, 0), 1);
  assert.equal(stepMix(1, 0, 16, 0), 0);
});

test('the target pose fits half the view and stays above centre', () => {
  const t = targetPose(m);
  assert.equal(t.x, 0);
  assert.ok(t.y > 0 && t.s > 0);
  const wide = targetPose(viewMetrics(2000, 400, 20, 9));
  assert.ok(wide.s < t.s * 2, 'limited by height on a wide, short view');
});
