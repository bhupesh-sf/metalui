import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The shutter lens, an inset gadget drawn from its spec: a lens over lit glass in a bezel, its ring's
// angle the zoom value (a click every eighth of a turn), and taking a picture turning the ring one
// detent round and back while the glass flashes.
const ringAngle = (svg: import('@playwright/test').Locator) => svg.evaluate((e) => Number(e.querySelector('[data-part="lens.ring"]')!.getAttribute('transform')!.match(/rotate\(([-\d.]+)/)![1]));
const glow = (svg: import('@playwright/test').Locator) => svg.evaluate((e) => Number((e.querySelector('[data-id="light"]') as HTMLElement).style.opacity));

for (const colorway of COLORWAYS) {
  test(`the shutter lens in ${colorway}`, async ({ page }) => {
    await open(page, '/gadgets/shutter-lens', colorway);
    const states = page.getByTestId('lens-states').locator('svg[data-gadget="shutter-lens"]');
    await expect(states).toHaveCount(2);
    expect(await states.evaluateAll((els) => els.map((e) => e.getAttribute('data-state')))).toEqual(['rest', 'taken']);
    expect(await Promise.all([0, 1].map((i) => glow(states.nth(i))))).toEqual([0.15, 0.9]);
    expect(await states.evaluateAll((els) => els.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp')))).toEqual(['off', 'live']);
    // The lens sits over the glass, on top: its ring wears the accent.
    await expect(states.first().locator('[data-layer="top"] [data-id="lens"][data-accent="true"] [data-part="lens"]')).toHaveCount(1);
    expect(await ringAngle(states.first())).toBe(0);
    await page.getByTestId('lens-states').screenshot({ path: capture(`gadget-shutter-lens-${colorway}`) });
  });
}

test('turning the ring clicks a detent at a time; taking a picture turns it a detent round and back', async ({ page }) => {
  await open(page, '/gadgets/shutter-lens', 'bone');
  const lens = page.getByTestId('lens'), point = page.getByTestId('lens-point');
  await point.scrollIntoViewIfNeeded();
  await point.focus();
  await page.keyboard.press('ArrowRight');
  await expect(point).toHaveAttribute('aria-valuenow', '5');
  await expect.poll(() => ringAngle(lens), { timeout: 2000 }).toBeCloseTo(45, 0);
  await page.getByRole('button', { name: 'Take' }).click();
  await expect(lens).toHaveAttribute('data-state', 'taken');
  const trace = await page.evaluate(async () => {
    const svg = document.querySelector('[data-testid="lens"]')!, out: number[] = [], t0 = performance.now();
    await new Promise<void>((done) => { const id = setInterval(() => { out.push(Number(svg.querySelector('[data-part="lens.ring"]')!.getAttribute('transform')!.match(/rotate\(([-\d.]+)/)![1])); if (performance.now() - t0 > 1000) { clearInterval(id); done(); } }, 8); });
    return out;
  });
  // Round toward one more detent (90°), well past the zoom's 45°, and back.
  expect(Math.max(...trace)).toBeGreaterThan(60);
  expect(trace[trace.length - 1]).toBeCloseTo(45, 0);
  await expect(lens).toHaveAttribute('data-state', 'rest', { timeout: 3000 });
});

test('with reduced motion the ring goes straight to its angle; the flat tier has no filters; the server string is taken', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/gadgets/shutter-lens', 'graphite');
  await page.getByTestId('lens-point').focus();
  await page.keyboard.press('ArrowLeft');
  expect(await ringAngle(page.getByTestId('lens'))).toBe(-45);
  const tiers = page.getByTestId('lens-tiers').locator('svg[data-gadget]');
  expect(await tiers.evaluateAll((els) => els.map((e) => e.getAttribute('data-tier')))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(await tiers.nth(3).evaluate((e) => e.querySelectorAll('filter').length)).toBe(0);
  await expect(page.getByTestId('lens-static').locator('svg')).toHaveAttribute('data-state', 'taken');
});
