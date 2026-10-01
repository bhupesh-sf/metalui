import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { measureIdle } from '../lib/idle';

const OUT = 'bench/results/idle';

// Idle cost of a real docs page: what the library does while nothing is happening.
const PAGES = (process.env.BENCH_PAGES ?? '/components/button').split(',');

for (const path of PAGES) {
  test(`idle ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForSelector('main h1');
    const sample = await measureIdle(page);
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/${path.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'root'}.json`, JSON.stringify({ path, ...sample }, null, 2) + '\n');
    console.log(path, JSON.stringify(sample));
  });
}
