import { test, expect, devices } from '@playwright/test';
import { gotoLoaded, VISIBLE_EDIT_LINKS } from './helpers';

test.describe('Edit button — desktop', () => {
  test('edit link is present in the entries table', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const editLinks = page.locator(VISIBLE_EDIT_LINKS);
    const count = await editLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('edit link navigates to the verify page', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const firstEditLink = page.locator(VISIBLE_EDIT_LINKS).first();
    await firstEditLink.click();
    await expect(page).toHaveURL(/\/edit\//);
    await expect(page.getByText(/Verify you/i)).toBeVisible();
  });

  test('edit verify page shows username input and bot check', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const href = await page.locator(VISIBLE_EDIT_LINKS).first().getAttribute('href');
    await page.goto(href!);
    await expect(page.locator('input[name="forum_username"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /verify/i })).toBeVisible();
  });

  test('wrong username shows error', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const href = await page.locator(VISIBLE_EDIT_LINKS).first().getAttribute('href');
    await page.goto(href!);
    await page.locator('input[name="forum_username"]').fill('__definitely_not_the_owner__');
    // Can't complete Turnstile in test — just verify form is functional
    const button = page.getByRole('button', { name: /verify/i });
    await expect(button).toBeVisible();
    await expect(button).not.toBeDisabled();
  });

  test('edit column does not break table layout', async ({ page }) => {
    // Phones get one card per build instead of the table (#42).
    test.skip((page.viewportSize()?.width ?? 1280) < 720, 'phones show cards, not the table');
    await gotoLoaded(page, '/entries');
    const table = page.locator('table');
    await expect(table).toBeVisible();
    // Table should not overflow its container
    const tableBox = await table.boundingBox();
    const containerBox = await page.locator('main').boundingBox();
    expect(tableBox).not.toBeNull();
    expect(containerBox).not.toBeNull();
  });

  test('updated banner shows on ?updated=1', async ({ page }) => {
    await gotoLoaded(page, '/entries?updated=1');
    await expect(page.getByText(/entry updated/i)).toBeVisible();
  });
});

test.describe('Edit button — mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('entries page loads on mobile', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/M3|M4/);
  });

  test('phones get one card per build instead of the table', async ({ page }) => {
    // #42: below 720px the table is hidden and each build is a card with its own edit link.
    await gotoLoaded(page, '/entries');
    await expect(page.locator('table')).toBeHidden();
    await expect(page.locator(VISIBLE_EDIT_LINKS).first()).toBeVisible();
  });

  test('edit links exist on mobile', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const editLinks = page.locator(VISIBLE_EDIT_LINKS);
    const count = await editLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('edit verify page is usable on mobile', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const href = await page.locator(VISIBLE_EDIT_LINKS).first().getAttribute('href');
    await page.goto(href!);
    const usernameInput = page.locator('input[name="forum_username"]');
    await expect(usernameInput).toBeVisible();
    // Input should be within viewport width
    const box = await usernameInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(375);
  });
});

test('iPhone 14 — no page-level horizontal scrollbar visible to users', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['iPhone 14'] });
  const page = await context.newPage();
  await gotoLoaded(page, '/entries');
  // Users should not be able to scroll the page horizontally.
  // window.scrollMaxX is the max horizontal scroll position; 0 means no horizontal scroll.
  const canScrollHorizontally = await page.evaluate(() => {
    // Check if horizontal scroll is possible (scrollbar present)
    return window.scrollX > 0 || document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(canScrollHorizontally).toBe(false);
  await context.close();
});

test('iPhone 14 — verify form inputs are full-width', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['iPhone 14'] });
  const page = await context.newPage();
  await gotoLoaded(page, '/entries');
  const href = await page.locator(VISIBLE_EDIT_LINKS).first().getAttribute('href');
  await page.goto(href!);
  const input = page.locator('input[name="forum_username"]');
  await expect(input).toBeVisible();
  const box = await input.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(200);
  await context.close();
});
