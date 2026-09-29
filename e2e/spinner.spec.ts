import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Spinner: shows only after a beat (quick work never flashes it), then turns at a constant speed;
// under Reduce Motion it stands still and breathes.
for (const colorway of COLORWAYS) {
  test(`a quick save never flashes it; a slow one shows it after the beat, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/spinner', colorway);
    const quick = page.getByRole('button', { name: /Quick save/ });
    const peak = await quick.evaluate(async (btn) => {
      (btn as HTMLElement).click();
      let max = 0;
      const t0 = performance.now();
      await new Promise<void>((done) => {
        const frame = () => {
          const s = btn.querySelector('.mu-spinner');
          if (s) max = Math.max(max, parseFloat(getComputedStyle(s).opacity));
          if (performance.now() - t0 < 400) requestAnimationFrame(frame); else done();
        };
        requestAnimationFrame(frame);
      });
      return max;
    });
    expect(peak).toBe(0);
    await expect(page.getByText('saved', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Slow save' }).click();
    const spinner = page.getByRole('status', { name: 'Saving' });
    await expect(spinner).toBeAttached();
    await expect(spinner).toHaveCSS('opacity', '1');
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`spinner-${colorway}`) });
    await expect(spinner).toBeHidden({ timeout: 4000 });
  });
}

test('turns at a constant speed', async ({ page }) => {
  await open(page, '/components/spinner', 'bone');
  const speeds = await page.getByRole('status', { name: 'Loading preview' }).evaluate(async (el) => {
    const arc = el.querySelector('.mu-spinner-arc')!;
    const angle = () => parseFloat(getComputedStyle(arc).rotate) || 0;
    const out: number[] = [];
    for (let i = 0; i < 5; i++) {
      const a = angle();
      const t = performance.now();
      await new Promise((r) => setTimeout(r, 120));
      out.push((((angle() - a) % 360) + 360) % 360 / (performance.now() - t));
    }
    return out;
  });
  // 360° in 900 ms is 0.4° a millisecond, every sample.
  for (const s of speeds) expect(s).toBeCloseTo(0.4, 1);
});

test('Reduce Motion: the arc stands still and breathes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/spinner', 'graphite');
  const arc = page.getByRole('status', { name: 'Loading preview' }).locator('.mu-spinner-arc');
  await expect(arc).toHaveCSS('animation-name', 'mu-progress-breathe');
  await expect(arc).toHaveCSS('rotate', 'none');
});
