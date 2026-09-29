import { expect, test } from 'vitest';
import { COLORWAYS, openPage } from './harness';

const pages = ['menu', 'status', 'command-palette', 'toolbar', 'snap-guides', 'lasso'] as const;

for (const colorway of COLORWAYS) {
  for (const name of pages) {
    test(`${name} fits a phone in ${colorway}`, async () => {
      await openPage(`/components/${name}`, colorway, { viewport: [375, 812] });
      await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => {})));
      if (['menu', 'status', 'command-palette', 'toolbar'].includes(name)) {
        const swift = () => [...document.querySelectorAll('main img[alt^="SwiftUI"]')];
        await expect.poll(() => swift().length).toBe(1);
        await expect.poll(() => swift()[0].getAttribute('style')).toMatch(/width:/);
      }

      const { scrollWidth } = document.documentElement, { innerWidth } = window;
      expect(innerWidth).toBe(375);
      expect(scrollWidth, `${name} in ${colorway} scrolls sideways`).toBeLessThanOrEqual(innerWidth);
    });
  }
}
