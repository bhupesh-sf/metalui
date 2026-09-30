import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Link: always underlined; hover darkens the line; an external link says it opens a new tab and its
// arrow nudges toward where it goes.
const play = (page: import('@playwright/test').Page) => page.getByLabel('Example paragraph');

for (const colorway of COLORWAYS) {
  test(`underlined at rest, darker on hover, external marked, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/link', colorway);
    const guide = play(page).getByRole('link', { name: 'the export guide' });
    await expect(guide).toHaveCSS('text-decoration-line', 'underline');
    const rest = await guide.evaluate((el) => getComputedStyle(el).textDecorationColor);
    await guide.hover();
    await expect.poll(() => guide.evaluate((el) => getComputedStyle(el).textDecorationColor)).not.toBe(rest);
    await expect.poll(() => guide.evaluate((el) => getComputedStyle(el).textDecorationColor === getComputedStyle(el).color)).toBe(true);

    const out = play(page).getByRole('link', { name: /links stay visible without colour \(opens in a new tab\)/ });
    await expect(out).toHaveAttribute('target', '_blank');
    await expect(out).toHaveAttribute('rel', 'noopener noreferrer');
    await out.focus();
    await expect(out).toHaveCSS('outline-style', 'solid');
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`link-${colorway}`) });
  });
}

test('the external arrow nudges up and out on hover; not under Reduce Motion', async ({ page }) => {
  await open(page, '/components/link', 'bone');
  const arrow = play(page).locator('.mu-link-out');
  await play(page).getByRole('link', { name: /links stay visible/ }).hover();
  await expect.poll(() => arrow.evaluate((el) => getComputedStyle(el).translate)).toBe('2px -2px');
  await page.mouse.move(0, 0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => arrow.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(0.001);
});
