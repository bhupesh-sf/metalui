import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Quick edit: one short value committed with one key. The async save holds the key and locks the
// field; a failed save morphs to sync-error with Try again; a file keeps its extension out of the selection.
const demo = (page: Page, id: string) => page.getByTestId(id);
const plate = (page: Page) => page.getByRole('dialog').filter({ has: page.locator('.mu-quick-edit') });
const key = (page: Page) => plate(page).locator('button[type=submit]');
const glyph = (page: Page) => key(page).locator('[data-glyph]');

async function openDemo(page: Page, id: string) {
  await demo(page, id).scrollIntoViewIfNeeded();
  await demo(page, id).getByRole('button', { name: 'Rename…' }).click();
  await expect(plate(page)).toBeVisible();
}

for (const colorway of COLORWAYS) {
  test(`saving holds the key, locks the field and Escape, shows the arc, then lands in ${colorway}`, async ({ page }) => {
    await open(page, '/components/quick-edit', colorway);
    await openDemo(page, 'quick-edit-slow');
    await page.keyboard.type('Porto');
    await page.keyboard.press('Enter');
    await expect(key(page)).toHaveAttribute('aria-busy', 'true');
    await expect(key(page)).toHaveAccessibleName('Renaming…');
    await expect(plate(page).getByRole('textbox')).toHaveAttribute('readonly', '');
    await expect(plate(page).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    // Escape waits while the save is out.
    await page.keyboard.press('Escape');
    await expect(plate(page)).toBeVisible();
    // After the spinner's delay the glyph has given way to the turning arc.
    await expect.poll(() => key(page).locator('.mu-button-arc').evaluate((el) => parseFloat(getComputedStyle(el).opacity))).toBeGreaterThan(0.9);
    await demo(page, 'quick-edit-slow').screenshot({ path: capture(`quick-edit-saving-${colorway}`) });
    // Landed: check, Renamed, then the plate closes and the name is the new one, with Undo.
    await expect(glyph(page)).toHaveAttribute('data-glyph', 'check');
    await expect(key(page)).toHaveAccessibleName('Renamed');
    await expect(plate(page)).toBeHidden();
    await expect(page.getByTestId('quick-edit-slow-name')).toHaveText('Porto');
    await expect(page.getByText('Renamed to Porto')).toBeVisible();
  });

  test(`a failed save morphs to sync-error and says Try again; trying again lands in ${colorway}`, async ({ page }) => {
    await open(page, '/components/quick-edit', colorway);
    await openDemo(page, 'quick-edit-fails');
    await page.keyboard.type('Porto');
    await page.keyboard.press('Enter');
    await expect(glyph(page)).toHaveAttribute('data-glyph', 'sync-error');
    await expect(key(page)).toHaveAccessibleName('Try again');
    await expect(plate(page).getByRole('status')).toHaveText('Couldn’t rename. Try again.');
    // Nothing closed and nothing was lost; the field is unlocked.
    const field = plate(page).getByRole('textbox');
    await expect(field).toHaveValue('Porto');
    await expect(field).not.toHaveAttribute('readonly', '');
    await expect(page.getByTestId('quick-edit-fails-name')).toHaveText('Trip to Lisbon');
    await page.waitForTimeout(500);
    await demo(page, 'quick-edit-fails').screenshot({ path: capture(`quick-edit-failed-${colorway}`) });
    await key(page).click();
    await expect(key(page)).toHaveAccessibleName('Renamed');
    await expect(plate(page)).toBeHidden();
    await expect(page.getByTestId('quick-edit-fails-name')).toHaveText('Porto');
  });
}

test('editing after a failure turns the key back to Rename and pen', async ({ page }) => {
  await open(page, '/components/quick-edit', 'bone');
  await openDemo(page, 'quick-edit-fails');
  await page.keyboard.type('Porto');
  await page.keyboard.press('Enter');
  await expect(key(page)).toHaveAccessibleName('Try again');
  await page.keyboard.type('s');
  await expect(glyph(page)).toHaveAttribute('data-glyph', 'pen');
  await expect(key(page)).toHaveAccessibleName('Rename');
});

test('a file keeps its extension out of the selection', async ({ page }) => {
  await open(page, '/components/quick-edit', 'bone');
  await openDemo(page, 'quick-edit-file');
  const field = plate(page).getByRole('textbox', { name: 'File name' });
  await expect(field).toBeFocused();
  expect(await field.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, 'Itinerary'.length]);
  await page.keyboard.type('Lisbon trip');
  await expect(field).toHaveValue('Lisbon trip.pdf');
});

test('Reduce Motion: the save breathes instead of turning, and lands', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/quick-edit', 'graphite');
  await openDemo(page, 'quick-edit-slow');
  await page.keyboard.type('Porto');
  await page.keyboard.press('Enter');
  await expect.poll(() => key(page).locator('.mu-button-arc').evaluate((el) => getComputedStyle(el).animationName)).toBe('mu-progress-breathe');
  await expect(key(page)).toHaveAccessibleName('Renamed');
  await expect(plate(page)).toBeHidden();
});
