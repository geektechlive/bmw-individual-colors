import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Navigate, then wait until the route's loading skeleton (`loading.tsx`, #43) has been
 * replaced by the page. The skeleton streams first, so reading text right after `load`
 * can see "Loading" instead of the content.
 */
export async function gotoLoaded(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.locator('main [role="status"]').filter({ hasText: /^Loading/ })).toHaveCount(0, {
    timeout: 20000,
  });
}

/**
 * The first "Edit this build" link a visitor can reach on /entries, with its row action
 * opened: the ··· menu on desktop, the chevron on a phone (#69). The edit link lives behind
 * one of them in both layouts. /entries renders the table and the phone rows; CSS hides one.
 */
export async function openFirstEditLink(page: Page): Promise<Locator> {
  const chevron = page.locator('button[aria-label="More about this build"]:visible').first();
  if (await chevron.count()) {
    await chevron.click();
    return page.locator('a[href*="/edit/"]:visible').first();
  }
  await page.locator('button[aria-label="Edit or report this build"]:visible').first().click();
  return page.getByRole('menuitem', { name: 'Edit this build' });
}
