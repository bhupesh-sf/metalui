import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent } from './harness';

const ROUTE = '/components/menu';
const CALLOUTS = ['Rows', 'Heading', 'Line', 'Glass', 'Shape', 'Layers'];
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
const inline = (el: HTMLElement, prop: string) => el.style.getPropertyValue(prop);
const slider = (name: string) => role(card(), 'slider', name);
const toggle = (name: string) => userEvent.click(page.elementLocator(role(card(), 'switch', name)));
const menu = () => $('.ed-specimen .mu-menu', card());
const tag = () => document.querySelector('.ed-tag')?.textContent;

for (const colorway of COLORWAYS) {
  test(`menu cards hold one real plate and no sliders in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of CALLOUTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-menu', card()).length).toBe(1);
      expect($$('.ed-specimen .mu-menu-row', card())).toHaveLength(3);
      expect($$('.mu-slider, .xr-dial, .mu-switcher', card())).toHaveLength(0);
    }
  });
}

test('the lit row leans toward the next row, then snaps there; specimen and bench agree', async () => {
  await openDocs('bone');
  await part('Rows');
  const labels = $$('.ed-specimen .mu-menu-label', card()).map((e) => e.textContent);
  const lit = () => slider('Lit row');
  const start = lit().getAttribute('aria-valuetext')!;
  expect(labels).toContain(start);
  const next = labels[labels.indexOf(start) + 1]!;

  // held part way: the next row is outlined, nothing has moved yet. Watched in the page, every frame until
  // the hand lets go: a busy machine only makes it take longer, never miss it.
  let leaned = false, watching = true, frame = 0;
  const look = () => {
    try {
      if ($$('.ed-menu-lean', card()).length === 1 && tag()?.includes(`→ ${next}`) && lit().getAttribute('aria-valuetext') === start) leaned = true;
    } catch { /* the card is between two builds */ }
    if (watching) frame = requestAnimationFrame(look);
  };
  addEventListener('pointerup', () => { watching = false; cancelAnimationFrame(frame); }, { capture: true, once: true });
  look();
  const held = hold(lit(), 0, 7, 4, 600);
  await held;
  expect(leaned, 'held: the next row is outlined, the hint points at it, the lit row has not moved').toBe(true);
  await expect.poll(() => lit().getAttribute('aria-valuetext')).toBe(start);
  await expect.poll(() => $$('.ed-menu-lean', card()).length).toBe(0);

  // far enough, it snaps onto the next row: always one of the rows, never between
  await drag(lit(), 0, 20);
  await expect.poll(() => lit().getAttribute('aria-valuetext')).toBe(next);
  await expect.poll(() => $('.ed-specimen .mu-menu-row[data-highlighted] .mu-menu-label', card()).textContent).toBe(next);
  await expect.poll(() => $('.xr-menurow[data-lit]', xray()).textContent).toContain(next);

  // the arrow keys move the same light; the readout says which row
  lit().focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => lit().getAttribute('aria-valuetext')).toBe(start);
  await expect.poll(() => value('Lit row')).toBe(start);
});

test('glass and shape handles change the specimen and the bench, and catch on their tokens', async () => {
  await openDocs('bone');
  const plateOnBench = () => $('.xr-thumb:has(.xr-menuface)', xray());

  await part('Glass');
  const gap0 = value('Gap to the button');
  const where0 = inline(plateOnBench(), 'transform');
  const margin0 = inline($('.ed-box.ed-menu', card()), 'margin-top');
  await drag(slider('Gap to the button'), 0, 24);
  await expect.poll(() => value('Gap to the button')).not.toBe(gap0);
  expect(inline($('.ed-box.ed-menu', card()), 'margin-top')).not.toBe(margin0);
  expect(inline(plateOnBench(), 'transform')).not.toBe(where0);
  // dragging back to where it started lands on the token: the LED lights
  await drag(slider('Gap to the button'), 0, -24);
  await expect.poll(() => value('Gap to the button')).toBe(gap0);
  await expect.poll(() => readout('Gap to the button').getAttribute('aria-label')).toMatch(/menu token/);

  await part('Shape');
  const pad0 = value('Space around the rows');
  const benchPad0 = inline($('.xr-menuface', xray()), 'padding');
  const specimenPad0 = css(menu(), 'padding-top');
  await drag(slider('Space around the rows'), 12, 0);
  await expect.poll(() => value('Space around the rows')).not.toBe(pad0);
  expect(css(menu(), 'padding-top')).not.toBe(specimenPad0);
  expect(inline($('.xr-menuface', xray()), 'padding')).not.toBe(benchPad0);

  const r0 = value('Row corners');
  const benchR0 = inline($('.xr-menurow', xray()), 'border-radius');
  const specimenR0 = css($('.ed-specimen .mu-menu-row', card()), 'border-top-left-radius');
  await drag(slider('Row corners'), 5, 5);
  await expect.poll(() => value('Row corners')).not.toBe(r0);
  expect(css($('.ed-specimen .mu-menu-row', card()), 'border-top-left-radius')).not.toBe(specimenR0);
  expect(inline($('.xr-menurow', xray()), 'border-radius')).not.toBe(benchR0);

  // the plate's corners follow the rows; switched off they go back to the plate's own
  const plateR = value('Plate corners');
  await toggle('Plate corners follow the rows');
  await expect.poll(() => value('Plate corners')).not.toBe(plateR);
});

test('heading, line and layer switches change the specimen and the bench', async () => {
  await openDocs('graphite');
  await part('Heading');
  expect($$('.xr-menuhead', xray())).toHaveLength(1);
  await toggle('Heading');
  await expect.poll(() => $$('.ed-specimen .mu-menu-heading', card()).length).toBe(0);
  await expect.poll(() => $$('.xr-menuhead', xray()).length).toBe(0);

  await part('Line');
  expect($$('.xr-menusep', xray())).toHaveLength(1);
  await toggle('Line');
  await expect.poll(() => $$('.ed-specimen .mu-menu-sep', card()).length).toBe(0);
  await expect.poll(() => $$('.xr-menusep', xray()).length).toBe(0);

  await part('Layers');
  const shadow = css(menu(), 'box-shadow');
  await hover(withText('.ed-layer', 'Rim', card()));
  await expect.poll(() => document.querySelector('#x-ray .xr .xr-face.is-layer.is-focus')?.textContent).toContain('Rim');
  await toggle('Rim');
  await expect.poll(() => role(card(), 'switch', 'Rim').getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => document.querySelector('#x-ray .xr .xr-face.is-layer.is-off')?.textContent).toContain('Rim');
  expect(css(menu(), 'box-shadow')).not.toBe(shadow);
});

test('readouts scrub by drag and by arrow keys; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Shape');
  const pad0 = Number(value('Space around the rows'));
  await drag(readout('Space around the rows'), 0, -24);
  await expect.poll(() => value('Space around the rows')).toBe(`${pad0 + 1.5}`);
  readout('Space around the rows').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Space around the rows')).toBe(`${pad0 + 1}`);

  await part('Rows');
  const lit0 = value('Lit row')!;
  readout('Lit row').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Lit row')).not.toBe(lit0);
  await expect.poll(() => $('.xr-menurow[data-lit]', xray()).textContent).not.toContain(lit0);

  // reached by the keyboard (from its readout, back one stop), the handle shows its tag
  readout('Lit row').focus();
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  await expect.poll(() => document.activeElement).toBe(slider('Lit row'));
  await expect.poll(tag).toContain('Lit row');
  await part('Glass');
  readout('Gap to the button').focus();
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  await expect.poll(() => document.activeElement).toBe(slider('Gap to the button'));
  await expect.poll(tag).toContain('Gap to the button');
});

for (const colorway of COLORWAYS) {
  test(`at 375 px wide in ${colorway}, no menu card scrolls sideways`, async () => {
    await openDocs(colorway, { viewport: [375, 812] });
    for (const name of CALLOUTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-menu', card()).length).toBe(1);
      // the page around it has its own wide pieces (the SwiftUI capture, code blocks); the card must add none
      expect(card().scrollWidth <= card().clientWidth).toBe(true);
      for (const piece of [card(), $('.ed-specimen', card()), menu()]) {
        const box = piece.getBoundingClientRect();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(375);
      }
    }
  });
}
