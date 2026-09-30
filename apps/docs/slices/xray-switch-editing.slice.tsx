import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions } from './harness';

const ROUTE = '/components/switch';
const PARTS = ['State', 'Size', 'Gap', 'Stretch', 'Light', 'Layers'];
const $ = (css: string, root: ParentNode = document) => root.querySelector<HTMLElement>(css)!;
const $$ = (css: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>(css)];
const withText = (css: string, text: string, root: ParentNode = document) => $$(css, root).find((e) => e.textContent!.toLowerCase().includes(text.toLowerCase()))!;
const role = (root: Element, r: Parameters<typeof page.getByRole>[0], name: string) => page.elementLocator(root).getByRole(r, { name }).element() as HTMLElement;
const css = (el: Element, prop: string) => getComputedStyle(el).getPropertyValue(prop);
const inView = (el: Element) => { (el as HTMLElement & { scrollIntoViewIfNeeded(): void }).scrollIntoViewIfNeeded(); return el; };
/** A real click at an element's centre, whatever is drawn over it (Playwright's `force`). */
const click = (el: Element) => pointer(inView(el), [{ to: [0, 0] }, { down: true }, { up: true }]);
const hover = (el: Element) => pointer(inView(el), [{ to: [0, 0] }]);
const centre = (el: Element): [number, number] => { const b = el.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; };
/** Whether a point is in the window: WebDriver cannot move the mouse outside it (Playwright can). */
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < document.documentElement.clientWidth && y < document.documentElement.clientHeight;
/** Where to take hold of an element: its centre, scrolled into view so the drag stays in the window. */
type At = (box: DOMRect) => number;
const middle: At = (b) => b.x + b.width / 2;
function grip(target: Element, dx: number, dy: number, at: At = middle): [number, number] {
  const point = (): [number, number] => { const b = target.getBoundingClientRect(); return [at(b), b.y + b.height / 2]; };
  inView(target);
  let [x, y] = point();
  if (!inside(x + dx, y + dy)) { target.scrollIntoView({ block: 'center', inline: 'center' }); [x, y] = point(); }
  return [x, y];
}
/** A whole drag in one call (the page captures the pointer, and the capture ends with each WebDriver call). */
async function drag(target: Element, dx: number, dy: number, steps = 8, at: At = middle) {
  const [x, y] = grip(target, dx, dy, at);
  await mouse.drag([x, y], [x + dx, y + dy], { steps });
}
/** A drag that holds before letting go, to look mid-drag: check during the hold, then await it. */
function hold(target: Element, dx: number, dy: number, steps: number, ms = 1200) {
  const [x, y] = grip(target, dx, dy);
  return mouse.drag([x, y], [x + dx, y + dy], { steps, hold: ms });
}

// Locators, like Playwright's: read fresh each time (the card is rebuilt for every part).
const xray = () => $('#x-ray .xr');
const card = () => $('#x-ray .xr .xr-card');
/** The card rises in on a spring, so handles are measured once it has come to rest. */
const settle = () => Promise.all(card().getAnimations().map((a) => a.finished));
async function part(name: string) {
  await click($(`.xr-callout[aria-label^="${name}:"]`, xray()));
  await settle();
}
const readout = (name: string) => withText('.ed-readout', name, card());
const value = (name: string) => readout(name)?.querySelector('.ed-roll > span:not(.is-out)')?.textContent ?? null;

async function openDocs(colorway: 'bone' | 'graphite', options?: OpenOptions) {
  await openPage(ROUTE, colorway, options);
  await userEvent.click(page.elementLocator(xray()).getByRole('button', { name: 'X-ray' }));
  await until(() => document.querySelector('#x-ray .xr .xr-card'));
  await settle();
}
const control = () => $('.ed-specimen .mu-switch', card());
const slider = (name: string) => role(card(), 'slider', name);
const dims = () => $('.xr-dims text', xray()).textContent;

for (const colorway of COLORWAYS) {
  test(`each Switch card holds one real specimen and no dials in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of PARTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-switch', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial', card())).toHaveLength(0);
    }
  });
}

test('thumb lean, one flip, and a downward pull', async () => {
  await openDocs('bone');
  await part('State');
  expect(control().getAttribute('aria-checked')).toBe('false');
  const benchThumb = () => $$('.xr-thumb', xray()).at(-1)!;
  const beforeBench = benchThumb().style.transform;
  await drag(control(), 7, 0, 10);
  await expect.poll(() => control().getAttribute('aria-checked')).toBe('false');
  await drag(control(), 40, 0, 10);
  await expect.poll(() => control().getAttribute('aria-checked')).toBe('true');
  expect(benchThumb().style.transform).not.toBe(beforeBench);
  expect($$('.xr-dims', xray())).toHaveLength(0);
  await part('Stretch');
  const stretch = Number(value('Stretch'));
  await drag(control(), 0, 21, 10);
  expect(Number(value('Stretch'))).toBeGreaterThan(stretch);
  await expect.poll(() => control().getAttribute('aria-checked')).toBe('true');
  await expect.poll(() => css(control(), '--mu-r-switch-thumb-stretch')).toBe(`${value('Stretch')}px`);
  await expect.poll(dims).toBe(`${value('Stretch')}`);
  await userEvent.click(page.elementLocator(control()));
  await expect.poll(() => control().getAttribute('aria-checked')).toBe('false');
});

test('size snaps to recipe options and gap changes specimen and bench', async () => {
  await openDocs('bone');
  await part('Size');
  const size = () => slider('Size');
  const before = Number(size().getAttribute('aria-valuenow'));
  const options = [Number(size().getAttribute('aria-valuemin')), Number(size().getAttribute('aria-valuemax'))];
  expect(options).toContain(before);
  await drag(size(), 0, 5, 10);
  await expect.poll(() => size().getAttribute('aria-valuenow')).toBe(`${before}`);
  await drag(size(), 0, 35, 10);
  const after = Number(size().getAttribute('aria-valuenow'));
  expect(options).toContain(after);
  expect(after).not.toBe(before);
  await expect.poll(() => css(control(), 'height')).toBe(`${after}px`);
  await expect.poll(dims).toBe(`${after}`);
  await part('Gap');
  const gap = () => slider('Gap');
  const oldGap = gap().getAttribute('aria-valuenow');
  const thumb = () => $('.ed-specimen .mu-switch-thumb', card());
  const oldHeight = css(thumb(), 'height');
  await drag(gap(), 24, 0, 10);
  expect(gap().getAttribute('aria-valuenow')).not.toBe(oldGap);
  expect(css(thumb(), 'height')).not.toBe(oldHeight);
  await expect.poll(dims).toBe(`${gap().getAttribute('aria-valuenow')}`);
});

test('readouts scrub and step; focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Gap');
  const before = value('Gap');
  await drag(readout('Gap'), 0, -24, 10);
  expect(value('Gap')).not.toBe(before);
  const after = value('Gap');
  readout('Gap').focus(); await userEvent.keyboard('{ArrowDown}');
  expect(value('Gap')).not.toBe(after);
  slider('Gap').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Gap');
  await part('Light');
  const oldFill = css(control(), 'background-image');
  const oldBenchFill = $('.xr-face.is-flat', xray()).style.background;
  await drag(slider('Light'), 20, 2, 10);
  expect(css(control(), 'background-image')).not.toBe(oldFill);
  expect($('.xr-face.is-flat', xray()).style.background).not.toBe(oldBenchFill);
});

test('layer switches change the specimen and bench in graphite', async () => {
  await openDocs('graphite');
  await part('Layers');
  const row = () => withText('.ed-layer', 'Track fill', card());
  const layer = () => $('[role="switch"]', row());
  await hover(row());
  await expect.poll(() => $$('.xr-face.is-layer.is-focus', xray()).length).toBe(1);
  await userEvent.click(page.elementLocator(layer()));
  await expect.poll(() => layer().getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => $$('.xr-face.is-layer.is-off', xray()).length).toBe(1);
  await expect.poll(() => css(control(), 'background-image')).toBe('none');
});

test('375 px Switch x-ray has no sideways scroll in both colorways', async () => {
  for (const colorway of COLORWAYS) {
    await openDocs(colorway, { viewport: [375, 812] });
    for (const name of PARTS) {
      await part(name);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
    }
  }
});
