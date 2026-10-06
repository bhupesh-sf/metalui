import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Alert dialog: a question that must be answered. Focus starts on Cancel; a click outside is refused
// with one shake on the refusal spring; Esc cancels; the confirm button does the thing.
for (const colorway of COLORWAYS) {
  test(`starts on Cancel, refuses a click outside, cancels on Esc, confirms in ${colorway}`, async ({ page }) => {
    await open(page, '/components/alert-dialog', colorway);
    const trigger = page.getByRole('button', { name: 'Delete 3 regions…' });
    await trigger.click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete 3 regions for good?' });
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

    // Deleting for good is held: a click only shows the hint, once, under the actions.
    await trigger.click();
    const confirm = dialog.getByRole('button', { name: 'Delete regions' });
    await expect(confirm).toHaveAccessibleDescription('Hold to delete');
    await expect(confirm.locator('svg.mu-ic-trash')).toHaveCount(1);
    await confirm.click();
    await page.waitForTimeout(1000);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.mu-alert-dialog-hint')).toBeVisible();
    await expect(dialog.getByRole('status')).toHaveText('Hold to delete');

    // Held to the end: the lid drops shut, the act runs, the dialog closes.
    const box = (await confirm.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(() => confirm.locator('[data-part="lid"]').evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).b)).toBeLessThan(-0.05);
    await page.screenshot({ path: capture(`alert-dialog-hold-${colorway}`) });
    await expect(dialog).toBeHidden({ timeout: 3000 });
    await page.mouse.up();
    await expect(page.getByText('deleted for good · held to confirm')).toBeVisible();

    // Asked again, the hint starts unsaid.
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.mu-alert-dialog-hint')).toHaveCount(0);
    await page.keyboard.press('Escape');
  });
}

// A delete that goes to the past can be brought back: its confirm stays a plain press.
test('an undoable delete confirms on a plain press', async ({ page }) => {
  await open(page, '/components/alert-dialog', 'bone');
  await page.getByRole('button', { name: 'Open, then click outside' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete 3 regions?' });
  await expect(dialog).toBeVisible();
  const confirm = dialog.getByRole('button', { name: 'Delete regions' });
  await expect(confirm).not.toHaveAttribute('data-hold', '');
  await confirm.click();
  await expect(dialog).toBeHidden();
});

test('Reduce Motion: holding Space confirms with the fill and no lid travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/alert-dialog', 'graphite');
  await page.getByRole('button', { name: 'Delete 3 regions…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete 3 regions for good?' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab'); // Cancel → Delete regions
  const confirm = dialog.getByRole('button', { name: 'Delete regions' });
  await expect(confirm).toBeFocused();
  await page.keyboard.down(' ');
  await expect(confirm).toHaveAttribute('data-holding', '');
  expect(await confirm.locator('svg').getAttribute('data-playing')).toBeNull();
  await expect(dialog).toBeHidden({ timeout: 3000 });
  await page.keyboard.up(' ');
  await expect(page.getByText('deleted for good · held to confirm')).toBeVisible();
});

test('the refusal rings out against where the plate stands', async ({ page }) => {
  await open(page, '/components/alert-dialog', 'bone');
  await page.getByRole('button', { name: 'Delete 3 regions…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete 3 regions for good?' });
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
  const dialog = page.getByRole('alertdialog', { name: 'Delete 3 regions for good?' });
  await expect(dialog).toBeVisible();
  const moved = await dialog.evaluate(async (el) => {
    document.querySelector('.mu-alert-dialog-scrim')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return el.getAnimations().some((a) => a.id === 'mu-refusal');
  });
  expect(moved).toBe(false);
  await expect(dialog).toBeVisible();
});
