import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent, sleep } from './harness';

// The Tooltip x-ray's cards hold a real tool with its real tooltip; the tooltip is the
// component's own popup (portalled to the page), and its handles ride inside it.
const ROUTE = '/components/tooltip';
const CALLOUTS = ['Timing', 'Type', 'Place', 'Shape', 'Shadow', 'Layers'];
const SIDES = ['above', 'right', 'below', 'left'];
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
const inline = (el: HTMLElement, prop: string) => el.style.getPropertyValue(prop);
/** The tooltip is portalled to the page, so its handles are found on the page, not in the card. */
const onPage = (name: string) => page.getByRole('slider', { name }).element() as HTMLElement;
const tip = () => document.querySelector<HTMLElement>('.ed-tip.mu-tooltip');
const tag = () => document.querySelector('.ed-tag')?.textContent;
/** A point on the page as a WebDriver move (offset from the window's middle), for a gesture that pauses part way. */
const at = (x: number, y: number) => ({ to: [x - document.documentElement.clientWidth / 2, y - document.documentElement.clientHeight / 2] as [number, number] });

for (const colorway of COLORWAYS) {
  test(`each Tooltip callout holds a real tool and tooltip, and no old controls, in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of CALLOUTS) {
      await part(name);
      await expect.element(page.elementLocator($('.ed-specimen .mu-icon-button', card()))).toBeVisible();
      expect($$('.mu-slider, .xr-dial, .mu-switcher', card())).toHaveLength(0);
      // every card but Timing holds the real tooltip open (Timing's shows when you point)
      if (name !== 'Timing') await expect.poll(() => $$('.ed-tip.mu-tooltip').length).toBe(1);
    }
  });
}

test('Timing: pointing at the real tool shows its tooltip on the specimen and the bench; the wait scrubs', async () => {
  await openDocs('bone');
  await part('Timing');
  const tool = () => role(card(), 'button', 'Select');
  const shown = () => $('.xr-tipwrap', xray()).classList.contains('is-shown');
  inView(tool());
  expect(shown()).toBe(false);
  await hover(tool());
  await expect.element(page.elementLocator(await until(tip))).toBeVisible();
  await expect.poll(shown).toBe(true);
  await mouse.move(5, 5);
  await expect.poll(shown).toBe(false);
  // the wait has no place on the component: a readout, by drag and by arrows
  const start = Number(value('Wait'));
  await drag(readout('Wait'), 0, -24, 10);
  await expect.poll(() => value('Wait')).not.toBe(`${start}`);
  expect(Number(value('Wait'))).toBeGreaterThan(start);
  const mid = Number(value('Wait'));
  readout('Wait').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Wait')).toBe(`${mid - 10}`);
});

test('Type: the key switch changes the real tooltip and the bench', async () => {
  await openDocs('graphite');
  await part('Type');
  const face = () => $('.xr-tipface', xray()).textContent;
  await expect.poll(() => tip()?.querySelectorAll('.mu-tooltip-key').length).toBe(1);
  expect(face()).toContain('· V');
  const key = () => role(card(), 'switch', 'Show the key');
  await userEvent.click(page.elementLocator(key()));
  await expect.poll(() => key().getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => tip()!.querySelectorAll('.mu-tooltip-key').length).toBe(0);
  await expect.poll(face).not.toContain('· V');
});

test('Place: the label steps between its real sides (lean, then snap), and its near edge tunes the gap', async () => {
  await openDocs('bone');
  await part('Place');
  const side = () => onPage('Side');
  const face = () => $('.xr-tipwrap .xr-face', xray());
  const start = side().getAttribute('aria-valuetext')!;
  expect(SIDES).toContain(start);
  const bench = () => [inline(face(), 'left'), inline(face(), 'top')].join();
  const bench0 = bench();
  // a short drag only leans: the outline of the target side lights, the tooltip stays put.
  // Held part way while the slice looks, then carried on: the button and the capture hold between calls.
  inView(side());
  const [x, y] = centre(side());
  await mouse.move(x, y);
  await mouse.down();
  await mouse.move(x + 8, y, { steps: 4 });
  const gesture = (async () => { await sleep(1200); await mouse.move(x + 40, y, { steps: 6 }); await mouse.up(); })();
  await expect.poll(() => $$('.ed-tip-ghost').length, { timeout: 1000 }).toBe(1);
  expect(side().getAttribute('aria-valuetext')).toBe(start);
  // further, and it snaps to the right; never anything between
  await gesture;
  await expect.poll(() => side().getAttribute('aria-valuetext')).toBe('right');
  expect(SIDES).toContain(side().getAttribute('aria-valuetext'));
  await expect.poll(() => $$('.ed-tip-ghost').length).toBe(0);
  await expect.poll(bench).not.toBe(bench0);
  // the real popup now sits to the right of the tool
  const tool = role(card(), 'button', 'Select').getBoundingClientRect();
  await expect.poll(() => tip()!.getBoundingClientRect().x).toBeGreaterThan(tool.x + tool.width - 1);

  // the gap: drag the edge that faces the tool away from it
  const gap = () => onPage('Gap');
  let last = '';
  const gap0 = Number(gap().getAttribute('aria-valuenow'));
  const tip0 = tip()!.getBoundingClientRect().x;
  const benchGap0 = inline(face(), 'left');
  // the popup has just sprung to its new side, and the handle rides its edge: take hold once it is still
  await until(() => { const b = gap().getBoundingClientRect(); const same = last === `${b.x},${b.y}`; last = `${b.x},${b.y}`; return same; });
  await drag(gap(), 24, 0, 10);
  await expect.poll(() => gap().getAttribute('aria-valuenow')).not.toBe(`${gap0}`);
  expect(Number(gap().getAttribute('aria-valuenow'))).toBeGreaterThan(gap0);
  await expect.poll(() => tip()!.getBoundingClientRect().x).toBeGreaterThan(tip0);
  expect(inline(face(), 'left')).not.toBe(benchGap0);

  // the side readout steps through the real sides only
  readout('Side').focus();
  await userEvent.keyboard('{ArrowUp}');
  expect(SIDES).toContain(value('Side'));
  await expect.poll(() => value('Side')).toBe('below');

  // keyboard on the handle: its hint shows above the label
  side().focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => side().getAttribute('aria-valuetext')).toBe('above');
  await expect.poll(tag).toContain('Side');
});

test('Shape: the right end and the corner tune the real label and the bench; long note wraps', async () => {
  await openDocs('graphite');
  await part('Shape');
  const face = () => $('.xr-tipwrap .xr-face', xray());
  const label = () => $('.xr-tipface', xray());
  const pad0 = css(tip()!, 'padding-right');
  const benchPad0 = inline(label(), 'padding');
  await drag(onPage('Space on the sides'), 30, 0, 10);
  expect(css(tip()!, 'padding-right')).not.toBe(pad0);
  expect(inline(label(), 'padding')).not.toBe(benchPad0);
  const r0 = css(tip()!, 'border-top-left-radius');
  const benchR0 = inline(face(), 'border-radius');
  await drag(onPage('Corners'), -14, -14, 10);
  expect(css(tip()!, 'border-top-left-radius')).not.toBe(r0);
  expect(inline(face(), 'border-radius')).not.toBe(benchR0);
  // readouts: a drag and the arrows
  const before = Number(value('Space on the sides'));
  await drag(readout('Space on the sides'), 0, -24, 10);
  expect(Number(value('Space on the sides'))).toBeGreaterThan(before);
  const c0 = value('Corners');
  readout('Corners').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Corners')).not.toBe(c0);
  // long note
  const h0 = tip()!.getBoundingClientRect().height;
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Long note')));
  await expect.poll(() => tip()!.textContent).toContain('Made from a message');
  await expect.poll(() => label().textContent).toContain('Made from a message');
  await expect.poll(() => tip()!.getBoundingClientRect().height).toBeGreaterThan(h0);
  // keyboard focus on a handle shows its hint
  onPage('Space on the sides').focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(tag).toContain('Space on the sides');
});

test('Shadow and Layers: lifting the label and switching layers change the real label and the bench', async () => {
  await openDocs('bone');
  await part('Shadow');
  const lift = () => onPage('Height above the page');
  const shadow0 = css(tip()!, 'box-shadow');
  const bench0 = inline($('.xr-tipwrap', xray()), 'transform');
  const lift0 = Number(lift().getAttribute('aria-valuenow'));
  await drag(lift(), 0, -40, 10);
  expect(Number(lift().getAttribute('aria-valuenow'))).toBeGreaterThan(lift0);
  expect(css(tip()!, 'box-shadow')).not.toBe(shadow0);
  expect(inline($('.xr-tipwrap', xray()), 'transform')).not.toBe(bench0);
  lift().focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(tag).toContain('Height above the page');

  await part('Layers');
  const far = () => role(card(), 'switch', 'Far shadow');
  const layered0 = css(tip()!, 'box-shadow');
  await userEvent.click(page.elementLocator(far()));
  await expect.poll(() => far().getAttribute('aria-checked')).toBe('false');
  expect(css(tip()!, 'box-shadow')).not.toBe(layered0);
  await expect.poll(() => $$('.xr-face.is-layer.is-off', xray()).filter((e) => e.textContent!.includes('Far shadow')).length).toBe(1);
  await hover(withText('.ed-layer', 'Rim', card()));
  await expect.poll(() => $$('.xr-face.is-layer.is-focus', xray()).filter((e) => e.textContent!.includes('Rim')).length).toBe(1);
});

test('375 px graphite: every card fits without sideways scroll', async () => {
  await openDocs('graphite', { viewport: [375, 812], media: { 'prefers-reduced-motion': 'reduce' } });
  for (const name of CALLOUTS) {
    await part(name);
    await expect.element(page.elementLocator($('.ed-specimen .mu-icon-button', card()))).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
  }
  // the label on a side still fits
  await part('Place');
  readout('Side').focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('Side')).toBe('right');
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
});
