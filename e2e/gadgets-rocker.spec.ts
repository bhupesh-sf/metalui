import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The rocker, a slab gadget drawn from its spec: a rocker Cap in a well that the switch rocks from
// O (off) to I (on) on the hinge spring, the half facing the light brightening, the lamp agreeing.
const tilt = (svg: import('@playwright/test').Locator) => svg.evaluate((e) => Number(e.querySelector('[data-part="cap"][data-shape="rocker"]')!.getAttribute('data-tilt')));
const lit = (svg: import('@playwright/test').Locator, half: string) => svg.evaluate((e, h) => Number(e.querySelector(`[data-rocker="${h}"]`)!.getAttribute('opacity')), half);

for (const colorway of COLORWAYS) {
  test(`the rocker in ${colorway}`, async ({ page }) => {
    await open(page, '/gadgets/rocker', colorway);
    const states = page.getByTestId('rocker-states').locator('svg[data-gadget="rocker"]');
    await expect(states).toHaveCount(2);
    expect(await states.evaluateAll((els) => els.map((e) => e.getAttribute('data-state')))).toEqual(['rest', 'on']);
    expect(await Promise.all([0, 1].map((i) => tilt(states.nth(i))))).toEqual([-1, 1]);
    // Off, the lower half faces the light; on, the upper half.
    expect(await lit(states.nth(0), 'bottom-lit')).toBeGreaterThan(0);
    expect(await lit(states.nth(0), 'top-lit')).toBe(0);
    expect(await lit(states.nth(1), 'top-lit')).toBeGreaterThan(0);
    expect(await states.evaluateAll((els) => els.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp')))).toEqual(['off', 'live']);
    // Sunk in a well, not a slot.
    await expect(states.first().locator('[data-cut="well"]')).toHaveCount(1);
    await expect(states.first().locator('[data-cut="slot"]')).toHaveCount(0);
    await expect(states.nth(1).locator('desc')).toHaveText('Sound, on');
    await page.getByTestId('rocker-states').screenshot({ path: capture(`gadget-rocker-${colorway}`) });
  });
}

test('pressing the rocker rocks it to the other end on the hinge spring, and back', async ({ page }) => {
  await open(page, '/gadgets/rocker', 'bone');
  const rocker = page.getByTestId('rocker'), press = page.getByTestId('rocker-press');
  await press.scrollIntoViewIfNeeded();
  await press.click();
  await expect(press).toHaveAttribute('aria-checked', 'true');
  await expect(rocker).toHaveAttribute('data-state', 'on');
  const trace = await page.evaluate(async () => {
    const svg = document.querySelector('[data-testid="rocker"]')!, out: number[] = [], t0 = performance.now();
    await new Promise<void>((done) => { const id = setInterval(() => { out.push(Number(svg.querySelector('[data-shape="rocker"]')!.getAttribute('data-tilt'))); if (performance.now() - t0 > 900) { clearInterval(id); done(); } }, 8); });
    return out;
  });
  // It passes through the middle, never beyond its stops, and rests on.
  expect(trace.some((t) => Math.abs(t) < 0.5)).toBe(true);
  expect(Math.max(...trace)).toBeLessThanOrEqual(1.001);
  expect(trace[trace.length - 1]).toBeCloseTo(1, 1);
  await press.press('Space');
  await expect(rocker).toHaveAttribute('data-state', 'rest');
  await expect.poll(() => tilt(rocker), { timeout: 2000 }).toBeCloseTo(-1, 1);
});

test('with reduced motion it goes straight to the other end; the flat tier has no filters; the server string is on', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/gadgets/rocker', 'graphite');
  await page.getByTestId('rocker-press').click();
  expect(await tilt(page.getByTestId('rocker'))).toBe(1);
  const tiers = page.getByTestId('rocker-tiers').locator('svg[data-gadget]');
  expect(await tiers.evaluateAll((els) => els.map((e) => e.getAttribute('data-tier')))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(await tiers.nth(3).evaluate((e) => e.querySelectorAll('filter').length)).toBe(0);
  await expect(page.getByTestId('rocker-static').locator('svg')).toHaveAttribute('data-state', 'on');
});
