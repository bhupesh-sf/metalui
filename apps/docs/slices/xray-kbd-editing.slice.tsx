import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions } from './harness';

const ROUTE = '/components/kbd';
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
function grip(target: Element, dx: number, dy: number): [number, number] {
  let [x, y] = centre(inView(target));
  if (!inside(x + dx, y + dy)) { target.scrollIntoView({ block: 'center', inline: 'center' }); [x, y] = centre(target); }
  return [x, y];
}
/** A whole drag in one call (the page captures the pointer, and the capture ends with each WebDriver call). */
async function drag(target: Element, dx: number, dy: number, steps = 8) {
  const [x, y] = grip(target, dx, dy);
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
const inline = (el: HTMLElement, property: string) => el.style.getPropertyValue(property);
const key = () => $('.mu-kbd', card());
const face = () => $('.xr-face', xray());
const slider = (name: string) => role(card(), 'slider', name);

for (const colorway of COLORWAYS) {
  test(`each Kbd card holds real key and no dials in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of ['Shape', 'Type', 'Surface', 'Light', 'Shadow', 'Layers']) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-kbd', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial', card())).toHaveLength(0);
    }
  });
}

test('shape handles change the key and bench; size leans then snaps to a real option', async () => {
  await openDocs('bone');
  await part('Shape');
  const size = () => slider('Size');
  const before = Number(size().getAttribute('aria-valuenow'));
  const options = [Number(size().getAttribute('aria-valuemin')), Number(size().getAttribute('aria-valuemax'))];
  expect(options).toContain(before);
  await drag(size(), 0, before === Math.max(...options) ? 5 : -5, 10);
  expect(Number(size().getAttribute('aria-valuenow'))).toBe(before);
  await drag(size(), 0, before === Math.max(...options) ? 30 : -30, 10);
  const after = Number(size().getAttribute('aria-valuenow'));
  expect(options).toContain(after);
  expect(after).not.toBe(before);
  await expect.poll(() => css(key(), 'height')).toBe(`${after}px`);
  await expect.poll(() => $('.xr-dims text', xray()).textContent).toBe(`${after}`);
  const padBefore = inline(key(), 'padding-inline');
  const benchBefore = inline(face(), 'width');
  await drag(slider('Space beside the glyph'), 22, 0, 10);
  expect(inline(key(), 'padding-inline')).not.toBe(padBefore);
  expect(inline(face(), 'width')).not.toBe(benchBefore);
  const radiusBefore = inline(key(), 'border-radius');
  await drag(slider('Corners'), -20, -20, 10);
  expect(inline(key(), 'border-radius')).not.toBe(radiusBefore);
  await expect.poll(() => css(face(), 'border-radius')).toBe('0px');
});

test('type, surface, light, shadow and layer handles change specimen and bench', async () => {
  await openDocs('bone');
  await part('Type');
  const glyph = () => $('.xr-face span', xray());
  const font = inline(key(), 'font-size');
  // the glyph is one handle: up for a bigger glyph
  await drag(slider('Glyph size and letter spacing'), 0, -18, 10);
  expect(inline(key(), 'font-size')).not.toBe(font);
  await expect.poll(() => css(glyph(), 'font-size')).toBe(`${Number(value('Glyph size')) * 5}px`);
  const spacing = inline(key(), 'letter-spacing');
  const benchSpacing = inline(glyph(), 'letter-spacing');
  // …and sideways for more space between letters
  await drag(slider('Glyph size and letter spacing'), 20, 0, 10);
  expect(inline(key(), 'letter-spacing')).not.toBe(spacing);
  expect(inline(glyph(), 'letter-spacing')).not.toBe(benchSpacing);
  await part('Surface');
  const surface = () => slider('Surface');
  const first = surface().getAttribute('aria-valuetext');
  await drag(surface(), 8, 0, 10);
  await expect.poll(() => surface().getAttribute('aria-valuetext')).toBe(first);
  const benchSurface = inline(face(), 'background');
  await drag(surface(), 36, 0, 10);
  await expect.poll(() => surface().getAttribute('aria-valuetext')).toBe('On a dark strip');
  await expect.poll(() => key().getAttribute('data-surface')).toBe('strip');
  expect(inline(face(), 'background')).not.toBe(benchSurface);
  await drag(surface(), -36, 0, 10);
  await expect.poll(() => key().getAttribute('data-surface')).toBe('default');
  await part('Light');
  const fill = inline(face(), 'background');
  const keyFill = inline(key(), 'background');
  await drag(slider('Light'), 25, 4, 10);
  expect(inline(face(), 'background')).not.toBe(fill);
  expect(inline(key(), 'background')).not.toBe(keyFill);
  await part('Shadow');
  const shadow = inline(key(), 'box-shadow');
  const z = inline(face(), 'transform');
  await drag(slider('Height above the page'), 0, -24, 10);
  expect(inline(key(), 'box-shadow')).not.toBe(shadow);
  expect(inline(face(), 'transform')).not.toBe(z);
  await part('Layers');
  for (const name of ['Fill', 'Inner glow', 'Top light', 'Rim', 'Contact', 'Drop']) {
    const row = () => withText('.ed-layer', name, card());
    const layer = () => $('[role="switch"]', row());
    const look = () => `${key().style.background}|${key().style.boxShadow}`;
    const faceBefore = look();
    await hover(row());
    await expect.poll(() => $$('.xr-face.is-layer.is-focus', xray()).length).toBe(1);
    await userEvent.click(page.elementLocator(layer()));
    await expect.poll(() => layer().getAttribute('aria-checked')).toBe('false');
    expect(look()).not.toBe(faceBefore);
    await expect.poll(() => $$('.xr-face.is-layer.is-off', xray()).length).toBe(1);
    await userEvent.click(page.elementLocator(layer()));
    await expect.poll(() => layer().getAttribute('aria-checked')).toBe('true');
  }
});

test('readout scrubs by drag and arrow keys; focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Shape');
  const before = value('Space beside the glyph');
  await drag(readout('Space beside the glyph'), 0, -24, 10);
  expect(value('Space beside the glyph')).not.toBe(before);
  const after = value('Space beside the glyph');
  readout('Space beside the glyph').focus(); await userEvent.keyboard('{ArrowDown}');
  expect(value('Space beside the glyph')).not.toBe(after);
  slider('Size').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Size');
});

test('375 px graphite Kbd card has no sideways scroll', async () => {
  await openDocs('graphite', { viewport: [375, 812] });
  for (const name of ['Shape', 'Type', 'Surface', 'Light', 'Shadow', 'Layers']) {
    await part(name);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
  }
});
