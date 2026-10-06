import { expect, test } from '@playwright/test';
import { COLORWAYS } from './helpers';

const pages = ['menu', 'status', 'command-palette', 'toolbar', 'snap-guides', 'lasso'] as const;

test.use({ viewport: { width: 375, height: 812 } });

for (const colorway of COLORWAYS) {
  for (const name of pages) {
    test(`${name} fits a phone in ${colorway}`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('metalui:colorway', value), colorway);
      await page.goto(`/components/${name}`);
      await page.locator('main h1').waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => {})));
      });
      if (['menu', 'status', 'command-palette', 'toolbar'].includes(name)) {
        for (const img of await page.locator('main img[alt^="SwiftUI"]').all()) await expect(img).toHaveAttribute('style', /width:/);
      }

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(innerWidth).toBe(375);
      expect(scrollWidth, `${name} in ${colorway} scrolls sideways`).toBeLessThanOrEqual(innerWidth);
    });
  }
}
