import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent } from './harness';

// The toast x-ray is handled, not slid: each card holds the real toast, and every handle
// changes both the specimen and the model on the bench.

const ROUTE = '/components/toast';
const PARTS = ['Timing', 'Type', 'Undo', 'Shape', 'Shadow', 'Layers'];
// how long it stays, from the recipe: with Undo, and without
const STAYS = { undo: tokens.toast['undo-ms'] / 1000, plain: tokens.toast['plain-ms'] / 1000 };
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
const readout = (name: string) => $$('.ed-readout', card()).find((e) => new RegExp(`^${name}`, 'i').test(e.textContent!.trim()))!;
const value = (name: string) => readout(name)?.querySelector('.ed-roll > span:not(.is-out)')?.textContent ?? null;

async function openDocs(colorway: 'bone' | 'graphite', options?: OpenOptions) {
  await openPage(ROUTE, colorway, options);
  await userEvent.click(page.elementLocator(xray()).getByRole('button', { name: 'X-ray' }));
  await until(() => document.querySelector('#x-ray .xr .xr-card'));
  await settle();
}
const now = (handle: Element) => Number(handle.getAttribute('aria-valuenow'));
const inline = (el: HTMLElement, prop: string) => el.style.getPropertyValue(prop);
const slider = (name: string) => role(card(), 'slider', name);
/** How much the specimen is magnified, so a drag can be sized in the toast's own points. */
const zoomOf = () => Number($('.ed-specimen > div', card()).style.zoom) || 1;
const toast = () => $('.ed-specimen .mu-toast', card());
const wrap = () => $('.xr-toastwrap', xray());
const layerIs = (state: string, name: string) => $$(`.xr-face.is-layer.${state}`, xray()).filter((e) => e.textContent!.includes(name)).length;

for (const colorway of COLORWAYS) {
  test(`toast cards hold one real specimen and no sliders in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of PARTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-toast', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial, .xr-dials', card())).toHaveLength(0);
    }
  });
}

test('timing: pull the toast down to where it rises from, and let go to see it arrive', async () => {
  await openDocs('bone');
  await part('Timing');
  const grip = () => slider('Rises from');
  const start = now(grip());
  const zoom = zoomOf();
  // While held, the specimen and the bench both sit at the pose it rises from. Watched in the page, every
  // frame until the hand lets go: a busy machine only makes it take longer, never miss it.
  const seen = { both: false, pose: NaN };
  let watching = true, frame = 0;
  const look = () => {
    try {
      const handle = grip(), pose = now(handle);
      if (pose > start && value('rises from') === String(pose) && inline(handle, 'translate').includes(`${pose}px`) && inline(wrap(), 'transform').includes('translate3d')) { seen.both = true; seen.pose = pose; }
    } catch { /* the card is between two builds */ }
    if (watching) frame = requestAnimationFrame(look);
  };
  addEventListener('pointerup', () => { watching = false; cancelAnimationFrame(frame); }, { capture: true, once: true });
  look();
  await hold(grip(), 0, 10 * zoom, 8, 600);
  expect(seen.both, 'held: the handle, the bench readout and the specimen all sit at the pose it rises from').toBe(true);
  expect(seen.pose).toBeGreaterThan(start);
  // let go, and both play the arrival from there
  await expect.poll(() => $$('.ed-toast-in', card()).length).toBe(1);
  await expect.poll(() => $$('.xr-toastwrap.ed-toast-benchin', xray()).length).toBe(1);
  expect(inline(wrap(), '--rise')).not.toBe(`${start * 2.4}px`);
  // how long it stays follows Undo
  await expect.poll(() => value('stays')).toBe(String(STAYS.undo));
});

test('type: the space before the detail is dragged in the gap; the detail switches off on both', async () => {
  await openDocs('bone');
  await part('Type');
  const gap = () => slider('Space before the detail');
  const start = now(gap());
  const text = () => $('.xr-toasttext', xray());
  const benchGap = inline(text(), 'gap');
  const specimenGap = css($('.mu-toast-text', card()), 'column-gap');
  await drag(gap(), 6 * zoomOf(), 0);
  expect(now(gap())).toBeGreaterThan(start);
  expect(css($('.mu-toast-text', card()), 'column-gap')).not.toBe(specimenGap);
  expect(inline(text(), 'gap')).not.toBe(benchGap);
  const detail = () => role(card(), 'switch', 'Detail');
  await userEvent.click(page.elementLocator(detail()));
  await expect.poll(() => detail().getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => $$('.ed-specimen .mu-toast-sub', card()).length).toBe(0);
  await expect.poll(() => text().textContent).not.toContain('undo it');
});

test('undo: pressing the cap sinks it on the specimen and the bench; Undo switches off on both', async () => {
  await openDocs('bone');
  await part('Undo');
  const cap = () => page.elementLocator(card()).getByRole('button', { name: 'Undo' }).element() as HTMLElement;
  const benchCap = () => document.querySelector<HTMLElement>('#x-ray .xr .xr-toastwrap .xr-thumb .xr-thumb .xr-face');
  const up = inline(benchCap()!, 'transform');
  const pressed = hold(cap(), 0, 0, 1);
  await expect.poll(() => cap().getAttribute('aria-pressed'), { timeout: 1000 }).toBe('true');
  expect(inline(cap(), 'translate')).toBe('0px 1px');
  expect(inline(benchCap()!, 'transform')).not.toBe(up);
  await pressed;
  await expect.poll(() => cap().getAttribute('aria-pressed')).toBe('false');
  await expect.poll(() => inline(benchCap()!, 'transform')).toBe(up);
  const toggle = () => role(card(), 'switch', 'Undo');
  await userEvent.click(page.elementLocator(toggle()));
  await expect.poll(() => toggle().getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => $$('.ed-specimen .mu-toast-undo', card()).length).toBe(0);
  await expect.poll(benchCap).toBeNull();
  await part('Timing');
  await expect.poll(() => value('stays')).toBe(String(STAYS.plain));
});

test('shape: the left end sets the space before the words, the right end the glass around the cap', async () => {
  await openDocs('bone');
  await part('Shape');
  const zoom = zoomOf();
  const pill = () => $('.xr-toastwrap > .xr-thumb > .xr-face', xray());
  const left = () => slider('Space on the left');
  const start = now(left());
  const width = inline(pill(), 'width');
  const pad = css(toast(), 'padding-left');
  await drag(left(), -5 * zoom, 0);
  expect(now(left())).toBeGreaterThan(start);
  expect(css(toast(), 'padding-left')).not.toBe(pad);
  expect(inline(pill(), 'width')).not.toBe(width);
  const right = () => slider('Space around the cap');
  const r0 = now(right());
  const width2 = inline(pill(), 'width');
  await drag(right(), 4 * zoom, 0);
  expect(now(right())).toBeGreaterThan(r0);
  expect(inline(pill(), 'width')).not.toBe(width2);
});

test('a tunable catches on its token: a small drag off it lands back, a long one leaves it', async () => {
  await openDocs('bone');
  await part('Shape');
  const zoom = zoomOf();
  const left = () => slider('Space on the left');
  const token = now(left());
  await expect.poll(() => readout('space on the left').getAttribute('aria-label')).toMatch(/toast recipe token/);
  await drag(left(), 0.8 * zoom, 0);
  expect(now(left())).toBe(token);
  await drag(left(), -4 * zoom, 0);
  expect(now(left())).toBeGreaterThan(token + 2);
  await expect.poll(() => readout('space on the left').getAttribute('aria-label')).toMatch(/tuned/);
});

test('shadow: lifting the toast grows its shadow on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Shadow');
  const lift = () => slider('Height above the page');
  const start = now(lift());
  const shadow = css(toast(), 'box-shadow');
  const blur = inline($('.xr-toastwrap .xr-shadow', xray()), 'filter');
  await drag(lift(), 0, -40);
  expect(now(lift())).toBeGreaterThan(start);
  expect(css(toast(), 'box-shadow')).not.toBe(shadow);
  expect(inline($('.xr-toastwrap .xr-shadow', xray()), 'filter')).not.toBe(blur);
});

test('layer switches remove the same layer from specimen and bench; a row points at its slice', async () => {
  await openDocs('bone');
  await part('Layers');
  const shadow = css(toast(), 'box-shadow');
  const far = () => role(card(), 'switch', 'Far shadow');
  await userEvent.click(page.elementLocator(far()));
  await expect.poll(() => far().getAttribute('aria-checked')).toBe('false');
  expect(css(toast(), 'box-shadow')).not.toBe(shadow);
  await expect.poll(() => layerIs('is-off', 'Far shadow')).toBe(1);
  const capBg = css($('.ed-specimen .mu-toast-undo', card()), 'background-image');
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Cap fill')));
  expect(css($('.ed-specimen .mu-toast-undo', card()), 'background-image')).not.toBe(capBg);
  await expect.poll(() => layerIs('is-off', 'Cap fill')).toBe(1);
  await hover(withText('.ed-layer', 'Cap rim', card()));
  await expect.poll(() => $$('.xr-face.is-layer.is-focus', xray()).length).toBe(1);
  expect($('.xr-face.is-layer.is-focus', xray()).textContent).toContain('Cap rim');
});

test('readouts scrub by drag and by arrow keys; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Shape');
  const left = () => slider('Space on the left');
  const start = now(left());
  await drag(readout('space on the left'), 0, -24);
  const scrubbed = now(left());
  expect(scrubbed).toBeGreaterThan(start);
  await expect.poll(() => value('space on the left')).toBe(String(scrubbed));
  readout('space on the left').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('space on the left')).toBe(String(scrubbed - 1));
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('space on the left')).toBe(String(scrubbed));
  await part('Timing');
  const rises = now(slider('Rises from'));
  readout('rises from').focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('rises from')).toBe(String(rises + 1));
  slider('Rises from').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Rises from');
  // clicking a readout hands its handle the keyboard, with the hint showing
  await part('Type');
  await userEvent.click(page.elementLocator(readout('space before the detail')));
  await expect.poll(() => document.activeElement).toBe(slider('Space before the detail'));
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Space before the detail');
});

test('375 px graphite card fits without sideways scroll, with reduced motion', async () => {
  await openDocs('graphite', { viewport: [375, 812], media: { 'prefers-reduced-motion': 'reduce' } });
  for (const name of PARTS) {
    await part(name);
    await expect.poll(() => $$('.ed-specimen .mu-toast', card()).length).toBe(1);
    const well = $('.ed-specimen', card()).getBoundingClientRect();
    const t = toast().getBoundingClientRect();
    expect(t.x).toBeGreaterThanOrEqual(well.x);
    expect(t.x + t.width).toBeLessThanOrEqual(well.x + well.width);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
  }
});
