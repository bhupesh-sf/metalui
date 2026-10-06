import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Number field: keycaps and arrows step the value and turn the drum the way it went; at a limit the
// keycap disables and an arrow past it shakes only the digits; typing is a draft that commits on Enter
// or blur. Then the variations: sizes, fine and coarse legends, units, soft limits, back to default,
// mixed, the inspector, the wheel, arithmetic read back, and the thumbwheel prototype.

// A field's name; while it is off its default the changed mark adds "off its default".
const field = (page: Page, name: string) => page.getByRole('textbox', { name: new RegExp(`^${name.replace(/[()]/g, '\\$&')}( off its default)?$`) });
const section = (page: Page, id: string) => page.locator(`section#${id}`);
const group = (input: Locator) => input.locator('xpath=ancestor::*[contains(@class,"mu-number-field-group")][1]');
const root = (input: Locator) => input.locator('xpath=ancestor::*[contains(@class,"mu-number-field ")][1]');

for (const colorway of COLORWAYS) {
  test(`steps, stops at its limit, and takes typing in ${colorway}`, async ({ page }) => {
    await open(page, '/components/number-field', colorway);
    const copies = field(page, 'Copies');
    await expect(copies).toHaveValue('2');
    await page.getByRole('button', { name: 'Increase' }).first().click();
    await expect(copies).toHaveValue('3');
    await copies.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(copies).toHaveValue('1');
    await expect(page.getByRole('button', { name: 'Decrease' }).first()).toBeDisabled();

    await copies.fill('14');
    await copies.blur();
    await expect(copies).toHaveValue('14');
    await copies.fill('99');
    await copies.blur();
    await expect(copies).toHaveValue('20');

    await expect(field(page, 'Locked')).toBeDisabled();
    await page.waitForTimeout(500);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`number-field-${colorway}`) });
  });

  test(`the variations read in ${colorway}`, async ({ page }) => {
    await open(page, '/components/number-field', colorway);
    for (const id of ['sizes', 'units', 'inspector', 'mixed']) {
      await section(page, id).screenshot({ path: capture(`number-field-${id}-${colorway}`) });
    }
    // Arithmetic, read back before it commits.
    const width = section(page, 'arithmetic').getByRole('textbox', { name: /^Width/ });
    await width.fill('*2');
    await expect(section(page, 'arithmetic').locator('.mu-form-field-readback').first().locator('.mu-swap-layer[data-state=in]')).toHaveText('= 480 px');
    await page.waitForTimeout(500);
    await section(page, 'arithmetic').screenshot({ path: capture(`number-field-arithmetic-${colorway}`) });
    // A soft limit, said under the field.
    await expect(section(page, 'soft').getByText('Up to 100')).toBeVisible();
    await page.waitForTimeout(400);
    await section(page, 'soft').screenshot({ path: capture(`number-field-soft-${colorway}`) });
  });
}

test('sizes match Field\'s heights and radii, keycaps concentric', async ({ page }) => {
  await open(page, '/components/number-field', 'bone');
  for (const [size, height, radius] of [['large', 44, 17], ['regular', 32, 11], ['compact', 28, 9]] as const) {
    const row = page.getByTestId(`nf-size-${size}`);
    const nf = row.locator('.mu-number-field-group');
    const box = await nf.boundingBox();
    const fieldBox = await row.locator('.mu-field').boundingBox();
    expect(box!.height).toBe(height);
    expect(fieldBox!.y).toBeCloseTo(box!.y, 0);
    expect(await nf.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe(`${radius}px`);
    const key = row.locator('.mu-number-field-key').first();
    const [keyRadius, pad] = await Promise.all([
      key.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius)),
      nf.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop)),
    ]);
    expect(keyRadius).toBe(radius - pad);
    // The set's glyphs, without their tile: the keycap is the tile.
    await expect(key.locator('svg [data-part=bar]')).toHaveCount(1);
    expect(await key.locator('svg [data-part=tile]').evaluate((el) => getComputedStyle(el).display)).toBe('none');
  }
});

test('the drum turns up for more and down for less', async ({ page }) => {
  await open(page, '/components/number-field', 'bone');
  const nf = page.locator('.mu-number-field').first();
  const sample = (key: string) => nf.evaluate(async (el, k) => {
    const input = el.querySelector('input')!;
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 40));
    const enter = [...el.querySelectorAll<HTMLElement>('.mu-number-field-drum .mu-swap-layer')].find((l) => l.dataset.state === 'in' && l.textContent === input.value)!;
    const y = new DOMMatrix(getComputedStyle(enter).transform).m42;
    const hidden = getComputedStyle(input).color;
    await new Promise((r) => setTimeout(r, 600));
    return { y, hidden, after: getComputedStyle(input).color };
  }, key);
  const up = await sample('ArrowUp');
  expect(up.y).toBeGreaterThan(0.5); // the new number comes from below
  expect(up.hidden).toBe('rgba(0, 0, 0, 0)');
  expect(up.after).not.toBe('rgba(0, 0, 0, 0)');
  const down = await sample('ArrowDown');
  expect(down.y).toBeLessThan(-0.5); // and from above for less
});

test('an arrow past the limit shakes only the digits; Reduce Motion keeps them still', async ({ page }) => {
  await open(page, '/components/number-field', 'graphite');
  const columns = page.locator('.mu-number-field').nth(1);
  const xs = await columns.evaluate(async (el) => {
    const input = el.querySelector('input')!;
    const win = el.querySelector('.mu-number-field-window')!;
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    const out: number[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => { out.push(new DOMMatrix(getComputedStyle(win).transform).m41); if (performance.now() - t0 < 300) requestAnimationFrame(frame); else done(); };
      requestAnimationFrame(frame);
    });
    return out;
  });
  expect(Math.max(...xs)).toBeGreaterThan(4);
  expect(Math.min(...xs)).toBeLessThan(-1);
  await expect(field(page, 'Columns')).toHaveValue('12');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(1300); // the first shake has rung out
  const shook = await columns.evaluate(async (el) => {
    const input = el.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    return el.querySelector('.mu-number-field-window')!.getAnimations().length > 0;
  });
  expect(shook).toBe(false);
});

test('invalid shows the shared ring and says so', async ({ page }) => {
  await open(page, '/components/number-field', 'bone');
  const seats = field(page, 'Seats').first();
  await expect(seats).toHaveAttribute('aria-invalid', 'true');
  expect(await group(seats).evaluate((el) => getComputedStyle(el, '::before').boxShadow)).toContain('inset');
});

test('holding ⇧ or ⌥ over the field turns the legends to the step', async ({ page }) => {
  await open(page, '/components/number-field', 'bone');
  const opacity = field(page, 'Opacity');
  const keys = group(opacity).locator('.mu-number-field-key');
  await group(opacity).hover();
  await page.keyboard.down('Shift');
  await expect(keys.first()).toContainText('−10');
  await expect(keys.last()).toContainText('+10');
  await page.keyboard.up('Shift');
  await page.keyboard.down('Alt');
  await expect(keys.last()).toContainText('+0.1');
  await page.waitForTimeout(500);
  await section(page, 'steps').screenshot({ path: capture('number-field-steps-bone') });
  await keys.last().click({ modifiers: ['Alt'] });
  await page.keyboard.up('Alt');
  await expect(opacity).toHaveValue('80.1');
  await expect(keys.last()).not.toContainText('+');
  // Away from the field (not under the pointer, not focused), Shift changes nothing.
  await page.locator('main h1').click();
  await page.mouse.move(5, 5);
  await page.keyboard.down('Shift');
  await page.waitForTimeout(200);
  await expect(keys.last()).not.toContainText('10');
  await page.keyboard.up('Shift');
});

test('units are engraved, and typing one is understood', async ({ page }) => {
  await open(page, '/components/number-field', 'bone');
  const width = field(page, 'Width').first();
  const unit = group(width).locator('.mu-number-field-unit');
  await expect(unit).toHaveText('px');
  await width.fill('320px');
  await width.press('Enter');
  await expect(width).toHaveValue('320');
  await expect(field(page, 'Price')).toHaveValue(/^1\.200\s€$/);
  // A draft it can't read is refused: the value stays.
  await width.fill('wide');
  await width.blur();
  await expect(width).toHaveValue('320');
});

test('soft limits keep a typed value, say the limit, and clamp the keys', async ({ page }) => {
  await open(page, '/components/number-field', 'bone');
  const seats = section(page, 'soft').getByRole('textbox');
  await expect(seats).toHaveValue('140');
  await expect(seats).toHaveAttribute('aria-invalid', 'true');
  await expect(section(page, 'soft').getByText('Up to 100')).toBeVisible();
  await expect(section(page, 'soft').getByRole('button', { name: 'Increase' })).toBeDisabled();
  // Typing hides the line until the value commits.
  await seats.fill('90');
  await seats.blur();
  await expect(seats).not.toHaveAttribute('aria-invalid', 'true');
  await expect(section(page, 'soft').locator('.mu-number-field-limit')).toHaveAttribute('data-ending-style', '');
  await seats.fill('0');
  await seats.press('Enter');
  await expect(section(page, 'soft').getByText('At least 1')).toBeVisible();
  await section(page, 'soft').getByRole('button', { name: 'Increase' }).click();
  await expect(seats).toHaveValue('1');
});

test('double-click the label or ⌘-click a key goes back to default, with the changed mark', async ({ page }) => {
  await open(page, '/components/number-field', 'bone');
  const size = field(page, 'Font size');
  const mark = root(size).locator('.mu-changed-mark');
  await expect(size).toHaveValue('18');
  await expect(mark).toHaveAttribute('data-changed', '');
  await root(size).locator('.mu-number-field-label').dblclick();
  await expect(size).toHaveValue('16');
  await expect(mark).not.toHaveAttribute('data-changed', '');
  await group(size).getByRole('button', { name: 'Increase' }).click();
  await expect(size).toHaveValue('17');
  await expect(mark).toHaveAttribute('data-changed', '');
  await group(size).getByRole('button', { name: 'Increase' }).click({ modifiers: ['Meta'] });
  await expect(size).toHaveValue('16');
});

test('mixed: a step adds to each item, typing sets them all', async ({ page }) => {
  await open(page, '/components/number-field', 'bone');
  const opacity = field(page, 'Opacity (3 layers)');
  const layers = page.getByTestId('nf-layers');
  await expect(opacity).toHaveAttribute('placeholder', 'Mixed');
  await expect(opacity).toHaveValue('');
  await group(opacity).getByRole('button', { name: 'Increase' }).click();
  await expect(layers).toHaveText(/Sky 100%\s*Haze 41%\s*Grain 16%/);
  await expect(opacity).toHaveValue('');
  await opacity.focus();
  await page.keyboard.press('ArrowDown');
  await expect(layers).toHaveText(/Sky 99%\s*Haze 40%\s*Grain 15%/);
  await opacity.fill('50');
  await opacity.press('Enter');
  await expect(layers).toHaveText(/Sky 50%\s*Haze 50%\s*Grain 50%/);
  await expect(opacity).toHaveValue('50');
});

test('the inspector scrubs from its letter', async ({ page }) => {
  await open(page, '/components/number-field', 'bone');
  const width = section(page, 'inspector').getByRole('textbox', { name: 'Width' });
  await expect(width).toHaveValue('320');
  await expect(group(width).locator('.mu-number-field-key')).toHaveCount(0);
  const letter = group(width).locator('.mu-number-field-letter');
  await letter.scrollIntoViewIfNeeded();
  expect(await letter.evaluate((el) => getComputedStyle(el).cursor)).toBe('ew-resize');
  const box = (await letter.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 6; i++) await page.mouse.move(box.x + box.width / 2 + (i + 1) * 4, box.y + box.height / 2);
  await page.mouse.up();
  expect(Number(await width.inputValue())).toBeGreaterThan(320);
});

test('the wheel steps only while the field has focus', async ({ page }) => {
  await open(page, '/components/number-field', 'bone');
  const zoom = field(page, 'Zoom');
  await zoom.scrollIntoViewIfNeeded();
  await zoom.hover();
  await page.mouse.wheel(0, -100);
  await page.waitForTimeout(100);
  await expect(zoom).toHaveValue('100');
  await zoom.focus();
  await zoom.hover();
  await page.mouse.wheel(0, -100);
  await expect(zoom).toHaveValue('110');
});

test('arithmetic is read back, commits on Enter, and Esc puts it back', async ({ page }) => {
  await open(page, '/components/number-field', 'graphite');
  const width = section(page, 'arithmetic').getByRole('textbox', { name: /^Width/ });
  const readback = root(width).locator('.mu-form-field-readback');
  await width.fill('+10');
  await expect(readback.locator('.mu-swap-layer[data-state=in]')).toHaveText('= 250 px');
  await expect(width).toHaveAttribute('aria-describedby', /.+/);
  await width.press('Enter');
  await expect(width).toHaveValue('250');
  await expect(readback).toHaveAttribute('data-ending-style', '');
  await width.fill('=8*12');
  await expect(readback.locator('.mu-swap-layer[data-state=in]')).toHaveText('= 96 px');
  await width.press('Escape');
  await expect(width).toHaveValue('250');
  await width.fill('(10+2)*3');
  await width.blur();
  await expect(width).toHaveValue('36');
  // Inside a FormField, the field's own blur still reaches Base UI.
  const gutter = section(page, 'arithmetic').getByRole('textbox', { name: /^Gutter/ });
  await gutter.fill('/2');
  await gutter.blur();
  await expect(gutter).toHaveValue('6');
  await expect(gutter).not.toBeFocused();
});

test('the thumbwheel prototype steps one detent at a time', async ({ page }) => {
  await open(page, '/components/number-field', 'bone');
  const wheel = page.getByTestId('nf-thumbwheel');
  await wheel.scrollIntoViewIfNeeded();
  await expect(wheel).toHaveAttribute('aria-valuenow', '100');
  await wheel.focus();
  await page.keyboard.press('ArrowUp');
  await expect(wheel).toHaveAttribute('aria-valuenow', '110');
  const box = (await wheel.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - i * 10);
  await page.mouse.up();
  await expect(wheel).toHaveAttribute('aria-valuenow', '160'); // one detent per 10 px of drag
  await page.waitForTimeout(600);
  await section(page, 'thumbwheel').screenshot({ path: capture('number-field-thumbwheel-bone') });
});

test('Reduce Motion: the legends and the drum crossfade without travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/number-field', 'graphite');
  const opacity = field(page, 'Opacity');
  const keys = group(opacity).locator('.mu-number-field-key');
  await group(opacity).hover();
  await page.keyboard.down('Shift');
  const layer = keys.last().locator('.mu-swap-layer').last();
  await expect(layer).toContainText('+10');
  expect(await layer.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  await page.keyboard.up('Shift');
  await page.waitForTimeout(500);
  await section(page, 'steps').screenshot({ path: capture('number-field-steps-reduced-graphite') });
});
