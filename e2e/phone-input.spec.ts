import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, emulateMedia, open } from './helpers';

// Phone input, one slice per job: grouped as you type with the caret kept by digits, a trunk dropped on
// leaving, the country chosen from the plate (by name, dial code or ISO code), pasted numbers moving the
// country (shared codes by area), too short said on leaving, `only`, a host's own rules, a form, Reduce
// Motion, and the one table both platforms read.

const section = (page: Page, name: string) => page.locator('section', { hasText: name }).first();
const plate = (page: Page) => page.locator('.mu-phone-input-pop');
const key = (scope: Locator) => scope.locator('.mu-phone-input-country');
const caret = (input: Locator) => input.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd]);

for (const colorway of COLORWAYS) {
  test(`groups as you type, keeps the caret and chooses a country in ${colorway}`, async ({ page }) => {
    await open(page, '/components/phone-input', colorway);
    const play = section(page, 'Playground');
    const input = play.getByRole('textbox', { name: 'Phone' });
    await expect(input).toHaveValue('7700 900123');
    await expect(play.locator('.mu-field-prefix')).toHaveText('+44');
    await expect(play.locator('.mu-form-field-readback')).toContainText('United Kingdom · mobile');
    await page.waitForTimeout(300);
    await play.screenshot({ path: capture(`phone-input-${colorway}`) });

    // Typed the way it's said: the trunk 0 reads as typed, and goes on leaving.
    await play.getByRole('button', { name: 'Clear' }).click();
    await expect(play.getByText('value=null')).toBeVisible();
    await input.pressSequentially('07700900123');
    await expect(input).toHaveValue('07700 900123');
    await expect(play.getByText('value="+447700900123" · GB · mobile')).toBeVisible();
    await input.press('Tab');
    await expect(input).toHaveValue('7700 900123');

    // The caret is kept by digits: a digit typed mid-number lands after itself, not at the end.
    await input.focus();
    await input.evaluate((el: HTMLInputElement) => el.setSelectionRange(2, 2));
    await page.keyboard.press('Backspace');
    await expect(input).toHaveValue('7009 00123');
    expect(await caret(input)).toEqual([1, 1]);
    await page.keyboard.type('7');
    await expect(input).toHaveValue('7700 900123');
    expect(await caret(input)).toEqual([2, 2]);
    // Backspace beside the space takes the digit before it.
    await input.evaluate((el: HTMLInputElement) => el.setSelectionRange(5, 5));
    await page.keyboard.press('Backspace');
    await expect(input).toHaveValue('7709 00123');
    expect(await caret(input)).toEqual([3, 3]);
    await page.keyboard.type('0');
    await expect(input).toHaveValue('7700 900123');
    // Letters aren't taken.
    await page.keyboard.type('x');
    await expect(input).toHaveValue('7700 900123');
    expect(await caret(input)).toEqual([4, 4]);

    // The key opens the plate: search by name, ↩ chooses, the caret goes back to the number.
    await key(play).click();
    await expect(plate(page)).toBeVisible();
    await expect(plate(page).getByRole('option', { name: /United Kingdom/ })).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(400);
    await plate(page).screenshot({ path: capture(`phone-input-plate-${colorway}`) });
    await page.keyboard.type('fra');
    await expect(plate(page).getByRole('option').first()).toContainText('France');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(plate(page)).toBeHidden();
    await expect(key(play)).toHaveAccessibleName('Country, France +33');
    await expect(play.locator('.mu-field-prefix')).toHaveText('+33');
    await expect(input).toBeFocused();
    // The same digits, grouped the French way (and too long for France).
    await expect(input).toHaveValue('7 70 09 00 123');
    await input.press('Tab');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(play.getByText('France numbers have 9 digits')).toBeVisible();
  });
}

test('search by dial code or ISO code; Recent remembers the pick', async ({ page }) => {
  await open(page, '/components/phone-input', 'bone');
  const play = section(page, 'Playground');
  await key(play).click();
  await page.keyboard.type('+81');
  await expect(plate(page).getByRole('option').first()).toContainText('Japan');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('jp');
  await expect(plate(page).getByRole('option')).toHaveCount(1);
  await expect(plate(page).getByRole('option')).toContainText('Japan');
  await plate(page).getByRole('option').click();
  await expect(play.locator('.mu-field-prefix')).toHaveText('+81');
  await key(play).click();
  await expect(plate(page).locator('[data-group="recent"]')).toContainText('Japan');
});

test('pasted numbers move the country; shared codes go by area', async ({ page }) => {
  await open(page, '/components/phone-input', 'bone');
  const paste = page.getByTestId('phone-paste');
  const input = paste.getByRole('textbox', { name: 'Paste a number' });
  await expect(paste.locator('.mu-field-prefix')).toHaveText('+1');
  const cases: [string, string, string, string][] = [
    ['+44 (0)7700 900123', '7700 900123', 'United Kingdom +44', '+447700900123'],
    ['0044 20 7946 0958', '20 7946 0958', 'United Kingdom +44', '+442079460958'],
    ['+1 416-555-0132', '(416) 555-0132', 'Canada +1', '+14165550132'],
    ['+33 6 12 34 56 78', '6 12 34 56 78', 'France +33', '+33612345678'],
    ['+7 701 234 5678', '701 234-56-78', 'Kazakhstan +7', '+77012345678'],
    ['+81 90-1234-5678', '90 1234 5678', 'Japan +81', '+819012345678'],
  ];
  for (const [pasted, shown, country, value] of cases) {
    await input.fill(pasted);
    await expect(input).toHaveValue(shown);
    await expect(key(paste)).toHaveAccessibleName(`Country, ${country}`);
    await expect(paste.getByText(`value="${value}"`)).toBeVisible();
  }
  // "+" typed: the prefix steps aside while the code is unfinished, then takes it.
  await input.fill('');
  await input.pressSequentially('+3');
  await expect(input).toHaveValue('+3');
  await expect(paste.locator('.mu-field-prefix')).toHaveCount(0);
  await input.pressSequentially('3612345678');
  await expect(input).toHaveValue('6 12 34 56 78');
  await expect(paste.locator('.mu-field-prefix')).toHaveText('+33');
  await expect(paste.locator('.mu-form-field-readback')).toContainText('France · mobile');
  // An unfinished "+" is said on leaving.
  await input.fill('+');
  await input.press('Tab');
  await expect(paste.getByText('Type the country code after +, or choose a country')).toBeVisible();
});

test('too short is said on leaving and goes once the number is whole', async ({ page }) => {
  await open(page, '/components/phone-input', 'bone');
  const play = section(page, 'Playground');
  const input = play.getByRole('textbox', { name: 'Phone' });
  await input.fill('7700');
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  await input.press('Tab');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(play.getByText('United Kingdom numbers have 9 to 10 digits')).toBeVisible();
  await expect(play.locator('.mu-form-field-readback')).toHaveAttribute('data-ending-style', '');
  await input.focus();
  await page.keyboard.type('900123');
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  await expect(play.locator('.mu-form-field-readback')).toContainText('United Kingdom · mobile');
});

test('only lists and accepts just those countries, Recent first', async ({ page }) => {
  await open(page, '/components/phone-input', 'bone');
  const only = page.getByTestId('phone-only');
  await key(only).click();
  await expect(plate(page).locator('[data-group="recent"]').getByRole('option')).toHaveText([/Portugal/, /Spain/]);
  await expect(plate(page).getByRole('option')).toHaveCount(13);
  await page.keyboard.press('Escape');
  const input = only.getByRole('textbox', { name: 'Delivery phone' });
  await input.fill('+44 7700 900123');
  await input.press('Tab');
  await expect(only.getByText('Numbers in United Kingdom aren’t accepted here')).toBeVisible();
});

test('a host’s own rules: Iceland grouped and complete at 7 digits', async ({ page }) => {
  await open(page, '/components/phone-input', 'bone');
  const rules = page.getByTestId('phone-rules');
  const input = rules.getByRole('textbox', { name: 'Reykjavík office' });
  await input.pressSequentially('6112345');
  await expect(input).toHaveValue('611 2345');
  await expect(rules.getByText('IS · complete')).toBeVisible();
  await expect(rules.locator('.mu-form-field-readback')).toContainText('Iceland · mobile');
});

test('in a form: required, then the E.164 value is sent', async ({ page }) => {
  await open(page, '/components/phone-input', 'bone');
  const form = section(page, 'In a form');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form.getByText('Add a number the courier can call.')).toBeVisible();
  const input = form.getByRole('textbox', { name: 'Phone for the courier' });
  await input.pressSequentially('020 7946 0958');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form.getByText('phone=+442079460958')).toBeVisible();
});

test('Reduce Motion: the plate opens without the height glide, and the keys still choose', async ({ page }) => {
  await emulateMedia(page, [{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await open(page, '/components/phone-input', 'graphite');
  const play = section(page, 'Playground');
  await key(play).click();
  await expect(plate(page)).toBeVisible();
  expect(parseFloat(await plate(page).locator('.mu-combobox-fit').evaluate((el) => getComputedStyle(el).transitionDuration))).toBeLessThan(0.01);
  await page.keyboard.type('germ');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(play.locator('.mu-field-prefix')).toHaveText('+49');
});

test('React and SwiftUI read the same table', () => {
  const ts = readFileSync('packages/metalui/src/components/phone-input/phone-input.tsx', 'utf8');
  const swift = readFileSync('swift/Sources/MetalUI/Components/MetalPhoneInput.swift', 'utf8');
  const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
  expect(swift.match(/static let dials = "([^"]*)"/)?.[1]).toBe(ts.match(/const DIALS = '([^']*)'/)?.[1]);
  expect(lines(swift.match(/static let rules = """([\s\S]*?)"""/)?.[1] ?? '')).toEqual(lines(ts.match(/const RULES = `([^`]*)`/)?.[1] ?? 'missing'));
});
