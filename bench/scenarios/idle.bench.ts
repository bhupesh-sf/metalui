import { test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { measureIdle } from '../lib/idle';

// Idle cost of real docs pages: what the library does while nothing is happening.
// The route list comes from the built site's own sitemap, so a new page is benched automatically.
const BASELINE = '/foundations/spacing'; // a quiet page: docs chrome with no library motion
const DEFAULT = [BASELINE, '/components/button', '/components/led', '/components/spinner', '/components/progress', '/components/skeleton'];
const COLORWAYS = (process.env.BENCH_COLORWAYS ?? 'bone').split(',');
const OUT = 'bench/results/idle';

function pages(): string[] {
  const want = process.env.BENCH_PAGES ?? '';
  if (want !== 'all') return want ? want.split(',') : DEFAULT;
  const sitemap = 'apps/docs/dist/sitemap.xml';
  if (!existsSync(sitemap)) throw new Error('bench: apps/docs/dist/sitemap.xml missing, run npm run build');
  const routes = [...readFileSync(sitemap, 'utf8').matchAll(/<loc>https:\/\/metalui\.dev(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  return [BASELINE, ...routes.filter((r) => r !== BASELINE)];
}

for (const colorway of COLORWAYS) {
  for (const path of pages()) {
    test(`idle ${path} ${colorway}`, async ({ page }) => {
      await page.addInitScript((c) => localStorage.setItem('metalui:colorway', c), colorway);
      await page.goto(path);
      await page.waitForSelector('#root *');
      const all = process.env.BENCH_PAGES === 'all';
      const sample = await measureIdle(page, all ? { settleMs: 2000, windowMs: 5000 } : undefined);
      mkdirSync(OUT, { recursive: true });
      const slug = path.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'root';
      writeFileSync(`${OUT}/${slug}.${colorway}.json`, JSON.stringify({ path, colorway, ...sample }, null, 2) + '\n');
    });
  }
}
