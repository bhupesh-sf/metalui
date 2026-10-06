import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Toggle: a latching key. A press goes past the catch; an on key rests at the latch with its lamp
// lit; an off key rises all the way. In a group, several can latch and arrows move between keys.
const depth = (key: import('@playwright/test').Locator) =>
  key.evaluate((el) => { const t = getComputedStyle(el).translate; return t === 'none' ? 0 : parseFloat(t.split(' ')[1] ?? '0'); });

for (const colorway of COLORWAYS) {
  test(`latches, lights, and unlatches in ${colorway}`, async ({ page }) => {
    await open(page, '/components/toggle', colorway);
    const snap = page.getByRole('button', { name: 'Snap' });
    await expect(snap).toHaveAttribute('aria-pressed', 'false');
    await expect(snap.locator('.mu-led')).toHaveAttribute('data-kind', 'off');

    // Held, it sits past the catch.
    const box = (await snap.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(() => depth(snap)).toBeCloseTo(2, 1);
    await page.mouse.up();
    await expect(snap).toHaveAttribute('aria-pressed', 'true');
    await expect(snap.locator('.mu-led')).toHaveAttribute('data-kind', 'live');
    await expect.poll(() => depth(snap)).toBeCloseTo(1, 1);

    await snap.click();
    await expect(snap).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => depth(snap)).toBeCloseTo(0, 1);

    // A row: several latch at once; arrows move between keys.
    const marks = page.getByRole('group', { name: 'Text marks' });
    await marks.getByRole('button', { name: 'Italic' }).click();
    await expect(marks.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
    await expect(marks.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(marks.getByRole('button', { name: 'Underline' })).toBeFocused();

    await expect(page.getByRole('button', { name: 'Rulers' })).toBeDisabled();
    await page.waitForTimeout(500);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`toggle-${colorway}`) });
  });
}

test('an on key settles at the latch on the part spring, overshooting a touch', async ({ page }) => {
  await open(page, '/components/toggle', 'bone');
  const ys = await page.getByRole('button', { name: 'Snap' }).evaluate(async (el) => {
    (el as HTMLElement).click();
    const out: number[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => { const t = getComputedStyle(el).translate; out.push(t === 'none' ? 0 : parseFloat(t.split(' ')[1] ?? '0')); if (performance.now() - t0 < 650) requestAnimationFrame(frame); else done(); };
      requestAnimationFrame(frame);
    });
    return out;
  });
  expect(Math.max(...ys)).toBeGreaterThan(1.03);
  expect(ys.at(-1)).toBeCloseTo(1, 2);
});

test('Reduce Motion: the latch snaps to its depth', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/toggle', 'graphite');
  const snap = page.getByRole('button', { name: 'Snap' });
  await snap.click();
  // With Reduce Motion there is no travel: the latch is at its depth as soon as the state lands. Wait for that,
  // not for a number of frames, which a slow machine overruns.
  await expect.poll(() => snap.evaluate((el) => {
    const t = getComputedStyle(el).translate;
    return t === 'none' ? 0 : parseFloat(t.split(' ')[1] ?? '0');
  })).toBeCloseTo(1, 1);
  await expect(snap.locator('.mu-led')).toHaveAttribute('data-kind', 'live');
});

// RadioKeys: exactly one key down, as a radio group; arrows move and choose, and the old key rises.
test('radio keys latch exactly one, and arrows choose', async ({ page }) => {
  await open(page, '/components/toggle', 'bone');
  const group = page.getByRole('radiogroup', { name: 'Call length' });
  const key = (name: string) => group.getByRole('radio', { name });
  await expect(key('30 min')).toBeChecked();
  await expect(key('30 min')).toHaveAttribute('data-pressed', '');
  await expect(key('30 min').locator('.mu-led')).toHaveAttribute('data-kind', 'live');
  await key('60 min').click();
  await expect(key('60 min')).toBeChecked();
  await expect(key('30 min')).not.toHaveAttribute('data-pressed', '');
  await expect(key('30 min').locator('.mu-led')).toHaveAttribute('data-kind', 'off');
  await page.keyboard.press('ArrowLeft');
  await expect(key('30 min')).toBeChecked();
  await expect(key('30 min')).toBeFocused();
});
