import { test, expect } from '@playwright/test';
import { gotoLoaded } from './helpers';

// Review fixes for #69: row-action menu and report dialog behaviour.
const ACTION = 'button[aria-label="Edit or report this build"]';

test.describe('Menu', () => {
  test('Escape closes the menu even after focus moved to the page (click on the hint)', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    const btn = page.locator(`table ${ACTION}`).first();
    await btn.click();
    await page.getByText("You'll need the forum username on the build to edit it.").click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(btn).toBeFocused();
  });

  test('Space on "Edit this build" activates the link', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await page.locator(`table ${ACTION}`).first().click();
    await expect(page.getByRole('menuitem', { name: 'Edit this build' })).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page).toHaveURL(/\/edit\//);
  });

  test('the menu closes once its button scrolls out of the viewport', async ({ page }) => {
    await gotoLoaded(page, '/entries');
    await page.locator(`table ${ACTION}`).first().click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 2500));
    await expect(page.getByRole('menu')).toHaveCount(0);
  });
});

test.describe('Report dialog while sending', () => {
  test('Cancel is disabled and Escape is ignored until the report settles', async ({ page }) => {
    // Hold the server action so it stays pending; nothing reaches the server or the
    // moderation queue.
    const held: Array<() => Promise<void>> = [];
    await page.route('**/entries', async (route) => {
      if (route.request().method() === 'POST') {
        held.push(() => route.abort());
        return;
      }
      await route.continue();
    });
    await gotoLoaded(page, '/entries');
    await page.locator(`table ${ACTION}`).first().click();
    await page.getByRole('menuitem', { name: 'Report a problem' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel("What's wrong with this entry?").selectOption({ index: 1 });
    const send = dialog.getByRole('button', { name: 'Send report about this entry' });
    await expect(send).toBeEnabled({ timeout: 20000 });
    await send.click();
    await expect.poll(() => held.length).toBeGreaterThan(0);
    await expect(dialog.getByRole('button', { name: 'Cancel flagging this entry' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    for (const release of held) await release();
  });
});

test.describe('Paint page forum tag', () => {
  test('no row shows "[BimmerPost]"', async ({ page }) => {
    await gotoLoaded(page, '/colors/san-marino-blue');
    await expect(page.locator('main')).not.toContainText('BimmerPost');
  });

  test('a non-BimmerPost forum shows as "Other forum" (Oxford Green II Metallic, live data)', async ({ page }) => {
    await gotoLoaded(page, '/colors/oxford-green-ii-metallic');
    await expect(page.locator('main')).toContainText('Other forum');
    await expect(page.locator('main')).not.toContainText('[Other]');
  });
});
