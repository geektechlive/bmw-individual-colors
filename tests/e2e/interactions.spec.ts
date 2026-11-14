import { test, expect, type Locator, type Page } from '@playwright/test';
import { gotoLoaded } from './helpers';

const TILE_NAMES = 'ul a[href^="/colors/"] .paint-name';
const chip = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const liveCount = (page: Page) => page.locator('main p[aria-live="polite"]').filter({ hasText: /paints$/ });
const names = (page: Page) => page.locator(TILE_NAMES).allInnerTexts();

test.describe('/colors controls', () => {
  test.beforeEach(async ({ page }) => {
    await gotoLoaded(page, '/colors');
    await expect(page.locator(TILE_NAMES).first()).toBeVisible();
  });

  test('sort chips set aria-pressed, reorder the grid and write the URL hash', async ({ page }) => {
    await expect(chip(page, 'Most builds')).toHaveAttribute('aria-pressed', 'true');
    const byBuilds = await names(page);

    await chip(page, 'Name').click();
    await expect(chip(page, 'Name')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, 'Most builds')).toHaveAttribute('aria-pressed', 'false');
    await expect(page).toHaveURL(/#sort=name$/);
    const byName = await names(page);
    expect(byName).not.toEqual(byBuilds);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));

    await chip(page, 'Rarest').click();
    await expect(chip(page, 'Rarest')).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/#sort=rarity$/);

    await chip(page, 'By color').click();
    await expect(page).toHaveURL(/#sort=color$/);

    await chip(page, 'Most builds').click();
    await expect(chip(page, 'Most builds')).toHaveAttribute('aria-pressed', 'true');
    expect(new URL(page.url()).hash).toBe('');
    expect(await names(page)).toEqual(byBuilds);
  });

  test('Rarest lists the paints with the fewest builds first', async ({ page }) => {
    await chip(page, 'Rarest').click();
    const counts = (await page.locator('ul a[href^="/colors/"]').allInnerTexts()).map((t) =>
      Number(/(\d+) builds?/.exec(t)?.[1]),
    );
    expect(counts.length).toBeGreaterThan(10);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  });

  test('family filter narrows the grid and toggles off', async ({ page }) => {
    const total = (await names(page)).length;
    await chip(page, 'Blues').click();
    await expect(chip(page, 'Blues')).toHaveAttribute('aria-pressed', 'true');
    await expect(liveCount(page)).toHaveText(/^\d+ of \d+ paints$/);
    const blues = (await names(page)).length;
    expect(blues).toBeGreaterThan(0);
    expect(blues).toBeLessThan(total);
    await chip(page, 'Blues').click();
    await expect(chip(page, 'Blues')).toHaveAttribute('aria-pressed', 'false');
    expect(await names(page)).toHaveLength(total);
  });

  test('finish filter keeps only that finish', async ({ page }) => {
    await chip(page, 'Metallic').click();
    await expect(chip(page, 'Metallic')).toHaveAttribute('aria-pressed', 'true');
    const finishes = await page.locator('ul [data-finish]').evaluateAll((els) => els.map((e) => e.getAttribute('data-finish')));
    expect(finishes.length).toBeGreaterThan(0);
    expect(new Set(finishes)).toEqual(new Set(['metallic']));
  });

  test('search updates the live count and shows the empty state with Clear filters', async ({ page }) => {
    const total = (await names(page)).length;
    const search = page.getByLabel('Search by name');

    await search.fill('blue');
    const hits = await names(page);
    expect(hits.length).toBeGreaterThan(0);
    for (const n of hits) expect(n.toLowerCase()).toContain('blue');
    await expect(liveCount(page)).toHaveText(`${hits.length} of ${total} paints`);

    await search.fill('zzzzqqqq');
    await expect(liveCount(page)).toHaveText(`0 of ${total} paints`);
    await expect(page.getByText('No paints match those filters.')).toBeVisible();

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(search).toHaveValue('');
    await expect(liveCount(page)).toHaveText(`${total} paints`);
    expect(await names(page)).toHaveLength(total);
  });
});

test('/colors#sort=name applies the sort on load', async ({ page }) => {
  await gotoLoaded(page, '/colors#sort=name');
  await expect(chip(page, 'Name')).toHaveAttribute('aria-pressed', 'true');
  const byName = await names(page);
  expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
});

// ---------- Home wall ----------

const STRIPS = 'ul[aria-label^="Top 40"] a';
const readout = (page: Page) => page.locator('[aria-live="polite"]').filter({ hasText: /build|Hover or tap/ }).first();

/** "San Marino Blue, 5 builds" -> the pieces the read-out shows. */
async function stripInfo(strip: Locator): Promise<{ color: string; text: string }> {
  const label = (await strip.getAttribute('aria-label')) ?? '';
  const [color, builds] = label.split(/, (?=\d+ builds?$)/);
  return { color, text: `${color} · ${builds}` };
}

test.describe('Home wall (pointer and keyboard)', () => {
  test('hovering a strip updates the read-out', async ({ page }) => {
    await gotoLoaded(page, '/');
    const strips = page.locator(STRIPS);
    await expect(strips.first()).toBeVisible();
    await expect(readout(page)).toContainText('Hover or tap a strip');
    const strip = strips.nth(Math.floor((await strips.count()) / 2));
    const info = await stripInfo(strip);
    await strip.hover();
    await expect(readout(page)).toHaveText(new RegExp(`^${info.color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} · \\d+ builds?`));
  });

  test('keyboard focus on a strip updates the read-out', async ({ page }) => {
    await gotoLoaded(page, '/');
    const strips = page.locator(STRIPS);
    await expect(strips.first()).toBeVisible();
    const strip = strips.nth(3);
    const info = await stripInfo(strip);
    await strip.focus();
    await expect(readout(page)).toContainText(info.color);
    // Move focus to the next strip directly: Safari doesn't Tab to links by default (a macOS
    // setting), and this test is about the read-out, not the browser's Tab order.
    const next = strips.nth(4);
    const nextInfo = await stripInfo(next);
    await next.focus();
    await expect(readout(page)).toContainText(nextInfo.color);
    await expect(readout(page)).not.toContainText(info.color);
  });
});

test.describe('Home wall (touch)', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('first tap shows the read-out and stays; second tap on the same strip navigates', async ({ page }) => {
    await gotoLoaded(page, '/');
    const strips = page.locator(STRIPS);
    await expect(strips.first()).toBeVisible();
    // The widest strip is the easiest to hit at 390px.
    const widest = await strips.evaluateAll((els) => {
      const widths = els.map((e) => e.getBoundingClientRect().width);
      return widths.indexOf(Math.max(...widths));
    });
    const strip = strips.nth(widest);
    const info = await stripInfo(strip);
    const href = await strip.getAttribute('href');

    await strip.tap();
    await expect(readout(page)).toContainText(info.color);
    await expect(page).toHaveURL(/\/$/);

    await strip.tap();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });
});

// ---------- Map ----------

test.describe('/map', () => {
  test('a marker popup names the paint and links to it; tiles are requested with a key', async ({ page }) => {
    const tileUrls: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('basemaps.cartocdn.com')) tileUrls.push(r.url());
    });

    await gotoLoaded(page, '/map');
    await expect(page.locator('.leaflet-container')).toBeVisible();

    const single = page.locator('.leaflet-marker-icon:not(.marker-cluster)');
    for (let i = 0; i < 30 && (await single.count()) === 0; i++) {
      await page.locator('.marker-cluster').first().click();
      await page.waitForTimeout(400); // the zoom animation; there is no event to await
    }
    await expect(single.first()).toBeVisible();
    await single.first().click();

    const popup = page.locator('.leaflet-popup-content');
    await expect(popup).toBeVisible();
    await expect(popup.locator('a[href^="/colors/"]')).toHaveText(/View paint/);
    const paint = await popup.innerText();
    expect(paint.trim().split('\n')[0].length).toBeGreaterThan(2);

    expect(tileUrls.length).toBeGreaterThan(0);
    for (const u of tileUrls) expect(u, u).toMatch(/[?&]key=[^&]+/);
  });
});
