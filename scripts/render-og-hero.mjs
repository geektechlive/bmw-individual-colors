// Renders the site's share image (public/og.png, 1200x630) from the dev-only /og-hero page.
// Usage: start the dev server (`npm run dev`), then `node scripts/render-og-hero.mjs [baseUrl]`.
// Re-run after a visual change to the home page or the wall; the image shows no numbers, so
// it doesn't need regenerating when the data changes.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const base = process.argv[2] ?? 'http://localhost:3000';
const out = fileURLToPath(new URL('../public/og.png', import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
const res = await page.goto(`${base}/og-hero`, { waitUntil: 'load' });
if (!res || res.status() !== 200) throw new Error(`/og-hero returned ${res?.status()} (is the dev server running?)`);
await page.evaluate(() => document.fonts.ready);
// Hide dev-only overlays and the page grain so the image is clean.
await page.addStyleTag({ content: 'nextjs-portal{display:none!important} body::after{display:none!important}' });
const hero = page.locator('#og-hero');
const box = await hero.boundingBox();
if (!box || Math.round(box.width) !== 1200 || Math.round(box.height) !== 630) {
  throw new Error(`#og-hero is ${box?.width}x${box?.height}, expected 1200x630`);
}
await hero.screenshot({ path: out });
await browser.close();
console.log(`wrote ${out}`);
