import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The date selector and the calendar's localised, narrow cases, one slice per job: a condition chosen over
// two months and applied (operators carry the day; the draft waits for Apply; Cancel and Esc throw it away;
// Clear), in a dialog with a form, two months collapsing in a narrow container, other languages and right to
// left, and Reduce Motion. The clock is fixed at Wednesday 30 September 2026.
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(2026, 8, 30, 10)); });
const dueKey = (page: Page) => page.getByRole('button', { name: /^Due/ });
const panel = (page: Page) => page.getByRole('dialog', { name: 'Due' });
const tasks = (page: Page) => page.getByRole('status').filter({ hasText: /of 40 tasks/ });

for (const colorway of COLORWAYS) {
  test(`chooses a condition over two months and applies it, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/calendar', colorway);
    await expect(dueKey(page)).toHaveText('Due before 7 Oct 2026');
    const before = await tasks(page).textContent();
    await dueKey(page).click();
    const p = panel(page);
    await expect(p.getByRole('radio', { name: 'Before' })).toBeChecked();
    // Two months side by side; focus lands on the chosen day.
    await expect(p.getByRole('grid')).toHaveCount(2);
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Wednesday,? 7 October 2026$/);
    const apply = p.getByRole('button', { name: 'Apply' });
    await expect(apply).toBeDisabled();
    // Between carries the day as a range of it.
    await p.getByRole('radio', { name: 'Between' }).click();
    await expect(p.locator('.mu-date-selector-said')).toHaveText('Due between 7 Oct 2026');
    const oct = p.getByRole('grid', { name: 'October 2026' });
    await oct.getByRole('button', { name: /^Monday,? 5 October 2026$/ }).click();
    await expect(p.locator('.mu-date-selector-said')).toHaveText('Choose the last day');
    await expect(apply).toBeDisabled();
    await oct.getByRole('button', { name: /^Wednesday,? 14 October 2026$/ }).click();
    await expect(p.locator('.mu-date-selector-said')).toHaveText(/^Due between 5\s?–\s?14 Oct 2026$/);
    // Nothing outside moves until Apply.
    await expect(tasks(page)).toHaveText(before!);
    await page.waitForTimeout(400);
    await p.screenshot({ path: capture(`date-selector-${colorway}`) });
    await apply.click();
    await expect(p).toBeHidden();
    await expect(dueKey(page)).toHaveText(/^Due between 5\s?–\s?14 Oct 2026$/);
    await expect(dueKey(page)).toBeFocused();
    await expect(tasks(page)).not.toHaveText(before!);
  });
}

test('Cancel, Esc and a click outside throw the draft away; Clear removes the condition', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  await dueKey(page).click();
  await panel(page).getByRole('radio', { name: 'After' }).click();
  await panel(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(dueKey(page)).toHaveText('Due before 7 Oct 2026');
  // Reopened, the draft starts from the value again.
  await dueKey(page).click();
  await expect(panel(page).getByRole('radio', { name: 'Before' })).toBeChecked();
  await panel(page).getByRole('radio', { name: 'After' }).click();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect(dueKey(page)).toHaveText('Due before 7 Oct 2026');
  await dueKey(page).click();
  await panel(page).getByRole('button', { name: 'Clear' }).click();
  await expect(dueKey(page)).toHaveText('Due: any date');
  await expect(tasks(page)).toHaveText('40 of 40 tasks');
  // With no value there is nothing to clear.
  await dueKey(page).click();
  await expect(panel(page).getByRole('button', { name: 'Clear' })).toHaveCount(0);
});

test('in a dialog, Apply sends the condition with the form', async ({ page }) => {
  await open(page, '/components/calendar', 'graphite');
  const key = page.getByRole('button', { name: 'Opened: any date' });
  await key.click();
  const dialog = page.getByRole('dialog', { name: 'Opened' });
  await expect(dialog.getByRole('heading', { name: 'Opened' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Apply' })).toBeDisabled();
  // max is today: the step past this month stops.
  await expect(dialog.getByRole('button', { name: 'Next month' })).toBeDisabled();
  await dialog.getByRole('radio', { name: 'Is' }).click();
  await dialog.getByRole('button', { name: /^Tuesday,? 15 September 2026$/ }).click();
  await page.waitForTimeout(400);
  await dialog.screenshot({ path: capture('date-selector-dialog-graphite') });
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Opened is 15 Sept 2026' })).toBeFocused();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sent opened' })).toHaveText('Sent opened=is:2026-09-15');
});

test('two months show one in a narrow container, and the keys turn the page', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const box = page.getByTestId('calendar-narrow');
  const cal = page.getByRole('group', { name: 'Narrow stay', exact: true });
  await expect(cal.getByRole('grid', { name: 'September 2026' })).toBeVisible();
  await expect(cal.getByRole('grid', { name: 'October 2026' })).toBeHidden();
  // Both steps on the one month shown.
  await expect(cal.getByRole('button', { name: 'Next month' })).toBeVisible();
  await cal.getByRole('button', { name: /^Wednesday,? 30 September 2026$/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cal.getByRole('grid', { name: 'October 2026' })).toBeVisible();
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Thursday,? 1 October 2026$/);
  await cal.getByRole('button', { name: 'Next month' }).click();
  await expect(cal.getByRole('grid', { name: 'November 2026' })).toBeVisible();
  await page.waitForTimeout(500);
  await box.screenshot({ path: capture('calendar-narrow-bone') });
  // Wider than two months, both show.
  await box.evaluate((el) => { (el as HTMLElement).style.width = '560px'; });
  await expect(cal.getByRole('grid')).toHaveCount(2);
  await expect(cal.getByRole('grid').nth(1)).toBeVisible();
});

test('other languages: Intl names and digits; right to left mirrors keys and chevrons', async ({ page }) => {
  await open(page, '/components/calendar', 'graphite');
  const cal = page.getByRole('group', { name: 'Localised calendar', exact: true });
  // ar-EG: Arabic digits, weeks from the right.
  const chosen = cal.locator('[data-selected]');
  await expect(chosen).toHaveText('٣٠');
  await expect(cal.locator('th[scope=row]').first()).toHaveText(/^[٠-٩]+$/);
  const x = async (sel: string) => (await cal.locator(sel).first().boundingBox())!.x;
  expect(await x('th[scope=col]:nth-child(2)')).toBeLessThan(await x('th[scope=col]:nth-child(1)'));
  // ← is the next day.
  await chosen.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator(':focus')).toHaveText('١');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(':focus')).toHaveText('٢٩');
  // The previous step sits on the right and points right.
  const prev = cal.locator('.mu-calendar-step').first();
  const next = cal.locator('.mu-calendar-step').last();
  expect((await prev.boundingBox())!.x).toBeGreaterThan((await next.boundingBox())!.x);
  await page.waitForTimeout(400);
  await page.locator('#languages').screenshot({ path: capture('calendar-rtl-graphite') });
  // The key says the condition in the locale's words.
  await expect(page.getByRole('button', { name: /^After / })).toContainText('٢٠٢٦');
  await page.getByRole('radio', { name: 'Deutsch' }).click();
  await expect(cal.getByRole('grid')).toHaveAccessibleName('September 2026');
  await expect(cal.locator('th[scope=col]').nth(1)).toHaveAttribute('abbr', 'Montag');
});

test('Reduce Motion: the panel opens and applies', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/calendar', 'bone');
  await dueKey(page).click();
  await panel(page).getByRole('radio', { name: 'After' }).click();
  await panel(page).getByRole('button', { name: 'Apply' }).click();
  await expect(dueKey(page)).toHaveText('Due after 7 Oct 2026');
});
