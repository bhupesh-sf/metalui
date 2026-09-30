import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent } from './harness';

const ROUTE = '/components/swatch';
const PARTS = ['Shape', 'Type', 'Light', 'Dimple', 'Shadow', 'Layers'];
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
  await click($(`.xr-callout[aria-label^="${name}"]`, xray()));
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
const slider = (name: string) => role(card(), 'slider', name);
const chip = () => $('.mu-swatch', card());

for (const colorway of COLORWAYS) {
  test(`each Swatch callout holds a real chip and no old controls in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of PARTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-swatch', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial', card())).toHaveLength(0);
    }
    // Swatch has one recipe size and no size, kind, surface or state variants to step between.
    await part('Shape');
    expect(slider('Size').getAttribute('aria-valuetext') ?? '').not.toMatch(/compact|regular|small/);
  });
}

test('shape handles tune the real chip and the bench, with recipe tokens at rest', async () => {
  await openDocs('bone');
  await part('Shape');
  const face = () => $('.xr-face', xray());
  const size0 = css(chip(), 'width');
  const benchSize0 = face().style.width;
  const sizeHandle = () => slider('Size');
  const sizeStart = Number(sizeHandle().getAttribute('aria-valuenow'));
  await drag(sizeHandle(), 0, -30);
  await expect.poll(() => sizeHandle().getAttribute('aria-valuenow')).not.toBe(`${sizeStart}`);
  expect(css(chip(), 'width')).not.toBe(size0);
  expect(face().style.width).not.toBe(benchSize0);
  const radius0 = css(chip(), 'border-radius');
  const benchRadius0 = face().style.borderRadius;
  await drag(slider('Corners'), -24, -24);
  expect(css(chip(), 'border-radius')).not.toBe(radius0);
  expect(face().style.borderRadius).not.toBe(benchRadius0);
  // a keyboard user: focus the handle and press an arrow; its hint shows above the chip
  sizeHandle().focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Size');
});

test('colour, light, dimple and shadow handles change specimen and bench', async () => {
  await openDocs('graphite');
  await part('Type');
  const colour0 = chip().getAttribute('aria-label');
  await drag(slider('Colour'), 35, 0);
  await expect.poll(() => chip().getAttribute('aria-label')).not.toBe(colour0);
  await expect.poll(() => $('.xr-thumb .xr-face span', xray()).textContent).toBe(chip().getAttribute('aria-label')!.replace('Colour ', ''));
  await part('Light');
  const benchFace = () => $('.xr-thumb .xr-face', xray());
  const specimenFill0 = css(chip(), 'background-image');
  const benchFill0 = benchFace().style.background;
  await drag(slider('Light'), 30, 0);
  expect(css(chip(), 'background-image')).not.toBe(specimenFill0);
  expect(benchFace().style.background).not.toBe(benchFill0);
  await part('Dimple');
  const dimple0 = css($('.mu-swatch-led', card()), 'width');
  const modelDimple0 = $('.xr-face.is-flat', xray()).style.width;
  await drag(slider('Dimple'), 25, 0);
  expect(css($('.mu-swatch-led', card()), 'width')).not.toBe(dimple0);
  expect($('.xr-face.is-flat', xray()).style.width).not.toBe(modelDimple0);
  await part('Shadow');
  const specimenShadow0 = css(chip(), 'box-shadow');
  const modelShadow0 = $('.xr-shadow', xray()).style.filter;
  await drag(slider('Shadow blur'), 0, -28);
  expect(css(chip(), 'box-shadow')).not.toBe(specimenShadow0);
  expect($('.xr-shadow', xray()).style.filter).not.toBe(modelShadow0);
});

test('readouts scrub by drag and arrows; layer switches affect chip and bench', async () => {
  await openDocs('bone');
  await part('Shape');
  const size = () => slider('Size');
  const start = Number(size().getAttribute('aria-valuenow'));
  await drag(readout('Size'), 0, -24);
  expect(Number(size().getAttribute('aria-valuenow'))).toBeGreaterThan(start);
  const before = value('Corners');
  readout('Corners').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Corners')).not.toBe(before);
  await part('Layers');
  const drop = () => role(card(), 'switch', 'Coloured drop');
  const chipShadow0 = css(chip(), 'box-shadow');
  await userEvent.click(page.elementLocator(drop()));
  await expect.poll(() => drop().getAttribute('aria-checked')).toBe('false');
  expect(css(chip(), 'box-shadow')).not.toBe(chipShadow0);
  await expect.poll(() => $$('.xr-face.is-layer.is-off', xray()).filter((e) => e.textContent!.includes('Coloured drop')).length).toBe(1);
  await hover(withText('.ed-layer', 'Shine', card()));
  await expect.poll(() => $$('.xr-face.is-layer.is-focus', xray()).filter((e) => e.textContent!.includes('Shine')).length).toBe(1);
});

test('375 px graphite card fits without sideways scroll', async () => {
  await openDocs('graphite', { viewport: [375, 812], media: { 'prefers-reduced-motion': 'reduce' } });
  for (const name of PARTS) {
    await part(name);
    await expect.poll(() => $$('.ed-specimen .mu-swatch', card()).length).toBe(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
  }
});
