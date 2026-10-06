import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Rating: detents, not stars. Read-only is one image with the whole sentence; a decimal fills that share
// of its detent. Editable is a radio group: hover ghosts what a press would change and the readout says
// it; a press latches; pressing the chosen one again (or Backspace) clears; arrows move and choose; a
// change sweeps from the old edge (the meter's stagger); Reduce Motion changes every detent at once.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const lamps = (scope: Locator) => scope.locator('.mu-rating-detent');
/** Each detent as l (lit), g (ghost) or . (off). */
const looks = (scope: Locator) => lamps(scope).evaluateAll((els) =>
  els.map((d) => ((d as HTMLElement).dataset.lit !== undefined ? 'l' : (d as HTMLElement).dataset.ghost !== undefined ? 'g' : '.')).join(''));

for (const colorway of COLORWAYS) {
  test(`a review: read the average, rate, change your mind, clear in ${colorway}`, async ({ page }) => {
    await open(page, '/components/rating', colorway);
    const section = playground(page);
    const average = section.getByRole('img', { name: /^Average/ });
    await expect(average).toHaveAccessibleName('Average, 4.3 out of 5, 1,284 ratings');
    await expect(average).toContainText('4.3');
    await expect(average).toContainText('(1,284)');
    // 4.3: four lit, the fifth cut at 30 %.
    expect(await looks(average)).toBe('lllll');
    expect(await lamps(average).nth(4).locator('.mu-rating-lamp').evaluate((l) => getComputedStyle(l).clipPath)).toMatch(/inset\(0px 70% 0px 0px\)|inset\(0px 70%/);

    const mine = section.getByRole('radiogroup', { name: 'Your rating' });
    const yours = mine.locator('..');
    await expect(yours).toContainText('Not rated');
    // Hover the fourth: the four a press would light are ghosts, and the readout says the word.
    await mine.getByRole('radio', { name: '4 of 5, Very good' }).hover();
    expect(await looks(mine)).toBe('gggg.');
    await expect(yours).toContainText('Very good');
    await mine.getByRole('radio', { name: '4 of 5, Very good' }).click();
    await expect(mine.getByRole('radio', { name: '4 of 5, Very good' })).toBeChecked();
    expect(await looks(mine)).toBe('llll.');
    await expect(average).toHaveAccessibleName(/1,285 ratings/);

    // Over the second: the two it would put out are ghosts.
    await mine.getByRole('radio', { name: /^2 of 5/ }).hover();
    expect(await looks(mine)).toBe('llgg.');
    await expect(yours).toContainText('Fair');
    await page.mouse.move(0, 0);
    // The drum has settled on the word (its footprint grows on the settle spring).
    await expect(yours.locator('.mu-swap-layer')).toHaveCount(1);
    await page.waitForTimeout(500);
    await section.screenshot({ path: capture(`rating-${colorway}`) });

    // Pressing the chosen one again clears it.
    await mine.getByRole('radio', { name: /^4 of 5/ }).hover();
    expect(await looks(mine)).toBe('gggg.');
    await expect(yours).toContainText('Not rated');
    await mine.getByRole('radio', { name: /^4 of 5/ }).click();
    await expect(mine.getByRole('radio', { checked: true })).toHaveCount(0);
    expect(await looks(mine)).toBe('.....');
    await expect(yours).toContainText('Not rated');
    await expect(average).toHaveAccessibleName(/1,284 ratings/);
  });
}

test('keys: arrows move and choose, Backspace clears, one Tab stop', async ({ page }) => {
  await open(page, '/components/rating', 'bone');
  const mine = playground(page).getByRole('radiogroup', { name: 'Your rating' });
  await mine.getByRole('radio', { name: /^3 of 5/ }).click();
  await page.mouse.move(0, 0);
  await page.keyboard.press('ArrowRight');
  await expect(mine.getByRole('radio', { name: /^4 of 5/ })).toBeChecked();
  await expect(mine.getByRole('radio', { name: /^4 of 5/ })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(mine.getByRole('radio', { name: /^2 of 5/ })).toBeChecked();
  await page.keyboard.press('Backspace');
  await expect(mine.getByRole('radio', { checked: true })).toHaveCount(0);
  expect(await looks(mine)).toBe('.....');
  // One Tab stop for the whole group.
  expect(await mine.getByRole('radio').evaluateAll((els) => els.filter((e) => e.getAttribute('tabindex') === '0').length)).toBe(1);
});

test('a change sweeps from the old edge, one detent at a time', async ({ page }) => {
  await open(page, '/components/rating', 'graphite');
  const row = page.getByRole('radiogroup', { name: 'Rate Fado do mar' });
  await row.getByRole('radio', { name: /^4 of 5/ }).focus();
  // 4 → none: the run drains downward from its edge.
  await page.keyboard.press('Delete');
  const delays = await lamps(row).locator('.mu-rating-lamp').evaluateAll((els) => els.map((l) => parseFloat(getComputedStyle(l).transitionDelay) * 1000));
  expect(delays.slice(0, 4).map(Math.round)).toEqual([48, 32, 16, 0]);
  await page.locator('#list').screenshot({ path: capture('rating-list-graphite') });
});

test('sizes and states', async ({ page }) => {
  await open(page, '/components/rating', 'bone');
  const heights = await page.locator('#sizes .mu-rating-cell').evaluateAll((els) => [...new Set(els.map((e) => e.getBoundingClientRect().height))]);
  expect(heights).toEqual([28, 32, 44]);
  const states = page.locator('#states');
  await expect(states.getByRole('img', { name: 'Average, Not rated' })).toBeVisible();
  await expect(states.getByRole('radio').first()).toBeDisabled();
  await states.screenshot({ path: capture('rating-states-bone') });
});

test('Reduce Motion: every detent changes at once and does not dip', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/rating', 'graphite');
  const row = page.getByRole('radiogroup', { name: 'Rate Fado do mar' });
  await row.getByRole('radio', { name: /^4 of 5/ }).focus();
  await page.keyboard.press('Delete');
  const delays = await lamps(row).locator('.mu-rating-lamp').evaluateAll((els) => els.map((l) => getComputedStyle(l).transitionDelay));
  expect(new Set(delays)).toEqual(new Set(['0s']));
  const dip = await lamps(row).first().evaluate((d) => getComputedStyle(d).transitionDuration);
  expect(parseFloat(dip)).toBeLessThan(0.001);
});
