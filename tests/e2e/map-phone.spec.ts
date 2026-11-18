import { expect, test } from '@playwright/test';
import { gotoLoaded } from './helpers';

// #72: the map opens on the located builds' bounds, so a phone starts on the US clusters
// instead of Europe and Africa.
test.describe('/map initial view', () => {
  for (const width of [390, 1440]) {
    test(`largest cluster is inside the visible map at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await gotoLoaded(page, '/map');
      await expect(page.locator('.leaflet-container')).toBeVisible();
      await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 20000 });
      // Let chunked marker loading and the initial fit settle.
      await page.waitForTimeout(1500);

      const result = await page.evaluate(() => {
        const box = document.querySelector('.leaflet-container')!.getBoundingClientRect();
        const clusters = Array.from(document.querySelectorAll('.leaflet-marker-icon'))
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { n: Number((el.textContent ?? '').trim()), x: r.x + r.width / 2, y: r.y + r.height / 2 };
          })
          .filter((c) => Number.isFinite(c.n) && c.n > 0);
        const best = clusters.reduce<(typeof clusters)[number] | null>(
          (top, c) => (top === null || c.n > top.n ? c : top),
          null,
        );
        return { box: { x: box.x, y: box.y, w: box.width, h: box.height }, best };
      });
      expect(result.best, 'a cluster marker with a count').not.toBeNull();
      const b = result.best!;
      expect(b.x).toBeGreaterThan(result.box.x);
      expect(b.x).toBeLessThan(result.box.x + result.box.w);
      expect(b.y).toBeGreaterThan(result.box.y);
      expect(b.y).toBeLessThan(result.box.y + result.box.h);
    });
  }

  test('desktop keeps the world view: every located build is on screen at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoLoaded(page, '/map');
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(1500);
    const located = Number(
      ((await page.getByText(/builds with location data/).textContent()) ?? '').match(/\d+/)![0],
    );
    const onScreen = await page.evaluate(() => {
      const box = document.querySelector('.leaflet-container')!.getBoundingClientRect();
      return Array.from(document.querySelectorAll('.leaflet-marker-icon'))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const x = r.x + r.width / 2;
          const y = r.y + r.height / 2;
          return x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height;
        })
        .reduce((sum, el) => {
          const n = Number((el.textContent ?? '').trim());
          return sum + (Number.isFinite(n) && n > 0 ? n : 1);
        }, 0);
    });
    expect(onScreen).toBe(located);
  });
});
