import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent } from './harness';

const ROUTE = '/components/link-card';
const SPOTS = ['Bezel', 'Screen', 'Type', 'Open', 'Shape', 'Layers'];
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
const specimen = () => $('.mu-linkcard', card());
const inline = (el: HTMLElement, prop: string) => el.style.getPropertyValue(prop);
const slider = (name: string) => role(card(), 'slider', name);
const toggle = (name: string) => userEvent.click(page.elementLocator(role(card(), 'switch', name)));
const screen = () => $('.xr-linkscreen', xray());
const zoomOf = () => Number($('.ed-specimen > div', card()).style.zoom);

for (const colorway of COLORWAYS) {
  test(`each link card callout holds the real card and no sliders in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of SPOTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-linkcard', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial, .xr-switch, .xr-proof', card())).toHaveLength(0);
    }
  });
}

test('the frame side sets the frame width on the card and the bench, catching on its token', async () => {
  await openDocs('bone');
  await part('Bezel');
  const handle = () => slider('Frame width');
  const start = Number(handle().getAttribute('aria-valuenow'));
  const pad0 = css(specimen(), 'padding-left');
  const left0 = inline(screen(), 'left');
  // dragging in makes the frame thicker
  await drag(handle(), -12, 0, 10);
  const now = Number(handle().getAttribute('aria-valuenow'));
  expect(now).toBeGreaterThan(start);
  expect(css(specimen(), 'padding-left')).not.toBe(pad0);
  expect(inline(screen(), 'left')).not.toBe(left0);
  await expect.poll(() => value('Frame width')).toBe(`${now}`);
  // and back out to just short of it (drags are read in the card's units, so scale by its zoom): it catches on the token
  await drag(handle(), (now - start - 0.3) * zoomOf(), 0, 10);
  await expect.poll(() => handle().getAttribute('aria-valuenow')).toBe(`${start}`);
});

test('the glow leans toward the next site and snaps there, never between', async () => {
  await openDocs('bone');
  await part('Screen');
  const glow = () => slider('Site');
  const host = () => $('.mu-linkcard-host', card()).textContent;
  const first = glow().getAttribute('aria-valuetext');
  await expect.poll(host).toBe(first);
  const bg0 = inline(screen(), 'background');
  // a small nudge only leans
  await drag(glow(), 6, 0, 10);
  await expect.poll(() => glow().getAttribute('aria-valuetext')).toBe(first);
  expect(host()).toBe(first);
  // far enough, it snaps to the next site on both the card and the bench
  await drag(glow(), 24, 0, 10);
  const next = glow().getAttribute('aria-valuetext');
  expect(next).not.toBe(first);
  await expect.poll(host).toBe(next);
  await expect.poll(() => $('.xr-linkscreen b', xray()).textContent).toBe(next);
  expect(inline(screen(), 'background')).not.toBe(bg0);
  // the glare switch removes the glare from both
  const bench = inline(screen(), 'background');
  await toggle('Glare');
  await expect.poll(() => role(card(), 'switch', 'Glare').getAttribute('aria-checked')).toBe('false');
  expect(inline(screen(), 'background')).not.toBe(bench);
  expect(inline(specimen(), '--mu-r-glass-face-glare-background')).not.toContain('115deg');
});

test('the words set their size and spacing on the card and the bench', async () => {
  await openDocs('graphite');
  await part('Type');
  const size0 = css($('.mu-linkcard-host', card()), 'font-size');
  const bench0 = inline($('.xr-linkscreen b', xray()), 'font');
  await drag(slider("Site's name size and spacing"), 0, -15, 10);
  expect(css($('.mu-linkcard-host', card()), 'font-size')).not.toBe(size0);
  expect(inline($('.xr-linkscreen b', xray()), 'font')).not.toBe(bench0);
  const pathEl = () => $$('.xr-linkscreen > span', xray()).at(-1)!;
  const track0 = css($('.mu-linkcard-path', card()), 'letter-spacing');
  const benchTrack0 = inline(pathEl(), 'letter-spacing');
  await drag(slider('Path size and spacing'), 20, 0, 10);
  expect(css($('.mu-linkcard-path', card()), 'letter-spacing')).not.toBe(track0);
  expect(inline(pathEl(), 'letter-spacing')).not.toBe(benchTrack0);
});

test('the LINK tag sets both chips’ distance from the corner; only OPEN opens', async () => {
  await openDocs('bone');
  await part('Open');
  const tag = () => slider('Space from the corner');
  const start = Number(tag().getAttribute('aria-valuenow'));
  const chip0 = css($('.mu-linkcard-open', card()), 'right');
  const bench0 = inline($('.xr-linkchip', xray()), 'left');
  await drag(tag(), 8, 8, 10);
  expect(Number(tag().getAttribute('aria-valuenow'))).toBeGreaterThan(start);
  expect(css($('.mu-linkcard-open', card()), 'right')).not.toBe(chip0);
  expect(inline($('.xr-linkchip', xray()), 'left')).not.toBe(bench0);
  // OPEN is the only way out; on the specimen it says where it would go instead of leaving the page.
  // (A link click the page does not stop is one the browser follows: that is the new tab.)
  let followed: boolean | undefined;
  const watch = (e: MouseEvent) => { followed = !e.defaultPrevented; };
  addEventListener('click', watch);
  await userEvent.click(page.elementLocator($('.mu-linkcard-open', card())));
  removeEventListener('click', watch);
  await expect.poll(() => $('.ed-lc-opened', card()).textContent).toContain('would open');
  expect(followed).toBe(false);
});

test('the screen corner sets its corners; the frame corners follow unless switched off', async () => {
  await openDocs('bone');
  await part('Shape');
  const screenR0 = css($('.mu-linkcard-screen', card()), 'border-top-left-radius');
  const frameR0 = css(specimen(), 'border-top-left-radius');
  const bench0 = inline(screen(), 'border-radius');
  await drag(slider('Screen corners'), 10, 10, 10);
  expect(css($('.mu-linkcard-screen', card()), 'border-top-left-radius')).not.toBe(screenR0);
  expect(css(specimen(), 'border-top-left-radius')).not.toBe(frameR0);
  expect(inline(screen(), 'border-radius')).not.toBe(bench0);
  const followed = css(specimen(), 'border-top-left-radius');
  await toggle('Frame corners follow the screen');
  expect(css(specimen(), 'border-top-left-radius')).not.toBe(followed);
});

test('readouts scrub by drag and by arrow keys; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Shape');
  const before = value('Screen corners');
  await drag(readout('Screen corners'), 0, -24, 10);
  await expect.poll(() => value('Screen corners')).not.toBe(before);
  const mid = value('Screen corners');
  readout('Screen corners').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Screen corners')).not.toBe(mid);
  // a step readout moves between real sites only
  await part('Screen');
  const site0 = value('Site');
  readout('Site').focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('Site')).not.toBe(site0);
  await expect.poll(() => $('.mu-linkcard-host', card()).textContent).toBe(value('Site'));
  // the keyboard: focus a handle, press an arrow, and its hint shows above the card
  await part('Bezel');
  slider('Frame width').focus();
  await userEvent.keyboard('{ArrowLeft}');
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Frame width');
});

test('layer switches change the card and the bench; hovering a row points at its slice', async () => {
  await openDocs('graphite');
  await part('Layers');
  const shadow0 = css(specimen(), 'box-shadow');
  await toggle('Far shadow');
  await expect.poll(() => role(card(), 'switch', 'Far shadow').getAttribute('aria-checked')).toBe('false');
  expect(css(specimen(), 'box-shadow')).not.toBe(shadow0);
  await expect.poll(() => $$('.xr-face.is-layer.is-off', xray()).filter((e) => e.textContent!.includes('Far shadow')).length).toBe(1);
  await hover(withText('.ed-layer', 'Glare', card()));
  await expect.poll(() => $$('.xr-face.is-layer.is-focus', xray()).filter((e) => e.textContent!.includes('Glare')).length).toBe(1);
});

for (const colorway of COLORWAYS) {
  test(`375 px ${colorway}: every card fits without sideways scroll`, async () => {
    await openDocs(colorway, { viewport: [375, 812], media: { 'prefers-reduced-motion': 'reduce' } });
    for (const name of SPOTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-linkcard', card()).length).toBe(1);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
      const well = $('.ed-specimen', card()).getBoundingClientRect();
      const lc = $('.ed-specimen .mu-linkcard', card()).getBoundingClientRect();
      expect(lc.x + lc.width).toBeLessThanOrEqual(well.x + well.width + 0.5);
    }
  });
}
