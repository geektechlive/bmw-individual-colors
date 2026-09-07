import { test, expect, type Page } from '@playwright/test';

// Requires Cloudflare Turnstile test keys (site key 1x0000... / secret key
// starting with 1x) so the widget auto-solves headlessly. See CLAUDE.md /
// AGENTS.md task brief for the env override used to run this suite.
const hasTurnstileTestKeys = !!process.env.TURNSTILE_SECRET_KEY?.startsWith('1x');
test.skip(!hasTurnstileTestKeys, 'needs Turnstile test keys');

const BOT_USERNAME = `e2e-bot-${Date.now()}`;

async function waitForTurnstileToken(page: Page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null;
      return !!el && el.value.length > 0;
    },
    { timeout: 20000 }
  );
}

async function fillDuplicateBuild(page: Page) {
  await page.goto('/submit');
  await page.selectOption('#model_year', '2024');
  await page.check('input[name="body_style"][value="M3"]');
  await page.fill('#ext_color_input', 'Twilight Purple');
  await page.keyboard.press('Escape'); // close the combobox dropdown
  await page.fill('[name="forum_username"]', BOT_USERNAME);
  await waitForTurnstileToken(page);
}

/** Finds the entry ids for rows whose forum username matches BOT_USERNAME. */
async function findBotEntryIds(page: Page): Promise<string[]> {
  await page.goto('/entries');
  await page.getByLabel('Filter entries').fill(BOT_USERNAME);
  const editLinks = page.locator('a[href*="/edit/"]');
  const count = await editLinks.count();
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const href = await editLinks.nth(i).getAttribute('href');
    if (!href) continue;
    const id = href.split('/edit/')[1].split(/[?#]/)[0];
    ids.push(id);
  }
  return ids;
}

/** Owner-initiated soft delete via the verify -> edit -> delete flow. */
async function deleteOwnEntryById(page: Page, id: string) {
  await page.goto(`/edit/${id}`);
  await page.fill('input[name="forum_username"]', BOT_USERNAME);
  await waitForTurnstileToken(page);
  await page.getByRole('button', { name: /verify & edit/i }).click();

  await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  await page.getByRole('button', { name: /delete this entry/i }).click();
  await page.getByRole('button', { name: /yes, delete it/i }).click();
  await expect(page).toHaveURL(/\/entries\?deleted=1/);
}

test.describe('Duplicate submission flow', () => {
  test('duplicate warning appears and Submit Anyway creates a second entry; both are cleaned up', async ({ page }) => {
    test.setTimeout(90000);

    // First submission — should succeed outright.
    await fillDuplicateBuild(page);
    await page.getByRole('button', { name: /submit build/i }).click();
    await expect(page).toHaveURL(/\/entries\?submitted=1/, { timeout: 15000 });

    // Second, identical submission — should surface the duplicate warning.
    await fillDuplicateBuild(page);
    await page.getByRole('button', { name: /^submit build$/i }).click();

    const duplicateWarning = page.getByText(/potential duplicate entry/i);
    await expect(duplicateWarning).toBeVisible({ timeout: 15000 });

    const submitAnywayBtn = page.getByRole('button', { name: /submit anyway/i });
    await expect(submitAnywayBtn).toBeVisible();

    // The widget is reset after the duplicate response; wait for a fresh
    // token before the button becomes clickable again.
    await waitForTurnstileToken(page);
    await expect(submitAnywayBtn).toBeEnabled({ timeout: 15000 });
    await submitAnywayBtn.click();

    await expect(page).toHaveURL(/\/entries\?submitted=1/, { timeout: 15000 });

    // Cleanup: soft-delete both bot rows via the owner edit flow (the admin
    // page only lists flagged rows, and these were never flagged).
    const ids = await findBotEntryIds(page);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    for (const id of ids) {
      await deleteOwnEntryById(page, id);
    }

    // Verify cleanup: no more rows for this bot username.
    const remaining = await findBotEntryIds(page);
    expect(remaining.length).toBe(0);
  });
});
