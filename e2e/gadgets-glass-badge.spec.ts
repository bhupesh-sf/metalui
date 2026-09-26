import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The glass badge, an inset gadget drawn from its spec: a person printed on backlit glass in a steel
// bezel, the light rising when signed in, the lamp saying expired, and no sound.
const light = (svg: import('@playwright/test').Locator) => svg.evaluate((e) => Number((e.querySelector('[data-id="light"]') as HTMLElement).style.opacity));

for (const colorway of COLORWAYS) {
  test(`the glass badge in ${colorway}`, async ({ page }) => {
    await open(page, '/gadgets/glass-badge', colorway);
    const states = page.getByTestId('badge-states').locator('svg[data-gadget="glass-badge"]');
    await expect(states).toHaveCount(3);
    expect(await states.evaluateAll((els) => els.map((e) => e.getAttribute('data-state')))).toEqual(['rest', 'signed-in', 'expired']);
    expect(await Promise.all([0, 1, 2].map((i) => light(states.nth(i))))).toEqual([0.08, 0.92, 0.92]);
    expect(await states.evaluateAll((els) => els.map((e) => [e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'), e.querySelector('[data-part="lamp"]')!.getAttribute('data-gesture')]))).toEqual([['off', 'steady'], ['live', 'rise'], ['waiting', 'steady']]);
    // The person is printed in the glass, under its surface.
    await expect(states.first().locator('[data-part="bezel.light"] [data-part="glyph"][data-name="friend"]')).toHaveCount(1);
    await expect(states.nth(1).locator('desc')).toHaveText('Account, signed in');
    await page.getByTestId('badge-states').screenshot({ path: capture(`gadget-glass-badge-${colorway}`) });
  });
}

test('signing in raises the light on the settle spring; expired keeps it and turns the lamp amber', async ({ page }) => {
  await open(page, '/gadgets/glass-badge', 'bone');
  const badge = page.getByTestId('badge');
  await badge.scrollIntoViewIfNeeded();
  await page.getByRole('switch', { name: 'Signed in' }).click();
  await expect(badge).toHaveAttribute('data-state', 'signed-in');
  const trace = await page.evaluate(async () => {
    const svg = document.querySelector('[data-testid="badge"]')!, out: number[] = [], t0 = performance.now();
    await new Promise<void>((done) => { const id = setInterval(() => { out.push(Number((svg.querySelector('[data-id="light"]') as HTMLElement).style.opacity)); if (performance.now() - t0 > 1200) { clearInterval(id); done(); } }, 16); });
    return out;
  });
  // It rises between dark and full (never past full).
  expect(trace.some((a) => a > 0.09 && a < 0.91)).toBe(true);
  expect(Math.max(...trace)).toBeLessThanOrEqual(0.921);
  expect(trace[trace.length - 1]).toBeCloseTo(0.92, 2);
  await page.getByRole('switch', { name: 'Expired' }).click();
  await expect(badge).toHaveAttribute('data-state', 'expired');
  await expect(badge.locator('[data-part="lamp"]')).toHaveAttribute('data-lamp', 'waiting');
  expect(await light(badge)).toBeCloseTo(0.92, 2);
});

test('with reduced motion the light goes straight up; the flat tier has no filters; the server string is signed in', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/gadgets/glass-badge', 'graphite');
  await page.getByRole('switch', { name: 'Signed in' }).click();
  expect(await light(page.getByTestId('badge'))).toBe(0.92);
  const tiers = page.getByTestId('badge-tiers').locator('svg[data-gadget]');
  expect(await tiers.evaluateAll((els) => els.map((e) => e.getAttribute('data-tier')))).toEqual(['full', 'full', 'lite', 'flat']);
  await expect(page.getByTestId('badge-static').locator('svg[data-gadget]')).toHaveAttribute('data-state', 'signed-in');
});
