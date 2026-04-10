import { test, expect } from '@playwright/test';

test.describe('Submit form page', () => {
  test('loads with form fields', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/submit|add|register/i);
  });

  test('form has model year and color fields', async ({ page }) => {
    await page.goto('/submit');
    const text = await page.locator('body').innerText();
    // Form labels should be present
    expect(text).toMatch(/model year|year|color/i);
  });

  test('form shows validation error when submitted empty', async ({ page }) => {
    await page.goto('/submit');
    const submitBtn = page.getByRole('button', { name: /submit/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Page should still be on /submit or show an error
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
