import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Cues you can operate, the Should tier: days slide (a held press opens the calendar, the pick writes back as
// words), states rotate (wrapping, the neighbours peek while held), colours turn, durations change unit,
// tags and people are swapped from a combobox, the hover line and the first-time hint. One undo step each.

const rotate = (page: Page) => page.getByTestId('rotate-demo');
const pickDemo = (page: Page) => page.getByTestId('pick-demo');
const opacity = (l: Locator) => l.evaluate((el) => Number(getComputedStyle(el).opacity));

/** Presses at the cue's centre and drags by (dx, dy), up for a positive dy, a point at a time. */
async function drag(page: Page, cue: Locator, dy: number, dx = 0) {
  await cue.scrollIntoViewIfNeeded();
  const box = (await cue.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 1; i <= n; i++) await page.mouse.move(x + (dx * i) / n, y - (dy * i) / n);
}

for (const colorway of COLORWAYS) {
  test(`days, states and colours turn in place in ${colorway}`, async ({ page }) => {
    await open(page, '/components/cue', colorway);
    const demo = rotate(page);
    const source = page.getByTestId('rotate-source');

    // A state rotates: Space and the arrows step, wrapping round; each is one undo step.
    const status = demo.getByRole('spinbutton', { name: 'Status' });
    await expect(status).toHaveAttribute('aria-valuetext', '#doing');
    await expect(status).toHaveAttribute('aria-valuemax', '3');
    await status.focus();
    await page.keyboard.press('Space');
    await expect(status).toHaveAttribute('aria-valuetext', '#done');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(status).toHaveAttribute('aria-valuetext', '#todo');
    await page.keyboard.press('ArrowDown');
    await expect(source).toHaveText('Ship the poster #dropped tomorrow 4pm, in #FF6B3D');

    // Dragging it: the neighbours peek above and below only while held; one detent per enum.pixels (16).
    const peeks = status.locator('.mu-cue-scrub-peek');
    expect(await opacity(peeks.first())).toBe(0);
    await drag(page, status, 16);
    await expect(status).toHaveAttribute('aria-valuetext', '#todo');
    await expect(peeks.first()).toHaveText('#doing');
    await expect(peeks.last()).toHaveText('#dropped');
    await expect.poll(() => opacity(peeks.first())).toBeCloseTo(0.4, 2);
    await page.locator('section#rotate').screenshot({ path: capture(`cues-operate-rotate-${colorway}`) });
    await page.mouse.up();
    await expect.poll(() => opacity(peeks.first())).toBe(0);
    await expect(page.getByText('5 undo steps ·', { exact: false })).toBeVisible();

    // A day slides: tomorrow → Thursday (Tue 29 Sep is today here), the resolved day riding in the chip.
    const day = demo.getByRole('spinbutton', { name: 'Day' });
    await day.focus();
    await page.keyboard.press('ArrowUp');
    await expect(day).toHaveAttribute('aria-valuetext', 'Thursday');
    await expect(day).toHaveAttribute('data-chip', 'THU 1 OCT');
    await page.keyboard.press('Shift+ArrowUp');
    await expect(day).toHaveAttribute('aria-valuetext', 'next Thursday');
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowDown');
    await expect(day).toHaveAttribute('aria-valuetext', 'yesterday');
    await page.keyboard.press('ArrowDown');
    await expect(day).toHaveAttribute('aria-valuetext', 'Sun 27 Sep');

    // A held press asks for the host's calendar, opened from the words; the chosen day comes back as words when words can say it.
    await expect(day).toHaveAttribute('aria-keyshortcuts', /Enter/);
    await expect(demo.getByRole('spinbutton', { name: 'Status' })).not.toHaveAttribute('aria-keyshortcuts', /Enter/);
    await drag(page, day, 0);
    const calendar = page.getByRole('dialog', { name: 'Choose day' });
    await expect(calendar).toBeVisible();
    await page.mouse.up();
    await expect(calendar).toBeVisible();
    await page.screenshot({ path: capture(`cues-operate-calendar-${colorway}`) });
    await calendar.getByRole('button', { name: /Friday, October 2/ }).click();
    await expect(calendar).toBeHidden();
    await expect(day).toHaveAttribute('aria-valuetext', 'Friday');
    await expect(day).toBeFocused();
    // Enter opens it from the keyboard; Esc leaves the words as they were.
    await page.keyboard.press('Enter');
    await expect(calendar).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(calendar).toBeHidden();
    await expect(day).toHaveAttribute('aria-valuetext', 'Friday');

    // A colour turns round the wheel; the swatch follows the words.
    const hex = demo.getByRole('spinbutton', { name: 'Colour' });
    await hex.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowUp');
    await expect(hex).toHaveAttribute('aria-valuetext', '#3DFF6B');
    await expect(hex).toHaveCSS('--mu-cue-hex', '#3DFF6B');
    // ⌘Z walks the steps back, one per press.
    await page.keyboard.press('ControlOrMeta+z');
    await expect(hex).toHaveAttribute('aria-valuetext', '#70FF3D');
  });

  test(`tags and people are swapped from a combobox in ${colorway}`, async ({ page }) => {
    await open(page, '/components/cue', colorway);
    const demo = pickDemo(page);
    const tag = demo.getByRole('button', { name: 'Tag, #poster' });
    await tag.click();
    const plate = page.getByRole('dialog', { name: 'Change tag' });
    await expect(plate).toBeVisible();
    await expect(plate.getByRole('combobox', { name: 'Tag' })).toBeFocused();
    const studio = page.getByRole('option', { name: '#studio' });
    await expect(studio).toBeVisible();
    await page.screenshot({ path: capture(`cues-operate-pick-${colorway}`) });
    await studio.click();
    await expect(plate).toBeHidden();
    await expect(page.getByTestId('pick-source')).toHaveText('Send #studio to Sam');
    await expect(demo.getByRole('button', { name: 'Tag, #studio' })).toBeFocused();

    // From the keyboard: Enter opens, typing narrows, Enter picks.
    const who = demo.getByRole('button', { name: 'Person, Sam' });
    await who.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Change person' })).toBeVisible();
    await page.keyboard.type('Ana');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('pick-source')).toHaveText('Send #studio to Ana');
    await expect(page.getByText('2 undo steps ·', { exact: false })).toBeVisible();
    // Esc leaves the words.
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('pick-source')).toHaveText('Send #studio to Ana');
  });
}

test('a duration changes unit on U and a sideways drag', async ({ page }) => {
  await open(page, '/components/cue', 'bone');
  const dur = page.getByTestId('scrub-demo').getByRole('spinbutton', { name: 'Duration' });
  await dur.focus();
  await page.keyboard.press('u');
  await expect(dur).toHaveAttribute('aria-valuetext', '90 min');
  await expect(dur).toHaveAttribute('aria-valuenow', '90');
  await drag(page, dur, 0, 30);
  await expect(dur).toHaveAttribute('aria-valuetext', '1h30');
  await page.mouse.up();
  await expect(page.getByText('2 undo steps ·', { exact: false })).toBeVisible();
  // Minutes step as minutes.
  await page.keyboard.press('u');
  await page.keyboard.press('ArrowUp');
  await expect(dur).toHaveAttribute('aria-valuetext', '95 min');
});

test('the line thickens on hover and the first hover says how, once', async ({ page }) => {
  await open(page, '/components/cue', 'bone');
  const sleep = page.getByTestId('scrub-demo').getByRole('spinbutton', { name: 'Sleep' });
  const amount = page.getByTestId('scrub-demo').getByRole('spinbutton', { name: 'Amount' });
  const line = (cue: Locator) => cue.locator('.mu-cue-words').evaluate((el) => getComputedStyle(el, '::before').scale);
  expect(await line(sleep)).toBe('none');
  await expect(sleep).toHaveAttribute('data-label', 'Sleep');
  await sleep.hover();
  await expect(sleep).toHaveAttribute('data-label', 'Drag to change');
  await expect.poll(() => line(sleep)).toBe('1 2');
  const b = (await sleep.boundingBox())!;
  await page.screenshot({ path: capture('cues-operate-hint-bone'), clip: { x: b.x - 60, y: b.y - 40, width: b.width + 120, height: b.height + 60 } });
  await amount.hover();
  await expect(sleep).toHaveAttribute('data-label', 'Sleep');
  await expect(amount).toHaveAttribute('data-label', 'Amount');
  await sleep.hover();
  await expect(sleep).toHaveAttribute('data-label', 'Sleep');
});

test('Reduce Motion: the peeks come and go at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/cue', 'bone');
  const status = rotate(page).getByRole('spinbutton', { name: 'Status' });
  const peek = status.locator('.mu-cue-scrub-peek').first();
  await drag(page, status, 16);
  await expect(status).toHaveAttribute('aria-valuetext', '#done');
  expect(await opacity(peek)).toBeCloseTo(0.4, 2);
  await page.mouse.up();
  await expect.poll(() => opacity(peek), { intervals: [16] }).toBe(0);
});
