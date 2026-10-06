import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Code field: a one-time code on Base UI OTP Field. One input per slot behind each well; the first is named by
// the label and asks for autocomplete="one-time-code". Typing fills and moves on; a refused character shakes
// its slot; arrows and Backspace fix one character; a paste or autofill fills in one ripple; a wrong code rings
// every slot, shakes the row and selects the first character; checking shows the ring, then the tick.

const card = (page: Page) => page.getByTestId('code-field-sign-in');
const slots = (scope: Locator) => scope.locator('input.mu-code-field-input');
const value = (scope: Locator) => slots(scope).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value).join(''));
const caps = (scope: Locator) => scope.locator('.mu-code-field-cap').allTextContents().then((t) => t.join(''));
const focusedIndex = (scope: Locator) => slots(scope).evaluateAll((els) => els.indexOf(document.activeElement as Element));
/** Whether `el` (or the closest match of `selector` above it) is shaking on the refusal spring right now. */
const shaking = (l: Locator) => l.evaluate((el) => el.getAnimations().some((a) => a.id === 'mu-refusal'));

/** Pastes `text` into `input` the way the browser does: a paste event carrying the clipboard. */
async function paste(input: Locator, text: string) {
  await input.evaluate((el, t) => {
    const data = new DataTransfer();
    data.setData('text/plain', t);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, text);
}

for (const colorway of COLORWAYS) {
  test(`typing, a refusal, arrows and Backspace in ${colorway}`, async ({ page }) => {
    await open(page, '/components/code-field', colorway);
    const field = card(page);
    const first = field.getByRole('textbox', { name: 'Sign-in code' });

    // The accessibility model: one Tab stop, the first slot named by the label and asking for the OS's code.
    await expect(first).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(first).toHaveAttribute('inputmode', 'numeric');
    await expect(first).toHaveAttribute('maxlength', '6');
    await expect(field.getByRole('textbox', { name: 'Character 2 of 6' })).toHaveAttribute('autocomplete', 'off');
    await expect(field.getByRole('textbox', { name: 'Character 6 of 6' })).toHaveCount(1);
    await expect(slots(field).and(page.locator('[tabindex="0"]'))).toHaveCount(1);
    await expect(field.locator('.mu-code-field-dash')).toHaveAttribute('aria-hidden', 'true');

    await first.click();
    await page.keyboard.type('24');
    await expect.poll(() => value(field)).toBe('24');
    await expect.poll(() => caps(field)).toBe('24');
    expect(await focusedIndex(field)).toBe(2);
    // The empty slot you are on shows the still caret; no other does.
    const caret = field.locator('.mu-code-field-caret').first();
    await expect.poll(() => caret.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    expect(await caret.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');

    // A letter in a numeric code: nothing typed, the slot shakes.
    await page.keyboard.type('a');
    expect(await value(field)).toBe('24');
    expect(await shaking(field.locator('.mu-code-field-slot').nth(2))).toBe(true);

    // Fix one character: back to the 4, which is selected, and type over it.
    await page.keyboard.press('ArrowLeft');
    expect(await focusedIndex(field)).toBe(1);
    await page.keyboard.type('6');
    await expect.poll(() => value(field)).toBe('26');
    expect(await focusedIndex(field)).toBe(2);
    // Backspace on an empty slot clears the one before it.
    await page.keyboard.press('Backspace');
    await expect.poll(() => value(field)).toBe('2');
    await page.keyboard.press('Home');
    expect(await focusedIndex(field)).toBe(0);
    await page.keyboard.type('46');
    await expect.poll(() => value(field)).toBe('46');
    await page.waitForTimeout(700);
    await field.screenshot({ path: capture(`code-field-${colorway}`) });
  });

  test(`a wrong code rings every slot, shakes the row and starts over in ${colorway}`, async ({ page }) => {
    await open(page, '/components/code-field', colorway);
    const field = card(page);
    await field.getByRole('textbox', { name: 'Sign-in code' }).click();
    await page.keyboard.type('111111');
    const row = field.locator('.mu-code-field');
    await expect(row).toHaveAttribute('aria-busy', 'true');
    await expect(slots(field).first()).toHaveAttribute('aria-invalid', 'true');
    await expect(slots(field).nth(5)).toHaveAttribute('aria-invalid', 'true');
    await expect(row).not.toHaveAttribute('aria-busy', 'true');
    expect(await shaking(row)).toBe(true);
    await expect(field.getByText("That code isn't right.", { exact: false })).toBeVisible();
    // The code stays; focus is back on the first slot with its character selected.
    expect(await value(field)).toBe('111111');
    expect(await focusedIndex(field)).toBe(0);
    expect(await slots(field).first().evaluate((el) => [(el as HTMLInputElement).selectionStart, (el as HTMLInputElement).selectionEnd])).toEqual([0, 1]);
    expect(await field.locator('.mu-code-field-slot[data-invalid]').count()).toBe(6);
    await page.waitForTimeout(1200);
    await field.screenshot({ path: capture(`code-field-invalid-${colorway}`) });
    // Typing again overwrites from the start and clears the refusal.
    await page.keyboard.type('2');
    await expect.poll(() => value(field)).toBe('211111');
    await expect(slots(field).first()).not.toHaveAttribute('aria-invalid', 'true');
  });
}

test('paste fills every slot in one ripple, is checked and accepted', async ({ page }) => {
  await open(page, '/components/code-field', 'bone');
  const field = card(page);
  const first = field.getByRole('textbox', { name: 'Sign-in code' });
  await first.focus();
  await paste(first, '246 810');
  await expect.poll(() => value(field)).toBe('246810');
  // Each new keycap arrives a ripple step after the one before.
  const delays = await field.locator('.mu-code-field-cap').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).animationDelay) * 1000));
  expect(delays[0]).toBe(0);
  for (let i = 1; i < delays.length; i++) expect(delays[i]).toBeCloseTo(delays[i - 1] + 45, 0);
  expect(await field.locator('.mu-code-field-cap').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('mu-code-field-in');

  // Checked: busy, the ring after the last slot (outside the row's box), then the tick.
  const row = field.locator('.mu-code-field');
  await expect(row).toHaveAttribute('aria-busy', 'true');
  const ring = row.locator('svg.mu-spinner');
  await expect(ring).toHaveAttribute('data-phase', 'shown');
  const [rowBox, ringBox] = [await row.boundingBox(), await ring.boundingBox()];
  expect(ringBox!.x).toBeGreaterThan(rowBox!.x + rowBox!.width);
  await expect(ring).toHaveAttribute('data-phase', 'done');
  await expect(field.getByText('Signed in.')).toBeVisible();
  await expect(row.getByRole('status')).toHaveText('Code accepted');
});

test('a paste in the middle fills from that slot; separators are dropped', async ({ page }) => {
  await open(page, '/components/code-field', 'graphite');
  const section = page.locator('#recovery');
  const first = section.getByRole('textbox', { name: 'Recovery code' });
  await first.click();
  await page.keyboard.type('k7');
  await expect.poll(() => value(section)).toBe('K7');
  const third = section.getByRole('textbox', { name: 'Character 3 of 8' });
  await paste(third, 'q2-x9');
  await expect.poll(() => value(section)).toBe('K7Q2X9');
  await expect.poll(() => caps(section)).toBe('K7Q2X9');
});

test('the phone autofills the whole code into the first slot', async ({ page }) => {
  await open(page, '/components/code-field', 'bone');
  const field = card(page);
  const first = field.getByRole('textbox', { name: 'Sign-in code' });
  await first.focus();
  // What iOS and Android do with a one-time-code suggestion: set the first input's value and fire input.
  await first.evaluate((el) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, '246810');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(() => value(field)).toBe('246810');
  await expect(field.getByText('Signed in.')).toBeVisible();
});

test('Resend counts down on the drum, then sends again', async ({ page }) => {
  await page.clock.install();
  await open(page, '/components/code-field', 'bone');
  const field = card(page);
  const resend = field.getByRole('button', { name: /Resend/ });
  await expect(resend).toBeDisabled();
  await expect(resend).toContainText('Resend in');
  await expect(resend).toContainText('0:30');
  await page.clock.runFor(5000);
  await expect(resend).toContainText('0:25');
  await page.clock.runFor(26000);
  await expect(resend).toBeEnabled();
  await expect(resend).toContainText('Resend code');
  await resend.click();
  await expect(resend).toBeDisabled();
  await expect(resend).toContainText('0:30');
});

test('Reduce Motion: keycaps appear at once and nothing shakes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/code-field', 'graphite');
  const field = card(page);
  await field.getByRole('textbox', { name: 'Sign-in code' }).click();
  await page.keyboard.type('2');
  const cap = field.locator('.mu-code-field-cap').first();
  await expect(cap).toHaveText('2');
  expect(await cap.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration))).toBeLessThan(0.001);
  expect(await cap.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await page.keyboard.type('a');
  expect(await shaking(field.locator('.mu-code-field-slot').nth(1))).toBe(false);
  await page.keyboard.type('00000');
  await expect(slots(field).first()).toHaveAttribute('aria-invalid', 'true');
  expect(await shaking(field.locator('.mu-code-field'))).toBe(false);
  await field.screenshot({ path: capture('code-field-reduced-graphite') });
});
