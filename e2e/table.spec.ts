import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Table: the cell kinds, the reading guide, sort (the arrow and the rows' travel), selection with the
// tool strip's count, open with the rail and the details, row actions, the filter's count, pages,
// density, waiting and empty told apart, narrow widths, the sticky head, Reduce Motion and 375 px.
const invoices = (page: Page) => page.getByRole('table', { name: 'Invoices', exact: false }).first();
const customers = (page: Page) => invoices(page).locator('tbody tr .mu-table-open').allInnerTexts();
const section = (page: Page, id: string) => page.locator(`section#${id}`);

test('every cell kind draws its own look', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const kinds = page.getByRole('table', { name: 'Cell kinds' });
  const row = (kind: string) => kinds.locator('tbody tr', { has: page.locator('td:first-child > .type-label-cell', { hasText: new RegExp(`^${kind}$`) }) });
  await expect(row('number').locator('td').nth(1)).toHaveText('1,204.5');
  await expect(row('currency').locator('td').nth(1)).toHaveText('−86.40'); // a real minus, the symbol in the header
  await expect(row('percent').locator('td').nth(1)).toHaveText('42.5');
  await expect(row('delta').locator('[data-trend=down]')).toHaveText('−3.2');
  await expect(row('date').locator('time')).toHaveText(/3h ago|3 hr\. ago|3 hours ago/);
  await expect(row('status').locator('[data-status=waiting]')).toHaveText('Waiting');
  await expect(row('person').getByRole('group')).toHaveAccessibleName('Ana Duarte, Kenji Mori, Lea Brandt, Omar Haddad, Sam Reyes');
  await expect(row('person').getByRole('img', { name: '2 more' })).toHaveText('+2');
  await expect(row('tags').locator('.mu-chip')).toHaveCount(2);
  await expect(row('tags')).toContainText('+2');
  await expect(row('progress').getByRole('meter')).toHaveAttribute('aria-valuenow', '64');
  await expect(row('trend').getByRole('img')).toHaveAccessibleName('Sample trend, 4 to 10');
  await expect(row('yes').locator('td').nth(1)).toHaveText('Yes');
  await expect(row('code').getByRole('button', { name: 'Copy a41f9c2' })).toHaveCount(1);
  // The empty column: a dash in ink3 for every kind but actions.
  await expect(row('number').locator('td').nth(3)).toHaveText('—none');
  // Units live in the headers.
  const services = page.getByRole('table', { name: 'Services this month' });
  await expect(services.locator('thead')).toContainText('Requests (k/day)');
  await expect(services.locator('thead')).toContainText('Cost (€)');
  await expect(services.locator('thead')).toContainText('Errors (%)');
  // Numbers end-aligned; text at the start.
  expect(await services.locator('tbody td[data-kind=currency]').first().evaluate((td) => getComputedStyle(td).textAlign)).toBe('right');
  // A cost going up is bad: red; going down is good: green; the sign is always there.
  const search = services.locator('tbody tr', { hasText: 'Search' }).locator('[data-trend=up]');
  await expect(search).toHaveText('+18.4');
  expect(await search.locator('.table-arrow').evaluate((s) => s.classList.contains('text-red'))).toBe(true);
});

test('sorting morphs the arrow, says aria-sort and reorders the rows', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const services = page.locator('#numbers').getByRole('table');
  const names = () => services.locator('tbody tr td:first-child').evaluateAll((tds) => tds.map((td) => td.firstChild?.textContent));
  await expect(services.getByRole('columnheader', { name: /^Cost \(/ })).toHaveAttribute('aria-sort', 'descending');
  expect((await names())[0]).toBe('Sync');
  await services.getByRole('button', { name: /Requests/ }).click();
  await expect(services.getByRole('columnheader', { name: /Requests/ })).toHaveAttribute('aria-sort', 'ascending');
  expect(await names()).toEqual(['Billing', 'Mail', 'Media resize', 'Search', 'API gateway', 'Sync']);
  const arrow = services.getByRole('button', { name: /Requests/ }).locator('svg');
  const before = await arrow.innerHTML();
  await services.getByRole('button', { name: /Requests/ }).click();
  await expect(services.getByRole('columnheader', { name: /Requests/ })).toHaveAttribute('aria-sort', 'descending');
  await expect.poll(() => arrow.innerHTML()).not.toBe(before); // the glyph morphed, not rotated
});

test('each row travels from where it was when sorted', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const moving = await page.getByRole('table', { name: 'Services this month' }).evaluate(async (table) => {
    const sync = [...table.querySelectorAll('tbody tr')].find((tr) => tr.textContent?.startsWith('Sync')) as HTMLElement;
    const before = sync.getBoundingClientRect().top;
    ([...table.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Cost')) as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const early = sync.getBoundingClientRect().top;
    await new Promise((r) => setTimeout(r, 700));
    return { before, early, after: sync.getBoundingClientRect().top };
  });
  expect(moving.after).toBeGreaterThan(moving.before + 100); // most cost first → last
  expect(moving.early).toBeLessThan(moving.after - 20); // mid-flight, between
});

test('the reading guide follows the pointer and the keys', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const table = invoices(page);
  const rows = table.locator('tbody tr');
  await rows.nth(2).hover();
  await expect(rows.nth(2)).toHaveAttribute('data-highlighted', '');
  const guide = page.locator('.mu-table-frame').first().locator('> .mu-indicator');
  await expect.poll(async () => {
    const [g, r] = await Promise.all([guide.boundingBox(), rows.nth(2).boundingBox()]);
    return Math.abs((g?.y ?? 0) - (r?.y ?? 0)) < 1 && Math.abs((g?.height ?? 0) - (r?.height ?? 0)) < 1;
  }).toBe(true);
  // Keys: focus a row's open button, ↓ moves to the next row, and the guide goes with it.
  await rows.nth(0).locator('.mu-table-open').focus();
  await page.keyboard.press('ArrowDown');
  await expect(rows.nth(1).locator('.mu-table-open')).toBeFocused();
  await expect(rows.nth(1)).toHaveAttribute('data-highlighted', '');
});

test('open a row: the rail, and its details as Properties', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const first = invoices(page).locator('tbody tr').first();
  const name = (await first.locator('.mu-table-open').innerText()).trim();
  await first.locator('.mu-table-open').focus();
  await page.keyboard.press('Enter');
  await expect(first.locator('.mu-table-rail')).toHaveCount(1);
  const details = page.getByRole('region', { name: /^Invoice INV-/ });
  await expect(details.getByRole('heading')).toHaveText(name);
  await expect(details.locator('dt')).toHaveText(['Invoice', 'Status', 'Owner', 'Due', 'Amount (€)', 'Billing']);
  // A click anywhere on the row opens it too (the open button is stretched over it): here it closes.
  const cell = await first.locator('td[data-kind=currency]').boundingBox();
  await page.mouse.click((cell?.x ?? 0) + (cell?.width ?? 0) / 2, (cell?.y ?? 0) + (cell?.height ?? 0) / 2);
  await expect(first.locator('.mu-table-rail')).toHaveCount(0);
});

test('row actions: the more key shows on hover and opens a menu; primary has its own key', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const row = invoices(page).locator('tbody tr').first();
  const more = row.getByRole('button', { name: /^More for / });
  const keys = row.locator('td[data-kind=actions] .table-reveal');
  await page.mouse.move(0, 0);
  await expect.poll(() => keys.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  await row.hover();
  await expect.poll(() => keys.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await expect(row.getByRole('button', { name: /^Send reminder / })).toBeVisible();
  await more.click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem')).toHaveText(['Send reminder', 'Download PDF', 'Duplicate', 'Delete']);
  await menu.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect(page.getByText(/^Acted on INV-/)).toBeVisible();
});

test('choosing several shows the tool strip with its count; filtering says how many of how many', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const table = invoices(page);
  const boxes = table.locator('tbody').getByRole('checkbox');
  await boxes.nth(0).click();
  await boxes.nth(1).click();
  await expect(table.getByRole('checkbox', { name: 'Select all' })).toHaveAttribute('aria-checked', 'mixed');
  await expect(page.getByRole('toolbar', { name: '2 selected invoices' })).toContainText('2 selected');
  await page.getByRole('toolbar').getByRole('button', { name: 'Clear selection' }).click();
  await expect(page.getByRole('navigation', { name: 'Invoice pages' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Find invoices' }).fill('kite');
  await expect(table.locator('caption')).toContainText('3 of 36');
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await page.getByRole('textbox', { name: 'Find invoices' }).fill('zzz');
  await expect(table.locator('tbody')).toContainText('Nothing matches.');
  await table.locator('tbody').getByRole('button', { name: 'Clear' }).click();
  await expect(table.locator('tbody tr')).toHaveCount(8);
  await expect(table.locator('caption')).not.toContainText('of 36');
});

test('pages move through the records', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const first = await customers(page);
  await page.getByRole('navigation', { name: 'Invoice pages' }).getByRole('button', { name: /^(Page )?2$/ }).click();
  await expect.poll(() => customers(page)).not.toEqual(first);
  await expect(invoices(page).locator('tbody tr')).toHaveCount(8);
});

test('density: roomy 48, regular 40, compact 32', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const box = section(page, 'density');
  const height = () => box.locator('tbody tr').first().evaluate((tr) => tr.getBoundingClientRect().height);
  expect(await height()).toBe(48);
  await box.getByRole('radio', { name: 'Regular 40' }).click();
  await expect.poll(height).toBe(40);
  await box.getByRole('radio', { name: 'Compact 32' }).click();
  await expect.poll(height).toBe(32);
});

test('waiting and empty are told apart', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const box = section(page, 'waiting');
  const table = box.getByRole('table');
  // Loading with none: skeleton rows in the columns' shapes, the table busy.
  await expect(table).toHaveAttribute('aria-busy', 'true');
  await expect(table.locator('tbody tr[data-state=loading]')).toHaveCount(4);
  await expect(table.locator('tbody .mu-skeleton').first()).toBeVisible();
  // Refreshing: the rows stay, and dim once the show delay passes.
  await box.getByRole('radio', { name: 'Refreshing' }).click();
  await expect(table.locator('tbody tr[data-key]')).toHaveCount(4);
  await expect(table.locator('tbody')).toHaveAttribute('data-waiting', '', { timeout: 3000 });
  await box.getByRole('radio', { name: 'Empty' }).click();
  await expect(table.locator('tbody')).toContainText('No invoices yet.');
  await expect(table.getByRole('button', { name: 'New invoice' })).toBeVisible();
  await box.getByRole('radio', { name: 'Nothing matches' }).click();
  await expect(table.locator('tbody')).toContainText('Nothing matches.');
  await expect(table.locator('caption')).toContainText('0 of 36');
  await box.getByRole('radio', { name: 'Failed' }).click();
  await expect(table.locator('tbody')).toContainText('Couldn’t load invoices.');
  await table.getByRole('button', { name: 'Try again' }).click();
  await expect(box.getByRole('radio', { name: 'Loading' })).toBeChecked();
});

test('narrow: low-priority columns leave and their values move under the name', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const frame = page.getByTestId('table-narrow');
  const table = frame.getByRole('table');
  const visible = (sel: string) => table.locator(sel).first().evaluate((el) => getComputedStyle(el).display !== 'none');
  // The frame at its widest (672 inside): every column stands and nothing has moved.
  expect(await visible('th[data-leave="2"]')).toBe(true);
  expect(await visible('[data-more="2"]')).toBe(false);
  await frame.evaluate((el) => { (el as HTMLElement).style.width = '420px'; });
  await expect.poll(() => visible('th[data-leave="2"]')).toBe(false);
  await expect(table.locator('tbody tr').first().locator('.mu-table-more')).toContainText('Owner');
  await expect(table.locator('tbody tr').first().locator('.mu-table-more')).toContainText('Due');
  // The primary action's own key leaves too; it is still in the menu.
  expect(await table.locator('.mu-table-primary-key').first().evaluate((el) => getComputedStyle(el).display)).toBe('none');
  // Never sideways: the table fits its frame.
  expect(await table.evaluate((t) => t.scrollWidth <= (t.parentElement as HTMLElement).clientWidth + 1)).toBe(true);
  await frame.screenshot({ path: capture('table-narrow-bone') });
  // Priority 3 leaves first, under 720: at the stage's 688 the services' p95 and errors have gone under
  // the name while the trend and budget (priority 2) stay; under 560 those go too.
  const services = page.locator('#numbers').getByRole('table');
  const shows = (sel: string) => services.locator(sel).first().evaluate((el) => getComputedStyle(el).display !== 'none');
  expect(await shows('th[data-leave="3"]')).toBe(false);
  expect(await shows('th[data-leave="2"]')).toBe(true);
  await expect(services.locator('tbody tr').first().locator('[data-more="3"]').first()).toContainText('p95');
  await services.evaluate((t) => { (t.closest('.mu-table-frame')!.parentElement as HTMLElement).style.width = '520px'; });
  await expect.poll(() => shows('th[data-leave="2"]')).toBe(false);
  await expect(services.locator('tbody tr').first().locator('[data-more="3"]').first()).toBeVisible();
});

test('the head stays on frost while many rows scroll under it', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const table = page.getByRole('table', { name: 'Deployments' });
  const frame = table.locator('xpath=..');
  await frame.evaluate((el) => { el.scrollTop = 400; });
  const [head, box] = await Promise.all([table.locator('thead th').first().boundingBox(), frame.boundingBox()]);
  expect(Math.abs((head?.y ?? 0) - (box?.y ?? 0))).toBeLessThan(1);
  expect(await table.locator('thead th').first().evaluate((th) => getComputedStyle(th).position)).toBe('sticky');
  // A feed loads more at its end.
  await expect(table.locator('tbody tr')).toHaveCount(20);
  await page.locator('#many').getByRole('button', { name: 'Load more' }).click();
  await expect(table.locator('tbody tr')).toHaveCount(40);
  await expect(page.locator('#many').getByRole('button', { name: 'Load more' })).toHaveCount(0);
});

for (const colorway of COLORWAYS) {
  test(`captures in ${colorway}`, async ({ page }) => {
    await open(page, '/components/table', colorway);
    // The section first, so the screenshot doesn't scroll another row under the pointer.
    await page.locator('section', { hasText: 'Playground' }).first().scrollIntoViewIfNeeded();
    await invoices(page).locator('tbody tr').nth(1).hover();
    await page.waitForTimeout(400);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`table-${colorway}`) });
    await section(page, 'numbers').screenshot({ path: capture(`table-numbers-${colorway}`) });
    await section(page, 'cells').screenshot({ path: capture(`table-cells-${colorway}`) });
  });
}

test('Reduce Motion: rows jump to their places', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/table', 'bone');
  const moving = await page.getByRole('table', { name: 'Services this month' }).evaluate(async (table) => {
    const sync = [...table.querySelectorAll('tbody tr')].find((tr) => tr.textContent?.startsWith('Sync')) as HTMLElement;
    const before = sync.getBoundingClientRect().top;
    ([...table.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Cost')) as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { before, early: sync.getBoundingClientRect().top, running: sync.getAnimations().length };
  });
  expect(moving.running).toBe(0);
  expect(moving.early).toBeGreaterThan(moving.before + 100);
});

test('at 375 wide nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page, '/components/table', 'bone');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const table = invoices(page);
  expect(await table.evaluate((t) => t.scrollWidth <= (t.parentElement as HTMLElement).clientWidth + 1)).toBe(true);
  await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture('table-375-bone') });
});
