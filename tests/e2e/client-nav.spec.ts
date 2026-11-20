import { test, expect, type Page } from '@playwright/test';
import { clickNav, clickThrough, expectSpa, gotoLoaded, markSpa, openFirstEditLink, waitLoaded } from './helpers';

/*
 * Client-side navigation coverage (follow-up to #90).
 *
 * Most specs reach a page with page.goto(), a full load. Visitors mostly arrive by clicking
 * a link, which mounts the page into an already running document: scripts have run, module
 * state persists, and nothing re-scans the DOM. Every test here starts on one page and
 * clicks through real links; `clickThrough` fails if the navigation turns out to be a full
 * load, so these cannot quietly decay into full-load tests. Runs in chromium and mobile
 * (the file name matches the mobile project's testMatch).
 *
 * No test here sends a report or submits a build: the flag dialog is opened and cancelled.
 */

const ACTION_PICK = { index: 1 };

/** The visible "1–50 of N" (or "Showing ...") summary on /entries, desktop or phone. */
const summary = (page: Page) => page.locator('main span.num').filter({ hasText: /of \d+/ }).locator('visible=true').first();

async function markerIcons(page: Page) {
  const icons = page.locator('.leaflet-marker-icon');
  await expect(icons.first()).toBeVisible({ timeout: 20000 });
  return icons;
}

test.describe('Map after in-app navigation', () => {
  test('Home to Map: Leaflet styles load, markers draw, the largest cluster is in view', async ({ page }) => {
    await gotoLoaded(page, '/');
    await markSpa(page);
    await clickNav(page, 'Map');
    await expect(page).toHaveURL(/\/map$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);
    await expect(page.locator('.leaflet-container')).toHaveCount(1);
    await markerIcons(page);
    // leaflet.css is imported by the dynamically loaded chunk; without it panes are not absolute.
    await expect(page.locator('.leaflet-pane').first()).toHaveCSS('position', 'absolute');
    await page.waitForTimeout(1500);
    const inView = await page.evaluate(() => {
      const box = document.querySelector('.leaflet-container')!.getBoundingClientRect();
      return Array.from(document.querySelectorAll('.leaflet-marker-icon')).some((el) => {
        const r = el.getBoundingClientRect();
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        return x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height;
      });
    });
    expect(inView, 'at least one marker inside the visible map').toBe(true);
    await expectSpa(page);
  });

  test('Map, Reports, Map again: one map, markers back, no stale container', async ({ page }) => {
    await gotoLoaded(page, '/map');
    await markerIcons(page);
    await markSpa(page);
    await clickNav(page, 'Reports');
    await expect(page).toHaveURL(/\/reports$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);
    await clickNav(page, 'Map');
    await expect(page).toHaveURL(/\/map$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);
    await expect(page.locator('.leaflet-container')).toHaveCount(1);
    await markerIcons(page);
    await expect(page.locator('.leaflet-tile-pane')).toHaveCount(1);
    await expectSpa(page);
  });
});

test.describe('Reports after in-app navigation', () => {
  test('Home to Reports: the growth chart measures and draws a real size', async ({ page }) => {
    await gotoLoaded(page, '/');
    await markSpa(page);
    await clickNav(page, 'Reports');
    await expect(page).toHaveURL(/\/reports$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);
    const svg = page.locator('#growth svg').first();
    await expect(svg).toBeVisible({ timeout: 20000 });
    const box = await svg.boundingBox();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(50);
    await expect(page.locator('#growth .recharts-xAxis-tick-labels')).toContainText(/202[1-4]/, { timeout: 15000 });
  });
});

test.describe('Entries after in-app navigation', () => {
  test('Home to Entries: a filter chip, the search box and paging all work', async ({ page }) => {
    await gotoLoaded(page, '/');
    await markSpa(page);
    await clickNav(page, 'Entries');
    await expect(page).toHaveURL(/\/entries$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);

    const before = await summary(page).innerText();
    const comp = page.locator('[data-filter-group="Model"]:visible').getByRole('button', { name: 'Comp' });
    await comp.click();
    await expect(comp).toHaveAttribute('aria-pressed', 'true');
    await expect(summary(page)).not.toHaveText(before);
    await comp.click();
    await expect(summary(page)).toHaveText(before);

    await page.getByLabel('Filter entries').fill('zzzzqqq');
    await expect(page.getByText('No entries found.').locator('visible=true').first()).toBeVisible();
    await page.getByLabel('Filter entries').fill('');
    await expect(summary(page)).toHaveText(before);

    const next = page.getByRole('button', { name: 'Next page' });
    // The registry has far more than 50 builds, so a Next button must exist.
    await expect(next.first()).toBeEnabled();
    await next.first().click();
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect(summary(page)).not.toHaveText(before);
    await expectSpa(page);
  });

  test('Home to Entries: the row action opens the report dialog and Turnstile enables Send', async ({ page }) => {
    await gotoLoaded(page, '/');
    await markSpa(page);
    await clickNav(page, 'Entries');
    await expect(page).toHaveURL(/\/entries$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);
    await openReportDialog(page);
    await expectSpa(page);
  });

  test('Entries filters survive going to a paint page and back with the browser Back button', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await markSpa(page);
    const link = page.locator('a[href^="/colors/"]:visible').first();
    await clickThrough(page, link, /\/colors\/[^/]+$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/entries$/);
    await waitLoaded(page);
    await expectSpa(page);
    await expect(summary(page)).toBeVisible();
    const comp = page.locator('[data-filter-group="Model"]:visible').getByRole('button', { name: 'Comp' });
    await comp.click();
    await expect(comp).toHaveAttribute('aria-pressed', 'true');
  });
});

/** Open the first build's row action, pick Report a problem, and check Send enables. Never sends. */
async function openReportDialog(page: Page) {
  const chevron = page.locator('button[aria-label="More about this build"]:visible').first();
  if (await chevron.count()) {
    await chevron.click();
    await page.getByRole('button', { name: 'Report a problem' }).locator('visible=true').first().click();
  } else {
    await page.locator('button[aria-label="Edit or report this build"]:visible').first().click();
    await page.getByRole('menuitem', { name: 'Report a problem' }).click();
  }
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const send = dialog.getByRole('button', { name: 'Send report about this entry' });
  await expect(send).toBeDisabled();
  await dialog.getByLabel("What's wrong with this entry?").selectOption(ACTION_PICK);
  await expect(send).toBeEnabled({ timeout: 20000 });
  await dialog.getByRole('button', { name: 'Cancel flagging this entry' }).click();
  await expect(dialog).toHaveCount(0);
}

test.describe('Paint pages after in-app navigation', () => {
  test('Home: a wall strip opens its paint page, with charts for a paint that has enough builds', async ({ page }) => {
    await gotoLoaded(page, '/');
    await markSpa(page);
    const strip = page.locator('a[href="/colors/san-marino-blue-metallic"]:visible').first();
    await clickThrough(page, strip, /\/colors\/san-marino-blue-metallic$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/san marino blue/i);
    await expect(page.locator('dl dt', { hasText: /^Builds$/ })).toBeVisible();
    await expect(page.locator('svg').first()).toBeVisible();
  });

  test('Colors: a tile opens its paint page, and its builds offer the report dialog', async ({ page }) => {
    await gotoLoaded(page, '/colors');
    await markSpa(page);
    const tile = page.locator('a[href="/colors/san-marino-blue-metallic"]:visible').first();
    await clickThrough(page, tile, /\/colors\/san-marino-blue-metallic$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/san marino blue/i);
    await openReportDialog(page);
    await expectSpa(page);
  });

  test('Entries: a paint link opens the paint page and the report dialog works there', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await markSpa(page);
    await clickThrough(page, page.locator('a[href^="/colors/"]:visible').first(), /\/colors\/[^/]+$/);
    await openReportDialog(page);
    await expectSpa(page);
  });
});

test.describe('Paint search after in-app navigation', () => {
  async function searchAndOpen(page: Page) {
    await expectSpa(page);
    const input = page.getByRole('combobox', { name: /find your paint/i });
    await input.click();
    await input.fill('san marino');
    const option = page.getByRole('option').first();
    await expect(option).toBeVisible();
    await clickThrough(page, option, /\/colors\/san-marino-blue-metallic$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/san marino blue/i);
  }

  test('Home, Colors, Home by links: the search still opens a paint', async ({ page }) => {
    await gotoLoaded(page, '/');
    await markSpa(page);
    await clickNav(page, 'Colors');
    await expect(page).toHaveURL(/\/colors$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);
    await clickNav(page, 'Home');
    await expect(page).toHaveURL(/\/$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);
    await searchAndOpen(page);
  });

  test('Home, paint page, browser Back: the search still opens a paint', async ({ page }) => {
    await gotoLoaded(page, '/');
    await markSpa(page);
    await clickThrough(page, page.locator('a[href^="/colors/"]:visible').first(), /\/colors\/[^/]+$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await waitLoaded(page);
    await expectSpa(page);
    await searchAndOpen(page);
  });

  test('the wall readout follows a strip after coming back by link', async ({ page }) => {
    await gotoLoaded(page, '/');
    await markSpa(page);
    await clickNav(page, 'Colors');
    await expect(page).toHaveURL(/\/colors$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);
    await clickNav(page, 'Home');
    await expect(page).toHaveURL(/\/$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);
    const strip = page.locator('a[href="/colors/san-marino-blue-metallic"]:visible').first();
    await strip.focus();
    await expect(page.locator('[aria-live="polite"] b').filter({ hasText: /san marino blue/i })).toBeVisible();
    await expectSpa(page);
  });
});

test.describe('Edit after in-app navigation', () => {
  test('Home to Entries to Edit: the verify form is ready and the button enables', async ({ page }) => {
    await gotoLoaded(page, '/');
    await markSpa(page);
    await clickNav(page, 'Entries');
    await expect(page).toHaveURL(/\/entries$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);
    await (await openFirstEditLink(page)).click();
    await expect(page).toHaveURL(/\/edit\//, { timeout: 20000 });
    await expectSpa(page);
    await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveCount(1, { timeout: 20000 });
    await expect.poll(async () => page.locator('input[name="cf-turnstile-response"]').inputValue(), { timeout: 20000 }).not.toBe('');
    await page.locator('#forum_username').fill('someone');
    await expect(page.getByRole('button', { name: 'Verify & Edit' })).toBeEnabled();
    await expectSpa(page);
  });
});

test.describe('Submit form after in-app navigation', () => {
  test('Home to Submit: the color list, the location fields and the first token all work', async ({ page }) => {
    await gotoLoaded(page, '/');
    await markSpa(page);
    await clickNav(page, 'Submit');
    await expect(page).toHaveURL(/\/submit$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);

    await page.locator('#ext_color_input').fill('blue');
    await expect(page.locator('#ext-color-listbox').getByRole('option').first()).toBeVisible();

    await page.locator('#location_country').selectOption({ label: 'United States' });
    await expect(page.locator('#location_state')).toBeVisible();
    expect(await page.locator('#location_state option').count()).toBeGreaterThan(40);

    await page.fill('[name="forum_username"]', 'testuser');
    await expect
      .poll(async () => page.locator('input[name="cf-turnstile-response"]').inputValue(), { timeout: 20000 })
      .not.toBe('');
    await expect(page.getByRole('button', { name: /submit build/i })).toBeEnabled();
    await expectSpa(page);
  });
});

test.describe('Colors after in-app navigation', () => {
  test('Home to Colors: the sort chips reorder the grid and write the URL hash', async ({ page }) => {
    await gotoLoaded(page, '/');
    await markSpa(page);
    await clickNav(page, 'Colors');
    await expect(page).toHaveURL(/\/colors$/, { timeout: 20000 });
    await expectSpa(page);
    await waitLoaded(page);
    const names = () => page.locator('ul a[href^="/colors/"] .paint-name').allInnerTexts();
    const byBuilds = await names();
    // Desktop sorts with chips; a phone swaps them for one native select.
    const chipBtn = page.getByRole('button', { name: 'Name, A to Z', exact: true });
    if (await chipBtn.isVisible()) await chipBtn.click();
    else await page.getByRole('combobox', { name: 'Sort paints' }).selectOption({ label: 'Name, A to Z' });
    await expect(page).toHaveURL(/#sort=name$/);
    expect(await names()).not.toEqual(byBuilds);
    await expectSpa(page);
  });
});

test.describe('Navigation menu after in-app navigation', () => {
  test('the menu is closed on the new page and opens again', async ({ page }) => {
    await gotoLoaded(page, '/');
    const toggle = page.locator('.nav-toggle');
    test.skip(!(await toggle.isVisible()), 'hamburger is phone-only');
    await markSpa(page);
    await clickNav(page, 'Colors');
    await expect(page).toHaveURL(/\/colors$/, { timeout: 20000 });
    await expectSpa(page);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('nav.nav-mobile--open')).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('nav.nav-mobile--open').getByRole('link', { name: 'Map' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expectSpa(page);
  });
});
