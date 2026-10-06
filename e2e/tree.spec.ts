import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Tree: the WAI-ARIA tree pattern on flat rows. The keyboard paths (one tab stop, arrows, → and ←,
// Home/End, type-ahead, *, Space and Enter), multiple selection, a level that loads and one that fails,
// F2 rename with QuickEdit, and the motion: the chevron's quarter turn, rows landing and leaving.
const demo = (page: Page, id: string) => page.getByTestId(id);
const item = (scope: Locator, name: string) => scope.getByRole('treeitem', { name, exact: true });
const focusedName = (page: Page) => page.evaluate(() => {
  const el = document.activeElement;
  const id = el?.getAttribute('aria-labelledby');
  return id ? document.getElementById(id)?.textContent ?? '' : '';
});

async function tabInto(page: Page, scope: Locator) {
  await scope.scrollIntoViewIfNeeded();
  // Tab from just before the tree lands on its one tab stop.
  await scope.evaluate((el) => {
    const before = document.createElement('button');
    before.textContent = 'before';
    before.className = 'sr-only';
    el.parentElement!.insertBefore(before, el);
    before.focus();
  });
  await page.keyboard.press('Tab');
}

for (const colorway of COLORWAYS) {
  test(`walks the tree with the keyboard in ${colorway}`, async ({ page }) => {
    await open(page, '/components/tree', colorway);
    const tree = demo(page, 'tree-play').getByRole('tree', { name: 'Project files' });
    await tabInto(page, tree);
    // One tab stop: the selected row.
    await expect.poll(() => focusedName(page)).toBe('Tokens.json');
    await expect(tree.locator('[role=treeitem][tabindex="0"]')).toHaveCount(1);
    await expect(item(tree, 'Tokens.json')).toHaveAttribute('aria-level', '2');
    await expect(item(tree, 'Tokens.json')).toHaveAttribute('aria-selected', 'true');

    // ← goes to the parent; ← again closes it and its rows leave; → opens it; → again goes in.
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => focusedName(page)).toBe('Design');
    await page.keyboard.press('ArrowLeft');
    await expect(item(tree, 'Design')).toHaveAttribute('aria-expanded', 'false');
    await expect(item(tree, 'Screens')).toHaveCount(0);
    await page.keyboard.press('ArrowRight');
    await expect(item(tree, 'Design')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focusedName(page)).toBe('Screens');
    await page.keyboard.press('ArrowRight');
    await expect(item(tree, 'Home.fig')).toBeVisible();
    await expect(item(tree, 'Home.fig')).toHaveAttribute('aria-level', '3');
    await expect(item(tree, 'Home.fig')).toHaveAttribute('aria-posinset', '1');
    await expect(item(tree, 'Home.fig')).toHaveAttribute('aria-setsize', '3');

    // The grooves of the branch holding the focus light.
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focusedName(page)).toBe('Home.fig');
    await expect(item(tree, 'Search.fig').locator('.mu-tree-guides > span[data-lit]')).toHaveCount(1);
    await page.waitForTimeout(400);
    await demo(page, 'tree-play').screenshot({ path: capture(`tree-${colorway}`) });

    // Home and End; Enter on a file shows it (the rail).
    await page.keyboard.press('End');
    await expect.poll(() => focusedName(page)).toBe('Read me.md');
    await page.keyboard.press('Home');
    await expect.poll(() => focusedName(page)).toBe('Brief');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(demo(page, 'tree-play-opened')).toHaveText('Showing brief/goals');
  });
}

test('type-ahead jumps by letters, and a repeated letter cycles', async ({ page }) => {
  await open(page, '/components/tree', 'bone');
  const tree = demo(page, 'tree-play').getByRole('tree');
  await tabInto(page, tree);
  await page.keyboard.type('re');
  await expect.poll(() => focusedName(page)).toBe('Read me.md');
  await expect(item(tree, 'Read me.md').locator('.mu-tree-typed')).toHaveText('Re');
  await page.waitForTimeout(700);
  await expect(item(tree, 'Read me.md').locator('.mu-tree-typed')).toHaveCount(0);
  await page.keyboard.press('s');
  await expect.poll(() => focusedName(page)).toBe('Screens');

  const team = demo(page, 'tree-multiple').getByRole('tree');
  await item(team, 'Engineering').click();
  await page.keyboard.press('a');
  await expect.poll(() => focusedName(page)).toBe('Ana Duarte');
  await page.keyboard.press('a');
  await expect.poll(() => focusedName(page)).toBe('Apps');
});

test('* opens every branch beside the focused row; Space selects; disabled rows refuse', async ({ page }) => {
  await open(page, '/components/tree', 'bone');
  const tree = demo(page, 'tree-play').getByRole('tree');
  await tabInto(page, tree);
  await page.keyboard.press('Home');
  await page.keyboard.press('*');
  await expect(item(tree, 'Brief')).toHaveAttribute('aria-expanded', 'true');
  await expect(item(tree, 'Goals.md')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  await expect(item(tree, 'Goals.md')).toHaveAttribute('aria-selected', 'true');
  await expect(item(tree, 'Tokens.json')).toHaveAttribute('aria-selected', 'false');
  // Budget is disabled: the keyboard reaches it, Space doesn't take it.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => focusedName(page)).toBe('Budget.xlsx');
  await expect(item(tree, 'Budget.xlsx')).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press(' ');
  await expect(item(tree, 'Goals.md')).toHaveAttribute('aria-selected', 'true');
  // An empty branch says so at its children's level.
  await item(tree, 'Archive').click();
  await page.keyboard.press('ArrowRight');
  await expect(tree.locator('[data-empty]')).toHaveText('Empty');
});

test('a click on the chevron opens without selecting; the chevron turns a quarter', async ({ page }) => {
  await open(page, '/components/tree', 'graphite');
  const tree = demo(page, 'tree-play').getByRole('tree');
  const brief = item(tree, 'Brief');
  const chevron = brief.locator('.mu-tree-chevron');
  await expect(chevron).toHaveCSS('rotate', '-90deg');
  await brief.locator('.mu-tree-disclosure').click();
  await expect(brief).toHaveAttribute('aria-expanded', 'true');
  await expect(brief).toHaveAttribute('aria-selected', 'false');
  await expect(chevron).toHaveCSS('rotate', '0deg');
  // The children land: mid-flight a child is part-way in.
  await expect(item(tree, 'Goals.md')).toBeVisible();
});

test('several at once: ⌘-click toggles, Shift extends, ⌘A takes every row', async ({ page }) => {
  await open(page, '/components/tree', 'bone');
  const box = demo(page, 'tree-multiple');
  const tree = box.getByRole('tree', { name: 'Team' });
  await expect(tree).toHaveAttribute('aria-multiselectable', 'true');
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await item(tree, 'Kenji Mori').click({ modifiers: [mod] });
  await expect(box.getByTestId('tree-multiple-count')).toHaveText('2 selected');
  await item(tree, 'Ana Duarte').click({ modifiers: [mod] });
  await expect(box.getByTestId('tree-multiple-count')).toHaveText('1 selected');
  await item(tree, 'Web').click();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(box.getByTestId('tree-multiple-count')).toHaveText('3 selected');
  await page.keyboard.press(`${mod}+a`);
  await expect(box.getByTestId('tree-multiple-count')).toHaveText('8 selected');
  await box.screenshot({ path: capture('tree-multiple-bone') });
});

test('a level loads in the chevron\'s slot; a failed one says Try again, and retrying lands', async ({ page }) => {
  await open(page, '/components/tree', 'bone');
  const box = demo(page, 'tree-loading');
  const tree = box.getByRole('tree', { name: 'Drive' });
  const archive = item(tree, 'Archive');
  await archive.click();
  // Waiting: held, then the ring after the show delay.
  await expect(archive).toHaveAttribute('aria-busy', 'true');
  await expect(archive.locator('.mu-tree-disclosure')).toHaveAttribute('data-showing', '');
  await expect(archive.locator('.mu-spinner')).toBeVisible();
  // It fails: closed, sync-error, words on the row.
  await expect(archive).toHaveAttribute('aria-expanded', 'false');
  await expect(archive.locator('.mu-tree-failed')).toBeVisible();
  await expect(archive).toHaveAccessibleDescription('Couldn’t load · Try again');
  await box.screenshot({ path: capture('tree-failed-bone') });
  // Again: it lands.
  await page.keyboard.press('ArrowRight');
  await expect(item(tree, '2025')).toBeVisible();
  await expect(archive.locator('.mu-tree-failed')).toHaveCount(0);
  await expect(archive).not.toHaveAttribute('aria-busy', 'true');
  // A fast load shows nothing but its result.
  await item(tree, 'New folder').click();
  await expect(tree.locator('[data-empty]')).toHaveText('Empty');
  await expect(item(tree, 'New folder').locator('.mu-spinner')).toHaveCount(0);
});

test('F2 renames with QuickEdit and focus comes back to the row', async ({ page }) => {
  await open(page, '/components/tree', 'bone');
  const tree = demo(page, 'tree-play').getByRole('tree');
  await item(tree, 'Notes.md').click();
  await page.keyboard.press('F2');
  const field = page.getByRole('textbox', { name: 'Rename' });
  await expect(field).toBeFocused();
  // A file keeps its extension out of the selection.
  expect(await field.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, 'Notes'.length]);
  await page.keyboard.type('Read me');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Something here is already called Read me.md.')).toBeVisible();
  await page.keyboard.type('s');
  await page.keyboard.press('Enter');
  await expect(item(tree, 'Read mes.md')).toBeVisible();
  await expect(field).toBeHidden();
  await expect.poll(() => focusedName(page)).toBe('Read mes.md');
});

test('Reduce Motion: the chevron and rows change at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/tree', 'graphite');
  const tree = demo(page, 'tree-play').getByRole('tree');
  const brief = item(tree, 'Brief');
  await brief.locator('.mu-tree-disclosure').click();
  // No turn and no landing in flight.
  expect(await brief.locator('.mu-tree-chevron').evaluate((el) => getComputedStyle(el).transitionDuration.split(',').every((d) => parseFloat(d) < 0.01))).toBe(true);
  expect(await tree.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSTransition)).length)).toBe(0);
  await brief.locator('.mu-tree-disclosure').click();
  await expect(item(tree, 'Goals.md')).toHaveCount(0);
  await demo(page, 'tree-play').screenshot({ path: capture('tree-reduced-graphite') });
});
