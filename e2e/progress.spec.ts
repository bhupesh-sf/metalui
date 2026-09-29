import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Progress: the fill's edge follows the value on the settle spring and never passes it; an unknown
// amount is a lit segment sweeping across; Reduce Motion snaps and breathes instead.
const share = (bar: import('@playwright/test').Locator) =>
  bar.evaluate((el) => el.querySelector('.mu-progress-fill')!.getBoundingClientRect().width / el.querySelector('.mu-progress-track')!.getBoundingClientRect().width);

for (const colorway of COLORWAYS) {
  test(`runs to done, named and valued, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/progress', colorway);
    const known = page.getByRole('progressbar', { name: 'Exporting 12 photos' });
    const unknown = page.getByRole('progressbar', { name: 'Syncing this canvas' });
    await expect(known).toHaveAttribute('aria-valuenow', '40');
    await expect(unknown).not.toHaveAttribute('aria-valuenow', /.*/);
    await page.getByRole('button', { name: 'Run export' }).click();
    await expect(known).toHaveAttribute('aria-valuenow', '100', { timeout: 10_000 });
    await expect(known).toContainText('100%');
    await expect.poll(() => share(known)).toBeGreaterThan(0.995);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`progress-${colorway}`) });
  });
}

test('the edge settles onto a new value without passing it', async ({ page }) => {
  await open(page, '/components/progress', 'bone');
  const known = page.getByRole('progressbar', { name: 'Exporting 12 photos' });
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect.poll(() => share(known)).toBeCloseTo(0.4, 2);
  const shares = await known.evaluate(async (el) => {
    const fill = el.querySelector('.mu-progress-fill') as HTMLElement;
    const track = el.querySelector('.mu-progress-track')!;
    fill.style.width = '70%';
    const out: number[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => { out.push(fill.getBoundingClientRect().width / track.getBoundingClientRect().width); if (performance.now() - t0 < 600) requestAnimationFrame(frame); else done(); };
      requestAnimationFrame(frame);
    });
    return out;
  });
  expect(shares.some((s) => s > 0.41 && s < 0.69)).toBe(true);
  expect(Math.max(...shares)).toBeLessThanOrEqual(0.7005);
  expect(shares.at(-1)).toBeCloseTo(0.7, 2);
});

test('an unknown amount sweeps across; under Reduce Motion it breathes in place', async ({ page }) => {
  await open(page, '/components/progress', 'graphite');
  const seg = page.getByRole('progressbar', { name: 'Syncing this canvas' }).locator('.mu-progress-fill');
  const a = (await seg.boundingBox())!.x;
  await page.waitForTimeout(300);
  const b = (await seg.boundingBox())!.x;
  expect(Math.abs(b - a)).toBeGreaterThan(10);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(seg).toHaveCSS('animation-name', 'mu-progress-breathe');
  const c = (await seg.boundingBox())!.x;
  await page.waitForTimeout(300);
  expect((await seg.boundingBox())!.x).toBeCloseTo(c, 0);
});
