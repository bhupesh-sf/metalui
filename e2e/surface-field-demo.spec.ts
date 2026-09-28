import { expect, test } from '@playwright/test';
import { COLORWAYS, open } from './helpers';

for (const colorway of COLORWAYS) {
  test(`surface field follows a carried MetalUI object in ${colorway}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await open(page, '/components/selection-frame', colorway);
    const field = page.getByTestId('surface-field-demo');
    const note = page.getByTestId('surface-field-moving-note');
    await field.scrollIntoViewIfNeeded();
    await expect(field.locator('canvas').first()).toBeVisible();

    const before = await note.boundingBox();
    expect(before).not.toBeNull();
    await page.mouse.move(before!.x + 40, before!.y + 30);
    await page.mouse.down();
    await page.mouse.move(before!.x + 90, before!.y + 20, { steps: 5 });
    await expect(note.locator('.mu-selection-frame')).toHaveAttribute('data-state', 'selected');
    await page.mouse.up();
    await expect(note.locator('.mu-selection-frame')).toHaveAttribute('data-state', 'rest');
    const afterDrag = await note.boundingBox();
    expect(afterDrag!.x).toBeGreaterThan(before!.x + 30);

    await note.focus();
    await page.keyboard.press('ArrowLeft');
    const afterKey = await note.boundingBox();
    expect(afterKey!.x).toBeLessThan(afterDrag!.x);
    expect(errors).toEqual([]);
  });
}

test('surface field rests under reduced motion on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/selection-frame', 'graphite');
  const field = page.getByTestId('surface-field-demo');
  await field.scrollIntoViewIfNeeded();
  const canvas = field.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(300);
  const first = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  await page.waitForTimeout(250);
  expect(await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL())).toBe(first);
  expect(await field.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(await field.evaluate((element) => element.clientWidth));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(field.locator('canvas')).toHaveCount(0);
  await field.scrollIntoViewIfNeeded();
  await expect(field.locator('canvas').first()).toBeVisible();
});
