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
    const rows = page.locator('table tbody tr, [role="row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(5);
  });

  test('filter controls are present', async ({ page }) => {
    await page.goto('/entries');
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/Body:|Drive:|Trans:/);
  });
});

test.describe('Submission queue banner', () => {
  test('shows banner when ?submitted=1 is in the URL', async ({ page }) => {
    await page.goto('/entries?submitted=1');
    const banner = page.getByText(/in the queue/i);
    await expect(banner).toBeVisible();
  });

  test('banner contains the 5-minute message', async ({ page }) => {
    await page.goto('/entries?submitted=1');
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/5 minutes/i);
  });

  test('banner has a dismiss button', async ({ page }) => {
    await page.goto('/entries?submitted=1');
    const dismissBtn = page.getByRole('button', { name: /dismiss|close|×|✕/i });
    await expect(dismissBtn).toBeVisible();
  });

  test('banner disappears after clicking dismiss', async ({ page }) => {
    await page.goto('/entries?submitted=1');
    const banner = page.getByText(/in the queue/i);
    await expect(banner).toBeVisible();
    const dismissBtn = page.getByRole('button', { name: /dismiss|close|×|✕/i });
    await dismissBtn.click();
    await expect(banner).not.toBeVisible();
  });

  test('banner is NOT shown on /entries without ?submitted=1', async ({ page }) => {
    await page.goto('/entries');
    const banner = page.getByText(/in the queue/i);
    await expect(banner).not.toBeVisible();
  });
});
