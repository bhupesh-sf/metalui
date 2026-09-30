import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions } from './harness';

const ROUTE = '/components/command-palette';
const CALLOUTS = ['Field', 'Rows', 'Labels', 'Keys', 'Plate', 'Layers'];
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
const now = (handle: Element) => Number(handle.getAttribute('aria-valuenow'));
const inline = (el: HTMLElement, prop: string) => el.style.getPropertyValue(prop);
const slider = (name: string) => role(card(), 'slider', name);
const text = (el: Element) => el.textContent!.replace(/\s+/g, ' ').trim();
const query = () => page.elementLocator(card()).getByRole('textbox', { name: 'Palette query' });

for (const colorway of COLORWAYS) {
  test(`every palette callout holds a real still and no sliders in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of CALLOUTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-palette .mu-palette-field', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial, .xr-switch, .xr-pinput', card())).toHaveLength(0);
    }
  });
}

test('field: typing refilters specimen and bench; its handles change both', async () => {
  await openDocs('bone');
  await part('Field');
  await userEvent.fill(query(), 'delete');
  await expect.poll(() => $$('.mu-palette-row', card()).length).toBe(2);
  await expect.poll(() => $$('.xr-prow', xray()).length).toBe(2);
  await expect.poll(() => $('.xr-pfield', xray()).textContent).toContain('delete');

  const field = () => $('.mu-palette-field', card());
  const benchField = () => $('.xr-pfield', xray());
  const height = () => slider('Field height');
  const h0 = now(height()), fh0 = css(field(), 'height'), bh0 = inline(benchField(), 'height');
  await drag(height(), 0, -30, 10);
  expect(now(height())).toBeGreaterThan(h0);
  expect(css(field(), 'height')).not.toBe(fh0);
  expect(inline(benchField(), 'height')).not.toBe(bh0);

  const r0 = css(field(), 'border-top-left-radius');
  await drag(slider('Field corners'), -20, -20, 10);
  expect(css(field(), 'border-top-left-radius')).not.toBe(r0);

  const l0 = css(field(), 'padding-left'), bl0 = inline(benchField(), 'padding-left');
  await drag(slider('Space on the left'), 24, 0, 10);
  expect(css(field(), 'padding-left')).not.toBe(l0);
  expect(inline(benchField(), 'padding-left')).not.toBe(bl0);
});

test('rows: the chosen row leans, then snaps to a real row; height and corners change both', async () => {
  await openDocs('bone');
  await part('Rows');
  // empty the query as fill('') does: select what is there and delete it
  const q = query().element() as HTMLInputElement;
  q.focus(); q.select();
  await userEvent.keyboard('{Backspace}');
  const rows = () => $$('.mu-palette-row', card());
  const count = rows().length;
  expect(count).toBeGreaterThan(2);
  const cap = () => slider('Chosen row');
  const start = now(cap());
  const labels = rows().map(text);
  const isOption = () => { const i = now(cap()); expect(Number.isInteger(i) && i >= 1 && i <= count).toBe(true); return i; };
  // a small nudge only leans: nothing is chosen yet
  await drag(cap(), 0, 4, 10);
  expect(isOption()).toBe(start);
  // far enough, it snaps onto the next row, never between
  await drag(cap(), 0, 24, 10);
  const next = isOption();
  expect(next).toBeGreaterThan(start);
  await expect.poll(() => $$('.mu-palette-row[data-highlighted]', card()).length).toBe(1);
  await expect.poll(() => text($('.mu-palette-row[data-highlighted]', card()))).toBe(labels[next - 1]);
  await expect.poll(() => $('.xr-prow.is-on', xray()).textContent).toContain(labels[next - 1].replace(/⌘.|⌫/, '').trim());

  const row = () => $('.mu-palette-row', card());
  const rh0 = css(row(), 'height'), bh0 = inline($('.xr-prow', xray()), 'height');
  await drag(slider('Row height'), 0, 24, 10);
  expect(css(row(), 'height')).not.toBe(rh0);
  expect(inline($('.xr-prow', xray()), 'height')).not.toBe(bh0);

  const on = () => $('.mu-palette-row[data-highlighted]', card());
  const r0 = css(on(), 'border-top-left-radius'), br0 = inline($('.xr-prow.is-on', xray()), 'border-radius');
  await drag(slider('Row corners'), -16, -16, 10);
  expect(css(on(), 'border-top-left-radius')).not.toBe(r0);
  expect(inline($('.xr-prow.is-on', xray()), 'border-radius')).not.toBe(br0);
});

test('labels: section room and the underline change specimen and bench', async () => {
  await openDocs('graphite');
  await part('Labels');
  const sec = () => $('.mu-palette-sec', card());
  const s0 = css(sec(), 'padding-top'), bs0 = inline($('.xr-psec', xray()), 'height');
  await drag(slider('Space above a section'), 0, 20, 10);
  expect(css(sec(), 'padding-top')).not.toBe(s0);
  expect(inline($('.xr-psec', xray()), 'height')).not.toBe(bs0);

  const mark = () => $('.mu-palette-mark', card());
  const u0 = css(mark(), 'text-underline-offset'), bu0 = inline($('.xr-pmark', xray()), 'text-underline-offset');
  await drag(slider('Underline'), 0, 12, 10);
  expect(css(mark(), 'text-underline-offset')).not.toBe(u0);
  expect(inline($('.xr-pmark', xray()), 'text-underline-offset')).not.toBe(bu0);
});

test('keys: gap and room change both; pinning and status switch in both', async () => {
  await openDocs('bone');
  await part('Keys');
  const foot = () => $('.mu-palette-foot', card());
  const benchFoot = () => $('.xr-pfoot', xray());
  const g0 = css(foot(), 'column-gap'), bg0 = inline(benchFoot(), 'gap');
  await drag(slider('Space between keys'), 20, 0, 10);
  expect(css(foot(), 'column-gap')).not.toBe(g0);
  expect(inline(benchFoot(), 'gap')).not.toBe(bg0);
  const t0 = css(foot(), 'padding-top'), bt0 = inline(benchFoot(), 'padding');
  await drag(slider('Space above the keys'), 0, 16, 10);
  expect(css(foot(), 'padding-top')).not.toBe(t0);
  expect(inline(benchFoot(), 'padding')).not.toBe(bt0);

  expect(foot().textContent).toContain('PIN');
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Pin with ⇧↩')));
  await expect.poll(() => foot().textContent).not.toContain('PIN');
  await expect.poll(() => benchFoot().textContent).not.toContain('PIN');
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Where answers come from')));
  await expect.poll(() => foot().textContent).toContain('SYNC OFFLINE');
  await expect.poll(() => benchFoot().textContent).toContain('SYNC OFFLINE');
});

test('plate: padding and corners change specimen and bench', async () => {
  await openDocs('graphite');
  await part('Plate');
  const plate = () => $('.mu-palette', card());
  const p0 = css(plate(), 'padding-left'), bp0 = inline($('.xr-paletteface', xray()), 'padding');
  await drag(slider('Padding'), -16, 0, 10);
  expect(css(plate(), 'padding-left')).not.toBe(p0);
  expect(inline($('.xr-paletteface', xray()), 'padding')).not.toBe(bp0);
  const face = () => $('.xr-face:has(> .xr-paletteface)', xray());
  const r0 = css(plate(), 'border-top-left-radius'), br0 = inline(face(), 'border-radius');
  await drag(slider('Plate corners'), 20, 20, 10);
  expect(css(plate(), 'border-top-left-radius')).not.toBe(r0);
  expect(inline(face(), 'border-radius')).not.toBe(br0);
});

test('layers: a switch removes the layer from the still and the bench; hover lights the slice', async () => {
  await openDocs('bone');
  await part('Layers');
  const plate = () => $('.mu-palette', card());
  const shadow0 = css(plate(), 'box-shadow');
  const rim = () => role(card(), 'switch', 'Rim');
  await userEvent.click(page.elementLocator(rim()));
  await expect.poll(() => rim().getAttribute('aria-checked')).toBe('false');
  expect(css(plate(), 'box-shadow')).not.toBe(shadow0);
  await expect.poll(() => $$('.xr-face.is-layer.is-off', xray()).filter((e) => e.textContent!.includes('Rim')).length).toBe(1);
  await hover(withText('.ed-layer', 'Frost', card()));
  await expect.poll(() => $$('.xr-face.is-layer.is-focus', xray()).filter((e) => e.textContent!.includes('Frost')).length).toBe(1);
});

test('readouts scrub by drag and arrow keys; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Field');
  const height = () => slider('Field height');
  const h0 = now(height());
  await drag(readout('Field height'), 0, -32, 10);
  expect(now(height())).toBeGreaterThan(h0);
  const before = value('Space on the left');
  readout('Space on the left').focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('Space on the left')).not.toBe(before);
  slider('Field corners').focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Field corners');
  // the chosen row steps by readout too, and only ever onto a row
  await part('Rows');
  const c0 = now(slider('Chosen row'));
  readout('Chosen row').focus();
  await userEvent.keyboard('{ArrowDown}');
  expect(now(slider('Chosen row'))).toBe(c0 + 1);
});

test('375 px graphite: every card fits the x-ray without sideways scroll', async () => {
  await openDocs('graphite', { viewport: [375, 812], media: { 'prefers-reduced-motion': 'reduce' } });
  for (const name of CALLOUTS) {
    await part(name);
    await expect.poll(() => $$('.ed-specimen .mu-palette', card()).length).toBe(1);
    // the card and its specimen stay inside the phone's width
    expect(card().getBoundingClientRect().right).toBeLessThanOrEqual(375);
    expect(card().scrollWidth - card().clientWidth).toBeLessThanOrEqual(0);
    const well = $('.ed-specimen', card());
    expect($('.mu-palette', well).getBoundingClientRect().right <= well.getBoundingClientRect().right + 0.5).toBe(true);
  }
});
