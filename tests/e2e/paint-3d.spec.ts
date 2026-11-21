import { test, expect, type Page } from '@playwright/test';
import { gotoLoaded, markSpa, clickThrough } from './helpers';

// #96, ADR 0021: tap the paint page's card to see the paint in 3D. WebGL runs in the
// visitor's browser, so this needs a browser with a GPU path (headless Chromium and WebKit
// both give one). three.js sets window.__THREE__ when it loads, which is how "not loaded
// until intent" is checked.

const PAINT = '/colors/san-marino-blue-metallic';

/** Arrive the way a visitor does: from the paint list, by clicking a real link. */
async function arrive(page: Page) {
  await gotoLoaded(page, '/colors');
  await markSpa(page);
  const link = page.locator(`a[href="${PAINT}"]`).first();
  await clickThrough(page, link, new RegExp(`${PAINT}$`));
  await page.mouse.move(0, 0); // the pointer must not rest on the card
}

const card = (page: Page) => page.getByRole('button', { name: /^View .+ in 3D$/ });
const threeLoaded = (page: Page) => page.evaluate(() => (window as unknown as { __THREE__?: string }).__THREE__ ?? null);

test.describe('3D paint view (#96)', () => {
  test('the card is a labelled button of at least 44px with a visible hint', async ({ page }) => {
    await arrive(page);
    const button = card(page);
    await expect(button).toBeVisible();
    await expect(button).toHaveAccessibleName(/^View San Marino Blue Metallic in 3D$/);
    await expect(button.getByText('View in 3D')).toBeVisible();
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    // The swatch stays in the DOM for the finish checks (design.spec.ts).
    await expect(button.locator('[data-finish="metallic"]')).toBeAttached();
  });

  test('three.js is not fetched until intent', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await arrive(page);
    await page.waitForLoadState('networkidle');
    expect(await threeLoaded(page)).toBeNull();
    expect(requests.filter((u) => /three/i.test(new URL(u).pathname)), 'a three chunk was requested on load').toEqual([]);
    await card(page).hover();
    await expect.poll(() => threeLoaded(page), { timeout: 20000 }).not.toBeNull();
  });

  test('tap opens a dialog with a canvas, a drag turns it, Esc closes and returns focus', async ({ page }) => {
    await arrive(page);
    const button = card(page);
    await button.scrollIntoViewIfNeeded(); // click() would scroll; measure where it will really be
    const before = await button.boundingBox();
    await button.click();

    const dialog = page.getByRole('dialog', { name: 'San Marino Blue Metallic' });
    await expect(dialog).toBeVisible({ timeout: 20000 });
    const canvas = dialog.getByRole('img', { name: /3D paint sample/ });
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('data-yaw', /.+/, { timeout: 20000 });
    await expect(dialog.getByText('Drag to turn')).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Close 3D view' });
    const closeBox = await close.boundingBox();
    expect(closeBox!.width).toBeGreaterThanOrEqual(44);
    expect(closeBox!.height).toBeGreaterThanOrEqual(44);

    const yaw = async () => Number(await canvas.getAttribute('data-yaw'));
    const start = await yaw();
    const vp = page.viewportSize()!;
    await page.mouse.move(vp.width / 2, vp.height / 2);
    await page.mouse.down();
    await page.mouse.move(vp.width / 2 + 140, vp.height / 2 + 10, { steps: 8 });
    await page.mouse.up();
    // The hook updates on the next rendered frame, which software GL can make slow.
    await expect.poll(async () => Math.abs((await yaw()) - start), { timeout: 10000 }).toBeGreaterThan(0.2);
    await expect(dialog).toBeVisible(); // a drag is not a tap outside

    const afterDrag = await yaw();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(yaw).toBeLessThan(afterDrag);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect(button).toBeFocused();
    await expect(button).not.toHaveAttribute('data-lifted', /.*/);
    const after = await button.boundingBox();
    expect(after).toEqual(before);
  });

  test('a tap outside the shape closes it', async ({ page }) => {
    await arrive(page);
    await card(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('img')).toHaveAttribute('data-yaw', /.+/, { timeout: 20000 });
    await page.waitForTimeout(1000); // let the flight finish so the corner is empty sky
    await page.mouse.click(12, 12);
    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect(card(page)).toBeFocused();
  });

  test('the close button closes it', async ({ page }) => {
    await arrive(page);
    await card(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('img')).toHaveAttribute('data-yaw', /.+/, { timeout: 20000 });
    await dialog.getByRole('button', { name: 'Close 3D view' }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect(card(page)).toBeFocused();
  });

  test('a failed chunk load keeps the page and says so (stale tab after a deploy)', async ({ page }) => {
    test.setTimeout(90000);
    await arrive(page);
    await page.route('**/_next/static/chunks/**', (route) => route.abort());
    await card(page).click();
    await expect(page.getByRole('status').filter({ hasText: 'Could not load the 3D view' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(card(page)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a lost graphics context closes the view, says why, and the card opens it again', async ({ page }) => {
    await arrive(page);
    await card(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('img')).toHaveAttribute('data-yaw', /.+/, { timeout: 20000 });
    await page.evaluate(() => {
      const canvas = document.querySelector('dialog canvas') as HTMLCanvasElement;
      const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext;
      gl.getExtension('WEBGL_lose_context')!.loseContext();
    });
    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect(page.getByRole('status').filter({ hasText: 'reset its graphics' })).toBeVisible();
    await expect(card(page)).toBeFocused();
    await card(page).click();
    await expect(page.getByRole('dialog').getByRole('img')).toHaveAttribute('data-yaw', /.+/, { timeout: 20000 });
  });

  test('without WebGL it says so and the flat card stays', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });
    await arrive(page);
    await card(page).click();
    await expect(page.getByRole('status').filter({ hasText: "can't show 3D" })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(card(page)).toBeVisible();
    await expect(card(page).locator('[data-finish]')).toBeVisible();
  });
});
