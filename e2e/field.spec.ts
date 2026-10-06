import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

const section = (page: Page, id: string) => page.locator(`section#${id}`);
const caret = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true }).evaluate((el) => (el as HTMLInputElement).selectionStart);

// Field in a form: the select's sizes, a visible focus ring, the shared invalid ring with
// aria-invalid, and disabled; the palette's large field keeps the caret as its focus.
for (const colorway of COLORWAYS) {
  test(`form sizes, focus, invalid and disabled in ${colorway}`, async ({ page }) => {
    await open(page, '/components/field', colorway);
    const well = (name: string) => page.getByRole('textbox', { name, exact: true }).locator('xpath=ancestor::label[1]');
    expect((await well('Region name').boundingBox())!.height).toBe(32);
    expect((await well('Tag').boundingBox())!.height).toBe(28);

    await page.getByRole('textbox', { name: 'Region name', exact: true }).focus();
    await expect(well('Region name')).toHaveCSS('outline-style', 'solid');
    await page.getByRole('textbox', { name: 'Lens or action', exact: true }).first().focus();
    await expect(well('Lens or action').first()).toHaveCSS('outline-style', 'none');

    const invalid = page.getByRole('textbox', { name: 'Invalid region name' });
    await expect(invalid).toHaveAttribute('aria-invalid', 'true');
    expect(await well('Invalid region name').evaluate((el) => getComputedStyle(el, '::before').boxShadow)).toContain('inset');
    await expect(page.getByRole('textbox', { name: 'Locked region name' })).toBeDisabled();
    await expect(well('Locked region name')).toHaveCSS('opacity', '0.4');

    await section(page, 'form').screenshot({ path: capture(`field-form-${colorway}`) });
  });

  // Prefix and suffix: engraved in the well, not selectable, not part of the value; pressing one puts the
  // caret at its end of the input, and a screen reader hears them with the field.
  test(`prefix and suffix are fixed parts of the value in ${colorway}`, async ({ page }) => {
    await open(page, '/components/field', colorway);
    const site = page.getByRole('textbox', { name: 'Website' });
    const prefix = section(page, 'affixes').locator('.mu-field-prefix').first();
    const suffix = section(page, 'affixes').locator('.mu-field-suffix').first();
    await expect(prefix).toHaveCSS('user-select', 'none');
    expect(await prefix.evaluate((el) => getComputedStyle(el).textShadow)).not.toBe('none');
    await expect(site).toHaveAccessibleDescription('https:// .metalui.dev');

    await site.pressSequentially('north');
    await expect(site).toHaveValue('north');
    await prefix.click();
    await expect(site).toBeFocused();
    expect(await caret(page, 'Website')).toBe(0);
    await suffix.click();
    await expect(site).toBeFocused();
    expect(await caret(page, 'Website')).toBe(5);

    // The prefix sits on the input's baseline: same type, same line box.
    const [p, i] = await Promise.all([prefix.boundingBox(), site.boundingBox()]);
    expect(Math.abs(p!.y + p!.height / 2 - (i!.y + i!.height / 2))).toBeLessThan(1);
    await section(page, 'affixes').screenshot({ path: capture(`field-affixes-${colorway}`) });
  });

  // The trail's keys: clear shows while there is text and keeps the caret in the field; the shortcut keycap
  // focuses the field from anywhere, turns to Esc while it is active, and Esc clears, then leaves.
  test(`clear and shortcut keys in ${colorway}`, async ({ page }) => {
    await open(page, '/components/field', colorway);
    const filter = page.getByRole('textbox', { name: 'Filter regions' });
    const clear = section(page, 'keys').getByRole('button', { name: 'Clear', includeHidden: true });
    const key = section(page, 'keys').locator('.mu-field-shortcut');
    expect((await clear.boundingBox())!.height).toBe(20);
    await expect(clear).toBeVisible();
    await section(page, 'keys').screenshot({ path: capture(`field-keys-${colorway}`) });

    await filter.focus();
    await clear.click();
    await expect(filter).toHaveValue('');
    await expect(filter).toBeFocused();
    await expect(section(page, 'keys').getByText('Filtering by “”')).toBeVisible();
    await expect(clear).toBeHidden();

    await filter.blur();
    await expect(filter).toHaveAttribute('aria-keyshortcuts', '/');
    await expect(key.locator('[data-state="in"]')).toHaveText('/');
    await page.locator('main h1').click();
    await page.keyboard.press('/');
    await expect(filter).toBeFocused();
    await expect(key.locator('[data-state="in"]')).toHaveText('Esc');
    await filter.pressSequentially('dawn');
    await expect(clear).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(filter).toHaveValue('');
    await expect(filter).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(filter).not.toBeFocused();

    // ⌘K reaches the palette's field.
    const palette = page.getByRole('textbox', { name: 'Lens or action' }).first();
    await expect(palette).toHaveAttribute('aria-keyshortcuts', 'Meta+K');
    await page.keyboard.press('Meta+K');
    await expect(palette).toBeFocused();
  });

  // Copy takes the value and its glyph turns on the drum to the check, then back; show password makes the input
  // a password, toggles it to text, says so with aria-pressed, and morphs its eye.
  test(`copy and show password keys in ${colorway}`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, '/components/field', colorway);
    const area = section(page, 'copy-reveal');
    const copy = area.getByRole('button', { name: 'Copy' });
    await copy.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('mu_live_7Hq2v9KcX4');
    await expect(area.getByRole('status')).toHaveText('Copied');
    await expect(copy.locator('[data-state="in"] svg')).toHaveClass(/mu-ic-check/);
    // The check holds for the recipe's copy.hold (1400 ms), then the copy glyph comes back.
    await expect(copy.locator('[data-state="in"] svg')).toHaveClass(/mu-ic-copy/, { timeout: 5000 });

    const password = page.getByLabel('Password', { exact: true });
    const reveal = area.getByRole('button', { name: 'Show password' });
    await expect(password).toHaveAttribute('type', 'password');
    await expect(reveal).toHaveAttribute('aria-pressed', 'false');
    await password.focus();
    await reveal.click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(reveal).toHaveAttribute('aria-pressed', 'true');
    await expect(password).toBeFocused();
    await expect(reveal.locator('svg')).toHaveAttribute('data-glyph', 'eye-off');
    await expect(reveal.locator('svg')).toHaveCount(1);
    // The morph settles: two frames draw the same glyph.
    await expect.poll(() => reveal.locator('svg').evaluate((el) => new Promise<boolean>((r) => {
      const a = el.innerHTML;
      requestAnimationFrame(() => requestAnimationFrame(() => r(a === el.innerHTML)));
    }))).toBe(true);
    await area.screenshot({ path: capture(`field-copy-reveal-${colorway}`) });
    await reveal.press('Space');
    await expect(password).toHaveAttribute('type', 'password');
    await expect(reveal).toHaveAttribute('aria-pressed', 'false');
  });

  // The counter: Textarea's, in the trail. It shows near the limit, turns red at it, and only the counter
  // shakes when typing goes past it. chars sizes the input to an expected length.
  test(`counter and chars in ${colorway}`, async ({ page }) => {
    await open(page, '/components/field', colorway);
    const name = page.getByRole('textbox', { name: 'Display name' });
    const count = section(page, 'length').locator('.mu-field-count');
    await expect(count).toHaveText('22/24');
    await expect(count).toHaveAttribute('data-shown', '');
    await expect(name).toHaveAccessibleDescription(/22\/24/);
    await name.focus();
    await page.keyboard.press('End');
    await page.keyboard.type('!!');
    await expect(count).toHaveText('24/24');
    await expect(count).toHaveAttribute('data-at-limit', '');
    await page.keyboard.press('?');
    await expect(name).toHaveValue('Morning pages, kitchen!!');
    expect(await count.evaluate((el) => el.getAnimations().some((a) => a.id === 'mu-refusal'))).toBe(true);

    const width = (label: string) => page.getByRole('textbox', { name: label }).evaluate((el) => el.getBoundingClientRect().width);
    const slack = 2;
    const [eight, four] = [await width('Postcode'), await width('Year')];
    expect(Math.abs((eight - slack) - 2 * (four - slack))).toBeLessThan(1);
    await section(page, 'length').screenshot({ path: capture(`field-length-${colorway}`) });
  });
}

// Reduce Motion: a key that comes and goes fades without the pop, and the counter does not shake.
test('keys fade without the pop and nothing shakes under Reduce Motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/field', 'bone');
  const filter = page.getByRole('textbox', { name: 'Filter regions' });
  const clear = section(page, 'keys').getByRole('button', { name: 'Clear', includeHidden: true });
  await filter.fill('');
  await expect(clear).toBeHidden();
  await expect(clear).toHaveCSS('scale', '1');

  const name = page.getByRole('textbox', { name: 'Display name' });
  await name.press('End');
  await name.pressSequentially('!!?');
  const count = section(page, 'length').locator('.mu-field-count');
  await expect(count).toHaveText(/^24\/24/);
  expect(await count.evaluate((el) => el.getAnimations().some((a) => a.id === 'mu-refusal'))).toBe(false);

  // Show password still toggles; the eye changes in place.
  const reveal = section(page, 'copy-reveal').getByRole('button', { name: 'Show password' });
  await reveal.click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await expect(reveal.locator('svg')).toHaveAttribute('data-glyph', 'eye-off');
});

test('a hidden clear key pops from 60 % with motion on', async ({ page }) => {
  await open(page, '/components/field', 'bone');
  await page.getByRole('textbox', { name: 'Filter regions' }).fill('');
  const clear = section(page, 'keys').getByRole('button', { name: 'Clear', includeHidden: true });
  await expect(clear).toBeHidden();
  await expect(clear).toHaveCSS('scale', '0.6');
});
