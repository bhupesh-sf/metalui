import { expect, test, type Locator } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Radio group: one choice from a short list. The press darkens the well; the release latches the new
// pip in while the old one drops out on the same frame; dragging off cancels; arrows choose.
const scaleOf = (radio: Locator) => radio.evaluate((el) => parseFloat(getComputedStyle(el.querySelector('.mu-radio-pip')!).scale) || 0);

for (const colorway of COLORWAYS) {
  test(`choose by label, by arrows, and cancel by dragging off in ${colorway}`, async ({ page }) => {
    await open(page, '/components/radio', colorway);
    const group = page.getByRole('radiogroup', { name: 'Export format', exact: true });
    const radios = group.getByRole('radio');
    await expect(radios.nth(1)).toBeChecked();

    // The label is part of the hit area.
    await group.getByText('PDF').click();
    await expect(radios.nth(2)).toBeChecked();
    await expect(radios.nth(1)).not.toBeChecked();

    // Press on an option and drag off: nothing latches.
    const png = (await radios.nth(0).boundingBox())!;
    await page.mouse.move(png.x + png.width / 2, png.y + png.height / 2);
    await page.mouse.down();
    await page.mouse.move(png.x + 400, png.y + 200, { steps: 4 });
    await page.mouse.up();
    await expect(radios.nth(2)).toBeChecked();
    await expect(radios.nth(0)).not.toBeChecked();

    // Arrows move and choose.
    await radios.nth(2).focus();
    await page.keyboard.press('ArrowUp');
    await expect(radios.nth(1)).toBeChecked();
    await expect(radios.nth(1)).toBeFocused();

    // A disabled option cannot be chosen, and its whole row is dimmed.
    const grid = page.getByRole('radiogroup', { name: 'Grid' });
    await expect(grid.getByRole('radio').nth(2)).toHaveAttribute('data-disabled', '');
    await grid.getByText('None').click({ force: true });
    await expect(grid.getByRole('radio').nth(0)).toBeChecked();
    expect(await grid.locator('label').nth(2).evaluate((el) => getComputedStyle(el).opacity)).toBe('0.4');

    await page.waitForTimeout(700);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`radio-${colorway}`) });
  });
}

test('the interlock: the new pip overshoots its stop while the old one drops out, starting together', async ({ page }) => {
  await open(page, '/components/radio', 'bone');
  const radios = page.getByRole('radiogroup', { name: 'Export format', exact: true }).getByRole('radio');
  const samples = await radios.nth(0).evaluate(async (first) => {
    const pips = [...first.closest('[role=radiogroup]')!.querySelectorAll('.mu-radio-pip')];
    const read = () => pips.map((p) => parseFloat(getComputedStyle(p).scale) || 0);
    (first as HTMLElement).click();
    const out: number[][] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => { out.push(read()); if (performance.now() - t0 < 700) requestAnimationFrame(frame); else done(); };
      requestAnimationFrame(frame);
    });
    return out;
  });
  const newPip = samples.map((s) => s[0]);
  const oldPip = samples.map((s) => s[1]);
  // Both move within the first frames: one latches as the other lets go.
  expect(newPip.slice(0, 4).some((v) => v > 0)).toBe(true);
  expect(oldPip.slice(0, 4).some((v) => v < 1)).toBe(true);
  // The latch overshoots its stop on the part spring; the release never does.
  expect(Math.max(...newPip)).toBeGreaterThan(1.03);
  expect(Math.min(...oldPip)).toBeGreaterThanOrEqual(0);
  expect(oldPip.every((v, i) => i === 0 || v <= oldPip[i - 1] + 1e-6)).toBe(true);
  expect(newPip.at(-1)).toBeCloseTo(1, 1);
  expect(oldPip.at(-1)).toBe(0);
});

test('Reduce Motion: the pip is there or not at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/radio', 'graphite');
  const radios = page.getByRole('radiogroup', { name: 'Export format', exact: true }).getByRole('radio');
  await radios.nth(2).click();
  await expect(radios.nth(2)).toBeChecked();
  // One frame after the change, both pips are already at rest.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect(await scaleOf(radios.nth(2))).toBe(1);
  expect(await scaleOf(radios.nth(1))).toBe(0);
});

// A disabled group keeps one Tab stop, its choice, marked disabled: a keyboard user reaches it to hear why.
test('a disabled group is reached on its choice and cannot change', async ({ page }) => {
  await open(page, '/components/radio', 'bone');
  const units = page.getByRole('radiogroup', { name: 'Units, set by your workspace' });
  const metric = units.getByRole('radio', { name: 'Metric' });
  await expect(units).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('radiogroup', { name: 'Grid' }).getByRole('radio', { name: 'Dots' }).focus();
  await page.keyboard.press('Tab');
  await expect(metric).toBeFocused();
  await expect(metric).toBeDisabled();
  await page.keyboard.press('ArrowDown');
  await expect(metric).toBeChecked();
  await page.keyboard.press('Space');
  await expect(units.getByRole('radio', { name: 'Imperial' })).not.toBeChecked();
});
