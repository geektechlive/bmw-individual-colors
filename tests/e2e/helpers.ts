import { expect, type Page } from '@playwright/test';

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

/** Edit links the user can see. /entries renders the table and the phone cards; CSS hides one. */
export const VISIBLE_EDIT_LINKS = 'a[href*="/edit/"]:visible';
