import { test, expect } from '@playwright/test';
import { gotoLoaded } from './helpers';

// Direction B unit (d), #69: /entries on a phone is two-line rows, not cards. Runs in
// chromium (viewport forced to 390) and in the mobile project (iPhone 14, real WebKit).
test.use({ viewport: { width: 390, height: 844 } });

const TOGGLE = 'button[aria-label="More about this build"]';

test.describe('Entries on a phone', () => {
  test('the rows are visible and there is no card list or table', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await expect(page.locator('table')).toBeHidden();
    const rows = page.getByRole('list', { name: 'Builds' }).locator(':scope > li');
    await expect(rows).toHaveCount(50);
    await expect(rows.first()).toBeVisible();
    await expect(page.locator('li.card')).toHaveCount(0);
  });

  test('50 rows are under 4,000px tall in total', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const total = await page
      .getByRole('list', { name: 'Builds' })
      .evaluate((ul) => ul.getBoundingClientRect().height);
    expect(total).toBeLessThan(4000);
  });

  test('line 1 is swatch, paint link, year and model, chevron; line 2 is the specs', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const row = page.getByRole('list', { name: 'Builds' }).locator(':scope > li').first();
    await expect(row.locator('a[href^="/colors/"]')).toBeVisible();
    await expect(row.getByText(/^\d{4} M[34]( Comp)?$/)).toBeVisible();
    await expect(row.getByText(/^(RWD|AWD) · (8AT|6MT)/)).toBeVisible();
    const chev = row.locator(TOGGLE);
    const box = await chev.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(43.5);
    expect(box!.height).toBeGreaterThanOrEqual(43.5);
    const link = await row.locator('a[href^="/colors/"]').boundingBox();
    expect(link!.height).toBeGreaterThanOrEqual(43.5);
  });

  test('the chevron toggles aria-expanded and shows Interior, Location, Forum user, Posted', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const row = page.getByRole('list', { name: 'Builds' }).locator(':scope > li').nth(1);
    const chev = row.locator(TOGGLE);
    await expect(chev).toHaveAttribute('aria-expanded', 'false');
    await expect(row.getByText('Interior', { exact: true })).toBeHidden();
    await chev.click();
    await expect(chev).toHaveAttribute('aria-expanded', 'true');
    for (const label of ['Interior', 'Location', 'Forum user', 'Posted']) {
      await expect(row.getByText(label, { exact: true })).toBeVisible();
    }
    const panelId = await chev.getAttribute('aria-controls');
    await expect(page.locator(`#${panelId}`)).toBeVisible();
    await expect(row.getByRole('link', { name: 'Edit this build' })).toHaveAttribute('href', /\/edit\//);
    await expect(row.getByRole('button', { name: 'Report a problem' })).toBeVisible();
    await chev.click();
    await expect(chev).toHaveAttribute('aria-expanded', 'false');
  });

  test('"Report a problem" in an expanded row opens the reason picker', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const row = page.getByRole('list', { name: 'Builds' }).locator(':scope > li').first();
    await row.locator(TOGGLE).click();
    await row.getByRole('button', { name: 'Report a problem' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel("What's wrong with this entry?")).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel flagging this entry' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('all seven chips share one scrolling row', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const group = page.getByRole('group', { name: 'Filter builds' });
    const chips = group.locator('button.chip');
    await expect(chips).toHaveCount(7);
    const tops = await chips.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    const scrolls = await group.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(scrolls).toBe(true);
  });

  test('sort is one select, "Sort" + "Year, newest first", with the nine options', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const select = page.getByLabel('Sort builds');
    await expect(page.getByText('Sort', { exact: true })).toBeVisible();
    await expect(select.locator('option:checked')).toHaveText('Year, newest first');
    await expect(select.locator('option')).toHaveText([
      'Year, newest first',
      'Year, oldest first',
      'Color, A to Z',
      'Color, Z to A',
      'Model',
      'Drive',
      'Interior',
      'Location',
      'Forum user',
    ]);
    const first = page.getByRole('list', { name: 'Builds' }).locator(':scope > li').first();
    const newest = await first.getByText(/^\d{4} M/).innerText();
    await select.selectOption({ label: 'Year, oldest first' });
    const oldest = await first.getByText(/^\d{4} M/).innerText();
    expect(Number(oldest.slice(0, 4))).toBeLessThanOrEqual(Number(newest.slice(0, 4)));
    await select.selectOption({ label: 'Color, A to Z' });
    await expect(first.locator('a[href^="/colors/"]')).toHaveText(/^[A-C]/);
  });

  test('the count reads "1–50 of N" on a phone', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await expect(page.getByText(/^1–50 of \d+$/)).toBeVisible();
    await expect(page.getByText(/^Showing /)).toBeHidden();
  });

  test('no horizontal page scroll', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(over).toBe(false);
  });
});
