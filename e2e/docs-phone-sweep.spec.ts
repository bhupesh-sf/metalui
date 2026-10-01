import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// No docs page scrolls sideways on a phone. The routes are read from the router, so a new page is covered
// the day it is added. A demo wider than the screen scrolls inside its stage; it never widens the page.
const source = readFileSync('apps/docs/src/app/routes.tsx', 'utf8');
const paths = ['/', ...[...source.matchAll(/\bpath:\s*'([^'*:]+)'/g)].map((m) => `/${m[1]}`)].filter((p) => p !== '//');
const routes = [...new Set(paths)];

for (const width of [375, 320]) {
  test(`no docs page scrolls sideways at ${width} px`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const wide: string[] = [];
    for (const route of routes) {
      await page.goto(route);
      await page.locator('main h1, h1').first().waitFor({ state: 'attached' });
      await page.waitForTimeout(150);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 0) wide.push(`${route} (+${over}px)`);
    }
    expect(routes.length).toBeGreaterThan(90);
    expect(wide, `pages that scroll sideways at ${width} px`).toEqual([]);
  });
}
