import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers';

/* The Snap guides playground calls haptic('alignment') once per line caught and says which path this
 * browser took. A desktop browser has none; a touch device vibrates where it can, and iOS Safari
 * ticks a hidden switch. Nothing stands in for a haptic: no sound, no flash. */

const play = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const caption = (page: Page) => play(page).locator('[data-haptic-path], .snap-caption').first();

/** Drag "drag me" (250, 40) onto the left edge of "pick the typeface" (x 260): one line caught. */
async function catchALine(page: Page) {
  const note = play(page).locator('.snap-canvas .cursor-grab').first();
  await note.scrollIntoViewIfNeeded();
  const b = (await note.boundingBox())!;
  await page.mouse.move(b.x + 20, b.y + 20);
  await page.mouse.down();
  await page.mouse.move(b.x + 28, b.y + 120, { steps: 8 });
  await expect(play(page).locator('.mu-snap-guides')).toHaveCount(1);
  await page.mouse.up();
}

test('a desktop browser has no haptics and says so, and still counts the catch', async ({ page }) => {
  await open(page, '/components/snap-guides', 'bone');
  await expect(caption(page)).toContainText('haptic taps · 0');
  await catchALine(page);
  await expect(caption(page)).toHaveAttribute('data-haptic-path', 'none');
  await expect(caption(page)).toContainText(/haptic taps · [1-9]/);
  await expect(caption(page)).toContainText('no haptics here');
  // no stand-in: no audio, no switch toggled
  expect(await page.locator('audio, [data-mu-haptic]').count()).toBe(0);
});

test.describe('on a touch device', () => {
  test.use({ hasTouch: true, isMobile: true });

  test('where the browser can vibrate, each catch vibrates once', async ({ page }) => {
    await page.addInitScript(() => {
      const calls: unknown[] = [];
      (window as unknown as { __vibrations: unknown[] }).__vibrations = calls;
      Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: (p: unknown) => { calls.push(p); return true; } });
    });
    await open(page, '/components/snap-guides', 'bone');
    await catchALine(page);
    await expect(caption(page)).toHaveAttribute('data-haptic-path', 'vibrate');
    await expect(caption(page)).toContainText('vibrated');
    const taps = Number((await caption(page).textContent())!.match(/haptic taps · (\d+)/)![1]);
    const vibrations = await page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations);
    expect(vibrations.length).toBe(taps);
    expect(vibrations[0]).toBe(8);
  });

  test('on iOS Safari, each catch toggles the hidden switch once', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: undefined });
      Object.defineProperty(HTMLInputElement.prototype, 'switch', { configurable: true, get() { return this.hasAttribute('switch'); } });
      const toggles: boolean[] = [];
      (window as unknown as { __toggles: boolean[] }).__toggles = toggles;
      document.addEventListener('change', (e) => { const t = e.target as HTMLInputElement; if (t.closest('[data-mu-haptic]')) toggles.push(t.checked); }, true);
    });
    await open(page, '/components/snap-guides', 'bone');
    await catchALine(page);
    await expect(caption(page)).toHaveAttribute('data-haptic-path', 'ios-switch');
    await expect(caption(page)).toContainText('iOS tick');
    const taps = Number((await caption(page).textContent())!.match(/haptic taps · (\d+)/)![1]);
    const toggles = await page.evaluate(() => (window as unknown as { __toggles: boolean[] }).__toggles);
    expect(toggles.length).toBe(taps);
    // the switch is hidden from sight and from assistive tech
    const sw = page.locator('[data-mu-haptic]');
    await expect(sw).toBeHidden();
    await expect(sw).toHaveAttribute('aria-hidden', 'true');
    await expect(sw.locator('input[type="checkbox"][switch]')).toHaveCount(1);
  });
});
