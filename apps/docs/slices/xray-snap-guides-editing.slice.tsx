import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent } from './harness';

/* The snap guides x-ray, handled: each card holds a small canvas with the real SnapGuides,
 * and every handle on it changes that canvas and the model on the bench. */

const ROUTE = '/components/snap-guides';
const CALLOUTS = ['Catch', 'Line', 'Centre', 'Overshoot', 'Timing'];
// the guides at rest, from the presence tokens: how far they run past the notes, and the centre line's dash
const OVERSHOOT = tokens.presence['guide-overshoot'];
const DASH = tokens.presence['guide-dash'];
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
const benchGuides = () => document.querySelector<HTMLElement>('#x-ray .xr .xr-scene .mu-snap-guides');
const specimenGuides = () => card().querySelector<HTMLElement>('.ed-specimen .mu-snap-guides');
/** The dragged note on the bench is the scene's last cap. */
const benchNote = () => $$('.xr-scene > .xr-iso > .xr-thumb', xray()).at(-1)!.style.transform;
const slider = (name: string) => role(card(), 'slider', name);
const left6: At = (b) => b.x + 6;

for (const colorway of COLORWAYS) {
  test(`snap guides cards hold the real guides, never sliders, in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of CALLOUTS) {
      await part(name);
      await expect.poll(specimenGuides).not.toBeNull();
      expect($$('.ed-specimen .ed-snap-note', card())).toHaveLength(2);
      expect($$('.mu-slider, .xr-dial, .xr-dials, .xr-switch', card())).toHaveLength(0);
    }
    // the bench draws the same guides, and they are really on screen (not squeezed to nothing)
    const size = benchGuides()!.getBoundingClientRect();
    expect(size.width).toBeGreaterThan(50);
    expect(size.height).toBeGreaterThan(50);
  });
}

test('catch: drag the note out of the band and it moves freely; back in, it jumps onto the line', async () => {
  await openDocs('bone');
  await part('Catch');
  const note = () => slider('Where you drag');
  const specimenLeft = () => note().style.left;
  const lineLeft = $('.ed-snap-note', card()).style.left;
  // it starts caught: pulled onto the other note's line, with a lit readout
  const start = Number(note().getAttribute('aria-valuenow'));
  expect(Math.abs(start)).toBeGreaterThan(0);
  expect(specimenLeft()).toBe(lineLeft);
  await expect.poll(() => $('[data-kind]', readout('Where you drag')).getAttribute('data-kind')).toBe('live');
  const bench = benchNote();
  // far out of the band: free, no guides, on the specimen and on the bench
  await drag(note(), 60, 0, 10);
  const far = Number(note().getAttribute('aria-valuenow'));
  expect(far).toBeGreaterThan(start + 6);
  expect(specimenLeft()).not.toBe(lineLeft);
  expect(benchNote()).not.toBe(bench);
  await expect.poll(specimenGuides).toBeNull();
  await expect.poll(benchGuides).toBeNull();
  // back near the line: it is either free or exactly on the line, never pulled part way
  await drag(note(), -note().getBoundingClientRect().width * 0.12, 0, 10);
  const near = Number(note().getAttribute('aria-valuenow'));
  const left = parseFloat(specimenLeft());
  expect([parseFloat(lineLeft), parseFloat(lineLeft) + near]).toContain(left);
  // hold ⌘: no snapping and no guides anywhere
  await userEvent.click(page.elementLocator(xray()).getByRole('button', { name: 'Reset' }));
  await expect.poll(specimenGuides).not.toBeNull();
  const cmd = () => page.elementLocator(card()).getByRole('switch', { name: 'Hold ⌘' });
  await userEvent.click(cmd());
  await expect.poll(() => cmd().element().getAttribute('aria-checked')).toBe('true');
  expect(specimenLeft()).not.toBe(lineLeft);
  await expect.poll(specimenGuides).toBeNull();
  await expect.poll(benchGuides).toBeNull();
});

test('line: zooming the canvas keeps the line one point on screen, on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Line');
  const canvas = () => slider('Zoom');
  await expect.poll(() => value('Zoom')).toBe('100');
  const benchScale = benchGuides()!.style.getPropertyValue('--mu-canvas-scale');
  await drag(canvas(), 0, -60, 10, left6);
  const zoom = Number(canvas().getAttribute('aria-valuenow'));
  expect(zoom).toBeGreaterThan(100);
  await expect.poll(() => value('Zoom')).toBe(`${zoom}`);
  expect(benchGuides()!.style.getPropertyValue('--mu-canvas-scale')).not.toBe(benchScale);
  // the canvas grew, the line did not: its width in the canvas times the zoom is still one point
  const world = $('.ed-snap-world', card()).style.transform;
  expect(world).toContain(`scale(${zoom / 100})`);
  const stroke = parseFloat(getComputedStyle($('path', specimenGuides()!)).strokeWidth);
  expect(stroke * (zoom / 100)).toBeCloseTo(1, 1);
});

test('centre: drag along the dashed line to change its dash, on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Centre');
  const start = value('Dash');
  const dash = () => getComputedStyle($('path.presence-guide-center', specimenGuides()!)).strokeDasharray;
  const before = dash();
  const benchDash = () => $('.xr-snap-guides', xray()).style.getPropertyValue('--mu-presence-guide-dash');
  const bench = benchDash();
  await drag(slider('Dash'), 0, 30, 10);
  await expect.poll(() => value('Dash')).not.toBe(start);
  expect(dash()).not.toBe(before);
  expect(benchDash()).not.toBe(bench);
});

test('overshoot: drag the lines’ ends to run them farther, on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Overshoot');
  await expect.poll(() => value('Overshoot')).toBe(String(OVERSHOOT));
  const d = (el: Element) => $('path', el).getAttribute('d');
  const specimen = d(specimenGuides()!), bench = d(benchGuides()!);
  await drag(slider('Overshoot'), 0, 20, 10);
  await expect.poll(() => value('Overshoot')).not.toBe(String(OVERSHOOT));
  expect(d(specimenGuides()!)).not.toBe(specimen);
  expect(d(benchGuides()!)).not.toBe(bench);
});

test('timing: letting go fades the guides on the specimen and the bench; pressing brings them back', async () => {
  await openDocs('bone');
  await part('Timing');
  const still = () => page.elementLocator(card()).getByRole('switch', { name: 'Still dragging' });
  await userEvent.click(still());
  await expect.poll(() => still().element().getAttribute('aria-checked')).toBe('false');
  await expect.poll(specimenGuides).toBeNull();
  await expect.poll(benchGuides).toBeNull();
  // press and hold the note: the guides are back in the same frame; let go and they fade
  const note = () => slider('Still dragging');
  const at = grip(note(), 0, 0);
  const held = mouse.drag(at, at, { steps: 1, hold: 1200 });
  await expect.poll(() => note().getAttribute('aria-valuetext'), { timeout: 1000 }).toBe('held');
  await expect.poll(() => specimenGuides()?.getAttribute('data-state')).toBe('snapping');
  await expect.poll(benchGuides).not.toBeNull();
  await held;
  await expect.poll(() => note().getAttribute('aria-valuetext')).toBe('let go');
  await expect.poll(specimenGuides).toBeNull();
});

test('readouts scrub by drag and arrow keys; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Overshoot');
  const start = Number(value('Overshoot'));
  await drag(readout('Overshoot'), 0, -24, 10);
  const scrubbed = Number(value('Overshoot'));
  expect(scrubbed).toBeGreaterThan(start);
  readout('Overshoot').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Overshoot')).toBe(`${scrubbed - 0.5}`);
  // a readout step is never caught: it steps past the token
  await part('Line');
  readout('Zoom').focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('Zoom')).toBe('125');
  slider('Zoom').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Zoom');
  // clicking a readout hands its handle the keyboard, hint and all
  await part('Centre');
  await userEvent.click(page.elementLocator(readout('Dash')));
  await expect.poll(() => document.activeElement).toBe(slider('Dash'));
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Dash');
  await userEvent.keyboard('{ArrowUp}');
  // one step up the readout: half a point
  await expect.poll(() => value('Dash')).toBe(String(DASH + 0.5));
});

// The page itself scrolls sideways at 375 px before the x-ray opens: the playground's haptic caption
// (SnapCanvas, shared with the lasso page) is wider than the phone. That is outside this x-ray.
test('narrow graphite x-ray has no sideways scroll on any card', async () => {
  await openDocs('graphite', { viewport: [375, 812] });
  for (const name of CALLOUTS) {
    await part(name);
    await expect.poll(specimenGuides).not.toBeNull();
    // the x-ray and everything in its card stay inside the phone's width
    const box = xray().getBoundingClientRect();
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    expect(Math.max(...[card(), ...card().querySelectorAll('*')].map((e) => e.getBoundingClientRect().right))).toBeLessThanOrEqual(375);
    expect(card().scrollWidth - card().clientWidth).toBeLessThanOrEqual(0);
  }
});
