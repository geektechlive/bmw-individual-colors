import { test, expect, type Page } from '@playwright/test';
import { gotoLoaded } from './helpers';

// Direction B unit (a), #66: every control a visitor can see is at least 44x44 CSS px
// (WCAG 2.5.8 / Apple HIG), on the four public pages that matter, at a 390 px phone width.
// Runs in chromium (viewport forced to 390) and in the mobile project (iPhone 14, real WebKit).
test.use({ viewport: { width: 390, height: 844 } });

const MIN = 44;
const PAGES = ['/', '/entries', '/colors', '/colors/signal-green'];
const CONTROLS = 'a, button, input, select, [role=option]';

// Exemptions from the spec (docs/design/2026-11-direction-b.md, unit (a)):
//  1. Paint-wall strips, marked [data-wall-strip]. On phones the single-build list under the
//     wall is the tap target (unit c).
//  2. Links inside running text in a <p>: WCAG 2.5.8 exempts inline links.
const SPEC_EXEMPT = '[data-wall-strip], p a';

// TEMPORARY allowlist: controls that belong to later units. Each entry names the issue that
// removes it; delete the entry in that issue's commit. Matched with Element.closest.
const PENDING: ReadonlyArray<{ selector: string; issue: string; why: string }> = [];

interface Small {
  tag: string;
  text: string;
  w: number;
  h: number;
}

async function undersized(page: Page): Promise<Small[]> {
  return page.evaluate(
    ({ controls, exempt, pending, min }) => {
      const out: Small[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(controls))) {
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // Visually hidden helpers (.sr-only) are 1px clipped boxes.
        if (r.width <= 1 || r.height <= 1) continue;
        if (el.closest(exempt)) continue;
        if (pending.some((p: string) => el.closest(p))) continue;
        if (r.width < min - 0.5 || r.height < min - 0.5) {
          out.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent ?? '').trim().slice(0, 40) || el.getAttribute('aria-label') || el.className,
            w: Math.round(r.width),
            h: Math.round(r.height),
          });
        }
      }
      return out;
    },
    { controls: CONTROLS, exempt: SPEC_EXEMPT, pending: PENDING.map((p) => p.selector), min: MIN },
  );
}

for (const route of PAGES) {
  test(`targets: every visible control on ${route} is at least ${MIN}x${MIN}`, async ({ page }) => {
    await gotoLoaded(page, route);
    // The staggered entrance animates transforms; measure the settled page.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => undefined)),
      ),
    );
    expect(await undersized(page)).toEqual([]);
  });
}

// Control borders (WCAG 1.4.11): --rule-control, #616a78.
const RULE_CONTROL = 'rgb(97, 106, 120)';

test('input and chip borders use --rule-control', async ({ page }) => {
  await gotoLoaded(page, '/colors');
  const input = page.locator('input.input').first();
  const chip = page.locator('button.chip[aria-pressed="false"]:visible').first();
  await expect(input).toBeVisible();
  await expect(chip).toBeVisible();
  await expect(input).toHaveCSS('border-top-color', RULE_CONTROL);
  await expect(chip).toHaveCSS('border-top-color', RULE_CONTROL);
});
