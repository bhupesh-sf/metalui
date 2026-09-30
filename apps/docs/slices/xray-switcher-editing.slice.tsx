import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent } from './harness';

const ROUTE = '/components/switcher';
// the recipe's values at rest: the space around the thumb and beside each word, the compact
// height, and the part spring the thumb slides on
const R = tokens.recipes.switcher.props;
const SPRING = tokens.springs.part;
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
const flat = () => $('.xr-face.is-flat', xray());
/**
 * A whole-pixel point of an element that nothing else covers, with a margin (the mouse lands on whole
 * pixels), found on a small grid over it.
 */
function onTop(el: Element): [number, number] {
  const r = el.getBoundingClientRect();
  const mine = (x: number, y: number) => el.contains(document.elementFromPoint(x, y));
  for (const fy of [0.5, 0.3, 0.7]) for (const fx of [0.5, 0.3, 0.7, 0.15, 0.85]) {
    const x = Math.round(r.x + r.width * fx), y = Math.round(r.y + r.height * fy);
    if ([-2, 0, 2].every((d) => mine(x + d, y) && mine(x, y + d))) return [x, y];
  }
  throw new Error('the option is covered everywhere');
}

for (const colorway of COLORWAYS) {
  test(`switcher cards hold one real specimen in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of ['Shape', 'Well', 'Thumb', 'Slide', 'Light', 'Layers']) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-switcher', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial', card())).toHaveLength(0);
      expect($$('.ed-specimen .mu-switcher-option', card())).toHaveLength(3);
    }
  });
}

test('thumb leans toward an option and snaps there; clicking another option still picks it', async () => {
  await openDocs('bone');
  const thumb = () => slider('Option');
  const pressed = () => $('.xr-seglabel[aria-pressed="true"]', xray()).textContent;
  // it starts on Week; a small nudge only leans, it never picks
  await expect.poll(() => thumb().getAttribute('aria-valuetext')).toBe('Week');
  await drag(thumb(), 7, 0);
  await expect.poll(() => thumb().getAttribute('aria-valuetext')).toBe('Week');
  // far enough, it snaps to the next option, never between
  await drag(thumb(), 35, 0);
  await expect.poll(() => thumb().getAttribute('aria-valuetext')).toBe('Month');
  await expect.poll(() => $('.mu-switcher-option[aria-checked="true"]', card()).textContent).toBe('Month');
  await expect.poll(pressed).toBe('Month');
  await userEvent.click(page.elementLocator($('.mu-switcher-option', card())));
  await expect.poll(pressed).toBe('Day');
});

test('shape, well, thumb, spring and light handles change specimen and bench', async () => {
  await openDocs('bone');
  await part('Shape');
  const width = flat().style.width;
  await drag(slider('Space around the thumb'), 12, 0);
  await expect.poll(() => value('Space around the thumb')).not.toBe(String(R.self.pad));
  expect(flat().style.width).not.toBe(width);
  const specimenWidth = $('.mu-switcher', card()).getBoundingClientRect().width;
  await drag(slider('Space beside each word'), 12, 0);
  await expect.poll(() => value('Space beside each word')).not.toBe(String(R.option['pad-x']));
  expect($('.mu-switcher', card()).getBoundingClientRect().width).toBeGreaterThan(specimenWidth);
  await drag(slider('Size'), 0, 17);
  await expect.poll(() => $('.mu-switcher', card()).getAttribute('data-size')).toBe('compact');
  await expect.poll(() => value('Size')).toBe(String(R.option.height));
  await part('Well');
  const ring = () => $$('.xr-ring', xray()).at(-1)!;
  const z = ring().style.transform;
  await drag(slider('Well depth'), 0, 14);
  expect(ring().style.transform).not.toBe(z);
  await part('Thumb');
  const lastFace = () => $$('.xr-face', xray()).at(-1)!;
  const shadow = lastFace().style.boxShadow;
  await drag(slider('Thumb lift'), 0, -14);
  expect(lastFace().style.boxShadow).not.toBe(shadow);
  await part('Slide');
  const transition = $('.xr-thumb', xray()).style.transition;
  await drag(slider('Stiffness'), 24, 0);
  await expect.poll(() => value('Stiffness')).not.toBe(String(SPRING.stiffness));
  expect($('.xr-thumb', xray()).style.transition).not.toBe(transition);
  await drag(slider('Damping'), 0, 16);
  await expect.poll(() => value('Damping')).not.toBe(String(SPRING.damping));
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'No animation')));
  await expect.poll(() => $$('.ed-switcher[data-instant]', card()).length).toBe(1);
  await part('Light');
  const fill = flat().style.background;
  await drag(slider('Light'), 30, 4);
  expect(flat().style.background).not.toBe(fill);
});

test('layer switches remove the same layer from specimen and bench', async () => {
  await openDocs('bone');
  await part('Layers');
  const thumb = () => $('.mu-switcher-thumb', card());
  const shadow = css(thumb(), 'box-shadow');
  const drop = () => role(card(), 'switch', 'Drop');
  await userEvent.click(page.elementLocator(drop()));
  await expect.poll(() => drop().getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => $$('.xr-shadow.is-drop', xray()).length).toBe(0);
  expect(css(thumb(), 'box-shadow')).not.toBe(shadow);
});

test('readouts scrub and arrow keys step; focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Shape');
  await drag(readout('Space beside each word'), 0, -24);
  await expect.poll(() => value('Space beside each word')).not.toBe(String(R.option['pad-x']));
  readout('Space beside each word').focus();
  await userEvent.keyboard('{ArrowDown}');
  slider('Size').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Size');
});

test('floating table opens switcher x-ray; narrow graphite card has no sideways scroll', async () => {
  await openPage('/overview', 'graphite', { viewport: [375, 812] });
  const option = await until(() => document.querySelector('[data-float="seg"] .mu-switcher-option'));
  // The table drifts on CSS animations, and at 375 px its objects pass over one another (the
  // tooltip drifts across the switcher), so a click at a moving target lands on whatever is on top
  // at that moment: that was the flake. Stop the table's clock at its start, as page.clock would for
  // CSS time, and click the part of the option that is on top there.
  for (const a of document.getAnimations()) if ((a as CSSAnimation).animationName === 'drift') { a.pause(); a.currentTime = 0; }
  inView(option);
  await mouse.move(...onTop(option));
  await mouse.down();
  await mouse.up();
  await expect.poll(() => $$('.xr-overlay .xr-card .ed-specimen .mu-switcher').length).toBe(1);
  // measured once the flight has landed and the card has come to rest: the flying copy and the
  // card rising in are passing states, not the page's width
  await until(() => !document.documentElement.dataset.flight && !document.querySelector('.xr-flyer'));
  await Promise.all($('.xr-overlay .xr-card').getAnimations().map((a) => a.finished));
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
});
