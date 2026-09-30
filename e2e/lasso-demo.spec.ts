import { expect, test, type Locator, type Page } from '@playwright/test';
import { open } from './helpers';

/* The Lasso page's canvas: a press anywhere that isn't on a note is empty space and starts the box,
 * the browser never selects text, and the picked notes show the frame alone. */

const play = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const canvasOf = (page: Page) => play(page).locator('[data-lasso-canvas]');
const world = (canvas: Locator) => canvas.locator('.snap-world');
const picked = (canvas: Locator) => canvas.locator('[data-note]:has(.mu-selection-frame)');
const noSelection = (page: Page) => page.evaluate(() => window.getSelection()?.toString() ?? '');

/** A client point from a world point (the world is scaled from its top-left corner). */
async function client(canvas: Locator, x: number, y: number, scale = 1) {
  const w = (await world(canvas).boundingBox())!;
  return { x: w.x + x * scale, y: w.y + y * scale };
}

async function lasso(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, shift = false) {
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await expect(canvasOf(page).locator('.mu-lasso')).toHaveCount(1);
  expect(await noSelection(page)).toBe('');
  await page.mouse.up();
  if (shift) await page.keyboard.up('Shift');
}

async function ids(canvas: Locator) {
  return (await picked(canvas).evaluateAll((els) => els.map((e) => e.getAttribute('data-note')))).sort();
}

test.beforeEach(async ({ page }) => {
  await open(page, '/components/lasso', 'bone');
  await canvasOf(page).scrollIntoViewIfNeeded();
});

test('a lasso next to a note picks it, selects no text and shows the frame alone', async ({ page }) => {
  const canvas = canvasOf(page);
  // A gap beside "call the printer" (40, 40, 150 × 64) is empty space.
  await lasso(page, await client(canvas, 20, 20), await client(canvas, 100, 80));
  expect(await ids(canvas)).toEqual(['a']);
  expect(await noSelection(page)).toBe('');
  await expect(play(page).getByText('selected · 1')).toBeVisible();
  // The frame only: no handles, no size readout.
  await expect(canvas.locator('[data-note] .mu-readout')).toHaveCount(0);
});

test('a lasso swept across every note\'s words selects no text and ends a page selection', async ({ page }) => {
  const canvas = canvasOf(page);
  await page.locator('main h1').selectText();
  expect(await noSelection(page)).toBe('Lasso');
  await lasso(page, await client(canvas, 440, 345), await client(canvas, 10, 10));
  expect(await ids(canvas)).toEqual(['a', 'b', 'c', 'm']);
  expect(await noSelection(page)).toBe('');
  await expect(play(page).getByText('selected · 4')).toBeVisible();
});

test('a drag that starts on a note\'s words selects no text and draws no box', async ({ page }) => {
  const canvas = canvasOf(page);
  const words = canvas.locator('[data-note="a"] span').first();
  const w = (await words.boundingBox())!;
  await page.mouse.move(w.x + w.width * 0.6, w.y + w.height / 2);
  await page.mouse.down();
  await page.mouse.move(w.x - 20, w.y - 20, { steps: 10 });
  expect(await noSelection(page)).toBe('');
  await expect(canvas.locator('.mu-lasso')).toHaveCount(0);
  await page.mouse.up();
  expect(await ids(canvas)).toEqual([]);
});

test('a lasso starts on the snap guides', async ({ page }) => {
  const canvas = canvasOf(page);
  // Drag "drag me" (250, 40) onto the left edge of "pick the typeface" (x 260) so a guide shows.
  const m = canvas.locator('[data-note="m"]');
  const mb = (await m.boundingBox())!;
  await page.mouse.move(mb.x + 20, mb.y + 20);
  await page.mouse.down();
  await page.mouse.move(mb.x + 28, mb.y + 120, { steps: 8 });
  await expect(canvas.locator('.mu-snap-guides')).toHaveCount(1);
  await page.mouse.up();
  // Press on the guide's overshoot below the typeface (x 260, y 220) while it fades, and draw
  // towards "book the venue" (60, 250, 120 × 64).
  await lasso(page, await client(canvas, 260, 220), await client(canvas, 100, 300));
  expect(await ids(canvas)).toEqual(['c']);
  expect(await noSelection(page)).toBe('');
});

test('at 50 % a lasso starts outside the scaled world', async ({ page }) => {
  const canvas = canvasOf(page);
  await play(page).getByRole('radio', { name: '50 %' }).click();
  const cb = (await canvas.boundingBox())!;
  const wb = (await world(canvas).boundingBox())!;
  const from = { x: cb.x + cb.width - 12, y: cb.y + cb.height - 12 };
  expect(from.x > wb.x + wb.width || from.y > wb.y + wb.height).toBe(true);
  // To world (200, 120): only "pick the typeface" (260, 150, 170 × 64) is touched.
  await lasso(page, from, await client(canvas, 200, 120, 0.5));
  expect(await ids(canvas)).toEqual(['b']);
  expect(await noSelection(page)).toBe('');
});

test('shift adds to the selection, escape clears it, a press on a note moves it', async ({ page }) => {
  const canvas = canvasOf(page);
  await expect(canvas).toHaveCSS('cursor', 'crosshair');
  await expect(canvas.locator('[data-note="m"]')).toHaveCSS('cursor', 'grab');

  await lasso(page, await client(canvas, 20, 20), await client(canvas, 100, 80));
  await lasso(page, await client(canvas, 30, 330), await client(canvas, 100, 290), true);
  expect(await ids(canvas)).toEqual(['a', 'c']);
  // Without Shift a new lasso replaces the selection.
  await lasso(page, await client(canvas, 30, 330), await client(canvas, 100, 290));
  expect(await ids(canvas)).toEqual(['c']);
  await page.keyboard.press('Escape');
  expect(await ids(canvas)).toEqual([]);

  const m = canvas.locator('[data-note="m"]');
  const before = (await m.boundingBox())!;
  await page.mouse.move(before.x + 20, before.y + 20);
  await page.mouse.down();
  await page.mouse.move(before.x + 20, before.y + 80, { steps: 8 });
  await expect(canvas.locator('.mu-lasso')).toHaveCount(0);
  await page.mouse.up();
  expect((await m.boundingBox())!.y).toBeGreaterThan(before.y + 40);
  expect(await noSelection(page)).toBe('');
});
