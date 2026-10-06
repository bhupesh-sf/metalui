import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Dialog: "Rename canvas…" is a Quick edit. The name opens selected; Rename is off until it changes;
// a taken name keeps the dialog open with the reason; done shows on the key, then the dialog closes
// and returns focus, and a toast offers Undo.
for (const colorway of COLORWAYS) {
  test(`Rename canvas: selected, refused with a reason, done on the key, Undo in ${colorway}`, async ({ page }) => {
    await open(page, '/components/dialog', colorway);
    const opener = page.getByRole('button', { name: 'Rename canvas…' }).first();
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Rename canvas' });
    const field = dialog.getByRole('textbox', { name: 'Name' });
    const key = dialog.locator('button[type=submit]');
    await expect(field).toBeFocused();
    expect(await field.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, 'Trip notes'.length]);
    await expect(key).toBeDisabled();
    await expect(key.locator('[data-glyph]')).toHaveAttribute('data-glyph', 'pen');

    await page.keyboard.type('Inbox');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByText('A canvas is already called Inbox.')).toBeVisible();
    await page.waitForTimeout(500);
    await dialog.screenshot({ path: capture(`dialog-rename-invalid-${colorway}`) });

    await field.fill('Lisbon notes');
    await page.keyboard.press('Enter');
    await expect(key.locator('[data-glyph]')).toHaveAttribute('data-glyph', 'check');
    await expect(key).toHaveAccessibleName('Renamed');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.getByText('Renamed to Lisbon notes')).toBeVisible();
    await page.keyboard.press('ControlOrMeta+z');
    await opener.click();
    await expect(field).toHaveValue('Trip notes');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
}
