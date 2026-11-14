import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoLoaded } from './helpers';

// Axe on the main routes (desktop). Axe does not judge text on gradients ("incomplete"), so
// contrast pairs are covered by unit tests instead.
//
// KNOWN_ISSUES is the visible debt: rules that fail on a route today. Each one has a
// test.fixme below that flips to a real assertion once the app is fixed. Anything NOT listed
// here must be clean, so a new violation fails the suite. Remove an entry when it is fixed.
const ROUTES = ['/', '/colors', '/colors/san-marino-blue', '/entries', '/reports', '/map', '/submit'];

// Empty: the four violations found on 2026-11-14 (empty flag/edit headers, "Prev" label
// mismatch, unfocusable report matrices, default yellow map clusters) are fixed.
const KNOWN_ISSUES: Readonly<Record<string, readonly string[]>> = {};

async function violationIds(page: Page, route: string): Promise<string[]> {
  await gotoLoaded(page, route);
  if (route === '/map') await expect(page.locator('.leaflet-container')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.map((v) => v.id);
}

for (const route of ROUTES) {
  test(`axe: ${route} has no violations beyond the known issues`, async ({ page }) => {
    const known = KNOWN_ISSUES[route] ?? [];
    const unexpected = (await violationIds(page, route)).filter((id) => !known.includes(id));
    expect(unexpected).toEqual([]);
  });
}

for (const [route, rules] of Object.entries(KNOWN_ISSUES)) {
  for (const rule of rules) {
    test.fixme(`axe: ${route} passes "${rule}" (known issue)`, async ({ page }) => {
      expect(await violationIds(page, route)).not.toContain(rule);
    });
  }
}
