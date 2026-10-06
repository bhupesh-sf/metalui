import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, emulateMedia, open } from './helpers';

// Autocomplete: free text with suggestions. The text is the value whatever it is; rows that start with it come
// first; the rest of the best match is drawn after the caret and Tab or → takes it; ↩ keeps the text unless a row
// is lit; nothing matched closes the plate. Then: an email "To" (choosing writes the address), groups and recent,
// a search you run (loading, failed), and the text submitted with a form.
const field = (page: Page, name = 'City') => page.getByRole('combobox', { name, exact: true });
const well = (input: Locator) => input.locator('xpath=ancestor::*[contains(concat(" ",@class," ")," mu-autocomplete ")][1]');
const options = (page: Page) => page.getByRole('listbox').getByRole('option');
const rest = (input: Locator) => well(input).locator('.mu-autocomplete-rest');

for (const colorway of COLORWAYS) {
  test(`suggests, completes inline, and keeps free text in ${colorway}`, async ({ page }) => {
    await open(page, '/components/autocomplete', colorway);
    const input = field(page);
    await input.click();
    await input.pressSequentially('li');
    // Lisbon starts with "li", so it comes before Berlin and Dublin, which only contain it.
    await expect(options(page)).toHaveText(['Lisbon', 'Berlin', 'Dublin']);
    await expect(options(page).first().locator('.mu-combobox-match')).toHaveText('Li');
    // The rest of the best match after the caret, in ink3; the input holds only what was typed.
    await expect(rest(input)).toHaveText('sbon');
    await expect(input).toHaveValue('li');
    const inks = await rest(input).evaluate((el) => [getComputedStyle(el).color, getComputedStyle(document.querySelector('input[aria-label=City]')!).color]);
    expect(inks[0]).not.toBe(inks[1]);
    const box = (await well(input).boundingBox())!;
    await expect.poll(() => page.locator('.mu-autocomplete-pop').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await page.screenshot({ path: capture(`autocomplete-${colorway}`), clip: { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: 180 } });

    // Tab takes it, and the focus stays.
    await page.keyboard.press('Tab');
    await expect(input).toHaveValue('Lisbon');
    await expect(input).toBeFocused();
    await expect(page.getByText('searching “Lisbon”')).toBeVisible();

    // Free text: nothing matched closes the plate and keeps the text.
    await input.fill('');
    await input.pressSequentially('Lisbon, Alfama');
    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(input).toHaveValue('Lisbon, Alfama');
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('Lisbon, Alfama');
  });
}

test('↩ keeps the text; the keys light a row, ↩ writes it, and the completion follows them', async ({ page }) => {
  await open(page, '/components/autocomplete', 'bone');
  const input = field(page);
  await input.click();
  await input.pressSequentially('bo');
  await expect(options(page)).toHaveText(['Bologna', 'Bordeaux', 'Lisbon']);
  await expect(rest(input)).toHaveText('logna');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(rest(input)).toHaveText('rdeaux');
  await page.keyboard.press('ArrowDown'); // Lisbon doesn't start with "bo": the completion goes back to the first that does
  await expect(rest(input)).toHaveText('logna');
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue('Lisbon');
  await expect(page.getByRole('listbox')).toBeHidden();

  // → at the end takes the completion too; with the caret moved back, none is drawn.
  await input.fill('');
  await input.pressSequentially('zur');
  await expect(rest(input)).toHaveText('ich');
  await page.keyboard.press('ArrowLeft');
  await expect(rest(input)).toHaveCount(0);
  await page.keyboard.press('End');
  await expect(rest(input)).toHaveText('ich');
  await page.keyboard.press('ArrowRight');
  await expect(input).toHaveValue('Zurich');

  // Esc closes the plate and the completion with it.
  await input.fill('');
  await input.pressSequentially('pa');
  await expect(rest(input)).toHaveText('ris');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(rest(input)).toHaveCount(0);
  await expect(input).toHaveValue('pa');
});

test('the clear key, sizes and states', async ({ page }) => {
  await open(page, '/components/autocomplete', 'bone');
  const input = field(page);
  await input.click();
  await input.pressSequentially('rom');
  await page.keyboard.press('Escape');
  await well(input).getByRole('button', { name: 'Clear' }).click();
  await expect(input).toHaveValue('');
  expect((await well(input).boundingBox())!.height).toBe(32);
  expect((await well(field(page, 'Large city')).boundingBox())!.height).toBe(44);
  expect((await well(field(page, 'Compact city')).boundingBox())!.height).toBe(28);
  await expect(field(page, 'Invalid city')).toHaveAttribute('aria-invalid', 'true');
  await expect(field(page, 'Invalid city')).toHaveValue('Atlantis');
  expect(await well(field(page, 'Invalid city')).evaluate((el) => getComputedStyle(el, '::before').boxShadow)).toContain('inset');
  await expect(field(page, 'Disabled city')).toBeDisabled();
});

test('an email "To": rows show the person, choosing writes the address', async ({ page }) => {
  await open(page, '/components/autocomplete', 'graphite');
  const to = field(page, 'To');
  await to.click();
  await to.pressSequentially('mar');
  // Names that start with it first, then an address that only contains it.
  await expect(options(page).locator('.mu-menu-label')).toHaveText(['Maria Costa', 'Maria Silva', 'Ana Martins']);
  await expect(options(page).first().locator('.mu-combobox-detail')).toHaveText('maria@studio.pt');
  // The completion is the rest of what will be written: the address.
  await expect(rest(to)).toHaveText('ia@studio.pt');
  await expect.poll(() => page.locator('.mu-autocomplete-pop').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  const row = (await options(page).first().boundingBox())!;
  await page.screenshot({ path: capture('autocomplete-to-graphite'), clip: { x: row.x - 24, y: row.y - 60, width: row.width + 48, height: 170 } });
  await options(page).nth(1).click();
  await expect(to).toHaveValue('msilva@harbour.co');
  await expect(page.getByText('to: msilva@harbour.co')).toBeVisible();
});

test('groups, and recent searches before typing', async ({ page }) => {
  await open(page, '/components/autocomplete', 'bone');
  const where = field(page, 'Where to');
  await where.click();
  await expect(page.getByRole('listbox').getByText('Recent', { exact: true })).toBeVisible();
  await expect(options(page)).toHaveText(['Rua Augusta, Lisbon', 'Ribeira, Porto']);
  await where.pressSequentially('rua');
  await expect(page.getByRole('listbox').getByText('Places', { exact: true })).toBeVisible();
  await expect(page.getByRole('listbox').getByText('Saved', { exact: true })).toBeVisible();
  await where.fill('');
  await where.pressSequentially('Largo do Carmo');
  await page.keyboard.press('Enter');
  await where.fill('');
  await expect(options(page).first()).toHaveText('Largo do Carmo');
});

test('a search you run: loading dims the rows behind the ring; a failure offers Try again', async ({ page }) => {
  await open(page, '/components/autocomplete', 'bone');
  const search = field(page, 'Search cities');
  const trail = well(search).locator('.mu-field-trail');
  await search.click();
  await search.pressSequentially('po');
  await expect(page.getByRole('status').filter({ hasText: 'Searching…' })).toBeVisible(); // no rows yet: the quiet line
  await expect(trail.locator('.mu-spinner[data-phase=shown]')).toBeVisible();
  await expect(search).toHaveAttribute('aria-busy', 'true');
  await expect(options(page)).toHaveText(['Porto']);
  await expect(trail.locator('.mu-spinner')).toHaveCount(0);

  // The next search fails (the Autocomplete search panel): one row says so; Try again runs it once more.
  await page.locator('.dialkit-panel-inner').click();
  const panel = page.locator('.dialkit-folder').filter({ hasText: 'Autocomplete search' }).last();
  await panel.getByRole('button', { name: 'On', exact: true }).first().click();
  await search.click();
  await search.pressSequentially('r');
  const retry = page.getByRole('option', { name: /Couldn.t load/ });
  await expect(retry).toBeVisible();
  await expect(retry).toContainText('Try again');
  // Try again runs the search once more (the ring, aria-busy) and keeps the plate and the text.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(search).toHaveAttribute('aria-busy', 'true');
  await expect(search).toHaveValue('por');
  await expect(retry).toBeVisible();
  await expect(search).not.toHaveAttribute('aria-busy', 'true');
  await expect(retry).toBeVisible(); // still failing
  await page.keyboard.press('Escape');
  const off = panel.getByRole('button', { name: 'Off', exact: true }).first();
  if (!(await off.isVisible())) await page.locator('.dialkit-panel-inner').click(); // the panel folds when the page is clicked
  await off.click();
});

test('in a form: the text is submitted, and an empty one is refused', async ({ page }) => {
  await open(page, '/components/autocomplete', 'bone');
  const section = page.getByTestId('autocomplete-form');
  const input = section.getByRole('combobox');
  await section.getByRole('button', { name: 'Save' }).click();
  await expect(section.getByText('Say where it was taken.')).toBeVisible();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await input.pressSequentially('Somewhere in Alentejo');
  await section.getByRole('button', { name: 'Save' }).click();
  await expect(section.getByText('Saved “Somewhere in Alentejo”.')).toBeVisible();
});

test('Reduce Motion: the plate opens without the height glide, and Tab still completes', async ({ page }) => {
  await emulateMedia(page, [{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await open(page, '/components/autocomplete', 'graphite');
  const input = field(page);
  await input.click();
  await input.pressSequentially('ma');
  await expect(options(page).first()).toHaveText('Madrid');
  expect(parseFloat(await page.locator('.mu-combobox-fit').evaluate((el) => getComputedStyle(el).transitionDuration))).toBeLessThan(0.01);
  await expect(rest(input)).toHaveText('drid');
  await page.keyboard.press('Tab');
  await expect(input).toHaveValue('Madrid');
});
