import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

const section = (page: Page, id: string) => page.locator(`section#${id}`);

/** The heights an element's box goes through for `ms` after `act` runs, sampled every frame. */
async function heights(page: Page, selector: string, act: string, ms = 600) {
  return page.evaluate(async ({ selector, act, ms }) => {
    (new Function(act))();
    const out: number[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => { const e = document.querySelector(selector); out.push(e ? e.getBoundingClientRect().height : 0); if (performance.now() - t0 < ms) requestAnimationFrame(frame); else done(); };
      requestAnimationFrame(frame);
    });
    return out;
  }, { selector, act, ms });
}

// Form field: the label names the control and the description describes it; leaving the field empty
// shows the error, grown open from under the control, with the invalid ring; fixing it takes it away.
for (const colorway of COLORWAYS) {
  test(`labels, describes, and says why a value is not accepted in ${colorway}`, async ({ page }) => {
    await open(page, '/components/form-field', colorway);
    const name = page.getByRole('textbox', { name: 'Region name' });
    await expect(name).toHaveAccessibleDescription('Shown on its edge and in search.');
    await page.getByText('Region name', { exact: true }).click();
    await expect(name).toBeFocused();

    // Too short, then moving on: the error comes after the person has had a chance.
    await name.pressSequentially('ab');
    await page.keyboard.press('Tab');
    const error = page.locator('.mu-form-field-error').first();
    await expect(error).toHaveText('Use at least 3 letters.');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription(/Use at least 3 letters\./);
    expect(await name.locator('xpath=ancestor::label[1]').evaluate((el) => getComputedStyle(el, '::before').boxShadow)).toContain('inset');
    await page.waitForTimeout(600);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`form-field-${colorway}`) });

    await name.fill('Trip to Lisbon');
    await name.blur();
    await expect(error).toBeHidden();
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
  });

  // Timing: nothing while typing; checked on leaving; the error goes the moment the value changes. A remote
  // check that passed shows the tick, said once to a screen reader.
  test(`errors at the right moment, and a remote check that passed, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/form-field', colorway);
    const user = page.getByRole('textbox', { name: 'Username' });
    const error = section(page, 'timing').locator('.mu-form-field-error');
    await user.pressSequentially('admin');
    await expect(error).toHaveCount(0);
    await user.blur();
    await expect(error).toHaveText('“admin” is taken. Try another.');
    await expect(user).toHaveAttribute('aria-invalid', 'true');
    await user.focus();
    await page.keyboard.press('End');
    await page.keyboard.type('-2');
    await expect(error).toHaveCount(0);
    await expect(user).not.toHaveAttribute('aria-invalid', 'true');

    const status = section(page, 'timing').getByRole('status');
    await expect(status).toHaveText('');
    await user.blur();
    await expect(status).toHaveText('Name available');
    await expect(status.locator('svg')).toBeVisible();
    await page.waitForTimeout(500);
    await section(page, 'timing').screenshot({ path: capture(`form-field-timing-${colorway}`) });
  });

  // Beside: the label in a column on the control's baseline; when the field is narrow it stacks.
  test(`labels beside the field, stacking when narrow, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/form-field', colorway);
    const box = page.getByTestId('beside-box');
    const label = box.getByText('Studio name', { exact: true });
    const input = box.getByRole('textbox', { name: 'Studio name' });
    let [l, i] = [(await label.boundingBox())!, (await input.boundingBox())!];
    expect(l.x + l.width).toBeLessThan(i.x);
    expect(Math.abs(l.y + l.height / 2 - (i.y + i.height / 2))).toBeLessThan(1); // the same type on one baseline
    await expect(box.getByText('Optional')).toBeVisible();
    await section(page, 'beside').screenshot({ path: capture(`form-field-beside-${colorway}`) });

    await box.evaluate((el) => { (el as HTMLElement).style.width = '300px'; });
    await expect.poll(async () => (await label.boundingBox())!.y + (await label.boundingBox())!.height <= (await input.boundingBox())!.y).toBe(true);
    [l, i] = [(await label.boundingBox())!, (await input.boundingBox())!];
    expect(Math.abs(l.x - (await input.locator('xpath=ancestor::label[1]').boundingBox())!.x)).toBeLessThan(1);
    await section(page, 'beside').screenshot({ path: capture(`form-field-beside-narrow-${colorway}`) });
  });

  // The minority mark: "Optional" is read with its label; the required dot is for the eye (the input says required).
  test(`optional and required marks in ${colorway}`, async ({ page }) => {
    await open(page, '/components/form-field', colorway);
    const marks = section(page, 'marks');
    await expect(marks.getByRole('textbox', { name: 'Phone Optional' })).toBeVisible();
    const display = marks.getByRole('textbox', { name: 'Display name', exact: true });
    await expect(display).toHaveAttribute('required', '');
    const dot = marks.locator('.mu-form-field-required');
    await expect(dot).toHaveCount(1);
    await expect(dot).toHaveAttribute('aria-hidden', 'true');
    await marks.screenshot({ path: capture(`form-field-marks-${colorway}`) });
  });

  // Changed: the engraved dot hangs before the label while the value differs from what was saved; Save takes it away.
  test(`the changed mark in ${colorway}`, async ({ page }) => {
    await open(page, '/components/form-field', colorway);
    const changes = section(page, 'changed');
    const name = changes.getByRole('textbox', { name: /^Studio name/ });
    const mark = changes.locator('.mu-changed-mark').first();
    await expect(mark).not.toHaveAttribute('data-changed');
    await expect(mark).toHaveCSS('opacity', '0');
    await name.fill('North light studio');
    await expect(mark).toHaveAttribute('data-changed', '');
    await expect(mark).toHaveCSS('opacity', '1');
    await expect(name).toHaveAccessibleName('Studio name changed');
    // It hangs in the margin: the label's text does not move.
    const [m, l] = [(await mark.boundingBox())!, (await changes.locator('.mu-form-field-label').first().boundingBox())!];
    expect(m.x + m.width).toBeLessThan(l.x);
    await expect(changes.getByText('1 changed')).toBeVisible();
    await changes.screenshot({ path: capture(`form-field-changed-${colorway}`) });

    await changes.getByRole('button', { name: 'Save' }).click();
    await expect(mark).not.toHaveAttribute('data-changed');
    await expect(mark).toHaveCSS('opacity', '0');
    await expect(name).toHaveAccessibleName('Studio name');
  });

  // Readback: what was understood, under the field in the readout type; read with the field; it turns on the drum
  // and its row closes when there is nothing to say.
  test(`readback in ${colorway}`, async ({ page }) => {
    await open(page, '/components/form-field', colorway);
    const readback = section(page, 'readback');
    const when = readback.getByRole('textbox', { name: 'Remind me' });
    const line = readback.locator('.mu-form-field-readback').first();
    await expect(line).toContainText(/, 08:00$/);
    await expect(when).toHaveAccessibleDescription(/, 08:00$/);
    await expect(line.locator('span').first()).toHaveCSS('font-family', /Mono/i);

    await when.fill('tomorrow 9:30pm');
    await expect(line.locator('[data-state="in"]')).toHaveText(/, 21:30$/);
    await when.fill('');
    await expect(line).toHaveAttribute('data-ending-style', '');
    await expect.poll(() => line.evaluate((el) => el.getBoundingClientRect().height)).toBe(0);
    await expect(when).toHaveAccessibleDescription('');

    const sum = readback.getByRole('textbox', { name: 'Budget' });
    await sum.fill('12 * 8');
    await expect(readback.locator('.mu-form-field-readback').nth(1).locator('[data-state="in"]')).toHaveText('= 96');
    await page.waitForTimeout(500);
    await readback.screenshot({ path: capture(`form-field-readback-${colorway}`) });
  });
}

test('saving with the name empty says so and moves focus there', async ({ page }) => {
  await open(page, '/components/form-field', 'bone');
  await page.getByRole('button', { name: 'Save region' }).click();
  const name = page.getByRole('textbox', { name: 'Region name' });
  await expect(page.locator('.mu-form-field-error').first()).toHaveText('Give the region a name.');
  await expect(name).toBeFocused();
  await expect(page.getByText('Saved.', { exact: true })).toBeHidden();
  await name.fill('Trip to Lisbon');
  await page.getByRole('button', { name: 'Save region' }).click();
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
});

test('the error grows its row open instead of jumping', async ({ page }) => {
  await open(page, '/components/form-field', 'bone');
  await page.getByRole('textbox', { name: 'Region name' }).pressSequentially('ab');
  const seen = await heights(page, '.mu-form-field-error', '(document.activeElement).blur()');
  const full = seen.at(-1)!;
  expect(full).toBeGreaterThan(8);
  expect(seen.some((h) => h > 0.5 && h < full - 0.5)).toBe(true);
});

test('the readback row grows open like the error', async ({ page }) => {
  await open(page, '/components/form-field', 'bone');
  const sum = page.getByRole('textbox', { name: 'Budget' });
  await sum.focus();
  await page.keyboard.type('2+');
  await expect(sum).toHaveAccessibleDescription('$');
  await page.keyboard.type('2');
  const grow = await heights(page, 'section#readback .mu-form-field:nth-child(2) .mu-form-field-readback', '');
  const full = grow.at(-1)!;
  expect(full).toBeGreaterThan(8);
  expect(grow.some((h) => h > 0.5 && h < full - 0.5)).toBe(true);
});

// Reduce Motion: the rows snap (no height between closed and open), the fades stay, and the marks do not pop.
test('rows snap and marks fade without the pop under Reduce Motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/form-field', 'bone');
  await page.getByRole('textbox', { name: 'Region name' }).pressSequentially('ab');
  const seen = await heights(page, '.mu-form-field-error', '(document.activeElement).blur()');
  const full = seen.at(-1)!;
  expect(full).toBeGreaterThan(8);
  expect(seen.filter((h) => h > 0.5 && h < full - 0.5)).toHaveLength(0);

  const mark = section(page, 'changed').locator('.mu-changed-mark').first();
  await expect(mark).toHaveCSS('scale', '1');
  await expect(mark).toHaveCSS('opacity', '0');
});
