import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Data grid: Table in grid mode. Cells you walk with the arrows (one tab stop), edit in place (Field,
// NumberField, Select, a toggled box) with saves that land or roll back, ranges copied and pasted as
// tab-separated text, and columns reordered by Sortable's grips.
const grid = (page: Page, testId: string) => page.getByTestId(testId).getByRole('grid');
const cell = (g: Locator, row: string, col: string) => g.locator(`tr[data-key="${row}"] > [data-col="${col}"]`);
const focused = (page: Page) => page.evaluate(() => {
  const td = document.activeElement?.closest('tr[data-key] > [data-col]') as HTMLElement | null;
  return td ? `${td.parentElement!.dataset.key}/${td.dataset.col}` : null;
});
const settled = (l: Locator) => l.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))));

for (const colorway of COLORWAYS) {
  test(`walk the cells and edit them in place (${colorway})`, async ({ page }) => {
    await open(page, '/components/data-grid', colorway);
    const g = grid(page, 'data-grid-play');
    await expect(g).toHaveAttribute('aria-multiselectable', 'true');
    // One tab stop: the first cell until another is chosen.
    await expect(g.locator('[data-col][tabindex="0"]')).toHaveCount(1);
    await cell(g, 'p1', 'price').click();
    expect(await focused(page)).toBe('p1/price');
    await expect(g.locator('[data-col][tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('p1/margin');
    // The margin is computed: typing over it shakes and opens nothing.
    await page.keyboard.press('5');
    await expect(g.locator('[data-editing]')).toHaveCount(0);
    await expect(cell(g, 'p1', 'margin')).toHaveAttribute('aria-readonly', 'true');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('p2/price');
    await page.keyboard.press('ArrowUp');

    // Typing replaces the value; Enter commits and goes down; the save dims the cell until it lands.
    await page.keyboard.type('19.5');
    await expect(cell(g, 'p1', 'price').getByRole('textbox')).toHaveValue('19.5');
    await g.locator('tr[data-key="p1"]').screenshot({ path: capture(`data-grid-editing-${colorway}`) });
    await page.keyboard.press('Enter');
    expect(await focused(page)).toBe('p2/price');
    await expect(cell(g, 'p1', 'price')).toHaveAttribute('data-saving', '');
    await expect(cell(g, 'p1', 'price')).toHaveText('19.50');
    await expect(cell(g, 'p1', 'price')).not.toHaveAttribute('data-saving', '');
    // Enter edits with the value kept; Escape puts it back.
    await page.keyboard.press('Enter');
    await expect(cell(g, 'p2', 'price').getByRole('textbox')).toBeFocused();
    await page.keyboard.type('9');
    await page.keyboard.press('Escape');
    await expect(g.locator('[data-editing]')).toHaveCount(0);
    expect(await focused(page)).toBe('p2/price');
    await expect(cell(g, 'p2', 'price')).toHaveText('24.00');

    // Text: Tab commits and goes right.
    await cell(g, 'p3', 'name').dblclick();
    await expect(cell(g, 'p3', 'name').getByRole('textbox')).toBeFocused();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Brass pencil, long');
    await page.keyboard.press('Tab');
    await expect(cell(g, 'p3', 'name')).toContainText('Brass pencil, long');
    expect(await focused(page)).toBe('p3/price'); // SKU has left: the grid is under 720 wide

    // A status edits with a Select, open at once; choosing commits.
    await cell(g, 'p3', 'status').click();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('option', { name: 'On sale' })).toBeVisible();
    await page.getByRole('option', { name: 'On sale' }).click();
    await expect(cell(g, 'p3', 'status')).toContainText('On sale');
    expect(await focused(page)).toBe('p3/status');
    // A check toggles with Space; the gift card's VAT can't change.
    await page.keyboard.press('ArrowRight');
    await expect(cell(g, 'p3', 'taxed').getByRole('checkbox')).toBeChecked();
    await page.keyboard.press('Space');
    await expect(cell(g, 'p3', 'taxed').getByRole('checkbox')).not.toBeChecked();
    await expect(cell(g, 'p6', 'taxed')).toHaveAttribute('aria-readonly', 'true');
    // Totals follow the rows.
    await expect(g.locator('tfoot')).toContainText('27.13');

    // Home and End go to the row's ends; ⌘↓ to the last row.
    await page.keyboard.press('Home');
    expect(await focused(page)).toBe('p3/name');
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('p3/taxed');
    await page.keyboard.press('ControlOrMeta+ArrowDown');
    expect(await focused(page)).toBe('p8/taxed');

    await cell(g, 'p2', 'price').click();
    await page.mouse.move(0, 0);
    await settled(page.getByTestId('data-grid-play'));
    await page.getByTestId('data-grid-play').screenshot({ path: capture(`data-grid-${colorway}`) });
  });
}

test('ranges copy and paste as tab-separated text', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, '/components/data-grid', 'bone');
  const g = grid(page, 'data-grid-clipboard');
  await cell(g, 'p1', 'price').click();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(g.locator('[aria-selected="true"][data-col]')).toHaveCount(6);
  await page.keyboard.press('ControlOrMeta+c');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('18.00\t64\n24.00\t53\n32.00\t65');
  await expect(page.getByTestId('data-grid-clipboard').locator('[aria-live="polite"]')).toHaveText('Copied 6 cells.');
  // Escape goes back to one cell.
  await page.keyboard.press('Escape');
  await expect(g.locator('[aria-selected="true"][data-col]')).toHaveCount(0);

  // A column of prices from a spreadsheet lands from the active cell down.
  await page.evaluate(() => navigator.clipboard.writeText('21\n26.5\nabc\n'));
  await cell(g, 'p2', 'price').click();
  await page.keyboard.press('ControlOrMeta+v');
  await expect(cell(g, 'p2', 'price')).toHaveText('21.00');
  await expect(cell(g, 'p3', 'price')).toHaveText('26.50');
  await expect(cell(g, 'p4', 'price')).toHaveText('6.50');
  await expect(page.getByTestId('data-grid-clipboard').locator('[aria-live="polite"]')).toHaveText('Pasted 2 cells. 1 can’t take it.');
  // One value fills a range; a drag makes the range.
  await page.evaluate(() => navigator.clipboard.writeText('7'));
  const from = await cell(g, 'p5', 'stock').boundingBox();
  const to = await cell(g, 'p6', 'stock').boundingBox();
  await page.mouse.move(from!.x + 10, from!.y + 10);
  await page.mouse.down();
  await page.mouse.move(to!.x + 10, to!.y + 10, { steps: 4 });
  await page.mouse.up();
  await expect(g.locator('[aria-selected="true"][data-col]')).toHaveCount(2);
  await page.keyboard.press('ControlOrMeta+v');
  await expect(cell(g, 'p5', 'stock')).toHaveText('7');
  await expect(cell(g, 'p6', 'stock')).toHaveText('7');
  // Delete clears.
  await page.keyboard.press('Delete');
  await expect(cell(g, 'p5', 'stock')).toHaveText(/—/);
  // The page's own textarea takes what the grid copies.
  await cell(g, 'p1', 'status').click();
  await page.keyboard.press('ControlOrMeta+c');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('On sale');
});

test('a failed save puts the old value back and says so; reduced motion keeps it still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/data-grid', 'graphite');
  const g = grid(page, 'data-grid-failed');
  await cell(g, 'p1', 'stock').click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await expect(cell(g, 'p1', 'stock')).toHaveText('5');
  await expect(cell(g, 'p1', 'stock')).toHaveAttribute('aria-busy', 'true');
  await expect(cell(g, 'p1', 'stock')).toHaveAttribute('data-failed', '');
  await expect(cell(g, 'p1', 'stock')).toHaveText('240');
  await expect(page.getByTestId('data-grid-failed').locator('[aria-live="polite"]')).toHaveText('Couldn’t save Stock for Linen notebook, A5.');
  expect(await cell(g, 'p1', 'stock').evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
  const ring = await cell(g, 'p1', 'stock').evaluate((el) => getComputedStyle(el).outlineColor);
  expect(ring).not.toBe('rgba(0, 0, 0, 0)');
  await page.getByTestId('data-grid-failed').screenshot({ path: capture('data-grid-failed') });
});

test('columns reorder by their grips, with keys', async ({ page }) => {
  await open(page, '/components/data-grid', 'bone');
  const g = grid(page, 'data-grid-columns');
  const heads = () => g.locator('thead th[data-col]').evaluateAll((ths) => ths.map((t) => t.getAttribute('data-col')));
  expect((await heads()).slice(0, 5)).toEqual(['name', 'sku', 'price', 'margin', 'stock']);
  const grip = g.getByRole('button', { name: 'Move Stock' });
  await grip.focus();
  await expect(grip).toHaveCSS('opacity', '1');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  expect((await heads()).slice(0, 5)).toEqual(['name', 'sku', 'stock', 'price', 'margin']);
  // The body follows: the third cell of a row is its stock.
  await expect(g.locator('tr[data-key="p1"] > [data-col]').nth(2)).toHaveAttribute('data-col', 'stock');
  // ← → walk the new order (SKU has left: the grid is under 720 wide).
  await cell(g, 'p1', 'name').click();
  await page.keyboard.press('ArrowRight');
  expect(await focused(page)).toBe('p1/stock');
  await page.mouse.move(0, 0);
  await settled(page.getByTestId('data-grid-columns'));
  await page.getByTestId('data-grid-columns').screenshot({ path: capture('data-grid-columns') });
});
