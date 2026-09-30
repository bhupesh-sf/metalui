import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent } from './harness';

const ROUTE = '/components/lasso';
// the lasso's line at rest, from the presence tokens
const LINE = tokens.presence['lasso-width'];
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
const readout = (name: string) => $$('.ed-readout', card()).find((r) => [...r.querySelectorAll('b')].some((b) => b.textContent!.trim() === name))!;
const value = (name: string) => readout(name)?.querySelector('.ed-roll > span:not(.is-out)')?.textContent ?? null;

async function openDocs(colorway: 'bone' | 'graphite', options?: OpenOptions) {
  await openPage(ROUTE, colorway, options);
  await userEvent.click(page.elementLocator(xray()).getByRole('button', { name: 'X-ray' }));
  await until(() => document.querySelector('#x-ray .xr .xr-card'));
  await settle();
}
const bench = () => document.querySelector<HTMLElement>('#x-ray .xr .xr-thumb .mu-lasso');
const style = (el: HTMLElement, prop: string) => el.style.getPropertyValue(prop);
const slider = (name: string) => role(card(), 'slider', name);
const specimen = () => $('.ed-specimen .mu-lasso', card());

for (const colorway of COLORWAYS) {
  test(`lasso cards hold the real lasso and no sliders in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of ['Box', 'Count', 'Touch', 'Timing']) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-lasso', card()).length).toBe(1);
      expect($$('.ed-specimen .ed-lasso-note', card())).toHaveLength(3);
      expect($$('.mu-slider, .xr-dial, .xr-dials, .mu-switcher', card())).toHaveLength(0);
    }
  });
}

test('box: the pointer corner sets width and height, the top line the line, on specimen and bench', async () => {
  await openDocs('bone');
  await part('Box');
  const w0 = value('Width'), h0 = value('Height');
  const sw = style(specimen(), 'width'), bw = style(bench()!, 'width'), bh = style(bench()!, 'height');
  await drag(slider('Box size'), 40, -30);
  await expect.poll(() => value('Width')).not.toBe(w0);
  await expect.poll(() => value('Height')).not.toBe(h0);
  expect(style(specimen(), 'width')).not.toBe(sw);
  expect(style(bench()!, 'width')).not.toBe(bw);
  expect(style(bench()!, 'height')).not.toBe(bh);

  const line0 = value('Line');
  const border0 = css(specimen(), 'border-top-width');
  const benchLine0 = style(bench()!, '--mu-presence-lasso-width');
  await drag(slider('Line'), 0, -20);
  await expect.poll(() => value('Line')).not.toBe(line0);
  expect(css(specimen(), 'border-top-width')).not.toBe(border0);
  expect(style(bench()!, '--mu-presence-lasso-width')).not.toBe(benchLine0);
  // back near its token it catches there, and the LED lights
  await drag(slider('Line'), 0, 19);
  await expect.poll(() => value('Line')).toBe(line0);
  await expect.poll(() => $('.mu-led', readout('Line')).getAttribute('data-kind')).toBe('live');
});

test('count: the count itself moves away from the box, on specimen and bench', async () => {
  await openDocs('bone');
  await part('Count');
  const count = () => $('.ed-specimen .presence-lasso-readout', card());
  expect($$('.ed-specimen .presence-lasso-readout', card())).toHaveLength(1);
  const gap0 = value('Gap');
  // measured from the box's bottom edge, so scrolling the handle into view does not count
  const below = () => { const c = count().getBoundingClientRect(), b = specimen().getBoundingClientRect(); return c.y - (b.y + b.height); };
  const gapPx0 = below();
  const bench0 = style(bench()!, '--mu-presence-readout-gap');
  await drag(slider('Gap'), 0, 12);
  await expect.poll(() => value('Gap')).not.toBe(gap0);
  expect(below()).toBeGreaterThan(gapPx0);
  expect(style(bench()!, '--mu-presence-readout-gap')).not.toBe(bench0);
});

test('touch: dragging the box over the notes changes what it touches, on specimen and bench', async () => {
  await openDocs('bone');
  await part('Touch');
  const touched0 = value('Touched');
  const left0 = value('Left');
  const bl = style(bench()!, 'left');
  // a little to the right: it keeps the first note and reaches the second
  await drag(slider('Box position'), 60, 0);
  await expect.poll(() => value('Left')).not.toBe(left0);
  expect(style(bench()!, 'left')).not.toBe(bl);
  await expect.poll(() => value('Touched')).not.toBe(touched0);
  const touched = Number(value('Touched'));
  await expect.poll(() => $$('.ed-lasso-note[data-touched]', card()).length).toBe(touched);
  // a count of none shows no count under the box
  if (touched === 0) await expect.poll(() => $$('.ed-specimen .presence-lasso-readout', card()).length).toBe(0);
});

test('timing: letting go fades the real lasso and clears the bench', async () => {
  await openDocs('bone');
  await part('Timing');
  expect(bench()).not.toBeNull();
  const still = () => page.elementLocator(card()).getByRole('switch', { name: 'Still dragging' });
  await userEvent.click(still());
  await expect.poll(() => still().element().getAttribute('aria-checked')).toBe('false');
  await expect.poll(bench).toBeNull();
  await expect.poll(() => $$('.ed-specimen .mu-lasso', card()).length).toBe(0);
  await userEvent.click(still());
  await expect.poll(() => $$('.ed-specimen .mu-lasso', card()).length).toBe(1);
});

test('readouts scrub by drag and arrows; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Box');
  const w0 = Number(value('Width'));
  await drag(readout('Width'), 0, -24);
  await expect.poll(() => value('Width')).not.toBe(String(w0));
  const w1 = Number(value('Width'));
  expect(w1).toBeGreaterThan(w0);
  readout('Width').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Width')).toBe(String(w1 - 5));
  slider('Line').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Line');
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('Line')).not.toBe(String(LINE));
});

test('narrow graphite card has no sideways scroll', async () => {
  await openDocs('graphite', { viewport: [375, 812] });
  for (const name of ['Box', 'Count', 'Touch', 'Timing']) {
    await part(name);
    await expect.poll(() => $$('.xr-card .ed-specimen .ed-lasso-page', xray()).length).toBe(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
  }
});
