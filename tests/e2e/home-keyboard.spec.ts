import { test, expect } from '@playwright/test';
import { gotoLoaded } from './helpers';

// #82: a skip link on every page, and the 71-strip wall is one tab stop (roving tabindex).
const STRIPS = '[data-wall-strip]';

test.describe('Keyboard: skip link and one tab stop for the wall (#82)', () => {
  test('a skip link is the first Tab stop and moves focus to the main content', async ({ page }) => {
    await gotoLoaded(page, '/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.locator('#main-content')).toBeFocused();
    // The next Tab lands inside the page, not back in the header.
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#main-content'))).toBe(true);
  });

  test('the skip link is there on other pages too', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  });

  test('Tab from the hero lands on the wall once, then on the single-build row', async ({ page }) => {
    await gotoLoaded(page, '/');
    await expect(page.locator(STRIPS).first()).toBeVisible();
    await page.getByRole('link', { name: 'Browse all builds' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(`${STRIPS}:focus`)).toHaveCount(1);
    await page.keyboard.press('Tab');
    const region = page.getByRole('region', { name: 'Paints with a single build' });
    await expect(region.getByRole('link').first()).toBeFocused();
    // Exactly one strip is in the tab order.
    await expect(page.locator(`${STRIPS}[tabindex="0"]`)).toHaveCount(1);
  });

  test('arrow keys, Home and End move between strips; Enter opens the strip', async ({ page }) => {
    await gotoLoaded(page, '/');
    const strips = page.locator(STRIPS);
    await expect(strips.first()).toBeVisible();
    const last = (await strips.count()) - 1;
    await page.getByRole('link', { name: 'Browse all builds' }).focus();
    await page.keyboard.press('Tab');
    await expect(strips.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(strips.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(strips.nth(2)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(strips.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(strips.nth(last)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(strips.nth(last)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(strips.nth(0)).toBeFocused();
    // Tab away and back: the wall remembers the strip you were on.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(strips.nth(1)).toBeFocused();
    const href = await strips.nth(1).getAttribute('href');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });
});
