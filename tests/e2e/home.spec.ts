import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads with title and stats', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BMW.*Individual|Individual.*Colors/i);
    // Stats cards should show non-zero numbers
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Key nav links present
    await expect(page.getByRole('link', { name: /reports/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /entries/i }).first()).toBeVisible();
  });

  test('shows total entries stat > 0', async ({ page }) => {
    await page.goto('/');
    // Stats section should contain a number
    const text = await page.locator('body').innerText();
    const match = text.match(/(\d+)\s*(?:total\s*)?(?:entries|builds)/i);
    expect(match).not.toBeNull();
    const count = parseInt(match![1], 10);
    expect(count).toBeGreaterThan(0);
  });

  test('submit link navigates to form', async ({ page }) => {
    await page.goto('/');
    const submitLink = page.getByRole('link', { name: /submit/i }).first();
    await submitLink.click();
    await expect(page).toHaveURL('/submit');
  });
});
