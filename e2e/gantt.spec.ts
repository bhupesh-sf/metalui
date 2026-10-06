import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Gantt: a plan against dates. A bar pressed and moved lifts and follows the hand while its slot, snapped to
// whole days, is a recess; it lands there. Its ends resize a day at a time. Keys move it a day (Shift its end,
// Alt Shift its start), said in a polite status, and commit once per burst. A locked bar refuses; a failed
// save puts the dates back with a toast.
const demo = (page: Page, id: string) => page.getByTestId(id);
const chart = (page: Page, id: string) => demo(page, id).locator('.mu-gantt');
const bar = (page: Page, id: string, task: string) => chart(page, id).locator(`[data-row="${task}"] .mu-gantt-bar`);
const said = (page: Page, id: string) => chart(page, id).getByRole('status');
const frame = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const day = (n: number) => { const t = new Date(); return fmt.format(new Date(t.getFullYear(), t.getMonth(), t.getDate() + n)); };
const DAY = 32; // scale.day

/** Presses the middle of a bar (or a point dx into it), moves by `by` px, and holds there. */
async function hold(page: Page, id: string, task: string, by: number, at: 'middle' | 'end' = 'middle') {
  await bar(page, id, task).scrollIntoViewIfNeeded();
  const b = (await bar(page, id, task).boundingBox())!;
  const x = at === 'end' ? b.x + b.width - 1 : b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + by, y, { steps: 12 });
  await frame(page);
}

for (const colorway of COLORWAYS) {
  test(`a bar lifts, follows the hand over its recess and lands in ${colorway}`, async ({ page }) => {
    await open(page, '/components/gantt', colorway);
    await demo(page, 'gantt-play').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await demo(page, 'gantt-play').screenshot({ path: capture(`gantt-rest-${colorway}`) });
    const layout = bar(page, 'gantt-play', 'layout');
    await expect(layout).toHaveAttribute('aria-label', `Layout, ${day(-3)} to ${day(6)}, 55% done`);
    await hold(page, 'gantt-play', 'layout', DAY * 2 + 6);
    await expect(layout).toHaveAttribute('data-lifted', '');
    await expect(chart(page, 'gantt-play')).toHaveAttribute('data-dragging', '');
    await expect(chart(page, 'gantt-play').locator('[data-row="layout"] .mu-gantt-slot')).toHaveCount(1);
    await expect(layout).toHaveAttribute('aria-label', `Layout, ${day(-1)} to ${day(8)}, 55% done`);
    await expect.poll(() => layout.evaluate((el) => parseFloat(getComputedStyle(el).scale))).toBeGreaterThan(1.01);
    await page.waitForTimeout(400);
    await demo(page, 'gantt-play').screenshot({ path: capture(`gantt-held-${colorway}`) });
    await page.mouse.up();
    await expect(layout).not.toHaveAttribute('data-lifted', '');
    await expect(chart(page, 'gantt-play').locator('.mu-gantt-slot')).toHaveCount(0);
    await expect(said(page, 'gantt-play')).toHaveText(`Layout, ${day(-1)} to ${day(8)}.`);
    // It lands into its box: the follow settles to nothing.
    await expect.poll(() => layout.evaluate((el) => getComputedStyle(el).translate)).toMatch(/^(none|0px)$/);
  });

  test(`keys move a bar, its end and its start, out loud, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/gantt', colorway);
    const copy = bar(page, 'gantt-play', 'copy');
    await copy.focus();
    await page.keyboard.press('ArrowRight');
    await expect(said(page, 'gantt-play')).toHaveText(`Copy and translation, ${day(1)} to ${day(10)}.`);
    await page.keyboard.press('Shift+ArrowRight');
    await expect(said(page, 'gantt-play')).toHaveText(`Copy and translation, ${day(1)} to ${day(11)}.`);
    await page.keyboard.press('Alt+Shift+ArrowLeft');
    await expect(said(page, 'gantt-play')).toHaveText(`Copy and translation, ${day(0)} to ${day(11)}.`);
    await expect(copy.locator('.mu-gantt-dates')).toHaveText(`${day(0)} – ${day(11)}`);
    await page.waitForTimeout(300);
    await demo(page, 'gantt-play').screenshot({ path: capture(`gantt-keys-${colorway}`) });
    // Escape before the burst commits puts it back.
    await page.keyboard.press('Escape');
    await expect(copy).toHaveAttribute('aria-label', `Copy and translation, ${day(0)} to ${day(9)}, 20% done`);
    // Down goes to the next bar: the milestone.
    await page.keyboard.press('ArrowDown');
    await expect(bar(page, 'gantt-play', 'proof')).toBeFocused();
    await expect(bar(page, 'gantt-play', 'proof')).toHaveAttribute('aria-label', `Proofs to client, milestone, ${day(10)}`);
    // A milestone has no length: Shift moves nothing.
    await page.keyboard.press('ArrowLeft');
    await expect(said(page, 'gantt-play')).toHaveText(`Proofs to client, ${day(9)}.`);
  });
}

test('an end resizes a day at a time and never passes the other', async ({ page }) => {
  await open(page, '/components/gantt', 'bone');
  await demo(page, 'gantt-play').scrollIntoViewIfNeeded();
  const print = bar(page, 'gantt-play', 'print');
  await hold(page, 'gantt-play', 'print', DAY * 3 + 4, 'end');
  await expect(print).toHaveAttribute('aria-label', `Print and bind, ${day(15)} to ${day(25)}, 0% done`);
  await page.mouse.up();
  // Pulled far past its start, the end stops on it: one day.
  await hold(page, 'gantt-play', 'print', -DAY * 30, 'end');
  await page.mouse.up();
  await expect(print).toHaveAttribute('aria-label', `Print and bind, ${day(15)} to ${day(15)}, 0% done`);
});

test('a locked bar refuses to move', async ({ page }) => {
  await open(page, '/components/gantt', 'bone');
  const press = bar(page, 'gantt-play', 'press');
  const before = await press.getAttribute('aria-label');
  await press.focus();
  await page.keyboard.press('ArrowRight');
  await expect(said(page, 'gantt-play')).toHaveText('Press check can’t be moved.');
  await demo(page, 'gantt-play').scrollIntoViewIfNeeded();
  await hold(page, 'gantt-play', 'press', DAY * 2);
  await page.mouse.up();
  await expect(press).toHaveAttribute('aria-label', before!);
  await expect(press).not.toHaveAttribute('data-lifted', '');
});

test('a failed save puts the dates back, with a toast; the next save holds', async ({ page }) => {
  await open(page, '/components/gantt', 'graphite');
  await demo(page, 'gantt-fails').scrollIntoViewIfNeeded();
  const shoot = bar(page, 'gantt-fails', 'shoot');
  const before = await shoot.getAttribute('aria-label');
  await hold(page, 'gantt-fails', 'shoot', DAY * 2 + 4);
  await page.mouse.up();
  await expect(chart(page, 'gantt-fails')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('Couldn’t move Product shoot', { exact: true })).toBeVisible();
  await expect(said(page, 'gantt-fails')).toHaveText(`Couldn’t save. Product shoot is back at ${day(-7)} to ${day(-2)}.`);
  await expect(shoot).toHaveAttribute('aria-label', before!);
  await expect(chart(page, 'gantt-fails')).not.toHaveAttribute('aria-busy', 'true');
  await shoot.focus();
  await page.keyboard.press('ArrowRight');
  await shoot.blur();
  await expect(chart(page, 'gantt-fails')).toHaveAttribute('aria-busy', 'true');
  await expect(chart(page, 'gantt-fails')).not.toHaveAttribute('aria-busy', 'true');
  await expect(shoot).toHaveAttribute('aria-label', `Product shoot, ${day(-6)} to ${day(-1)}, 100% done`);
});

test('the scale changes the header and the width of a day; the bars keep their dates', async ({ page }) => {
  await open(page, '/components/gantt', 'bone');
  await demo(page, 'gantt-zoom').scrollIntoViewIfNeeded();
  const layout = bar(page, 'gantt-zoom', 'layout');
  const label = await layout.getAttribute('aria-label');
  const width = async () => (await layout.boundingBox())!.width;
  const week = await width();
  expect(week).toBeCloseTo(10 * 16, 0);
  await page.getByRole('radio', { name: 'Months' }).click();
  await expect(chart(page, 'gantt-zoom')).toHaveAttribute('data-scale', 'month');
  await expect.poll(width).toBeCloseTo(10 * 4, 0);
  await expect(layout).toHaveAttribute('aria-label', label!);
  await page.waitForTimeout(300);
  await demo(page, 'gantt-zoom').screenshot({ path: capture('gantt-month-bone') });
  await page.getByRole('radio', { name: 'Weeks' }).click();
  await page.waitForTimeout(300);
  await demo(page, 'gantt-zoom').screenshot({ path: capture('gantt-week-bone') });
});

test('under Reduce Motion a held bar does not grow and lands at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/gantt', 'graphite');
  await demo(page, 'gantt-play').scrollIntoViewIfNeeded();
  const layout = bar(page, 'gantt-play', 'layout');
  await hold(page, 'gantt-play', 'layout', DAY + 10);
  await expect(layout).toHaveAttribute('data-lifted', '');
  expect(await layout.evaluate((el) => parseFloat(getComputedStyle(el).scale))).toBe(1);
  await page.mouse.up();
  await frame(page);
  expect(await layout.evaluate((el) => getComputedStyle(el).translate)).toMatch(/^(none|0px)$/);
});
