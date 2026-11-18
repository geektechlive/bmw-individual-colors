import { expect, test } from '@playwright/test';
import { gotoLoaded } from './helpers';

// #73: a frozen (matte) tile needs a broad soft falloff (lighter top left) and visible grain,
// so it reads as paint rather than a failed image. Measured from real pixels.
test('frozen tile has a soft top-left falloff and visible grain', async ({ page }) => {
  await gotoLoaded(page, '/colors');
  const tile = page.locator('[data-finish="frozen"]').first();
  await tile.scrollIntoViewIfNeeded();
  await expect(tile).toBeVisible();
  await page.waitForTimeout(500); // lets the grid's reveal settle before reading pixels
  const png = (await tile.screenshot()).toString('base64');

  const m = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const linear = (v: number) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    // Mean CIE lightness (L*, 0-100) of a patch, and the spread of its encoded luma (the grain).
    const patch = (x: number, y: number, size: number) => {
      const d = ctx.getImageData(x, y, size, size).data;
      const luma: number[] = [];
      let sumY = 0;
      for (let i = 0; i < d.length; i += 4) {
        luma.push(0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!);
        sumY += 0.2126 * linear(d[i]!) + 0.7152 * linear(d[i + 1]!) + 0.0722 * linear(d[i + 2]!);
      }
      const meanY = sumY / luma.length;
      const lightness = meanY > 0.008856 ? 116 * Math.cbrt(meanY) - 16 : 903.3 * meanY;
      const mean = luma.reduce((a, b) => a + b, 0) / luma.length;
      const sd = Math.sqrt(luma.reduce((a, b) => a + (b - mean) ** 2, 0) / luma.length);
      return { lightness, sd };
    };
    const size = 24;
    const inset = 8;
    const tl = patch(inset, inset, size);
    const br = patch(img.width - inset - size, img.height - inset - size, size);
    return { tl, br };
  }, png);

  const range = m.tl.lightness - m.br.lightness;
  expect(range, 'top-left is lighter than bottom-right by about 10 L* points').toBeGreaterThan(8);
  expect(range, 'the falloff stays soft').toBeLessThan(12);
  expect(Math.min(m.tl.sd, m.br.sd), 'visible grain (luma spread inside a patch)').toBeGreaterThan(3);
});
