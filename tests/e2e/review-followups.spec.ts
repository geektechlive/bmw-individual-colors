import { test, expect, type Locator, type Page } from '@playwright/test';
import { gotoLoaded } from './helpers';

// Follow-ups from the post-landing review of Direction B (#78-#81, #84-#86).
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
const PAINT = '/colors/san-marino-blue';

for (const [name, size] of [['phone', PHONE], ['desktop', DESKTOP]] as const) {
  test.describe(`M stripe (${name})`, () => {
    test.use({ viewport: size });

    // #79: html/body are 100% tall and body is a flex column, so on a page longer than the
    // screen the empty stripe shrank to 0 px.
    test('is 4px tall on the home page, which is longer than the screen', async ({ page }) => {
      await gotoLoaded(page, '/');
      const overflow = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight);
      expect(overflow).toBe(true);
      const height = await page.locator('div[class*="topStripe"]').evaluate((el) => el.getBoundingClientRect().height);
      expect(height).toBe(4);
    });
  });
}

test.describe('Nav current item (#80)', () => {
  test.use({ viewport: DESKTOP });
  const current = (page: Page) => page.locator('nav.nav-desktop a[aria-current]');

  test('Colors is current on a paint page', async ({ page }) => {
    await gotoLoaded(page, PAINT);
    await expect(current(page)).toHaveCount(1);
    await expect(current(page)).toHaveText('Colors');
  });

  test('Home is current only on /, Entries on /entries', async ({ page }) => {
    await gotoLoaded(page, '/');
    await expect(current(page)).toHaveText(['Home']);
    await gotoLoaded(page, '/entries');
    await expect(current(page)).toHaveText(['Entries']);
  });
});

test.describe('Home latest builds on a phone (#85)', () => {
  test.use({ viewport: PHONE });

  test('the section does not overflow sideways and shows two-line rows', async ({ page }) => {
    await gotoLoaded(page, '/');
    const section = page.locator('section', { has: page.getByRole('heading', { name: 'Latest builds' }) });
    await expect(section.locator('table')).toBeHidden();
    const rows = section.getByRole('list', { name: 'Latest builds' }).locator(':scope > li');
    await expect(rows).toHaveCount(8);
    await expect(rows.first()).toBeVisible();
    // No expand control here: the home rows are a glance, not a browser.
    await expect(section.locator('button[aria-label="More about this build"]')).toHaveCount(0);
    const { scroll, client, doc } = await section.evaluate((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
      doc: document.documentElement.scrollWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(client);
    expect(doc).toBeLessThanOrEqual(PHONE.width);
    // The paint link stays a 44px target.
    const link = await rows.first().getByRole('link').first().boundingBox();
    expect(link?.height).toBeGreaterThanOrEqual(44);
  });

  test('the page does not scroll sideways at 320 either', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await gotoLoaded(page, '/');
    const doc = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(doc).toBeLessThanOrEqual(320);
  });

  test('on desktop the table shows and the phone list does not', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoLoaded(page, '/');
    await expect(page.locator('section table')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Latest builds' })).toBeHidden();
  });
});

test.describe('Row menu Tab (#84)', () => {
  test.use({ viewport: DESKTOP });
  const ACTION = 'button[aria-label="Edit or report this build"]';

  // Tab used to unmount the focused menu item, so focus fell to <body> (or jumped on).
  // It must close the menu and continue from the trigger.
  // Records what has focus when Tab's keydown finishes bubbling, i.e. just before the browser
  // moves focus. It must be the trigger: Tab then leaves from it.
  const probeTabOrigin = (page: Page) =>
    page.evaluate(() => {
      const w = window as unknown as { tabFrom?: string | null };
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') w.tabFrom = document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName ?? null;
      });
    });
  const tabOrigin = (page: Page) => page.evaluate(() => (window as unknown as { tabFrom?: string }).tabFrom);

  test('focus is on the trigger when Tab leaves the menu', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await probeTabOrigin(page);
    await page.locator(`table ${ACTION}`).first().click();
    await page.keyboard.press('Tab');
    expect(await tabOrigin(page)).toBe('Edit or report this build');
  });

  test('on /entries, Tab from the menu lands on the next row, not body', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await page.locator(`table ${ACTION}`).first().click();
    await expect(page.getByRole('menuitem', { name: 'Edit this build' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.locator('table tbody tr:nth-child(2) a').first()).toBeFocused();
  });

  test('on a paint page, Tab from the menu lands on the next row trigger', async ({ page }) => {
    await gotoLoaded(page, PAINT);
    const triggers = page.locator(ACTION);
    await triggers.first().click();
    await expect(page.getByRole('menuitem', { name: 'Edit this build' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(triggers.nth(1)).toBeFocused();
  });
});

test.describe('Paint page row action label (#86)', () => {
  const ACTION = 'button[aria-label="Edit or report this build"]';

  test('on a phone the action reads "Edit or report" and opens the menu', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await gotoLoaded(page, PAINT);
    const button = page.locator(ACTION).first();
    await expect(button).toContainText('Edit or report');
    await expect(button.locator('[aria-hidden="true"]')).toBeHidden(); // the bare ··· glyph
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
    await button.click();
    await expect(page.getByRole('menuitem', { name: 'Edit this build' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Report a problem' })).toBeVisible();
  });

  test('on desktop it stays the quiet ··· glyph', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoLoaded(page, PAINT);
    const button = page.locator(ACTION).first();
    await expect(button.getByText('Edit or report')).toBeHidden();
    await expect(button.locator('[aria-hidden="true"]')).toBeVisible();
  });
});

test.describe('Build table rows on desktop (#78)', () => {
  test.use({ viewport: DESKTOP });

  // The Build Sheet spec is 52px a row; the 44px paint link used to sit inside 10px of padding.
  test('/entries rows are 52px', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const heights = await page.locator('table tbody tr').evaluateAll((rows) =>
      rows.slice(0, 5).map((r) => r.getBoundingClientRect().height),
    );
    expect(heights).toHaveLength(5);
    for (const h of heights) expect(Math.abs(h - 52)).toBeLessThanOrEqual(1);
  });

  test('home Latest builds rows are 52px', async ({ page }) => {
    await gotoLoaded(page, '/');
    const heights = await page.locator('table tbody tr').evaluateAll((rows) =>
      rows.map((r) => r.getBoundingClientRect().height),
    );
    expect(heights.length).toBeGreaterThan(0);
    for (const h of heights) expect(Math.abs(h - 52)).toBeLessThanOrEqual(1);
  });
});

test.describe('Phone form controls (#81)', () => {
  test.use({ viewport: PHONE });

  // iOS Safari zooms the page when a control under 16px takes focus.
  const fontSize = (loc: Locator) => loc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

  test('the /entries filter and sort are at least 16px', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    expect(await fontSize(page.getByLabel('Filter entries'))).toBeGreaterThanOrEqual(16);
    expect(await fontSize(page.getByLabel('Sort builds'))).toBeGreaterThanOrEqual(16);
    await expect(page.locator('label:has(select[aria-label="Sort builds"]) > span.label')).toHaveText('Sort');
  });

  test('the /colors search and sort are at least 16px', async ({ page }) => {
    await gotoLoaded(page, '/colors');
    expect(await fontSize(page.getByLabel('Search by name'))).toBeGreaterThanOrEqual(16);
    expect(await fontSize(page.getByLabel('Sort paints'))).toBeGreaterThanOrEqual(16);
    await expect(page.locator('label:has(select[aria-label="Sort paints"]) > span.label')).toHaveText('Sort');
  });
});
