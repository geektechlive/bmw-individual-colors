import { test, expect } from '@playwright/test';

test.describe('Entries page', () => {
  test('loads and shows table with data', async ({ page }) => {
    await page.goto('/entries');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/M3|M4/);
    expect(text).toMatch(/color/i);
  });

  test('table has multiple rows of data', async ({ page }) => {
    await page.goto('/entries');
    // Table rows (excluding header) should be multiple
    const rows = page.locator('table tbody tr, [role="row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(5);
  });

  test('filter controls are present', async ({ page }) => {
    await page.goto('/entries');
    const text = await page.locator('body').innerText();
    // Filter bar uses Body/Drive/Trans labels
    expect(text).toMatch(/Body:|Drive:|Trans:/);
  });
});
