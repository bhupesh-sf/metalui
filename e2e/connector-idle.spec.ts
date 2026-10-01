import { expect, test } from '@playwright/test';
import { open } from './helpers';

// The connector only asks for frames while something moves: an elastic line at rest asks for none,
// a flow look (comets, dust) asks for them while the tab is visible, and a hidden tab holds it.
const frames = (page: import('@playwright/test').Page, ms: number) =>
  page.evaluate((span) => new Promise<number>((resolve) => {
    const w = window as unknown as { __raf?: number; __rafWrapped?: boolean };
    if (!w.__rafWrapped) {
      const real = window.requestAnimationFrame.bind(window);
      w.__raf = 0;
      window.requestAnimationFrame = (cb) => { w.__raf = (w.__raf ?? 0) + 1; return real(cb); };
      w.__rafWrapped = true;
    }
    w.__raf = 0;
    setTimeout(() => resolve(w.__raf ?? 0), span);
  }), ms);

const setHidden = (page: import('@playwright/test').Page, hidden: boolean) =>
  page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

test('an elastic line at rest asks for no frames; a flow look does, until the tab is hidden', async ({ page }) => {
  await open(page, '/components/connector', 'bone');
  await page.waitForTimeout(1500); // let the spring settle

  expect(await frames(page, 1000)).toBe(0);

  await page.getByRole('radio', { name: 'Current' }).click();
  expect(await frames(page, 1000)).toBeGreaterThan(20);

  await setHidden(page, true);
  await page.waitForTimeout(100);
  expect(await frames(page, 1000)).toBe(0);

  await setHidden(page, false);
  expect(await frames(page, 1000)).toBeGreaterThan(20);
});
