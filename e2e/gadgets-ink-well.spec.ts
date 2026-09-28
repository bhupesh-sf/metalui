import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The ink well, a slab gadget drawn from its spec: a nib over a well of ink, dipped by its act (into the
// ink and back) and resting in the ink while writing.
const nibY = (svg: import('@playwright/test').Locator) => svg.evaluate((e) => {
  const t = e.querySelector('[data-id="nib"] [data-moves]')!.getAttribute('transform') ?? '';
  const m = t.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);
  return m ? +(Number(m[2]) - (t.includes('rotate') ? 236 : 0)).toFixed(2) : 0;
});

for (const colorway of COLORWAYS) {
  test(`the ink well in ${colorway}`, async ({ page }) => {
    await open(page, '/gadgets/ink-well', colorway);
    const states = page.getByTestId('well-states').locator('svg[data-gadget="ink-well"]');
    await expect(states).toHaveCount(2);
    expect(await states.evaluateAll((els) => els.map((e) => e.getAttribute('data-state')))).toEqual(['rest', 'writing']);
    expect(await Promise.all([0, 1].map((i) => nibY(states.nth(i))))).toEqual([0, 6]);
    // Ink in the well, in the accent; the nib over it, its tip wet.
    await expect(states.first().locator('[data-part="ink"] circle')).toHaveCount(2);
    await expect(states.first().locator('[data-part="nib.ink"]')).toHaveCount(1);
    expect(await states.evaluateAll((els) => els.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp')))).toEqual(['off', 'live']);
    await expect(states.nth(1).locator('desc')).toHaveText('Draw, writing');
    await page.getByTestId('well-states').screenshot({ path: capture(`gadget-ink-well-${colorway}`) });
  });
}

test('pressing the well dips the nib into the ink and back; writing, it rests in the ink', async ({ page }) => {
  await open(page, '/gadgets/ink-well', 'bone');
  const well = page.getByTestId('well');
  await well.scrollIntoViewIfNeeded();
  await page.getByTestId('well-press').click();
  const trace = await page.evaluate(async () => {
    const svg = document.querySelector('[data-testid="well"]')!, out: number[] = [], t0 = performance.now();
    await new Promise<void>((done) => { const id = setInterval(() => { const t = svg.querySelector('[data-id="nib"] [data-moves]')!.getAttribute('transform') ?? ''; const m = t.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/); out.push(m ? Number(m[2]) - (t.includes('rotate') ? 236 : 0) : 0); if (performance.now() - t0 > 700) { clearInterval(id); done(); } }, 8); });
    return out;
  });
  expect(Math.max(...trace)).toBeGreaterThan(8);
  expect(Math.max(...trace)).toBeLessThanOrEqual(10.5);
  expect(Math.abs(trace[trace.length - 1])).toBeLessThan(0.5);
  await page.getByRole('switch', { name: 'Writing' }).click();
  await expect(well).toHaveAttribute('data-state', 'writing');
  await expect.poll(() => nibY(well), { timeout: 3000 }).toBeCloseTo(6, 0);
  await page.getByRole('switch', { name: 'Writing' }).click();
  await expect(well).toHaveAttribute('data-state', 'rest');
  await expect.poll(() => nibY(well), { timeout: 3000 }).toBeCloseTo(0, 0);
});

test('with reduced motion the nib goes straight to rest in the ink; the flat tier has no filters; the server string is writing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/gadgets/ink-well', 'graphite');
  await page.getByRole('switch', { name: 'Writing' }).click();
  expect(await nibY(page.getByTestId('well'))).toBe(6);
  const tiers = page.getByTestId('well-tiers').locator('svg[data-gadget]');
  expect(await tiers.evaluateAll((els) => els.map((e) => e.getAttribute('data-tier')))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(await tiers.nth(3).evaluate((e) => e.querySelectorAll('filter').length)).toBe(0);
  await expect(page.getByTestId('well-static').locator('svg')).toHaveAttribute('data-state', 'writing');
});
