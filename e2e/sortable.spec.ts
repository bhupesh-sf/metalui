import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Sortable: the drag that reorders. A held item follows the pointer while the others make room and a
// recess marks the slot; it lands on drop. Keys lift, move and drop it, out loud. A pinned item stays;
// a failed save glides back with a toast; a long list scrolls while you hold near its edge.
const demo = (page: Page, id: string) => page.getByTestId(id);
const list = (page: Page, id: string) => demo(page, id).locator('.mu-sortable').first();
const item = (page: Page, id: string, key: string) => list(page, id).locator(`:scope > [data-row="${key}"]`);
const order = (page: Page, id: string) => list(page, id).locator(':scope > [data-sortable-item]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.row));
const said = (page: Page, id: string) => demo(page, id).locator('[aria-live]').first();
const frame = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

/** Presses the middle of `from`, moves past the threshold, then to `to` (a point, or the middle of an item), and holds there. */
async function hold(page: Page, from: Locator, to: Locator | { x: number; y: number }, dy = 0) {
  const a = (await from.boundingBox())!;
  const b = 'boundingBox' in to ? (await to.boundingBox())! : { ...to, width: 0, height: 0 };
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 6, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + dy, { steps: 12 });
  await frame(page);
}

const PLAN = ['standup', 'brief', 'framer', 'review', 'call'];

for (const colorway of COLORWAYS) {
  test(`a dragged row lifts, the others make room, and it lands in ${colorway}`, async ({ page }) => {
    await open(page, '/components/sortable', colorway);
    await demo(page, 'sortable-play').scrollIntoViewIfNeeded();
    expect(await order(page, 'sortable-play')).toEqual(PLAN);
    const framer = item(page, 'sortable-play', 'framer');
    await hold(page, framer, item(page, 'sortable-play', 'brief'));
    // Held: lifted, on its plate, the recess showing, the others already moved.
    await expect(framer).toHaveAttribute('data-lifted', '');
    await expect(list(page, 'sortable-play')).toHaveAttribute('data-dragging', '');
    await expect(demo(page, 'sortable-play').locator('.mu-sortable-slot')).toHaveAttribute('data-shown', '');
    expect(await order(page, 'sortable-play')).toEqual(['standup', 'framer', 'brief', 'review', 'call']);
    await expect.poll(() => framer.evaluate((el) => parseFloat(getComputedStyle(el).scale))).toBeGreaterThan(1.01);
    await page.waitForTimeout(400);
    await demo(page, 'sortable-play').screenshot({ path: capture(`sortable-held-${colorway}`) });
    await page.mouse.up();
    // Landed: no longer held, the order kept, announced.
    await expect(framer).not.toHaveAttribute('data-lifted', '');
    await expect(said(page, 'sortable-play')).toHaveText('Dropped Book the framer at position 2 of 5.');
    expect(await order(page, 'sortable-play')).toEqual(['standup', 'framer', 'brief', 'review', 'call']);
    await expect(page.getByText('Order saved', { exact: true })).toHaveCount(0); // no save in the playground by default
  });

  test(`keys lift, move, drop and cancel, out loud, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/sortable', colorway);
    const call = item(page, 'sortable-play', 'call');
    await call.focus();
    await expect(call).toHaveAttribute('aria-describedby', /.+/);
    await page.keyboard.press('Space');
    await expect(said(page, 'sortable-play')).toHaveText('Lifted Call the printer. Position 5 of 5.');
    await expect(call).toHaveAttribute('data-lifted', '');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(said(page, 'sortable-play')).toHaveText('Call the printer, position 3 of 5.');
    await expect(call).toBeFocused();
    await page.waitForTimeout(500);
    await demo(page, 'sortable-play').screenshot({ path: capture(`sortable-keys-${colorway}`) });
    await page.keyboard.press('Space');
    await expect(said(page, 'sortable-play')).toHaveText('Dropped Call the printer at position 3 of 5.');
    expect(await order(page, 'sortable-play')).toEqual(['standup', 'brief', 'call', 'framer', 'review']);
    // Escape puts it back where it was lifted from.
    await page.keyboard.press('Enter');
    await page.keyboard.press('End');
    expect(await order(page, 'sortable-play')).toEqual(['standup', 'brief', 'framer', 'review', 'call']);
    await page.keyboard.press('Escape');
    await expect(said(page, 'sortable-play')).toHaveText('Put Call the printer back at position 3 of 5.');
    expect(await order(page, 'sortable-play')).toEqual(['standup', 'brief', 'call', 'framer', 'review']);
    await expect(call).not.toHaveAttribute('data-lifted', '');
  });
}

test('a pinned row stays first: it refuses to lift, and nothing takes its place', async ({ page }) => {
  await open(page, '/components/sortable', 'bone');
  const standup = item(page, 'sortable-play', 'standup');
  await standup.focus();
  await page.keyboard.press('Space');
  await expect(said(page, 'sortable-play')).toHaveText('Standup can’t be moved.');
  await expect(standup).not.toHaveAttribute('data-lifted', '');
  // Home takes Write the brief no further than the first free place; a drag above Standup the same.
  await item(page, 'sortable-play', 'review').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Home');
  await page.keyboard.press('Space');
  expect(await order(page, 'sortable-play')).toEqual(['standup', 'review', 'brief', 'framer', 'call']);
  await hold(page, item(page, 'sortable-play', 'call'), standup);
  await page.mouse.up();
  expect((await order(page, 'sortable-play'))[0]).toBe('standup');
});

test('a failed save glides back to the order before, with a toast; the next save holds', async ({ page }) => {
  await open(page, '/components/sortable', 'graphite');
  await demo(page, 'sortable-fails').scrollIntoViewIfNeeded();
  const framer = item(page, 'sortable-fails', 'framer');
  await framer.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  // While the save is out the list is busy and nothing lifts.
  await expect(list(page, 'sortable-fails')).toHaveAttribute('aria-busy', 'true');
  await page.keyboard.press('Space');
  await expect(framer).not.toHaveAttribute('data-lifted', '');
  await expect(page.getByText('Couldn’t save the order', { exact: true })).toBeVisible();
  await expect(said(page, 'sortable-fails')).toHaveText('Couldn’t save the order. Book the framer is back at position 3 of 5.');
  expect(await order(page, 'sortable-fails')).toEqual(PLAN);
  await expect(list(page, 'sortable-fails')).not.toHaveAttribute('aria-busy', 'true');
  await page.waitForTimeout(300);
  await demo(page, 'sortable-fails').screenshot({ path: capture('sortable-rollback-graphite') });
  await framer.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.getByText('Order saved', { exact: true })).toBeVisible();
  expect(await order(page, 'sortable-fails')).toEqual(['standup', 'framer', 'brief', 'review', 'call']);
});

test('rows that hold a checkbox lift only by the grip', async ({ page }) => {
  await open(page, '/components/sortable', 'bone');
  await demo(page, 'sortable-grip').scrollIntoViewIfNeeded();
  const charger = item(page, 'sortable-grip', 'charger');
  // The row's own text doesn't lift it; the checkbox still ticks.
  await hold(page, charger.getByText('Camera charger'), item(page, 'sortable-grip', 'passport'));
  await expect(charger).not.toHaveAttribute('data-lifted', '');
  await page.mouse.up();
  await charger.getByRole('checkbox').click();
  await expect(charger.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  const grip = charger.getByRole('button', { name: 'Move Camera charger' });
  await hold(page, grip, item(page, 'sortable-grip', 'passport'));
  await expect(charger).toHaveAttribute('data-lifted', '');
  await page.mouse.up();
  expect(await order(page, 'sortable-grip')).toEqual(['charger', 'passport', 'tickets', 'adapter']);
  // The grip takes the keys.
  await grip.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  expect(await order(page, 'sortable-grip')).toEqual(['passport', 'charger', 'tickets', 'adapter']);
});

test('a row runs left to right, and a grid of two sizes trades places', async ({ page }) => {
  await open(page, '/components/sortable', 'bone');
  await item(page, 'sortable-row', 'lisbon').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  expect(await order(page, 'sortable-row')).toEqual(['porto', 'sintra', 'lisbon', 'évora', 'faro']);

  await demo(page, 'sortable-grid').scrollIntoViewIfNeeded();
  await hold(page, item(page, 'sortable-grid', 'notes'), item(page, 'sortable-grid', 'cover'));
  expect((await order(page, 'sortable-grid'))[0]).toBe('notes');
  await page.waitForTimeout(400);
  await demo(page, 'sortable-grid').screenshot({ path: capture('sortable-grid-bone') });
  await page.mouse.up();
  expect((await order(page, 'sortable-grid'))[0]).toBe('notes');
  // Down goes to the nearest tile below.
  await item(page, 'sortable-grid', 'notes').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  expect((await order(page, 'sortable-grid'))[0]).not.toBe('notes');
});

test('groups move by their grips; the rows inside a group reorder on their own', async ({ page }) => {
  await open(page, '/components/sortable', 'bone');
  await demo(page, 'sortable-nested').scrollIntoViewIfNeeded();
  const morning = demo(page, 'sortable-nested').getByRole('list', { name: 'Morning plans' });
  const rows = () => morning.locator(':scope > [data-sortable-item]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.row));
  await hold(page, morning.locator('[data-row="Miradouro"]'), morning.locator('[data-row="Coffee at Fábrica"]'));
  await page.mouse.up();
  expect(await rows()).toEqual(['Miradouro', 'Coffee at Fábrica', 'Tram 28 to Graça']);
  expect(await order(page, 'sortable-nested')).toEqual(['morning', 'afternoon', 'evening']);
  await hold(page, demo(page, 'sortable-nested').getByRole('button', { name: 'Move Evening' }), item(page, 'sortable-nested', 'morning'), -10);
  await page.mouse.up();
  expect(await order(page, 'sortable-nested')).toEqual(['evening', 'morning', 'afternoon']);
});

test('holding near the edge of a long list scrolls it', async ({ page }) => {
  await open(page, '/components/sortable', 'bone');
  const scroller = demo(page, 'sortable-long-scroller');
  await scroller.scrollIntoViewIfNeeded();
  const box = (await scroller.boundingBox())!;
  await hold(page, item(page, 'sortable-long', 'shot-1'), { x: box.x + box.width / 2, y: box.y + box.height - 6 });
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop), { timeout: 5000 }).toBeGreaterThan(200);
  await page.mouse.up();
  const now = await order(page, 'sortable-long');
  expect(now.indexOf('shot-1')).toBeGreaterThan(5);
});

test('Reduce Motion: no lift scale, and the drop lands at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/sortable', 'graphite');
  const framer = item(page, 'sortable-play', 'framer');
  await hold(page, framer, item(page, 'sortable-play', 'brief'));
  await expect(framer).toHaveAttribute('data-lifted', '');
  expect(await framer.evaluate((el) => parseFloat(getComputedStyle(el).scale))).toBe(1);
  await page.mouse.up();
  expect(await list(page, 'sortable-play').evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation || a.effect?.getKeyframes().some((k) => 'translate' in k || 'transform' in k)).length)).toBe(0);
  expect(await order(page, 'sortable-play')).toEqual(['standup', 'framer', 'brief', 'review', 'call']);
});
