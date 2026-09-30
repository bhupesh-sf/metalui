import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions } from './harness';

/* The icon button x-ray is handled, not slid: every card holds the real IconButton, and
 * handling it changes the specimen and the model on the bench together. */

const ROUTE = '/components/icon-button';
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
const readout = (label: RegExp) => $$('.ed-readout', card()).find((e) => label.test(e.textContent!.trim()))!;
const value = (name: RegExp) => readout(name)?.querySelector('.ed-roll > span:not(.is-out)')?.textContent ?? null;

async function openDocs(colorway: 'bone' | 'graphite', options?: OpenOptions) {
  await openPage(ROUTE, colorway, options);
  await userEvent.click(page.elementLocator(xray()).getByRole('button', { name: 'X-ray' }));
  await until(() => document.querySelector('#x-ray .xr .xr-card'));
  await settle();
}
const handle = (name: string) => page.elementLocator(card()).getByRole('slider', { name, exact: true });
const style = (el: HTMLElement, key: string) => el.style.getPropertyValue(key);
const cap = () => $('.mu-icon-button', card());
const benchFace = () => $('.xr-thumb .xr-face', xray());

const CALLOUTS = ['Press', 'Latch', 'Shape', 'Kinds', 'Light', 'Layers'];

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
  test(`each icon button card holds one real icon button and no dials in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of CALLOUTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-icon-button', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial, .xr-dials, .mu-switcher', card())).toHaveLength(0);
    }
  });
}

test('press: holding the cap and pulling down sets how far it drops, on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Press');
  const before = value(/^Press depth/);
  const benchBefore = style(benchFace(), 'transform');
  const specimenBefore = style(cap(), '--mu-r-icon-button-tool-press');
  await drag(handle('Press depth').element(), 0, 24, 10);
  await expect.poll(() => value(/^Press depth/)).not.toBe(before);
  expect(style(cap(), '--mu-r-icon-button-tool-press')).not.toBe(specimenBefore);
  expect(style(benchFace(), 'transform')).not.toBe(benchBefore);
});

test('latch: the switch and the cap both keep it down, and the bench lights its LED', async () => {
  await openDocs('bone');
  await part('Latch');
  expect($$('.xr-led', xray())).toHaveLength(0);
  const stay = () => page.elementLocator(card()).getByRole('switch', { name: 'Stay down' });
  await userEvent.click(stay());
  await expect.poll(() => $('.ed-specimen .mu-icon-button', card()).getAttribute('aria-pressed')).toBe('true');
  await expect.poll(() => $$('.xr-led', xray()).length).toBe(1);
  await userEvent.click(page.elementLocator($('.ed-specimen .mu-icon-button', card())));
  await expect.poll(() => stay().element().getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => $$('.xr-led', xray()).length).toBe(0);
});

test('shape: the top edge, the corner and the icon change the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Shape');
  const now = (name: string) => Number(handle(name).element().getAttribute('aria-valuenow'));
  const sizeBefore = now('Size');
  const width = cap().getBoundingClientRect().width;
  await drag(handle('Size').element(), 0, -12, 10);
  const sizeAfter = now('Size');
  expect(sizeAfter).toBeGreaterThan(sizeBefore);
  expect(cap().getBoundingClientRect().width).toBeGreaterThan(width);
  await expect.poll(() => $$('.xr-dims text', xray())[0].textContent).toBe(`${sizeAfter}`);

  const radiusBefore = now('Corners');
  await drag(handle('Corners').element(), 20, 20, 10);
  const radiusAfter = now('Corners');
  expect(radiusAfter).not.toBe(radiusBefore);
  await expect.poll(() => css(cap(), 'border-radius')).toBe(`${radiusAfter}px`);
  await expect.poll(() => $$('.xr-dims text', xray())[1].textContent).toBe(`r ${radiusAfter}`);

  const glyphBefore = now('Icon size');
  const benchIcon = $('.xr-ib-glyph svg', xray()).getAttribute('width');
  await drag(handle('Icon size').element(), 0, -10, 10);
  const glyphAfter = now('Icon size');
  expect(glyphAfter).toBeGreaterThan(glyphBefore);
  await expect.poll(() => $('.ed-ib-glyph svg', card()).getAttribute('width')).toBe(`${glyphAfter}`);
  expect($('.xr-ib-glyph svg', xray()).getAttribute('width')).not.toBe(benchIcon);
});

test('kinds: a drag leans without stretching, then snaps to a real kind on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Kinds');
  const kind = () => handle('Kind').element();
  const kinds = ['tool', 'ghost', 'mini'];
  const before = kind().getAttribute('aria-valuetext')!;
  expect(kinds).toContain(before);
  const button = () => $('.ed-specimen .mu-icon-button', card());
  const width = css(button(), 'width');
  // a small nudge only leans: the next kind's outline lights, the button neither changes nor stretches
  const held = hold(kind(), 6, 0, 4);
  await expect.poll(() => $$('.ed-ib-lean', card()).length, { timeout: 1000 }).toBe(1);
  await expect.poll(() => css(button(), 'width')).toBe(width);
  expect(button().getAttribute('data-variant')).toBe(before);
  await held;
  await expect.poll(() => kind().getAttribute('aria-valuetext')).toBe(before);
  // far enough, it snaps to the next kind, never between
  await drag(kind(), 40, 0, 10);
  const after = kind().getAttribute('aria-valuetext')!;
  expect(kinds).toContain(after);
  expect(after).not.toBe(before);
  await expect.poll(() => button().getAttribute('data-variant')).toBe(after);
  await expect.poll(() => $$(`[data-ib-kind="${after}"]`, xray()).length).toBe(1);
  // a ghost or a mini has no shape to change: its other cards offer the way back to the tool
  await part('Shape');
  expect(handle('Kind').elements()).toHaveLength(1);
  expect(handle('Size').elements()).toHaveLength(0);
  (handle('Kind').element() as HTMLElement).focus();
  for (let i = kinds.indexOf(after); i > 0; i--) await userEvent.keyboard('{ArrowLeft}');
  await expect.poll(() => handle('Size').elements().length).toBe(1);
  await expect.poll(() => $$('[data-ib-kind="tool"]', xray()).length).toBe(1);
});

test('light: the sun turns the light on the specimen and the bench', async () => {
  await openDocs('graphite');
  await part('Light');
  const fill = benchFace().style.background;
  const face = style(cap(), '--mu-r-icon-button-tool-background');
  await drag(handle('Light').element(), 30, 6, 10);
  expect(benchFace().style.background).not.toBe(fill);
  expect(style(cap(), '--mu-r-icon-button-tool-background')).not.toBe(face);
  await expect.poll(() => value(/^Light from/)).not.toBe('top');
});

test('layers: a switch removes the same layer from the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Layers');
  const shadow = style(cap(), '--mu-r-icon-button-tool-shadow');
  expect($$('.xr-face.is-layer.is-off', xray())).toHaveLength(0);
  const drop = () => page.elementLocator(card()).getByRole('switch', { name: 'Drop' });
  await userEvent.click(drop());
  await expect.poll(() => drop().element().getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => $$('.xr-face.is-layer.is-off', xray()).length).toBe(1);
  expect(style(cap(), '--mu-r-icon-button-tool-shadow')).not.toBe(shadow);
  await hover(withText('.ed-layer', 'Edge', card()));
  await expect.poll(() => document.querySelector('#x-ray .xr .xr-face.is-layer.is-focus')?.textContent).toContain('Edge');
});

test('readouts scrub by drag and by arrow keys; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Shape');
  const start = value(/^Size/);
  await drag(readout(/^Size/), 0, -24, 10);
  await expect.poll(() => value(/^Size/)).not.toBe(start);
  const scrubbed = value(/^Size/);
  readout(/^Size/).focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value(/^Size/)).not.toBe(scrubbed);
  (handle('Size').element() as HTMLElement).focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Size');
  await part('Kinds');
  const kind = value(/^Kind/);
  readout(/^Kind/).focus();
  await userEvent.keyboard(kind === 'mini' ? '{ArrowDown}' : '{ArrowUp}');
  await expect.poll(() => value(/^Kind/)).not.toBe(kind);
  (handle('Kind').element() as HTMLElement).focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Kind');
});

test('floating tool opens the icon button x-ray; narrow graphite card has no sideways scroll', async () => {
  await openPage('/overview', 'graphite', { viewport: [375, 812] });
  await clickOnTable(await until(() => document.querySelector('[data-float="toolbar"] .mu-tool')));
  const card = () => $('.xr-overlay .xr-card');
  await expect.poll(() => card() && $$('.ed-specimen .mu-icon-button', card()).length).toBe(1);
  // the flight lands and the card comes to rest before anything on it is handled: the callouts are rebuilt on landing
  await until(() => !document.documentElement.dataset.flight && !document.querySelector('.xr-flyer'));
  await Promise.all(card().getAnimations().map((a) => a.finished));
  for (const name of CALLOUTS) {
    await click($(`.xr-overlay .xr-callout[aria-label^="${name}"]`));
    await expect.poll(() => $$('.ed-specimen .mu-icon-button', card()).length).toBe(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
  }
});
