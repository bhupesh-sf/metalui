import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent } from './harness';

const recipe = tokens.recipes.checkbox;
const sizes = [Number(recipe.props.row.size), Number(recipe.props.self.size)];

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
const value = (name: string) => withText('.ed-readout', name, card())?.querySelector('.ed-roll > span:not(.is-out)')?.textContent;

async function openDocs(colorway: 'bone' | 'graphite', options?: OpenOptions) {
  await openPage('/components/checkbox', colorway, options);
  await userEvent.click(page.elementLocator(xray()).getByRole('button', { name: 'X-ray' }));
  await until(() => document.querySelector('#x-ray .xr .xr-card'));
  await settle();
}

for (const colorway of COLORWAYS) {
  test(`every checkbox card holds the real component without old controls in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of ['States', 'Tick', 'Shape', 'Well', 'Light', 'Layers']) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-dimple', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial, .mu-switcher', card())).toHaveLength(0);
    }
  });
}

test('state and size handles lean, then snap to real options on specimen and bench', async () => {
  await openDocs('bone');
  const state = () => role(card(), 'slider', 'State');
  const options = ['Rest', 'Hover', 'Done', 'Doing', 'Suggested'];
  const before = state().getAttribute('aria-valuetext');
  expect(options).toContain(before);
  const fill = $('.xr-face', xray()).style.background;
  const specimenFill = css($('.mu-dimple', card()), 'background-image');
  await drag(state(), 0, 6);
  await expect.poll(() => state().getAttribute('aria-valuetext')).toBe(before);
  await drag(state(), 0, 19);
  const after = state().getAttribute('aria-valuetext');
  expect(options).toContain(after);
  expect(after).not.toBe(before);
  expect($('.xr-face', xray()).style.background).not.toBe(fill);
  expect(css($('.mu-dimple', card()), 'background-image')).not.toBe(specimenFill);

  await part('Shape');
  const size = () => role(card(), 'slider', 'Size');
  const initialSize = Number(size().getAttribute('aria-valuenow'));
  expect(sizes).toContain(initialSize);
  const benchWidth = $('.xr-scene', xray()).style.width;
  await drag(size(), 0, initialSize === sizes[1] ? 19 : -19);
  const nextSize = Number(size().getAttribute('aria-valuenow'));
  expect(sizes).toContain(nextSize);
  expect(nextSize).not.toBe(initialSize);
  await expect.poll(() => css($('.mu-dimple', card()), 'width')).toBe(`${nextSize}px`);
  expect($('.xr-scene', xray()).style.width).not.toBe(benchWidth);
});

test('corners, tick, depth and light handles change specimen and bench', async () => {
  await openDocs('bone');
  await part('Shape');
  const specimen = () => $('.mu-dimple', card());
  const corner0 = css(specimen(), 'border-radius');
  const benchCorner0 = css($('.xr-face', xray()), 'border-radius');
  await drag(role(card(), 'slider', 'Corners'), -12, -12);
  await expect.poll(() => css(specimen(), 'border-radius')).not.toBe(corner0);
  expect(css($('.xr-face', xray()), 'border-radius')).not.toBe(benchCorner0);

  await part('Tick');
  const angle = () => role(card(), 'slider', 'Tick angle');
  const oldAngle = Number(angle().getAttribute('aria-valuenow'));
  const oldTick = $('.xr-tick', xray()).style.transform;
  const oldSpecimenTick = css($('.mu-dimple-tick', card()), 'transform');
  await drag(angle(), 18, 0);
  expect(Number(angle().getAttribute('aria-valuenow'))).not.toBe(oldAngle);
  expect($('.xr-tick', xray()).style.transform).not.toBe(oldTick);
  expect(css($('.mu-dimple-tick', card()), 'transform')).not.toBe(oldSpecimenTick);

  await part('Well');
  const wellShadow = css($('.mu-dimple', card()), 'box-shadow');
  const benchShadow = $('.xr-face', xray()).style.boxShadow;
  await drag(role(card(), 'slider', 'Well depth'), 0, 18);
  expect(css($('.mu-dimple', card()), 'box-shadow')).not.toBe(wellShadow);
  expect($('.xr-face', xray()).style.boxShadow).not.toBe(benchShadow);

  await part('Light');
  const lightFill = $('.xr-face', xray()).style.background;
  const specimenFill = css($('.mu-dimple', card()), 'background-image');
  await drag(role(card(), 'slider', 'Light'), 28, 3);
  expect($('.xr-face', xray()).style.background).not.toBe(lightFill);
  expect(css($('.mu-dimple', card()), 'background-image')).not.toBe(specimenFill);
});

test('readout scrubs by drag and arrows; focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Shape');
  const readout = () => withText('.ed-readout', 'Corners', card());
  const initial = value('Corners');
  await drag(readout(), 0, -24);
  expect(value('Corners')).not.toBe(initial);
  const afterDrag = value('Corners');
  readout().focus();
  await userEvent.keyboard('{ArrowDown}');
  expect(value('Corners')).not.toBe(afterDrag);
  role(card(), 'slider', 'Corners').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Corners');
});

test('layer switch removes same layer from specimen and bench', async () => {
  await openDocs('bone');
  await part('Layers');
  const specimenShadow = css($('.mu-dimple', card()), 'box-shadow');
  const layer = () => role(card(), 'switch', 'Inner shadow');
  await hover(layer());
  await expect.poll(() => $$('.xr-face.is-layer.is-focus', xray()).length).toBe(1);
  await userEvent.click(page.elementLocator(layer()));
  await expect.poll(() => layer().getAttribute('aria-checked')).toBe('false');
  expect(css($('.mu-dimple', card()), 'box-shadow')).not.toBe(specimenShadow);
  await expect.poll(() => $$('.xr-face.is-layer', xray())[1].className).toMatch(/is-off/);
});

test('narrow graphite card fits without sideways scroll', async () => {
  await openDocs('graphite', { viewport: [375, 812] });
  for (const name of ['States', 'Tick', 'Shape', 'Well', 'Light', 'Layers']) {
    await part(name);
    await expect.poll(() => $$('.xr-card .ed-specimen .mu-dimple', xray()).length).toBe(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
  }
});
