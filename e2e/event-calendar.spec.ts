import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Event calendar: the person's events on a week (days by hours) or a month. Pressed and moved, an event
// lifts and steps by the snap to another hour or day; its lower edge changes its end; keys do the same, out
// loud, in one commit; a failed save glides it back; a month day with too much says "+N more".
const demo = (page: Page, id: string) => page.getByTestId(id);
const cal = (page: Page, id: string) => demo(page, id).locator('.mu-event-calendar').first();
const event = (page: Page, id: string, key: string) => cal(page, id).locator(`[data-ec-event="${key}"]`);
const named = (page: Page, id: string, key: string) => event(page, id, key).getAttribute('aria-label');
const said = (page: Page, id: string) => cal(page, id).locator('.sr-only[aria-live]');
const hourPx = (page: Page, id: string) => cal(page, id).locator('.mu-event-calendar-hours').evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--mu-r-event-calendar-hour-height')));
const frame = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

/** Presses a point of an element, moves past the threshold, then by (dx, dy), and holds there. */
async function hold(page: Page, at: { x: number; y: number }, dx: number, dy: number) {
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x, at.y + 5, { steps: 2 });
  await page.mouse.move(at.x + dx, at.y + dy, { steps: 12 });
  await frame(page);
}

for (const colorway of COLORWAYS) {
  test(`an event dragged an hour later and a day on lands there, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/event-calendar', colorway);
    const review = event(page, 'event-calendar-play', 'review');
    await review.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await demo(page, 'event-calendar-play').screenshot({ path: capture(`event-calendar-week-${colorway}`) });
    expect(await named(page, 'event-calendar-play', 'review')).toMatch(/^Design review, Tuesday .*10:00.*11:00$/);
    const box = (await review.boundingBox())!;
    const col = await cal(page, 'event-calendar-play').locator('.mu-event-calendar-column').first().evaluate((el) => el.getBoundingClientRect().width);
    const h = await hourPx(page, 'event-calendar-play');
    await hold(page, { x: box.x + box.width / 2, y: box.y + 10 }, col, h - 5);
    await expect(cal(page, 'event-calendar-play')).toHaveAttribute('data-dragging', '');
    await expect(review).toHaveAttribute('data-lifted', '');
    await expect.poll(() => review.evaluate((el) => parseFloat(getComputedStyle(el).scale))).toBeGreaterThan(1.01);
    await page.waitForTimeout(300);
    await demo(page, 'event-calendar-play').screenshot({ path: capture(`event-calendar-held-${colorway}`) });
    await page.mouse.up();
    await expect(review).not.toHaveAttribute('data-lifted', '');
    expect(await named(page, 'event-calendar-play', 'review')).toMatch(/^Design review, Wednesday .*11:00.*12:00$/);
    await expect(said(page, 'event-calendar-play')).toHaveText(/^Design review, Wednesday .*11:00.*12:00\.$/);
  });

  test(`keys move an event by the snap, change its end, and keep it in one commit, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/event-calendar', colorway);
    const lunch = event(page, 'event-calendar-play', 'lunch');
    await lunch.scrollIntoViewIfNeeded();
    await lunch.focus();
    await page.keyboard.press('ArrowDown');
    await expect(said(page, 'event-calendar-play')).toHaveText(/^Lunch with Ana, Wednesday .*12:45.*13:45\.$/);
    await page.keyboard.press('Shift+ArrowDown');
    await expect(said(page, 'event-calendar-play')).toHaveText(/12:45.*14:00\.$/);
    await expect(lunch).toHaveAttribute('data-lifted', '');
    await page.keyboard.press('ArrowRight');
    await expect(said(page, 'event-calendar-play')).toHaveText(/^Lunch with Ana, Thursday .*12:45.*14:00\.$/);
    await expect(event(page, 'event-calendar-play', 'lunch')).toBeFocused();
    await page.waitForTimeout(300);
    await demo(page, 'event-calendar-play').screenshot({ path: capture(`event-calendar-keys-${colorway}`) });
    await page.keyboard.press('Enter');
    await expect(lunch).not.toHaveAttribute('data-lifted', '');
    expect(await named(page, 'event-calendar-play', 'lunch')).toMatch(/Thursday .*12:45.*14:00$/);
    // Escape puts a move back.
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Escape');
    await expect(said(page, 'event-calendar-play')).toHaveText(/^Put Lunch with Ana back, Thursday .*12:45.*14:00\.$/);
    expect(await named(page, 'event-calendar-play', 'lunch')).toMatch(/Thursday .*12:45.*14:00$/);
    // Enter on an event you haven't moved opens its details.
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toContainText('Taberna da Rua');
  });
}

test('the lower edge changes the end by the snap; a locked event refuses', async ({ page }) => {
  await open(page, '/components/event-calendar', 'bone');
  const call = event(page, 'event-calendar-play', 'call');
  await call.scrollIntoViewIfNeeded();
  const box = (await call.boundingBox())!;
  const h = await hourPx(page, 'event-calendar-play');
  await hold(page, { x: box.x + box.width / 2, y: box.y + box.height - 2 }, 0, h);
  await page.mouse.up();
  expect(await named(page, 'event-calendar-play', 'call')).toMatch(/09:00.*10:30$/);
  const press = event(page, 'event-calendar-play', 'press');
  await press.focus();
  await page.keyboard.press('ArrowDown');
  await expect(said(page, 'event-calendar-play')).toHaveText('Press run: catalogue can’t be moved.');
  expect(await named(page, 'event-calendar-play', 'press')).toMatch(/13:00.*16:00$/);
});

test('a failed save glides the event back, with a toast; the next save holds', async ({ page }) => {
  await open(page, '/components/event-calendar', 'graphite');
  const review = event(page, 'event-calendar-fails', 'review');
  await review.scrollIntoViewIfNeeded();
  const box = (await review.boundingBox())!;
  const h = await hourPx(page, 'event-calendar-fails');
  await hold(page, { x: box.x + box.width / 2, y: box.y + 10 }, 0, h * 2 - 5);
  await page.mouse.up();
  expect(await named(page, 'event-calendar-fails', 'review')).toMatch(/12:00.*13:00$/);
  await expect(cal(page, 'event-calendar-fails')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('Couldn’t move Design review', { exact: true })).toBeVisible();
  await expect(said(page, 'event-calendar-fails')).toHaveText(/^Couldn’t save\. Design review is back at Tuesday .*10:00.*11:00\.$/);
  expect(await named(page, 'event-calendar-fails', 'review')).toMatch(/10:00.*11:00$/);
  await expect(cal(page, 'event-calendar-fails')).not.toHaveAttribute('aria-busy', 'true');
  await page.waitForTimeout(300);
  await demo(page, 'event-calendar-fails').screenshot({ path: capture('event-calendar-rollback-graphite') });
  await review.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Design review moved', { exact: true })).toBeVisible();
  expect(await named(page, 'event-calendar-fails', 'review')).toMatch(/10:15.*11:15$/);
});

for (const colorway of COLORWAYS) {
  test(`the month runs bars across days and sends "+N more" to the day, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/event-calendar', colorway);
    const month = cal(page, 'event-calendar-month');
    await month.scrollIntoViewIfNeeded();
    const fair = event(page, 'event-calendar-month', 'fair');
    await expect(fair).toHaveCount(1);
    // Wednesday to Friday: three days wide, unless the week runs past the month's end.
    expect(await fair.evaluate((el) => (el as HTMLElement).style.gridColumn)).toMatch(/^\d+ \/ \d+$/);
    await page.waitForTimeout(300);
    await demo(page, 'event-calendar-month').screenshot({ path: capture(`event-calendar-month-${colorway}`) });
    const more = month.locator('.mu-event-calendar-more').first();
    await expect(more).toHaveText(/^\+\d+ more$/);
    await more.click();
    await expect(month).toHaveAttribute('data-view', 'day');
    await expect(month.locator('.mu-event-calendar-hours')).toBeVisible();
  });
}

test('right to left: the days run from the right and Left moves to the next day', async ({ page }) => {
  await open(page, '/components/event-calendar', 'bone');
  const heads = cal(page, 'event-calendar-rtl').locator('.mu-event-calendar-day-head');
  await heads.first().scrollIntoViewIfNeeded();
  const first = (await heads.first().boundingBox())!;
  const last = (await heads.last().boundingBox())!;
  expect(first.x).toBeGreaterThan(last.x);
  await page.waitForTimeout(300);
  await demo(page, 'event-calendar-rtl').screenshot({ path: capture('event-calendar-rtl-bone') });
  const lunch = event(page, 'event-calendar-rtl', 'lunch');
  const before = (await lunch.boundingBox())!;
  await lunch.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await lunch.boundingBox())!.x).toBeLessThan(before.x - 10);
});

test('Reduce Motion: a held event doesn’t scale and nothing glides', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/event-calendar', 'graphite');
  const review = event(page, 'event-calendar-play', 'review');
  await review.scrollIntoViewIfNeeded();
  const box = (await review.boundingBox())!;
  const h = await hourPx(page, 'event-calendar-play');
  await hold(page, { x: box.x + box.width / 2, y: box.y + 10 }, 0, h - 5);
  await expect(review).toHaveAttribute('data-lifted', '');
  expect(await review.evaluate((el) => parseFloat(getComputedStyle(el).scale))).toBe(1);
  await page.mouse.up();
  expect(await cal(page, 'event-calendar-play').evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.effect?.getKeyframes().some((k) => 'transform' in k)).length)).toBe(0);
});
