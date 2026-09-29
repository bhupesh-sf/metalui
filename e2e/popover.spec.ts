import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Popover: comes out of its trigger (rises one nest from the trigger's side on the surface spring),
// takes focus, and fades where it stands on close, returning focus to the trigger.
const trigger = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Rename…' }).first();

for (const colorway of COLORWAYS) {
  test(`opens from its trigger, takes focus, and closes on Esc in ${colorway}`, async ({ page }) => {
    await open(page, '/components/popover', colorway);
    await trigger(page).click();
    const plate = page.getByRole('dialog', { name: 'Rename region' });
    await expect(plate).toBeVisible();
    await expect(plate).toContainText('The name shows on its edge and in search.');
    // Beside its trigger, one nest away, on the side it opened.
    const b = (await trigger(page).boundingBox())!;
    const p = (await plate.boundingBox())!;
    await expect(plate).toHaveAttribute('data-side', 'bottom');
    await expect.poll(async () => Math.round((await plate.boundingBox())!.y - (b.y + b.height))).toBe(6);
    expect(Math.abs(p.x + p.width / 2 - (b.x + b.width / 2))).toBeLessThan(2);
    await expect(plate.getByRole('textbox')).toBeFocused();
    await page.waitForTimeout(700);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`popover-${colorway}`) });
    await page.keyboard.press('Escape');
    await expect(plate).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });
}

test('rises from the trigger side and leaves without travelling back', async ({ page }) => {
  await open(page, '/components/popover', 'bone');
  const opening = await trigger(page).evaluate(async (btn) => {
    (btn as HTMLElement).click();
    const out: { o: number; y: number; s: number }[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => {
        const p = document.querySelector('.mu-popover');
        if (p) {
          const c = getComputedStyle(p);
          const y = c.translate === 'none' ? 0 : parseFloat(c.translate.split(' ')[1] ?? '0');
          out.push({ o: parseFloat(c.opacity), y, s: c.scale === 'none' ? 1 : parseFloat(c.scale) });
        }
        if (performance.now() - t0 < 650) requestAnimationFrame(frame); else done();
      };
      requestAnimationFrame(frame);
    });
    return out;
  });
  // It starts back toward the trigger (above, for a popover below it) and smaller, then comes to rest.
  expect(opening[0].y).toBeLessThan(-4);
  expect(opening[0].s).toBeLessThan(1);
  expect(opening.every((f) => f.y <= 0.01 && f.s <= 1.0001)).toBe(true);
  expect(opening.at(-1)).toEqual({ o: 1, y: 0, s: 1 });

  const closing = await page.evaluate(async () => {
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const out: string[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => {
        const p = document.querySelector('.mu-popover');
        if (p) out.push(getComputedStyle(p).translate);
        if (p && performance.now() - t0 < 800) requestAnimationFrame(frame); else done();
      };
      requestAnimationFrame(frame);
    });
    return out;
  });
  expect(closing.length).toBeGreaterThan(2);
  expect(closing.every((t) => t === 'none' || t === '0px')).toBe(true);
});

test('Reduce Motion: a crossfade with no travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/popover', 'graphite');
  const first = await trigger(page).evaluate(async (btn) => {
    (btn as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const c = getComputedStyle(document.querySelector('.mu-popover')!);
    return { translate: c.translate, scale: c.scale };
  });
  expect(first.translate).toMatch(/^(none|0px|0px 0px)$/);
  expect(first.scale).toMatch(/^(none|1)$/);
});
