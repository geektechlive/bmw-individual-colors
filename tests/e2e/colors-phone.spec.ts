import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoLoaded } from './helpers';

// Direction B unit (e), #70: /colors on a phone is a 2-up grid with compact controls. Runs in
// chromium (viewport forced to 390) and in the mobile project (iPhone 14, real WebKit).
test.use({ viewport: { width: 390, height: 844 } });

const TILES = 'ul a[href^="/colors/"]';
const select = (page: Page) => page.getByRole('combobox', { name: 'Sort paints' });
// The closed value shown beside the "Sort" prefix.
const sortLabel = (page: Page) => page.locator('label', { has: select(page) });
const filters = (page: Page) => page.getByRole('group', { name: 'Filter by color family and finish' });

test.describe('Colors on a phone', () => {
  test.beforeEach(async ({ page }) => {
    await gotoLoaded(page, '/colors');
    await expect(page.locator(TILES).first()).toBeVisible();
  });

  test('the first two tiles sit side by side', async ({ page }) => {
    // Measure the settled grid: tiles rise in with a stagger (#48), so mid-fade their tops differ.
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
    );
    const a = await page.locator(TILES).nth(0).boundingBox();
    const b = await page.locator(TILES).nth(1).boundingBox();
    expect(a!.y).toBeCloseTo(b!.y, 0);
    expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1);
  });

  test('a tile has the name, the builds and the rarity on separate lines', async ({ page }) => {
    const meta = page.locator(TILES).first().locator('span.mono > span:not([aria-hidden])');
    await expect(meta).toHaveCount(2);
    await expect(meta.nth(0)).toHaveText(/^\d+ builds?$/);
    const [builds, rarity] = await meta.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
    expect(rarity).toBeGreaterThan(builds);
  });

  test('the search field says what to type and is 44px tall', async ({ page }) => {
    const search = page.getByLabel('Search by name');
    await expect(search).toHaveAttribute('placeholder', 'Search paints, e.g. Frozen');
    const box = await search.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(43.5);
  });

  test('every filter chip sits in one sideways-scrolling row', async ({ page }) => {
    const group = filters(page);
    const chips = group.getByRole('button');
    expect(await chips.count()).toBeGreaterThan(8);
    const tops = await chips.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    const heights = await chips.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(43.5);
    const { scroll, client } = await group.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(scroll).toBeGreaterThan(client);
    // Rule 6: no fade mask.
    expect(await group.evaluate((el) => getComputedStyle(el).maskImage)).toBe('none');
  });

  test('the desktop sort chips are replaced by one select', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Rarest', exact: true })).toBeHidden();
    await expect(select(page)).toHaveCount(1);
    await expect(sortLabel(page)).toContainText('Sort');
    await expect(sortLabel(page)).toContainText('Most builds');
    const options = await select(page).locator('option').allInnerTexts();
    expect(options).toEqual(['Most builds', 'Rarest', 'By color', 'Name, A to Z']);
  });

  test('picking Rarest writes the hash, relabels the select and puts a 1-build paint first', async ({ page }) => {
    await select(page).selectOption('rarity');
    await expect(page).toHaveURL(/#sort=rarity$/);
    await expect(sortLabel(page)).toContainText('Rarest');
    await expect(page.locator(TILES).first()).toContainText(/1 build(?!s)/);
    await select(page).selectOption('builds');
    expect(new URL(page.url()).hash).toBe('');
    await expect(sortLabel(page)).toContainText('Most builds');
  });
});

test('axe: /colors at 390 is clean, also with a sort picked', async ({ page }) => {
  await gotoLoaded(page, '/colors');
  await expect(page.locator(TILES).first()).toBeVisible();
  const settle = () =>
    page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => undefined)),
      ),
    );
  await settle();
  expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
  await select(page).selectOption('rarity');
  await settle();
  expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
});

test('a sort in the URL hash shows in the select label and value', async ({ page }) => {
  await gotoLoaded(page, '/colors#sort=name');
  await expect(page.locator(TILES).first()).toBeVisible();
  await expect(select(page)).toHaveValue('name');
  await expect(sortLabel(page)).toContainText('Name, A to Z');
});
