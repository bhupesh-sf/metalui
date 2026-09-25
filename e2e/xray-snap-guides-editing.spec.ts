import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS } from './helpers';

/* The snap guides x-ray, handled: each card holds a small canvas with the real SnapGuides,
 * and every handle on it changes that canvas and the model on the bench. */

const CALLOUTS = ['Catch', 'Line', 'Centre', 'Overshoot', 'Timing'];
const part = (xray: Locator, name: string) => xray.locator(`.xr-callout[aria-label^="${name}"]`).click();
const readout = (card: Locator, name: string) => card.locator('.ed-readout').filter({ hasText: name });
const value = (card: Locator, name: string) => readout(card, name).locator('.ed-roll > span:not(.is-out)');
const benchGuides = (xray: Locator) => xray.locator('.xr-scene .mu-snap-guides');
const specimenGuides = (card: Locator) => card.locator('.ed-specimen .mu-snap-guides');
/** The dragged note on the bench is the scene's last cap. */
const benchNote = (xray: Locator) => xray.locator('.xr-scene > .xr-iso > .xr-thumb').last().evaluate((el) => (el as HTMLElement).style.transform);

async function drag(page: Page, target: Locator, dx: number, dy: number, at: 'centre' | 'left' = 'centre') {
  // the card can sit below the fold: bring the handle into view before taking hold of it
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  const x = at === 'left' ? box.x + 6 : box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}

async function openXray(page: Page, colorway: string) {
  await page.addInitScript((c) => localStorage.setItem('metalui:colorway', c), colorway);
  await page.goto('/components/snap-guides');
  const xray = page.locator('#x-ray .xr');
  await xray.getByRole('button', { name: 'X-ray' }).click();
  return xray;
}

for (const colorway of COLORWAYS) {
  test(`snap guides cards hold the real guides, never sliders, in ${colorway}`, async ({ page }) => {
    const xray = await openXray(page, colorway);
    const card = xray.locator('.xr-card');
    for (const name of CALLOUTS) {
      await part(xray, name);
      await expect(specimenGuides(card)).toHaveCount(1);
      await expect(card.locator('.ed-specimen .ed-snap-note')).toHaveCount(2);
      await expect(card.locator('.mu-slider, .xr-dial, .xr-dials, .xr-switch')).toHaveCount(0);
    }
    // the bench draws the same guides, and they are really on screen (not squeezed to nothing)
    const size = await benchGuides(xray).evaluate((el) => el.getBoundingClientRect());
    expect(size.width).toBeGreaterThan(50);
    expect(size.height).toBeGreaterThan(50);
  });
}

test('catch: drag the note out of the band and it moves freely; back in, it jumps onto the line', async ({ page }) => {
  const xray = await openXray(page, 'bone');
  const card = xray.locator('.xr-card');
  await part(xray, 'Catch');
  const note = card.getByRole('slider', { name: 'Where you drag' });
  const specimenLeft = () => note.evaluate((el) => (el as HTMLElement).style.left);
  const lineLeft = await card.locator('.ed-snap-note').first().evaluate((el) => (el as HTMLElement).style.left);
  // it starts caught: pulled onto the other note's line, with a lit readout
  const start = Number(await note.getAttribute('aria-valuenow'));
  expect(Math.abs(start)).toBeGreaterThan(0);
  expect(await specimenLeft()).toBe(lineLeft);
  await expect(readout(card, 'Where you drag').locator('[data-kind]')).toHaveAttribute('data-kind', 'live');
  const bench = await benchNote(xray);
  // far out of the band: free, no guides, on the specimen and on the bench
  await drag(page, note, 60, 0);
  const far = Number(await note.getAttribute('aria-valuenow'));
  expect(far).toBeGreaterThan(start + 6);
  expect(await specimenLeft()).not.toBe(lineLeft);
  expect(await benchNote(xray)).not.toBe(bench);
  await expect(specimenGuides(card)).toHaveCount(0);
  await expect(benchGuides(xray)).toHaveCount(0);
  // back near the line: it is either free or exactly on the line, never pulled part way
  await drag(page, note, -(await note.boundingBox())!.width * 0.12, 0);
  const near = Number(await note.getAttribute('aria-valuenow'));
  const left = parseFloat(await specimenLeft());
  expect([parseFloat(lineLeft), parseFloat(lineLeft) + near]).toContain(left);
  // hold ⌘: no snapping and no guides anywhere
  await xray.getByRole('button', { name: 'Reset' }).click();
  await expect(specimenGuides(card)).toHaveCount(1);
  await card.getByRole('switch', { name: 'Hold ⌘' }).click();
  await expect(card.getByRole('switch', { name: 'Hold ⌘' })).toHaveAttribute('aria-checked', 'true');
  expect(await specimenLeft()).not.toBe(lineLeft);
  await expect(specimenGuides(card)).toHaveCount(0);
  await expect(benchGuides(xray)).toHaveCount(0);
});

test('line: zooming the canvas keeps the line one point on screen, on the specimen and the bench', async ({ page }) => {
  const xray = await openXray(page, 'bone');
  const card = xray.locator('.xr-card');
  await part(xray, 'Line');
  const canvas = card.getByRole('slider', { name: 'Zoom' });
  await expect(value(card, 'Zoom')).toHaveText('100');
  const benchScale = await benchGuides(xray).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--mu-canvas-scale'));
  await drag(page, canvas, 0, -60, 'left');
  const zoom = Number(await canvas.getAttribute('aria-valuenow'));
  expect(zoom).toBeGreaterThan(100);
  await expect(value(card, 'Zoom')).toHaveText(`${zoom}`);
  expect(await benchGuides(xray).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--mu-canvas-scale'))).not.toBe(benchScale);
  // the canvas grew, the line did not: its width in the canvas times the zoom is still one point
  const world = await card.locator('.ed-snap-world').evaluate((el) => (el as HTMLElement).style.transform);
  expect(world).toContain(`scale(${zoom / 100})`);
  const stroke = await specimenGuides(card).locator('path').first().evaluate((el) => parseFloat(getComputedStyle(el).strokeWidth));
  expect(stroke * (zoom / 100)).toBeCloseTo(1, 1);
});

test('centre: drag along the dashed line to change its dash, on the specimen and the bench', async ({ page }) => {
  const xray = await openXray(page, 'bone');
  const card = xray.locator('.xr-card');
  await part(xray, 'Centre');
  const grip = card.getByRole('slider', { name: 'Dash' });
  const start = await value(card, 'Dash').textContent();
  const dash = () => specimenGuides(card).locator('path.presence-guide-center').evaluate((el) => getComputedStyle(el).strokeDasharray);
  const before = await dash();
  const bench = await xray.locator('.xr-snap-guides').evaluate((el) => (el as HTMLElement).style.getPropertyValue('--mu-presence-guide-dash'));
  await drag(page, grip, 0, 30);
  await expect(value(card, 'Dash')).not.toHaveText(start!);
  expect(await dash()).not.toBe(before);
  expect(await xray.locator('.xr-snap-guides').evaluate((el) => (el as HTMLElement).style.getPropertyValue('--mu-presence-guide-dash'))).not.toBe(bench);
});

test('overshoot: drag the lines’ ends to run them farther, on the specimen and the bench', async ({ page }) => {
  const xray = await openXray(page, 'bone');
  const card = xray.locator('.xr-card');
  await part(xray, 'Overshoot');
  const grip = card.getByRole('slider', { name: 'Overshoot' });
  await expect(value(card, 'Overshoot')).toHaveText('8');
  const d = (l: Locator) => l.locator('path').first().getAttribute('d');
  const specimen = await d(specimenGuides(card)), bench = await d(benchGuides(xray));
  await drag(page, grip, 0, 20);
  await expect(value(card, 'Overshoot')).not.toHaveText('8');
  expect(await d(specimenGuides(card))).not.toBe(specimen);
  expect(await d(benchGuides(xray))).not.toBe(bench);
});

test('timing: letting go fades the guides on the specimen and the bench; pressing brings them back', async ({ page }) => {
  const xray = await openXray(page, 'bone');
  const card = xray.locator('.xr-card');
  await part(xray, 'Timing');
  await card.getByRole('switch', { name: 'Still dragging' }).click();
  await expect(card.getByRole('switch', { name: 'Still dragging' })).toHaveAttribute('aria-checked', 'false');
  await expect(specimenGuides(card)).toHaveCount(0);
  await expect(benchGuides(xray)).toHaveCount(0);
  // press and hold the note: the guides are back in the same frame; let go and they fade
  const note = card.getByRole('slider', { name: 'Still dragging' });
  await note.scrollIntoViewIfNeeded();
  const box = (await note.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(note).toHaveAttribute('aria-valuetext', 'held');
  await expect(specimenGuides(card)).toHaveAttribute('data-state', 'snapping');
  await expect(benchGuides(xray)).toHaveCount(1);
  await page.mouse.up();
  await expect(note).toHaveAttribute('aria-valuetext', 'let go');
  await expect(specimenGuides(card)).toHaveCount(0);
});

test('readouts scrub by drag and arrow keys; a focused handle shows its hint', async ({ page }) => {
  const xray = await openXray(page, 'bone');
  const card = xray.locator('.xr-card');
  await part(xray, 'Overshoot');
  const start = Number(await value(card, 'Overshoot').textContent());
  await drag(page, readout(card, 'Overshoot'), 0, -24);
  const scrubbed = Number(await value(card, 'Overshoot').textContent());
  expect(scrubbed).toBeGreaterThan(start);
  await readout(card, 'Overshoot').focus();
  await page.keyboard.press('ArrowDown');
  await expect(value(card, 'Overshoot')).toHaveText(`${scrubbed - 0.5}`);
  // a readout step is never caught: it steps past the token
  await part(xray, 'Line');
  await readout(card, 'Zoom').focus();
  await page.keyboard.press('ArrowUp');
  await expect(value(card, 'Zoom')).toHaveText('125');
  await card.getByRole('slider', { name: 'Zoom' }).focus();
  await expect(page.locator('.ed-tag')).toContainText('Zoom');
  // clicking a readout hands its handle the keyboard, hint and all
  await part(xray, 'Centre');
  await readout(card, 'Dash').click();
  await expect(card.getByRole('slider', { name: 'Dash' })).toBeFocused();
  await expect(page.locator('.ed-tag')).toContainText('Dash');
  await page.keyboard.press('ArrowUp');
  await expect(value(card, 'Dash')).toHaveText('3.5');
});

// The page itself scrolls sideways at 375 px before the x-ray opens: the playground's haptic caption
// (SnapCanvas, shared with the lasso page) is wider than the phone. That is outside this x-ray.
test('narrow graphite x-ray has no sideways scroll on any card', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const xray = await openXray(page, 'graphite');
  const card = xray.locator('.xr-card');
  for (const name of CALLOUTS) {
    await part(xray, name);
    await expect(specimenGuides(card)).toHaveCount(1);
    // the x-ray and everything in its card stay inside the phone's width
    expect((await xray.boundingBox())!.x + (await xray.boundingBox())!.width).toBeLessThanOrEqual(375);
    await expect(card.evaluate((el) => Math.max(...[el, ...el.querySelectorAll('*')].map((e) => e.getBoundingClientRect().right)))).resolves.toBeLessThanOrEqual(375);
    await expect(card.evaluate((el) => el.scrollWidth - el.clientWidth)).resolves.toBeLessThanOrEqual(0);
  }
});
