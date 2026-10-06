import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Cascader: Miller columns on the menu's plate, focus held in the search well. The keyboard paths (↓ opens,
// ← → between columns, ↩ chooses, letters search), a level that loads and one that fails, any branch,
// drill with Back, several values as a covering set with a max, and levels arriving (or not, under
// Reduce Motion).
const demo = (page: Page, id: string) => page.getByTestId(id);
const well = (page: Page, id: string) => demo(page, id).locator('.mu-cascader-trigger');
const search = (page: Page) => page.getByRole('combobox');
const plate = (page: Page) => page.locator('.mu-cascader-pop');
// A row's name is its label, then its trail ("Photo 880").
const option = (page: Page, name: string) => plate(page).getByRole('option', { name: new RegExp(`^${name}( |$)`) });
/** The row the keys are on (aria-activedescendant), by its name. */
const activeName = (page: Page) => page.evaluate(() => {
  const id = document.activeElement?.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id)?.querySelector('.mu-menu-label')?.textContent ?? '' : '';
});
const pathText = (page: Page, id: string) => demo(page, id).locator('.mu-cascader-crumb').allInnerTexts().then((t) => t.join(' › '));

async function tabInto(page: Page, id: string) {
  const target = well(page, id);
  await target.scrollIntoViewIfNeeded();
  await target.evaluate((el) => {
    const before = document.createElement('button');
    before.textContent = 'before';
    before.className = 'sr-only';
    el.parentElement!.parentElement!.insertBefore(before, el.parentElement);
    before.focus();
  });
  await page.keyboard.press('Tab');
  await expect(target).toBeFocused();
}

for (const colorway of COLORWAYS) {
  test(`walks the columns with the keyboard in ${colorway}`, async ({ page }) => {
    await open(page, '/components/cascader', colorway);
    await expect.poll(() => pathText(page, 'cascader-play')).toBe('Europe › Portugal › Lisbon');
    await tabInto(page, 'cascader-play');

    // ↓ opens on the value: the columns down to it, focus in the search, the keys on Lisbon.
    await page.keyboard.press('ArrowDown');
    await expect(search(page)).toBeFocused();
    await expect(plate(page).getByRole('listbox')).toHaveCount(3);
    await expect.poll(() => activeName(page)).toBe('Lisbon');
    await expect(option(page, 'Lisbon')).toHaveAttribute('aria-selected', 'true');
    // The way through is raised.
    await expect(option(page, 'Europe')).toHaveAttribute('data-on', '');
    await expect(option(page, 'Portugal')).toHaveAttribute('data-on', '');
    await page.waitForTimeout(400);
    await page.screenshot({ path: capture(`cascader-${colorway}`), clip: (await plate(page).boundingBox())! });

    // ← back to Portugal's column, ↓ to Spain, → opens it and goes in; the said line names it.
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => activeName(page)).toBe('Portugal');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => activeName(page)).toBe('Spain');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => activeName(page)).toBe('Madrid');
    await expect(plate(page).getByRole('listbox', { name: 'Spain' })).toBeVisible();
    await expect(plate(page).getByRole('status').last()).toHaveText('Spain, 4 items');

    // End, then ↩ chooses and closes; focus is back on the well, which says the path.
    await page.keyboard.press('End');
    await expect.poll(() => activeName(page)).toBe('Valencia');
    await page.keyboard.press('Enter');
    await expect(plate(page)).toHaveCount(0);
    await expect(well(page, 'cascader-play')).toBeFocused();
    await expect(demo(page, 'cascader-play-value')).toHaveText('es/valencia · 3 levels deep');
    await expect.poll(() => pathText(page, 'cascader-play')).toBe('Europe › Spain › Valencia');
  });
}

test('a disabled row is skipped, an empty level says so, and Esc keeps the value', async ({ page }) => {
  await open(page, '/components/cascader', 'bone');
  await well(page, 'cascader-play').click();
  await expect(search(page)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown'); // Spain
  await page.keyboard.press('ArrowDown'); // France
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => activeName(page)).toBe('Paris');
  await page.keyboard.press('End'); // Nice is disabled: the last it reaches is Bordeaux
  await expect.poll(() => activeName(page)).toBe('Bordeaux');
  await expect(option(page, 'Nice')).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('End'); // Iceland
  await page.keyboard.press('ArrowRight');
  await expect(plate(page).getByRole('listbox', { name: 'Iceland' })).toContainText('Empty');
  await page.keyboard.press('Escape');
  await expect(plate(page)).toHaveCount(0);
  await expect(demo(page, 'cascader-play-value')).toHaveText('pt/lisbon');
});

test('letters typed on the well search every level, the first match highlighted', async ({ page }) => {
  await open(page, '/components/cascader', 'graphite');
  await tabInto(page, 'cascader-play');
  await page.keyboard.type('paris');
  await expect(search(page)).toHaveValue('paris');
  const results = plate(page).getByRole('listbox');
  await expect(results.getByRole('option')).toHaveCount(2);
  await expect(results.getByRole('option').first()).toContainText('Europe › France');
  await expect.poll(() => activeName(page)).toBe('Paris');
  await expect(results.locator('.mu-cascader-match').first()).toHaveText('Paris');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(demo(page, 'cascader-play-value')).toHaveText('us/tx/paris · 4 levels deep');
  // Four levels fold the start: the end tells the two Parises apart.
  await expect.poll(() => pathText(page, 'cascader-play')).toBe('… › Texas › Paris');

  // Nothing matched says the query back.
  await well(page, 'cascader-play').click();
  await search(page).fill('zz');
  await expect(plate(page).getByRole('status').first()).toHaveText('No matches for “zz”');
});

test('a level loads in its chevron, a failed one offers Try again, an empty one says so', async ({ page }) => {
  await open(page, '/components/cascader', 'bone');
  const scope = demo(page, 'cascader-loading');
  await scope.scrollIntoViewIfNeeded();
  await well(page, 'cascader-loading').click();
  await expect(search(page)).toBeFocused();

  // Archive fails the first time: its column is one row, Try again; ↩ retries and the level lands.
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => activeName(page)).toBe('Archive');
  await page.keyboard.press('ArrowRight');
  await expect(option(page, 'Archive')).toHaveAttribute('aria-busy', 'true');
  await expect(option(page, 'Archive').locator('.mu-spinner')).toBeVisible();
  await expect(plate(page).getByRole('listbox', { name: 'Archive' })).toContainText('Couldn’t load', { timeout: 5000 });
  await expect.poll(() => page.evaluate(() => document.getElementById(document.activeElement!.getAttribute('aria-activedescendant')!)?.textContent)).toContain('Try again');
  await page.keyboard.press('Enter');
  await expect(option(page, '2025')).toBeVisible({ timeout: 5000 });

  // New folder loads fast and is empty.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(plate(page).getByRole('listbox', { name: 'New folder' })).toContainText('Empty');
});

test('any branch: a click chooses it and opens it, and the plate stays', async ({ page }) => {
  await open(page, '/components/cascader', 'bone');
  await demo(page, 'cascader-any').scrollIntoViewIfNeeded();
  await well(page, 'cascader-any').click();
  await option(page, 'Photo').click();
  await expect(plate(page).getByRole('listbox', { name: 'Photo' })).toBeVisible();
  await expect(option(page, 'Photo')).toHaveAttribute('aria-selected', 'true');
  await expect(demo(page, 'cascader-any')).toContainText('photo');
  // ↩ on a branch chooses it and closes.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(plate(page)).toHaveCount(0);
  await expect.poll(() => pathText(page, 'cascader-any')).toBe('Audio');
});

test('drill: one level at a time, Back and ← go up, levels arrive from the side', async ({ page }) => {
  await open(page, '/components/cascader', 'graphite');
  await demo(page, 'cascader-drill').scrollIntoViewIfNeeded();
  await expect.poll(() => pathText(page, 'cascader-drill')).toBe('… › Texas › Paris');
  await well(page, 'cascader-drill').click();
  await expect(plate(page).getByRole('listbox')).toHaveCount(1);
  await expect(plate(page).locator('.mu-cascader-head')).toHaveText('Texas');
  await expect.poll(() => activeName(page)).toBe('Paris');
  await page.keyboard.press('ArrowLeft');
  await expect(plate(page).locator('.mu-cascader-head')).toHaveText('United States');
  await expect(plate(page).locator('.mu-cascader-column')).toHaveClass(/cascader-back/);
  await plate(page).getByRole('button', { name: 'Back' }).click();
  await expect(plate(page).locator('.mu-cascader-head')).toHaveText('Americas');
  await expect(search(page)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(plate(page).locator('.mu-cascader-head')).toHaveText('United States');
  await expect(plate(page).locator('.mu-cascader-column')).toHaveClass(/cascader-in/);
  await page.waitForTimeout(400);
  await page.screenshot({ path: capture('cascader-drill-graphite'), clip: (await plate(page).boundingBox())! });
});

test('several values: cascading boxes, the covering set, a max', async ({ page }) => {
  await open(page, '/components/cascader', 'bone');
  const value = demo(page, 'cascader-several-value');
  await demo(page, 'cascader-several').scrollIntoViewIfNeeded();
  await expect(value).toHaveText('pt, fr/paris');
  await expect(demo(page, 'cascader-several').locator('.mu-cascader-chip')).toHaveCount(2);
  await well(page, 'cascader-several').click();
  await expect(plate(page).getByText('2 of 3')).toBeVisible();

  // Europe holds some of what is chosen; Portugal is whole, France partly.
  await expect(option(page, 'Europe')).toHaveAttribute('aria-checked', 'mixed');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => activeName(page)).toBe('Portugal');
  await expect(option(page, 'Portugal')).toHaveAttribute('aria-selected', 'true');
  await expect(option(page, 'France')).toHaveAttribute('aria-checked', 'mixed');

  // Space ticks Spain whole: one value, and the max is reached.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  await expect(value).toHaveText('pt, fr/paris, es');
  await expect(plate(page).getByText('3 of 3')).toBeVisible();
  await expect(option(page, 'Italy')).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  await expect(value).toHaveText('pt, fr/paris, es');

  // Inside Portugal, unticking Porto keeps the rest of Portugal.
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => activeName(page)).toBe('Porto');
  await page.keyboard.press(' ');
  await expect(value).toHaveText('fr/paris, es, pt/lisbon, pt/coimbra, pt/faro, pt/braga');
  await expect(option(page, 'Portugal')).toHaveAttribute('aria-checked', 'mixed');
  // Ticking it again makes Portugal whole.
  await page.keyboard.press(' ');
  await expect(value).toHaveText('fr/paris, es, pt');

  // A chip's remove key takes it out (after the plate closes).
  await page.keyboard.press('Escape');
  await demo(page, 'cascader-several').getByRole('button', { name: 'Remove Spain' }).click();
  await expect(value).toHaveText('fr/paris, pt');
});

test('Reduce Motion: a level fades in without travel', async ({ page }) => {
  const travel = async () => {
    await well(page, 'cascader-play').click();
    await expect(search(page)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    // Sample the arriving column's offset on the next frames.
    return page.evaluate(() => new Promise<number>((done) => {
      const input = document.activeElement as HTMLInputElement;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      let most = 0;
      let frames = 0;
      const sample = () => {
        const col = document.querySelector<HTMLElement>('.mu-cascader-column[aria-label="Spain"]');
        if (col) most = Math.max(most, Math.abs(parseFloat(getComputedStyle(col).translate) || 0));
        if (++frames < 12) requestAnimationFrame(sample); else done(most);
      };
      requestAnimationFrame(sample);
    }));
  };
  await open(page, '/components/cascader', 'bone');
  expect(await travel()).toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.waitForSelector('main h1');
  expect(await travel()).toBeLessThan(0.5);
});
