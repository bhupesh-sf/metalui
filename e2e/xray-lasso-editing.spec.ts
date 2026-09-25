import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS } from './helpers';

const part = (xray: Locator, name: string) => xray.locator(`.xr-callout[aria-label^="${name}"]`).click();
const readout = (card: Locator, name: string) => card.locator('.ed-readout').filter({ has: card.page().locator('b', { hasText: new RegExp(`^${name}$`) }) });
const value = (card: Locator, name: string) => readout(card, name).locator('.ed-roll > span:not(.is-out)');
const bench = (xray: Locator) => xray.locator('.xr-thumb .mu-lasso');
const style = (el: Locator, prop: string) => el.evaluate((e, p) => (e as HTMLElement).style.getPropertyValue(p), prop);

async function drag(page: Page, target: Locator, dx: number, dy: number) {
  // the card can sit below the fold: bring the handle into view before taking hold of it
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}

async function openDocs(page: Page, colorway: string) {
  await page.addInitScript((c) => localStorage.setItem('metalui:colorway', c), colorway);
  await page.goto('/components/lasso');
  const xray = page.locator('#x-ray .xr');
  await xray.getByRole('button', { name: 'X-ray' }).click();
  return xray;
}

for (const colorway of COLORWAYS) {
  test(`lasso cards hold the real lasso and no sliders in ${colorway}`, async ({ page }) => {
    const xray = await openDocs(page, colorway);
    const card = xray.locator('.xr-card');
    for (const name of ['Box', 'Count', 'Touch', 'Timing']) {
      await part(xray, name);
      await expect(card.locator('.ed-specimen .mu-lasso')).toHaveCount(1);
      await expect(card.locator('.ed-specimen .ed-lasso-note')).toHaveCount(3);
      await expect(card.locator('.mu-slider, .xr-dial, .xr-dials, .mu-switcher')).toHaveCount(0);
    }
  });
}

test('box: the pointer corner sets width and height, the top line the line, on specimen and bench', async ({ page }) => {
  const xray = await openDocs(page, 'bone');
  const card = xray.locator('.xr-card');
  await part(xray, 'Box');
  const specimen = card.locator('.ed-specimen .mu-lasso');
  const w0 = await value(card, 'Width').textContent(), h0 = await value(card, 'Height').textContent();
  const sw = await style(specimen, 'width'), bw = await style(bench(xray), 'width'), bh = await style(bench(xray), 'height');
  await drag(page, card.getByRole('slider', { name: 'Box size' }), 40, -30);
  await expect(value(card, 'Width')).not.toHaveText(w0!);
  await expect(value(card, 'Height')).not.toHaveText(h0!);
  expect(await style(specimen, 'width')).not.toBe(sw);
  expect(await style(bench(xray), 'width')).not.toBe(bw);
  expect(await style(bench(xray), 'height')).not.toBe(bh);

  const line0 = await value(card, 'Line').textContent();
  const border0 = await specimen.evaluate((e) => getComputedStyle(e).borderTopWidth);
  const benchLine0 = await style(bench(xray), '--mu-presence-lasso-width');
  await drag(page, card.getByRole('slider', { name: 'Line' }), 0, -20);
  await expect(value(card, 'Line')).not.toHaveText(line0!);
  expect(await specimen.evaluate((e) => getComputedStyle(e).borderTopWidth)).not.toBe(border0);
  expect(await style(bench(xray), '--mu-presence-lasso-width')).not.toBe(benchLine0);
  // back near its token it catches there, and the LED lights
  await drag(page, card.getByRole('slider', { name: 'Line' }), 0, 19);
  await expect(value(card, 'Line')).toHaveText(line0!);
  await expect(readout(card, 'Line').locator('.mu-led')).toHaveAttribute('data-kind', 'live');
});

test('count: the count itself moves away from the box, on specimen and bench', async ({ page }) => {
  const xray = await openDocs(page, 'bone');
  const card = xray.locator('.xr-card');
  await part(xray, 'Count');
  const count = card.locator('.ed-specimen .presence-lasso-readout');
  await expect(count).toHaveCount(1);
  const gap0 = await value(card, 'Gap').textContent();
  // measured from the box's bottom edge, so scrolling the handle into view does not count
  const box = card.locator('.ed-specimen .mu-lasso');
  const below = async () => { const c = (await count.boundingBox())!, b = (await box.boundingBox())!; return c.y - (b.y + b.height); };
  const gapPx0 = await below();
  const bench0 = await style(bench(xray), '--mu-presence-readout-gap');
  await drag(page, card.getByRole('slider', { name: 'Gap' }), 0, 12);
  await expect(value(card, 'Gap')).not.toHaveText(gap0!);
  expect(await below()).toBeGreaterThan(gapPx0);
  expect(await style(bench(xray), '--mu-presence-readout-gap')).not.toBe(bench0);
});

test('touch: dragging the box over the notes changes what it touches, on specimen and bench', async ({ page }) => {
  const xray = await openDocs(page, 'bone');
  const card = xray.locator('.xr-card');
  await part(xray, 'Touch');
  const touched0 = await value(card, 'Touched').textContent();
  const left0 = await value(card, 'Left').textContent();
  const bl = await style(bench(xray), 'left');
  // a little to the right: it keeps the first note and reaches the second
  await drag(page, card.getByRole('slider', { name: 'Box position' }), 60, 0);
  await expect(value(card, 'Left')).not.toHaveText(left0!);
  expect(await style(bench(xray), 'left')).not.toBe(bl);
  await expect(value(card, 'Touched')).not.toHaveText(touched0!);
  const touched = Number(await value(card, 'Touched').textContent());
  await expect(card.locator('.ed-lasso-note[data-touched]')).toHaveCount(touched);
  // a count of none shows no count under the box
  if (touched === 0) await expect(card.locator('.ed-specimen .presence-lasso-readout')).toHaveCount(0);
});

test('timing: letting go fades the real lasso and clears the bench', async ({ page }) => {
  const xray = await openDocs(page, 'bone');
  const card = xray.locator('.xr-card');
  await part(xray, 'Timing');
  await expect(bench(xray)).toHaveCount(1);
  await card.getByRole('switch', { name: 'Still dragging' }).click();
  await expect(card.getByRole('switch', { name: 'Still dragging' })).toHaveAttribute('aria-checked', 'false');
  await expect(bench(xray)).toHaveCount(0);
  await expect(card.locator('.ed-specimen .mu-lasso')).toHaveCount(0);
  await card.getByRole('switch', { name: 'Still dragging' }).click();
  await expect(card.locator('.ed-specimen .mu-lasso')).toHaveCount(1);
});

test('readouts scrub by drag and arrows; a focused handle shows its hint', async ({ page }) => {
  const xray = await openDocs(page, 'bone');
  const card = xray.locator('.xr-card');
  await part(xray, 'Box');
  const w0 = Number(await value(card, 'Width').textContent());
  await drag(page, readout(card, 'Width'), 0, -24);
  await expect(value(card, 'Width')).not.toHaveText(String(w0));
  const w1 = Number(await value(card, 'Width').textContent());
  expect(w1).toBeGreaterThan(w0);
  await readout(card, 'Width').focus();
  await page.keyboard.press('ArrowDown');
  await expect(value(card, 'Width')).toHaveText(String(w1 - 5));
  await card.getByRole('slider', { name: 'Line' }).focus();
  await expect(page.locator('.ed-tag')).toContainText('Line');
  await page.keyboard.press('ArrowUp');
  await expect(value(card, 'Line')).not.toHaveText('1');
});

test('narrow graphite card has no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const xray = await openDocs(page, 'graphite');
  for (const name of ['Box', 'Count', 'Touch', 'Timing']) {
    await part(xray, name);
    await expect(xray.locator('.xr-card .ed-specimen .ed-lasso-page')).toHaveCount(1);
    await expect(page.evaluate(() => document.documentElement.scrollWidth)).resolves.toBeLessThanOrEqual(375);
  }
});
