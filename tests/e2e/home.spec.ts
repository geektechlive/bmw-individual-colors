import { test, expect, type Page } from '@playwright/test';
import { gotoLoaded } from './helpers';

const searchBox = (page: Page) => page.getByRole('combobox', { name: 'Find your paint' });

/** The number in the "Paints" tile of the registry totals. */
async function paintTotal(page: Page): Promise<number> {
  const text = await page
    .getByLabel('Registry totals')
    .locator('div', { has: page.getByText('Paints', { exact: true }) })
    .locator('strong')
    .innerText();
  return parseInt(text, 10);
}

test.describe('Home page', () => {
  test('loads with title and stats', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BMW.*Individual|Individual.*Colors/i);
    // Stats cards should show non-zero numbers
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Key nav links present
    await expect(page.getByRole('link', { name: /reports/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /entries/i }).first()).toBeVisible();
  });

  test('shows total entries stat > 0', async ({ page }) => {
    await page.goto('/');
    // Stats section should contain a number
    const text = await page.locator('body').innerText();
    const match = text.match(/(\d+)\s*(?:total\s*)?(?:entries|builds)/i);
    expect(match).not.toBeNull();
    const count = parseInt(match![1], 10);
    expect(count).toBeGreaterThan(0);
  });

  test('submit link navigates to form', async ({ page }) => {
    await page.goto('/');
    const submitLink = page.getByRole('link', { name: /submit/i }).first();
    await submitLink.click();
    await expect(page).toHaveURL('/submit');
  });

  test('the hero has no "View reports" button and no primary button', async ({ page }) => {
    await gotoLoaded(page, '/');
    const hero = page.locator('main section').first();
    await expect(hero.getByRole('link', { name: 'View reports' })).toHaveCount(0);
    await expect(hero.getByRole('link', { name: 'Submit your build', exact: true }).first()).toBeVisible();
    await expect(hero.getByRole('link', { name: 'Browse all builds' })).toBeVisible();
    await expect(hero.locator('.btn--primary')).toHaveCount(0);
  });
});

test.describe('Paint search', () => {
  test('typing "green" lists options with build counts, and Enter opens the first', async ({ page }) => {
    await gotoLoaded(page, '/');
    await searchBox(page).fill('green');
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible();
    expect(await options.count()).toBeGreaterThan(1);
    await expect(options.first()).toContainText(/\d+ builds?/);
    await searchBox(page).press('Enter');
    await expect(page).toHaveURL(/\/colors\/[a-z0-9-]+$/);
  });

  test('arrow keys highlight an option and Enter opens that one', async ({ page }) => {
    await gotoLoaded(page, '/');
    await searchBox(page).fill('green');
    await expect(page.getByRole('option').nth(1)).toBeVisible();
    // textContent, not innerText: the paint face upper-cases what innerText returns.
    const second = ((await page.getByRole('option').nth(1).textContent()) ?? '').replace(/\d+ builds?$/, '').trim();
    await searchBox(page).press('ArrowDown');
    await searchBox(page).press('ArrowDown');
    await expect(page.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
    await searchBox(page).press('Enter');
    await expect(page).toHaveURL(/\/colors\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(second, { ignoreCase: true });
  });

  test('clicking an option opens its paint page', async ({ page }) => {
    await gotoLoaded(page, '/');
    await searchBox(page).fill('blue');
    await page.getByRole('option').first().click();
    await expect(page).toHaveURL(/\/colors\/[a-z0-9-]+$/);
  });

  test('Escape closes the list', async ({ page }) => {
    await gotoLoaded(page, '/');
    await searchBox(page).fill('green');
    await expect(page.getByRole('option').first()).toBeVisible();
    await searchBox(page).press('Escape');
    await expect(page.getByRole('option')).toHaveCount(0);
  });

  test('Enter with the list closed does not navigate', async ({ page }) => {
    await gotoLoaded(page, '/');
    await searchBox(page).fill('green');
    await expect(page.getByRole('option').first()).toBeVisible();
    await searchBox(page).press('Escape');
    await searchBox(page).press('Enter');
    await expect(page).toHaveURL(/\/$/);
    // Enter reopens the list instead.
    await expect(page.getByRole('option').first()).toBeVisible();
  });

  test('clicking the list padding keeps focus in the input so keys still work', async ({ page }) => {
    await gotoLoaded(page, '/');
    await searchBox(page).fill('green');
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.getByRole('listbox').click({ position: { x: 4, y: 1 }, force: true });
    await expect(searchBox(page)).toBeFocused();
    await searchBox(page).press('ArrowDown');
    await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  });

  test('arrows are ignored while an IME is composing', async ({ page }) => {
    await gotoLoaded(page, '/');
    await searchBox(page).fill('green');
    await expect(page.getByRole('option').first()).toBeVisible();
    await searchBox(page).dispatchEvent('keydown', { key: 'ArrowDown', isComposing: true, bubbles: true });
    await expect(page.locator('[role=option][aria-selected=true]')).toHaveCount(0);
  });

  // Android keyboards (Gboard) report Enter as keyCode 229 / composing right after a typed word.
  test('Enter still opens the match when the keyboard reports it as composing (keyCode 229)', async ({ page }) => {
    await gotoLoaded(page, '/');
    await searchBox(page).fill('green');
    await expect(page.getByRole('option').first()).toBeVisible();
    await searchBox(page).dispatchEvent('keydown', {
      key: 'Enter',
      keyCode: 229,
      isComposing: true,
      bubbles: true,
    });
    await expect(page).toHaveURL(/\/colors\/[a-z0-9-]+$/);
  });

  test('a whitespace-only query does not open the list', async ({ page }) => {
    await gotoLoaded(page, '/');
    await searchBox(page).fill('   ');
    await expect(page.getByRole('option')).toHaveCount(0);
    await expect(searchBox(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('typing "zzzz" shows the no-match panel with a /submit link, and Enter does nothing', async ({ page }) => {
    await gotoLoaded(page, '/');
    await searchBox(page).fill('zzzz');
    const status = page.getByRole('status').filter({ hasText: 'No paint called' });
    await expect(status).toContainText('No paint called “zzzz” is registered yet.');
    await expect(status.getByRole('link', { name: /submit your build/i })).toHaveAttribute('href', '/submit');
    await searchBox(page).press('Enter');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Paint wall', () => {
  test('has one strip per paint, matching the Paints total', async ({ page }) => {
    await gotoLoaded(page, '/');
    const total = await paintTotal(page);
    expect(total).toBeGreaterThan(0);
    await expect(page.locator('[data-wall-strip]')).toHaveCount(total);
    await expect(page.getByRole('list', { name: `All ${total} registered paints, sorted by color` })).toBeVisible();
  });

  for (const width of [1440, 390]) {
    test(`each tick starts where its run's first strip starts at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await gotoLoaded(page, '/');
      await page.evaluate(() =>
        Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
      );
      const runs = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('[data-wall-run]')).map((run) => {
          const tick = run.querySelector<HTMLElement>('[data-wall-tick]')!.getBoundingClientRect();
          const strips = Array.from(run.querySelectorAll<HTMLElement>('[data-wall-strip]'));
          const first = strips[0].getBoundingClientRect();
          const last = strips[strips.length - 1].getBoundingClientRect();
          return { tickLeft: tick.left, tickRight: tick.right, firstLeft: first.left, lastRight: last.right };
        }),
      );
      expect(runs.length).toBeGreaterThan(1);
      for (const r of runs) {
        expect(Math.abs(r.tickLeft - r.firstLeft)).toBeLessThanOrEqual(1);
        expect(Math.abs(r.tickRight - r.lastRight)).toBeLessThanOrEqual(1);
      }
    });
  }
});

test.describe('Single-build row', () => {
  test('lists the single-build paints as links to their pages', async ({ page }) => {
    await gotoLoaded(page, '/');
    const region = page.getByRole('region', { name: 'Paints with a single build' });
    const line = await region.getByText(/ (has|have) one build registered so far\.$/).innerText();
    const n = parseInt(line, 10);
    const links = region.getByRole('list').getByRole('link');
    await expect(links).toHaveCount(n);
    for (const href of await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')))) {
      expect(href).toMatch(/^\/colors\/[a-z0-9-]+$/);
    }
    await expect(region.getByRole('link', { name: 'Submit your build →' })).toHaveAttribute('href', '/submit');
  });
});

test.describe('Home at 320', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('the wall cannot overflow and the page does not scroll sideways', async ({ page }) => {
    await gotoLoaded(page, '/');
    const m = await page.evaluate(() => {
      const wall = document.querySelector<HTMLElement>('[data-wall-run]')!.parentElement!;
      return {
        wallScroll: wall.scrollWidth,
        wallClient: wall.clientWidth,
        docScroll: document.documentElement.scrollWidth,
        docClient: document.documentElement.clientWidth,
      };
    });
    expect(m.wallScroll).toBeLessThanOrEqual(m.wallClient);
    expect(m.docScroll).toBeLessThanOrEqual(m.docClient);
    await expect(page.locator('[data-wall-strip]').first()).toBeVisible();
  });
});

test.describe('Home on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the h1 is two lines or fewer', async ({ page }) => {
    await gotoLoaded(page, '/');
    const lines = await page.locator('h1').evaluate((el) => {
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      return el.getBoundingClientRect().height / lh;
    });
    expect(lines).toBeLessThanOrEqual(2.05);
  });

  test('the search input is 16px or more so iOS does not zoom', async ({ page }) => {
    await gotoLoaded(page, '/');
    const size = await searchBox(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
  });
});
