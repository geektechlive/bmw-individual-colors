import { test, expect } from '@playwright/test';
import { gotoLoaded } from './helpers';

test.describe('Reports page', () => {
  test('loads and renders chart sections', async ({ page }) => {
    await gotoLoaded(page, '/reports');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    // Key chart headings present
    expect(text).toMatch(/registry growth/i);
    expect(text).toMatch(/color/i);
  });

  test('Registry Growth chart is present and has SVG', async ({ page }) => {
    await gotoLoaded(page, '/reports');
    // Wait for Recharts to render
    await page.waitForSelector('svg', { timeout: 10000 });
    const svgs = page.locator('svg');
    await expect(svgs.first()).toBeVisible();
  });

  test('Registry Growth chart X-axis shows years spanning 2021+', async ({ page }) => {
    await gotoLoaded(page, '/reports');
    // Backdated posts put at least one tick before 2025 on the growth axis.
    await expect(page.locator('#growth .recharts-xAxis-tick-labels')).toContainText(/202[1-4]/, { timeout: 15000 });
  });

  test('Registry Growth X-axis is a true time scale: year ticks are evenly spaced', async ({ page }) => {
    await gotoLoaded(page, '/reports');
    const ticks = page.locator('#growth .recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value');
    await expect(ticks.first()).toBeVisible({ timeout: 15000 });
    const labels = await ticks.allTextContents();
    expect(labels.every((l) => /^\d{4}$/.test(l))).toBe(true);
    const years = labels.map(Number);
    // Only meaningful with three or more consecutive year ticks.
    expect(years.length).toBeGreaterThanOrEqual(3);
    const xs = await ticks.evaluateAll((els) => els.map((el) => Number(el.getAttribute('x'))));
    const gaps = xs.slice(1).map((x, i) => (x - xs[i]) / (years[i + 1] - years[i]));
    for (const g of gaps) expect(Math.abs(g - gaps[0]) / gaps[0]).toBeLessThan(0.05);
  });

  test('shows only the five kept charts', async ({ page }) => {
    await gotoLoaded(page, '/reports');
    const headings = await page.locator('main h2').allTextContents();
    expect(headings).toEqual([
      'Registry growth',
      'Paints by build count',
      'M3 and M4, RWD and AWD',
      'Wheel popularity',
      'Paint popularity by model year',
    ]);
  });

  test('filter bar renders on reports page', async ({ page }) => {
    await gotoLoaded(page, '/reports');
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/M3|M4|All/);
  });

  test('charts lazy-load: skeletons replaced by SVG charts', async ({ page }) => {
    await gotoLoaded(page, '/reports');
    // Wait until multiple SVGs are in the DOM — dynamic imports fire after hydration
    // so we poll until Recharts has rendered at least 3 charts (each produces an SVG)
    await page.waitForFunction(
      () => document.querySelectorAll('svg').length >= 3,
      { timeout: 15000 }
    );
    const svgCount = await page.locator('svg').count();
    expect(svgCount).toBeGreaterThan(2);
    // All skeletons should be gone once charts are fully loaded
    const remainingSkeletons = await page.locator('.skeleton').count();
    expect(remainingSkeletons).toBe(0);
  });
});
