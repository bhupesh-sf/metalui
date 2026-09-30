import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Field in a form: the select's sizes, a visible focus ring, the shared invalid ring with
// aria-invalid, and disabled; the palette's large field keeps the caret as its focus.
for (const colorway of COLORWAYS) {
  test(`form sizes, focus, invalid and disabled in ${colorway}`, async ({ page }) => {
    await open(page, '/components/field', colorway);
    const well = (name: string) => page.getByRole('textbox', { name, exact: true }).locator('xpath=ancestor::label[1]');
    expect((await well('Region name').boundingBox())!.height).toBe(32);
    expect((await well('Tag').boundingBox())!.height).toBe(28);

    await page.getByRole('textbox', { name: 'Region name', exact: true }).focus();
    await expect(well('Region name')).toHaveCSS('outline-style', 'solid');
    await page.getByRole('textbox', { name: 'Lens or action', exact: true }).first().focus();
    await expect(well('Lens or action').first()).toHaveCSS('outline-style', 'none');

    const invalid = page.getByRole('textbox', { name: 'Invalid region name' });
    await expect(invalid).toHaveAttribute('aria-invalid', 'true');
    expect(await well('Invalid region name').evaluate((el) => getComputedStyle(el, '::before').boxShadow)).toContain('inset');
    await expect(page.getByRole('textbox', { name: 'Locked region name' })).toBeDisabled();
    await expect(well('Locked region name')).toHaveCSS('opacity', '0.4');

    await page.locator('section', { hasText: 'Form sizes and states' }).first().screenshot({ path: capture(`field-form-${colorway}`) });
  });
}
