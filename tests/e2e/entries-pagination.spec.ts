import { test, expect } from '@playwright/test';

test.describe('Entries table pagination, sorting, filtering', () => {
  test('shows at most 50 rows per page', async ({ page }) => {
    await page.goto('/entries');
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeLessThanOrEqual(50);
  });

  test('shows "Showing 1–50 of N" text when N > 50, and Next advances to ?page=2', async ({ page }) => {
    await page.goto('/entries');
    const bodyText = await page.locator('body').innerText();
    const match = bodyText.match(/Showing 1–50 of (\d+) entries/);

    if (!match) {
      test.skip(true, 'Registry has 50 or fewer entries; pagination text not applicable');
      return;
    }

    const total = parseInt(match[1], 10);
    expect(total).toBeGreaterThan(50);

    const nextBtn = page.getByRole('button', { name: 'Next page' });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();
    await expect(page).toHaveURL(/[?&]page=2/);
  });

  test('clicking a sortable header button toggles aria-sort', async ({ page }) => {
    await page.goto('/entries');
    const colorHeader = page.locator('th[aria-sort]').filter({ hasText: 'Color' });
    await expect(colorHeader).toHaveAttribute('aria-sort', /ascending|descending|none/);

    const before = await colorHeader.getAttribute('aria-sort');
    await colorHeader.getByRole('button').click();
    const after = await colorHeader.getAttribute('aria-sort');
    expect(after).not.toBe(before);
    expect(['ascending', 'descending']).toContain(after);
  });

  test('filter input has the correct aria-label', async ({ page }) => {
    await page.goto('/entries');
    const filterInput = page.getByLabel('Filter entries');
    await expect(filterInput).toBeVisible();
  });
});
