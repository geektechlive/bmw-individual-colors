import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tileUrl, TILE_ATTRIBUTION } from '../../src/lib/map-tiles';

// CARTO basemaps need a key (#54); without one every tile is an "API KEY REQUIRED" image.

test('the tile URL is the keyed CARTO dark raster endpoint, with retina support', () => {
  assert.equal(
    tileUrl('abc123'),
    'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=abc123'
  );
});

test('the key is URL-encoded', () => {
  assert.match(tileUrl('a b&c'), /\?key=a%20b%26c$/);
});

test('the default URL carries a key (never the keyless watermark endpoint)', () => {
  assert.match(tileUrl(), /\?key=\S+$/);
});

test('attribution keeps OpenStreetMap and CARTO, as CARTO requires', () => {
  assert.match(TILE_ATTRIBUTION, /OpenStreetMap/);
  assert.match(TILE_ATTRIBUTION, /CARTO/);
});
