import { test, expect } from '@playwright/test';

test.describe('Edit link with invalid/garbage token', () => {
  test('shows the verify form, not the edit form, for a garbage token', async ({ page }) => {
    await page.goto('/entries');
    const href = await page.locator('a[href*="/edit/"]').first().getAttribute('href');
    expect(href).toBeTruthy();
    const id = href!.split('/edit/')[1].split(/[?#]/)[0];

    await page.goto(`/edit/${id}?token=garbage&exp=9999999999999`);

    // Verify form: forum_username input present.
    await expect(page.locator('input[name="forum_username"]')).toBeVisible();

    // Must NOT show the edit form's "Save Changes" button.
    await expect(page.getByRole('button', { name: /save changes/i })).toHaveCount(0);

    // Sanity: page copy confirms we're on the verification step.
    await expect(page.getByText(/verify you/i)).toBeVisible();
  });
});
