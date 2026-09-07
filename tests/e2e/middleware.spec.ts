import { test, expect } from '@playwright/test';

test.describe('Bot-probe middleware', () => {
  test('blocks /.env with 403', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/.env`);
    expect(res.status()).toBe(403);
  });

  test('blocks /wp-includes/x.php with 403', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/wp-includes/x.php`);
    expect(res.status()).toBe(403);
  });

  test('blocks /XMLRPC.PHP with 403 (case-insensitive)', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/XMLRPC.PHP`);
    expect(res.status()).toBe(403);
  });

  test('allows /colors/twilight-purple with 200', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/colors/twilight-purple`);
    expect(res.status()).toBe(200);
  });

  test('allows /entries with 200', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/entries`);
    expect(res.status()).toBe(200);
  });
});
