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
  // Wait for the filter to apply before reading links, so only bot rows are collected.
  // The username appears in both the table and the hidden phone card, so only count the visible one.
  await expect(
    page.getByText(BOT_USERNAME).or(page.getByText(/no entries found/i)).filter({ visible: true }).first()
  ).toBeVisible();
  // The table and the phone cards both carry an edit link per build (#42), so dedupe the ids.
  const hrefs = await page.locator('a[href*="/edit/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
  const ids = hrefs.filter(Boolean).map((href) => href.split('/edit/')[1].split(/[?#]/)[0]);
  return [...new Set(ids)];
}

/** Owner-initiated soft delete via the verify -> edit -> delete flow. */
async function deleteOwnEntryById(page: Page, id: string) {
  await page.goto(`/edit/${id}`);
  await page.fill('input[name="forum_username"]', BOT_USERNAME);
  await waitForTurnstileToken(page);
  await page.getByRole('button', { name: /verify & edit/i }).click();

  await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  // Both builds must be saved as the year the user picked (a reset form used to post 2021).
  // Soft, so a failure still deletes the row instead of leaving it on the live site.
  await expect.soft(page.locator('#model_year')).toHaveValue('2024');
  await page.getByRole('button', { name: /delete this entry/i }).click();
  await page.getByRole('button', { name: /yes, delete it/i }).click();
  await expect(page).toHaveURL(/\/entries\?deleted=1/);
}

test.describe('Duplicate submission flow', () => {
  test('an identical second submission is stopped with a link to edit the first; the form keeps its values', async ({ page }) => {
    test.setTimeout(90000);

    // First submission: should succeed outright.
    await fillDuplicateBuild(page);
    await page.getByRole('button', { name: /submit build/i }).click();
    await expect(page).toHaveURL(/\/entries\?submitted=1/, { timeout: 15000 });

    try {
      // Second, identical submission: a hard stop (ADR 0017), not a second row.
      await fillDuplicateBuild(page);
      await page.getByRole('button', { name: /^submit build$/i }).click();

      await expect(page.getByText(/you've already registered this build/i)).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('button', { name: /submit anyway/i })).toHaveCount(0);
      // The warning must not reset what the user typed (React resets uncontrolled fields).
      await expect(page.locator('#model_year')).toHaveValue('2024');

      // "Edit that build" points at the first submission.
      const editHref = await page.getByRole('link', { name: /edit that build/i }).getAttribute('href');
      expect(editHref).toMatch(/^\/edit\/[0-9a-f-]{36}$/);

      // Exactly one row exists for the bot, and it's the one the link points at.
      const botIds = await findBotEntryIds(page);
      expect(botIds).toEqual([editHref!.split('/edit/')[1]]);
    } finally {
      // Cleanup: soft-delete every bot row via the owner edit flow (the admin page only
      // lists flagged rows, and these were never flagged). Runs even if a check failed,
      // so nothing is left on the live site.
      for (const id of await findBotEntryIds(page)) {
        await deleteOwnEntryById(page, id);
      }
    }

    // Verify cleanup: no more rows for this bot username.
    const remaining = await findBotEntryIds(page);
    expect(remaining.length).toBe(0);
  });
});
