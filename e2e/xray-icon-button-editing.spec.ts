import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS } from './helpers';

/* The icon button x-ray is handled, not slid: every card holds the real IconButton, and
 * handling it changes the specimen and the model on the bench together. */

const part = (xray: Locator, name: string) => xray.locator(`.xr-callout[aria-label^="${name}"]`).click();
const readout = (card: Locator, label: RegExp) => card.locator('.ed-readout').filter({ hasText: label });
const value = (card: Locator, label: RegExp) => readout(card, label).locator('.ed-roll > span:not(.is-out)');
const handle = (card: Locator, name: string) => card.getByRole('slider', { name, exact: true });
const style = (target: Locator, key: string) => target.evaluate((el, k) => (el as HTMLElement).style.getPropertyValue(k), key);

async function drag(page: Page, target: Locator, dx: number, dy: number) {
  // the card can sit below the fold: bring the handle into view before taking hold of it
  await target.scrollIntoViewIfNeeded();
  const b = (await target.boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}

async function open(page: Page, colorway: string) {
  await page.addInitScript((c) => localStorage.setItem('metalui:colorway', c), colorway);
  await page.goto('/components/icon-button');
  const xray = page.locator('#x-ray .xr');
  await xray.getByRole('button', { name: 'X-ray' }).click();
  return xray;
}

const CALLOUTS = ['Press', 'Latch', 'Shape', 'Kinds', 'Light', 'Layers'];

for (const colorway of COLORWAYS) {
  test(`each icon button card holds one real icon button and no dials in ${colorway}`, async ({ page }) => {
    const xray = await open(page, colorway), card = xray.locator('.xr-card');
    for (const name of CALLOUTS) {
      await part(xray, name);
      await expect(card.locator('.ed-specimen .mu-icon-button')).toHaveCount(1);
      await expect(card.locator('.mu-slider, .xr-dial, .xr-dials, .mu-switcher')).toHaveCount(0);
    }
  });
}

test('press: holding the cap and pulling down sets how far it drops, on the specimen and the bench', async ({ page }) => {
  const xray = await open(page, 'bone'), card = xray.locator('.xr-card');
  await part(xray, 'Press');
  const cap = card.locator('.mu-icon-button');
  const before = await value(card, /^Press depth/).textContent();
  const benchBefore = await style(xray.locator('.xr-thumb .xr-face'), 'transform');
  const specimenBefore = await style(cap, '--mu-r-icon-button-tool-press');
  await drag(page, handle(card, 'Press depth'), 0, 24);
  await expect(value(card, /^Press depth/)).not.toHaveText(before!);
  expect(await style(cap, '--mu-r-icon-button-tool-press')).not.toBe(specimenBefore);
  expect(await style(xray.locator('.xr-thumb .xr-face'), 'transform')).not.toBe(benchBefore);
});

test('latch: the switch and the cap both keep it down, and the bench lights its LED', async ({ page }) => {
  const xray = await open(page, 'bone'), card = xray.locator('.xr-card');
  await part(xray, 'Latch');
  await expect(xray.locator('.xr-led')).toHaveCount(0);
  await card.getByRole('switch', { name: 'Stay down' }).click();
  await expect(card.locator('.ed-specimen .mu-icon-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(xray.locator('.xr-led')).toHaveCount(1);
  await card.locator('.ed-specimen .mu-icon-button').click();
  await expect(card.getByRole('switch', { name: 'Stay down' })).toHaveAttribute('aria-checked', 'false');
  await expect(xray.locator('.xr-led')).toHaveCount(0);
});

test('shape: the top edge, the corner and the icon change the specimen and the bench', async ({ page }) => {
  const xray = await open(page, 'bone'), card = xray.locator('.xr-card');
  await part(xray, 'Shape');
  const cap = card.locator('.mu-icon-button');
  const size = handle(card, 'Size');
  const sizeBefore = Number(await size.getAttribute('aria-valuenow'));
  const width = (await cap.boundingBox())!.width;
  await drag(page, size, 0, -12);
  const sizeAfter = Number(await size.getAttribute('aria-valuenow'));
  expect(sizeAfter).toBeGreaterThan(sizeBefore);
  expect((await cap.boundingBox())!.width).toBeGreaterThan(width);
  await expect(xray.locator('.xr-dims text').first()).toHaveText(`${sizeAfter}`);

  const corners = handle(card, 'Corners');
  const radiusBefore = Number(await corners.getAttribute('aria-valuenow'));
  await drag(page, corners, 20, 20);
  const radiusAfter = Number(await corners.getAttribute('aria-valuenow'));
  expect(radiusAfter).not.toBe(radiusBefore);
  await expect(cap).toHaveCSS('border-radius', `${radiusAfter}px`);
  await expect(xray.locator('.xr-dims text').nth(1)).toHaveText(`r ${radiusAfter}`);

  const glyph = handle(card, 'Icon size');
  const glyphBefore = Number(await glyph.getAttribute('aria-valuenow'));
  const benchIcon = await xray.locator('.xr-ib-glyph svg').getAttribute('width');
  await drag(page, glyph, 0, -10);
  const glyphAfter = Number(await glyph.getAttribute('aria-valuenow'));
  expect(glyphAfter).toBeGreaterThan(glyphBefore);
  await expect(card.locator('.ed-ib-glyph svg')).toHaveAttribute('width', `${glyphAfter}`);
  expect(await xray.locator('.xr-ib-glyph svg').getAttribute('width')).not.toBe(benchIcon);
});

test('kinds: a drag leans without stretching, then snaps to a real kind on the specimen and the bench', async ({ page }) => {
  const xray = await open(page, 'bone'), card = xray.locator('.xr-card');
  await part(xray, 'Kinds');
  const kind = handle(card, 'Kind');
  const kinds = ['tool', 'ghost', 'mini'];
  const before = (await kind.getAttribute('aria-valuetext'))!;
  expect(kinds).toContain(before);
  const button = card.locator('.ed-specimen .mu-icon-button');
  const width = await button.evaluate((el) => getComputedStyle(el).width);
  // a small nudge only leans: the next kind's outline lights, the button neither changes nor stretches
  await kind.scrollIntoViewIfNeeded();
  const b = (await kind.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 6, b.y + b.height / 2, { steps: 4 });
  await expect(card.locator('.ed-ib-lean')).toHaveCount(1);
  await expect(button).toHaveCSS('width', width);
  await expect(button).toHaveAttribute('data-variant', before);
  await page.mouse.up();
  await expect(kind).toHaveAttribute('aria-valuetext', before);
  // far enough, it snaps to the next kind, never between
  await drag(page, kind, 40, 0);
  const after = (await kind.getAttribute('aria-valuetext'))!;
  expect(kinds).toContain(after);
  expect(after).not.toBe(before);
  await expect(button).toHaveAttribute('data-variant', after);
  await expect(xray.locator(`[data-ib-kind="${after}"]`)).toHaveCount(1);
  // a ghost or a mini has no shape to change: its other cards offer the way back to the tool
  await part(xray, 'Shape');
  await expect(handle(card, 'Kind')).toHaveCount(1);
  await expect(handle(card, 'Size')).toHaveCount(0);
  await handle(card, 'Kind').focus();
  for (let i = kinds.indexOf(after); i > 0; i--) await page.keyboard.press('ArrowLeft');
  await expect(handle(card, 'Size')).toHaveCount(1);
  await expect(xray.locator('[data-ib-kind="tool"]')).toHaveCount(1);
});

test('light: the sun turns the light on the specimen and the bench', async ({ page }) => {
  const xray = await open(page, 'graphite'), card = xray.locator('.xr-card');
  await part(xray, 'Light');
  const cap = card.locator('.mu-icon-button');
  const fill = await xray.locator('.xr-thumb .xr-face').evaluate((el) => (el as HTMLElement).style.background);
  const face = await style(cap, '--mu-r-icon-button-tool-background');
  await drag(page, handle(card, 'Light'), 30, 6);
  expect(await xray.locator('.xr-thumb .xr-face').evaluate((el) => (el as HTMLElement).style.background)).not.toBe(fill);
  expect(await style(cap, '--mu-r-icon-button-tool-background')).not.toBe(face);
  await expect(value(card, /^Light from/)).not.toHaveText('top');
});

test('layers: a switch removes the same layer from the specimen and the bench', async ({ page }) => {
  const xray = await open(page, 'bone'), card = xray.locator('.xr-card');
  await part(xray, 'Layers');
  const cap = card.locator('.mu-icon-button');
  const shadow = await style(cap, '--mu-r-icon-button-tool-shadow');
  await expect(xray.locator('.xr-face.is-layer.is-off')).toHaveCount(0);
  await card.getByRole('switch', { name: 'Drop' }).click();
  await expect(card.getByRole('switch', { name: 'Drop' })).toHaveAttribute('aria-checked', 'false');
  await expect(xray.locator('.xr-face.is-layer.is-off')).toHaveCount(1);
  expect(await style(cap, '--mu-r-icon-button-tool-shadow')).not.toBe(shadow);
  await card.locator('.ed-layer').filter({ hasText: 'Edge' }).hover();
  await expect(xray.locator('.xr-face.is-layer.is-focus')).toContainText('Edge');
});

test('readouts scrub by drag and by arrow keys; a focused handle shows its hint', async ({ page }) => {
  const xray = await open(page, 'bone'), card = xray.locator('.xr-card');
  await part(xray, 'Shape');
  const start = (await value(card, /^Size/).textContent())!;
  await drag(page, readout(card, /^Size/), 0, -24);
  await expect(value(card, /^Size/)).not.toHaveText(start);
  const scrubbed = (await value(card, /^Size/).textContent())!;
  await readout(card, /^Size/).focus();
  await page.keyboard.press('ArrowDown');
  await expect(value(card, /^Size/)).not.toHaveText(scrubbed);
  await handle(card, 'Size').focus();
  await expect(page.locator('.ed-tag')).toContainText('Size');
  await part(xray, 'Kinds');
  const kind = (await value(card, /^Kind/).textContent())!;
  await readout(card, /^Kind/).focus();
  await page.keyboard.press(kind === 'mini' ? 'ArrowDown' : 'ArrowUp');
  await expect(value(card, /^Kind/)).not.toHaveText(kind);
  await handle(card, 'Kind').focus();
  await expect(page.locator('.ed-tag')).toContainText('Kind');
});

test('floating tool opens the icon button x-ray; narrow graphite card has no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => localStorage.setItem('metalui:colorway', 'graphite'));
  await page.goto('/overview');
  await page.locator('[data-float="toolbar"] .mu-tool').first().click({ force: true });
  const card = page.locator('.xr-overlay .xr-card');
  await expect(card.locator('.ed-specimen .mu-icon-button')).toHaveCount(1);
  for (const name of CALLOUTS) {
    await page.locator(`.xr-overlay .xr-callout[aria-label^="${name}"]`).click();
    await expect(card.locator('.ed-specimen .mu-icon-button')).toHaveCount(1);
    await expect(page.evaluate(() => document.documentElement.scrollWidth)).resolves.toBeLessThanOrEqual(375);
  }
});
