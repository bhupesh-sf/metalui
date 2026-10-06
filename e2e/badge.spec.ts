import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Badge: a stamp that describes a thing. Its lamp is steady on first paint and flickers once per later
// change; a count turns on the drum (down as it shrinks); the corner cap goes at zero, keeping its
// last number, and comes back on the object spring. Reduce Motion: no flicker, no scale.
const lamp = (page: Page) => page.getByTestId('badge-run').locator('.mu-led');
const corner = (page: Page) => page.getByTestId('badge-anchor').locator('.mu-badge-corner');
const inline = (page: Page) => page.getByTestId('badge-inline-count');
const animations = (page: Page) => lamp(page).evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName));
const scaleOf = (page: Page) => corner(page).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
const press = (page: Page, name: string) => page.getByTestId('badge-counts').getByRole('button', { name }).click();

for (const colorway of COLORWAYS) {
  test(`badges describe, never press, and a changed lamp flickers once in ${colorway}`, async ({ page }) => {
    await open(page, '/components/badge', colorway);
    // A plain span: not focusable, no role, not announced.
    const beta = page.getByTestId('badge-hero').locator('.mu-badge').first();
    await expect(beta).toHaveText('Beta');
    expect(await beta.evaluate((el) => [el.tagName, el.getAttribute('role'), el.tabIndex])).toEqual(['SPAN', null, -1]);
    // Stamped in: the stamp's shadow is inset.
    expect(await beta.evaluate((el) => getComputedStyle(el).boxShadow)).toContain('inset');
    await page.getByTestId('badge-hero').screenshot({ path: capture(`badge-hero-${colorway}`) });

    // First paint: steady.
    await expect(lamp(page)).toHaveAttribute('data-gesture', 'steady');
    expect(await animations(page)).toEqual([]);
    await page.getByTestId('badge-states').getByRole('button', { name: 'Next state' }).click();
    await expect(page.getByTestId('badge-run')).toHaveText('Building');
    await expect(lamp(page)).toHaveAttribute('data-kind', 'waiting');
    expect(await animations(page)).toEqual(['mu-led-flicker']);
    // Only the row that changed: the others stay still.
    expect(await page.getByTestId('badge-states').locator('.mu-led').evaluateAll((els) => els.slice(1).flatMap((el) => el.getAnimations()).length)).toBe(0);
    // Each later change flickers again.
    await page.getByTestId('badge-states').getByRole('button', { name: 'Next state' }).click();
    await expect(lamp(page)).toHaveAttribute('data-kind', 'failed');
    expect(await animations(page)).toEqual(['mu-led-flicker']);
    await page.waitForTimeout(900);
    await page.getByTestId('badge-states').screenshot({ path: capture(`badge-states-${colorway}`) });
    await page.getByTestId('badge-sizes').screenshot({ path: capture(`badge-sizes-${colorway}`) });
  });

  test(`counts turn on the drum and the corner cap goes at zero in ${colorway}`, async ({ page }) => {
    await open(page, '/components/badge', colorway);
    await page.getByTestId('badge-counts').scrollIntoViewIfNeeded();
    // The number is said once, with what it means; the drum's faces are hidden.
    await expect(inline(page).locator('.sr-only')).toHaveText('3 unread');
    await expect(page.getByRole('button', { name: 'Inbox, 3 unread' })).toBeVisible();
    await expect(corner(page)).toHaveAttribute('aria-hidden', 'true');

    await press(page, 'One more');
    await expect(inline(page)).toHaveAttribute('data-count', '4');
    await expect(inline(page).locator('.swap-down')).toHaveCount(0);
    await press(page, 'One read');
    await expect(inline(page)).toHaveAttribute('data-count', '3');
    // Shrinking turns the drum down.
    await expect(inline(page).locator('.swap-down')).toHaveCount(1);

    // Past max it reads 99+.
    await press(page, 'Lots');
    await expect(inline(page).locator('.sr-only')).toHaveText('120 unread');
    await expect.poll(() => corner(page).locator('.mu-swap-layer:not([aria-hidden])').textContent()).toBe('99+');
    await page.waitForTimeout(500);
    await page.getByTestId('badge-counts').screenshot({ path: capture(`badge-counts-${colorway}`) });
    await press(page, 'Back to 3');

    // To zero: the cap goes, keeping its last number while it leaves; the button's name drops the count.
    for (let i = 0; i < 3; i++) await press(page, 'One read');
    await expect(corner(page)).toHaveAttribute('data-empty', '');
    await expect(corner(page).locator('.mu-swap-layer:not([aria-hidden])')).toHaveText('1');
    await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toBeVisible();
    await expect.poll(() => corner(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    await expect.poll(() => scaleOf(page)).toBeCloseTo(0.6, 2);
    // Back: it comes in from 60 % to full size.
    await press(page, 'One more');
    await expect(corner(page)).not.toHaveAttribute('data-empty', '');
    await expect.poll(() => scaleOf(page)).toBeCloseTo(1, 2);
    await expect.poll(() => corner(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });
}

test('Reduce Motion: the lamp changes at once and the corner cap fades without scaling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/badge', 'bone');
  await page.getByTestId('badge-states').getByRole('button', { name: 'Next state' }).click();
  await expect(lamp(page)).toHaveAttribute('data-kind', 'waiting');
  expect(await animations(page)).toEqual([]);
  for (let i = 0; i < 3; i++) await press(page, 'One read');
  await expect(corner(page)).toHaveAttribute('data-empty', '');
  await expect.poll(() => corner(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  expect(await corner(page).evaluate((el) => getComputedStyle(el).transform)).toBe('none');
});
