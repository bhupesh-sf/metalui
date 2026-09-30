import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Slider API: glyphs at the ends (each plays its act as the value arrives there), three sizes that
// set the groove and knob together from the recipe, full width by default or a set width, and a
// value readout on the drum that never moves the groove.

const section = (page: Page, id: string) => page.locator(`section#${id}, section:has(#${id})`).first();
const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const box = async (l: Locator) => (await l.boundingBox())!;

/** A recipe number, as the page resolves it (px). */
const recipe = (page: Page, name: string) => page.evaluate((n) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)), name);

test('zoom: glyphs flank the groove and the value sits beside it', async ({ page }) => {
  await open(page, '/components/slider', 'bone');
  const slider = playground(page).locator('.mu-slider').first();
  const [start, groove, end, value] = await Promise.all([
    box(slider.locator('.mu-slider-icon').first()),
    box(slider.locator('.mu-slider-track')),
    box(slider.locator('.mu-slider-icon').last()),
    box(slider.locator('.mu-slider-value')),
  ]);
  expect(start.x + start.width).toBeLessThanOrEqual(groove.x);
  expect(groove.x + groove.width).toBeLessThanOrEqual(end.x);
  expect(end.x + end.width).toBeLessThanOrEqual(value.x);
  // the glyphs are the recipe's size, centred on the groove
  const glyph = await recipe(page, '--mu-r-slider-regular-glyph');
  expect(Math.abs(start.width - glyph)).toBeLessThan(0.5);
  expect(Math.abs(start.y + start.height / 2 - (groove.y + groove.height / 2))).toBeLessThanOrEqual(1);
  await expect(slider.locator('.mu-slider-value')).toHaveText(/100%/);
  await expect(playground(page).getByRole('slider', { name: 'Zoom' })).toHaveAttribute('aria-valuetext', '100%');
});

test('the readout turns on the drum and the groove never moves under it', async ({ page }) => {
  await open(page, '/components/slider', 'bone');
  const slider = playground(page).locator('.mu-slider').first();
  const input = playground(page).getByRole('slider', { name: 'Zoom' });
  await input.focus();
  await page.keyboard.press('Home'); // 25%: the narrowest value
  const narrow = await box(slider.locator('.mu-slider-track'));
  // a change: the outgoing and incoming faces are both on the drum for a moment
  const faces = await slider.evaluate(async (el) => {
    el.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return el.querySelectorAll('.mu-slider-value .mu-swap-layer').length;
  });
  expect(faces).toBeGreaterThanOrEqual(2);
  await expect(slider.locator('.mu-slider-value')).toHaveText(/200%/);
  const wide = await box(slider.locator('.mu-slider-track'));
  expect(Math.abs(wide.x - narrow.x)).toBeLessThan(0.5);
  expect(Math.abs(wide.width - narrow.width)).toBeLessThan(0.5);
});

test('each glyph plays its act as the value arrives at its end, not before', async ({ page }) => {
  await open(page, '/components/slider', 'bone');
  const slider = playground(page).locator('.mu-slider').first();
  const startSvg = slider.locator('.mu-slider-icon').first().locator('svg');
  const endSvg = slider.locator('.mu-slider-icon').last().locator('svg');
  const input = playground(page).getByRole('slider', { name: 'Zoom' });
  await input.focus();
  await page.keyboard.press('ArrowRight');
  await expect(endSvg).not.toHaveAttribute('data-playing', '');
  await page.keyboard.press('End');
  await expect(endSvg).toHaveAttribute('data-playing', '');
  await expect(startSvg).not.toHaveAttribute('data-playing', '');
  await page.keyboard.press('Home');
  await expect(startSvg).toHaveAttribute('data-playing', '');
});

test('sizes set the groove and the knob together, from the recipe', async ({ page }) => {
  await open(page, '/components/slider', 'bone');
  for (const size of ['compact', 'regular', 'large']) {
    const slider = section(page, 'sizes').locator(`.mu-slider[data-size="${size}"]`);
    const groove = await box(slider.locator('.mu-slider-track'));
    const knob = await box(slider.locator('.mu-slider-knob'));
    expect(groove.height).toBeCloseTo(await recipe(page, `--mu-r-slider-${size}-track`), 1);
    expect(knob.width).toBeCloseTo(await recipe(page, `--mu-r-slider-${size}-knob`), 1);
    expect(Math.abs(knob.y + knob.height / 2 - (groove.y + groove.height / 2))).toBeLessThanOrEqual(0.5);
  }
});

test('full width by default; a set width is kept', async ({ page }) => {
  await open(page, '/components/slider', 'bone');
  const full = section(page, 'width').getByRole('slider', { name: 'Volume, full width' });
  const fixed = section(page, 'width').getByRole('slider', { name: 'Volume, 200 wide' });
  const fullRoot = section(page, 'width').locator('.mu-slider').first();
  const cell = await fullRoot.evaluate((el) => el.parentElement!.getBoundingClientRect().right - el.getBoundingClientRect().left);
  expect(Math.abs((await box(fullRoot)).width - cell)).toBeLessThan(1); // it runs to the end of its cell
  expect((await box(section(page, 'width').locator('.mu-slider').last())).width).toBeCloseTo(200, 0);
  await expect(full).toHaveCount(1);
  await expect(fixed).toHaveCount(1);
});

for (const colorway of COLORWAYS) {
  test(`sizes, scale and width read clearly in ${colorway}`, async ({ page }) => {
    await open(page, '/components/slider', colorway);
    await playground(page).locator('.stage').first().screenshot({ path: capture(`slider-zoom-${colorway}`) });
    await section(page, 'sizes').screenshot({ path: capture(`slider-sizes-${colorway}`) });
    await section(page, 'scale').screenshot({ path: capture(`slider-scale-marks-${colorway}`) });
  });
}

test('at 375 px wide the slider fits with no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page, '/components/slider', 'graphite');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const slider = playground(page).locator('.mu-slider').first();
  const groove = await box(slider.locator('.mu-slider-track'));
  expect(groove.width).toBeGreaterThan(120);
});
