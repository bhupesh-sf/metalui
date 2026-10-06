import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Card: a linked card is one link covering the card, lifts on hover and comes down on press; its
// actions (the corner one too) stay separate buttons; a card without a link never moves; a chosen card
// is marked. Then each variation: size, media at the side, status, choice cards that latch, the three
// frames and the empty slot, waiting in the new variations, in both colorways and under Reduce Motion.
const play = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const section = (page: Page, id: string) => page.locator(`section#${id}`);
const lift = (el: Locator) => el.evaluate((e) => { const t = getComputedStyle(e).translate; return t === 'none' ? 0 : parseFloat(t.split(' ')[1] ?? '0'); });
const rect = (el: Locator) => el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
/** Whether the point at the middle of `el` hits `el` itself (nothing stretched over it). */
const onTop = async (el: Locator) => { await el.scrollIntoViewIfNeeded(); return el.evaluate((e) => { const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }); };

for (const colorway of COLORWAYS) {
  test(`links, lifts, keeps actions separate, and stays still without a link, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/card', colorway);
    const lisbon = play(page).getByRole('article').filter({ hasText: 'Trip to Lisbon' });
    await expect(lisbon.getByRole('link')).toHaveCount(1);
    await expect(lisbon.getByRole('link', { name: 'Trip to Lisbon' })).toHaveAttribute('href', '#lisbon');
    await expect(lisbon).toHaveAttribute('aria-current', 'true');

    // The whole card is the link's hit area: the point under the description is the link.
    const hit = await lisbon.getByText('14 notes, 3 photos, a tram map.').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('a')?.getAttribute('href') ?? null;
    });
    expect(hit).toBe('#lisbon');

    const porto = play(page).getByRole('article').filter({ hasText: 'Weekend in Porto' });
    // Actions sit above the stretched link.
    expect(await onTop(porto.getByRole('button', { name: 'Choose' }))).toBe(true);
    await porto.getByRole('button', { name: 'Choose' }).click();
    await expect(porto).toHaveAttribute('aria-current', 'true');

    await porto.hover();
    await expect.poll(() => lift(porto)).toBeLessThan(-3);
    const still = play(page).getByRole('article').filter({ hasText: 'Packing list' });
    await still.hover();
    await page.waitForTimeout(500);
    expect(await lift(still)).toBe(0);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);
    await play(page).screenshot({ path: capture(`card-${colorway}`) });
  });

  test(`size, media at the side, status and the frames, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/card', colorway);
    const pad = (el: Locator) => el.evaluate((e) => parseFloat(getComputedStyle(e).paddingTop));
    expect(await pad(page.getByTestId('card-regular'))).toBe(16);
    expect(await pad(page.getByTestId('card-compact'))).toBe(12);
    await section(page, 'size').screenshot({ path: capture(`card-size-${colorway}`) });

    // Media at the side: square, at the start inside the padding, its radius concentric; one column.
    const results = page.getByTestId('card-results').getByRole('article');
    await expect(results).toHaveCount(3);
    const first = results.first();
    const [card, media] = [await rect(first), await rect(first.locator('.mu-card-media'))];
    expect(media.w).toBe(56);
    expect(media.h).toBe(56);
    expect(media.x - card.x).toBe(12);
    expect(media.y - card.y).toBe(12);
    expect(await first.locator('.mu-card-media').evaluate((e) => getComputedStyle(e).borderTopLeftRadius)).toBe('12px');
    expect((await rect(results.nth(1))).x).toBe(card.x);
    const title = await rect(first.getByRole('heading'));
    expect(title.x).toBeGreaterThanOrEqual(media.x + media.w + 12);
    await section(page, 'side').screenshot({ path: capture(`card-side-${colorway}`) });

    // Status: an LED at the end of the title's line, its word as its name and its tooltip.
    const thumbs = page.getByTestId('card-services').getByRole('article').filter({ has: page.getByRole('heading', { name: 'Thumbnails' }) });
    const lamp = thumbs.getByRole('img', { name: 'Deploy failed' });
    await expect(lamp).toBeVisible();
    await expect(lamp.locator('.mu-led')).toHaveAttribute('data-kind', 'failed');
    await expect(lamp.locator('.mu-led')).toHaveAttribute('data-gesture', 'blink2');
    await expect(page.getByTestId('card-services').getByRole('img', { name: 'Queued' }).locator('.mu-led')).toHaveAttribute('data-gesture', 'breathe');
    const [lampBox, titleBox] = [await rect(lamp), await rect(thumbs.getByRole('heading'))];
    expect(Math.abs(lampBox.y + lampBox.h / 2 - (titleBox.y + titleBox.h / 2))).toBeLessThanOrEqual(1);
    // The corner action is level with the title's first line and sits above the link.
    const more = thumbs.getByRole('button', { name: 'More for Thumbnails' });
    const moreBox = await rect(more);
    expect(Math.abs(moreBox.y + moreBox.h / 2 - (titleBox.y + titleBox.h / 2))).toBeLessThanOrEqual(1);
    expect(await onTop(more)).toBe(true);
    await lamp.hover();
    await expect(page.locator('.mu-tooltip', { hasText: 'Deploy failed' })).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.locator('.mu-tooltip')).toHaveCount(0);
    await section(page, 'status').screenshot({ path: capture(`card-status-${colorway}`) });

    // The three frames: a stacked plate of sections, a sunk tray of plates, the cards alone.
    const frame = page.getByTestId('card-frame');
    const cards = frame.getByRole('article');
    const look = (el: Locator) => el.evaluate((e) => ({ shadow: getComputedStyle(e).boxShadow, bg: getComputedStyle(e).backgroundImage, radius: getComputedStyle(e).borderTopLeftRadius, rule: getComputedStyle(e, '::before').content }));
    expect((await look(cards.nth(0))).shadow).toBe('none');
    expect((await look(cards.nth(0))).radius).toBe('24px');
    expect((await look(cards.nth(1))).radius).toBe('0px');
    expect((await look(cards.nth(1))).rule).not.toBe('none');
    expect((await look(frame)).shadow).not.toBe('none');
    // A stacked section never lifts.
    await cards.nth(0).hover();
    await page.waitForTimeout(400);
    expect(await lift(cards.nth(0))).toBe(0);
    await section(page, 'frames').screenshot({ path: capture(`card-stacked-${colorway}`) });

    await page.getByRole('radio', { name: 'Separated' }).click();
    await expect(frame).toHaveAttribute('data-variant', 'separated');
    expect((await look(frame)).radius).toBe('32px');
    expect((await look(cards.nth(0))).shadow).not.toBe('none');
    await page.getByRole('radio', { name: 'Compact' }).click();
    expect(await pad(cards.nth(0))).toBe(12);
    expect((await look(frame)).radius).toBe('30px');
    await page.getByRole('radio', { name: 'Ghost' }).click();
    expect((await look(frame)).shadow).toBe('none');
    expect((await look(cards.nth(0))).shadow).not.toBe('none');
  });

  test(`choice cards latch down with the green LED, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/card', colorway);
    const plans = page.getByRole('radiogroup', { name: 'Plan' });
    await expect(plans.getByRole('radio')).toHaveCount(3);
    const team = plans.getByRole('radio', { name: /Team/ });
    const studio = plans.getByRole('radio', { name: /Studio/ });
    await expect(team).toHaveAttribute('aria-checked', 'true');
    const latch = (el: Locator) => el.locator('.mu-card-latch').evaluate((e) => parseFloat(getComputedStyle(e).opacity));
    await expect.poll(() => lift(team)).toBe(1);
    await expect.poll(() => latch(team)).toBe(1);
    expect(await latch(studio)).toBe(0);

    await studio.click();
    await expect(studio).toHaveAttribute('aria-checked', 'true');
    await expect(team).toHaveAttribute('aria-checked', 'false');
    await expect.poll(() => lift(studio)).toBe(1);
    await expect.poll(() => lift(team)).toBe(0);
    await expect.poll(() => latch(team)).toBe(0);
    await expect(page.getByTestId('card-choice-readout')).toHaveText(/Plan: studio/);

    // Keyboard: arrows move and choose.
    await studio.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(team).toHaveAttribute('aria-checked', 'true');
    await expect(team).toBeFocused();
    await expect(team).toHaveCSS('outline-style', 'solid');

    // Add-ons are checkboxes; turning one on, it waits on its own edge, then settles.
    const domain = page.getByRole('checkbox', { name: /Own domain/ });
    await domain.click();
    await expect(domain).toHaveAttribute('aria-checked', 'true');
    await expect(domain).toHaveAttribute('aria-busy', 'true');
    await expect(domain.locator('.mu-card-wait')).toHaveCount(1);
    const edge = await rect(domain.locator('.mu-card-wait'));
    const box = await rect(domain);
    expect(edge.x).toBeCloseTo(box.x, 0);
    expect(edge.w).toBeCloseTo(box.w, 0);
    await page.waitForTimeout(700);
    await section(page, 'choice').screenshot({ path: capture(`card-choice-${colorway}`) });
    await expect(domain).not.toHaveAttribute('aria-busy', 'true', { timeout: 4000 });
    await expect(page.getByTestId('card-choice-readout')).toHaveText(/backups, domain/);
    await page.keyboard.press('Tab');
    await domain.focus();
    await page.keyboard.press('Space');
    await expect(domain).toHaveAttribute('aria-checked', 'false');
  });
}

test('the empty slot makes a card where it was, which waits on its own edge', async ({ page }) => {
  await open(page, '/components/card', 'bone');
  const slot = play(page).getByRole('button', { name: 'New trip' });
  const frame = play(page).locator('.mu-card-frame');
  const from = async (el: Locator) => { const [a, f] = [await rect(el), await rect(frame)]; return { x: a.x - f.x, y: a.y - f.y }; };
  const before = await from(slot);
  await slot.click();
  const made = play(page).getByRole('article').filter({ hasText: 'Untitled trip 1' });
  await expect(made).toHaveAttribute('aria-busy', 'true');
  await page.mouse.move(0, 0);
  await expect.poll(() => from(made)).toEqual(before);
  await expect(made.locator('.mu-card-wait')).toHaveCount(1);
  await expect(made).not.toHaveAttribute('aria-busy', 'true', { timeout: 4000 });
  await expect(made.locator('.mu-card-description')).toContainText('Empty: add notes, photos or a map.');
});

test('a side card waits on its own edge, edge to edge', async ({ page }) => {
  await open(page, '/components/card', 'graphite');
  const tram = page.getByTestId('card-results').getByRole('article').filter({ hasText: 'Tram 28' });
  await section(page, 'side').getByRole('button', { name: 'Refresh the timetable' }).click();
  await expect(tram).toHaveAttribute('aria-busy', 'true');
  const [edge, box] = [await rect(tram.locator('.mu-card-wait')), await rect(tram)];
  expect(edge).toEqual(box);
  await expect(tram.locator('.mu-card-description')).toContainText('Refreshing the timetable…');
  await expect(tram).not.toHaveAttribute('aria-busy', 'true', { timeout: 5000 });
});

test('focus on the title link rings the whole card', async ({ page }) => {
  await open(page, '/components/card', 'bone');
  const lisbon = play(page).getByRole('article').filter({ hasText: 'Trip to Lisbon' });
  await lisbon.getByRole('link').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(lisbon).toHaveCSS('outline-style', 'solid');
});

test('Reduce Motion: no lift; a choice still seats its 1 pt with its seated look and LED, as the tool key', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/card', 'bone');
  const porto = play(page).getByRole('article').filter({ hasText: 'Weekend in Porto' });
  await porto.hover();
  await page.waitForTimeout(500);
  expect(await lift(porto)).toBe(0);
  const studio = page.getByRole('radio', { name: /Studio/ });
  await studio.click();
  await expect(studio).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => lift(studio)).toBe(1);
  expect(await studio.evaluate((e) => parseFloat(getComputedStyle(e, '::after').opacity))).toBe(1);
  expect(await studio.locator('.mu-card-latch').evaluate((e) => parseFloat(getComputedStyle(e).opacity))).toBe(1);
});
