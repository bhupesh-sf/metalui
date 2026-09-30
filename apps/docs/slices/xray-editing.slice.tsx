import { expect, test } from 'vitest';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, capture, mouse, openPage, pointer, until, userEvent } from './harness';

// The x-ray's editing layer: the card holds the real button (a specimen) to change by handling
// it, never a slider. Its handles, readouts and switches change the same model the bench draws.

// the button recipe: its padding at rest, and how far a press sinks it
const P = tokens.recipes.button.props;

const $ = (css: string, root: ParentNode = document) => root.querySelector<HTMLElement>(css)!;
const $$ = (css: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>(css)];
const withText = (css: string, text: string, root: ParentNode = document) => $$(css, root).find((e) => e.textContent!.toLowerCase().includes(text.toLowerCase()))!;
/** A real click at an element's centre, whatever is drawn over it (Playwright's `force`). */
const click = (el: Element) => pointer(el, [{ to: [0, 0] }, { down: true }, { up: true }]);
const hover = (el: Element) => pointer(el, [{ to: [0, 0] }]);
const css = (el: Element, prop: string) => getComputedStyle(el).getPropertyValue(prop);
const centre = (el: Element): [number, number] => { const b = el.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; };

async function openButtonXray(colorway: string) {
  await openPage('/overview', colorway as 'bone');
  await click(await until(() => document.querySelector('[data-float="button"] button')));
  await until(() => document.querySelector('.xr-overlay') && !document.documentElement.dataset.flight && !document.querySelector('.xr-flyer'));
  await Promise.all(card().getAnimations().map((a) => a.finished));
}
// Locators, like Playwright's: read fresh each time (the card is rebuilt for every part).
const xray = () => $('.xr-overlay');
const card = () => $('.xr-overlay .xr-card');
/** Picks a part; its card rises in (a spring), so handles are measured once it has come to rest. */
async function part(name: string) {
  await click($(`.xr-callout[aria-label^="${name}"]`, xray()));
  await Promise.all(card().getAnimations().map((a) => a.finished));
}
const readout = (label: string) => withText('.ed-readout', label, card())?.querySelector('.ed-roll > span:not(.is-out)')?.textContent?.trim();
/** A whole drag in one call (the page captures the pointer, and the capture ends with each WebDriver call). */
async function drag(target: Element, dx: number, dy: number) {
  const [x, y] = centre(target);
  await mouse.drag([x, y], [x + dx, y + dy], { steps: 10 });
}

for (const colorway of COLORWAYS) {
  test(`every part of the button x-ray is handled, not slid, in ${colorway}`, async () => {
    await openButtonXray(colorway);
    for (const name of ['Shape', 'Type', 'Light', 'Shadow', 'Press', 'Layers']) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-button', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial', card())).toHaveLength(0);
    }
    await part('Shape');
    await capture(`xray-editing-shape-${colorway}`, $('.xr', xray()));
  });
}

test('shape: the primary button has one size; padding and corners are handles the model follows', async () => {
  await openButtonXray('bone');
  // a primary button comes in one size, so its size is not a handle and does not scrub
  expect($$('.ed-edge.is-y', card())).toHaveLength(0);
  expect($$('.ed-readout[data-scrub]', card()).filter((e) => e.textContent!.toLowerCase().includes('size'))).toHaveLength(0);
  const face = $('.xr-face', xray());
  const width0 = parseFloat(face.style.width);
  // hover the button, then the right end: the hint tag says what it does, above the button
  await hover($('.ed-box', card()));
  await hover($('.ed-edge.is-x', card()));
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Padding');
  await drag($('.ed-edge.is-x', card()), 10, 0);
  await expect.poll(() => readout('padding')).not.toBe(String(P.self.pad));
  expect(parseFloat(face.style.width)).toBeGreaterThan(width0);
  // the corner arc squares the corners, on the specimen and the model alike
  await hover($('.ed-box', card()));
  await drag($('.ed-corner', card()), -40, -40);
  await expect.poll(() => readout('corners')).toBe('0');
  await expect.poll(() => css(face, 'border-radius')).toBe('0px');
});

test('readouts scrub: dragging one up steps its value, and the arrows do the same', async () => {
  await openButtonXray('bone');
  await part('Type');
  await drag(withText('.ed-readout', 'size', card()), 0, -24);
  await expect.poll(() => readout('size')).toBe('14');
  withText('.ed-readout', 'spacing', card()).focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => readout('spacing')).toBe('-0.010');
  await expect.poll(() => css($('.xr-label', xray()), 'font-weight')).toBe('500');
  await click(withText('.ed-readout', 'weight', card()));
  await expect.poll(() => css($('.xr-label', xray()), 'font-weight')).toBe('600');
});

test('light, shadow and press are handled on the specimen and felt on the model', async () => {
  await openButtonXray('bone');
  await part('Light');
  await drag($('.ed-sun', card()), 40, 10);
  await expect.poll(() => readout('from')).not.toBe('top');
  await part('Shadow');
  const cap = $('.xr-cap', xray());
  const z0 = cap.style.transform;
  await drag($('.ed-lift', card()), 0, -14);
  await expect.poll(() => readout('height')).not.toBe('1.0');
  expect(cap.style.transform).not.toBe(z0);
  await part('Press');
  const [x, y] = centre($('.ed-specimen .mu-button', card()));
  const done = mouse.drag([x, y], [x, y + 12], { steps: 6, hold: 1200 });
  // held: the model sinks with the specimen
  const t = css(cap, 'transform');
  await expect.poll(() => css(cap, 'transform'), { timeout: 1000 }).not.toBe(t);
  await done;
  await expect.poll(() => readout('sinks')).not.toBe(String(P.self.travel));
});

test('layers are switches: turning one off takes it off the model', async () => {
  await openButtonXray('bone');
  await part('Layers');
  await expect.poll(() => $$('.xr-shadow.is-drop', xray()).length).toBe(1);
  const drop = withText('.ed-layer', 'Drop', card());
  const toggle = $('[role="switch"]', drop);
  await click($('.mu-row-text', drop));
  await expect.poll(() => toggle.getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => $$('.xr-shadow.is-drop', xray()).length).toBe(0);
  await click(toggle);
  await expect.poll(() => $$('.xr-shadow.is-drop', xray()).length).toBe(1);
});


