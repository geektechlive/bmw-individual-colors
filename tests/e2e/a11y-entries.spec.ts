import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoLoaded } from './helpers';

// Direction B unit (d), #69: axe on the new /entries states. Same rule as a11y.spec.ts:
// nothing is allowed through.
async function violations(page: Page): Promise<string[]> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

const ACTION = 'button[aria-label="Edit or report this build"]';

test('axe: /entries at 390 is clean', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLoaded(page, '/entries');
  expect(await violations(page)).toEqual([]);
});

test('axe: /entries with a row expanded at 390 is clean', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLoaded(page, '/entries');
  await page.locator('button[aria-label="More about this build"]').nth(1).click();
  expect(await violations(page)).toEqual([]);
});

test('axe: /entries with the row menu open at 1440 is clean', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoLoaded(page, '/entries');
  await page.locator(`table ${ACTION}`).nth(2).click();
  await expect(page.getByRole('menu')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('axe: a paint page with the row menu open is clean', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoLoaded(page, '/colors/san-marino-blue-metallic');
  await page.locator(ACTION).first().click();
  await expect(page.getByRole('menu')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('axe: the report dialog is clean', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoLoaded(page, '/entries');
  await page.locator(`table ${ACTION}`).first().click();
  await page.getByRole('menuitem', { name: 'Report a problem' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});
