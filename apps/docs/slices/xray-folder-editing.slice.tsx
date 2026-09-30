import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent } from './harness';

// The folder x-ray: every callout holds the real folder, handled, and the bench model follows.
const ROUTE = '/components/folder';
const SPOTS = ['Drop in', 'Paper', 'Fan', 'Flap', 'Glass', 'Layers'];
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
  await click($(`.xr-callout[aria-label^="${name}:"]`, xray()));
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
const folder = () => $('.ed-specimen .mu-folder', card());
const folderVar = (prop: string) => folder().style.getPropertyValue(prop);
const zoomOf = () => Number($('.ed-specimen > div', card()).style.zoom);

for (const colorway of COLORWAYS) {
  test(`each folder callout holds the real folder and no sliders in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of SPOTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-folder', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial, .xr-switch, .xr-proof', card())).toHaveLength(0);
    }
  });
}

test('dropping the block onto the folder puts it in, on the card and on the bench', async () => {
  await openDocs('bone');
  await part('Drop in');
  await expect.poll(() => value('Blocks')).toBe('3');
  const block = () => $('.ed-folder-block', card());
  // the card settles in below the bench: bring the whole well to the middle of the view first
  // (part() has already waited for the card to come to rest)
  $('.ed-specimen', card()).scrollIntoView({ block: 'center' });
  const [fx, fy] = centre(block()), [tx, ty] = centre(folder());
  const done = mouse.drag([fx, fy], [tx, ty], { steps: 12, hold: 1200 });
  // coming over, the folder opens wide
  await expect.poll(() => folder().getAttribute('data-open'), { timeout: 1000 }).not.toBeNull();
  await done;
  await expect.poll(() => value('Blocks')).toBe('4');
  await expect.poll(() => $('.mu-folder-count', folder()).textContent).toBe('4');
  await expect.poll(() => $('.xr-folder-count', xray()).textContent).toContain('4');
  // the keyboard puts one in too
  block().focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => value('Blocks')).toBe('5');
});

test('the tab leans toward the next paper and snaps there, never between', async () => {
  await openDocs('bone');
  await part('Paper');
  const tab = () => role(card(), 'slider', 'Colour');
  const hue = () => folder().getAttribute('data-hue');
  await expect.poll(() => tab().getAttribute('aria-valuetext')).toBe('Neutral');
  const zoom = zoomOf();
  // a nudge short of a step only leans
  await drag(tab(), 4 * zoom, 0, 10);
  expect(hue()).toBe('neutral');
  // a step's worth snaps to the next paper on the card and the bench
  await drag(tab(), 9 * zoom, 0, 10);
  expect(hue()).toBe('red');
  await expect.poll(() => tab().getAttribute('aria-valuetext')).toBe('Red');
  await expect.poll(() => $$('linearGradient[id^="xr-folder-red"]', xray()).length).toBe(1);
  // the readout steps it with the keyboard
  tab().focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(hue()).toBe('amber');
});

test('the front block raises the fan on the card and the bench, and the readout scrubs it', async () => {
  await openDocs('bone');
  await part('Fan');
  const front = () => role(card(), 'slider', 'Fan');
  const benchCard = () => $$('.xr-folder-card', xray()).at(-1)!;
  const rise0 = Number(front().getAttribute('aria-valuenow'));
  const bench0 = benchCard().style.transform;
  await drag(front(), 0, -30, 10);
  const rise = Number(front().getAttribute('aria-valuenow'));
  expect(rise).toBeGreaterThan(rise0);
  expect(folderVar('--mu-r-folder-fan-rest-y-front')).toBe(`${-rise}px`);
  expect(benchCard().style.transform).not.toBe(bench0);
  await expect.poll(() => value('Rise')).toBe(`${rise}`);
  // keyboard focus shows its tag; ↑ raises it one more
  front().focus();
  await expect.element(page.elementLocator(await until(() => document.querySelector('.ed-tag')))).toBeVisible();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => front().getAttribute('aria-valuenow')).toBe(`${Math.round((rise + 1) * 10) / 10}`);
});

test('the flap tips by its top edge and catches where it rests', async () => {
  await openDocs('bone');
  await part('Flap');
  const edge = () => role(card(), 'slider', 'Tilt');
  const rest = Number(edge().getAttribute('aria-valuenow'));
  await drag(edge(), 0, -24, 10);
  const tipped = Number(edge().getAttribute('aria-valuenow'));
  expect(tipped).toBeGreaterThan(rest);
  expect(folderVar('--mu-r-folder-flap-rest')).toBe(`${-tipped}deg`);
  // back to just short of rest (in the card's units): it catches there
  await drag(edge(), 0, ((tipped - rest - 1) / 0.8) * zoomOf(), 10);
  await expect.poll(() => edge().getAttribute('aria-valuenow')).toBe(`${rest}`);
});

test('a layer switched off leaves the folder', async () => {
  await openDocs('bone');
  await part('Layers');
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Blocks')));
  await expect.element(page.elementLocator($('.ed-specimen .folder-card', card()))).not.toBeVisible();
  await expect.element(page.elementLocator($('.xr-folder-card.is-off', xray()))).toBeVisible();
});

test('the folder on the home page opens its x-ray', async () => {
  // the landing page ('/') has no h1 for openPage to wait on: open the overview, then go home by its link
  await openPage('/overview', 'bone');
  await userEvent.click(page.getByRole('link', { name: 'MetalUI, home' }));
  await until(() => !document.querySelector('main') && document.querySelector('[data-float="folder"] .mu-folder'));
  // it drifts, so it is never still enough for a plain click
  await click($('[data-float="folder"] .mu-folder'));
  await expect.poll(() => document.querySelector('.xr-overlay .xr-card')?.textContent).toContain('Drop in');
});

for (const colorway of COLORWAYS) {
  test(`375 px ${colorway}: every folder card fits without sideways scroll`, async () => {
    await openDocs(colorway, { viewport: [375, 812] });
    for (const name of SPOTS) {
      await part(name);
      expect(document.documentElement.scrollWidth <= window.innerWidth + 1).toBe(true);
    }
  });
}
