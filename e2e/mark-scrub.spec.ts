import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Mark scrub: a number, a duration or a time in the text, dragged or stepped in place. The words are the
// value (the source line rewrites), one undo step per gesture, the width held while dragging, the scale
// only while dragging, keys with Shift, limits refuse, Reduce Motion drops the drum's travel.

const source = (page: Page) => page.getByTestId('scrub-source');
const scaleOpacity = (cue: Locator) => cue.locator('.mu-cue-scrub-scale').evaluate((el) => Number(getComputedStyle(el).opacity));
const width = (cue: Locator) => cue.evaluate((el) => el.getBoundingClientRect().width);

/** Presses at the cue's centre and drags straight up by `dy` (down when negative), a point at a time. */
async function dragFrom(page: Page, cue: Locator, dy: number) {
  await cue.scrollIntoViewIfNeeded();
  const box = (await cue.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= Math.abs(dy); i++) await page.mouse.move(x, y - Math.sign(dy) * i);
  return { x, y };
}

for (const colorway of COLORWAYS) {
  test(`numbers scrub in place in ${colorway}`, async ({ page }) => {
    await open(page, '/components/cue', colorway);
    const demo = page.getByTestId('scrub-demo');
    const sleep = demo.getByRole('spinbutton', { name: 'Sleep' });
    await expect(sleep).toHaveAttribute('aria-valuenow', '6');
    await expect(sleep).toHaveAttribute('aria-valuetext', '6h');
    await expect(sleep).toHaveAttribute('aria-valuemax', '24');
    expect(await scaleOpacity(sleep)).toBe(0);

    // 12 points up at 4 a detent: three half hours. The scale shows only while dragging.
    const at = await dragFrom(page, sleep, 12);
    await expect(sleep).toHaveAttribute('aria-valuetext', '7.5h');
    await expect(source(page)).toHaveText('Send #poster tomorrow 4pm, 1h30 for $40, slept 7.5h');
    await expect.poll(() => scaleOpacity(sleep)).toBe(1);
    expect(await page.evaluate(() => getSelection()?.toString())).toBe('');
    await page.locator('section#scrub').screenshot({ path: capture(`mark-scrub-${colorway}`) });
    const b = (await sleep.boundingBox())!;
    await page.screenshot({ path: capture(`mark-scrub-scale-${colorway}`), clip: { x: b.x - 8, y: b.y - 10, width: b.width + 36, height: b.height + 20 } });

    // Back down to a narrower face in the same gesture: the width holds the widest it has been.
    const wide = await width(sleep);
    for (let i = 1; i <= 12; i++) await page.mouse.move(at.x, at.y - 12 + i);
    await expect(sleep).toHaveAttribute('aria-valuetext', '6h');
    expect(await width(sleep)).toBeGreaterThanOrEqual(wide - 0.5);
    await page.mouse.move(at.x, at.y - 4);
    await page.mouse.up();
    await expect(sleep).toHaveAttribute('aria-valuetext', '6.5h');
    await expect.poll(() => scaleOpacity(sleep)).toBe(0);
    // One gesture, one undo step, however many detents it passed.
    await expect(page.getByText('1 undo step ·', { exact: false })).toBeVisible();

    // Keys: a step, Shift's large step; each press is its own undo step; ⌘Z walks back.
    const time = demo.getByRole('spinbutton', { name: 'Time' });
    await time.focus();
    await page.keyboard.press('ArrowUp');
    await expect(time).toHaveAttribute('aria-valuetext', 'tomorrow 4:15pm');
    await page.keyboard.press('Shift+ArrowUp');
    await expect(time).toHaveAttribute('aria-valuetext', 'tomorrow 5:15pm');
    await expect(time).toHaveAttribute('data-chip', 'WED 30 SEP · 17:15');
    await expect(page.getByText('3 undo steps ·', { exact: false })).toBeVisible();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(time).toHaveAttribute('aria-valuetext', 'tomorrow 4:15pm');

    // A limit refuses: the words shake once and stay.
    await sleep.focus();
    await page.keyboard.press('End');
    await expect(sleep).toHaveAttribute('aria-valuetext', '24h');
    await page.keyboard.press('ArrowUp');
    await expect(sleep).toHaveAttribute('aria-valuetext', '24h');
    expect(await sleep.locator('.mu-cue-scrub-face').evaluate((el) => el.getAnimations().some((a) => a.id === 'mu-refusal'))).toBe(true);

    // Durations keep their form.
    const dur = demo.getByRole('spinbutton', { name: 'Duration' });
    await dur.focus();
    await page.keyboard.press('ArrowDown');
    await expect(dur).toHaveAttribute('aria-valuetext', '1h25');
  });
}

test('Reduce Motion: the words change without the drum’s travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/cue', 'bone');
  const amount = page.getByTestId('scrub-demo').getByRole('spinbutton', { name: 'Amount' });
  await amount.focus();
  await page.keyboard.press('ArrowUp');
  await expect(amount).toHaveAttribute('aria-valuetext', '$41');
  const moves = await amount.locator('.mu-swap-layer').evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
  for (const t of moves) expect(t).toBe('none');
  await dragFrom(page, amount, 8);
  await expect(amount).toHaveAttribute('aria-valuetext', '$43');
  expect(await scaleOpacity(amount)).toBe(1); // at once, no fade
  await page.mouse.up();
  await expect.poll(() => scaleOpacity(amount), { intervals: [16] }).toBe(0);
});
