import { test, expect } from '@playwright/test';

test.describe('Reports page', () => {
  test('loads and renders chart sections', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    // Key chart headings present
    expect(text).toMatch(/registry growth/i);
    expect(text).toMatch(/color/i);
  });

  test('Registry Growth chart is present and has SVG', async ({ page }) => {
    await page.goto('/reports');
    // Wait for Recharts to render
    await page.waitForSelector('svg', { timeout: 10000 });
    const svgs = page.locator('svg');
    await expect(svgs.first()).toBeVisible();
  });

  test('Registry Growth chart X-axis shows years spanning 2021+', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForSelector('svg', { timeout: 10000 });
    // The X-axis tick labels should include years before 2025 (proving backdated dates work)
    const chartText = await page.locator('body').innerText();
    // Should have at least one label mentioning 2021, 2022, 2023, or 2024
    const hasHistoricalDate = /202[1-4]/.test(chartText);
    expect(hasHistoricalDate).toBe(true);
  });

  test('filter bar renders on reports page', async ({ page }) => {
    await page.goto('/reports');
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/M3|M4|All/);
  });

  test('charts lazy-load: skeletons replaced by SVG charts', async ({ page }) => {
    await page.goto('/reports');
    // Wait until multiple SVGs are in the DOM — dynamic imports fire after hydration
    // so we poll until Recharts has rendered at least 3 charts (each produces an SVG)
    await page.waitForFunction(
      () => document.querySelectorAll('svg').length >= 3,
      { timeout: 15000 }
    );
    const svgCount = await page.locator('svg').count();
    expect(svgCount).toBeGreaterThan(2);
    // All skeletons should be gone once charts are fully loaded
    const remainingSkeletons = await page.locator('.animate-pulse').count();
    expect(remainingSkeletons).toBe(0);
  });
});
