import { test, expect } from '@playwright/test';

// #94: an unknown paint page must send a real 404, not the branded page with a 200
// (the paint route streams its loading skeleton before the page can call notFound()).
test.describe('paint page status codes (#94)', () => {
  test('an unknown paint answers 404 with the branded page', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/colors/cedar-brown`);
    expect(res.status()).toBe(404);
    expect(await res.text()).toContain('exist in the registry');
  });

  test('a made-up slug answers 404', async ({ request, baseURL }) => {
    expect((await request.get(`${baseURL}/colors/not-a-paint-zz9`)).status()).toBe(404);
  });

  test('a catalog paint with builds still answers 200', async ({ request, baseURL }) => {
    expect((await request.get(`${baseURL}/colors/laguna-seca-blue`)).status()).toBe(200);
  });

  test('an old paint name still redirects', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/colors/twilight-purple`, { maxRedirects: 0 });
    expect([307, 308]).toContain(res.status());
  });
});
