import { test, expect, type Page } from '@playwright/test';
import { gotoLoaded } from './helpers';

// Direction B unit (b), #67. Counts are read from the page, not assumed: the live data moves.
// MIN_CHART_BUILDS mirrors the constant in src/app/colors/[slug]/page.tsx (spec: 3).
const MIN_CHART_BUILDS = 3;
const SINGLE = '/colors/signal-green-uni';
const MANY = '/colors/san-marino-blue';

async function buildCount(page: Page): Promise<number> {
  const text = await page.locator('dl dt', { hasText: /^Builds$/ }).locator('xpath=following-sibling::dd').innerText();
  return Number(text);
}

const top = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().top);

test.describe('Paint page (direction B, unit b)', () => {
  test('a paint with fewer builds than the threshold shows no charts', async ({ page }) => {
    await gotoLoaded(page, SINGLE);
    expect(await buildCount(page)).toBeLessThan(MIN_CHART_BUILDS);
    await expect(page.getByRole('heading', { name: 'Builds by model year' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Drivetrain' })).toHaveCount(0);
  });

  test('a paint with 3 or more builds shows both charts', async ({ page }) => {
    await gotoLoaded(page, MANY);
    expect(await buildCount(page)).toBeGreaterThanOrEqual(MIN_CHART_BUILDS);
    await expect(page.getByRole('heading', { name: 'Builds by model year' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Drivetrain' })).toBeVisible();
  });

  test('builds are listed newest first, with the count in the heading', async ({ page }) => {
    await gotoLoaded(page, MANY);
    const n = await buildCount(page);
    await expect(page.getByRole('heading', { name: `All builds (${n}) · newest first` })).toBeVisible();
    const dates = (await page.locator('[class*="rowDate"]').allInnerTexts()).map((t) => Date.parse(`${t} UTC`));
    expect(dates).toHaveLength(n);
    expect(dates.every((d) => !Number.isNaN(d))).toBe(true);
    for (let i = 1; i < dates.length; i++) expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
  });

  test('a single-build paint says "All builds (1)" without "newest first"', async ({ page }) => {
    await gotoLoaded(page, SINGLE);
    const n = await buildCount(page);
    test.skip(n >= 2, 'data changed: no longer a single-build paint');
    await expect(page.getByRole('heading', { name: `All builds (${n})`, exact: true })).toBeVisible();
  });

  test('on a phone the stat tiles come above the spray card', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLoaded(page, SINGLE);
    expect(await top(page, 'dl[class*="tiles"]')).toBeLessThan(await top(page, '[class*="spray"]'));
  });

  test('on a desktop the card sits beside the text, above the tiles', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoLoaded(page, SINGLE);
    expect(await top(page, 'dl[class*="tiles"]')).toBeGreaterThan(await top(page, '[class*="spray"]'));
  });
});

test.describe('Accented paint slug (#75)', () => {
  // The real 308 (query kept) comes from worker.ts and is covered by tests/unit/legacy-slugs.test.ts.
  // Under `next dev` there is no worker, and the page's redirect streams behind loading.tsx
  // (status 200 plus a client redirect), so here we only check the browser ends on the new slug.
  test('opening the old s-o-paulo-yellow URL lands on sao-paulo-yellow', async ({ page }) => {
    await page.goto('/colors/s-o-paulo-yellow');
    await expect(page).toHaveURL(/\/colors\/sao-paulo-yellow$/);
  });

  test('the new slug shows the paint', async ({ page }) => {
    await gotoLoaded(page, '/colors/sao-paulo-yellow');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('São Paulo Yellow');
  });
});
