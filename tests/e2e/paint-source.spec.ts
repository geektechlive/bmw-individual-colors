import { test, expect } from '@playwright/test';
import { gotoLoaded } from './helpers';

// Paint names follow BMW and every paint page shows its source (#93, ADR 0019).
// The 308 itself is answered by worker.ts, which `next dev` does not run (tests/unit/legacy-slugs.test.ts
// covers it); here the old URL must still end on the new page, via the page's own redirect.

test.describe('Paint source line (#93)', () => {
  test('a BMW paint shows its code and the BMW Individual link', async ({ page }) => {
    await gotoLoaded(page, '/colors/twilight-purple-pearl-effect');
    const source = page.locator('[data-paint-source="bmw"]');
    await expect(source).toContainText('BMW code');
    await expect(source).toContainText('P28');
    await expect(source.getByRole('link', { name: 'BMW Individual' })).toHaveAttribute(
      'href',
      'https://individual.bmw-m.com/en-US/colors',
    );
  });

  test('an unverified paint says so and links its note', async ({ page }) => {
    await gotoLoaded(page, '/colors/mexico-blue');
    const source = page.locator('[data-paint-source="unverified"]');
    await expect(source).toContainText("Not in BMW's paint list; name as owners gave it.");
    await expect(source).toContainText('Reported renamed by BMW to Daytona Beach Blue.');
    await expect(source.getByRole('link', { name: 'carpaints.co' })).toBeVisible();
  });

  test('an old paint URL ends on the BMW-named page', async ({ page }) => {
    await page.goto('/colors/twilight-purple');
    await expect(page).toHaveURL(/\/colors\/twilight-purple-pearl-effect$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Twilight Purple Pearl effect');
  });
});
