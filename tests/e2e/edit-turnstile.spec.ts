import { test, expect, type Page } from '@playwright/test';
import { clickNav, gotoLoaded, openFirstEditLink } from './helpers';

/*
 * #90: the security check must appear however a visitor reaches a form. The Turnstile
 * script loads once from the root layout, so a form mounted by an in-app link (client-side
 * navigation) used to get an empty box and a submit button that never enabled. These tests
 * click real links instead of page.goto(href), which is a full load and hid the bug.
 * Runs in chromium and mobile (the file name matches the mobile project's `edit`).
 */

const TOKEN = 'input[name="cf-turnstile-response"]';

async function expectOneIssuedToken(page: Page) {
  await expect(page.locator(TOKEN)).toHaveCount(1, { timeout: 20000 });
  await expect.poll(async () => page.locator(TOKEN).inputValue(), { timeout: 20000 }).not.toBe('');
}

const clickNavSubmit = (page: Page) => clickNav(page, 'Submit');

test('edit verify: the check appears after an in-app link and the button enables', async ({ page }) => {
  await gotoLoaded(page, '/entries');
  await (await openFirstEditLink(page)).click();
  await expect(page).toHaveURL(/\/edit\//);
  await expectOneIssuedToken(page);
  await page.locator('#forum_username').fill('someone');
  await expect(page.getByRole('button', { name: 'Verify & Edit' })).toBeEnabled();
});

test('submit: the check appears after the nav Submit link', async ({ page }) => {
  await gotoLoaded(page, '/');
  await clickNavSubmit(page);
  await expect(page).toHaveURL(/\/submit$/);
  await expectOneIssuedToken(page);
});

test('edit verify: a full page load renders exactly one check', async ({ page }) => {
  await gotoLoaded(page, '/entries');
  const href = await (await openFirstEditLink(page)).getAttribute('href');
  await page.goto(href!);
  await expectOneIssuedToken(page);
  await page.waitForTimeout(1500);
  await expect(page.locator(TOKEN)).toHaveCount(1);
});

test('submit: leaving and coming back by links still renders one check', async ({ page }) => {
  await gotoLoaded(page, '/submit');
  await expectOneIssuedToken(page);
  await clickNav(page, 'Home');
  await expect(page).toHaveURL(/\/$/);
  await clickNavSubmit(page);
  await expect(page).toHaveURL(/\/submit$/);
  await expectOneIssuedToken(page);
});
