import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Table, the Later tier: hierarchy rows on Tree's guides and chevron (keys, a level that loads, one that
// fails), virtual rows (10,000 rows, a window in the page; focus, selection, the sticky head and the rows'
// motion keep working) and infinite scroll (a loading row at the end, a failed page with Try again).
const section = (page: Page, id: string) => page.locator(`section#${id}`);
const row = (table: Locator, key: string) => table.locator(`tr[data-key="${key}"]`);
const focusedKey = (page: Page) => page.evaluate(() => document.activeElement?.closest('tr')?.getAttribute('data-key') ?? null);
const drawn = (table: Locator) => table.locator('tbody tr[data-key]').count();
/** Waits for every animation under an element to finish (captures are of rows at rest). */
const settled = (l: Locator) => l.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))));

for (const colorway of COLORWAYS) {
  test(`hierarchy: guides and chevrons in the name cell, → and ← open, close and walk (${colorway})`, async ({ page }) => {
    await open(page, '/components/table', colorway);
    const table = section(page, 'tree').getByRole('table');
    // Design starts open: its rows show a level deeper, its empty Drafts folder is a branch.
    await expect(row(table, 'design')).toHaveAttribute('data-level', '1');
    await expect(row(table, 'design/screens')).toHaveAttribute('data-level', '2');
    await expect(row(table, 'design/screens/home')).toHaveCount(0);
    const branch = (key: string) => row(table, key).locator('.mu-table-branch');
    await expect(branch('design')).toHaveAttribute('aria-expanded', 'true');
    await expect(branch('readme')).toHaveCount(0);
    // A level-2 row draws one groove at its parent's chevron, the full height of the cell.
    const groove = row(table, 'design/screens').locator('.mu-tree-guides > span');
    await expect(groove).toHaveCount(1);
    const [cellH, grooveH] = await row(table, 'design/screens').evaluate((tr) => [tr.getBoundingClientRect().height, tr.querySelector('.mu-tree-guides > span')!.getBoundingClientRect().height]);
    expect(grooveH).toBeGreaterThanOrEqual(cellH - 2);
    // Children sort among themselves (Name ascending): Drafts, Screens, Tokens.json.
    const order = await table.locator('tbody tr[data-level="2"]').evaluateAll((trs) => trs.map((t) => t.getAttribute('data-key')));
    expect(order).toEqual(['design/drafts', 'design/screens', 'design/tokens']);

    // The keyboard: ↓ to Screens, → opens (its children land), → again goes in, ← back out, ← closes.
    await row(table, 'design').locator('.mu-table-open').focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focusedKey(page)).toBe('design/drafts');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focusedKey(page)).toBe('design/screens');
    await page.keyboard.press('ArrowRight');
    await expect(row(table, 'design/screens/home')).toHaveAttribute('data-level', '3');
    await expect(branch('design/screens')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focusedKey(page)).toBe('design/screens/home');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => focusedKey(page)).toBe('design/screens');
    await page.keyboard.press('ArrowLeft');
    await expect(row(table, 'design/screens/home')).toHaveCount(0);
    await expect(branch('design/screens')).toHaveAttribute('aria-expanded', 'false');
    // The chevron rests a quarter back when closed.
    await expect.poll(() => branch('design/screens').locator('.mu-tree-chevron').evaluate((s) => getComputedStyle(s).rotate)).toBe('-90deg');
    // An empty folder says so at its children's level.
    await branch('design/drafts').click();
    await expect(table.locator('tr[data-empty]')).toContainText('Empty');
    await page.mouse.move(0, 0);
    await settled(table);
    await section(page, 'tree').screenshot({ path: capture(`table-tree-${colorway}`) });
  });
}

test('hierarchy: a level that loads waits in the chevron; a failed load says Try again, and retrying lands', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const table = section(page, 'tree').getByRole('table');
  const archive = row(table, 'archive');
  const key = archive.locator('.mu-table-branch');
  await key.click();
  // Waiting: the ring stands in for the chevron after the show delay; the table is busy.
  await expect(archive.locator('.mu-tree-disclosure')).toHaveAttribute('data-showing', '');
  await expect(archive.locator('.mu-spinner')).toBeVisible();
  // The first load fails (the rows panel's default): closed, sync-error, words on the row.
  await expect(key).toHaveAttribute('aria-expanded', 'false', { timeout: 5000 });
  await expect(archive.locator('.mu-tree-failed')).toBeVisible();
  await expect(archive).toContainText('Couldn’t load · Try again');
  await section(page, 'tree').screenshot({ path: capture('table-tree-failed-bone') });
  // Again (→ on its key): the children land a level deeper.
  await key.focus();
  await page.keyboard.press('ArrowRight');
  await expect(row(table, 'archive/2025')).toHaveAttribute('data-level', '2', { timeout: 5000 });
  await expect(archive.locator('.mu-tree-failed')).toHaveCount(0);
  await expect(key).toHaveAttribute('aria-expanded', 'true');
});

test('virtual: 10,000 rows, a window in the page that follows the scroll; head, selection and keys keep working', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const box = section(page, 'virtual');
  const table = box.getByRole('table');
  const frame = table.locator('xpath=..');
  await expect(table).toHaveAttribute('aria-rowcount', '10001');
  await expect(row(table, 'S-00001')).toBeVisible();
  const first = await drawn(table);
  expect(first).toBeGreaterThan(5);
  expect(first).toBeLessThan(60);
  // The spacers stand for the rest: the frame scrolls the whole height.
  const height = await frame.evaluate((f) => f.scrollHeight);
  expect(height).toBeGreaterThan(9000 * 30);

  // Select one, then scroll halfway: the window moves, still small; the head stays on top.
  await row(table, 'S-00002').getByRole('checkbox').click();
  await frame.evaluate((f) => { f.scrollTop = f.scrollHeight / 2; });
  await expect.poll(async () => (await table.locator('tbody tr[data-key]').first().getAttribute('data-key')) ?? '').not.toBe('S-00001');
  expect(await drawn(table)).toBeLessThan(60);
  const mid = await table.locator('tbody tr[data-key]').nth(10).getAttribute('data-key');
  const index = Number(await table.locator(`tr[data-key="${mid}"]`).getAttribute('aria-rowindex'));
  expect(index).toBeGreaterThan(4000);
  expect(index).toBeLessThan(6000);
  const head = await table.locator('thead th').first().evaluate((th) => [getComputedStyle(th).position, th.getBoundingClientRect().top - th.closest('div')!.getBoundingClientRect().top]);
  expect(head[0]).toBe('sticky');
  expect(Math.abs(Number(head[1]))).toBeLessThan(2);
  await expect(box.getByTestId('table-in-page')).toContainText('of 10,000 rows in the page');

  // Back to the top: the chosen row is still chosen.
  await frame.evaluate((f) => { f.scrollTop = 0; });
  await expect(row(table, 'S-00002')).toHaveAttribute('data-selected', '');

  // ↓ walks past the window: each next row is drawn and focused; the frame scrolls with it.
  await row(table, 'S-00001').locator('.mu-table-open').focus();
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowDown');
  await expect.poll(() => focusedKey(page)).toBe('S-00031');
  expect(await frame.evaluate((f) => f.scrollTop)).toBeGreaterThan(200);
  // The focused row stays drawn when the scroll takes the window away from it.
  await frame.evaluate((f) => { f.scrollTop = f.scrollHeight - f.clientHeight; });
  await expect(row(table, 'S-10000')).toBeAttached();
  await expect(row(table, 'S-00031')).toBeAttached();
  expect(await focusedKey(page)).toBe('S-00031');
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => focusedKey(page)).toBe('S-00032');

  // Sort by Took: the window shows the fastest first, still a window.
  await frame.evaluate((f) => { f.scrollTop = 0; });
  await table.getByRole('button', { name: /Took/ }).click();
  await expect(table.locator('th[aria-sort="ascending"]')).toContainText('Took');
  const tooks = await table.locator('tbody tr[data-key] td[data-kind=number]').allInnerTexts();
  expect(tooks.slice(0, 5).map(Number)).toEqual([...tooks.slice(0, 5).map(Number)].sort((a, b) => a - b));
  expect(await drawn(table)).toBeLessThan(60);
  await box.screenshot({ path: capture('table-virtual') });
});

test('infinite: a loading row at the end loads the next rows as it comes into view', async ({ page }) => {
  await open(page, '/components/table', 'graphite');
  const box = section(page, 'infinite');
  const table = box.getByRole('table');
  const frame = table.locator('xpath=..');
  await expect(box.getByTestId('table-in-page')).toContainText('of 40 rows');
  const more = table.locator('tr[data-state=more]');
  await expect(more).toHaveCount(1);
  await expect(more).toHaveAttribute('aria-hidden', 'true');
  await expect(row(table, 'S-00041')).toHaveCount(0);
  await frame.evaluate((f) => { f.scrollTop = f.scrollHeight; });
  await expect(row(table, 'S-00040')).toBeAttached();
  await expect(table).toHaveAttribute('aria-busy', 'true');
  await expect(row(table, 'S-00041')).toBeAttached({ timeout: 5000 });
  await expect(table).not.toHaveAttribute('aria-busy', 'true');
  await expect(box.getByTestId('table-in-page')).toContainText('of 80 rows');
  // The second page fails (the rows panel's default): one row says so, with Try again; the rows stay.
  await frame.evaluate((f) => { f.scrollTop = f.scrollHeight; });
  const failed = table.locator('tr[data-state=more-failed]');
  await expect(failed).toContainText('Couldn’t load more.', { timeout: 5000 });
  await expect(row(table, 'S-00080')).toBeAttached();
  await frame.evaluate((f) => { f.scrollTop = f.scrollHeight; });
  await settled(table);
  await box.screenshot({ path: capture('table-infinite-graphite') });
  await failed.getByRole('button', { name: 'Try again' }).click();
  await expect(row(table, 'S-00081')).toBeAttached({ timeout: 5000 });
  await expect(box.getByTestId('table-in-page')).toContainText('of 120 rows');
});

test('Reduce Motion: hierarchy rows open and close at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/table', 'bone');
  const table = section(page, 'tree').getByRole('table');
  const running = () => table.evaluate((t) => [...t.querySelectorAll('tr, .mu-tree-chevron')].reduce((n, el) => n + el.getAnimations().length, 0));
  await row(table, 'brief').locator('.mu-table-branch').click();
  await expect(row(table, 'brief/goals')).toBeAttached();
  expect(await running()).toBe(0);
  await row(table, 'brief').locator('.mu-table-branch').click();
  await expect(row(table, 'brief/goals')).toHaveCount(0);
  expect(await running()).toBe(0);
});
