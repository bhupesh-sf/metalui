import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent } from './harness';

// The toolbar x-ray's editing layer: each card holds the real graphite toolbar, changed by
// handling it. Its handles, readouts and switches change the same model the bench draws.

const ROUTE = '/components/toolbar';
const SPOTS = ['Strip', 'Tools', 'Groove', 'Shape', 'Shadow', 'Layers'];
const TOOLS = ['Select', 'Note', 'Draw', 'Tidy'];
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
const num = (name: string) => Number(value(name));
const benchStrip = () => $('.xr-iso > .xr-thumb > .xr-face', xray());
const style = (el: HTMLElement, prop: string) => el.style.getPropertyValue(prop);
const slider = (name: string) => role(card(), 'slider', name);
const strip = () => $('.ed-specimen .mu-toolbar', card());
const led = (name: string) => $('.mu-led', readout(name)).getAttribute('data-kind');

for (const colorway of COLORWAYS) {
  test(`toolbar cards hold one real toolbar, never a slider, in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of SPOTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-toolbar', card()).length).toBe(1);
      expect($$('.ed-specimen .mu-tool', card())).toHaveLength(4);
      expect($$('.mu-slider, .xr-dial, .mu-switcher', card())).toHaveLength(0);
    }
  });
}

test('tools: the pressed tool leans, then snaps onto a real tool, on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Tools');
  const handle = () => page.elementLocator(card()).getByRole('slider', { name: 'Tool', exact: true }).element();
  const start = handle().getAttribute('aria-valuetext')!;
  expect(TOOLS).toContain(start);
  const i = TOOLS.indexOf(start);
  // a small nudge only leans: nothing is picked, and the target lights up
  const held = hold(handle(), 5, 0, 4);
  await expect.poll(() => $$('.ed-tb-lean', card()).length, { timeout: 1000 }).toBe(1);
  expect(handle().getAttribute('aria-valuetext')).toBe(start);
  await held;
  await expect.poll(() => $$('.ed-tb-lean', card()).length).toBe(0);
  // far enough, it clicks over to the next real tool, never between
  await drag(handle(), 24, 0);
  const next = handle().getAttribute('aria-valuetext')!;
  expect(TOOLS).toContain(next);
  expect(TOOLS.indexOf(next)).toBeGreaterThan(i);
  await expect.poll(() => $$('.mu-tool[aria-pressed="true"]', card()).length).toBe(1);
  expect($('.mu-tool[aria-pressed="true"]', card()).getAttribute('aria-label')).toBe(next);
  await expect.poll(() => $('.xr-tool[data-down]', xray()).getAttribute('data-tool')).toBe(next.toLowerCase());
  // clicking another real cap still picks it
  await userEvent.click(page.elementLocator($('.mu-tool[aria-label="Select"]', card())));
  await expect.poll(() => $('.xr-tool[data-down]', xray()).getAttribute('data-tool')).toBe('select');
  await expect.poll(() => handle().getAttribute('aria-valuetext')).toBe('Select');
});

test('strip, gap, groove, corners and lift handles change the specimen and the bench', async () => {
  await openDocs('bone');
  const width = () => strip().getBoundingClientRect().width;

  await part('Strip');
  const pad0 = num('Space around the tools');
  const bench0 = style(benchStrip(), 'width');
  const w0 = width();
  await hover($('.ed-tb', card()));
  await drag(slider('Space around the tools'), 5, 0);
  await expect.poll(() => value('Space around the tools')).not.toBe(String(pad0));
  expect(width()).toBeGreaterThan(w0);
  expect(style(benchStrip(), 'width')).not.toBe(bench0);

  await part('Tools');
  const gap0 = num('Space between tools');
  const w1 = width();
  const tidy = () => $('.xr-tool[data-tool="tidy"] .xr-thumb', xray()).style.transform;
  const tidy0 = tidy();
  await hover($('.ed-tb', card()));
  await drag(slider('Space between tools'), 14, 0);
  await expect.poll(() => value('Space between tools')).not.toBe(String(gap0));
  expect(width()).toBeGreaterThan(w1);
  expect(tidy()).not.toBe(tidy0);

  await part('Groove');
  const m0 = num('Space beside the groove');
  const groove = () => document.querySelector<HTMLElement>('#x-ray .xr [data-part="groove"]');
  const groove0 = style(groove()!, 'left');
  const w2 = width();
  await hover($('.ed-tb', card()));
  await drag(slider('Space beside the groove'), 14, 0);
  await expect.poll(() => value('Space beside the groove')).not.toBe(String(m0));
  expect(width()).toBeGreaterThan(w2);
  expect(style(groove()!, 'left')).not.toBe(groove0);
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Groove')));
  await expect.poll(() => $$('.mu-toolbar-sep', card()).length).toBe(0);
  await expect.poll(groove).toBeNull();
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Groove')));
  await expect.poll(() => $$('.mu-toolbar-sep', card()).length).toBe(1);

  await part('Shape');
  const r0 = num('Outer corners');
  const benchR = style(benchStrip(), 'border-radius');
  await hover($('.ed-tb', card()));
  await drag(slider('Outer corners'), -30, -30);
  await expect.poll(() => value('Outer corners')).not.toBe(String(r0));
  const follow = () => role(card(), 'switch', 'Corners follow the caps');
  await expect.poll(() => follow().getAttribute('aria-checked')).toBe('false');
  const r1 = num('Outer corners');
  await expect.poll(() => css(strip(), 'border-radius')).toBe(`${r1}px`);
  expect(style(benchStrip(), 'border-radius')).not.toBe(benchR);
  await userEvent.click(page.elementLocator(follow()));
  await expect.poll(() => value('Outer corners')).not.toBe(String(r1));

  await part('Shadow');
  const lift0 = value('Height above the page');
  const shadow0 = css(strip(), 'box-shadow');
  const far = () => $('.xr-shadow', xray()).style.transform;
  const far0 = far();
  await drag(slider('Height above the page'), 0, -16);
  await expect.poll(() => value('Height above the page')).not.toBe(lift0);
  expect(css(strip(), 'box-shadow')).not.toBe(shadow0);
  expect(far()).not.toBe(far0);
});

test('tunables catch on their token: the LED lights there and goes dark off it', async () => {
  await openDocs('bone');
  await part('Tools');
  await expect.poll(() => led('Space between tools')).toBe('live');
  readout('Space between tools').focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => led('Space between tools')).not.toBe('live');
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => led('Space between tools')).toBe('live');
});

test('layer switches remove the same layer from specimen and bench; hover lights it', async () => {
  await openDocs('bone');
  await part('Layers');
  const shadow = css(strip(), 'box-shadow');
  await hover(withText('.ed-layer', 'Far shadow', card()));
  await expect.poll(() => $$('.xr-face.is-layer.is-focus', xray()).length).toBe(1);
  const far = () => role(card(), 'switch', 'Far shadow');
  await userEvent.click(page.elementLocator(far()));
  await expect.poll(() => far().getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => $$('.xr-face.is-layer.is-off', xray()).length).toBe(1);
  expect(css(strip(), 'box-shadow')).not.toBe(shadow);
});

test('readouts scrub by drag and by arrows; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Strip');
  const pad0 = num('Space around the tools');
  await drag(readout('Space around the tools'), 0, -24);
  const pad1 = num('Space around the tools');
  expect(pad1).toBeGreaterThan(pad0);
  readout('Space around the tools').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Space around the tools')).toBe(String(pad1 - 1));
  // the tool steps through the real tools only
  await part('Tools');
  const t0 = value('Tool');
  readout('Tool').focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('Tool')).not.toBe(t0);
  expect(TOOLS).toContain(value('Tool'));
  slider('Space between tools').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Space between tools');
});

test('graphite at 375 px: the floating table opens the toolbar x-ray, and its cards never scroll sideways', async () => {
  // the toolbar's own docs page has a wide playground; the overview's x-ray overlay is the x-ray alone
  await openPage('/overview', 'graphite', { viewport: [375, 812] });
  const bar = await until(() => document.querySelector('[data-float="toolbar"] .mu-toolbar'));
  // the table drifts, and at 375 px its objects pass over one another: stop its clock at the start
  // (as page.clock would, for CSS time) so the strip is where it is measured
  for (const a of document.getAnimations()) if ((a as CSSAnimation).animationName === 'drift') { a.pause(); a.currentTime = 0; }
  // the strip (not a tool cap) opens the toolbar's x-ray
  inView(bar);
  const r = bar.getBoundingClientRect();
  await mouse.move(Math.round(r.x + 3), Math.round(r.y + 3));
  await mouse.down();
  await mouse.up();
  await until(() => document.querySelector('.xr-overlay') && !document.documentElement.dataset.flight && !document.querySelector('.xr-flyer'));
  const overlay = () => $('.xr-overlay');
  const overlayCard = () => $('.xr-card', overlay());
  for (const name of SPOTS) {
    await click($(`.xr-callout[aria-label^="${name}"]`, overlay()));
    await expect.poll(() => $$('.ed-specimen .mu-toolbar', overlayCard()).length).toBe(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
  }
  // the widest the strip gets still fits the card
  await click($('.xr-callout[aria-label^="Tools"]', overlay()));
  withText('.ed-readout', 'Space between tools', overlayCard()).focus();
  for (let i = 0; i < 12; i++) await userEvent.keyboard('{ArrowUp}');
  const s = $('.ed-specimen .mu-toolbar', overlayCard()).getBoundingClientRect(), w = $('.ed-specimen', overlayCard()).getBoundingClientRect();
  expect(s.x + s.width).toBeLessThanOrEqual(w.x + w.width);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
});
