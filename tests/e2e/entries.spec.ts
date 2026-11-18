import { test, expect } from '@playwright/test';
import { gotoLoaded } from './helpers';

test.describe('Entries page', () => {
  test('loads and shows table with data', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/M3|M4/);
    expect(text).toMatch(/color/i);
  });

  test('table has multiple rows of data', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const rows = page.locator('table tbody tr, [role="row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(5);
  });

  test('filter controls are three groups: Model, Drive, Trans', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const groups = page.getByRole('group', { name: 'Filter builds' }).locator(':scope > [data-filter-group]');
    await expect(groups.locator('.label')).toHaveText(['Model', 'Drive', 'Trans']);
  });

  test('Comp sits inside the Model group, not Trans', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const model = page.locator('[data-filter-group="Model"]:visible');
    await expect(model.getByRole('button', { name: 'Comp' })).toBeVisible();
    await expect(page.locator('[data-filter-group="Trans"]:visible').getByRole('button', { name: 'Comp' })).toHaveCount(0);
  });

  test('Comp filters to Competition builds', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await page.locator('[data-filter-group="Model"]:visible').getByRole('button', { name: 'Comp' }).click();
    const models = await page.locator('table tbody tr td:nth-child(3)').allInnerTexts();
    expect(models.length).toBeGreaterThan(0);
    for (const m of models) expect(m).toMatch(/Comp/);
  });

  test('Comp is a two-state toggle: pressed shows Comp only, a second click shows all (#77)', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const comp = page.locator('[data-filter-group="Model"]:visible').getByRole('button', { name: 'Comp' });
    const models = () => page.locator('table tbody tr td:nth-child(3)').allInnerTexts();
    await expect(comp).toHaveAttribute('aria-pressed', 'false');
    const all = await models();
    expect(all.some((m) => !/Comp/.test(m))).toBe(true);

    await comp.click();
    await expect(comp).toHaveAttribute('aria-pressed', 'true');
    const only = await models();
    expect(only.length).toBeGreaterThan(0);
    for (const m of only) expect(m).toMatch(/Comp/);

    await comp.click();
    await expect(comp).toHaveAttribute('aria-pressed', 'false');
    expect((await models()).some((m) => !/Comp/.test(m))).toBe(true);

    await comp.click();
    await comp.click();
    await expect(comp).toHaveAttribute('aria-pressed', 'false');
    expect((await models()).some((m) => !/Comp/.test(m))).toBe(true);
  });

  test('the count reads "Showing 1–50 of N entries" on desktop', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await expect(page.getByText(/^Showing 1–50 of \d+ entries$/)).toBeVisible();
  });
});

test.describe('Build Sheet table', () => {
  test('headers keep "Color" and "Forum User", with sort buttons at least 44x44', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await expect(page.getByRole('columnheader', { name: /^Color/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /^Forum User/ })).toBeVisible();
    for (const btn of await page.locator('thead button').all()) {
      const box = await btn.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(43.5);
      expect(box!.width).toBeGreaterThanOrEqual(43.5);
    }
  });

  test('rows are 52px tall with no zebra stripes', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const rows = page.locator('table tbody tr');
    const box = await rows.first().boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(51.5);
    const bg0 = await rows.nth(0).locator('td').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    const bg1 = await rows.nth(1).locator('td').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg0).toBe(bg1);
  });

  test('interior and location are two-line cells with nothing cut off', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const cell = page.locator('table tbody tr').first().locator('td').nth(7);
    await expect(cell.locator('span > span')).toHaveCount(2);
    const overflow = await cell.evaluate((el) => getComputedStyle(el).textOverflow);
    expect(overflow).toBe('clip');
  });
});

test.describe('Row action (the ··· menu)', () => {
  const ACTION = 'button[aria-label="Edit or report this build"]';

  test('every row has exactly one action button and no red flag', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const rows = page.locator('table tbody tr');
    const n = await rows.count();
    expect(n).toBeGreaterThan(5);
    for (let i = 0; i < n; i++) await expect(rows.nth(i).locator(ACTION)).toHaveCount(1);
    await expect(page.locator('table').getByText('🚩')).toHaveCount(0);
    await expect(page.locator('button[title="Flag this entry as incorrect"]')).toHaveCount(0);
  });

  test('the menu has an /edit/ link, "Report a problem" and the hint', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const btn = page.locator(`table ${ACTION}`).first();
    await expect(btn).toHaveAttribute('aria-haspopup', 'menu');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'Edit this build' })).toHaveAttribute('href', /\/edit\/[0-9a-f-]{36}$/);
    await expect(menu.getByRole('menuitem', { name: 'Report a problem' })).toBeVisible();
    await expect(page.getByText("You'll need the forum username on the build to edit it.")).toBeVisible();
    for (const item of await menu.getByRole('menuitem').all()) {
      expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
    }
  });

  test('Escape closes the menu and returns focus to the button', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const btn = page.locator(`table ${ACTION}`).first();
    await btn.click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(btn).toBeFocused();
  });

  test('arrow keys move between the items', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await page.locator(`table ${ACTION}`).first().click();
    const items = page.getByRole('menuitem');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(items.first()).toBeFocused();
  });

  test('clicking outside closes the menu', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await page.locator(`table ${ACTION}`).first().click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.locator('h1').click();
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('the edit link is not prefetched', async ({ page }) => {
    const prefetched: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/edit/')) prefetched.push(r.url());
    });
    await gotoLoaded(page, '/entries');
    await page.locator(`table ${ACTION}`).first().click();
    await page.waitForTimeout(500);
    expect(prefetched).toEqual([]);
  });

  test('"Report a problem" opens the reason picker, then Turnstile enables Send report', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await page.locator(`table ${ACTION}`).first().click();
    await page.getByRole('menuitem', { name: 'Report a problem' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('menu')).toHaveCount(0);
    const send = dialog.getByRole('button', { name: 'Send report about this entry' });
    await expect(send).toBeDisabled();
    await dialog.getByLabel("What's wrong with this entry?").selectOption({ index: 1 });
    // Cloudflare's test site key hands out a token on its own. Stop short of sending: a real
    // send writes a flag into the live moderation queue.
    await expect(send).toBeEnabled({ timeout: 20000 });
    await dialog.getByRole('button', { name: 'Cancel flagging this entry' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(`table ${ACTION}`).first()).toBeFocused();
  });
});

test.describe('Forum tag', () => {
  test('no row shows "BimmerPost"', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await expect(page.locator('table tbody')).not.toContainText('BimmerPost');
  });

  test('a non-BimmerPost forum shows as "Other forum" (Oxfg.m3, live data)', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await page.getByLabel('Filter entries').fill('Oxfg.m3');
    const row = page.locator('table tbody tr', { hasText: 'Oxford Green II Metallic' });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Other forum');
    await expect(row).toContainText('Oxfg.m3');
  });
});

test.describe('Submission queue banner', () => {
  test('shows banner when ?submitted=1 is in the URL', async ({ page }) => {
    await gotoLoaded(page, '/entries?submitted=1');
    const banner = page.getByTestId('submitted-banner');
    await expect(banner).toBeVisible();
  });

  test('banner contains the updated appear-right-away message', async ({ page }) => {
    await gotoLoaded(page, '/entries?submitted=1');
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/appear in the table right away/i);
  });

  test('banner has a dismiss button', async ({ page }) => {
    await gotoLoaded(page, '/entries?submitted=1');
    const dismissBtn = page.getByTestId('submitted-banner-dismiss');
    await expect(dismissBtn).toBeVisible();
  });

  test('banner disappears after clicking dismiss', async ({ page }) => {
    await gotoLoaded(page, '/entries?submitted=1');
    const banner = page.getByTestId('submitted-banner');
    await expect(banner).toBeVisible();
    const dismissBtn = page.getByTestId('submitted-banner-dismiss');
    await dismissBtn.click();
    await expect(banner).not.toBeVisible();
  });

  test('banner is NOT shown on /entries without ?submitted=1', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const banner = page.getByTestId('submitted-banner');
    await expect(banner).not.toBeVisible();
  });
});
