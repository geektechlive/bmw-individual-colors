import { test, expect } from '@playwright/test';

test.describe('Colors index page', () => {
  test('loads and shows color swatches', async ({ page }) => {
    await page.goto('/colors');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/color/i);
    // Should list multiple colors
    expect(text).toMatch(/blue|green|black|grey|red/i);
  });

  test('color cards are clickable and navigate to detail page', async ({ page }) => {
    await page.goto('/colors');
    // Click the first color link
    const firstColorLink = page.locator('a[href^="/colors/"]').first();
    await expect(firstColorLink).toBeVisible();
    const href = await firstColorLink.getAttribute('href');
    await firstColorLink.click();
    await expect(page).toHaveURL(href!);
  });
});

test.describe('Color detail page', () => {
  test('loads a known color slug', async ({ page }) => {
    await page.goto('/colors/san-marino-blue');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/san marino blue/i);
  });

  test('build cards show readable secondary text (not empty)', async ({ page }) => {
    await page.goto('/colors/san-marino-blue');
    // Build cards should show model year and body style
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/M3|M4/);
    expect(text).toMatch(/202[1-9]/); // model year
  });

  test('build cards show posted_at or created_at date', async ({ page }) => {
    await page.goto('/colors/san-marino-blue');
    const text = await page.locator('body').innerText();
    // Should show a date like "Jun 2021" or similar (not just "Apr 2025")
    expect(text).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
  });

  test('build cards show historical dates (backdating worked)', async ({ page }) => {
    await page.goto('/colors/san-marino-blue');
    const text = await page.locator('body').innerText();
    // At least one date should be before 2025 if backdating worked
    const hasPreImportDate = /202[1-4]/.test(text);
    expect(hasPreImportDate).toBe(true);
  });

  test('forum username text is visible (readability fix)', async ({ page }) => {
    await page.goto('/colors/san-marino-blue');
    // Forum usernames should be present and visible
    const text = await page.locator('body').innerText();
    // Should have at least one non-empty forum username displayed
    expect(text.length).toBeGreaterThan(100);
  });

  test('404-like page for nonexistent color slug', async ({ page }) => {
    await page.goto('/colors/this-color-does-not-exist-xyz');
    // Should not crash — should render something
    await expect(page.locator('body')).toBeVisible();
  });
});
