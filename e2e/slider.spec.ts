import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Slider: a knob in a groove. The knob travels the groove minus itself, so at either end it sits
// flush inside the groove; the fill runs to the knob's centre, and marks and ticks share the same
// travel, so the knob, the fill's end and the matching tick line up at every value.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const knobInput = (page: Page) => playground(page).getByRole('slider').first();

/** The playground slider's geometry once it has come to rest. */
async function geometry(root: Locator) {
  const read = () => root.evaluate((el) => {
    const box = (q: string) => el.querySelector(q)!.getBoundingClientRect();
    const groove = box('.mu-slider-track');
    const knob = box('.mu-slider-knob');
    const fill = box('.mu-slider-fill');
    const ticks = [...el.querySelectorAll('.mu-slider-ticks > span')].map((t) => {
      const r = t.getBoundingClientRect();
      return r.left + r.width / 2;
    });
    return { groove: { left: groove.left, right: groove.right }, knob: { left: knob.left, right: knob.right, centre: knob.left + knob.width / 2 }, fillEnd: fill.right, ticks };
  });
  // at rest: a couple of frames for the change to land, then every running transition finished
  await root.evaluate(async (el) => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
  });
  return read();
}

for (const colorway of COLORWAYS) {
  test(`the knob stays inside the groove and lines up with the fill and its tick in ${colorway}`, async ({ page }) => {
    if (colorway === 'graphite') await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/components/slider', colorway);
    const slider = playground(page).locator('.mu-slider').first();
    const input = knobInput(page);
    await input.focus();

    // At the ends: the knob's box is inside the groove's box, flush with the end.
    await page.keyboard.press('Home');
    await expect(input).toHaveAttribute('aria-valuenow', '0');
    let g = await geometry(slider);
    expect(g.knob.left).toBeGreaterThanOrEqual(g.groove.left - 0.5);
    expect(g.knob.left - g.groove.left).toBeLessThan(1);
    expect(Math.abs(g.knob.centre - g.fillEnd)).toBeLessThanOrEqual(1);
    expect(Math.abs(g.knob.centre - g.ticks[0])).toBeLessThanOrEqual(1);

    await page.keyboard.press('End');
    await expect(input).toHaveAttribute('aria-valuenow', '100');
    g = await geometry(slider);
    expect(g.knob.right).toBeLessThanOrEqual(g.groove.right + 0.5);
    expect(g.groove.right - g.knob.right).toBeLessThan(1);
    expect(Math.abs(g.knob.centre - g.fillEnd)).toBeLessThanOrEqual(1);
    expect(Math.abs(g.knob.centre - g.ticks.at(-1)!)).toBeLessThanOrEqual(1);

    // In between: each labelled tick sits where the knob's centre and the fill's end land.
    // (the playground's ticks sit at every quarter: 0, 25, 50, 75, 100)
    await page.keyboard.press('Home');
    for (let i = 1; i < g.ticks.length - 1; i++) {
      for (let k = 0; k < 100 / (g.ticks.length - 1); k++) await page.keyboard.press('ArrowRight');
      await expect(input).toHaveAttribute('aria-valuenow', String((i * 100) / (g.ticks.length - 1)));
      const now = await geometry(slider);
      expect(Math.abs(now.knob.centre - now.fillEnd)).toBeLessThanOrEqual(1);
      expect(Math.abs(now.knob.centre - now.ticks[i])).toBeLessThanOrEqual(1);
    }
    await page.keyboard.press('End');
    await geometry(slider);
    await playground(page).screenshot({ path: capture(`slider-bounds-${colorway}`) });
  });
}

test('a jump to an end rides the spring but never carries the knob past the groove', async ({ page }) => {
  await open(page, '/components/slider', 'bone');
  const slider = playground(page).locator('.mu-slider').first();
  await knobInput(page).focus();
  await page.keyboard.press('Home');
  await geometry(slider);
  const frames = await slider.evaluate(async (el) => {
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    const out: { over: number; moving: boolean }[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => {
        const g = el.querySelector('.mu-slider-track')!.getBoundingClientRect();
        const k = el.querySelector('.mu-slider-knob')!.getBoundingClientRect();
        out.push({ over: k.right - g.right, moving: el.getAnimations({ subtree: true }).length > 0 });
        if (performance.now() - t0 < 900) requestAnimationFrame(frame); else done();
      };
      requestAnimationFrame(frame);
    });
    return out;
  });
  expect(frames.some((f) => f.moving)).toBe(true); // it rode the spring
  expect(Math.max(...frames.map((f) => f.over))).toBeLessThanOrEqual(0.5); // and stopped flush
});

test('a drag keeps the knob centred under the pointer and inside the groove', async ({ page }) => {
  await open(page, '/components/slider', 'bone');
  const slider = playground(page).locator('.mu-slider').first();
  const g0 = await geometry(slider);
  const knob = playground(page).locator('.mu-slider-knob').first();
  const box = (await knob.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // Past the far end: the knob stops flush with the groove's end.
  await page.mouse.move(g0.groove.right + 60, box.y + box.height / 2, { steps: 8 });
  await expect(knobInput(page)).toHaveAttribute('aria-valuenow', '100');
  let g = await geometry(slider);
  expect(g.knob.right).toBeLessThanOrEqual(g.groove.right + 0.5);
  // Back to a point on the travel: the knob's centre is under the pointer.
  const x = g.groove.left + (g.groove.right - g.groove.left) * 0.4;
  await page.mouse.move(x, box.y + box.height / 2, { steps: 8 });
  g = await geometry(slider);
  // within half a step (a step is 1 of 100 on the travel)
  const halfStep = (g.groove.right - g.groove.left - (g.knob.right - g.knob.left)) / 100 / 2;
  expect(Math.abs(g.knob.centre - x)).toBeLessThanOrEqual(halfStep + 0.5);
  await page.mouse.up();
});
