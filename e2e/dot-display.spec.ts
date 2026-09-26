import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The Dot display Part on Parts › Dot display: square dots on one pitch in the px colours, a clock
// that steps six times a second, and a held frame under reduced motion.
for (const colorway of COLORWAYS) {
  test(`inks and scene in ${colorway}`, async ({ page }) => {
    await open(page, '/components/dot-display', colorway);
    const inks = page.getByTestId('dot-inks').locator('figure');
    await expect(inks).toHaveCount(9);
    // Each block's lit dots take its own px colour; the rest are unlit.
    const rain = page.locator('figure[data-colour="rain"] path');
    const styles = await rain.evaluateAll((els) => els.map((e) => e.getAttribute('style') ?? ''));
    expect(styles.map((st) => st.match(/--mu-px-[\w-]+/)?.[0])).toEqual(['--mu-px-off', '--mu-px-rain']);
    const [off, lit] = await rain.evaluateAll((els) => els.map((e) => getComputedStyle(e).fill));
    expect(off).not.toBe(lit);
    // Geometry comes from the recipe: 21 × 13 dots on an 8 pitch, masked to 6.
    const scene = page.getByTestId('dot-scene');
    const svg = scene.locator('svg');
    expect(await svg.evaluate((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height, getComputedStyle(e).maskSize]; })).toEqual([168, 104, '8px 8px, 8px 8px']);
    await page.getByTestId('dot-inks').screenshot({ path: capture(`dot-display-inks-${colorway}`) });
    await scene.screenshot({ path: capture(`dot-display-scene-${colorway}`) });
  });
}

test('the clock steps six times a second', async ({ page }) => {
  await open(page, '/components/dot-display', 'bone');
  const scene = page.getByTestId('dot-scene');
  await scene.scrollIntoViewIfNeeded();
  const a = Number(await scene.getAttribute('data-tick'));
  await page.waitForTimeout(1000);
  const b = Number(await scene.getAttribute('data-tick'));
  expect(b - a).toBeGreaterThanOrEqual(5);
  expect(b - a).toBeLessThanOrEqual(7);
});

test('reduced motion holds the frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/dot-display', 'bone');
  const scene = page.getByTestId('dot-scene');
  await scene.scrollIntoViewIfNeeded();
  const a = await scene.getAttribute('data-tick');
  await page.waitForTimeout(700);
  expect(await scene.getAttribute('data-tick')).toBe(a);
  // The picture is still there: a held frame, not a blank one.
  await expect(scene.locator('path[data-ink="3"]')).toHaveCount(1);
});
