import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Table, the Should tier: totals on the drum, groups that collapse with subtotals, a pinned first column
// with its shadow, row headers and checkbox cells, live rows that land or wait behind "N new", detail in
// place, and columns to hide and size. Reduce Motion, both colorways and 375 px.
const section = (page: Page, id: string) => page.locator(`section#${id}`);
const frameOf = (table: Locator) => table.locator('xpath=..');
/** A drum's settled words (the measure layer holds the value it is turning to). */
const drum = (l: Locator) => l.locator('.mu-swap-text-measure').first().evaluate((el) => el.textContent ?? '');

test('totals: a sunk readout row at the foot whose sums turn on the drum', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const box = section(page, 'totals');
  const foot = box.locator('tfoot tr');
  await expect(foot.locator('td').first()).toContainText('Total');
  const cost = foot.locator('td').nth(4);
  await expect.poll(() => drum(foot.locator('td').nth(1))).toBe('1,365.5');
  await expect.poll(() => drum(cost)).toBe('8,392.35');
  expect(await cost.evaluate((td) => getComputedStyle(td).position)).toBe('sticky');
  expect(await cost.evaluate((td) => getComputedStyle(td).backgroundImage)).toContain('gradient'); // the well
  await box.getByRole('radio', { name: 'eu-west' }).click();
  await expect.poll(() => drum(cost)).toBe('4,150.50');
  await expect(box.locator('tbody tr')).toHaveCount(3);
});

test('grouped: headers with counts and subtotals that collapse, held under the head', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const table = section(page, 'grouped').getByRole('table');
  const header = (name: string) => table.locator(`tr[data-group="${name}"]`);
  const toggle = (name: string) => header(name).getByRole('button');
  // Draft starts closed: its header stays, its rows don't show.
  await expect(toggle('Draft')).toHaveAttribute('aria-expanded', 'false');
  await expect(header('Draft').locator('xpath=..').locator('tr[data-key]')).toHaveCount(0);
  // Paid: the count is its rows, the subtotal their amounts.
  const paid = header('Paid').locator('xpath=..');
  const rows = await paid.locator('tr[data-key]').count();
  expect(await drum(toggle('Paid'))).toBe(String(rows));
  const amounts = await paid.locator('tr[data-key] td[data-kind=currency]').allInnerTexts();
  const sum = amounts.reduce((n, a) => n + Number(a.replace(/,/g, '')), 0);
  await expect.poll(() => drum(header('Paid').locator('td .mu-swap-text'))).toBe(sum.toLocaleString('en-US', { minimumFractionDigits: 2 }));
  // Held under the head.
  const th = header('Paid').locator('th');
  expect(await th.evaluate((el) => [getComputedStyle(el).position, getComputedStyle(el).top])).toEqual(['sticky', '32px']);
  // Closing it: the chevron turns back, its rows leave, and the next group travels up into the gap.
  const next = header('Overdue');
  const moving = await table.evaluate(async (t) => {
    const g = t.querySelector<HTMLElement>('tr[data-group="Overdue"]')!;
    const before = g.offsetTop;
    t.querySelector<HTMLButtonElement>('tr[data-group="Paid"] button')!.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const early = g.getBoundingClientRect().top - t.getBoundingClientRect().top;
    await new Promise((r) => setTimeout(r, 700));
    return { before, early, after: g.offsetTop };
  });
  expect(moving.after).toBeLessThan(moving.before - 100);
  expect(moving.early).toBeGreaterThan(moving.after + 20); // mid-flight, still below its place
  await expect(toggle('Paid')).toHaveAttribute('aria-expanded', 'false');
  await expect(paid.locator('tr[data-key]')).toHaveCount(0);
  await expect.poll(() => toggle('Paid').locator('svg').evaluate((s) => getComputedStyle(s).rotate)).toBe('-90deg');
  await expect(next).toBeVisible();
  // Opening Draft shows its rows, the chevron down.
  await toggle('Draft').click();
  await expect(header('Draft').locator('xpath=..').locator('tr[data-key]').first()).toBeVisible();
  await expect.poll(() => toggle('Draft').locator('svg').evaluate((s) => getComputedStyle(s).rotate)).toBe('0deg');
});

test('a matrix: row headers, the first column pinned, a shadow only while something is under it', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const table = section(page, 'matrix').getByRole('table');
  const frame = frameOf(table);
  await expect(table.getByRole('rowheader')).toHaveText(['Free', 'Starter', 'Team', 'Business', 'Enterprise']);
  const plan = table.getByRole('rowheader', { name: 'Team' });
  const shadow = () => plan.evaluate((el) => getComputedStyle(el, '::after').opacity);
  expect(await shadow()).toBe('0');
  expect(await frame.evaluate((f) => f.scrollWidth > f.clientWidth)).toBe(true);
  const x0 = (await plan.boundingBox())!.x;
  await frame.evaluate((f) => { f.scrollLeft = 160; });
  await expect.poll(shadow).toBe('1');
  expect(Math.abs((await plan.boundingBox())!.x - x0)).toBeLessThan(1); // it stayed
  // The caption stays in view too.
  await expect(table.locator('caption')).toContainText('Plans compared');
  expect(await table.locator('caption > span').evaluate((s) => s.getBoundingClientRect().left - s.closest('.mu-table-frame')!.getBoundingClientRect().left)).toBeLessThan(1);
  await frame.evaluate((f) => { f.scrollLeft = 0; });
  await expect.poll(shadow).toBe('0');
  // Yes is a check, no is nothing said as No.
  await expect(table.locator('tbody tr').first().locator('td[data-kind=yes]').first()).toHaveText('No');
});

test('a permissions matrix: checkbox cells, read-only for the owner, a dash where a role can’t', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const box = section(page, 'permissions');
  const publish = box.getByRole('checkbox', { name: 'Publish, Editor' });
  await expect(publish).toHaveAttribute('aria-checked', 'false');
  await expect(box.getByRole('checkbox', { name: 'Publish, Owner' })).toBeDisabled();
  await expect(box.locator('p[aria-live]')).toContainText('14 grants');
  await publish.click();
  await expect(publish).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => drum(box.locator('p[aria-live]'))).toBe('15 grants');
  await expect(box.locator('tbody tr', { hasText: 'Billing' }).locator('td').nth(3)).toHaveText('—none');
});

test('live rows land at the top, or wait behind "N new" while you read further down', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const box = section(page, 'live');
  const table = box.getByRole('table');
  const frame = frameOf(table);
  const rows = table.locator('tbody tr[data-key]');
  const news = box.locator('.mu-table-news button');
  await expect(rows).toHaveCount(24);
  await expect(news).toHaveAttribute('aria-hidden', 'true');
  // At the top: they land (a fade from one nest above) and the rest travel down.
  const landing = await table.evaluate(async (t) => {
    ([...document.querySelectorAll('section#live button')].find((b) => b.textContent?.includes('Three')) as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const first = t.querySelector('tbody tr[data-key]') as HTMLElement;
    return first.getAnimations().length;
  });
  expect(landing).toBeGreaterThan(0);
  await expect(rows).toHaveCount(27);
  // Scrolled away: they wait, and the key counts them.
  await frame.evaluate((f) => { f.scrollTop = 240; });
  await expect.poll(() => frame.evaluate((f) => f.scrollTop)).toBe(240);
  const top = await rows.first().innerText();
  await box.getByRole('button', { name: 'Three events' }).click();
  await expect(news).toHaveAttribute('aria-hidden', 'false');
  await expect.poll(() => drum(news)).toBe('3 new');
  await expect(rows).toHaveCount(27);
  expect(await frame.evaluate((f) => f.scrollTop)).toBe(240); // nothing pushed
  await news.evaluate((b: HTMLElement) => b.click()); // where it sits (scrolling it into view would bring you to the top first)
  await expect(rows).toHaveCount(30);
  await expect.poll(() => frame.evaluate((f) => f.scrollTop)).toBe(0);
  await expect(news).toHaveAttribute('aria-hidden', 'true');
  expect(await rows.first().innerText()).not.toBe(top);
});

test('row detail opens a panel in place and the rows below make room', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const table = section(page, 'detail').getByRole('table');
  const key = table.getByRole('button', { name: /^Details for release\/4\.2/ }).first();
  await expect(key).toHaveAttribute('aria-expanded', 'false');
  const moving = await table.evaluate(async (t) => {
    const rows = [...t.querySelectorAll<HTMLElement>('tbody tr[data-key]')];
    const below = rows[2];
    const before = below.getBoundingClientRect().top;
    rows[1].querySelector<HTMLButtonElement>('button[aria-expanded]')!.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const early = below.getBoundingClientRect().top;
    await new Promise((r) => setTimeout(r, 700));
    return { before, early, after: below.getBoundingClientRect().top };
  });
  expect(moving.after).toBeGreaterThan(moving.before + 60);
  expect(moving.early).toBeLessThan(moving.after - 10);
  await expect(key).toHaveAttribute('aria-expanded', 'true');
  const panel = table.locator('tr[data-detail]');
  await expect(panel.locator('dt')).toHaveText(['Commit', 'Branch', 'By', 'Started', 'Took (s)']);
  expect(await key.getAttribute('aria-controls')).toBe(await panel.getAttribute('id'));
  await key.click();
  await expect(panel).toHaveCount(0);
});

test('columns: hide and show from a menu of checkboxes; drag, step and reset a width; the host keeps both', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const box = section(page, 'columns');
  const table = box.getByRole('table');
  const said = box.getByTestId('table-columns-state');
  await expect(said).toHaveText('Hidden: Owner');
  await expect(table.getByRole('columnheader', { name: 'Owner' })).toHaveCount(0);
  await box.getByRole('button', { name: 'Columns' }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitemcheckbox')).toHaveText(['Customer', 'Status', 'Owner', 'Due', 'Amount']);
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Customer' })).toHaveAttribute('aria-disabled', 'true');
  await menu.getByRole('menuitemcheckbox', { name: 'Owner' }).click();
  await menu.getByRole('menuitemcheckbox', { name: 'Status' }).click();
  await expect(menu).toBeVisible(); // stays open for the next
  await page.keyboard.press('Escape');
  await expect(said).toHaveText('Hidden: Status');
  await expect(table.getByRole('columnheader', { name: 'Owner' })).toHaveCount(1);
  await expect(table.getByRole('columnheader', { name: /^Status/ })).toHaveCount(0);

  // Drag the hairline at Due's end: the column follows the pointer.
  const due = table.getByRole('columnheader', { name: /^Due/ });
  const grip = table.getByRole('separator', { name: 'Size Due' });
  const w0 = (await due.boundingBox())!.width;
  const g = (await grip.boundingBox())!;
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await expect.poll(() => grip.evaluate((el) => getComputedStyle(el, '::after').opacity)).toBe('1'); // the grip shows
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2 + 60, g.y + g.height / 2, { steps: 6 });
  await expect.poll(async () => Math.round((await due.boundingBox())!.width - w0)).toBe(60);
  await page.mouse.up();
  await expect(said).toContainText(`Due ${Math.round(w0 + 60)}`);
  // Every cell in the column follows.
  const cell = table.locator('tbody tr').first().locator('td[data-kind=date]');
  expect(Math.abs((await cell.boundingBox())!.width - (await due.boundingBox())!.width)).toBeLessThan(1);
  // Keys step it by 8; ↩ gives the column back its own width.
  await grip.focus();
  await page.keyboard.press('ArrowRight');
  await expect(said).toContainText(`Due ${Math.round(w0 + 68)}`);
  await page.keyboard.press('Enter');
  await expect(said).not.toContainText('Due');
  await expect.poll(async () => Math.abs((await due.boundingBox())!.width - w0)).toBeLessThan(2);
});

test('Reduce Motion: groups, detail and live rows change at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/table', 'bone');
  const running = (id: string, click: string) => section(page, id).evaluate(async (s, sel) => {
    (s.querySelector(sel) as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return [...s.querySelectorAll('tbody, tbody tr, td')].reduce((n, el) => n + el.getAnimations().length, 0);
  }, click);
  expect(await running('grouped', 'tr[data-group="Draft"] button')).toBe(0);
  expect(await running('detail', 'tbody tr button[aria-expanded]')).toBe(0);
  expect(await section(page, 'live').evaluate(async (s) => {
    ([...s.querySelectorAll('button')].find((b) => b.textContent?.includes('Three')) as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return [...s.querySelectorAll('tbody tr')].reduce((n, el) => n + el.getAnimations().length, 0);
  })).toBe(0);
  await expect(section(page, 'live').locator('tbody tr[data-key]')).toHaveCount(27);
});

test('at 375 wide the page never scrolls sideways; a matrix scrolls inside its frame', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page, '/components/table', 'bone');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const frame = frameOf(section(page, 'matrix').getByRole('table'));
  expect(await frame.evaluate((f) => f.scrollWidth > f.clientWidth)).toBe(true);
  await section(page, 'matrix').screenshot({ path: capture('table-matrix-375-bone') });
  await section(page, 'grouped').screenshot({ path: capture('table-grouped-375-bone') });
});

for (const colorway of COLORWAYS) {
  test(`Should captures in ${colorway}`, async ({ page }) => {
    await open(page, '/components/table', colorway);
    await section(page, 'totals').screenshot({ path: capture(`table-totals-${colorway}`) });
    const grouped = section(page, 'grouped');
    await frameOf(grouped.getByRole('table')).evaluate((f) => { f.scrollTop = 180; });
    await page.waitForTimeout(300);
    await grouped.screenshot({ path: capture(`table-grouped-${colorway}`) });
    const matrix = section(page, 'matrix');
    await frameOf(matrix.getByRole('table')).evaluate((f) => { f.scrollLeft = 120; });
    await page.waitForTimeout(400);
    await matrix.screenshot({ path: capture(`table-matrix-${colorway}`) });
    await section(page, 'permissions').screenshot({ path: capture(`table-permissions-${colorway}`) });
    const live = section(page, 'live');
    await frameOf(live.getByRole('table')).evaluate((f) => { f.scrollTop = 160; });
    await live.getByRole('button', { name: 'Three events' }).click();
    await page.waitForTimeout(500);
    await live.screenshot({ path: capture(`table-live-${colorway}`) });
    const detail = section(page, 'detail');
    await detail.getByRole('button', { name: /^Details for main/ }).nth(1).click();
    await page.waitForTimeout(600);
    await detail.screenshot({ path: capture(`table-detail-${colorway}`) });
    const columns = section(page, 'columns');
    await columns.getByRole('button', { name: 'Columns' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: capture(`table-columns-${colorway}`), clip: (await columns.boundingBox())! });
  });
}
