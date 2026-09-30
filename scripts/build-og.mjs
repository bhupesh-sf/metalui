// The social card: the real landing page laid out at 1440×756, saved at 2400×1260, with its controls taken off.
// Needs the docs running (npm run dev). Writes apps/docs/og.png; site discovery copies it into dist.
//
//   node scripts/build-og.mjs            BASE defaults to http://127.0.0.1:4193
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const out = fileURLToPath(new URL('../apps/docs/og.png', import.meta.url));
const base = process.env.BASE ?? 'http://127.0.0.1:4193';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 756 }, deviceScaleFactor: 2400 / 1440, reducedMotion: 'reduce' });
await page.addInitScript(() => localStorage.setItem('metalui:colorway', 'bone'));
await page.goto(base, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
// A card is looked at, not used: no corner header or colorway switch, no keyboard hints, no dev toolbar.
await page.addStyleTag({ content: '.landing-corners, .landing-foot .eng, agentation-toolbar { visibility: hidden !important; }' });
await page.waitForTimeout(1200);
await page.screenshot({ path: out });
await browser.close();
console.log(`og: ${out}`);
