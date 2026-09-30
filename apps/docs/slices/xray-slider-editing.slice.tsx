import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions } from './harness';

// The slider x-ray's editing layer: every card holds the real slider (a specimen) to change by
// handling it: its knob, its rims, the groove's bottom edge, a sun, switches. No control panel.
// The only slider in a card is the specimen itself, the component the x-ray is about.

const ROUTE = '/components/slider';
// where the knob's metal shine starts, in degrees: the conic gradient in the slider recipe's knob background
const SHINE_FROM = Number(tokens.recipes.slider.layers.find((l) => l.part === 'knob' && l.prop === 'background')!.value.match(/from\s+([\d.]+)deg/)?.[1] ?? 0);
const PARTS = ['Knob', 'Track', 'Move', 'Marks', 'Light', 'Layers'];
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
const along = (k: number): At => (b) => b.x + b.width * k;
const knob = () => $('.mu-slider-knob', card());

// on the bench: the groove is the first flat face, the knob the last raised part
const benchGroove = () => $('.xr-scene .xr-face.is-flat', xray());
const benchKnob = () => $$('.xr-thumb', xray()).at(-1)!;
const benchKnobFace = () => $('.xr-face', benchKnob());

for (const colorway of COLORWAYS) {
  test(`every slider card holds one real specimen and no control panel, in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of PARTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-slider', card()).length).toBe(1);
      expect($$('.mu-slider', card())).toHaveLength(1);
      expect($$('.xr-dial, .xr-dials, .mu-switcher', card())).toHaveLength(0);
    }
  });
}

test('knob: dragging the knob sideways turns its shine on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Knob');
  const start = value('Shine');
  const bench = style(benchKnobFace(), 'background');
  const metal = css(knob(), 'background-image');
  await drag(slider('Shine'), 30, 0);
  await expect.poll(() => value('Shine')).not.toBe(start);
  expect(style(benchKnobFace(), 'background')).not.toBe(bench);
  expect(css(knob(), 'background-image')).not.toBe(metal);
});

test('track: dragging the bottom edge down deepens the groove on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Track');
  const start = Number(value('Depth'));
  const bench = style(benchGroove(), 'box-shadow');
  const groove = () => $('.mu-slider-track', card());
  const shadow = css(groove(), 'box-shadow');
  await drag(slider('Depth'), 0, 16, 8, along(0.15));
  expect(Number(value('Depth'))).toBeGreaterThan(start);
  expect(style(benchGroove(), 'box-shadow')).not.toBe(bench);
  await expect.poll(() => css(groove(), 'box-shadow')).not.toBe(shadow);
});

test('move: the rims tune the spring the knob rides on the specimen and the bench; the knob still moves the value', async () => {
  await openDocs('bone');
  await part('Move');
  const benchMove = style(benchKnob(), 'transition');
  const knobMove = css(knob(), 'transition');
  const k0 = Number(value('Stiffness'));
  await drag(slider('Stiffness'), 24, 0);
  expect(Number(value('Stiffness'))).toBeGreaterThan(k0);
  expect(style(benchKnob(), 'transition')).not.toBe(benchMove);
  expect(css(knob(), 'transition')).not.toBe(knobMove);
  const c0 = Number(value('Damping'));
  const benchMove2 = style(benchKnob(), 'transition');
  await drag(slider('Damping'), 0, 16);
  expect(Number(value('Damping'))).toBeGreaterThan(c0);
  expect(style(benchKnob(), 'transition')).not.toBe(benchMove2);
  // the knob itself is still the slider: dragging its middle moves the value, and the bench knob with it
  const v0 = value('Value');
  const at = style(benchKnob(), 'transform');
  await drag(knob(), -60, 0);
  await expect.poll(() => value('Value')).not.toBe(v0);
  expect(style(benchKnob(), 'transform')).not.toBe(at);
});

test('marks: switches take the marks and the ticks off the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Marks');
  const flat = () => $$('.xr-scene .xr-face.is-flat', xray()).length;
  const flat0 = flat();
  expect($$('.mu-slider-marks', card())).toHaveLength(1);
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Marks in the track')));
  await expect.poll(() => $$('.mu-slider-marks', card()).length).toBe(0);
  await expect.poll(flat).toBe(flat0 - 4);
  const labels = () => $$('.xr-scene .eng', xray()).length;
  const labels0 = labels();
  await click($('.mu-row-text', withText('.ed-layer', 'Ticks and labels', card())));
  await expect.poll(() => role(card(), 'switch', 'Ticks and labels').getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => $$('.mu-slider-ticks', card()).length).toBe(0);
  await expect.poll(labels).toBe(labels0 - 5);
});

test('light: dragging the sun moves the light on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Light');
  const bench = style(benchGroove(), 'background');
  const shadow = css(knob(), 'box-shadow');
  await drag(slider('Light'), 30, 4);
  await expect.poll(() => value('From')).not.toBe('top');
  expect(style(benchGroove(), 'background')).not.toBe(bench);
  expect(css(knob(), 'box-shadow')).not.toBe(shadow);
});

test('layers: a switch takes its layer off the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Layers');
  expect(css(knob(), 'background-image')).toContain('conic-gradient');
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Metal')));
  await expect.poll(() => role(card(), 'switch', 'Metal').getAttribute('aria-checked')).toBe('false');
  expect(css(knob(), 'background-image')).toBe('none');
  // the bench is exploded into its layers here: the switched-off slice is marked off
  await expect.poll(() => $$('.xr-face.is-layer.is-off', xray()).length).toBe(1);
  expect($('.xr-face.is-layer.is-off', xray()).textContent).toContain('Metal');
  // hovering a row points at its slice on the bench
  await hover(withText('.ed-layer', 'Inner ring', card()));
  await expect.poll(() => document.querySelector('#x-ray .xr .xr-face.is-layer.is-focus')?.textContent).toContain('Inner ring');
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Green fill')));
  expect(css($('.mu-slider-fill', card()), 'background-image')).toBe('none');
});

test('readouts scrub by drag and by arrows; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Move');
  const k0 = Number(value('Stiffness'));
  await drag(readout('Stiffness'), 0, -24);
  await expect.poll(() => value('Stiffness')).toBe(String(k0 + 30));
  const c0 = Number(value('Damping'));
  readout('Damping').focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('Damping')).toBe(String(c0 + 1));
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Damping')).toBe(String(c0));
  slider('Stiffness').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Stiffness');
  await part('Knob');
  // clicking a readout hands its handle the keyboard, with the hint showing
  await userEvent.click(page.elementLocator(readout('Shine')));
  await expect.poll(() => document.activeElement).toBe(slider('Shine'));
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Shine');
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => value('Shine')).not.toBe(String(SHINE_FROM));
});

test('at 375 px wide in graphite, every card fits with no sideways scroll', async () => {
  await openDocs('graphite', { viewport: [375, 812] });
  for (const name of PARTS) {
    await part(name);
    await expect.poll(() => $$('.ed-specimen .mu-slider', card()).length).toBe(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
  }
  await part('Track');
  const start = Number(value('Depth'));
  await drag(slider('Depth'), 0, 16, 8, along(0.15));
  expect(Number(value('Depth'))).toBeGreaterThan(start);
});
