import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Slider: a knob in a groove. The knob travels the groove minus itself, so at either end it sits
// flush inside the groove; the fill runs to the knob's centre, and marks and ticks share the same
// travel, so the knob, the fill's end and the matching tick line up at every value.

// The tuned slider (Tune it): 0 to 100, labelled ticks at every quarter, regular size by default.
const playground = (page: Page) => page.getByTestId('slider-tuner');
const knobInput = (page: Page) => playground(page).getByRole('slider').first();

/** The slider's geometry once it has come to rest: sampled every frame until the knob, the fill and the
 *  ticks have stood still for several frames running (never by waiting on animations, which a slow
 *  parallel run can start a frame late, and which a glyph's act or a looping part would hold open). */
async function geometry(root: Locator) {
  return root.evaluate(async (el) => {
    const read = () => {
      const box = (q: string) => el.querySelector(q)!.getBoundingClientRect();
      const groove = box('.mu-slider-track');
      const knob = box('.mu-slider-knob');
      const fill = box('.mu-slider-fill');
      const ticks = [...el.querySelectorAll('.mu-slider-ticks > span')].map((t) => {
        const r = t.getBoundingClientRect();
        return r.left + r.width / 2;
      });
      return { groove: { left: groove.left, right: groove.right }, knob: { left: knob.left, right: knob.right, centre: knob.left + knob.width / 2 }, fillEnd: fill.right, ticks };
    };
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const STILL = 6; // frames in a row with nothing moving
    let last = JSON.stringify(read());
    let still = 0;
    for (let i = 0; i < 600 && still < STILL; i++) {
      await frame();
      const now = JSON.stringify(read());
      still = now === last ? still + 1 : 0;
      last = now;
    }
    return JSON.parse(last) as ReturnType<typeof read>;
  });
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
    // (the tuned slider's ticks sit at every quarter: 0, 25, 50, 75, 100)
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
  await slider.scrollIntoViewIfNeeded();
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

// ── Readable scale and contrast ─────────────────────────────────────────────
// Colours come from the page's computed styles (what a person sees), never from the tokens file.

/** Contrast of the tick labels against what they sit on, and of the fill against the groove: the
 *  worst pair among every colour each is painted with (its colour and its gradient's stops). */
async function contrasts(slider: Locator) {
  return slider.evaluate((el) => {
    const rgbs = (s: string) => [...s.matchAll(/rgba?\(([^)]+)\)/g)].map((m) => m[1].split(/[ ,/]+/).filter(Boolean).map(Number)).filter((c) => (c[3] ?? 1) > 0.5);
    const lum = ([r, g, b]: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const worst = (a: number[][], b: number[][]) => Math.min(...a.flatMap((x) => b.map((y) => ratio(x, y))));
    /** The colours an element is painted with: its own, or the nearest painted ancestor's. */
    const paint = (from: Element | null): number[][] => {
      for (let e = from; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        const own = [...rgbs(cs.backgroundColor), ...rgbs(cs.backgroundImage)];
        if (own.length) return own;
      }
      return [[255, 255, 255]];
    };
    const labels = [...el.querySelectorAll('.mu-slider-ticks > span')].map((t) => {
      const cs = getComputedStyle(t);
      return { size: parseFloat(cs.fontSize), family: cs.fontFamily, contrast: worst(rgbs(cs.color), paint(el.parentElement)) };
    });
    return { labels, fillVsGroove: worst(paint(el.querySelector('.mu-slider-fill')), paint(el.querySelector('.mu-slider-track'))) };
  });
}

for (const colorway of COLORWAYS) {
  test(`labels read clearly and the fill stands out from the groove in ${colorway}`, async ({ page }) => {
    await open(page, '/components/slider', colorway);
    const read = await contrasts(playground(page).locator('.mu-slider').first());
    expect(read.labels.length).toBeGreaterThan(0);
    for (const l of read.labels) {
      expect(l.size).toBeGreaterThanOrEqual(11); // the meta type, not the 9 px engraving
      expect(l.family).not.toMatch(/mono/i);
      expect(l.contrast).toBeGreaterThanOrEqual(4.5); // WCAG AA for text
    }
    // The knob (its rim and shadow) carries the value; the fill backs it up, clearly apart from the
    // groove in both finishes (the old see-through green on bone was about 1.3:1).
    expect(read.fillVsGroove).toBeGreaterThanOrEqual(2);
    await playground(page).screenshot({ path: capture(`slider-scale-${colorway}`) });
  });
}

// ── More kinds ──────────────────────────────────────────────────────────────

/** Boxes of a slider's parts, read once nothing has moved for several frames. */
async function parts(slider: Locator) {
  return slider.evaluate(async (el) => {
    const read = () => {
      const r = (e: Element) => {
        const b = e.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, cx: b.left + b.width / 2, cy: b.top + b.height / 2 };
      };
      return {
        groove: r(el.querySelector('.mu-slider-track')!),
        fill: r(el.querySelector('.mu-slider-fill')!),
        knobs: [...el.querySelectorAll('.mu-slider-knob')].map(r),
        marks: [...el.querySelectorAll('.mu-slider-marks > i')].map(r),
        fillBackground: getComputedStyle(el.querySelector('.mu-slider-fill')!).backgroundImage,
      };
    };
    const frame = () => new Promise((f) => requestAnimationFrame(f));
    let last = JSON.stringify(read());
    for (let i = 0, still = 0; i < 600 && still < 6; i++) {
      await frame();
      const now = JSON.stringify(read());
      still = now === last ? still + 1 : 0;
      last = now;
    }
    return JSON.parse(last) as ReturnType<typeof read>;
  });
}

/** The first frame of the refusal the control plays after `key` goes down on its knob, or 'none'. */
async function refusal(slider: Locator, key: string) {
  return slider.locator('.mu-slider-control').evaluate((el, k) => {
    el.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    const a = el.getAnimations().find((x) => x.id === 'mu-refusal');
    return a ? String((a.effect as KeyframeEffect).getKeyframes()[0].transform) : 'none';
  }, key);
}

const kinds = (page: Page) => page.getByTestId('slider-kinds');
/** The .mu-slider that holds the knob named `name`. */
const sliderOf = (page: Page, name: string) => page.locator('.mu-slider').filter({ has: page.getByRole('slider', { name, exact: true }) });

for (const colorway of COLORWAYS) {
  test(`a range has two knobs, the fill between them, and they never cross in ${colorway}`, async ({ page }) => {
    await open(page, '/components/slider', colorway);
    const lower = page.getByRole('slider', { name: 'Price, minimum' });
    const upper = page.getByRole('slider', { name: 'Price, maximum' });
    const slider = sliderOf(page, 'Price, minimum');
    await expect(lower).toHaveAttribute('aria-valuenow', '40');
    await expect(upper).toHaveAttribute('aria-valuenow', '160');
    await expect(slider.locator('.mu-slider-value')).toContainText('$40–$160');
    let g = await parts(slider);
    expect(Math.abs(g.fill.left - g.knobs[0].cx)).toBeLessThanOrEqual(1);
    expect(Math.abs(g.fill.right - g.knobs[1].cx)).toBeLessThanOrEqual(1);
    // The lower knob pushed up stops at the upper one (Base UI pushes; it never passes).
    await lower.focus();
    await page.keyboard.press('End');
    await expect(lower).toHaveAttribute('aria-valuenow', '160');
    await expect(upper).toHaveAttribute('aria-valuenow', '160');
    // Both ends: the knobs sit flush inside the groove.
    await page.keyboard.press('Home');
    await upper.focus();
    await page.keyboard.press('End');
    await expect(lower).toHaveAttribute('aria-valuenow', '0');
    await expect(upper).toHaveAttribute('aria-valuenow', '200');
    g = await parts(slider);
    expect(g.knobs[0].left - g.groove.left).toBeGreaterThanOrEqual(-0.5);
    expect(g.knobs[0].left - g.groove.left).toBeLessThan(1);
    expect(g.groove.right - g.knobs[1].right).toBeGreaterThanOrEqual(-0.5);
    expect(g.groove.right - g.knobs[1].right).toBeLessThan(1);
    await kinds(page).screenshot({ path: capture(`slider-kinds-${colorway}`) });
  });
}

test('detents notch every step and the knob lands on them, keeping its spring while dragged', async ({ page }) => {
  await open(page, '/components/slider', 'bone');
  const knob = page.getByRole('slider', { name: 'Grid size' });
  const slider = sliderOf(page, 'Grid size');
  let g = await parts(slider);
  expect(g.marks.length).toBe(4); // six stops: four inside, the ends are the groove's
  await knob.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('ArrowRight');
    await expect(knob).toHaveAttribute('aria-valuenow', String(i + 1));
    g = await parts(slider);
    expect(Math.abs(g.knobs[0].cx - g.marks[i].cx)).toBeLessThanOrEqual(1);
  }
  // A drag keeps the spring: the knob's transition stays on while dragging (a plain slider's goes off).
  await slider.scrollIntoViewIfNeeded();
  const box = (await slider.locator('.mu-slider-knob').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 40, box.y + box.height / 2, { steps: 4 });
  await expect(slider).toHaveAttribute('data-dragging', '');
  const during = await slider.locator('.mu-slider-knob').evaluate((el) => getComputedStyle(el).transitionDuration);
  await page.mouse.up();
  expect(during.split(',').some((d) => parseFloat(d) > 0)).toBe(true);
});

test('a centred slider fills from its origin, either way', async ({ page }) => {
  await open(page, '/components/slider', 'bone');
  const knob = page.getByRole('slider', { name: 'Balance' });
  const slider = sliderOf(page, 'Balance');
  let g = await parts(slider);
  const origin = g.marks[0].cx; // the origin's notch, in the middle
  expect(Math.abs(origin - (g.groove.left + g.groove.right) / 2)).toBeLessThanOrEqual(1);
  // Left of centre (−20): the fill runs from the knob to the origin.
  expect(Math.abs(g.fill.left - g.knobs[0].cx)).toBeLessThanOrEqual(1);
  expect(Math.abs(g.fill.right - origin)).toBeLessThanOrEqual(1);
  await knob.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowRight');
  await expect(knob).toHaveAttribute('aria-valuenow', '30');
  await expect(slider.locator('.mu-slider-value')).toContainText('R30');
  g = await parts(slider);
  expect(Math.abs(g.fill.left - origin)).toBeLessThanOrEqual(1);
  expect(Math.abs(g.fill.right - g.knobs[0].cx)).toBeLessThanOrEqual(1);
});

for (const colorway of COLORWAYS) {
  test(`the ink tone is not the green, and stands clear of the groove in ${colorway}`, async ({ page }) => {
    await open(page, '/components/slider', colorway);
    const ink = await parts(sliderOf(page, 'Position'));
    const green = await parts(sliderOf(page, 'Opacity'));
    expect(ink.fillBackground).not.toBe(green.fillBackground);
    const read = await contrasts(sliderOf(page, 'Position'));
    expect(read.fillVsGroove).toBeGreaterThanOrEqual(3);
  });
}

test('the bubble stands over the knob being dragged, and only while it is dragged', async ({ page }) => {
  await open(page, '/components/slider', 'bone');
  const slider = sliderOf(page, 'Opacity');
  const bubble = slider.locator('.mu-slider-bubble');
  await slider.scrollIntoViewIfNeeded();
  await expect(bubble).toHaveCSS('opacity', '0');
  const knob = slider.locator('.mu-slider-knob');
  const box = (await knob.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 50, box.y + box.height / 2, { steps: 5 });
  await expect(bubble).toHaveCSS('opacity', '1');
  const value = await page.getByRole('slider', { name: 'Opacity' }).getAttribute('aria-valuenow');
  await expect(bubble).toHaveText(`${value}%`);
  const [b, k] = [(await bubble.boundingBox())!, (await knob.boundingBox())!];
  expect(b.y + b.height).toBeLessThanOrEqual(k.y); // over the knob
  expect(Math.abs(b.x + b.width / 2 - (k.x + k.width / 2))).toBeLessThanOrEqual(1);
  await page.mouse.up();
  await expect(bubble).toHaveCSS('opacity', '0');
});

for (const colorway of COLORWAYS) {
  test(`a vertical slider rises from the bottom and keeps its knob in the groove in ${colorway}`, async ({ page }) => {
    if (colorway === 'graphite') await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/components/slider', colorway);
    const knob = page.getByRole('slider', { name: 'Voice' });
    const slider = sliderOf(page, 'Voice');
    await expect(knob).toHaveAttribute('aria-orientation', 'vertical');
    await knob.focus();
    await page.keyboard.press('ArrowUp');
    await expect(knob).toHaveAttribute('aria-valuenow', '71');
    await page.keyboard.press('Home');
    await expect(knob).toHaveAttribute('aria-valuenow', '0');
    let g = await parts(slider);
    expect(Math.abs(g.knobs[0].bottom - g.groove.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(g.fill.bottom - g.groove.bottom)).toBeLessThanOrEqual(1);
    await page.keyboard.press('End');
    await expect(knob).toHaveAttribute('aria-valuenow', '100');
    g = await parts(slider);
    expect(g.knobs[0].top).toBeGreaterThanOrEqual(g.groove.top - 0.5);
    expect(g.knobs[0].top - g.groove.top).toBeLessThan(1);
    expect(Math.abs(g.fill.top - g.knobs[0].cy)).toBeLessThanOrEqual(1);
    // Pushed past the top it refuses upward (nothing moves under Reduce Motion).
    const nudge = await refusal(slider, 'ArrowUp');
    if (colorway === 'graphite') expect(nudge).toBe('none');
    else expect(nudge).toMatch(/translateY\(-/);
    await page.getByTestId('slider-faders').screenshot({ path: capture(`slider-vertical-${colorway}`) });
  });
}

test('right to left, the slider mirrors, ← raises it, and a push past the end nudges left', async ({ page }) => {
  await open(page, '/components/slider', 'bone');
  const knob = page.getByRole('slider', { name: 'Brightness, right to left' });
  const slider = sliderOf(page, 'Brightness, right to left');
  await knob.focus();
  await page.keyboard.press('Home');
  await expect(knob).toHaveAttribute('aria-valuenow', '0');
  let g = await parts(slider);
  expect(Math.abs(g.knobs[0].right - g.groove.right)).toBeLessThanOrEqual(1); // the minimum is on the right
  expect(Math.abs(g.fill.right - g.groove.right)).toBeLessThanOrEqual(1);
  await page.keyboard.press('ArrowLeft');
  await expect(knob).toHaveAttribute('aria-valuenow', '1');
  await page.keyboard.press('End');
  await expect(knob).toHaveAttribute('aria-valuenow', '100');
  g = await parts(slider);
  expect(Math.abs(g.knobs[0].left - g.groove.left)).toBeLessThanOrEqual(1);
  expect(await refusal(slider, 'ArrowLeft')).toMatch(/translateX\(-/);
  await page.getByTestId('slider-rtl').screenshot({ path: capture('slider-rtl-bone') });
});
