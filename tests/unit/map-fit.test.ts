import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitBox, shouldFitToData } from '../../src/lib/map-fit';

test('fitBox returns null with nothing located', () => {
  assert.equal(fitBox([]), null);
});

test('fitBox gives a zero-size box for one point', () => {
  assert.deepEqual(fitBox([{ lat: 40, lng: -100 }]), { south: 40, west: -100, north: 40, east: -100 });
});

test('fitBox keeps every point in a small set', () => {
  const box = fitBox([
    { lat: 40, lng: -100 },
    { lat: 50, lng: 10 },
  ]);
  assert.deepEqual(box, { south: 40, west: -100, north: 50, east: 10 });
});

test('fitBox drops far outliers from a large set', () => {
  const us = Array.from({ length: 18 }, (_, i) => ({ lat: 30 + i, lng: -120 + i * 2 }));
  const far = [
    { lat: 52, lng: 13 },
    { lat: -26, lng: 28 },
  ];
  const box = fitBox([...us, ...far])!;
  assert.ok(box.east < 0, `east ${box.east} should stay in the Americas`);
});

test('only phone-width maps fit to the data; wider maps keep the world view (#72)', () => {
  assert.equal(shouldFitToData(358), true);
  assert.equal(shouldFitToData(719), true);
  assert.equal(shouldFitToData(720), false);
  assert.equal(shouldFitToData(1392), false);
});
