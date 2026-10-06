import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Combobox: typing filters the rows (by contains) at once while the plate's height settles to the new count;
// the typed letters stand out; arrows and Enter choose; the clear key takes a choice away; nothing found says
// the query back. Then the variations: items with detail, groups and recent, a search you run (loading,
// failed), several values as chips (create, commands), and a picker from a button.
const CITIES = ['Amsterdam', 'Athens', 'Barcelona', 'Berlin', 'Bologna', 'Bordeaux', 'Bruges', 'Budapest', 'Copenhagen', 'Dublin', 'Edinburgh', 'Florence', 'Geneva', 'Lisbon', 'Ljubljana', 'London', 'Lyon', 'Madrid', 'Marseille', 'Milan', 'Munich', 'Naples', 'Oslo', 'Paris', 'Porto', 'Prague', 'Rome', 'Seville', 'Stockholm', 'Valencia', 'Vienna', 'Zurich'];
const matching = (q: string) => CITIES.filter((c) => c.toLowerCase().includes(q)).length;
const field = (page: Page, name = 'City') => page.getByRole('combobox', { name, exact: true });
const well = (input: Locator) => input.locator('xpath=ancestor::*[contains(concat(" ",@class," ")," mu-combobox ")][1]');
const plateHeight = (page: Page) => page.evaluate(() => document.querySelector('.mu-combobox-fit')?.getBoundingClientRect().height ?? -1);
const options = (page: Page) => page.getByRole('listbox').getByRole('option');

for (const colorway of COLORWAYS) {
  test(`filters, chooses by keys, and clears in ${colorway}`, async ({ page }) => {
    await open(page, '/components/combobox', colorway);
    const input = field(page);
    await input.click();
    await input.pressSequentially('b');
    await expect(options(page)).toHaveCount(matching('b'));
    await input.pressSequentially('o');
    await expect(options(page)).toHaveCount(matching('bo')); // Bologna, Bordeaux, Lisbon
    // Matches you can see: the typed letters in ink, the rest in ink2.
    const lisbon = options(page).filter({ hasText: 'Lisbon' });
    await expect(lisbon.locator('.mu-combobox-match')).toHaveText('bo');
    const inks = await lisbon.evaluate((row) => [getComputedStyle(row.querySelector('.mu-combobox-match')!).color, getComputedStyle(row.querySelector('.mu-combobox-match')!.previousElementSibling!).color]);
    expect(inks[0]).not.toBe(inks[1]);
    await expect.poll(async () => { const a = await plateHeight(page); await page.waitForTimeout(80); return a === (await plateHeight(page)); }).toBe(true);
    const box = (await well(input).boundingBox())!;
    await page.screenshot({ path: capture(`combobox-${colorway}`), clip: { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: 160 } });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('Bordeaux');
    await expect(page.getByText('trip to Bordeaux')).toBeVisible();

    // A chosen value can be taken away with the clear key.
    await well(input).getByRole('button', { name: 'Clear' }).click();
    await expect(input).toHaveValue('');
    await expect(page.getByText('32 cities')).toBeVisible();

    await input.pressSequentially('xq');
    await expect(page.locator('.mu-combobox-empty')).toHaveText('No matches for “xq”');
  });
}

test('the plate settles to the new count instead of snapping', async ({ page }) => {
  await open(page, '/components/combobox', 'bone');
  const input = field(page);
  await input.click();
  await input.pressSequentially('b');
  await expect(options(page)).toHaveCount(matching('b'));
  await expect.poll(async () => { const a = await plateHeight(page); await page.waitForTimeout(80); return a === (await plateHeight(page)); }).toBe(true);
  const tall = await plateHeight(page);
  const heights = await page.evaluate(async () => {
    const input = document.querySelector<HTMLInputElement>('input[aria-label=City]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, 'bo');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const out: number[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => { out.push(document.querySelector('.mu-combobox-fit')!.getBoundingClientRect().height); if (performance.now() - t0 < 600) requestAnimationFrame(frame); else done(); };
      requestAnimationFrame(frame);
    });
    return out;
  });
  const short = heights.at(-1)!;
  expect(short).toBeLessThan(tall - 30);
  expect(heights.some((h) => h < tall - 2 && h > short + 2)).toBe(true);
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(short - 0.5);
});

test('the form field\'s sizes and states', async ({ page }) => {
  await open(page, '/components/combobox', 'bone');
  expect((await well(field(page)).boundingBox())!.height).toBe(32);
  expect((await well(field(page, 'Compact city')).boundingBox())!.height).toBe(28);
  await expect(field(page, 'Invalid city')).toHaveAttribute('aria-invalid', 'true');
  expect(await well(field(page, 'Invalid city')).evaluate((el) => getComputedStyle(el, '::before').boxShadow)).toContain('inset');
  await expect(field(page, 'Disabled city')).toBeDisabled();
});

test('the chevron key opens every row and turns while open', async ({ page }) => {
  await open(page, '/components/combobox', 'bone');
  // While the plate is open the page outside it leaves the accessibility tree, so the key is found by its label.
  const key = well(field(page)).locator('[aria-label="Show all"]');
  const glyph = key.locator('svg.mu-morph-icon[data-glyph=chevron]');
  await expect(glyph).not.toHaveAttribute('data-turn', '180');
  await key.click();
  await expect(options(page)).toHaveCount(CITIES.length);
  await expect(glyph).toHaveAttribute('data-turn', '180');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(glyph).not.toHaveAttribute('data-turn', '180');
});

test('items with detail: a second line, and a pick\'s glyph in the well', async ({ page }) => {
  await open(page, '/components/combobox', 'graphite');
  const person = field(page, 'Person');
  await person.click();
  await person.pressSequentially('maria');
  await expect(options(page)).toHaveCount(2);
  await expect(options(page).first().locator('.mu-combobox-detail')).toHaveText('maria@studio.pt');
  const detail = (await options(page).first().boundingBox())!.height;
  expect(detail).toBeGreaterThan(40); // two lines and the detail padding, taller than a 30 row
  await page.keyboard.press('Escape');

  const kind = field(page, 'Kind');
  const lead = well(kind).locator('.mu-field-icon svg');
  const search = await lead.innerHTML();
  await kind.click();
  await kind.pressSequentially('task');
  // The row's glyph is the glyph itself (its record), so it plays its act when the row is hovered.
  const row = options(page).first();
  await row.hover();
  await expect(row.locator('svg.mu-icon')).toHaveAttribute('data-playing', '');
  await row.click();
  await expect(kind).toHaveValue('Task');
  await expect.poll(() => lead.innerHTML()).not.toBe(search);
  await expect(lead).toHaveAttribute('data-glyph', 'task');
  // The morph comes to rest (sampled across frames) before the capture.
  await expect.poll(async () => { const a = await well(kind).innerHTML(); await page.waitForTimeout(120); return a === (await well(kind).innerHTML()); }).toBe(true);
  const box = (await well(kind).boundingBox())!;
  await page.screenshot({ path: capture('combobox-detail-graphite'), clip: { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: box.height + 32 } });
});

test('groups keep their label at the top; recent picks come first; a long list says how many more', async ({ page }) => {
  await open(page, '/components/combobox', 'bone');
  const zone = field(page, 'Time zone');
  await zone.click();
  const recent = page.locator('[data-group=recent]');
  await expect(recent.locator('.mu-combobox-label')).toHaveText('Recent');
  await expect(recent.getByRole('option')).toHaveCount(3);
  await zone.pressSequentially('a');
  await expect(page.locator('[data-group=recent]')).toHaveCount(0);
  await expect(page.locator('.mu-combobox-empty').filter({ hasText: /more matches; type to narrow/ })).toHaveCount(1);
  await expect(options(page)).toHaveCount(100);
  // Scroll the plate: the label of the rows in view sticks to its top.
  const stuck = await page.evaluate(async () => {
    const scroll = document.querySelector<HTMLElement>('.mu-combobox-scroll')!;
    scroll.scrollTop = 300;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const top = scroll.getBoundingClientRect().top;
    return [...scroll.querySelectorAll('.mu-combobox-label')].some((l) => Math.abs(l.getBoundingClientRect().top - top) < 1);
  });
  expect(stuck).toBe(true);
  await page.screenshot({ path: capture('combobox-groups-bone'), clip: { ...(await page.locator('.mu-combobox-pop').boundingBox())!, height: 260 } });
});

test('a search you run: loading dims the rows behind the ring; a failure offers Try again', async ({ page }) => {
  await open(page, '/components/combobox', 'bone');
  const search = field(page, 'Search cities');
  const trail = well(search).locator('.mu-field-trail');
  await search.click();
  await search.pressSequentially('li');
  await expect(trail.locator('.mu-spinner[data-phase=shown]')).toBeVisible(); // after the show delay
  await expect(search).toHaveAttribute('aria-busy', 'true');
  await expect(options(page)).toHaveCount(matching('li'));
  await expect(trail.locator('.mu-spinner')).toHaveCount(0);
  await expect(trail.locator('[aria-label=Clear][data-shown]')).toBeVisible(); // the clear key is back

  // While the next search runs, the rows stay and dim.
  await search.pressSequentially('s');
  await expect(page.locator('.mu-combobox-scroll[data-waiting]')).toHaveCount(1);
  await expect.poll(() => page.locator('.mu-combobox-scroll').evaluate((el) => getComputedStyle(el).opacity)).toBe('0.5');
  await expect(options(page)).toHaveCount(matching('lis'));
  await expect(page.locator('.mu-combobox-scroll[data-waiting]')).toHaveCount(0);

  // The next search fails: one row says so and offers Try again.
  await page.locator('.dialkit-panel-inner').click();
  await page.locator('.dialkit-root').getByRole('button', { name: 'On', exact: true }).first().click();
  await search.click();
  await search.pressSequentially('b');
  const retry = page.getByRole('option', { name: /Couldn.t load/ });
  await expect(retry).toBeVisible();
  await expect(retry).toContainText('Try again');
  await page.keyboard.press('Escape');
  const off = page.locator('.dialkit-root').getByRole('button', { name: 'Off', exact: true }).first();
  if (!(await off.isVisible())) await page.locator('.dialkit-panel-inner').click();
  await off.click();
  await search.click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(options(page)).toHaveCount(matching('lisb'));
  await search.pressSequentially('zz');
  await expect(page.locator('.mu-combobox-empty')).toHaveText('No matches for “lisbzz”');
});

test('several values: chips land, the query stays, Backspace takes then removes, create and commands', async ({ page }) => {
  await open(page, '/components/combobox', 'bone');
  const labels = field(page, 'Labels');
  const chips = well(labels).locator('.mu-combobox-chip');
  await expect(chips).toHaveText(['Design', 'Urgent']);
  await labels.click();
  await labels.pressSequentially('r');
  await options(page).filter({ hasText: 'Research' }).click();
  await expect(chips).toHaveText(['Design', 'Urgent', 'Research']);
  await expect(labels).toHaveValue('r'); // the query stays
  await expect(page.getByRole('listbox')).toBeVisible(); // and the plate
  await expect(options(page).filter({ hasText: 'Research' })).toHaveAttribute('aria-selected', 'true');

  // Backspace on an empty query takes the last chip; a second one removes it (after it leaves).
  await labels.fill('');
  await page.keyboard.press('Backspace');
  await expect(chips.last()).toBeFocused();
  await expect(chips).toHaveCount(3);
  await page.keyboard.press('Backspace');
  await expect(chips).toHaveText(['Design', 'Urgent']);
  await expect(page.getByText('2 labels')).toBeVisible();

  // Nothing matches exactly: create it, set apart by a hairline.
  await labels.click();
  await labels.pressSequentially('Lisbon');
  const create = page.getByRole('option', { name: 'Create “Lisbon”' });
  await expect(create).toBeVisible();
  // Nothing matched, so the create row follows the quiet line; the command after it sits behind a hairline.
  await expect(page.locator('.mu-combobox-pop .mu-menu-sep')).toHaveCount(1);
  await expect.poll(async () => { const a = await plateHeight(page); await page.waitForTimeout(80); return a === (await plateHeight(page)); }).toBe(true);
  const box = (await well(labels).boundingBox())!;
  await page.screenshot({ path: capture('combobox-several-bone'), clip: { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: 200 } });
  await create.click();
  await expect(chips).toHaveText(['Design', 'Urgent', 'Lisbon']);
  await expect(labels).toHaveValue('');

  // A command runs and closes; it never becomes a value.
  await page.getByRole('option', { name: 'Manage labels…' }).click();
  await expect(page.getByText('manage opened 1×')).toBeVisible();
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(chips).toHaveCount(3);

  // The chip's own remove key.
  await well(labels).getByRole('button', { name: 'Remove Design' }).click();
  await expect(chips).toHaveText(['Urgent', 'Lisbon']);
});

test('from a button: the cap opens the plate with the search inside it', async ({ page }) => {
  await open(page, '/components/combobox', 'graphite');
  const cap = page.getByRole('combobox', { name: 'Assign', exact: true });
  await expect(cap).toHaveText(/Assign/);
  await cap.click();
  const inside = page.getByRole('combobox', { name: 'Search Assign' });
  await expect(inside).toBeFocused();
  await page.keyboard.type('silva');
  await expect(options(page)).toHaveCount(1);
  const pop = (await page.locator('.mu-combobox-pop').boundingBox())!;
  const at = (await cap.boundingBox())!;
  expect(Math.abs(pop.x - at.x)).toBeLessThan(1); // aligned to the cap's start
  expect(pop.width).toBeGreaterThanOrEqual(260);
  await expect.poll(async () => { const a = await plateHeight(page); await page.waitForTimeout(80); return a === (await plateHeight(page)); }).toBe(true);
  await page.screenshot({ path: capture('combobox-button-graphite'), clip: { x: at.x - 16, y: at.y - 16, width: pop.width + 32, height: 200 } });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(cap).toContainText('Maria Silva');
  await expect(page.getByRole('listbox')).toBeHidden();
  // Opening again starts a fresh search.
  await cap.click();
  await expect(page.getByRole('combobox', { name: 'Search Assign' })).toHaveValue('');
  await expect(options(page)).toHaveCount(8);
});

test('Reduce Motion: chips leave at once and the plate snaps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/combobox', 'bone');
  const labels = field(page, 'Labels');
  await well(labels).getByRole('button', { name: 'Remove Urgent' }).click();
  await expect(well(labels).locator('.mu-combobox-chip')).toHaveText(['Design']);
  const input = field(page);
  await input.click();
  await input.pressSequentially('b');
  await expect(options(page)).toHaveCount(matching('b'));
  expect(await page.locator('.mu-combobox-fit').evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(0.001);
});
