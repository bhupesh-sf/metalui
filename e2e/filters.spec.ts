import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, emulateMedia, open } from './helpers';

// Filters, one slice per job: conditions read as sentences over a real table ("N of 36"), adding a field
// opens its editor, ticks and numbers apply as you go, a date waits for Apply, an operator change keeps the
// value, an editor closed empty takes its token, remove and Clear, the toolbar's keys, every field type's
// sentence, and Reduce Motion.

const section = (page: Page, name: string) => page.locator('section', { hasText: name }).first();
const bar = (scope: Locator, name: string) => scope.getByRole('toolbar', { name });
const token = (scope: Locator, sentence: string | RegExp) => scope.getByRole('group', { name: sentence });
const editor = (page: Page) => page.locator('.mu-filters-editor');
const caption = (scope: Locator) => scope.locator('caption');

for (const colorway of COLORWAYS) {
  test(`builds conditions over the invoices in ${colorway}`, async ({ page }) => {
    await open(page, '/components/filters', colorway);
    const play = section(page, 'Playground');
    const filters = bar(play, 'Invoice filters');
    await expect(token(filters, 'Status is any of Due, Overdue')).toBeVisible();
    await expect(token(filters, /^Amount more than 1,000 €$/)).toBeVisible();
    await expect(caption(play)).toContainText(/\d+ of 36/);
    const before = await caption(play).innerText();
    await page.waitForTimeout(300);
    await play.screenshot({ path: capture(`filters-${colorway}`) });

    // Tick another status: the words follow the count, the table follows the ticks.
    await token(filters, 'Status is any of Due, Overdue').getByRole('button', { name: /^Value:/ }).click();
    await expect(editor(page)).toBeVisible();
    await editor(page).getByRole('checkbox', { name: 'Paid' }).click();
    await expect(token(filters, 'Status is any of Paid +2')).toBeVisible();
    await expect.poll(() => caption(play).innerText()).not.toBe(before);
    await page.waitForTimeout(300);
    await editor(page).screenshot({ path: capture(`filters-list-${colorway}`) });
    await page.keyboard.press('Escape');
    await expect(editor(page)).toBeHidden();

    // Add a date: the calendar opens at once and waits for Apply.
    await filters.getByRole('button', { name: 'Filter' }).click();
    await page.getByRole('menuitem', { name: 'Due' }).click();
    await expect(editor(page)).toBeVisible();
    await expect(editor(page).getByRole('button', { name: 'Apply' })).toBeDisabled();
    await expect(token(filters, /^Due is …$/)).toBeVisible();
    await page.keyboard.press('Enter');
    await editor(page).getByRole('button', { name: 'Apply' }).click();
    await expect(editor(page)).toBeHidden();
    await expect(token(filters, /^Due is (?!…)\S/)).toBeVisible();
    await expect(filters.getByRole('button', { name: 'Clear' })).toBeVisible();
  });
}

test('an operator change keeps the value, and numbers apply as typed', async ({ page }) => {
  await open(page, '/components/filters', 'bone');
  const play = section(page, 'Playground');
  const filters = bar(play, 'Invoice filters');
  const amount = token(filters, /^Amount/);
  await amount.getByRole('button', { name: /^Operator:/ }).click();
  await page.getByRole('menuitem', { name: 'between' }).click();
  // between needs a second end: its editor opens, the first end kept.
  await expect(editor(page)).toBeVisible();
  await expect(editor(page).getByRole('textbox', { name: /from/ })).toHaveValue('1,000');
  await expect(token(filters, /^Amount between 1,000 and …/)).toBeVisible();
  await editor(page).getByRole('textbox', { name: /to/ }).fill('2500');
  await page.keyboard.press('Enter');
  await expect(editor(page)).toBeHidden();
  await expect(token(filters, 'Amount between 1,000 and 2,500 €')).toBeVisible();
  const rows = await play.locator('tbody tr').count();
  expect(rows).toBeGreaterThan(0);
});

test('an editor closed empty takes its token; remove and Clear', async ({ page }) => {
  await open(page, '/components/filters', 'bone');
  const play = section(page, 'Playground');
  const filters = bar(play, 'Invoice filters');
  const add = filters.getByRole('button', { name: 'Filter' });

  await add.click();
  await page.getByRole('menuitem', { name: 'Customer' }).click();
  const input = editor(page).getByRole('textbox', { name: 'Customer contains' });
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(token(filters, /^Customer/)).toHaveCount(0);
  await expect(add).toBeFocused();

  // Text applies as you type.
  await add.click();
  await page.getByRole('menuitem', { name: 'Customer' }).click();
  await page.keyboard.type('kite');
  await expect(token(filters, 'Customer contains “kite”')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(editor(page)).toBeHidden();

  // Three tokens: one goes, Clear stays with two; another goes, Clear goes with it.
  await token(filters, /^Amount/).getByRole('button', { name: /^Remove Amount/ }).click();
  await expect(token(filters, /^Amount/)).toHaveCount(0);
  await expect(filters.getByRole('button', { name: 'Clear' })).toBeVisible();
  await token(filters, /^Customer/).getByRole('button', { name: /^Remove/ }).click();
  await expect(filters.getByRole('button', { name: 'Clear' })).toHaveCount(0);
  await expect(add).toBeFocused();

  // The table's Clear empties the bar.
  await play.locator('caption').getByRole('button', { name: 'Clear' }).click();
  await expect(filters.getByRole('group')).toHaveCount(0);
  await expect(caption(play)).not.toContainText(' of 36');
});

test('one tab stop: arrows walk the keys, Enter opens, Esc returns', async ({ page }) => {
  await open(page, '/components/filters', 'bone');
  const play = section(page, 'Playground');
  const filters = bar(play, 'Invoice filters');
  const status = token(filters, /^Status/);
  await status.getByRole('button', { name: /^Operator:/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(status.getByRole('button', { name: /^Value:/ })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(status.getByRole('button', { name: /^Remove/ })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(editor(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor(page)).toBeHidden();
  await expect(status.getByRole('button', { name: /^Value:/ })).toBeFocused();
  // The toolbar is one stop: Tab leaves it.
  const tabbable = await filters.evaluate((el) => [...el.querySelectorAll('button')].filter((b) => b.tabIndex === 0).length);
  expect(tabbable).toBe(1);
});

test('every field type reads as one sentence', async ({ page }) => {
  await open(page, '/components/filters', 'graphite');
  const types = section(page, 'Every field type');
  const filters = bar(types, 'Every field type');
  await expect(filters.getByRole('group')).toHaveCount(6);
  await expect(types.getByTestId('filters-sentence')).toContainText('Customer contains “o” and Status isn’t Draft and Labels has any of print, q4 and Due between');
  await expect(types.getByTestId('filters-sentence')).toContainText(/^[1-9]\d* invoices where/);
  await expect(types.getByTestId('filters-sentence')).toContainText('Amount between 500 and 4,000 € and Reminded is No');
  // A boolean's value is a menu of Yes and No.
  await token(filters, /^Reminded/).getByRole('button', { name: 'Value: No' }).click();
  await page.getByRole('menuitem', { name: 'Yes' }).click();
  await expect(token(filters, 'Reminded is Yes')).toBeVisible();
  await page.waitForTimeout(300);
  await types.screenshot({ path: capture('filters-types-graphite') });
});

test('Reduce Motion: a token goes at once', async ({ page }) => {
  await emulateMedia(page, [{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await open(page, '/components/filters', 'bone');
  const filters = bar(section(page, 'Playground'), 'Invoice filters');
  await token(filters, /^Amount/).getByRole('button', { name: /^Remove/ }).click();
  // No leave to wait for: the token is gone by the next frame, with nothing animating in the bar.
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(token(filters, /^Amount/)).toHaveCount(0, { timeout: 100 });
  expect(await filters.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
});
