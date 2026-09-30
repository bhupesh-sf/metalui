import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Form field: the label names the control and the description describes it; leaving the field empty
// shows the error, grown open from under the control, with the invalid ring; fixing it takes it away.
for (const colorway of COLORWAYS) {
  test(`labels, describes, and says why a value is not accepted in ${colorway}`, async ({ page }) => {
    await open(page, '/components/form-field', colorway);
    const name = page.getByRole('textbox', { name: 'Region name' });
    await expect(name).toHaveAccessibleDescription('Shown on its edge and in search.');
    await page.getByText('Region name', { exact: true }).click();
    await expect(name).toBeFocused();

    // Too short, then moving on: the error comes after the person has had a chance.
    await name.pressSequentially('ab');
    await page.keyboard.press('Tab');
    const error = page.locator('.mu-form-field-error').first();
    await expect(error).toHaveText('Use at least 3 letters.');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription(/Use at least 3 letters\./);
    expect(await name.locator('xpath=ancestor::label[1]').evaluate((el) => getComputedStyle(el, '::before').boxShadow)).toContain('inset');
    await page.waitForTimeout(600);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`form-field-${colorway}`) });

    await name.fill('Trip to Lisbon');
    await name.blur();
    await expect(error).toBeHidden();
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
  });
}

test('saving with the name empty says so and moves focus there', async ({ page }) => {
  await open(page, '/components/form-field', 'bone');
  await page.getByRole('button', { name: 'Save region' }).click();
  const name = page.getByRole('textbox', { name: 'Region name' });
  await expect(page.locator('.mu-form-field-error').first()).toHaveText('Give the region a name.');
  await expect(name).toBeFocused();
  await expect(page.getByText('Saved.')).toBeHidden();
  await name.fill('Trip to Lisbon');
  await page.getByRole('button', { name: 'Save region' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
});

test('the error grows its row open instead of jumping', async ({ page }) => {
  await open(page, '/components/form-field', 'bone');
  const name = page.getByRole('textbox', { name: 'Region name' });
  await name.pressSequentially('ab');
  const heights = await page.evaluate(async () => {
    (document.activeElement as HTMLElement).blur();
    const out: number[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => { const e = document.querySelector('.mu-form-field-error'); out.push(e ? e.getBoundingClientRect().height : 0); if (performance.now() - t0 < 600) requestAnimationFrame(frame); else done(); };
      requestAnimationFrame(frame);
    });
    return out;
  });
  const full = heights.at(-1)!;
  expect(full).toBeGreaterThan(8);
  expect(heights.some((h) => h > 0.5 && h < full - 0.5)).toBe(true);
});
