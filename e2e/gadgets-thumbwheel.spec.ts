import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The thumbwheel, a slab gadget drawn from its spec: a wheel of ticks in a slot under an engraved NOW,
// rolled back a tick a day, amber off now and breathing more than a week back.
const strip = (svg: import('@playwright/test').Locator) => svg.evaluate((e) => Number(e.querySelector('[data-part="drum.strip"]')!.getAttribute('transform')!.match(/translate\(0 ([-\d.]+)\)/)![1]));

for (const colorway of COLORWAYS) {
  test(`the thumbwheel in ${colorway}`, async ({ page }) => {
    await open(page, '/gadgets/thumbwheel', colorway);
    const states = page.getByTestId('wheel-states').locator('svg[data-gadget="thumbwheel"]');
    await expect(states).toHaveCount(3);
    expect(await states.evaluateAll((els) => els.map((e) => e.getAttribute('data-state')))).toEqual(['rest', 'past', 'far']);
    expect(await states.evaluateAll((els) => els.map((e) => [e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'), e.querySelector('[data-part="lamp"]')!.getAttribute('data-gesture')]))).toEqual([['off', 'steady'], ['waiting', 'steady'], ['waiting', 'breathe']]);
    // An engraved NOW, a wheel of ticks in its slot.
    await expect(states.first().locator('[data-part="label"] text').last()).toHaveText('NOW');
    await expect(states.first().locator('[data-cut="tray"]')).toHaveCount(1);
    expect(await states.first().evaluate((e) => e.querySelector('[data-part="drum.strip"] text')!.textContent)).toBe('–');
    await expect(states.nth(1).locator('desc')).toHaveText('When, in the past');
    await page.getByTestId('wheel-states').screenshot({ path: capture(`gadget-thumbwheel-${colorway}`) });
  });
}

test('rolling the wheel back turns it a tick a day and stops hard at now', async ({ page }) => {
  await open(page, '/gadgets/thumbwheel', 'bone');
  const wheel = page.getByTestId('wheel'), point = page.getByTestId('wheel-point');
  await point.scrollIntoViewIfNeeded();
  await point.focus();
  const at0 = await strip(wheel);
  await page.keyboard.press('ArrowDown');
  await expect(point).toHaveAttribute('aria-valuetext', '1 day ago');
  await expect(wheel).toHaveAttribute('data-state', 'past');
  // One day is one tick: the strip moves by a pitch, and settles there.
  await expect.poll(async () => Math.abs((await strip(wheel)) - at0), { timeout: 2000 }).toBeGreaterThan(40);
  await page.keyboard.press('PageDown');
  await expect(wheel).toHaveAttribute('data-state', 'far');
  await expect(wheel.locator('[data-part="lamp"]')).toHaveAttribute('data-gesture', 'breathe');
  // Past now is a stop: up from now stays now.
  await page.getByRole('button', { name: 'Back to now' }).click();
  await point.focus();
  await page.keyboard.press('ArrowUp');
  await expect(point).toHaveAttribute('aria-valuenow', '0');
  await expect(wheel).toHaveAttribute('data-state', 'rest');
});

test('with reduced motion it goes straight to the day; the flat tier has no filters; the server string is in the past', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/gadgets/thumbwheel', 'graphite');
  const wheel = page.getByTestId('wheel');
  const at0 = await strip(wheel);
  await page.getByTestId('wheel-point').focus();
  await page.keyboard.press('ArrowDown');
  expect(await strip(wheel)).not.toBe(at0);
  const tiers = page.getByTestId('wheel-tiers').locator('svg[data-gadget]');
  expect(await tiers.evaluateAll((els) => els.map((e) => e.getAttribute('data-tier')))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(await tiers.nth(3).evaluate((e) => e.querySelectorAll('filter').length)).toBe(0);
  await expect(page.getByTestId('wheel-static').locator('svg')).toHaveAttribute('data-state', 'past');
});
