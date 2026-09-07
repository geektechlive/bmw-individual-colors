import { test, expect } from '@playwright/test';

test.describe('SEO routes', () => {
  test('/sitemap.xml returns 200 and contains /colors/ URLs', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/sitemap.xml`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('/colors/');
  });

  test('/robots.txt disallows /admin', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/robots.txt`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Disallow:\s*\/admin/i);
  });

  test('/colors/twilight-purple has og:title meta and canonical link', async ({ page }) => {
    await page.goto('/colors/twilight-purple');
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    const content = await ogTitle.getAttribute('content');
    expect(content).toBeTruthy();

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const href = await canonical.getAttribute('href');
    expect(href).toContain('/colors/twilight-purple');
  });

  test('/colors/twilight-purple/opengraph-image returns 200 image', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/colors/twilight-purple/opengraph-image`);
    expect(res.status()).toBe(200);
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/^image\//);
  });

  test('/definitely-not-a-page renders the custom not-found copy', async ({ page }) => {
    await page.goto('/definitely-not-a-page');
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/404/);
    expect(text).toMatch(/doesn.t exist in the registry/i);
  });
});
