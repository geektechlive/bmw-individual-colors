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

/** Wait until the route's `loading.tsx` skeleton has been replaced by the page. */
export async function waitLoaded(page: Page): Promise<void> {
  await expect(page.locator('main [role="status"]').filter({ hasText: /^Loading/ })).toHaveCount(0, {
    timeout: 20000,
  });
}

/** Click a main-nav link the way a visitor would: through the hamburger on a phone. */
export async function clickNav(page: Page, name: string): Promise<void> {
  const toggle = page.locator('.nav-toggle');
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole('link', { name, exact: true }).locator('visible=true').first().click();
}

/** Mark the document so a later check can tell a client-side navigation from a full load. */
export async function markSpa(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __spa?: number }).__spa = 1;
  });
}

/** Fail if the document was reloaded since markSpa: every hop so far was client-side. */
export async function expectSpa(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => (window as unknown as { __spa?: number }).__spa),
    'window marker lost: a full page load happened, not a client-side navigation',
  ).toBe(1);
}

/**
 * Click something that navigates (a link, or a control that calls router.push), wait for the
 * new page, then prove the document was never reloaded. Call markSpa once first, after the
 * starting page loads: the marker is deliberately NOT reset here, so a full load on any
 * earlier hop still fails the test (#90 hid for 2.5 months behind page.goto).
 */
export async function clickThrough(page: Page, trigger: Locator, url: RegExp | string): Promise<void> {
  await trigger.click();
  await expect(page).toHaveURL(url, { timeout: 20000 });
  await waitLoaded(page);
  await expectSpa(page);
}
