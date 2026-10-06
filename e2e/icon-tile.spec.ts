import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Icon tile: a mark beside words. Hidden and never focusable; sunk by default (an inset shadow); the
// field ladder plus hero; its lamp sits on the top-right rim, steady on first paint and flickering once
// per later change. Reduce Motion: the lamp changes at once.
const run = (page: Page) => page.getByTestId('icon-tile-run');
const lamp = (page: Page) => run(page).locator('.mu-led');
const animations = (page: Page) => lamp(page).evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName));
const next = (page: Page) => page.getByTestId('icon-tile-states').getByRole('button', { name: 'Next state' }).click();

for (const colorway of COLORWAYS) {
  test(`tiles mark rows, sit on the field ladder and seat their lamp on the rim in ${colorway}`, async ({ page }) => {
    await open(page, '/components/icon-tile', colorway);
    const hero = page.getByTestId('icon-tile-hero');
    const first = hero.locator('.mu-icon-tile').first();
    // Decorative: hidden, no role, not focusable; the row's words name it.
    expect(await first.evaluate((el) => [el.tagName, el.getAttribute('aria-hidden'), el.getAttribute('role'), el.tabIndex])).toEqual(['SPAN', 'true', null, -1]);
    // Sunk by default: the well's inset shade.
    expect(await first.evaluate((el) => getComputedStyle(el).boxShadow)).toContain('inset');
    // Characters: uppercase engraved mono.
    await expect(hero.locator('.mu-icon-tile', { hasText: 'AC' })).toHaveCSS('text-transform', 'uppercase');
    await hero.screenshot({ path: capture(`icon-tile-hero-${colorway}`) });

    // The field ladder, and hero.
    const sides = await page.getByTestId('icon-tile-sizes').locator('.mu-icon-tile').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    expect(sides).toEqual([28, 32, 44, 56, 28, 32, 44, 56]);
    // Raised: no inset shade on top.
    const raised = page.getByTestId('icon-tile-sizes').locator('.mu-icon-tile[data-look="raised"]').first();
    expect(await raised.evaluate((el) => getComputedStyle(el).boxShadow.startsWith('inset'))).toBe(false);
    await page.getByTestId('icon-tile-sizes').screenshot({ path: capture(`icon-tile-sizes-${colorway}`) });

    // The lamp sits on the top-right rim: its centre past the tile's corner.
    const failed = hero.locator('.mu-icon-tile[data-led="failed"]');
    const [tile, led] = await Promise.all([failed.boundingBox(), failed.locator('.mu-led').boundingBox()]);
    expect(tile && led).toBeTruthy();
    if (tile && led) {
      expect(led.x + led.width / 2).toBeGreaterThan(tile.x + tile.width - 4);
      expect(led.y + led.height / 2).toBeLessThan(tile.y + 4);
    }

    await page.getByTestId('icon-tile-uses').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('icon-tile-empty').locator('.mu-icon-tile')).toHaveAttribute('data-size', 'hero');
    await page.getByTestId('icon-tile-uses').screenshot({ path: capture(`icon-tile-uses-${colorway}`) });
    // Round is a circle, not the square's radius.
    const round = page.getByTestId('icon-tile-round').locator('.mu-icon-tile');
    expect(await round.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius) >= el.getBoundingClientRect().width / 2)).toBe(true);
    await page.getByTestId('icon-tile-round').screenshot({ path: capture(`icon-tile-round-${colorway}`) });
  });

  test(`a changed lamp flickers once, only on the row that changed, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/icon-tile', colorway);
    await page.getByTestId('icon-tile-states').scrollIntoViewIfNeeded();
    // First paint: steady.
    await expect(lamp(page)).toHaveAttribute('data-gesture', 'steady');
    expect(await animations(page)).toEqual([]);
    await next(page);
    await expect(lamp(page)).toHaveAttribute('data-kind', 'waiting');
    expect(await animations(page)).toEqual(['mu-led-flicker']);
    expect(await page.getByTestId('icon-tile-states').locator('.mu-led').evaluateAll((els) => els.slice(1).flatMap((el) => el.getAnimations()).length)).toBe(0);
    // The words say it too.
    await expect(page.getByTestId('icon-tile-states').getByText('Syncing')).toBeVisible();
    await next(page);
    await expect(lamp(page)).toHaveAttribute('data-kind', 'failed');
    expect(await animations(page)).toEqual(['mu-led-flicker']);
    // Once: it finishes and settles lit, nothing left running.
    await expect.poll(() => lamp(page).evaluate((el) => el.getAnimations().map((a) => a.playState)), { timeout: 3000 }).toEqual(['finished']);
    await page.getByTestId('icon-tile-states').screenshot({ path: capture(`icon-tile-states-${colorway}`) });
  });
}

test('Reduce Motion: the lamp changes at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/icon-tile', 'bone');
  await next(page);
  await expect(lamp(page)).toHaveAttribute('data-kind', 'waiting');
  expect(await animations(page)).toEqual([]);
});
