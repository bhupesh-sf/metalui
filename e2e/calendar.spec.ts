import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Calendar: choose by click or keys; keys past the month turn it; the thumb glides to a new day; the
// date picker opens it, chooses, closes and names the day.
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(2026, 8, 30, 10)); });
const cal = (page: import('@playwright/test').Page) => page.getByRole('group', { name: 'Trip day', exact: true });

for (const colorway of COLORWAYS) {
  test(`chooses by click and keys, and turns months, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/calendar', colorway);
    const grid = cal(page).getByRole('grid', { name: 'September 2026' });
    await expect(grid).toBeVisible();
    await expect(grid.getByRole('button', { name: /^Wednesday,? 30 September 2026$/ })).toHaveAttribute('aria-current', 'date');
    // Weeks start on Monday in en-GB.
    await expect(grid.locator('th').first()).toHaveAttribute('abbr', 'Monday');
    await grid.getByRole('button', { name: /^Tuesday,? 15 September 2026$/ }).click();
    await expect(grid.getByRole('gridcell', { selected: true })).toHaveText('15');

    await grid.getByRole('button', { name: /^Tuesday,? 15 September 2026$/ }).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(cal(page).getByRole('grid', { name: 'October 2026' })).toBeVisible();
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Tuesday,? 6 October 2026$/);
    await page.keyboard.press('Enter');
    await expect(cal(page).getByRole('gridcell', { selected: true })).toHaveText('6');
    await page.keyboard.press('PageUp');
    await expect(cal(page).getByRole('grid', { name: 'September 2026' })).toBeVisible();
    // The chosen 6 October shows among September's trailing days, raised.
    await expect(cal(page).locator('[data-selected]')).toHaveAttribute('aria-label', /6 October 2026/);
    await page.waitForTimeout(600);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`calendar-${colorway}`) });
  });
}

test('a day of the next month is chosen by a pointer press, and the month turns to it', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const sept = cal(page).getByRole('grid', { name: 'September 2026' });
  // 2 October shows among September's trailing days; a real press (down, focus, up, click) chooses it.
  await sept.getByRole('button', { name: /^Friday,? 2 October 2026$/ }).click();
  const oct = cal(page).getByRole('grid', { name: 'October 2026' });
  await expect(oct).toBeVisible();
  await expect(oct.locator('[data-selected]')).toHaveAttribute('aria-label', /^Friday,? 2 October 2026$/);
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Friday,? 2 October 2026$/);
});

test('a chosen day lands into the thumb, and a later month comes from the right', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const grid = cal(page).getByRole('grid', { name: 'September 2026' });
  const scales = await grid.evaluate(async (table) => {
    const day = [...table.querySelectorAll('button')].find((b) => /^Thursday,? 3 September 2026$/.test(b.getAttribute('aria-label') ?? ''))!;
    day.click();
    const out: number[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => { const s = getComputedStyle(day).scale; out.push(s === 'none' ? 1 : parseFloat(s)); if (performance.now() - t0 < 600) requestAnimationFrame(frame); else done(); };
      requestAnimationFrame(frame);
    });
    return out;
  });
  expect(Math.min(...scales)).toBeLessThan(0.97);
  expect(scales.at(-1)).toBeCloseTo(1, 2);
  await cal(page).getByRole('button', { name: 'Next month' }).click();
  await expect(cal(page).getByRole('grid', { name: 'October 2026' })).toHaveClass(/calendar-arrive-later/);
  await cal(page).getByRole('button', { name: 'Previous month' }).click();
  await expect(cal(page).getByRole('grid', { name: 'September 2026' })).toHaveClass(/calendar-arrive-earlier/);
});

test('the date picker opens on today, chooses and closes', async ({ page }) => {
  await open(page, '/components/calendar', 'bone');
  const picker = page.getByRole('button', { name: /^Due date: none chosen$/ });
  await picker.click();
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Wednesday,? 30 September 2026$/);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /^Due date: 1 Oct 2026$/ })).toBeFocused();
  await expect(page.getByRole('grid', { name: /October 2026/ })).toHaveCount(0);
});
