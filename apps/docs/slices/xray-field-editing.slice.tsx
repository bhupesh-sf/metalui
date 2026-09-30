import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions } from './harness';

const ROUTE = '/components/field';
const CALLOUTS = ['Well', 'Type', 'Key', 'Shape', 'Light', 'Layers'];
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
const readout = (name: string) => withText('.ed-readout', name, card());
const value = (name: string) => readout(name)?.querySelector('.ed-roll > span:not(.is-out)')?.textContent ?? null;

async function openDocs(colorway: 'bone' | 'graphite', options?: OpenOptions) {
  await openPage(ROUTE, colorway, options);
  await userEvent.click(page.elementLocator(xray()).getByRole('button', { name: 'X-ray' }));
  await until(() => document.querySelector('#x-ray .xr .xr-card'));
  await settle();
}
const inline = (el: HTMLElement, property: string) => el.style.getPropertyValue(property);
const now = (handle: Element) => Number(handle.getAttribute('aria-valuenow'));
const field = () => $('.mu-field', card());
const flat = () => $('.xr-face.is-flat', xray());

for (const colorway of COLORWAYS) {
  test(`each field card holds one real field and no dials in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of CALLOUTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-field', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial, .mu-switcher', card())).toHaveLength(0);
    }
  });
}

test('well depth: the bottom edge deepens the field and the tray on the bench', async () => {
  await openDocs('bone');
  await part('Well');
  const handle = () => role(card(), 'slider', 'Well depth');
  const before = now(handle());
  const shadow = inline(field(), 'box-shadow');
  const bench = inline(flat(), 'box-shadow');
  const ring = inline($$('.xr-ring', xray()).at(-1)!, 'transform');
  await drag(handle(), 0, 20, 10);
  expect(now(handle())).toBeGreaterThan(before);
  expect(inline(field(), 'box-shadow')).not.toBe(shadow);
  expect(inline(flat(), 'box-shadow')).not.toBe(bench);
  expect(inline($$('.xr-ring', xray()).at(-1)!, 'transform')).not.toBe(ring);
  // dragged back near the recipe's depth it catches there, LED lit
  await drag(handle(), 0, -20, 10);
  await expect.poll(() => value('Well depth')).toBe(before.toFixed(1));
});

test('shape: height, corners and the space on the left change the field and the bench', async () => {
  await openDocs('bone');
  await part('Shape');

  const height = () => role(card(), 'slider', 'Height');
  const h0 = now(height());
  const benchH = inline(flat(), 'height');
  await drag(height(), 0, -12, 10);
  const h1 = now(height());
  expect(h1).toBeGreaterThan(h0);
  await expect.poll(() => css(field(), 'height')).toBe(`${h1}px`);
  expect(inline(flat(), 'height')).not.toBe(benchH);
  await expect.poll(() => $('.xr-dims text', xray()).textContent).toBe(`${h1}`);

  const corners = () => role(card(), 'slider', 'Corners');
  const r0 = now(corners());
  const benchR = inline(flat(), 'border-radius');
  await drag(corners(), -24, -24, 10);
  const r1 = now(corners());
  expect(r1).toBeLessThan(r0);
  await expect.poll(() => css(field(), 'border-top-left-radius')).toBe(`${r1}px`);
  expect(inline(flat(), 'border-radius')).not.toBe(benchR);

  const left = () => role(card(), 'slider', 'Space on the left');
  const p0 = now(left());
  const row = inline($('.xr-fieldrow', xray()), 'left');
  await drag(left(), 16, 0, 10);
  const p1 = now(left());
  expect(p1).toBeGreaterThan(p0);
  await expect.poll(() => css(field(), 'padding-left')).toBe(`${p1}px`);
  expect(inline($('.xr-fieldrow', xray()), 'left')).not.toBe(row);
});

test('type and key: typing and the switches show on the bench', async () => {
  await openDocs('bone');
  await part('Type');
  await userEvent.fill(page.elementLocator(role(card(), 'textbox', 'Lens or action')), 'Inbox');
  await expect.poll(() => $('.xr-fieldrow', xray()).textContent).toContain('Inbox');
  expect($$('.xr-caret', xray())).toHaveLength(1);
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Caret')));
  await expect.poll(() => $$('.xr-caret', xray()).length).toBe(0);
  await expect.poll(() => css(role(card(), 'textbox', 'Lens or action'), 'caret-color')).toBe('rgba(0, 0, 0, 0)');
  await part('Key');
  expect($$('.ed-specimen .mu-kbd', card())).toHaveLength(1);
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Raised key')));
  await expect.poll(() => $$('.ed-specimen .mu-kbd', card()).length).toBe(0);
  await expect.poll(() => $$('.xr-seglabel', xray()).filter((e) => e.textContent!.includes('⌘K')).length).toBe(1);
});

test('light: the sun turns the light on the field and the bench', async () => {
  await openDocs('bone');
  await part('Light');
  const fill = inline(field(), 'background');
  const bench = inline(flat(), 'background');
  await drag(role(card(), 'slider', 'Light'), 30, 6, 10);
  expect(inline(field(), 'background')).not.toBe(fill);
  expect(inline(flat(), 'background')).not.toBe(bench);
});

test('layers: each switch lights its slice on the bench and removes it from both', async () => {
  await openDocs('bone');
  await part('Layers');
  for (const name of ['Tray fill', 'Inner shadow', 'Key fill', 'Drop']) {
    const row = () => withText('.ed-layer', name, card());
    const toggle = () => $('[role="switch"]', row());
    const look = () => $$('.mu-field, .mu-kbd', $('.ed-specimen', card())).map((x) => `${x.style.background}|${x.style.boxShadow}`).join(';');
    const before = look();
    await hover(row());
    await expect.poll(() => $$('.xr-face.is-layer.is-focus', xray()).length).toBe(1);
    await userEvent.click(page.elementLocator(toggle()));
    await expect.poll(() => toggle().getAttribute('aria-checked')).toBe('false');
    expect(look()).not.toBe(before);
    await expect.poll(() => $$('.xr-face.is-layer.is-off', xray()).length).toBe(1);
    await userEvent.click(page.elementLocator(toggle()));
  }
});

test('readouts scrub by drag and arrow keys; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Shape');
  const before = value('Space on the left');
  await drag(readout('Space on the left'), 0, -24, 10);
  const after = value('Space on the left');
  expect(after).not.toBe(before);
  await expect.poll(() => css(field(), 'padding-left')).toBe(`${after}px`);
  readout('Space on the left').focus(); await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Space on the left')).toBe(`${Number(after) - 1}`);
  const height = () => role(card(), 'slider', 'Height');
  const h0 = now(height());
  height().focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Height');
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('Height')).toBe(`${h0 + 1}`);
});

test('375 px graphite field cards have no sideways scroll', async () => {
  await openDocs('graphite', { viewport: [375, 812] });
  for (const name of CALLOUTS) {
    await part(name);
    await expect.poll(() => $$('.xr-card .ed-specimen .mu-field', xray()).length).toBe(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
  }
});
