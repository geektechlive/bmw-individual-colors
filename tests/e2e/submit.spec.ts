import { test, expect } from '@playwright/test';

test.describe('Submit form page', () => {
  test('loads with form fields', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/submit|add|register/i);
  });

  test('form has model year and color fields', async ({ page }) => {
    await page.goto('/submit');
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/model year|year|color/i);
  });

  test('forum username field is marked required', async ({ page }) => {
    await page.goto('/submit');
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/Forum Username \*/i);
  });

  test('forum username input has required attribute', async ({ page }) => {
    await page.goto('/submit');
    const usernameInput = page.locator('[name="forum_username"]');
    await expect(usernameInput).toBeVisible();
    const required = await usernameInput.getAttribute('required');
    expect(required).not.toBeNull();
  });

  test('submit button is disabled when forum username is empty', async ({ page }) => {
    await page.goto('/submit');
    const submitBtn = page.getByRole('button', { name: /submit build/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button enables after typing a forum username', async ({ page }) => {
    await page.goto('/submit');
    await page.fill('[name="forum_username"]', 'testuser');
    const submitBtn = page.getByRole('button', { name: /submit build/i });
    await expect(submitBtn).toBeEnabled();
  });

  test('Turnstile widget is rendered on submit page', async ({ page }) => {
    await page.goto('/submit');
    // cf-turnstile div should be in DOM (Turnstile renders into it)
    await expect(page.locator('.cf-turnstile')).toBeAttached();
  });

  test('forum radio buttons are present', async ({ page }) => {
    await page.goto('/submit');
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/BimmerPost/);
    expect(text).toMatch(/M3Post/);
    expect(text).toMatch(/F80Post/);
    expect(text).toMatch(/Other/);
  });

  test('submit button is disabled when form is empty', async ({ page }) => {
    await page.goto('/submit');
    const submitBtn = page.getByRole('button', { name: /submit build/i });
    await expect(submitBtn).toBeDisabled();
  });
});

test.describe('Flag button', () => {
  test('flag button appears on entries page', async ({ page }) => {
    await page.goto('/entries');
    const flagBtns = page.locator('button[title="Flag this entry as incorrect"]');
    const count = await flagBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test('flag button appears on color detail page', async ({ page }) => {
    await page.goto('/colors/san-marino-blue');
    const flagBtns = page.locator('button[title="Flag this entry as incorrect"]');
    const count = await flagBtns.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Admin page', () => {
  test('without a session shows the sign-in form, not the queue (#32)', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin sign-in' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Reported Entries/ })).toHaveCount(0);
  });

  test('a token in the URL no longer grants access (#32)', async ({ page }) => {
    const token = process.env.ADMIN_TOKEN ?? 'bmwic-admin-local';
    await page.goto(`/admin?token=${token}`);
    await expect(page.getByRole('heading', { name: 'Admin sign-in' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Reported Entries/ })).toHaveCount(0);
  });

  // Signing in needs Turnstile: run with the test keys (see CLAUDE.md "E2E").
  test('signing in with the admin token shows the reported-entries queue (#32)', async ({ page }) => {
    test.skip(!process.env.ADMIN_TOKEN, 'set ADMIN_TOKEN (and Turnstile test keys) to run');
    await page.goto('/admin');
    await page.waitForFunction(() => (document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value);
    await page.fill('#admin_token', process.env.ADMIN_TOKEN!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: /Reported Entries/ })).toBeVisible();
    expect(page.url()).not.toContain('token');
  });
});
