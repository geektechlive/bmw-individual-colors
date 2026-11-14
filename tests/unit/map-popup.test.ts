import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPopupHtml, escapeHtml, locationLine } from '../../src/lib/map-popup';
import type { BmwEntry } from '../../src/types';

const CLASSES = {
  body: 'b', head: 'h', swatch: 'sw', name: 'n', meta: 'm', location: 'l', link: 'k',
};

function entry(over: Partial<BmwEntry> = {}): BmwEntry {
  return {
    id: '1', model_year: 2023, body_style: 'M3', competition: true, drivetrain: 'xDrive',
    transmission: 'Automatic', ext_color: 'Isle of Man Green', location_city: 'Leeds',
    location_state: null, location_country: 'UK',
    ...over,
  } as BmwEntry;
}

test('escapeHtml escapes the five HTML-significant characters', () => {
  assert.equal(escapeHtml(`<a href="x" b='y'>&`), '&lt;a href=&quot;x&quot; b=&#39;y&#39;&gt;&amp;');
});

test('locationLine joins the present parts and escapes them', () => {
  assert.equal(locationLine(entry({ location_city: '<b>', location_state: 'W' })), '&lt;b&gt;, W, UK');
  assert.equal(locationLine(entry({ location_city: null, location_country: null })), '');
});

test('popup shows paint name, build line, location and a link to the color page', () => {
  const html = buildPopupHtml(entry(), '#123456', 'swatchcls', CLASSES);
  assert.match(html, /class="n paint-name"[^>]*>Isle of Man Green</);
  assert.match(html, /2023 BMW M3 Competition/);
  assert.match(html, /xDrive · Automatic/);
  assert.match(html, /Leeds, UK/);
  assert.match(html, /<a class="k" href="\/colors\/isle-of-man-green"[^>]*>View paint</);
  assert.match(html, /class="swatchcls sw" style="--p:#123456"/);
});

test('popup escapes user-supplied values and slugs the link', () => {
  const html = buildPopupHtml(
    entry({ ext_color: '"><img src=x onerror=alert(1)>', body_style: '<script>' }),
    '#123456',
    'c',
    CLASSES,
  );
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script>'));
  assert.match(html, /href="\/colors\/img-src-x-onerror-alert-1"/);
});

test('popup omits the location row when there is none', () => {
  const html = buildPopupHtml(entry({ location_city: null, location_country: null }), '#123456', 'c', CLASSES);
  assert.ok(!html.includes('class="l"'));
});
