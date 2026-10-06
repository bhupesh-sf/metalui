import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Time picker, one slice per job: typed and read back with the part of the day, dialled by part, chosen
// from slots (scrolled and focused on the chosen one, arrows move the latch, a press closes), Now, a start
// and an end with lengths, opening hours with quiet slots and a zone, a window across midnight, a date and
// a time together, in a form, and Reduce Motion. The clock is fixed at Wednesday 30 September 2026, 10:00.
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(2026, 8, 30, 10)); });

const section = (page: Page, id: string) => page.locator(`#${id}`);
const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const selected = (page: Page) => page.locator(':focus').evaluate((el: HTMLInputElement) => el.value.slice(el.selectionStart!, el.selectionEnd!));

for (const colorway of COLORWAYS) {
  test(`types, reads back, dials and chooses from slots in ${colorway}`, async ({ page }) => {
    await open(page, '/components/time-picker', colorway);
    const field = page.getByRole('textbox', { name: 'Start', exact: true });
    await expect(field).toHaveValue('09:30');
    // Typed words are read back with their part of the day, and written in the reader's words on leaving.
    await field.fill('230p');
    const readback = playground(page).locator('.mu-form-field-readback');
    await expect(readback).toContainText('2:30 in the afternoon');
    await field.press('Tab');
    await expect(field).toHaveValue('14:30');
    await expect(playground(page).getByText('value="14:30"')).toBeVisible();
    // ↑ on the minutes lands on the next slot and selects the minutes; on the hour, the hour.
    await field.focus();
    await field.evaluate((el: HTMLInputElement) => el.setSelectionRange(4, 4));
    await page.keyboard.press('ArrowUp');
    await expect(field).toHaveValue('14:45');
    expect(await selected(page)).toBe('45');
    await field.evaluate((el: HTMLInputElement) => el.setSelectionRange(0, 0));
    await page.keyboard.press('ArrowDown');
    await expect(field).toHaveValue('13:45');
    expect(await selected(page)).toBe('13');
    // Alt ↓ opens the slots on the chosen one; arrows move the latch and the field follows; Enter closes.
    await page.keyboard.press('Alt+ArrowDown');
    const slots = page.getByRole('radiogroup', { name: 'Times' });
    await expect(slots.getByRole('radio', { name: '13:45' })).toBeFocused();
    await expect(slots.getByRole('radio', { name: '13:45' })).toHaveAttribute('aria-checked', 'true');
    const scroller = page.locator('.mu-time-picker-slots');
    expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await page.keyboard.press('ArrowRight');
    await expect(field).toHaveValue('14:00');
    await page.waitForTimeout(500);
    await page.locator('.mu-popover').screenshot({ path: capture(`time-picker-slots-${colorway}`) });
    await page.keyboard.press('Enter');
    await expect(page.locator('.mu-popover')).toHaveCount(0);
    await expect(field).toBeFocused();
    // A press chooses and closes; Now writes now.
    await page.getByRole('button', { name: 'Choose a time' }).first().click();
    await slots.getByRole('radio', { name: '16:15' }).click();
    await expect(field).toHaveValue('16:15');
    await expect(page.locator('.mu-popover')).toHaveCount(0);
    await page.getByRole('button', { name: 'Choose a time' }).first().click();
    await page.locator('.mu-popover').getByRole('button', { name: 'Now' }).click();
    await expect(field).toHaveValue('10:00');
    await page.waitForTimeout(300);
    await playground(page).screenshot({ path: capture(`time-picker-${colorway}`) });
  });
}

test('words that aren\'t a time are refused once you leave; clear empties it', async ({ page }) => {
  await open(page, '/components/time-picker', 'bone');
  const field = page.getByRole('textbox', { name: 'Start', exact: true });
  await field.fill('25:00');
  await field.press('Tab');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(playground(page).getByText('Enter a time like 14:30')).toBeVisible();
  await field.fill('7.05');
  await expect(playground(page).locator('.mu-form-field-readback')).toContainText('7:05 in the morning');
  await field.press('Tab');
  await expect(field).toHaveValue('07:05');
  await expect(field).not.toHaveAttribute('aria-invalid', 'true');
  await playground(page).getByRole('button', { name: 'Clear' }).click();
  await expect(field).toHaveValue('');
  await expect(playground(page).getByText('value=null')).toBeVisible();
});

test('a start and an end: the end says lengths, and moving the start keeps the length', async ({ page }) => {
  await open(page, '/components/time-picker', 'bone');
  const pair = section(page, 'pair');
  const start = pair.getByRole('textbox', { name: 'Starts' });
  const end = pair.getByRole('textbox', { name: 'Ends' });
  await expect(start).toHaveValue('2:00 PM');
  await expect(end).toHaveValue('3:00 PM');
  // A bare hour on a 12-hour clock is the working day's: 3 is the afternoon.
  await start.fill('3');
  await expect(pair.locator('.mu-form-field-readback').first()).toContainText('3:00 in the afternoon');
  await start.press('Tab');
  await expect(start).toHaveValue('3:00 PM');
  await expect(end).toHaveValue('4:00 PM');
  await pair.getByRole('button', { name: 'Choose a time' }).nth(1).click();
  const slots = page.getByRole('radiogroup', { name: 'Times' });
  await expect(slots.getByRole('radio').first()).toHaveText(/3:15\sPM\s*15 min/);
  await expect(slots.getByRole('radio', { name: /4:30\sPM/ })).toContainText('1 h 30');
  await slots.getByRole('radio', { name: /4:30\sPM/ }).click();
  await expect(end).toHaveValue('4:30 PM');
  // Before the start is refused.
  await end.fill('2pm');
  await end.press('Tab');
  await expect(end).toHaveAttribute('aria-invalid', 'true');
});

test('opening hours: slots inside them, booked ones quiet and said, a zone, and a refusal in words', async ({ page }) => {
  await open(page, '/components/time-picker', 'bone');
  const hours = section(page, 'hours');
  const field = hours.getByRole('textbox', { name: 'Collection' });
  await expect(hours.locator('.mu-field-suffix')).toHaveText(/WEST|GMT\+1/);
  await hours.getByRole('button', { name: 'Choose a time' }).click();
  const slots = page.getByRole('radiogroup', { name: 'Times' });
  await expect(slots.getByRole('radio')).toHaveCount(18);
  await expect(slots.getByRole('radio').first()).toHaveText('09:00');
  await expect(slots.getByRole('radio').last()).toHaveText('17:30');
  // Nothing chosen: focus goes to the slot nearest now (10:00).
  await expect(slots.getByRole('radio', { name: '10:00' })).toBeFocused();
  const lunch = slots.getByRole('radio', { name: '12:30' });
  await expect(lunch).toHaveAccessibleDescription(/^Unavailable/);
  await expect(slots.getByRole('radio', { name: '13:00' })).not.toHaveAccessibleDescription(/Unavailable/);
  const ink = (name: string) => slots.getByRole('radio', { name }).evaluate((el) => getComputedStyle(el).color);
  expect(await ink('12:30')).not.toBe(await ink('13:00'));
  await lunch.click();
  await expect(field).toHaveValue('12:30');
  await field.fill('8');
  await field.press('Tab');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(hours.getByText('Choose a time from 09:00 to 17:30')).toBeVisible();
});

test('across midnight: the slots run on past 23:30, and the dial stops at the window\'s end', async ({ page }) => {
  await open(page, '/components/time-picker', 'bone');
  const night = section(page, 'night');
  const field = night.getByRole('textbox', { name: 'Handover' });
  await night.getByRole('button', { name: 'Choose a time' }).click();
  const slots = page.getByRole('radiogroup', { name: 'Times' });
  await expect(slots.getByRole('radio')).toHaveCount(17);
  await expect(slots.getByRole('radio').first()).toHaveText('22:00');
  await expect(slots.getByRole('radio').last()).toHaveText('06:00');
  await page.keyboard.press('Escape');
  await field.fill('0530');
  await field.press('Tab');
  await expect(field).toHaveValue('05:30');
  await field.focus();
  await field.evaluate((el: HTMLInputElement) => el.setSelectionRange(0, 0));
  await page.keyboard.press('ArrowUp');
  await expect(field).toHaveValue('06:00');
  await field.fill('12:00');
  await field.press('Tab');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
});

test('a date and a time: one Date; a picked day keeps the time; a form sends both', async ({ page }) => {
  await open(page, '/components/time-picker', 'bone');
  const date = section(page, 'date');
  const day = date.getByRole('textbox', { name: 'Reminder' });
  const time = date.getByRole('textbox', { name: 'Time' });
  // A time typed before the day waits for it.
  await time.fill('1430');
  await time.press('Tab');
  await expect(time).toHaveValue('14:30');
  await expect(date.getByText('No reminder')).toBeVisible();
  await day.fill('7/10');
  await expect(date.getByText(/Wednesday,? 7 October 2026 at 14:30/)).toBeVisible();
  await date.getByRole('button', { name: 'Choose a day' }).click();
  await page.locator('.mu-popover').getByRole('button', { name: /^Friday,? 9 October 2026$/ }).click();
  await expect(date.getByText(/Friday,? 9 October 2026 at 14:30/)).toBeVisible();
  await time.fill('9');
  await expect(date.getByText(/Friday,? 9 October 2026 at 09:00/)).toBeVisible();

  const form = section(page, 'form');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form.getByText('Choose an opening time.')).toBeVisible();
  await form.getByRole('textbox', { name: 'Opens' }).fill('8.15');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form.getByRole('status')).toHaveText('Sent opens=08:15 at=2026-10-07T08:30');
});

test('Reduce Motion: the chosen slot latches at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/time-picker', 'graphite');
  await page.getByRole('button', { name: 'Choose a time' }).first().click();
  const key = page.getByRole('radiogroup', { name: 'Times' }).getByRole('radio', { name: '09:30' });
  await expect(key).toHaveAttribute('aria-checked', 'true');
  // The latch's travel rides the part spring, which Reduce Motion makes instant.
  expect(await key.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration.split(',')[0]))).toBeLessThan(0.01);
  await page.locator('.mu-popover').screenshot({ path: capture('time-picker-reduced-graphite') });
});
