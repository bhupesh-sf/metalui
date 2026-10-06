import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Calendar and date picker, one slice per job: choose by click and keys, turn months, ranges (preview,
// reach, the stretched thumb), several days, periods, weeks, marks, limits, jumping levels, a controlled
// month, the date picker (typed, read back, dialled, cleared, opened, presets, in a form), quiet days and
// Reduce Motion. The clock is fixed at Wednesday 30 September 2026.
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(2026, 8, 30, 10)); });
const group = (page: Page, name: string) => page.getByRole('group', { name, exact: true });
const day = (scope: Locator, name: RegExp) => scope.getByRole('button', { name });
/** Samples a style every frame for a while, in the page. */
const sample = (el: Locator, prop: 'scale' | 'opacity', ms = 500) => el.evaluate(async (node, [p, t]) => {
  const out: number[] = [];
  const t0 = performance.now();
  await new Promise<void>((done) => {
    const frame = () => { const v = getComputedStyle(node)[p as 'scale']; out.push(v === 'none' ? 1 : parseFloat(v.split(' ').at(-1)!)); if (performance.now() - t0 < (t as number)) requestAnimationFrame(frame); else done(); };
    requestAnimationFrame(frame);
  });
  return out;
}, [prop, ms] as const);

for (const colorway of COLORWAYS) {
  test(`chooses by click and keys, and turns months, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/calendar', colorway);
    const cal = group(page, 'Trip day');
    const grid = cal.getByRole('grid', { name: 'September 2026' });
    await expect(grid).toBeVisible();
    await expect(day(grid, /^Wednesday,? 30 September 2026$/)).toHaveAttribute('aria-current', 'date');
    // Weeks start on Monday in en-GB.
    await expect(grid.locator('th').first()).toHaveAttribute('abbr', 'Monday');
    await day(grid, /^Tuesday,? 15 September 2026$/).click();
    await expect(grid.getByRole('gridcell', { selected: true })).toHaveText('15');

    await day(grid, /^Tuesday,? 15 September 2026$/).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await expect(cal.getByRole('grid', { name: 'October 2026' })).toBeVisible();
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Tuesday,? 6 October 2026$/);
    await page.keyboard.press('Enter');
    await expect(cal.getByRole('gridcell', { selected: true })).toHaveText('6');
    await page.keyboard.press('PageUp');
    await expect(cal.getByRole('grid', { name: 'September 2026' })).toBeVisible();
    // The chosen 6 October shows among September's trailing days, raised.
    await expect(cal.locator('[data-selected]')).toHaveAttribute('aria-label', /6 October 2026/);
    // The steps are the set's chevrons, not hand-drawn glyphs.
    await expect(cal.getByRole('button', { name: 'Next month' }).locator('svg.mu-ic-chevron')).toHaveCount(1);
    await page.waitForTimeout(600);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`calendar-${colorway}`) });
  });

  test(`a range stretches one thumb across the weeks, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/calendar', colorway);
    const stay = group(page, 'Stay');
    const oct = stay.getByRole('grid', { name: 'October 2026' });
    // Two months side by side; days before min (today) are disabled; outside days are left out.
    await expect(stay.getByRole('grid')).toHaveCount(2);
    await expect(day(stay, /^Tuesday,? 29 September 2026$/)).toBeDisabled();
    await expect(day(oct, /September/)).toHaveCount(0);
    await day(oct, /^Monday,? 5 October 2026$/).click();
    // The first end lands alone; until the second, the stretch to the pointer shows sunken.
    await expect(oct.locator('[data-selected]')).toHaveCount(1);
    await day(oct, /^Monday,? 12 October 2026$/).hover();
    await expect(oct.locator('.mu-calendar-band.recipe-switcher')).toHaveCount(2);
    // maxDays 15: the 20th is out of reach; the 19th is not.
    await expect(day(oct, /^Tuesday,? 20 October 2026$/)).toBeDisabled();
    await expect(day(oct, /^Monday,? 19 October 2026$/)).toBeEnabled();
    await day(oct, /^Monday,? 12 October 2026$/).click();
    await expect(oct.getByRole('gridcell', { selected: true })).toHaveCount(8);
    // One raised run per week: 5–11 (open at its end), then 12 (open at its start).
    const bands = oct.locator('.mu-calendar-band.recipe-switcher-thumb');
    await expect(bands).toHaveCount(2);
    await expect(bands.first()).toHaveAttribute('data-open-end', '');
    await expect(bands.first()).not.toHaveAttribute('data-open-start', '');
    await expect(bands.nth(1)).toHaveAttribute('data-open-start', '');
    const widths = await bands.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
    expect(widths[0]).toBeGreaterThan(widths[1] * 6);
    await expect(page.getByText('5 Oct 2026 – 12 Oct 2026 · 7 nights')).toBeVisible();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);
    await stay.screenshot({ path: capture(`calendar-range-${colorway}`) });
  });
}

test('a day of the next month is chosen by a pointer press, and the month turns to it', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const cal = group(page, 'Trip day');
  await day(cal.getByRole('grid', { name: 'September 2026' }), /^Friday,? 2 October 2026$/).click();
  const oct = cal.getByRole('grid', { name: 'October 2026' });
  await expect(oct).toBeVisible();
  await expect(oct.locator('[data-selected]')).toHaveAttribute('aria-label', /^Friday,? 2 October 2026$/);
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Friday,? 2 October 2026$/);
});

test('a chosen day lands into the thumb, and a later month comes from the right', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const cal = group(page, 'Trip day');
  const target = day(cal, /^Thursday,? 3 September 2026$/);
  await target.click();
  const scales = await sample(target, 'scale', 600);
  expect(Math.min(...scales)).toBeLessThan(0.97);
  expect(scales.at(-1)).toBeCloseTo(1, 2);
  await cal.getByRole('button', { name: 'Next month' }).click();
  await expect(cal.getByRole('grid', { name: 'October 2026' })).toHaveClass(/calendar-arrive-later/);
  await cal.getByRole('button', { name: 'Previous month' }).click();
  await expect(cal.getByRole('grid', { name: 'September 2026' })).toHaveClass(/calendar-arrive-earlier/);
});

test('several days: each stands raised, and pressing one again lets it go', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const cal = group(page, 'Shoot days');
  const grid = cal.getByRole('grid', { name: 'September 2026' });
  await expect(grid).toHaveAttribute('aria-multiselectable', 'true');
  for (const n of [3, 10, 17]) await grid.getByRole('button', { name: new RegExp(`^\\w+,? ${n} September 2026$`) }).click();
  await expect(grid.locator('[data-selected]')).toHaveCount(3);
  await day(grid, /^Thursday,? 10 September 2026$/).click();
  await expect(grid.getByRole('gridcell', { selected: true })).toHaveText(['3', '17']);
});

test('periods: quarters in the same footprint, chosen as a range of whole quarters', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const cal = group(page, 'Reporting period');
  const grid = cal.getByRole('grid', { name: '2026' });
  await expect(grid.getByRole('button')).toHaveCount(4);
  await expect(day(grid, /^Q3 2026, July to September$/)).toHaveAttribute('aria-current', 'date');
  const box = await grid.boundingBox();
  await day(grid, /^Q2 2026/).click();
  await day(grid, /^Q3 2026/).click();
  await expect(page.getByText('1 Apr 2026 – 30 Sept 2026')).toBeVisible();
  // Months: twelve, in the same box as a month of days.
  await page.getByRole('radio', { name: 'Month' }).click();
  const months = cal.getByRole('grid', { name: '2026' });
  await expect(months.getByRole('button')).toHaveCount(12);
  const day2 = await group(page, 'Trip day').getByRole('grid').boundingBox();
  const mbox = await months.boundingBox();
  expect(Math.abs(mbox!.width - day2!.width)).toBeLessThan(1);
  expect(Math.abs(mbox!.height - day2!.height)).toBeLessThan(1);
  expect(Math.abs(box!.height - mbox!.height)).toBeLessThan(1);
  await page.getByRole('radio', { name: 'Year' }).click();
  await expect(cal.getByRole('grid', { name: '2020 – 2029' }).getByRole('button')).toHaveCount(12);
});

test('weeks: the host sets the first day, and ISO week numbers lead each row', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const grid = group(page, 'Sprint day').getByRole('grid', { name: 'September 2026' });
  await expect(grid.locator('thead th[abbr]').first()).toHaveAttribute('abbr', 'Sunday');
  await expect(grid.getByRole('rowheader')).toHaveCount(6);
  await expect(grid.getByRole('rowheader').first()).toHaveAccessibleName('Week 36');
});

test('marked days carry a dot and say what is on them', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const grid = group(page, 'Schedule').getByRole('grid', { name: 'September 2026' });
  await expect(day(grid, /^Monday,? 14 September 2026$/)).toHaveAccessibleDescription('Invoice due');
  await expect(grid.locator('.mu-calendar-mark')).toHaveCount(5);
  await expect(grid.locator('.mu-calendar-mark[data-tone="red"]')).toHaveCount(1);
  // Today's lamp and a mark sit side by side.
  const today = day(grid, /^Wednesday,? 30 September 2026$/);
  await expect(today).toHaveAccessibleDescription('Launch');
  const lamp = await today.evaluate((b) => getComputedStyle(b, '::after').translate);
  expect(lamp).not.toBe('none');
});

test('min and max: out of range is disabled, the steps stop, and a typed day outside is refused', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const cal = group(page, 'Delivery');
  await expect(day(cal, /^Thursday,? 1 October 2026$/)).toBeDisabled();
  await expect(day(cal, /^Friday,? 2 October 2026$/)).toBeEnabled();
  await expect(cal.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  await cal.getByRole('button', { name: 'Next month' }).click();
  await cal.getByRole('button', { name: 'Next month' }).click();
  await expect(cal.getByRole('button', { name: 'Next month' })).toBeDisabled();
  const field = page.getByRole('textbox', { name: 'Delivery' });
  await field.fill('1/10');
  await field.blur();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(/Choose a day from 2 Oct 2026 to 14 Nov 2026/)).toBeVisible();
});

test('the title opens months and years; choosing goes back down, Esc goes back', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const cal = group(page, 'Birthday');
  await cal.getByRole('button', { name: 'June 1990, choose a month' }).click();
  const year = cal.getByRole('grid', { name: '1990' });
  await expect(year).toHaveClass(/calendar-zoom-out/);
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', 'June 1990');
  await cal.getByRole('button', { name: '1990, choose a year' }).click();
  await expect(cal.getByRole('grid', { name: '1990 – 1999' })).toBeVisible();
  await cal.getByRole('button', { name: '1994', exact: true }).click();
  await cal.getByRole('button', { name: 'March 1994', exact: true }).click();
  const march = cal.getByRole('grid', { name: 'March 1994' });
  await expect(march).toHaveClass(/calendar-zoom-in/);
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^\w+,? 1 March 1994$/);
  await cal.getByRole('button', { name: 'March 1994, choose a month' }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(cal.getByRole('grid', { name: 'March 1994' })).toBeVisible();
});

test('a controlled month turns from outside', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const cal = group(page, 'Booking');
  await page.getByRole('button', { name: 'December', exact: true }).click();
  await expect(cal.getByRole('grid', { name: 'December 2026' })).toBeVisible();
  await cal.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByText('Showing November 2026')).toBeVisible();
});

test('the date picker opens on today, chooses, closes and gives focus back to the field', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const field = page.getByRole('textbox', { name: 'Due date' });
  await expect(field).toHaveAttribute('placeholder', 'dd/mm/yyyy');
  await page.getByRole('button', { name: 'Choose a day' }).first().click();
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Wednesday,? 30 September 2026$/);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('1 Oct 2026');
  await expect(field).toBeFocused();
  await expect(page.locator('.mu-popover')).toHaveCount(0);
  // Alt ↓ opens it from the field; Today chooses today.
  await page.keyboard.press('Alt+ArrowDown');
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(field).toHaveValue('30 Sept 2026');
});

test('typed dates are read back, written in the reader\'s words, dialled by segment and cleared', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const field = page.getByRole('textbox', { name: 'Due date' });
  await field.click();
  await field.pressSequentially('7/10');
  const readback = page.locator('.mu-form-field-readback').first();
  await expect(readback).toContainText('Wed, 7 Oct 2026');
  await field.press('Tab');
  await expect(field).toHaveValue('7 Oct 2026');
  await expect(readback).toHaveAttribute('data-ending-style', '');
  // ↑ on the month steps the month and selects it.
  await field.focus();
  await field.evaluate((el: HTMLInputElement) => el.setSelectionRange(3, 3));
  await page.keyboard.press('ArrowUp');
  await expect(field).toHaveValue('7 Nov 2026');
  expect(await field.evaluate((el: HTMLInputElement) => el.value.slice(el.selectionStart!, el.selectionEnd!))).toBe('Nov');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(field).toHaveValue('7 Sept 2026');
  // Words that aren't a date: the invalid ring once you leave.
  await field.fill('31/02');
  await field.press('Tab');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await field.fill('2026-10-07');
  await expect(readback).toContainText('Wed, 7 Oct 2026');
  await page.locator('.mu-date-picker').first().getByRole('button', { name: 'Clear' }).click();
  await expect(field).toHaveValue('');
});

test('a range picker types and opens a range, with presets beside the calendar', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const field = page.getByRole('textbox', { name: 'Report period' });
  await field.fill('1/9 – 7/9');
  await field.press('Tab');
  await expect(field).toHaveValue(/^1\s?–\s?7 Sept 2026$/);
  await page.getByRole('button', { name: 'Choose dates' }).click();
  const presets = page.getByRole('group', { name: 'Presets' });
  await presets.getByRole('button', { name: 'Last 7 days' }).click();
  await expect(field).toHaveValue(/^24\s?–\s?30 Sept 2026$/);
  await page.getByRole('button', { name: 'Choose dates' }).click();
  await expect(presets.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true');
  // Two months in the plate; the range is whole after the second press, and the plate closes.
  const plate = page.locator('.mu-popover');
  await expect(plate.getByRole('grid')).toHaveCount(2);
  await day(plate, /^Tuesday,? 1 September 2026$/).click();
  await expect(field).toHaveValue('1 Sept 2026 – ');
  await day(plate, /^Thursday,? 10 September 2026$/).click();
  await expect(plate).toHaveCount(0);
  await expect(field).toHaveValue(/^1\s?–\s?10 Sept 2026$/);
});

test('in a form: required, named as ISO 8601, and read-only', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const save = page.getByRole('button', { name: 'Save' });
  await save.click();
  await expect(page.getByText('Choose a deadline.')).toBeVisible();
  const field = page.getByRole('textbox', { name: 'Deadline' });
  await field.fill('7 oct');
  await save.click();
  await expect(page.getByRole('status').filter({ hasText: 'Sent' })).toHaveText('Sent due=2026-10-07');
  const created = page.getByRole('textbox', { name: 'Created' });
  await expect(created).toHaveAttribute('readonly', '');
  await expect(created).toHaveValue('12 Jan 2026');
  await expect(page.locator('input[type=hidden][name=created]')).toHaveValue('2026-01-12');
});

// Unavailable days are quiet and described as such, keep their names, and can still be chosen.
test('an unavailable day is quiet, said, and still chosen', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const cal = group(page, 'Studio day');
  const sat = cal.getByRole('button', { name: 'Saturday, 26 September 2026', exact: true });
  const fri = cal.getByRole('button', { name: 'Friday, 25 September 2026', exact: true });
  await expect(sat).toHaveAccessibleDescription('Unavailable');
  await expect(fri).toHaveAccessibleDescription('');
  const ink = (b: typeof sat) => b.evaluate((el) => getComputedStyle(el).color);
  expect(await ink(sat)).not.toBe(await ink(fri));
  await sat.click();
  await expect(sat).toHaveAttribute('data-selected', '');
});

test('Reduce Motion: the choice and the range land at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/calendar', 'bone');
  const cal = group(page, 'Trip day');
  const target = day(cal, /^Thursday,? 3 September 2026$/);
  await target.click();
  expect(Math.min(...(await sample(target, 'scale', 300)))).toBeGreaterThan(0.999);
  const oct = group(page, 'Stay').getByRole('grid', { name: 'October 2026' });
  await day(oct, /^Monday,? 5 October 2026$/).click();
  await day(oct, /^Wednesday,? 7 October 2026$/).click();
  const band = oct.locator('.mu-calendar-band.recipe-switcher-thumb');
  expect(Math.min(...(await sample(band, 'scale', 300)))).toBeGreaterThan(0.999);
});
