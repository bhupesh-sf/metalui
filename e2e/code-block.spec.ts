import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Code block: code to read and copy. Lines are picked by their numbers (pointer and keyboard), the label
// names them, copy copies only them, and the attach key references them; a reply streams with a caret
// and copy waits; a diff and a patch with two gutters; diagnostics under their lines with a fix; the
// docs' own code objects are the block. Reduce Motion: rows land and the caret holds.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first().locator('.mu-code-block').first();
const clip = (page: Page) => page.evaluate(() => navigator.clipboard.readText());
const label = (b: Locator) => b.locator('.mu-code-block-label .mu-swap-layer:not([data-state="out"])');

for (const colorway of COLORWAYS) {
  test(`lines are picked by their numbers, copied and referenced in ${colorway}`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, '/components/code-block', colorway);
    const b = playground(page);
    await b.getByRole('button', { name: 'Line 4', exact: true }).click();
    await b.getByRole('button', { name: 'Line 7', exact: true }).click({ modifiers: ['Shift'] });
    for (const n of [4, 5, 6, 7]) await expect(b.getByRole('button', { name: `Line ${n}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(b.getByRole('button', { name: 'Line 8', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(label(b)).toHaveText('poster.ts · 4–7');
    await expect(b.locator('.mu-code-row[data-picked]')).toHaveCount(4);

    // Copy takes only the picked lines; its glyph morphs to the check, then back.
    await b.getByRole('button', { name: 'Copy lines 4–7' }).click();
    await expect(b.getByRole('button', { name: 'Copied' })).toBeVisible();
    await expect(b.getByRole('button', { name: 'Copied' }).locator('svg')).toHaveAttribute('data-glyph', 'check');
    expect(await clip(page)).toBe(`  size: 'A2' | 'A3';\n  stock: "matte" | "gloss"; // not both\n  weight: number;\n}`);
    await expect(b.getByRole('button', { name: 'Copy lines 4–7' })).toBeVisible({ timeout: 4000 });

    await b.getByRole('button', { name: 'Reference lines 4–7' }).click();
    await expect(page.locator('section', { hasText: 'Playground' }).first().getByText('poster.ts · 4–7', { exact: true }).last()).toBeVisible();
    await page.waitForTimeout(500);
    await b.screenshot({ path: capture(`code-block-${colorway}`) });
  });
}

test('the numbers are one roving key: arrows move, Space picks, Shift extends, Esc clears', async ({ page }) => {
  await open(page, '/components/code-block', 'bone');
  const b = playground(page);
  const stops = b.locator('button.mu-code-num[tabindex="0"]');
  await expect(stops).toHaveCount(1);
  await stops.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(b.getByRole('button', { name: 'Line 3', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(label(b)).toHaveText('poster.ts · 3');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(label(b)).toHaveText('poster.ts · 3–5');
  await expect(b.locator('button.mu-code-num[tabindex="0"]')).toHaveAccessibleName('Line 5');
  await page.keyboard.press('Escape');
  await expect(label(b)).toHaveText('poster.ts');
  await expect(b.locator('.mu-code-row[data-picked]')).toHaveCount(0);
});

test('a reply streams: rows land, a caret blinks, copy waits, and nothing runs once it is done', async ({ page }) => {
  await open(page, '/components/code-block', 'graphite');
  const reply = page.getByTestId('reply');
  await page.getByRole('button', { name: 'Write the reply' }).click();
  const writing = reply.locator('.mu-code-block[data-streaming]');
  await expect(writing).toHaveCount(1);
  await expect(writing.getByRole('button', { name: 'Still writing' })).toBeDisabled();
  await expect(writing.locator('.mu-code-caret')).toHaveCount(1);
  // The caret moves to each new last row: sample it in one frame.
  await expect.poll(() => writing.evaluate((el) => { const c = el.querySelector('.mu-code-caret'); return c ? getComputedStyle(c).animationName : 'gone'; })).toBe('mu-code-block-caret');

  await expect(page.getByRole('button', { name: 'Write the reply' })).toBeEnabled({ timeout: 10000 });
  const blocks = reply.locator('.mu-code-block');
  await expect(blocks).toHaveCount(2);
  await expect(reply.locator('.mu-code-block[data-streaming], .mu-code-caret')).toHaveCount(0);
  // textContent holds the code line by line (no numbers, no notes).
  expect(await blocks.first().locator('code').evaluate((el) => el.textContent)).toBe('export async function run(poster: Poster, copies = 120) {\n  await print(poster, { copies });\n  return copies;\n}\n');
  await expect(blocks.last()).toContainText('await run(poster, 40);');
  // At rest: no infinite animation is left running in the reply.
  const running = await reply.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().iterations === Infinity && a.playState === 'running').length);
  expect(running).toBe(0);
});

test('a diff tints its lines; a patch with hunks has two gutters', async ({ page }) => {
  await open(page, '/components/code-block', 'bone');
  const [diff, patch] = [page.locator('#change .mu-code-block').first(), page.locator('#change .mu-code-block').last()];
  await expect(diff.locator('.mu-code-row[data-diff="add"]')).toHaveCount(1);
  await expect(diff.locator('.mu-code-row[data-diff="remove"]')).toHaveCount(2);
  const added = diff.locator('.mu-code-row[data-diff="add"] .mu-code-sign');
  await expect(added).toHaveText('+');
  const [addInk, plainInk] = await Promise.all([added.evaluate((el) => getComputedStyle(el).color), diff.locator('.mu-code-text').first().evaluate((el) => getComputedStyle(el).color)]);
  expect(addInk).not.toBe(plainInk);

  await expect(patch.locator('.mu-code-row[data-hunk]')).toHaveCount(1);
  const gutters = async (row: Locator) => row.locator('.mu-code-num').allTextContents();
  expect(await gutters(patch.locator('.mu-code-row').nth(1))).toEqual(['9', '9']);
  expect(await gutters(patch.locator('.mu-code-row[data-diff="remove"]').first())).toEqual(['10', '']);
  expect(await gutters(patch.locator('.mu-code-row[data-diff="add"]').first())).toEqual(['', '10']);
  expect(await gutters(patch.locator('.mu-code-row').last())).toEqual(['13', '13']);
  await page.locator('#change').screenshot({ path: capture('code-block-change-bone') });
});

for (const colorway of COLORWAYS) {
  test(`diagnostics sit under their lines with a lamp, a word and a fix in ${colorway}`, async ({ page }) => {
    await open(page, '/components/code-block', colorway);
    const b = page.locator('#problem .mu-code-block');
    const notes = b.getByRole('note');
    await expect(notes).toHaveCount(3);
    await expect(notes.nth(0)).toContainText('Error');
    await expect(notes.nth(1)).toContainText('Warning');
    await expect(notes.nth(2)).toContainText('Note');
    await expect(b.locator('.mu-code-lamp [data-kind="failed"]')).toHaveCount(1);
    await expect(b.locator('.mu-code-lamp [data-kind="waiting"]')).toHaveCount(1);
    await page.locator('#problem').screenshot({ path: capture(`code-block-problem-${colorway}`) });
    await b.getByRole('button', { name: 'Fix with AI' }).click();
    await expect(notes).toHaveCount(0);
    await expect(b.locator('.mu-code-row[data-mark]')).toContainText("size: 'A2'");
  });
}

test('Reduce Motion: streamed rows land at once and the caret holds', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/code-block', 'bone');
  await page.getByRole('button', { name: 'Write the reply' }).click();
  const writing = page.getByTestId('reply').locator('.mu-code-block[data-streaming]');
  await expect(writing.locator('.mu-code-caret')).toHaveCount(1);
  const names = await writing.evaluate((el) => [el.querySelector('.mu-code-caret'), el.querySelector('.mu-code-row')].map((n) => (n ? getComputedStyle(n).animationName : 'gone')));
  expect(names).toEqual(['none', 'none']);
});

test("the docs' code objects are the block: copy gives the source without numbers", async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, '/components/code-block', 'bone');
  const source = page.locator('section', { has: page.locator('h2', { hasText: /^Source$/ }) }).locator('.mu-code-block');
  await expect(source.locator('.mu-code-num').first()).toHaveText('1');
  await source.getByRole('button', { name: 'Copy' }).click();
  expect((await clip(page)).startsWith("'use client';\n\nimport * as React from 'react';")).toBe(true);
});
