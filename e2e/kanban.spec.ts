import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Kanban: a board of cards in columns. A card dragged by hand rises as a copy on the overlay and follows
// the pointer while its slot (the recess) moves live into the column under it; it lands on drop. Keys
// move it up and down and between columns, out loud. Columns reorder by their grips; a limit says so in
// words with the amber LED; a failed save glides every card back with a toast.
const demo = (page: Page, id: string) => page.getByTestId(id);
const board = (page: Page, id: string) => demo(page, id).locator('.mu-kanban').first();
const column = (page: Page, id: string, col: string) => board(page, id).locator(`.mu-kanban-board > [data-row="${col}"]`);
const card = (page: Page, id: string, key: string) => board(page, id).locator(`[data-sortable-list] > [data-row="${key}"]`);
const cards = (page: Page, id: string, col: string) => column(page, id, col).locator('[data-sortable-list] > [data-sortable-item]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.row));
const columns = (page: Page, id: string) => board(page, id).locator('.mu-kanban-board > [data-sortable-item]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.row));
const said = (page: Page, id: string) => board(page, id).locator('[aria-live]').first();
const frame = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

/** Presses the middle of `from`, moves past the threshold, then to the middle of `to` (plus dy), and holds there. */
async function hold(page: Page, from: Locator, to: Locator, dy = 0) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 6, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + dy, { steps: 16 });
  await frame(page);
}

for (const colorway of COLORWAYS) {
  test(`a card dragged to another column rides the overlay and lands in ${colorway}`, async ({ page }) => {
    await open(page, '/components/kanban', colorway);
    await demo(page, 'kanban-play').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await demo(page, 'kanban-play').screenshot({ path: capture(`kanban-rest-${colorway}`) });
    expect(await cards(page, 'kanban-play', 'new')).toEqual(['poster', 'menus', 'zine']);
    const poster = card(page, 'kanban-play', 'poster');
    // Over the lower half of Business cards in Proofing: it goes after it.
    await hold(page, poster, card(page, 'kanban-play', 'cards'), 12);
    await expect(board(page, 'kanban-play')).toHaveAttribute('data-dragging', '');
    expect(await cards(page, 'kanban-play', 'proofing')).toEqual(['cards', 'poster', 'labels']);
    expect(await cards(page, 'kanban-play', 'new')).toEqual(['menus', 'zine']);
    // The copy rides the overlay, raised; the card itself is the recess.
    const copy = board(page, 'kanban-play').locator('.mu-sortable-overlay > [data-overlay]');
    await expect(copy).toHaveCount(1);
    await expect(copy).toHaveAttribute('data-lifted', '');
    await expect(card(page, 'kanban-play', 'poster')).toHaveAttribute('data-placeholder', '');
    await expect.poll(() => copy.evaluate((el) => parseFloat(getComputedStyle(el).scale))).toBeGreaterThan(1.01);
    await page.waitForTimeout(400);
    await demo(page, 'kanban-play').screenshot({ path: capture(`kanban-held-${colorway}`) });
    await page.mouse.up();
    await expect(copy).toHaveCount(0);
    await expect(card(page, 'kanban-play', 'poster')).not.toHaveAttribute('data-placeholder', '');
    await expect(said(page, 'kanban-play')).toHaveText('Dropped Gig poster, A2 in Proofing at position 2 of 3.');
    // Proofing (max 3) is now at its limit, not over it; Printing is over by one.
    await expect(column(page, 'kanban-play', 'proofing').locator('.mu-kanban-header')).toContainText('max 3');
    await expect(column(page, 'kanban-play', 'printing').locator('.mu-badge[data-led="waiting"]')).toHaveText('Over by 1');
  });

  test(`keys lift a card, move it across columns and drop it, out loud, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/kanban', colorway);
    const zine = card(page, 'kanban-play', 'zine');
    await zine.focus();
    await page.keyboard.press('Space');
    await expect(said(page, 'kanban-play')).toHaveText('Lifted Riso zine. New, position 3 of 3.');
    await page.keyboard.press('ArrowRight');
    await expect(said(page, 'kanban-play')).toHaveText('Riso zine, Proofing, position 3 of 3.');
    await page.keyboard.press('ArrowUp');
    await expect(said(page, 'kanban-play')).toHaveText('Riso zine, Proofing, position 2 of 3.');
    await expect(card(page, 'kanban-play', 'zine')).toBeFocused();
    await expect(card(page, 'kanban-play', 'zine')).toHaveAttribute('data-lifted', '');
    await page.waitForTimeout(400);
    await demo(page, 'kanban-play').screenshot({ path: capture(`kanban-keys-${colorway}`) });
    await page.keyboard.press('Space');
    await expect(said(page, 'kanban-play')).toHaveText('Dropped Riso zine in Proofing at position 2 of 3.');
    expect(await cards(page, 'kanban-play', 'proofing')).toEqual(['cards', 'zine', 'labels']);
    // Escape puts it back where it was lifted from.
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await cards(page, 'kanban-play', 'shipped')).toEqual(['invites', 'zine']);
    await page.keyboard.press('Escape');
    await expect(said(page, 'kanban-play')).toHaveText('Put Riso zine back in Proofing at position 2 of 3.');
    expect(await cards(page, 'kanban-play', 'proofing')).toEqual(['cards', 'zine', 'labels']);
    await expect(card(page, 'kanban-play', 'zine')).not.toHaveAttribute('data-lifted', '');
  });
}

test('a card on press refuses to lift; columns reorder by their grips', async ({ page }) => {
  await open(page, '/components/kanban', 'bone');
  await demo(page, 'kanban-play').scrollIntoViewIfNeeded();
  const catalogue = card(page, 'kanban-play', 'catalogue');
  await catalogue.focus();
  await page.keyboard.press('Space');
  await expect(said(page, 'kanban-play')).toHaveText('Autumn catalogue can’t be moved.');
  await expect(catalogue).not.toHaveAttribute('data-lifted', '');
  const grip = column(page, 'kanban-play', 'shipped').getByRole('button', { name: 'Move Shipped' });
  await grip.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  expect(await columns(page, 'kanban-play')).toEqual(['new', 'proofing', 'shipped', 'printing']);
  const newGrip = column(page, 'kanban-play', 'new').getByRole('button', { name: 'Move New' });
  await newGrip.scrollIntoViewIfNeeded();
  await hold(page, newGrip, column(page, 'kanban-play', 'proofing'));
  await page.mouse.up();
  expect(await columns(page, 'kanban-play')).toEqual(['proofing', 'new', 'shipped', 'printing']);
});

test('a failed save glides every card back, with a toast; the next save holds', async ({ page }) => {
  await open(page, '/components/kanban', 'graphite');
  await demo(page, 'kanban-fails').scrollIntoViewIfNeeded();
  const before = await cards(page, 'kanban-fails', 'new');
  await hold(page, card(page, 'kanban-fails', 'menus'), column(page, 'kanban-fails', 'shipped'));
  await page.mouse.up();
  expect(await cards(page, 'kanban-fails', 'shipped')).toContain('menus');
  // While the save is out the board is busy and nothing lifts.
  await expect(board(page, 'kanban-fails')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('Couldn’t move Menus, 40 copies', { exact: true })).toBeVisible();
  await expect(said(page, 'kanban-fails')).toHaveText('Couldn’t save. Menus, 40 copies is back in New at position 2 of 3.');
  expect(await cards(page, 'kanban-fails', 'new')).toEqual(before);
  await expect(board(page, 'kanban-fails')).not.toHaveAttribute('aria-busy', 'true');
  await page.waitForTimeout(300);
  await demo(page, 'kanban-fails').screenshot({ path: capture('kanban-rollback-graphite') });
  await card(page, 'kanban-fails', 'menus').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.getByText('Menus, 40 copies moved', { exact: true })).toBeVisible();
  expect(await cards(page, 'kanban-fails', 'proofing')).toContain('menus');
});

test('an empty column takes a card; a folded one is passed over', async ({ page }) => {
  await open(page, '/components/kanban', 'bone');
  await demo(page, 'kanban-quiet').scrollIntoViewIfNeeded();
  await expect(column(page, 'kanban-quiet', 'proofing').getByText('No orders')).toBeVisible();
  await expect(column(page, 'kanban-quiet', 'shipped').locator('[data-sortable-list]')).toHaveCount(0);
  await page.waitForTimeout(300);
  await demo(page, 'kanban-quiet').screenshot({ path: capture('kanban-empty-bone') });
  await hold(page, card(page, 'kanban-quiet', 'zine'), column(page, 'kanban-quiet', 'proofing'));
  await page.mouse.up();
  expect(await cards(page, 'kanban-quiet', 'proofing')).toEqual(['zine']);
  await expect(column(page, 'kanban-quiet', 'proofing').getByText('No orders')).toBeHidden();
  // Right from Printing skips the folded Shipped: nothing further to go.
  await card(page, 'kanban-quiet', 'banner').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  expect(await cards(page, 'kanban-quiet', 'printing')).toEqual(['banner']);
});

test('holding near the edge of a long board scrolls it sideways', async ({ page }) => {
  await open(page, '/components/kanban', 'bone');
  await demo(page, 'kanban-long').scrollIntoViewIfNeeded();
  const scroller = board(page, 'kanban-long').locator('.mu-kanban-board');
  const box = (await scroller.boundingBox())!;
  const from = (await card(page, 'kanban-long', 'poster').boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 6, { steps: 3 });
  await page.mouse.move(box.x + box.width - 6, from.y + from.height / 2, { steps: 12 });
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft), { timeout: 5000 }).toBeGreaterThan(300);
  await page.mouse.up();
  expect(await cards(page, 'kanban-long', 'new')).not.toContain('poster');
});

test('Reduce Motion: the copy doesn’t scale, and the drop lands at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/kanban', 'graphite');
  await demo(page, 'kanban-play').scrollIntoViewIfNeeded();
  await hold(page, card(page, 'kanban-play', 'poster'), card(page, 'kanban-play', 'cards'), 12);
  const copy = board(page, 'kanban-play').locator('.mu-sortable-overlay > [data-overlay]');
  await expect(copy).toHaveCount(1);
  expect(await copy.evaluate((el) => parseFloat(getComputedStyle(el).scale))).toBe(1);
  await page.mouse.up();
  await expect(copy).toHaveCount(0);
  expect(await board(page, 'kanban-play').evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.effect?.getKeyframes().some((k) => 'translate' in k || 'transform' in k)).length)).toBe(0);
  expect(await cards(page, 'kanban-play', 'proofing')).toEqual(['cards', 'poster', 'labels']);
});
