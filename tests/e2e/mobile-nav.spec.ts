import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test.describe('Mobile hamburger nav', () => {
  test('menu button is visible and collapsed by default, expands on click, Escape closes', async ({ page }) => {
    await page.goto('/');
    const menuBtn = page.locator('button[aria-label="Menu"]');
    await expect(menuBtn).toBeVisible();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');

    const mobileNav = page.locator('nav.nav-mobile--open');
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Entries' })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Colors' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('nav.nav-mobile--open')).toHaveCount(0);
  });
});

test.describe('No horizontal overflow at 375px', () => {
  for (const path of ['/', '/entries', '/colors']) {
    test(`document does not overflow horizontally on ${path}`, async ({ page }) => {
      await page.goto(path);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflows).toBe(false);
    });
  }
});
