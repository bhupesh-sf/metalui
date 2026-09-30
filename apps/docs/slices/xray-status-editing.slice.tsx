import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions } from './harness';

// The status badge x-ray's editing layer: every card holds the real StatusBadge (a specimen),
// changed by handling it, never a slider. Its handles, readouts and switches change the same
// model the bench draws.

const ROUTE = '/components/status';
const STATES = ['live', 'waiting', 'failed', 'linked', 'off'];
const CALLOUTS = ['States', 'Lamp', 'Glow', 'Type', 'Shape', 'Layers'];
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
const style = (el: HTMLElement, prop: string) => el.style.getPropertyValue(prop);
const slider = (name: string) => role(card(), 'slider', name);
const said = (el: HTMLElement) => el.innerText.trim();
const shown = (name: string) => { const r = readout(name).querySelector<HTMLElement>('.ed-roll > span:not(.is-out)'); return r ? said(r) : null; };
const badge = () => $('.ed-specimen .mu-badge', card());
const lamp = () => $('.xr-badgeface i', xray());
const text = (el: Element) => el.textContent!.replace(/\s+/g, ' ').trim();

/**
 * Clicks an object on the floating table. The table drifts on CSS animations, and at 375 px its
 * objects pass over one another, so a click at a moving target lands on whatever is on top at that
 * moment. Stop the table's clock at its start (as page.clock would, for CSS time) and click a
 * whole-pixel point of the object that nothing covers.
 */
async function clickOnTable(el: Element) {
  for (const a of document.getAnimations()) if ((a as CSSAnimation).animationName === 'drift') { a.pause(); a.currentTime = 0; }
  inView(el);
  const r = el.getBoundingClientRect();
  const mine = (x: number, y: number) => el.contains(document.elementFromPoint(x, y));
  for (const fy of [0.5, 0.3, 0.7]) for (const fx of [0.5, 0.3, 0.7, 0.15, 0.85]) {
    const x = Math.round(r.x + r.width * fx), y = Math.round(r.y + r.height * fy);
    if ([-2, 0, 2].every((d) => mine(x + d, y) && mine(x, y + d))) { await mouse.move(x, y); await mouse.down(); await mouse.up(); return; }
  }
  throw new Error('the object is covered everywhere');
}

for (const colorway of COLORWAYS) {
  test(`every part of the status x-ray is handled, not slid, in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of CALLOUTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-badge', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial, .mu-switcher', card())).toHaveLength(0);
    }
  });
}

test('states: a small drag only leans, a longer one snaps to the next real state, on specimen and bench', async () => {
  await openDocs('bone');
  const handle = () => slider('State');
  const before = handle().getAttribute('aria-valuetext')!;
  expect(STATES).toContain(before);
  // a nudge leans (the tag names the target) but never picks
  await drag(handle(), 6, 0, 10);
  await expect.poll(() => handle().getAttribute('aria-valuetext')).toBe(before);
  // far enough, it is the next state: never between
  await drag(handle(), 20, 0, 10);
  const after = handle().getAttribute('aria-valuetext')!;
  expect(STATES).toContain(after);
  expect(STATES.indexOf(after)).toBe(STATES.indexOf(before) + 1);
  const words = said(badge());
  await expect.poll(() => text($('.xr-badgeface', xray()))).toBe(words);
  await expect.poll(() => $('.ed-specimen .mu-badge .mu-led', card()).getAttribute('data-kind')).toBe('waiting');
  // the readout steps it back with an arrow key
  readout('State').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => handle().getAttribute('aria-valuetext')).toBe(before);
});

test('lamp: the sun moves the bright spot on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Lamp');
  const across = shown('Spot across');
  const bench = style(lamp(), 'background');
  const led = () => $('.ed-specimen .mu-badge .mu-led', card());
  const specimen = css(led(), 'background-image');
  await drag(slider('Bright spot'), 24, 10, 10);
  await expect.poll(() => shown('Spot across')).not.toBe(across);
  expect(style(lamp(), 'background')).not.toBe(bench);
  expect(css(led(), 'background-image')).not.toBe(specimen);
});

test('glow: a switch takes the green lamp\'s glow off both', async () => {
  await openDocs('bone');
  await part('Glow');
  const bench = style(lamp(), 'box-shadow');
  const led = () => $('.ed-specimen .mu-badge .mu-led', card());
  const specimen = css(led(), 'box-shadow');
  const glow = () => role(card(), 'switch', 'Glow');
  expect(glow().getAttribute('aria-checked')).toBe('true');
  await userEvent.click(page.elementLocator(glow()));
  await expect.poll(() => glow().getAttribute('aria-checked')).toBe('false');
  expect(style(lamp(), 'box-shadow')).not.toBe(bench);
  expect(css(led(), 'box-shadow')).not.toBe(specimen);
});

test('type: the words are the handle; sideways sets spacing, up sets size', async () => {
  await openDocs('bone');
  await part('Type');
  const face = () => $('.xr-badgeface', xray());
  const words = () => slider('Letter size and spacing');
  const spacing = shown('Letter spacing');
  const benchTrack = style(face(), 'letter-spacing');
  const specTrack = css(words(), 'letter-spacing');
  await drag(words(), 30, 0, 10);
  await expect.poll(() => shown('Letter spacing')).not.toBe(spacing);
  expect(style(face(), 'letter-spacing')).not.toBe(benchTrack);
  expect(css(words(), 'letter-spacing')).not.toBe(specTrack);
  const size = shown('Letter size');
  const benchSize = style(face(), 'font-size');
  await drag(words(), 0, -12, 10);
  await expect.poll(() => shown('Letter size')).not.toBe(size);
  expect(style(face(), 'font-size')).not.toBe(benchSize);
});

test('shape: top edge, right end and lamp change the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Shape');
  const face = () => $('.xr-face:has(.xr-badgeface)', xray());

  const h = shown('Height');
  const benchH = style(face(), 'height');
  const specH = badge().getBoundingClientRect().height;
  await drag(slider('Height'), 0, -8, 10);
  await expect.poll(() => shown('Height')).not.toBe(h);
  expect(style(face(), 'height')).not.toBe(benchH);
  expect(badge().getBoundingClientRect().height).toBeGreaterThan(specH);

  const pad = shown('Space on the ends');
  const benchW = style(face(), 'width');
  const specW = badge().getBoundingClientRect().width;
  await drag(slider('Space on the ends'), 12, 0, 10);
  await expect.poll(() => shown('Space on the ends')).not.toBe(pad);
  expect(style(face(), 'width')).not.toBe(benchW);
  expect(badge().getBoundingClientRect().width).toBeGreaterThan(specW);

  const led = shown('Lamp size');
  const benchLed = style(lamp(), 'width');
  const specLed = css($('.mu-led', badge()), 'width');
  await drag(slider('Lamp size'), 10, -10, 10);
  await expect.poll(() => shown('Lamp size')).not.toBe(led);
  expect(style(lamp(), 'width')).not.toBe(benchLed);
  expect(css($('.mu-led', badge()), 'width')).not.toBe(specLed);
});

test('readouts scrub by drag and by arrow keys; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Shape');
  const h0 = Number(shown('Height'));
  await drag(readout('Height'), 0, -24, 10);
  await expect.poll(() => shown('Height')).toBe(String(h0 + 3));
  readout('Height').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => shown('Height')).toBe(String(h0 + 2));
  slider('Space on the ends').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Space on the ends');
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(page.elementLocator(await until(() => document.querySelector('.ed-tag')))).toBeVisible();
});

test('layers: a switch takes a layer off the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Layers');
  const shadow = css(badge(), 'box-shadow');
  expect($$('.xr-face.is-layer.is-off', xray())).toHaveLength(0);
  const drop = () => role(card(), 'switch', 'Drop');
  await userEvent.click(page.elementLocator(drop()));
  await expect.poll(() => drop().getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => $$('.xr-face.is-layer.is-off', xray()).length).toBe(1);
  expect(css(badge(), 'box-shadow')).not.toBe(shadow);
});

test('graphite at 375 px: the x-ray opened from the table fits every card without sideways scroll', async () => {
  // opened from the overview's floating table, as a phone reader meets it (the status page itself
  // is wider than 375 before the x-ray opens, because of its SwiftUI capture)
  await openPage('/overview', 'graphite', { viewport: [375, 812] });
  await clickOnTable(await until(() => document.querySelector('[data-float="status"] .mu-badge')));
  const overlay = () => $('.xr-overlay');
  const overlayCard = () => $('.xr-card', overlay());
  for (const name of CALLOUTS) {
    await click(await until(() => overlay()?.querySelector(`.xr-callout[aria-label^="${name}"]`)));
    await expect.poll(() => $$('.ed-specimen .mu-badge', overlayCard()).length).toBe(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
    expect(overlayCard().scrollWidth - overlayCard().clientWidth).toBeLessThanOrEqual(0);
  }
});
