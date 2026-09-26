import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS } from './helpers';

const part = (xray: Locator, name: string) => xray.locator(`.xr-callout[aria-label^="${name}:"]`).click();
const readout = (card: Locator, name: string) => card.locator('.ed-readout').filter({ hasText: name });
const value = (card: Locator, name: string) => readout(card, name).locator('.ed-roll > span:not(.is-out)');
async function drag(page: Page, target: Locator, dx: number, dy: number) {
  await target.scrollIntoViewIfNeeded();
  const b = (await target.boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 }); await page.mouse.up();
}
async function open(page: Page, colorway: string) {
  await page.addInitScript((c) => localStorage.setItem('metalui:colorway', c), colorway);
  await page.goto('/components/switch');
  const xray = page.locator('#x-ray .xr');
  await xray.getByRole('button', { name: 'X-ray' }).click();
  return xray;
}

for (const colorway of COLORWAYS) {
  test(`each Switch card holds one real specimen and no dials in ${colorway}`, async ({ page }) => {
    const xray = await open(page, colorway), card = xray.locator('.xr-card');
    for (const name of ['State', 'Size', 'Gap', 'Stretch', 'Light', 'Layers']) {
      await part(xray, name);
      await expect(card.locator('.ed-specimen .mu-switch')).toHaveCount(1);
      await expect(card.locator('.mu-slider, .xr-dial')).toHaveCount(0);
    }
  });
}

test('thumb lean, one flip, and a downward pull', async ({ page }) => {
  const xray = await open(page, 'bone'), card = xray.locator('.xr-card');
  await part(xray, 'State');
  const control = card.locator('.ed-specimen .mu-switch');
  await expect(control).toHaveAttribute('aria-checked', 'false');
  const benchThumb = xray.locator('.xr-thumb').last();
  const beforeBench = await benchThumb.evaluate((el) => (el as HTMLElement).style.transform);
  await drag(page, control, 7, 0);
  await expect(control).toHaveAttribute('aria-checked', 'false');
  await drag(page, control, 40, 0);
  await expect(control).toHaveAttribute('aria-checked', 'true');
  expect(await benchThumb.evaluate((el) => (el as HTMLElement).style.transform)).not.toBe(beforeBench);
  await expect(xray.locator('.xr-dims')).toHaveCount(0);
  await part(xray, 'Stretch');
  const stretch = Number(await value(card, 'Stretch').textContent());
  await drag(page, card.locator('.ed-specimen .mu-switch'), 0, 21);
  expect(Number(await value(card, 'Stretch').textContent())).toBeGreaterThan(stretch);
  await expect(card.locator('.ed-specimen .mu-switch')).toHaveAttribute('aria-checked', 'true');
  await expect(card.locator('.ed-specimen .mu-switch')).toHaveCSS('--mu-r-switch-thumb-stretch', `${await value(card, 'Stretch').textContent()}px`);
  await expect(xray.locator('.xr-dims text')).toHaveText(`${await value(card, 'Stretch').textContent()}`);
  await card.locator('.ed-specimen .mu-switch').click();
  await expect(card.locator('.ed-specimen .mu-switch')).toHaveAttribute('aria-checked', 'false');
});

test('size snaps to recipe options and gap changes specimen and bench', async ({ page }) => {
  const xray = await open(page, 'bone'), card = xray.locator('.xr-card');
  await part(xray, 'Size');
  const size = card.getByRole('slider', { name: 'Size' });
  const before = Number(await size.getAttribute('aria-valuenow'));
  const options = [Number(await size.getAttribute('aria-valuemin')), Number(await size.getAttribute('aria-valuemax'))];
  expect(options).toContain(before);
  await drag(page, size, 0, 5);
  await expect(size).toHaveAttribute('aria-valuenow', `${before}`);
  await drag(page, size, 0, 35);
  const after = Number(await size.getAttribute('aria-valuenow'));
  expect(options).toContain(after);
  expect(after).not.toBe(before);
  await expect(card.locator('.ed-specimen .mu-switch')).toHaveCSS('height', `${after}px`);
  await expect(xray.locator('.xr-dims text')).toHaveText(`${after}`);
  await part(xray, 'Gap');
  const gap = card.getByRole('slider', { name: 'Gap' });
  const oldGap = await gap.getAttribute('aria-valuenow');
  const thumb = card.locator('.ed-specimen .mu-switch-thumb');
  const oldHeight = await thumb.evaluate((el) => getComputedStyle(el).height);
  await drag(page, gap, 24, 0);
  expect(await gap.getAttribute('aria-valuenow')).not.toBe(oldGap);
  expect(await thumb.evaluate((el) => getComputedStyle(el).height)).not.toBe(oldHeight);
  await expect(xray.locator('.xr-dims text')).toHaveText(`${await gap.getAttribute('aria-valuenow')}`);
});

test('readouts scrub and step; focused handle shows its hint', async ({ page }) => {
  const xray = await open(page, 'bone'), card = xray.locator('.xr-card');
  await part(xray, 'Gap');
  const gap = readout(card, 'Gap');
  const before = await value(card, 'Gap').textContent();
  await drag(page, gap, 0, -24);
  expect(await value(card, 'Gap').textContent()).not.toBe(before);
  const after = await value(card, 'Gap').textContent();
  await gap.focus(); await page.keyboard.press('ArrowDown');
  expect(await value(card, 'Gap').textContent()).not.toBe(after);
  await card.getByRole('slider', { name: 'Gap' }).focus();
  await expect(page.locator('.ed-tag')).toContainText('Gap');
  await part(xray, 'Light');
  const oldFill = await card.locator('.ed-specimen .mu-switch').evaluate((el) => getComputedStyle(el).backgroundImage);
  const oldBenchFill = await xray.locator('.xr-face.is-flat').evaluate((el) => (el as HTMLElement).style.background);
  await drag(page, card.getByRole('slider', { name: 'Light' }), 20, 2);
  expect(await card.locator('.ed-specimen .mu-switch').evaluate((el) => getComputedStyle(el).backgroundImage)).not.toBe(oldFill);
  expect(await xray.locator('.xr-face.is-flat').evaluate((el) => (el as HTMLElement).style.background)).not.toBe(oldBenchFill);
});

test('layer switches change the specimen and bench in graphite', async ({ page }) => {
  const xray = await open(page, 'graphite'), card = xray.locator('.xr-card');
  await part(xray, 'Layers');
  const row = card.locator('.ed-layer').filter({ hasText: 'Track fill' });
  const layer = row.getByRole('switch');
  await row.hover();
  await expect(xray.locator('.xr-face.is-layer.is-focus')).toHaveCount(1);
  await layer.click();
  await expect(layer).toHaveAttribute('aria-checked', 'false');
  await expect(xray.locator('.xr-face.is-layer.is-off')).toHaveCount(1);
  await expect(card.locator('.ed-specimen .mu-switch')).toHaveCSS('background-image', 'none');
});

test('375 px Switch x-ray has no sideways scroll in both colorways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const colorway of COLORWAYS) {
    const xray = await open(page, colorway);
    for (const name of ['State', 'Size', 'Gap', 'Stretch', 'Light', 'Layers']) {
      await part(xray, name);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    }
  }
});
