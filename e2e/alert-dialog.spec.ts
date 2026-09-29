import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Alert dialog: a question that must be answered. Focus starts on Cancel; a click outside is refused
// with one shake on the refusal spring; Esc cancels; the confirm button does the thing.
for (const colorway of COLORWAYS) {
  test(`starts on Cancel, refuses a click outside, cancels on Esc, confirms in ${colorway}`, async ({ page }) => {
    await open(page, '/components/alert-dialog', colorway);
    const trigger = page.getByRole('button', { name: 'Delete 3 regions…' });
    await trigger.click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete 3 regions?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.waitForTimeout(600);
    await page.screenshot({ path: capture(`alert-dialog-${colorway}`) });

    // A click outside does not close it.
    await page.mouse.click(10, 10);
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await dialog.getByRole('button', { name: 'Delete regions' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('deleted · the regions are in the past')).toBeVisible();
  });
}

test('the refusal rings out against where the plate stands', async ({ page }) => {
  await open(page, '/components/alert-dialog', 'bone');
  await page.getByRole('button', { name: 'Delete 3 regions…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete 3 regions?' });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(600);
  const xs = await dialog.evaluate(async (el) => {
    document.querySelector('.mu-alert-dialog-scrim')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const out: number[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => { out.push(new DOMMatrix(getComputedStyle(el).transform).m41); if (performance.now() - t0 < 1300) requestAnimationFrame(frame); else done(); };
      requestAnimationFrame(frame);
    });
    return out;
  });
  // It leaves a nest aside, swings past where it stands, and comes to rest there.
  expect(Math.max(...xs)).toBeGreaterThan(5);
  expect(Math.min(...xs)).toBeLessThan(-1);
  expect(Math.abs(xs.at(-1)!)).toBeLessThan(0.1);
});

test('Reduce Motion: a click outside does not shake', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/alert-dialog', 'graphite');
  await page.getByRole('button', { name: 'Delete 3 regions…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete 3 regions?' });
  await expect(dialog).toBeVisible();
  const moved = await dialog.evaluate(async (el) => {
    document.querySelector('.mu-alert-dialog-scrim')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return el.getAnimations().some((a) => a.id === 'mu-refusal');
  });
  expect(moved).toBe(false);
  await expect(dialog).toBeVisible();
});
