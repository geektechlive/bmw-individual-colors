import { test, expect, type Page } from '@playwright/test';
import { gotoLoaded } from './helpers';

// Design test matrix (docs/design/2026-11-refresh.md, "How it is checked").
// Pixels: only the static fixture page /design-check (development only), because real pages
// render live data. Behaviour: the real pages, no pixels.

async function fontsReady(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Families (as the browser names them) of the fonts that are actually loaded. */
async function loadedFamilies(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.fonts)
      .filter((f) => f.status === 'loaded')
      .map((f) => f.family.replace(/"/g, '')),
  );
}

const hasOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 390, height: 844 },
] as const;

test.describe('Fixture page screenshots', () => {
  for (const vp of VIEWPORTS) {
    test(`design-check at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/design-check');
      await expect(page.getByRole('heading', { level: 1, name: 'Design check' })).toBeVisible();
      await fontsReady(page);
      // The Next.js dev-tools badge floats over the page in dev; it is not part of the design.
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
      await expect(page).toHaveScreenshot(`design-check-${vp.name}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }

  test('fixture covers all four finishes at every size', async ({ page }) => {
    await page.goto('/design-check');
    for (const finish of ['solid', 'metallic', 'pearl', 'frozen']) {
      await expect(page.locator(`[data-finish="${finish}"]`).first()).toBeAttached();
    }
    // 8 paints x 3 sizes
    await expect(page.locator('[data-finish]')).toHaveCount(24);
  });
});

test.describe('No horizontal overflow at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const ROUTES = ['/', '/colors', '/colors/san-marino-blue', '/entries', '/reports', '/map', '/submit'];
  for (const route of ROUTES) {
    test(route, async ({ page }) => {
      await gotoLoaded(page, route);
      await fontsReady(page);
      expect(await hasOverflow(page)).toBe(false);
    });
  }
});

test.describe('Fonts load', () => {
  const ROUTES: Array<{ route: string; paintName: boolean }> = [
    { route: '/', paintName: true },
    { route: '/colors', paintName: true },
    { route: '/colors/san-marino-blue', paintName: true },
    { route: '/entries', paintName: false },
    { route: '/reports', paintName: false },
    { route: '/map', paintName: false },
    { route: '/submit', paintName: false },
  ];

  for (const { route, paintName } of ROUTES) {
    test(`${route} loads Archivo${paintName ? ' and Barlow Condensed' : ''}`, async ({ page }) => {
      await gotoLoaded(page, route);
      await fontsReady(page);
      const families = await loadedFamilies(page);
      expect(families.some((f) => /archivo/i.test(f)), `loaded: ${families.join(', ')}`).toBe(true);
      if (paintName) {
        await expect(page.locator('.paint-name').first()).toBeVisible();
        expect(families.some((f) => /barlow/i.test(f)), `loaded: ${families.join(', ')}`).toBe(true);
      }
    });
  }
});

test.describe('Swatch finishes', () => {
  test('San Marino Blue (catalog metallic) shows a metallic swatch', async ({ page }) => {
    await gotoLoaded(page, '/colors/san-marino-blue');
    await expect(page.locator('[data-finish="metallic"]').first()).toBeAttached();
    await expect(page.locator('[data-finish="solid"]')).toHaveCount(0);
  });

  test('a Frozen paint shows a frozen swatch', async ({ page }) => {
    await gotoLoaded(page, '/colors');
    const frozen = page.locator('a[href^="/colors/"]', { hasText: /frozen/i }).first();
    await expect(frozen.locator('[data-finish]')).toHaveAttribute('data-finish', 'frozen');
  });

  test('every swatch on /colors carries a known finish', async ({ page }) => {
    await gotoLoaded(page, '/colors');
    const finishes = await page.locator('[data-finish]').evaluateAll((els) => els.map((e) => e.getAttribute('data-finish')));
    expect(finishes.length).toBeGreaterThan(10);
    for (const f of finishes) expect(['solid', 'metallic', 'pearl', 'frozen']).toContain(f);
  });
});

test.describe('Reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the home page runs no animations', async ({ page }) => {
    await gotoLoaded(page, '/');
    await fontsReady(page);
    const running = await page.evaluate(() =>
      document.getAnimations().map((a) => (a as CSSAnimation).animationName ?? a.constructor.name),
    );
    expect(running).toEqual([]);
  });
});
