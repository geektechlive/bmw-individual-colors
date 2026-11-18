import { test, expect, type Page } from '@playwright/test';
import { gotoLoaded } from './helpers';

// #63: while a route streams its loading skeleton, the footer used to sit inside the first
// screen and jump away when the content arrived (CLS 0.94 on /colors at 1440 px). Loading
// skeletons now keep the footer below the fold. Good CLS is 0.1 or less.

async function cumulativeShift(page: Page, path: string): Promise<number> {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await gotoLoaded(page, path);
  // Let late shifts (fonts, the entrance animation) land before reading the total.
  await page.waitForLoadState('networkidle');
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls);
}

test.describe('layout shift while pages load', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const path of ['/', '/colors', '/entries', '/reports']) {
    test(`${path} keeps CLS at 0.1 or less`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'layout-shift entries are Chromium-only');
      expect(await cumulativeShift(page, path)).toBeLessThanOrEqual(0.1);
    });
  }
});

// A slow render can paint a loading state before the streamed content swaps in; in either
// state the footer must already be below the first screen, or it jumps when content arrives.
test.describe('loading states keep the footer below the fold', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // With JavaScript off nothing swaps, so the route skeleton (loading.tsx) stays up.
  for (const path of ['/colors', '/entries', '/reports']) {
    test.describe(() => {
      test.use({ javaScriptEnabled: false });
      test(`${path}: route skeleton`, async ({ page }) => {
        await page.goto(path);
        const footer = await page.locator('footer').boundingBox();
        expect(footer?.y ?? 0).toBeGreaterThanOrEqual(900);
      });
    });
  }

  // /entries used to stream its table inside a second, inner Suspense ("Loading entries…"),
  // a short box: a slow render painted the page shell with it and the footer on screen,
  // then the footer jumped when the table arrived (#63, CLS 1.05 once). The page is rendered
  // per request, so useSearchParams doesn't need that boundary; the route skeleton is the
  // only loading state.
  test('/entries has no second loading state', async ({ request }) => {
    const html = await (await request.get('/entries')).text();
    expect(html).not.toContain('Loading entries…');
  });
});
